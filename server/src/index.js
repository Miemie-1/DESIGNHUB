// Local / long-running entry point (`npm run dev`, `npm start`).
// On Vercel the app is served by api/index.js instead.
require('dotenv').config();
const app = require('./app');
const connectDb = require('./db');

const { PORT = 5000 } = process.env;

connectDb()
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`DesignHub API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Startup failed:', err.message);
    process.exit(1);
  });
