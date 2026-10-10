const router = require('express').Router();
const Payment = require('../models/Payment');
const Project = require('../models/Project');
const { oid, paidByProject, balanceOf } = require('../lib/finance');

const FIELDS = ['project', 'amount', 'paymentDate', 'method', 'reference', 'notes', 'status'];
const pick = (body) =>
  Object.fromEntries(FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

const withClient = {
  path: 'project',
  select: 'name amount client',
  populate: { path: 'client', select: 'name' },
};

// GET /api/payments/summary -> totals for the Payments page header cards
router.get('/summary', async (req, res, next) => {
  try {
    const yearStart = new Date(new Date().getFullYear(), 0, 1);

    const [thisYear, transactions, projects] = await Promise.all([
      Payment.aggregate([
        {
          $match: {
            user: oid(req.userId),
            status: { $ne: 'pending' },
            paymentDate: { $gte: yearStart },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.countDocuments({ user: req.userId }),
      Project.find({ user: req.userId, status: { $ne: 'cancelled' } }, 'amount').lean(),
    ]);

    const paid = await paidByProject(req.userId, projects.map((p) => p._id));
    const balances = projects.map((p) => balanceOf(p, paid)).filter((b) => b > 0);

    res.json({
      totalReceivedThisYear: thisYear[0]?.total || 0,
      pendingAmount: balances.reduce((s, b) => s + b, 0),
      outstandingProjects: balances.length,
      transactions,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/payments?project=<id>&status=paid
router.get('/', async (req, res, next) => {
  try {
    const filter = { user: req.userId };
    if (req.query.project) filter.project = req.query.project;
    if (req.query.status) filter.status = req.query.status;
    res.json(await Payment.find(filter).populate(withClient).sort({ paymentDate: -1 }));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, user: req.userId }).populate(withClient);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json(payment);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const data = pick(req.body);
    if (!data.project || data.amount === undefined || data.amount === '')
      return res.status(400).json({ message: 'Project and amount are required' });
    if (!(await Project.exists({ _id: data.project, user: req.userId })))
      return res.status(400).json({ message: 'Project not found' });
    res.status(201).json(await Payment.create({ ...data, user: req.userId }));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { project, ...data } = pick(req.body); // a payment cannot be moved to another project
    const payment = await Payment.findOneAndUpdate({ _id: req.params.id, user: req.userId }, data, {
      new: true,
      runValidators: true,
    });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json(payment);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const payment = await Payment.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json({ message: 'Payment deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
