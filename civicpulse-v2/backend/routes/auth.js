const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const ApiError    = require('../utils/ApiError');
const asyncHandler= require('../utils/asyncHandler');
const { protect } = require('../middleware/auth');
const { registerRules, loginRules, validate } = require('../middleware/validate');
const { success }  = require('../utils/response');

// POST /api/auth/register
router.post('/register', registerRules, validate, asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;
  if (await User.findOne({ email })) throw new ApiError('Email already registered', 400);
  const user  = await User.create({ name, email, password, phone, role: role || 'citizen' });
  success(res, { token: user.getSignedToken(), user }, 201);
}));

// POST /api/auth/login
router.post('/login', loginRules, validate, asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password)))
    throw new ApiError('Invalid credentials', 401);
  user.lastLogin  = new Date();
  user.loginCount += 1;
  await user.save({ validateBeforeSave: false });
  success(res, { token: user.getSignedToken(), user });
}));

// GET /api/auth/me
router.get('/me', protect, (req, res) => success(res, { user: req.user }));

// PUT /api/auth/updateprofile
router.put('/updateprofile', protect, asyncHandler(async (req, res) => {
  const { name, phone, area, ward } = req.body;
  const user = await User.findByIdAndUpdate(req.user._id, { name, phone, area, ward }, { new: true, runValidators: true });
  success(res, { user });
}));

// PUT /api/auth/updatepassword
router.put('/updatepassword', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(req.body.currentPassword)))
    throw new ApiError('Current password is incorrect', 400);
  user.password = req.body.newPassword;
  await user.save();
  success(res, { token: user.getSignedToken() });
}));

const bcrypt = require('bcryptjs');
const User = require('../models/User');

router.get('/seed-admin', async (req, res) => {
  const salt = await bcrypt.genSalt(10);
  const pass = await bcrypt.hash('password123', salt);
  await User.findOneAndUpdate(
    { email: 'admin@civicpulse.in' },
    { name: 'Admin User', email: 'admin@civicpulse.in', password: pass, role: 'admin' },
    { upsert: true }
  );
  await User.findOneAndUpdate(
    { email: 'officer@civicpulse.in' },
    { name: 'PWD Officer', email: 'officer@civicpulse.in', password: pass, role: 'department', department: 'Public Works Department (PWD)' },
    { upsert: true }
  );
  res.json({ message: 'Admin and Officer created!' });
});

module.exports = router;
