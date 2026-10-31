const request = require('supertest');
const mongoose = require('mongoose');
const db = require('./setup');

let app, a, b;
const as = (u) => ({ Authorization: u.auth });
const id = () => String(new mongoose.Types.ObjectId());

const mkClient = async (u, body = {}) =>
  (await request(app).post('/api/clients').set(as(u)).send({ name: 'Apex', ...body })).body;
const mkProject = async (u, client, body = {}) =>
  (await request(app).post('/api/projects').set(as(u)).send({ name: 'Logo', client, amount: 1000, ...body })).body;
const mkPayment = async (u, project, body = {}) =>
  (await request(app).post('/api/payments').set(as(u)).send({ project, amount: 100, ...body })).body;

beforeAll(async () => {
  await db.start();
  app = require('../src/app');
});
afterAll(db.stop);
beforeEach(async () => {
  await db.clear();
  a = await db.register(request, app);
  b = await db.register(request, app);
});

describe('clients', () => {
  it('creates, reads, updates and deletes a client', async () => {
    const created = await request(app).post('/api/clients').set(as(a)).send({ name: '  Apex  ', email: 'A@B.com' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: 'Apex', email: 'a@b.com', status: 'active' });

    const upd = await request(app).put(`/api/clients/${created.body._id}`).set(as(a)).send({ status: 'inactive' });
    expect(upd.body.status).toBe('inactive');

    const del = await request(app).delete(`/api/clients/${created.body._id}`).set(as(a));
    expect(del.status).toBe(200);
    const get = await request(app).get(`/api/clients/${created.body._id}`).set(as(a));
    expect(get.status).toBe(404);
  });

  it('requires a name', async () => {
    const res = await request(app).post('/api/clients').set(as(a)).send({ email: 'x@y.com' });
    expect(res.status).toBe(400);
  });

  it('ignores a client-supplied owner (mass assignment)', async () => {
    const res = await request(app).post('/api/clients').set(as(a)).send({ name: 'X', user: id() });
    const list = await request(app).get('/api/clients').set(as(a));
    expect(list.body.items.map((c) => c._id)).toContain(res.body._id);
  });

  it('returns 400 for a malformed id', async () => {
    const res = await request(app).get('/api/clients/not-an-id').set(as(a));
    expect(res.status).toBe(400);
  });

  it('paginates and searches (regex characters are escaped)', async () => {
    for (let i = 1; i <= 12; i++) await mkClient(a, { name: `Client ${i}` });
    await mkClient(a, { name: 'Weird (name)', businessName: 'Acme' });

    const p1 = await request(app).get('/api/clients?limit=5&page=1').set(as(a));
    expect(p1.body).toMatchObject({ total: 13, page: 1, pages: 3 });
    expect(p1.body.items).toHaveLength(5);
    const p3 = await request(app).get('/api/clients?limit=5&page=3').set(as(a));
    expect(p3.body.items).toHaveLength(3);

    const s = await request(app).get('/api/clients?search=(name)').set(as(a));
    expect(s.status).toBe(200);
    expect(s.body.items.map((c) => c.name)).toEqual(['Weird (name)']);
    const biz = await request(app).get('/api/clients?search=acme').set(as(a));
    expect(biz.body.total).toBe(1);
  });

  it('filters by status', async () => {
    await mkClient(a, { name: 'On' });
    await mkClient(a, { name: 'Off', status: 'inactive' });
    const res = await request(app).get('/api/clients?status=inactive').set(as(a));
    expect(res.body.items.map((c) => c.name)).toEqual(['Off']);
  });

  it('adds projectCount and totalSpent (pending payments excluded)', async () => {
    const c = await mkClient(a);
    const p1 = await mkProject(a, c._id);
    await mkProject(a, c._id);
    await mkPayment(a, p1._id, { amount: 300 });
    await mkPayment(a, p1._id, { amount: 999, status: 'pending' });
    const res = await request(app).get('/api/clients').set(as(a));
    expect(res.body.items[0]).toMatchObject({ projectCount: 2, totalSpent: 300 });
  });

  it('detail returns project history and financial stats', async () => {
    const c = await mkClient(a);
    const done = await mkProject(a, c._id, { amount: 1000, status: 'completed' });
    const open = await mkProject(a, c._id, { amount: 500 });
    await mkProject(a, c._id, { amount: 700, status: 'cancelled' });
    await mkPayment(a, done._id, { amount: 1000 });
    await mkPayment(a, open._id, { amount: 200 });

    const res = await request(app).get(`/api/clients/${c._id}`).set(as(a));
    expect(res.body.stats).toEqual({
      totalProjects: 3,
      activeProjects: 1,
      completedProjects: 1,
      totalPaid: 1200,
      outstanding: 300, // cancelled projects excluded
      pendingInvoices: 1,
    });
    expect(res.body.projects.find((p) => p._id === open._id).amountPaid).toBe(200);
  });

  it('refuses to delete a client that still has projects', async () => {
    const c = await mkClient(a);
    await mkProject(a, c._id);
    const res = await request(app).delete(`/api/clients/${c._id}`).set(as(a));
    expect(res.status).toBe(409);
  });
});

