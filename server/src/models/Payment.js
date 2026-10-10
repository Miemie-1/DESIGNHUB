const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, default: Date.now },
    method: {
      type: String,
      enum: ['Bank Transfer', 'Cash', 'Card', 'Mobile Money', 'Cheque', 'Other'],
      default: 'Bank Transfer',
    },
    reference: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'partial', 'paid'], default: 'paid' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
