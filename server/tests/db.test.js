const request = require('supertest');

describe('connectDb configuration checks', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('fails fast when MONGODB_URI is missing', async () => {
    delete process.env.MONGODB_URI;
    process.env.JWT_SECRET = 'x';
    await expect(require('../src/db')()).rejects.toThrow('MONGODB_URI is not set');
  });

  it('fails fast when JWT_SECRET is missing', async () => {
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/x';
    delete process.env.JWT_SECRET;
    await expect(require('../src/db')()).rejects.toThrow('JWT_SECRET is not set');
  });
});

describe('app error handling', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
    vi.restoreAllMocks();
  });

  it('returns 500 JSON (no internals) when the database cannot be configured', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // empty (not deleted): app.js calls dotenv, which would otherwise fill it from a local .env
    process.env.MONGODB_URI = '';
    process.env.JWT_SECRET = 'x';
    const res = await request(require('../src/app')).get('/api/clients');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: 'Internal server error' });
  });
});
