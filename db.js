const { MongoClient } = require('mongodb');

const DEFAULT_DB_NAME = 'nexus';

let client;
let db;
let connectionFailed = false;

function getMongoUri() {
  return process.env.MONGODB_URI || process.env.MONGO_URI || '';
}

async function connectDatabase() {
  if (db) {
    return db;
  }

  if (connectionFailed) {
    return null;
  }

  const uri = getMongoUri();
  if (!uri) {
    console.warn('[DB] MONGODB_URI is not set. Room persistence is disabled.');
    return null;
  }

  try {
    client = new MongoClient(uri);
    await client.connect();

    const dbName = process.env.MONGODB_DB || DEFAULT_DB_NAME;
    db = client.db(dbName);

    await db.collection('rooms').createIndex({ roomId: 1 }, { unique: true });
    console.log(`[DB] Connected to MongoDB database: ${dbName}`);

    return db;
  } catch (error) {
    connectionFailed = true;
    client = null;
    db = null;

    if (error?.codeName === 'AtlasError' || error?.code === 8000) {
      console.error(
        '[DB] MongoDB authentication failed. Check MONGODB_URI username/password, URL-encode special characters in the password, and confirm the database user exists in Atlas.'
      );
    } else {
      console.error('[DB] MongoDB connection failed:', error.message || error);
    }

    return null;
  }
}

async function getDatabase() {
  return db || connectDatabase();
}

async function closeDatabase() {
  if (client) {
    await client.close();
  }

  client = null;
  db = null;
  connectionFailed = false;
}

module.exports = {
  connectDatabase,
  getDatabase,
  closeDatabase,
};
