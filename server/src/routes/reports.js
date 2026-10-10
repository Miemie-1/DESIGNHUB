const router = require('express').Router();
const mongoose = require('mongoose');
const Project = require('../models/Project');
const Payment = require('../models/Payment');

const dateRange = (field, { from, to }) => {
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) range.$lte = new Date(to);
  return Object.keys(range).length ? { [field]: range } : {};
};

// GET /api/reports/projects?from=&to=&status=&client=
router.get('/projects', async (req, res, next) => {
  try {
    const filter = { user: req.userId, ...dateRange('createdAt', req.query) };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.client) filter.client = req.query.client;

    const projects = await Project.find(filter)
      .populate('client', 'name businessName')
      .sort({ createdAt: -1 });

    const paid = await Payment.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.userId),
          project: { $in: projects.map((p) => p._id) },
          status: { $ne: 'pending' },
        },
      },
      { $group: { _id: '$project', paid: { $sum: '$amount' } } },
    ]);
    const paidMap = Object.fromEntries(paid.map((p) => [String(p._id), p.paid]));

    const rows = projects.map((p) => {
      const amountPaid = paidMap[String(p._id)] || 0;
      return { ...p.toObject(), amountPaid, balance: p.amount - amountPaid };
    });

    res.json({
      count: rows.length,
      totalAmount: rows.reduce((s, r) => s + r.amount, 0),
      totalPaid: rows.reduce((s, r) => s + r.amountPaid, 0),
      rows,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/payments?from=&to=&status=
router.get('/payments', async (req, res, next) => {
  try {
    const filter = { user: req.userId, ...dateRange('paymentDate', req.query) };
    if (req.query.status) filter.status = req.query.status;
    const rows = await Payment.find(filter)
      .populate('project', 'name amount')
      .sort({ paymentDate: -1 });
    res.json({ count: rows.length, total: rows.reduce((s, r) => s + r.amount, 0), rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
