'use strict';

function absent(error) {
  const message = String(error?.message || error?.errMsg || '');
  return !/collection/i.test(message) && /not exist|not found|DATABASE_DOCUMENT_NOT_EXIST/i.test(message);
}

function dataOf(result) {
  if (!result) return undefined;
  if (Array.isArray(result.data)) return result.data[0];
  return result.data;
}

function stored(document) {
  const value = { ...document };
  delete value._id;
  return value;
}

function facade(database) {
  return {
    async get(collection, id) {
      try {
        const row = dataOf(await database.collection(collection).doc(id).get());
        return row ? { ...row, _id: row._id || id } : undefined;
      } catch (error) {
        if (absent(error)) return undefined;
        throw error;
      }
    },
    async query(collection, where, limit = 100) {
      const result = await database.collection(collection).where(where).limit(Math.min(Math.max(limit, 1), 100)).get();
      return (result.data || []).map(row => ({ ...row, _id: row._id }));
    },
    async put(collection, id, document) {
      await database.collection(collection).doc(id).set({ data: stored(document) });
    },
  };
}

class CloudBaseRepository {
  constructor(database) {
    if (!database || typeof database.collection !== 'function' || typeof database.runTransaction !== 'function') {
      throw new TypeError('CloudBase database is required');
    }
    this.database = database;
    Object.assign(this, facade(database));
  }

  runTransaction(work) {
    return this.database.runTransaction(transaction => work(facade(transaction)));
  }
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function matches(document, where) {
  return Object.entries(where).every(([key, value]) => document[key] === value);
}

class MemoryRepository {
  constructor() {
    this.collections = new Map();
    this.tail = Promise.resolve();
  }

  bucket(name, source = this.collections) {
    if (!source.has(name)) source.set(name, new Map());
    return source.get(name);
  }

  entries(collection) {
    return [...this.bucket(collection).values()].map(clone);
  }

  async get(collection, id) { return clone(this.bucket(collection).get(id)); }
  async query(collection, where, limit = 100) {
    return [...this.bucket(collection).values()].filter(row => matches(row, where)).slice(0, limit).map(clone);
  }
  async put(collection, id, document) {
    this.bucket(collection).set(id, clone({ ...document, _id: id }));
  }

  async runTransaction(work) {
    const previous = this.tail;
    let release;
    this.tail = new Promise(resolve => { release = resolve; });
    await previous;
    const snapshot = new Map([...this.collections].map(([name, rows]) => [name, new Map([...rows].map(([id, row]) => [id, clone(row)]))]));
    const bucket = name => this.bucket(name, snapshot);
    const tx = {
      get: async (collection, id) => clone(bucket(collection).get(id)),
      query: async (collection, where, limit = 100) => [...bucket(collection).values()].filter(row => matches(row, where)).slice(0, limit).map(clone),
      put: async (collection, id, document) => bucket(collection).set(id, clone({ ...document, _id: id })),
    };
    try {
      const result = await work(tx);
      this.collections = snapshot;
      return clone(result);
    } finally {
      release();
    }
  }
}

module.exports = { CloudBaseRepository, MemoryRepository, absent };
