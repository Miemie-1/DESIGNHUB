const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

// Starts an in-memory MongoDB and points the app at it (app.js connects lazily via db.js).
exports.start = async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri('designhub_test');
  process.env.JWT_SECRET = 'test-secret';
  process.env.CLIENT_URL = 'http://localhost:3000';
  // connect up-front; db.js re-uses an open connection
  await mongoose.connect(process.env.MONGODB_URI);
};

exports.stop = async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
};

exports.clear = async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
};

// Registers a user through the API and returns { token, user, auth } where auth is the header value.
exports.register = async (request, app, overrides = {}) => {
  const body = { name: 'Ada', email: `ada${Math.random()}@x.com`, password: 'secret1', ...overrides };
  const res = await request(app).post('/api/auth/register').send(body);
  return { token: res.body.token, user: res.body.user, auth: `Bearer ${res.body.token}` };
};
