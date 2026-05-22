const express      = require('express');
const router       = express.Router();
const User         = require('../models/User');
const ApiError     = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { protect }  = require('../middleware/auth');
const { registerRules, loginRules, validate } = require('../middleware/validate');
const { success }  = require('../utils/response');

const DEPARTMENTS = [
  { dept:'Public Works Department (PWD)',
    head:    { name:'PWD Department Head',      email:'pwd@civicpulse.in',                 password:'pwd@123' },
    officer: { name:'PWD Field Officer',         email:'pwd.officer@civicpulse.in',         password:'pwd.officer@123' } },
  { dept:'KMC Water Supply Department',
    head:    { name:'Water Dept Head',           email:'water@civicpulse.in',               password:'water@123' },
    officer: { name:'Water Supply Officer',      email:'water.officer@civicpulse.in',       password:'water.officer@123' } },
  { dept:'Sanitation & Solid Waste Dept',
    head:    { name:'Sanitation Dept Head',      email:'sanitation@civicpulse.in',          password:'sanitation@123' },
    officer: { name:'Sanitation Officer',        email:'sanitation.officer@civicpulse.in',  password:'sanitation.officer@123' } },
  { dept:'CESC / KMC Lighting Division',
    head:    { name:'Electricity Dept Head',     email:'electricity@civicpulse.in',         password:'electricity@123' },
    officer: { name:'Electricity Field Officer', email:'electricity.officer@civicpulse.in', password:'electricity.officer@123' } },
  { dept:'KMC Enforcement Team',
    head:    { name:'Enforcement Dept Head',     email:'enforcement@civicpulse.in',         password:'enforcement@123' },
    officer: { name:'Enforcement Officer',       email:'enforcement.officer@civicpulse.in', password:'enforcement.officer@123' } },
  { dept:'KMC General Grievance Cell',
    head:    { name:'Grievance Cell Head',       email:'grievance@civicpulse.in',           password:'grievance@123' },
    officer: { name:'Grievance Officer',         email:'grievance.officer@civicpulse.in',   password:'grievance.officer@123' } },
];

// POST /api/auth/register
router.post('/register', registerRules, validate, asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;
  if (await User.findOne({ email })) throw new ApiError('Email already registered', 400);
  const user = await User.create({ name, email, password, phone, role: role || 'citizen' });
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
  const user = await User.findByIdAndUpdate(req.user._id, { name, phone, area, ward }, { new:true, runValidators:true });
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

// GET /api/auth/seed-departments — creates all accounts
router.get('/seed-departments', asyncHandler(async (req, res) => {
  const created = [];

  // Admin
  await User.findOneAndDelete({ email:'admin@civicpulse.in' });
  await User.create({ name:'Admin User', email:'admin@civicpulse.in', password:'password123', role:'admin' });
  created.push({ role:'admin', email:'admin@civicpulse.in', password:'password123' });

  for (const d of DEPARTMENTS) {
    // Dept Head (isHead: true)
    await User.findOneAndDelete({ email:d.head.email });
    await User.create({ name:d.head.name, email:d.head.email, password:d.head.password, role:'department', department:d.dept, isHead:true });
    created.push({ role:'dept_head', isHead:true, dept:d.dept, email:d.head.email, password:d.head.password });

    // Field Officer (isHead: false)
    await User.findOneAndDelete({ email:d.officer.email });
    await User.create({ name:d.officer.name, email:d.officer.email, password:d.officer.password, role:'department', department:d.dept, isHead:false });
    created.push({ role:'officer', isHead:false, dept:d.dept, email:d.officer.email, password:d.officer.password });
  }

  res.json({ success:true, message:`✅ Created ${created.length} accounts`, accounts:created });
}));

module.exports = router;