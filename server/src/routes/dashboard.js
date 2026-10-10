const router = require('express').Router();
const mongoose = require('mongoose');
const Client = require('../models/Client');
const Project = require('../models/Project');
const Payment = require('../models/Payment');

const OPEN = { $nin: ['completed', 'cancelled'] };

// GET /api/dashboard/stats
router.get('/stats', async (req, res, next) => {
  try {
    const user = new mongoose.Types.ObjectId(req.userId);
    const now = new Date();

    const [totalClients, statusCounts, received, billed, upcoming, overdue] = await Promise.all([
      Client.countDocuments({ user }),
      Project.aggregate([{ $match: { user } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Payment.aggregate([
        { $match: { user, status: { $ne: 'pending' } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Project.aggregate([
        { $match: { user, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Project.find({ user, deadline: { $gte: now }, status: OPEN })
        .sort({ deadline: 1 })
        .limit(5)
        .populate('client', 'name'),
      Project.countDocuments({ user, deadline: { $lt: now }, status: OPEN }),
    ]);

    const projectsByStatus = Object.fromEntries(statusCounts.map((s) => [s._id, s.count]));
    const totalReceived = received[0]?.total || 0;
    const totalBilled = billed[0]?.total || 0;

    res.json({
      totalClients,
      totalProjects: Object.values(projectsByStatus).reduce((a, b) => a + b, 0),
      projectsByStatus,
      totalBilled,
      totalReceived,
      outstanding: totalBilled - totalReceived,
      overdueProjects: overdue,
      upcomingDeadlines: upcoming,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