describe('projects', () => {
  let client;
  beforeEach(async () => {
    client = await mkClient(a);
  });

  it('creates a project and validates required fields', async () => {
    const ok = await request(app).post('/api/projects').set(as(a)).send({ name: 'Logo', client: client._id });
    expect(ok.status).toBe(201);
    expect(ok.body).toMatchObject({ status: 'pending', progress: 0, amount: 0 });

    const missing = await request(app).post('/api/projects').set(as(a)).send({ name: 'No client' });
    expect(missing.status).toBe(400);
  });

  it("rejects another user's client", async () => {
    const res = await request(app).post('/api/projects').set(as(b)).send({ name: 'X', client: client._id });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Client not found');
  });

  it('parses newline-separated deliverables', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set(as(a))
      .send({ name: 'Brand', client: client._id, deliverables: 'Logo\n  Guide \n\n' });
    expect(res.body.deliverables).toEqual(['Logo', 'Guide']);
  });

  it('forces progress to 100 when completed', async () => {
    const p = await mkProject(a, client._id);
    const res = await request(app).put(`/api/projects/${p._id}`).set(as(a)).send({ status: 'completed', progress: 20 });
    expect(res.body).toMatchObject({ status: 'completed', progress: 100 });
  });

  it('validates enums and ranges on update', async () => {
    const p = await mkProject(a, client._id);
    const bad = await request(app).put(`/api/projects/${p._id}`).set(as(a)).send({ status: 'bogus' });
    expect(bad.status).toBe(400);
    const over = await request(app).put(`/api/projects/${p._id}`).set(as(a)).send({ progress: 150 });
    expect(over.status).toBe(400);
  });

  it('filters by status, client and search', async () => {
    const other = await mkClient(a, { name: 'Other' });
    await mkProject(a, client._id, { name: 'Logo design', status: 'review' });
    await mkProject(a, other._id, { name: 'Flyer', type: 'print' });

    const byStatus = await request(app).get('/api/projects?status=review').set(as(a));
    expect(byStatus.body.map((p) => p.name)).toEqual(['Logo design']);
    const byClient = await request(app).get(`/api/projects?client=${other._id}`).set(as(a));
    expect(byClient.body.map((p) => p.name)).toEqual(['Flyer']);
    const bySearch = await request(app).get('/api/projects?search=PRINT').set(as(a));
    expect(bySearch.body).toHaveLength(1);
  });

  it('detail computes totalPaid and balance excluding pending payments', async () => {
    const p = await mkProject(a, client._id, { amount: 1000 });
    await mkPayment(a, p._id, { amount: 400 });
    await mkPayment(a, p._id, { amount: 500, status: 'pending' });
    const res = await request(app).get(`/api/projects/${p._id}`).set(as(a));
    expect(res.body).toMatchObject({ totalPaid: 400, balance: 600 });
    expect(res.body.payments).toHaveLength(2);
    expect(res.body.client.name).toBe('Apex');
  });

  it('balance never goes negative on overpayment', async () => {
    const p = await mkProject(a, client._id, { amount: 100 });
    await mkPayment(a, p._id, { amount: 250 });
    const res = await request(app).get(`/api/projects/${p._id}`).set(as(a));
    expect(res.body.balance).toBe(0);
  });

  it('deleting a project cascades to its payments', async () => {
    const p = await mkProject(a, client._id);
    await mkPayment(a, p._id);
    await request(app).delete(`/api/projects/${p._id}`).set(as(a));
    const pays = await request(app).get('/api/payments').set(as(a));
    expect(pays.body).toEqual([]);
  });
});

