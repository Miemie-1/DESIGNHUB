const mongoose = require('mongoose');
const Payment = require('../models/Payment');

const oid = (id) => new mongoose.Types.ObjectId(String(id));

// Amount received per project (payments marked "pending" are not counted as received).
async function paidByProject(userId, projectIds) {
  if (!projectIds.length) return {};
  const rows = await Payment.aggregate([
    {
      $match: {
        user: oid(userId),
        project: { $in: projectIds.map(oid) },
        status: { $ne: 'pending' },
      },
    },
    { $group: { _id: '$project', paid: { $sum: '$amount' } } },
  ]);
  return Object.fromEntries(rows.map((r) => [String(r._id), r.paid]));
}

const balanceOf = (project, paidMap) =>
  Math.max(0, (project.amount || 0) - (paidMap[String(project._id)] || 0));

module.exports = { oid, paidByProject, balanceOf };
