const request = require('supertest');
const jwt = require('jsonwebtoken');
const db = require('./setup');

let app;
beforeAll(async () => {
  await db.start();
  app = require('../src/app');
});
afterAll(db.stop);
beforeEach(db.clear);

describe('health & routing', () => {
  it('reports health without authentication or a database', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns 404 JSON for unknown routes', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Route not found');
  });
});

describe('auth middleware', () => {
  it.each(['clients', 'projects', 'payments', 'dashboard/stats', 'reports/projects'])(
    'rejects /api/%s without a token',
    async (path) => {
      const res = await request(app).get(`/api/${path}`);
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Authentication required');
    }
  );

  it('rejects a malformed token', async () => {
    const res = await request(app).get('/api/clients').set('Authorization', 'Bearer garbage');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid or expired token');
  });

  it('rejects a token signed with another secret', async () => {
    const token = jwt.sign({ id: 'abc' }, 'other-secret');
    const res = await request(app).get('/api/clients').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('rejects an expired token', async () => {
    const token = jwt.sign({ id: 'abc' }, process.env.JWT_SECRET, { expiresIn: -10 });
    const res = await request(app).get('/api/clients').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/register', () => {
  it('creates a user and returns a token without the password hash', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada', email: 'ADA@Example.com', password: 'secret1' });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: 'Ada', email: 'ada@example.com', workspaceName: 'DesignHub' });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(jwt.verify(res.body.token, process.env.JWT_SECRET).id).toBe(res.body.user.id);
  });

  it('requires name, email and password', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  it('enforces a minimum password length', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'a@b.com', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/6 characters/);
  });

  it('rejects duplicate emails regardless of case', async () => {
    await db.register(request, app, { email: 'dup@x.com' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'B', email: 'DUP@x.com', password: 'secret1' });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => db.register(request, app, { email: 'ada@x.com', password: 'secret1' }));

  it('logs in with correct credentials (case-insensitive email)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ADA@x.com', password: 'secret1' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('rejects a wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ada@x.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('rejects an unknown email with the same message (no user enumeration)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'no@x.com', password: 'secret1' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('rejects a missing body', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(401);
  });
});

describe('profile', () => {
  it('GET /me returns the current user', async () => {
    const { auth, user } = await db.register(request, app);
    const res = await request(app).get('/api/auth/me').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
  });

  it('PUT /me updates profile fields', async () => {
    const { auth } = await db.register(request, app);
    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', auth)
      .send({ name: 'New', email: 'new@x.com', phone: '080', workspaceName: 'Studio' });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ name: 'New', email: 'new@x.com', phone: '080', workspaceName: 'Studio' });
  });

  it('PUT /me refuses an email used by another account', async () => {
    await db.register(request, app, { email: 'taken@x.com' });
    const { auth } = await db.register(request, app);
    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', auth)
      .send({ name: 'Me', email: 'taken@x.com' });
    expect(res.status).toBe(409);
  });

  it('PUT /me requires name and email', async () => {
    const { auth } = await db.register(request, app);
    const res = await request(app).put('/api/auth/me').set('Authorization', auth).send({ name: 'x' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/auth/password', () => {
  it('changes the password when the current one is correct', async () => {
    const { auth } = await db.register(request, app, { email: 'p@x.com', password: 'oldpass1' });
    const res = await request(app)
      .put('/api/auth/password')
      .set('Authorization', auth)
      .send({ currentPassword: 'oldpass1', newPassword: 'newpass1' });
    expect(res.status).toBe(200);

    const login = await request(app).post('/api/auth/login').send({ email: 'p@x.com', password: 'newpass1' });
    expect(login.status).toBe(200);
    const old = await request(app).post('/api/auth/login').send({ email: 'p@x.com', password: 'oldpass1' });
    expect(old.status).toBe(401);
  });

  it('rejects an incorrect current password', async () => {
    const { auth } = await db.register(request, app);
    const res = await request(app)
      .put('/api/auth/password')
      .set('Authorization', auth)
      .send({ currentPassword: 'nope', newPassword: 'newpass1' });
    expect(res.status).toBe(401);
  });

  it('rejects a short new password', async () => {
    const { auth } = await db.register(request, app);
    const res = await request(app)
      .put('/api/auth/password')
      .set('Authorization', auth)
      .send({ currentPassword: 'secret1', newPassword: '1' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/demo', () => {
  it('creates the seeded demo account once and reuses it', async () => {
    const first = await request(app).post('/api/auth/demo');
    expect(first.status).toBe(200);
    const list = await request(app).get('/api/clients').set('Authorization', `Bearer ${first.body.token}`);
    expect(list.body.total).toBeGreaterThan(0);

    const second = await request(app).post('/api/auth/demo');
    expect(second.body.user.id).toBe(first.body.user.id);
    const again = await request(app).get('/api/clients').set('Authorization', `Bearer ${second.body.token}`);
    expect(again.body.total).toBe(list.body.total); // not seeded twice
  });

  it('can be disabled with ENABLE_DEMO=false', async () => {
    process.env.ENABLE_DEMO = 'false';
    try {
      const res = await request(app).post('/api/auth/demo');
      expect(res.status).toBe(404);
    } finally {
      delete process.env.ENABLE_DEMO;
    }
  });
});
