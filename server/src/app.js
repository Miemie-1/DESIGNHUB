require('dotenv').config();
const express = require('express');
const cors = require('cors');
const auth = require('./middleware/auth');
const connectDb = require('./db');

// The Express app only: no listen() and no eager DB connection, so the same app can run
// locally (src/index.js) and as a Vercel serverless function (api/index.js).
const app = express();

// CLIENT_URL may hold several comma-separated origins (e.g. the Vercel site, a dev tunnel, localhost)
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get('/', (_req, res) => res.json({ name: 'DesignHub API', status: 'ok' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// connect (or re-use the cached connection) before any route that touches the database
app.use('/api', async (_req, _res, next) => {
  try {
    await connectDb();
    next();
  } catch (err) {
    next(err);
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/clients', auth, require('./routes/clients'));
app.use('/api/projects', auth, require('./routes/projects'));
app.use('/api/payments', auth, require('./routes/payments'));
app.use('/api/dashboard', auth, require('./routes/dashboard'));
app.use('/api/reports', auth, require('./routes/reports'));

app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.name === 'ValidationError' || err.name === 'CastError')
    return res.status(400).json({ message: err.message });
  res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;