describe('payments', () => {
  let project;
  beforeEach(async () => {
    const c = await mkClient(a);
    project = await mkProject(a, c._id, { amount: 1000 });
  });

  it('records a payment with defaults', async () => {
    const res = await request(app).post('/api/payments').set(as(a)).send({ project: project._id, amount: 250 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ amount: 250, method: 'Bank Transfer', status: 'paid' });
  });

  it('requires project and amount, accepts amount 0', async () => {
    expect((await request(app).post('/api/payments').set(as(a)).send({ amount: 5 })).status).toBe(400);
    expect((await request(app).post('/api/payments').set(as(a)).send({ project: project._id })).status).toBe(400);
    expect((await request(app).post('/api/payments').set(as(a)).send({ project: project._id, amount: 0 })).status).toBe(201);
  });

  it('rejects negative amounts, unknown methods, and foreign projects', async () => {
    expect((await request(app).post('/api/payments').set(as(a)).send({ project: project._id, amount: -1 })).status).toBe(400);
    expect((await request(app).post('/api/payments').set(as(a)).send({ project: project._id, amount: 1, method: 'Bitcoin' })).status).toBe(400);
    const foreign = await request(app).post('/api/payments').set(as(b)).send({ project: project._id, amount: 1 });
    expect(foreign.status).toBe(400);
    expect(foreign.body.message).toBe('Project not found');
  });

  it('cannot move a payment to another project on update', async () => {
    const c2 = await mkClient(a, { name: 'C2' });
    const other = await mkProject(a, c2._id);
    const pay = await mkPayment(a, project._id);
    const res = await request(app).put(`/api/payments/${pay._id}`).set(as(a)).send({ project: other._id, amount: 55 });
    expect(res.body.project).toBe(project._id);
    expect(res.body.amount).toBe(55);
  });

  it('lists with populated project/client and filters', async () => {
    await mkPayment(a, project._id, { status: 'pending' });
    await mkPayment(a, project._id, { status: 'paid' });
    const all = await request(app).get('/api/payments').set(as(a));
    expect(all.body).toHaveLength(2);
    expect(all.body[0].project.client.name).toBe('Apex');
    const pending = await request(app).get('/api/payments?status=pending').set(as(a));
    expect(pending.body).toHaveLength(1);
    const byProject = await request(app).get(`/api/payments?project=${id()}`).set(as(a));
    expect(byProject.body).toEqual([]);
  });

  it('summary reports this-year receipts, pending balances and transaction count', async () => {
    const lastYear = new Date(new Date().getFullYear() - 1, 5, 1);
    await mkPayment(a, project._id, { amount: 300 });
    await mkPayment(a, project._id, { amount: 900, paymentDate: lastYear });
    await mkPayment(a, project._id, { amount: 50, status: 'pending' });
    const res = await request(app).get('/api/payments/summary').set(as(a));
    expect(res.body).toEqual({
      totalReceivedThisYear: 300,
      pendingAmount: 0, // 300 + 900 received >= 1000 budget
      outstandingProjects: 0,
      transactions: 3,
    });
  });

  it('summary lists outstanding balance when under-paid', async () => {
    await mkPayment(a, project._id, { amount: 300 });
    const res = await request(app).get('/api/payments/summary').set(as(a));
    expect(res.body).toMatchObject({ pendingAmount: 700, outstandingProjects: 1 });
  });

  it('deletes a payment', async () => {
    const pay = await mkPayment(a, project._id);
    expect((await request(app).delete(`/api/payments/${pay._id}`).set(as(a))).status).toBe(200);
    expect((await request(app).get(`/api/payments/${pay._id}`).set(as(a))).status).toBe(404);
  });
});

