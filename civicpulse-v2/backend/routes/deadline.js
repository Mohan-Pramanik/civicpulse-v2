/**
 * deadline.js  — backend/routes/deadline.js
 * New routes for deadline, penalty, and accountability system.
 * Mount in server.js: app.use('/api/deadline', require('./routes/deadline'));
 */

const express      = require('express');
const router       = express.Router();
const Issue        = require('../models/Issue');
const User         = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError     = require('../utils/ApiError');
const { protect, authorize } = require('../middleware/auth');
const { success, paginated } = require('../utils/response');

router.use(protect);

const adminOnly   = authorize('admin');
const adminOrDept = authorize('admin', 'department');

// ────────────────────────────────────────────────────────────
// PUT /api/deadline/assign/:id
// Assign issue to officer WITH a deadline (days from now)
// Body: { officerId, deadlineDays }
// ────────────────────────────────────────────────────────────
router.put('/assign/:id', adminOrDept, asyncHandler(async (req, res) => {
  const { officerId, deadlineDays } = req.body;

  if (!officerId)    throw new ApiError('officerId is required', 400);
  if (!deadlineDays) throw new ApiError('deadlineDays is required', 400);

  const officer = await User.findById(officerId);
  if (!officer) throw new ApiError('Officer not found', 404);

  // Dept head can only assign within their dept
  if (req.user.role === 'department' && officer.department !== req.user.department) {
    throw new ApiError('Cannot assign officer from another department', 403);
  }

  // Calculate deadline date
  const deadlineDate = new Date(Date.now() + Number(deadlineDays) * 24 * 3600 * 1000);

  const issue = await Issue.findByIdAndUpdate(
    req.params.id,
    {
      assignedTo: officerId,
      status:     'assigned',
      deadline:   deadlineDate,
      $push: {
        statusHistory: {
          status:    'assigned',
          message:   `Assigned to ${officer.name} with ${deadlineDays}-day deadline. Due: ${deadlineDate.toDateString()}`,
          updatedBy: req.user._id,
          timestamp: new Date()
        }
      }
    },
    { new: true }
  )
  .populate('assignedTo',  'name email phone department penaltyPoints accountabilityScore')
  .populate('reportedBy',  'name email phone');

  if (!issue) throw new ApiError('Issue not found', 404);

  // Increment officer's totalAssigned counter
  await User.findByIdAndUpdate(officerId, { $inc: { totalAssigned: 1 } });

  success(res, { issue });
}));

// ────────────────────────────────────────────────────────────
// GET /api/deadline/overdue
// Get all overdue issues
// ────────────────────────────────────────────────────────────
router.get('/overdue', adminOrDept, asyncHandler(async (req, res) => {
  const filter = {
    status:   { $nin: ['resolved', 'closed', 'rejected'] },
    deadline: { $lt: new Date() },
    assignedTo: { $exists: true }
  };

  // Dept officers/heads see only their dept
  if (req.user.role === 'department') {
    filter.department = req.user.department;
  }

  const issues = await Issue.find(filter)
    .populate('assignedTo', 'name email phone penaltyPoints accountabilityScore')
    .populate('reportedBy', 'name email phone')
    .sort({ deadline: 1 }); // oldest overdue first

  // Attach delayDays virtual for each
  const enriched = issues.map(issue => {
    const obj      = issue.toObject();
    const delayMs  = new Date() - issue.deadline;
    obj.delayDays  = Math.floor(delayMs / 86400000);
    obj.compensation = obj.delayDays * 100;
    return obj;
  });

  success(res, { issues: enriched, count: enriched.length });
}));

// ────────────────────────────────────────────────────────────
// POST /api/deadline/penalty/:officerId
// Manually add penalty points to an officer
// Body: { points, reason }
// ────────────────────────────────────────────────────────────
router.post('/penalty/:officerId', adminOnly, asyncHandler(async (req, res) => {
  const { points, reason } = req.body;
  if (!points) throw new ApiError('points is required', 400);

  const officer = await User.findByIdAndUpdate(
    req.params.officerId,
    { $inc: { penaltyPoints: Number(points) } },
    { new: true }
  );

  if (!officer) throw new ApiError('Officer not found', 404);

  success(res, {
    officer: {
      _id:           officer._id,
      name:          officer.name,
      penaltyPoints: officer.penaltyPoints,
      reason:        reason || 'Manual penalty by admin'
    }
  });
}));

