const express = require('express');
const router  = express.Router();
const Issue   = require('../models/Issue');
const User    = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { protect, authorize } = require('../middleware/auth');
const { success, paginated } = require('../utils/response');

router.use(protect);

const adminOnly  = authorize('admin');
const adminOrDept = authorize('admin','department');

// GET /api/admin/stats — full analytics for admin
router.get('/stats', adminOnly, asyncHandler(async (req, res) => {
  const [total, resolved, inProgress, pending, assigned, critical] = await Promise.all([
    Issue.countDocuments(),
    Issue.countDocuments({ status:'resolved' }),
    Issue.countDocuments({ status:'in_progress' }),
    Issue.countDocuments({ status:'pending' }),
    Issue.countDocuments({ status:'assigned' }),
    Issue.countDocuments({ priority:'critical' }),
  ]);

  const byCategory = await Issue.aggregate([
    { $group:{ _id:'$category', count:{ $sum:1 }, resolved:{ $sum:{ $cond:[{$eq:['$status','resolved']},1,0] } } } },
    { $sort:{ count:-1 } }
  ]);

  const byDept = await Issue.aggregate([
    { $group:{
      _id:'$department',
      total:      { $sum:1 },
      resolved:   { $sum:{ $cond:[{$eq:['$status','resolved']},1,0] } },
      inProgress: { $sum:{ $cond:[{$eq:['$status','in_progress']},1,0] } },
      pending:    { $sum:{ $cond:[{$eq:['$status','pending']},1,0] } },
      avgDays:    { $avg:{ $cond:[
        { $and:[{$eq:['$status','resolved']},{$ne:['$resolvedAt',null]}] },
        { $divide:[{$subtract:['$resolvedAt','$createdAt']},86400000] }, null
      ]}}
    }},
    { $sort:{ total:-1 } }
  ]);

  const sevenAgo = new Date(); sevenAgo.setDate(sevenAgo.getDate()-7);
  const trend = await Issue.aggregate([
    { $match:{ createdAt:{ $gte:sevenAgo } } },
    { $group:{ _id:{ $dateToString:{ format:'%Y-%m-%d', date:'$createdAt' } }, reported:{ $sum:1 }, resolved:{ $sum:{ $cond:[{$eq:['$status','resolved']},1,0] } } } },
    { $sort:{ _id:1 } }
  ]);

  const avgRes = await Issue.aggregate([
    { $match:{ status:'resolved', resolvedAt:{ $exists:true } } },
    { $project:{ days:{ $divide:[{$subtract:['$resolvedAt','$createdAt']},86400000] } } },
    { $group:{ _id:null, avg:{ $avg:'$days' } } }
  ]);

  const topAreas = await Issue.aggregate([
    { $match:{ 'location.area':{ $exists:true, $ne:'' } } },
    { $group:{ _id:'$location.area', count:{ $sum:1 } } },
    { $sort:{ count:-1 } }, { $limit:5 }
  ]);

  const satisfaction = await Issue.aggregate([
    { $match:{ satisfactionRating:{ $exists:true } } },
    { $group:{ _id:null, avg:{ $avg:'$satisfactionRating' }, count:{ $sum:1 } } }
  ]);

  success(res, {
    kpis:{ total, resolved, inProgress, pending, assigned, critical,
      resolutionRate: total>0?((resolved/total)*100).toFixed(1):0,
      avgResolutionDays: avgRes[0]?.avg?.toFixed(1)||'N/A'
    },
    byCategory, byDept, trend, topAreas,
    satisfaction: satisfaction[0]||{ avg:0, count:0 }
  });
}));

// GET /api/admin/dept-stats — KPIs for officer/dept head
router.get('/dept-stats', adminOrDept, asyncHandler(async (req, res) => {
  const filter = req.user.role==='admin' ? {} : { department:req.user.department };

  const [total, pending, inProgress, resolved, critical] = await Promise.all([
    Issue.countDocuments(filter),
    Issue.countDocuments({ ...filter, status:'pending' }),
    Issue.countDocuments({ ...filter, status:'in_progress' }),
    Issue.countDocuments({ ...filter, status:'resolved' }),
    Issue.countDocuments({ ...filter, priority:'critical' }),
  ]);

  const avgRes = await Issue.aggregate([
    { $match:{ ...filter, status:'resolved', resolvedAt:{ $exists:true } } },
    { $project:{ days:{ $divide:[{$subtract:['$resolvedAt','$createdAt']},86400000] } } },
    { $group:{ _id:null, avg:{ $avg:'$days' } } }
  ]);

  success(res, { kpis:{ total, pending, inProgress, resolved, critical,
    resolutionRate: total>0?((resolved/total)*100).toFixed(1):0,
    avgResolutionDays: avgRes[0]?.avg?.toFixed(1)||'N/A',
    department: req.user.department
  }});
}));

// GET /api/admin/issues
router.get('/issues', adminOrDept, asyncHandler(async (req, res) => {
  const { status, priority, category, department, area, page=1, limit=25, sort='-createdAt' } = req.query;
  const filter = {};

  if (req.user.role==='department') {
    filter.department = req.user.department;
  } else {
    if (department) filter.department = new RegExp(department,'i');
  }

  if (status)   filter.status   = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;
  if (area)     filter['location.area'] = new RegExp(area,'i');

  const [issues, total] = await Promise.all([
    Issue.find(filter).populate('reportedBy','name email phone').populate('assignedTo','name email').sort(sort).skip((page-1)*limit).limit(Number(limit)),
    Issue.countDocuments(filter)
  ]);
  paginated(res, issues, total, page, limit);
}));

// GET /api/admin/users
router.get('/users', adminOrDept, asyncHandler(async (req, res) => {
  const { role, page=1, limit=50 } = req.query;
  const filter = role ? { role } : {};
  const [users, total] = await Promise.all([
    User.find(filter).sort('-createdAt').skip((page-1)*limit).limit(Number(limit)),
    User.countDocuments(filter)
  ]);
  paginated(res, users, total, page, limit);
}));

// POST /api/admin/users — create user
router.post('/users', adminOnly, asyncHandler(async (req, res) => {
  const { name, email, password, role, department, isHead } = req.body;
  if (await User.findOne({ email })) {
    const existing = await User.findOneAndUpdate({ email }, { name, role, department, isHead:isHead||false, isActive:true }, { new:true });
    return success(res, { user:existing, message:'User updated' });
  }
  const user = await User.create({ name, email, password, role, department, isHead:isHead||false });
  success(res, { user }, 201);
}));

// PUT /api/admin/users/:id
router.put('/users/:id', adminOnly, asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id,
    { role:req.body.role, department:req.body.department, isActive:req.body.isActive, isHead:req.body.isHead },
    { new:true, runValidators:true }
  );
  success(res, { user });
}));

// DELETE /api/admin/users/:id
router.delete('/users/:id', adminOnly, asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  success(res, { message:'User deleted' });
}));

// POST /api/admin/bulk-status
router.post('/bulk-status', adminOrDept, asyncHandler(async (req, res) => {
  const { ids, status, message } = req.body;
  await Issue.updateMany(
    { _id:{ $in:ids } },
    { $set:{ status }, $push:{ statusHistory:{ status, message, updatedBy:req.user._id } } }
  );
  success(res, { updated:ids.length });
}));

// GET /api/admin/export
router.get('/export', adminOnly, asyncHandler(async (req, res) => {
  const issues = await Issue.find({}).populate('reportedBy','name email').populate('assignedTo','name').select('-statusHistory -comments -upvotes -__v').lean();
  success(res, { issues, count:issues.length });
}));

module.exports = router;