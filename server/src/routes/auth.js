const router = require('express').Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const seedDemo = require('../seedDemo');

const DEMO_EMAIL = 'demo@designhub.app';

const sign = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone || '',
  workspaceName: u.workspaceName || 'DesignHub',
});

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    if (await User.findOne({ email: email.toLowerCase() }))
      return res.status(409).json({ message: 'Email already registered' });

    const user = await User.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
    });
    res.status(201).json({ token: sign(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = email && (await User.findOne({ email: email.toLowerCase() }));
    if (!user || !(await bcrypt.compare(password || '', user.passwordHash)))
      return res.status(401).json({ message: 'Invalid email or password' });

    res.json({ token: sign(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// "Continue as demo": shared sample account with seeded data. Disable with ENABLE_DEMO=false.
router.post('/demo', async (_req, res, next) => {
  try {
    if (process.env.ENABLE_DEMO === 'false')
      return res.status(404).json({ message: 'Demo account is disabled' });

    let user = await User.findOne({ email: DEMO_EMAIL });
    if (!user) {
      user = await User.create({
        name: 'Demo Designer',
        email: DEMO_EMAIL,
        // random password: the demo account can only be entered through this endpoint
        passwordHash: await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10),
      });
      await seedDemo(user._id);
    }
    res.json({ token: sign(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.put('/me', auth, async (req, res, next) => {
  try {
    const { name, email, phone, workspaceName } = req.body;
    if (!name || !email) return res.status(400).json({ message: 'Name and email are required' });

    const taken = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.userId } });
    if (taken) return res.status(409).json({ message: 'Email already in use' });

    const user = await User.findByIdAndUpdate(
      req.userId,
      { name, email, phone, workspaceName: workspaceName || 'DesignHub' },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.put('/password', auth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters' });

    const user = await User.findById(req.userId);
    if (!user || !(await bcrypt.compare(currentPassword || '', user.passwordHash)))
      return res.status(401).json({ message: 'Current password is incorrect' });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