// ────────────────────────────────────────────────────────────
// DELETE /api/deadline/penalty/:officerId/reset
// Reset penalty points to 0 (admin only)
// ────────────────────────────────────────────────────────────
router.delete('/penalty/:officerId/reset', adminOnly, asyncHandler(async (req, res) => {
  const officer = await User.findByIdAndUpdate(
    req.params.officerId,
    { penaltyPoints: 0 },
    { new: true }
  );
  if (!officer) throw new ApiError('Officer not found', 404);
  success(res, { message: `Penalty points reset for ${officer.name}`, officer });
}));

// ────────────────────────────────────────────────────────────
// GET /api/deadline/accountability
// Get accountability scores for all field officers
// ────────────────────────────────────────────────────────────
router.get('/accountability', adminOrDept, asyncHandler(async (req, res) => {
  const filter = { role: 'department', isHead: false };
  if (req.user.role === 'department') filter.department = req.user.department;

  const officers = await User.find(filter)
    .select('name email department penaltyPoints totalAssigned resolvedOnTime resolvedLate accountabilityScore')
    .sort({ penaltyPoints: -1 }); // worst performers first

  // Add accountability score and grade
  const enriched = officers.map(o => {
    const obj   = o.toObject();
    const score = obj.totalAssigned > 0
      ? Math.round((obj.resolvedOnTime / obj.totalAssigned) * 100)
      : 100;
    obj.accountabilityScore = score;
    obj.grade = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Average' : 'Poor';
    return obj;
  });

  success(res, { officers: enriched, count: enriched.length });
}));

// ────────────────────────────────────────────────────────────
// GET /api/deadline/dashboard
// Full accountability dashboard data for admin
// ────────────────────────────────────────────────────────────
router.get('/dashboard', adminOnly, asyncHandler(async (req, res) => {
  const now = new Date();

  // Parallel queries for speed
  const [
    totalIssues,
    overdueIssues,
    resolvedToday,
    officers,
    topOverdue
  ] = await Promise.all([
    Issue.countDocuments(),
    Issue.countDocuments({
      status:   { $nin: ['resolved','closed','rejected'] },
      deadline: { $lt: now }
    }),
    Issue.countDocuments({
      status:    'resolved',
      resolvedAt: { $gte: new Date(now.setHours(0,0,0,0)) }
    }),
    User.find({ role:'department', isHead:false })
      .select('name email department penaltyPoints totalAssigned resolvedOnTime accountabilityScore'),
    Issue.find({
      status:   { $nin: ['resolved','closed','rejected'] },
      deadline: { $lt: new Date() }
    })
    .populate('assignedTo', 'name penaltyPoints')
    .populate('reportedBy', 'name')
    .sort({ deadline: 1 })
    .limit(5)
  ]);

  // Total penalty points across all officers
  const totalPenaltyPoints = officers.reduce((sum, o) => sum + (o.penaltyPoints || 0), 0);

  // Total suggested compensation
  const overdueList = await Issue.find({
    status:   { $nin: ['resolved','closed','rejected'] },
    deadline: { $lt: new Date() }
  }).select('deadline compensationAmount');

  const totalCompensation = overdueList.reduce((sum, issue) => {
    const days = Math.floor((new Date() - issue.deadline) / 86400000);
    return sum + (days * 100);
  }, 0);

  // Enrich officers with score
  const officerStats = officers.map(o => {
    const obj   = o.toObject();
    const score = obj.totalAssigned > 0
      ? Math.round((obj.resolvedOnTime / obj.totalAssigned) * 100)
      : 100;
    obj.accountabilityScore = score;
    obj.grade = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Average' : 'Poor';
    return obj;
  });

  // Enrich overdue list
  const enrichedOverdue = topOverdue.map(issue => {
    const obj = issue.toObject();
    obj.delayDays    = Math.floor((new Date() - issue.deadline) / 86400000);
    obj.compensation = obj.delayDays * 100;
    return obj;
  });

  success(res, {
    summary: {
      totalIssues,
      overdueIssues,
      resolvedToday,
      totalPenaltyPoints,
      totalCompensation,   // suggested ₹ compensation
    },
    officerStats,
    topOverdueIssues: enrichedOverdue,
  });
}));

module.exports = router;