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

  seed(collection, id, document) {
    this.bucket(collection).set(id, clone({ ...document, _id: id }));
  }

  entries(collection) {
    return [...this.bucket(collection).values()].map(clone);
  }

  async get(collection, id) {
    return clone(this.bucket(collection).get(id));
  }

  async query(collection, where, limit = 100) {
    return [...this.bucket(collection).values()].filter(row => matches(row, where)).slice(0, limit).map(clone);
  }

  async put(collection, id, document) {
    this.bucket(collection).set(id, clone({ ...document, _id: id }));
  }
  async page(collection,where,after,limit=20){const all=[...this.bucket(collection).values()].filter(row=>matches(row,where)&&(!after||row._id>after)).sort((a,b)=>a._id.localeCompare(b._id)),rows=all.slice(0,limit).map(clone);return {rows,lastId:rows.at(-1)?._id||'',hasMore:all.length>limit}}
  async recentPage(collection,where,after,limit=20){const all=[...this.bucket(collection).values()].filter(row=>matches(row,where)&&(!after||row.createdAt<after.createdAt||(row.createdAt===after.createdAt&&row._id>after.id))).sort((a,b)=>b.createdAt-a.createdAt||a._id.localeCompare(b._id));return {rows:all.slice(0,limit).map(clone),hasMore:all.length>limit}}

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

module.exports = { MemoryRepository };
