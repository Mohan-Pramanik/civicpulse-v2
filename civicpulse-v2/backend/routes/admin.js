const express = require('express');
const router  = express.Router();
const Issue   = require('../models/Issue');
const User    = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { protect, authorize } = require('../middleware/auth');
const { success, paginated }  = require('../utils/response');

router.use(protect, authorize('admin'));

// GET /api/admin/stats
router.get('/stats', asyncHandler(async (req, res) => {
  const [total, resolved, inProgress, pending, critical, overdue] = await Promise.all([
    Issue.countDocuments(),
    Issue.countDocuments({ status: 'resolved' }),
    Issue.countDocuments({ status: 'in_progress' }),
    Issue.countDocuments({ status: 'pending' }),
    Issue.countDocuments({ priority: 'critical' }),
    Issue.countDocuments({ expectedResolution: { $lt: new Date() }, status: { $nin: ['resolved','closed'] } })
  ]);

  const byCategory = await Issue.aggregate([
    { $group: { _id: '$category', count: { $sum:1 }, resolved: { $sum: { $cond:[{$eq:['$status','resolved']},1,0] } } } },
    { $sort: { count: -1 } }
  ]);

  const byDept = await Issue.aggregate([
    { $group: { _id:'$department', count:{$sum:1}, resolved:{$sum:{$cond:[{$eq:['$status','resolved']},1,0]}} } },
    { $sort: { count:-1 } }
  ]);

  const byStatus = await Issue.aggregate([
    { $group: { _id:'$status', count:{$sum:1} } }
  ]);

  const sevenAgo = new Date(); sevenAgo.setDate(sevenAgo.getDate()-7);
  const trend = await Issue.aggregate([
    { $match: { createdAt: { $gte: sevenAgo } } },
    { $group: { _id: { $dateToString:{format:'%Y-%m-%d', date:'$createdAt'} }, reported:{$sum:1},
        resolved:{$sum:{$cond:[{$eq:['$status','resolved']},1,0]}} } },
    { $sort: { _id:1 } }
  ]);

  const avgRes = await Issue.aggregate([
    { $match: { status:'resolved', resolvedAt:{$exists:true} } },
    { $project: { days: { $divide:[{$subtract:['$resolvedAt','$createdAt']},86400000] } } },
    { $group: { _id:null, avg:{$avg:'$days'}, min:{$min:'$days'}, max:{$max:'$days'} } }
  ]);

  const topAreas = await Issue.aggregate([
    { $group: { _id:'$location.area', count:{$sum:1} } },
    { $sort: { count:-1 } }, { $limit:5 }
  ]);

  const satisfaction = await Issue.aggregate([
    { $match: { satisfactionRating:{$exists:true} } },
    { $group: { _id:null, avg:{$avg:'$satisfactionRating'}, count:{$sum:1} } }
  ]);

  success(res, {
    kpis: { total, resolved, inProgress, pending, critical, overdue,
      resolutionRate: total > 0 ? ((resolved/total)*100).toFixed(1) : 0,
      avgResolutionDays: avgRes[0]?.avg?.toFixed(1) || 'N/A'
    },
    byCategory, byDept, byStatus, trend, topAreas,
    satisfaction: satisfaction[0] || { avg: 0, count: 0 }
  });
}));

// GET /api/admin/issues
router.get('/issues', asyncHandler(async (req, res) => {
  const { status, priority, category, department, area, page=1, limit=25, sort='-createdAt' } = req.query;
  const filter = {};
  if (status)     filter.status = status;
  if (priority)   filter.priority = priority;
  if (category)   filter.category = category;
  if (department) filter.department = new RegExp(department,'i');
  if (area)       filter['location.area'] = new RegExp(area,'i');

  const [issues, total] = await Promise.all([
    Issue.find(filter).populate('reportedBy','name email phone').populate('assignedTo','name email')
      .sort(sort).skip((page-1)*limit).limit(Number(limit)),
    Issue.countDocuments(filter)
  ]);
  paginated(res, issues, total, page, limit);
}));

// GET /api/admin/users
router.get('/users', asyncHandler(async (req, res) => {
  const { role, page=1, limit=20 } = req.query;
  const filter = role ? { role } : {};
  const [users, total] = await Promise.all([
    User.find(filter).sort('-createdAt').skip((page-1)*limit).limit(Number(limit)),
    User.countDocuments(filter)
  ]);
  paginated(res, users, total, page, limit);
}));

// PUT /api/admin/users/:id
router.put('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id,
    { role: req.body.role, department: req.body.department, isActive: req.body.isActive },
    { new: true, runValidators: true }
  );
  success(res, { user });
}));

// DELETE /api/admin/users/:id
router.delete('/users/:id', asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  success(res, { message: 'User deleted' });
}));

// POST /api/admin/bulk-status  (bulk update status)
router.post('/bulk-status', asyncHandler(async (req, res) => {
  const { ids, status, message } = req.body;
  const statusEntry = { status, message, updatedBy: req.user._id };
  await Issue.updateMany(
    { _id: { $in: ids } },
    { $set: { status }, $push: { statusHistory: statusEntry } }
  );
  success(res, { updated: ids.length });
}));

// GET /api/admin/export  (CSV-ready JSON for all issues)
router.get('/export', asyncHandler(async (req, res) => {
  const issues = await Issue.find({})
    .populate('reportedBy','name email')
    .populate('assignedTo','name')
    .select('-statusHistory -comments -upvotes -__v')
    .lean();
  success(res, { issues, count: issues.length });
}));

module.exports = router;
