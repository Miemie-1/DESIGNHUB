const mongoose = require('mongoose');

// Serverless functions are re-used between invocations ("warm starts"), so the connection is cached
// on `global` and shared. A cold start opens one connection; later requests re-use it.
const cache = global.__designhubMongo || (global.__designhubMongo = { promise: null });

async function connectDb() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');

  if (mongoose.connection.readyState === 1) return mongoose.connection;

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(process.env.MONGODB_URI, {
        // fail fast (well inside the serverless time limit) if Atlas is unreachable
        serverSelectionTimeoutMS: 8000,
        maxPoolSize: 5,
      })
      .catch((err) => {
        cache.promise = null; // let the next request retry
        throw err;
      });
  }
  await cache.promise;
  return mongoose.connection;
}

module.exports = connectDb;
