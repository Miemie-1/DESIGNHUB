const router = require('express').Router();
const Project = require('../models/Project');
const Client = require('../models/Client');
const Payment = require('../models/Payment');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const FIELDS = [
  'client', 'name', 'type', 'description', 'deliverables',
  'startDate', 'deadline', 'amount', 'progress', 'status',
];

function pick(body) {
  const data = Object.fromEntries(
    FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]])
  );
  // allow deliverables as a newline-separated string or an array
  if (typeof data.deliverables === 'string')
    data.deliverables = data.deliverables.split('\n').map((s) => s.trim()).filter(Boolean);
  if (data.status === 'completed') data.progress = 100;
  return data;
}

// GET /api/projects?search=logo&status=pending&client=<id>
router.get('/', async (req, res, next) => {
  try {
    const filter = { user: req.userId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.client) filter.client = req.query.client;
    if (req.query.search) {
      const rx = new RegExp(escapeRegex(req.query.search), 'i');
      filter.$or = [{ name: rx }, { type: rx }, { description: rx }];
    }
    res.json(await Project.find(filter).populate('client', 'name businessName').sort({ deadline: 1 }));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const data = pick(req.body);
    if (!data.name || !data.client)
      return res.status(400).json({ message: 'Project name and client are required' });
    if (!(await Client.exists({ _id: data.client, user: req.userId })))
      return res.status(400).json({ message: 'Client not found' });
    res.status(201).json(await Project.create({ ...data, user: req.userId }));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, user: req.userId }).populate('client');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const payments = await Payment.find({ project: project._id, user: req.userId }).sort({
      paymentDate: -1,
    });
    const totalPaid = payments
      .filter((p) => p.status !== 'pending')
      .reduce((s, p) => s + p.amount, 0);
    res.json({
      ...project.toObject(),
      payments,
      totalPaid,
      balance: Math.max(0, project.amount - totalPaid),
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const data = pick(req.body);
    if (data.client && !(await Client.exists({ _id: data.client, user: req.userId })))
      return res.status(400).json({ message: 'Client not found' });
    const project = await Project.findOneAndUpdate({ _id: req.params.id, user: req.userId }, data, {
      new: true,
      runValidators: true,
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    await Payment.deleteMany({ project: project._id, user: req.userId });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
