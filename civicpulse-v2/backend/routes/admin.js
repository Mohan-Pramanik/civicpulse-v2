/**
 * Routes that require admin OR department-head privilege.
 * Mount at: /api/admin
 *
 * Key additions vs original:
 *   GET  /my-officers      → dept head fetches own officers (no admin needed)
 *   POST /my-officers      → dept head creates a new officer in their dept
 */
const express      = require('express');
const router       = express.Router();
const User         = require('../models/User');
const Issue        = require('../models/Issue');
const ApiError     = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { protect, authorize } = require('../middleware/auth');
const { success, paginated } = require('../utils/response');

// ── All admin routes require login ────────────────────────────
router.use(protect);

// ─────────────────────────────────────────────────────────────
// GET /api/admin/stats  (admin only)
// ─────────────────────────────────────────────────────────────
router.get('/stats', authorize('admin'), asyncHandler(async (req, res) => {
  const [total, pending, inProgress, resolved, critical, users] = await Promise.all([
    Issue.countDocuments(),
    Issue.countDocuments({ status: 'pending' }),
    Issue.countDocuments({ status: 'in_progress' }),
    Issue.countDocuments({ status: 'resolved' }),
    Issue.countDocuments({ priority: 'critical' }),
    User.countDocuments({ role: 'citizen' }),
  ]);
  const resolutionRate = total ? Math.round((resolved / total) * 100) : 0;
  success(res, { kpis: { total, pending, inProgress, resolved, critical, users, resolutionRate } });
}));

// ─────────────────────────────────────────────────────────────
// GET /api/admin/dept-stats  (admin + dept head)
// ─────────────────────────────────────────────────────────────
router.get('/dept-stats', authorize('admin', 'department'), asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { department: req.user.department };

  const [total, pending, inProgress, resolved, critical] = await Promise.all([
    Issue.countDocuments(filter),
    Issue.countDocuments({ ...filter, status: 'pending' }),
    Issue.countDocuments({ ...filter, status: 'in_progress' }),
    Issue.countDocuments({ ...filter, status: 'resolved' }),
    Issue.countDocuments({ ...filter, priority: 'critical' }),
  ]);
  const resolutionRate = total ? Math.round((resolved / total) * 100) : 0;
  success(res, { kpis: { total, pending, inProgress, resolved, critical, resolutionRate } });
}));

// ─────────────────────────────────────────────────────────────
// GET /api/admin/issues  (admin + dept head — dept head sees only their dept)
// ─────────────────────────────────────────────────────────────
router.get('/issues', authorize('admin', 'department'), asyncHandler(async (req, res) => {
  const { status, priority, limit = 100, page = 1 } = req.query;

  const filter = {};
  if (req.user.role === 'department') filter.department = req.user.department;
  if (status)   filter.status   = status;
  if (priority) filter.priority = priority;

  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    Issue.find(filter)
      .populate('reportedBy', 'name email')
      .populate('assignedTo', 'name email phone department')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit)),
    Issue.countDocuments(filter),
  ]);

  paginated(res, data, total, page, limit);
}));

// ─────────────────────────────────────────────────────────────
// GET /api/admin/users  (admin only)
// ─────────────────────────────────────────────────────────────
router.get('/users', authorize('admin', 'department'), asyncHandler(async (req, res) => {
  const { role, department, page = 1, limit = 50 } = req.query;

  const filter = {};
  if (role)       filter.role       = role;
  if (department) filter.department = department;

  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    User.find(filter).sort('-createdAt').skip(skip).limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  paginated(res, data, total, page, limit);
}));

// ─────────────────────────────────────────────────────────────
// POST /api/admin/users  (admin only — creates any account)
// ─────────────────────────────────────────────────────────────
router.post('/users', authorize('admin'), asyncHandler(async (req, res) => {
  const { name, email, password, role, department, isHead, phone } = req.body;
  if (await User.findOne({ email })) throw new ApiError('Email already registered', 400);
  const user = await User.create({ name, email, password, role, department, isHead, phone });
  success(res, { user }, 201);
}));

// ─────────────────────────────────────────────────────────────
// PUT /api/admin/users/:id  (admin only)
// ─────────────────────────────────────────────────────────────
router.put('/users/:id', authorize('admin'), asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!user) throw new ApiError('User not found', 404);
  success(res, { user });
}));

