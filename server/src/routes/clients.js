const router = require('express').Router();
const Client = require('../models/Client');
const Project = require('../models/Project');
const { paidByProject, balanceOf } = require('../lib/finance');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const FIELDS = ['name', 'phone', 'email', 'businessName', 'address', 'notes', 'status'];
const pick = (body) =>
  Object.fromEntries(FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

// GET /api/clients?search=ada&page=1&limit=10
// -> { items: [{...client, projectCount, totalSpent}], total, page, pages }
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const filter = { user: req.userId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      const rx = new RegExp(escapeRegex(req.query.search), 'i');
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { businessName: rx }, { address: rx }];
    }

    const [total, clients] = await Promise.all([
      Client.countDocuments(filter),
      Client.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);

    const projects = await Project.find(
      { user: req.userId, client: { $in: clients.map((c) => c._id) } },
      'client'
    ).lean();
    const paid = await paidByProject(req.userId, projects.map((p) => p._id));

    const stats = {};
    for (const p of projects) {
      const s = (stats[String(p.client)] ||= { projectCount: 0, totalSpent: 0 });
      s.projectCount += 1;
      s.totalSpent += paid[String(p._id)] || 0;
    }

    res.json({
      items: clients.map((c) => ({
        ...c,
        projectCount: stats[String(c._id)]?.projectCount || 0,
        totalSpent: stats[String(c._id)]?.totalSpent || 0,
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const data = pick(req.body);
    if (!data.name) return res.status(400).json({ message: 'Client name is required' });
    res.status(201).json(await Client.create({ ...data, user: req.userId }));
  } catch (err) {
    next(err);
  }
});

// Client profile + project history + financial summary
router.get('/:id', async (req, res, next) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, user: req.userId }).lean();
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const projects = await Project.find({ client: client._id, user: req.userId })
      .sort({ deadline: -1 })
      .lean();
    const paid = await paidByProject(req.userId, projects.map((p) => p._id));

    const open = projects.filter((p) => p.status !== 'cancelled');
    const totalPaid = projects.reduce((s, p) => s + (paid[String(p._id)] || 0), 0);

    res.json({
      ...client,
      projects: projects.map((p) => ({ ...p, amountPaid: paid[String(p._id)] || 0 })),
      stats: {
        totalProjects: projects.length,
        activeProjects: projects.filter((p) => !['completed', 'cancelled'].includes(p.status)).length,
        completedProjects: projects.filter((p) => p.status === 'completed').length,
        totalPaid,
        outstanding: open.reduce((s, p) => s + balanceOf(p, paid), 0),
        pendingInvoices: open.filter((p) => balanceOf(p, paid) > 0).length,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      pick(req.body),
      { new: true, runValidators: true }
    );
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json(client);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (await Project.exists({ client: req.params.id, user: req.userId }))
      return res.status(409).json({ message: 'Cannot delete a client that has projects' });
    const client = await Client.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json({ message: 'Client deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
