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
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    total, pending, inProgress, resolved, critical, users,
    byCategory, byDept, trend, topAreas, satisfaction, avgResArr
  ] = await Promise.all([
    Issue.countDocuments(),
    Issue.countDocuments({ status: 'pending' }),
    Issue.countDocuments({ status: 'in_progress' }),
    Issue.countDocuments({ status: 'resolved' }),
    Issue.countDocuments({ priority: 'critical' }),
    User.countDocuments({ role: 'citizen' }),

    // Issues by category
    Issue.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    // Department performance
    Issue.aggregate([
      {
        $group: {
          _id: '$department',
          total:      { $sum: 1 },
          resolved:   { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          pending:    { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          avgDays: {
            $avg: {
              $cond: [
                { $and: [{ $eq: ['$status', 'resolved'] }, { $ifNull: ['$resolvedAt', false] }] },
                { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 86400000] },
                null,
              ],
            },
          },
        },
      },
      { $sort: { total: -1 } },
    ]),

    // 7-day trend — reported by createdAt, resolved by resolvedAt
    Promise.all([
      Issue.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      ]),
      Issue.aggregate([
        { $match: { resolvedAt: { $gte: sevenDaysAgo, $exists: true } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$resolvedAt' } }, count: { $sum: 1 } } },
      ]),
    ]).then(([rep, res]) => {
      const map = {};
      rep.forEach(r => { map[r._id] = map[r._id] || { _id: r._id, reported: 0, resolved: 0 }; map[r._id].reported = r.count; });
      res.forEach(r => { map[r._id] = map[r._id] || { _id: r._id, reported: 0, resolved: 0 }; map[r._id].resolved = r.count; });
      return Object.values(map).sort((a, b) => a._id.localeCompare(b._id));
    }),

    // Top hotspot areas
    Issue.aggregate([
      { $match: { 'location.area': { $exists: true, $ne: '' } } },
      { $group: { _id: '$location.area', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),

    // Satisfaction ratings
    Issue.aggregate([
      { $match: { satisfactionRating: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: null,
          avg:   { $avg: '$satisfactionRating' },
          count: { $sum: 1 },
        },
      },
    ]),

    // Avg resolution days
    Issue.aggregate([
      { $match: { status: 'resolved', resolvedAt: { $exists: true } } },
      {
        $group: {
          _id: null,
          avgDays: { $avg: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 86400000] } },
        },
      },
    ]),
  ]);

  const resolutionRate    = total ? Math.round((resolved / total) * 100) : 0;
  const avgResolutionDays = avgResArr[0] ? Number(avgResArr[0].avgDays).toFixed(1) : null;

  success(res, {
    kpis: { total, pending, inProgress, resolved, critical, users, resolutionRate, avgResolutionDays },
    byCategory,
    byDept,
    trend,
    topAreas,
    satisfaction: satisfaction[0]
      ? { avg: satisfaction[0].avg, count: satisfaction[0].count }
      : { avg: 0, count: 0 },
  });
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


// ─────────────────────────────────────────────────────────────
// GET /api/admin/compensation  (admin — list all officers with compensation owed)
// ─────────────────────────────────────────────────────────────
router.get('/compensation', authorize('admin'), asyncHandler(async (req, res) => {
  const officers = await User.find({
    role: 'department',
    compensationOwed: { $gt: 0 },
  }).select('name email department compensationOwed compensationPaid penaltyPoints').sort('-compensationOwed');

  const totalOwed = officers.reduce((sum, o) => sum + (o.compensationOwed || 0), 0);
  const totalPaid = officers.reduce((sum, o) => sum + (o.compensationPaid || 0), 0);

  success(res, { officers, summary: { totalOwed, totalPaid, outstanding: totalOwed - totalPaid } });
}));

// ─────────────────────────────────────────────────────────────
// POST /api/admin/compensation/:officerId/clear  (admin — mark compensation as paid/cleared)
// ─────────────────────────────────────────────────────────────
router.post('/compensation/:officerId/clear', authorize('admin'), asyncHandler(async (req, res) => {
  const { amount } = req.body;  // optional — clears full owed if not specified
  const officer = await User.findById(req.params.officerId);
  if (!officer) throw new ApiError('Officer not found', 404);

  const clearAmount = amount ? Number(amount) : officer.compensationOwed;

  officer.compensationPaid += clearAmount;
  officer.compensationOwed  = Math.max(0, officer.compensationOwed - clearAmount);
  await officer.save();

  success(res, {
    message: `₹${clearAmount} cleared for ${officer.name}`,
    officer: { name: officer.name, compensationOwed: officer.compensationOwed, compensationPaid: officer.compensationPaid },
  });
}));

module.exports = router;