// ─────────────────────────────────────────────────────────────
// DELETE /api/admin/users/:id  (admin only)
// ─────────────────────────────────────────────────────────────
router.delete('/users/:id', authorize('admin'), asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new ApiError('User not found', 404);
  success(res, { message: 'User deleted' });
}));

// ─────────────────────────────────────────────────────────────
// GET /api/admin/officers  (admin — all officers; or filter by dept)
// ─────────────────────────────────────────────────────────────
router.get('/officers', authorize('admin', 'department'), asyncHandler(async (req, res) => {
  const filter = { role: 'department', isHead: false };
  if (req.user.role === 'department') filter.department = req.user.department;
  else if (req.query.department)      filter.department = req.query.department;

  const officers = await User.find(filter).sort('name');
  success(res, { data: officers });
}));

// ─────────────────────────────────────────────────────────────
// GET /api/admin/my-officers
// Dept head fetches officers in THEIR OWN department only.
// Also accessible by admin (returns all officers if admin).
// ─────────────────────────────────────────────────────────────
router.get('/my-officers', authorize('admin', 'department'), asyncHandler(async (req, res) => {
  const filter = { role: 'department', isHead: false };
  if (req.user.role === 'department') {
    filter.department = req.user.department;
    filter._id        = { $ne: req.user._id }; // exclude self
  }
  const officers = await User.find(filter).sort('name');
  success(res, { data: officers });
}));

// ─────────────────────────────────────────────────────────────
// POST /api/admin/my-officers
// Dept head creates a new field officer in their own department.
// Officer is automatically assigned the head's department.
// ─────────────────────────────────────────────────────────────
router.post('/my-officers', authorize('admin', 'department'), asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    throw new ApiError('name, email and password are required', 400);
  }
  if (password.length < 6) {
    throw new ApiError('Password must be at least 6 characters', 400);
  }

  // 🇮🇳 India-only phone check
  if (phone && !/^\+91[6-9]\d{9}$/.test(phone)) {
    throw new ApiError('Only Indian phone numbers allowed (+91XXXXXXXXXX)', 400);
  }

  if (await User.findOne({ email })) {
    throw new ApiError('Email already registered', 400);
  }

  // Dept is always the head's own department
  const department = req.user.role === 'department'
    ? req.user.department
    : req.body.department;   // admin can specify

  if (!department) throw new ApiError('department is required', 400);

  const officer = await User.create({
    name,
    email,
    password,
    phone,
    role:       'department',
    department,
    isHead:     false,
  });

  success(res, { user: officer }, 201);
}));

// ─────────────────────────────────────────────────────────────
// PUT /api/admin/issues/:id/assign  (admin + dept head)
// ─────────────────────────────────────────────────────────────
router.put('/issues/:id/assign', authorize('admin', 'department'), asyncHandler(async (req, res) => {
  const { officerId, userId, message } = req.body;
  const assignTo = officerId || userId;
  if (!assignTo) throw new ApiError('officerId is required', 400);

  const issue = await Issue.findByIdAndUpdate(
    req.params.id,
    {
      assignedTo: assignTo,
      status:     'assigned',
      $push: {
        statusHistory: {
          status:    'assigned',
          message:   message || 'Assigned to field officer',
          updatedBy: req.user._id,
        },
      },
    },
    { new: true }
  ).populate('assignedTo', 'name email phone department');

  if (!issue) throw new ApiError('Issue not found', 404);
  success(res, { issue });
}));

// ─────────────────────────────────────────────────────────────
// POST /api/admin/bulk-status  (admin only)
// ─────────────────────────────────────────────────────────────
router.post('/bulk-status', authorize('admin'), asyncHandler(async (req, res) => {
  const { ids, status, message } = req.body;
  if (!ids?.length) throw new ApiError('ids array is required', 400);

  await Issue.updateMany(
    { _id: { $in: ids } },
    {
      status,
      $push: {
        statusHistory: { status, message: message || `Bulk update to ${status}`, updatedBy: req.user._id },
      },
    }
  );
  success(res, { updated: ids.length });
}));

// ─────────────────────────────────────────────────────────────
// GET /api/admin/export  (admin only — CSV-friendly JSON)
// ─────────────────────────────────────────────────────────────
router.get('/export', authorize('admin'), asyncHandler(async (req, res) => {
  const issues = await Issue.find()
    .populate('reportedBy', 'name email')
    .populate('assignedTo', 'name email department')
    .sort('-createdAt')
    .limit(5000);
  success(res, { data: issues, count: issues.length });
}));

module.exports = router;