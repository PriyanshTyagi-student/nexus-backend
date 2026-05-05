const mongoose = require('mongoose');

const DEFAULT_DB_NAME = 'nexus';

let connectionFailed = false;

function getMongoUri() {
  return process.env.MONGODB_URI || process.env.MONGO_URI || '';
}

function getDatabaseName() {
  return process.env.MONGODB_DB || DEFAULT_DB_NAME;
}

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
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
    await mongoose.connect(uri, {
      dbName: getDatabaseName(),
    });

    console.log(`[DB] Connected to MongoDB database: ${getDatabaseName()}`);
    return mongoose.connection;
  } catch (error) {
    connectionFailed = true;

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

function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

async function closeDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  connectionFailed = false;
}

module.exports = {
  connectDatabase,
  isDatabaseConnected,
  closeDatabase,
};
