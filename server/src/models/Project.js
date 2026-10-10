const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, trim: true }, // e.g. logo, flyer, branding
    description: { type: String, trim: true },
    deliverables: [{ type: String, trim: true }],
    startDate: { type: Date },
    deadline: { type: Date },
    amount: { type: Number, default: 0, min: 0 }, // project budget
    progress: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'review', 'completed', 'cancelled'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);
