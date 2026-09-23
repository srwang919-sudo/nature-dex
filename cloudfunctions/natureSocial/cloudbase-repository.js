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
    if (!database || typeof database.collection !== 'function' || typeof database.runTransaction !== 'function') throw new TypeError('CloudBase database is required');
    this.database = database;
    Object.assign(this, facade(database));
  }

  async runTransaction(work) {
    return this.database.runTransaction(transaction => work(facade(transaction)));
  }
}

module.exports = { CloudBaseRepository, absent };
