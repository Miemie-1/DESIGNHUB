const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, trim: true },
    workspaceName: { type: String, trim: true, default: 'DesignHub' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