describe('tenant isolation', () => {
  it("user B cannot read, change or delete user A's records", async () => {
    const c = await mkClient(a);
    const p = await mkProject(a, c._id);
    const pay = await mkPayment(a, p._id);

    for (const [kind, rec] of [['clients', c], ['projects', p], ['payments', pay]]) {
      expect((await request(app).get(`/api/${kind}/${rec._id}`).set(as(b))).status).toBe(404);
      expect((await request(app).put(`/api/${kind}/${rec._id}`).set(as(b)).send({ name: 'hack' })).status).toBe(404);
      expect((await request(app).delete(`/api/${kind}/${rec._id}`).set(as(b))).status).toBe(404);
    }
    expect((await request(app).get('/api/clients').set(as(b))).body.total).toBe(0);
    expect((await request(app).get('/api/projects').set(as(b))).body).toEqual([]);
    expect((await request(app).get('/api/payments').set(as(b))).body).toEqual([]);
  });
});

describe('dashboard', () => {
  it('aggregates counts, money and deadlines', async () => {
    const c = await mkClient(a);
    const day = 86400000;
    const future = new Date(Date.now() + 5 * day);
    const past = new Date(Date.now() - 5 * day);
    const p1 = await mkProject(a, c._id, { amount: 1000, deadline: future, status: 'in-progress' });
    await mkProject(a, c._id, { amount: 500, deadline: past }); // overdue
    await mkProject(a, c._id, { amount: 9999, status: 'cancelled' });
    await mkProject(a, c._id, { amount: 200, deadline: past, status: 'completed' }); // not overdue
    await mkPayment(a, p1._id, { amount: 400 });
    await mkPayment(a, p1._id, { amount: 77, status: 'pending' });

    const res = await request(app).get('/api/dashboard/stats').set(as(a));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      totalClients: 1,
      totalProjects: 4,
      projectsByStatus: { 'in-progress': 1, pending: 1, cancelled: 1, completed: 1 },
      totalBilled: 1700, // cancelled excluded
      totalReceived: 400,
      outstanding: 1300,
      overdueProjects: 1,
    });
    expect(res.body.upcomingDeadlines).toHaveLength(1);
    expect(res.body.upcomingDeadlines[0].client.name).toBe('Apex');
  });

  it('returns zeros for an empty workspace', async () => {
    const res = await request(app).get('/api/dashboard/stats').set(as(a));
    expect(res.body).toMatchObject({ totalClients: 0, totalProjects: 0, totalBilled: 0, outstanding: 0 });
  });
});

describe('reports', () => {
  it('projects report totals paid/balance and honours filters', async () => {
    const c = await mkClient(a);
    const p1 = await mkProject(a, c._id, { amount: 1000, status: 'review' });
    await mkProject(a, c._id, { amount: 500 });
    await mkPayment(a, p1._id, { amount: 250 });

    const all = await request(app).get('/api/reports/projects').set(as(a));
    expect(all.body).toMatchObject({ count: 2, totalAmount: 1500, totalPaid: 250 });
    const row = all.body.rows.find((r) => r._id === p1._id);
    expect(row).toMatchObject({ amountPaid: 250, balance: 750 });

    const filtered = await request(app).get('/api/reports/projects?status=review').set(as(a));
    expect(filtered.body.count).toBe(1);

    const future = await request(app)
      .get(`/api/reports/projects?from=${new Date(Date.now() + 864e5).toISOString()}`)
      .set(as(a));
    expect(future.body.count).toBe(0);
  });

  it('payments report filters by date range and status', async () => {
    const c = await mkClient(a);
    const p = await mkProject(a, c._id);
    await mkPayment(a, p._id, { amount: 100, paymentDate: '2025-01-15' });
    await mkPayment(a, p._id, { amount: 200, paymentDate: '2025-06-15' });
    await mkPayment(a, p._id, { amount: 300, paymentDate: '2025-06-20', status: 'pending' });

    const range = await request(app).get('/api/reports/payments?from=2025-06-01&to=2025-06-30').set(as(a));
    expect(range.body).toMatchObject({ count: 2, total: 500 });
    const status = await request(app).get('/api/reports/payments?status=paid').set(as(a));
    expect(status.body).toMatchObject({ count: 2, total: 300 });
  });
});
