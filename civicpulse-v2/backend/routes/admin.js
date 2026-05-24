const express = require('express');
const router  = express.Router();
const Issue   = require('../models/Issue');
const User    = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError     = require('../utils/ApiError');
const { protect, authorize } = require('../middleware/auth');
const { success, paginated } = require('../utils/response');

router.use(protect);

const adminOnly   = authorize('admin');
const adminOrDept = authorize('admin','department');

// ── STATS ─────────────────────────────────────────────────────
router.get('/stats', adminOnly, asyncHandler(async (req, res) => {
  const [total,resolved,inProgress,pending,assigned,critical] = await Promise.all([
    Issue.countDocuments(), Issue.countDocuments({status:'resolved'}),
    Issue.countDocuments({status:'in_progress'}), Issue.countDocuments({status:'pending'}),
    Issue.countDocuments({status:'assigned'}), Issue.countDocuments({priority:'critical'}),
  ]);

  const byCategory = await Issue.aggregate([
    {$group:{_id:'$category',count:{$sum:1},resolved:{$sum:{$cond:[{$eq:['$status','resolved']},1,0]}}}},
    {$sort:{count:-1}}
  ]);

  const byDept = await Issue.aggregate([
    {$group:{_id:'$department',total:{$sum:1},
      resolved:  {$sum:{$cond:[{$eq:['$status','resolved']},1,0]}},
      inProgress:{$sum:{$cond:[{$eq:['$status','in_progress']},1,0]}},
      pending:   {$sum:{$cond:[{$eq:['$status','pending']},1,0]}},
      avgDays:   {$avg:{$cond:[{$and:[{$eq:['$status','resolved']},{$ne:['$resolvedAt',null]}]},
        {$divide:[{$subtract:['$resolvedAt','$createdAt']},86400000]},null]}}}},
    {$sort:{total:-1}}
  ]);

  const sevenAgo = new Date(); sevenAgo.setDate(sevenAgo.getDate()-7);
  const trend = await Issue.aggregate([
    {$match:{createdAt:{$gte:sevenAgo}}},
    {$group:{_id:{$dateToString:{format:'%Y-%m-%d',date:'$createdAt'}},
      reported:{$sum:1},resolved:{$sum:{$cond:[{$eq:['$status','resolved']},1,0]}}}},
    {$sort:{_id:1}}
  ]);

  const avgRes = await Issue.aggregate([
    {$match:{status:'resolved',resolvedAt:{$exists:true}}},
    {$project:{days:{$divide:[{$subtract:['$resolvedAt','$createdAt']},86400000]}}},
    {$group:{_id:null,avg:{$avg:'$days'}}}
  ]);

  const topAreas = await Issue.aggregate([
    {$match:{'location.area':{$exists:true,$ne:''}}},
    {$group:{_id:'$location.area',count:{$sum:1}}},
    {$sort:{count:-1}},{$limit:5}
  ]);

  const satisfaction = await Issue.aggregate([
    {$match:{satisfactionRating:{$exists:true}}},
    {$group:{_id:null,avg:{$avg:'$satisfactionRating'},count:{$sum:1}}}
  ]);

  success(res,{
    kpis:{total,resolved,inProgress,pending,assigned,critical,
      resolutionRate:total>0?((resolved/total)*100).toFixed(1):0,
      avgResolutionDays:avgRes[0]?.avg?.toFixed(1)||'N/A'},
    byCategory,byDept,trend,topAreas,
    satisfaction:satisfaction[0]||{avg:0,count:0}
  });
}));

// ── DEPT STATS ────────────────────────────────────────────────
router.get('/dept-stats', adminOrDept, asyncHandler(async (req, res) => {
  const filter = req.user.role==='admin' ? {} : {department:req.user.department};
  const [total,pending,inProgress,resolved,critical] = await Promise.all([
    Issue.countDocuments(filter), Issue.countDocuments({...filter,status:'pending'}),
    Issue.countDocuments({...filter,status:'in_progress'}),
    Issue.countDocuments({...filter,status:'resolved'}),
    Issue.countDocuments({...filter,priority:'critical'}),
  ]);
  const avgRes = await Issue.aggregate([
    {$match:{...filter,status:'resolved',resolvedAt:{$exists:true}}},
    {$project:{days:{$divide:[{$subtract:['$resolvedAt','$createdAt']},86400000]}}},
    {$group:{_id:null,avg:{$avg:'$days'}}}
  ]);
  success(res,{kpis:{total,pending,inProgress,resolved,critical,
    resolutionRate:total>0?((resolved/total)*100).toFixed(1):0,
    avgResolutionDays:avgRes[0]?.avg?.toFixed(1)||'N/A',
    department:req.user.department
  }});
}));

// ── ISSUES ────────────────────────────────────────────────────
router.get('/issues', adminOrDept, asyncHandler(async (req, res) => {
  const {status,priority,category,department,area,page=1,limit=25,sort='-createdAt'} = req.query;
  const filter = {};
  if (req.user.role==='department') filter.department = req.user.department;
  else if (department) filter.department = new RegExp(department,'i');
  if (status)   filter.status   = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;
  if (area)     filter['location.area'] = new RegExp(area,'i');

  const [issues,total] = await Promise.all([
    Issue.find(filter)
      .populate('reportedBy','name email phone')
      .populate('assignedTo','name email phone department isHead')
      .sort(sort).skip((page-1)*limit).limit(Number(limit)),
    Issue.countDocuments(filter)
  ]);
  paginated(res,issues,total,page,limit);
}));

// ── ASSIGN ISSUE TO OFFICER ───────────────────────────────────
// PUT /api/admin/issues/:id/assign
router.put('/issues/:id/assign', adminOrDept, asyncHandler(async (req, res) => {
  const { officerId, message } = req.body;
  if (!officerId) throw new ApiError('Officer ID required',400);

  // Verify officer belongs to same department
  const officer = await User.findById(officerId);
  if (!officer) throw new ApiError('Officer not found',404);

  if (req.user.role==='department' && officer.department !== req.user.department)
    throw new ApiError('Cannot assign to officer from different department',403);

  const issue = await Issue.findByIdAndUpdate(req.params.id,
    { $set:{ assignedTo:officerId, status:'assigned' },
      $push:{ statusHistory:{ status:'assigned', message: message||`Assigned to ${officer.name}`, updatedBy:req.user._id, timestamp:new Date() } }
    },{ new:true }
  ).populate('assignedTo','name email phone department');

  if (!issue) throw new ApiError('Issue not found',404);
  success(res,{issue});
}));

// ── USERS ─────────────────────────────────────────────────────
// Admin sees all, dept head sees only their dept
router.get('/users', adminOrDept, asyncHandler(async (req, res) => {
  const {role,page=1,limit=50} = req.query;
  let filter = role ? {role} : {};

  // Dept head can only see users in their department
  if (req.user.role==='department' && req.user.isHead) {
    filter = {...filter, department:req.user.department};
  } else if (req.user.role==='department' && !req.user.isHead) {
    throw new ApiError('Access denied',403);
  }

  const [users,total] = await Promise.all([
    User.find(filter).sort('-createdAt').skip((page-1)*limit).limit(Number(limit)),
    User.countDocuments(filter)
  ]);
  paginated(res,users,total,page,limit);
}));

// POST /api/admin/users — admin OR dept head creates user
router.post('/users', adminOrDept, asyncHandler(async (req, res) => {
  const {name,email,password,role,department,isHead} = req.body;

  // Dept head can only create field officers in their own department
  if (req.user.role==='department') {
    if (!req.user.isHead) throw new ApiError('Only department heads can create officers',403);
    if (role && role !== 'department') throw new ApiError('You can only create department officers',403);
    if (department && department !== req.user.department)
      throw new ApiError('You can only create officers for your own department',403);
  }

  const finalDept   = req.user.role==='department' ? req.user.department : department;
  const finalRole   = req.user.role==='department' ? 'department' : (role||'citizen');
  const finalIsHead = req.user.role==='department' ? false : (isHead||false);

  if (await User.findOne({email})) {
    const existing = await User.findOneAndUpdate({email},
      {name,role:finalRole,department:finalDept,isHead:finalIsHead,isActive:true},
      {new:true}
    );
    return success(res,{user:existing,message:'User updated'});
  }

  const user = await User.create({name,email,password:password||'civic@123',role:finalRole,department:finalDept,isHead:finalIsHead});
  success(res,{user,message:`Officer created. Default password: ${password||'civic@123'}`},201);
}));

// PUT /api/admin/users/:id
router.put('/users/:id', adminOrDept, asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) throw new ApiError('User not found',404);

  // Dept head can only edit users in their department
  if (req.user.role==='department') {
    if (!req.user.isHead) throw new ApiError('Access denied',403);
    if (target.department !== req.user.department) throw new ApiError('Cannot edit users from other departments',403);
  }

  const user = await User.findByIdAndUpdate(req.params.id,
    {role:req.body.role,department:req.body.department,isActive:req.body.isActive,isHead:req.body.isHead},
    {new:true,runValidators:true}
  );
  success(res,{user});
}));

// DELETE /api/admin/users/:id
router.delete('/users/:id', adminOrDept, asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) throw new ApiError('User not found',404);

  if (req.user.role==='department') {
    if (!req.user.isHead) throw new ApiError('Access denied',403);
    if (target.department !== req.user.department) throw new ApiError('Cannot delete users from other departments',403);
    if (target.isHead) throw new ApiError('Cannot delete department heads',403);
  }

  await User.findByIdAndDelete(req.params.id);
  success(res,{message:'User deleted'});
}));

// POST /api/admin/bulk-status
router.post('/bulk-status', adminOrDept, asyncHandler(async (req, res) => {
  const {ids,status,message} = req.body;
  await Issue.updateMany(
    {_id:{$in:ids}},
    {$set:{status},$push:{statusHistory:{status,message,updatedBy:req.user._id,timestamp:new Date()}}}
  );
  success(res,{updated:ids.length});
}));

// GET /api/admin/export
router.get('/export', adminOnly, asyncHandler(async (req, res) => {
  const issues = await Issue.find({})
    .populate('reportedBy','name email')
    .populate('assignedTo','name')
    .select('-statusHistory -comments -upvotes -__v').lean();
  success(res,{issues,count:issues.length});
}));

// GET /api/admin/officers — get officers in a department
router.get('/officers', adminOrDept, asyncHandler(async (req, res) => {
  const dept = req.user.role==='department' ? req.user.department : req.query.department;
  if (!dept) throw new ApiError('Department required',400);

  const officers = await User.find({
    role:'department', department:dept, isActive:{$ne:false}
  }).select('name email phone department isHead');

  success(res,{officers});
}));

/**
 * admin.js  –  ADD THESE NEW ROUTES to your existing backend/routes/admin.js
 *
 * Paste these routes BEFORE the module.exports line at the bottom.
 *
 * New routes added:
 *   POST   /api/admin/my-officers          → dept head creates a new field officer
 *   GET    /api/admin/my-officers          → dept head lists their own officers
 *   PUT    /api/admin/issues/:id/assign    → dept head assigns officer to issue
 */

// ── middleware already defined in admin.js ───────────────────────────────────
// const adminOnly   = authorize('admin');
// const adminOrDept = authorize('admin','department');
// We also need a deptHeadOnly:
const deptHeadOnly = (req, res, next) => {
  if (req.user.role === 'admin' || (req.user.role === 'department' && req.user.isHead)) return next();
  return res.status(403).json({ success:false, message:'Department head access required' });
};

// ── POST /api/admin/my-officers  (dept head creates a field officer) ─────────
router.post('/my-officers', deptHeadOnly, asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success:false, message:'Name, email and password required' });
  }

  // dept head can only create officers in their own department
  const department = req.user.role === 'admin' ? req.body.department : req.user.department;

  if (await User.findOne({ email })) {
    return res.status(409).json({ success:false, message:'Email already registered' });
  }

  const officer = await User.create({
    name,
    email,
    password,
    phone: phone || '',
    role:       'department',
    department,
    isHead:     false,
    isActive:   true,
    isVerified: true,
  });

  success(res, { user: officer }, 201);
}));

// ── GET /api/admin/my-officers  (dept head lists their field officers) ────────
router.get('/my-officers', adminOrDept, asyncHandler(async (req, res) => {
  const department = req.user.role === 'admin' ? req.query.department : req.user.department;
  const filter = { role:'department', isHead:false };
  if (department) filter.department = department;

  const officers = await User.find(filter).select('-password').sort({ name:1 });
  success(res, { officers, count: officers.length });
}));

// ── PUT /api/admin/issues/:id/assign  (dept head assigns officer to issue) ───
router.put('/issues/:id/assign', deptHeadOnly, asyncHandler(async (req, res) => {
  const { officerId } = req.body;

  const officer = await User.findById(officerId).select('-password');
  if (!officer || officer.role !== 'department') {
    return res.status(404).json({ success:false, message:'Officer not found' });
  }

  // dept head can only assign within their department
  if (req.user.role !== 'admin' && officer.department !== req.user.department) {
    return res.status(403).json({ success:false, message:'Cannot assign officer from another department' });
  }

  const issue = await Issue.findByIdAndUpdate(
    req.params.id,
    {
      assignedTo: officerId,
      status:     'assigned',
      $push: {
        statusHistory: {
          status:    'assigned',
          message:   `Assigned to ${officer.name} by ${req.user.name}`,
          updatedBy: req.user._id,
          timestamp: new Date(),
        }
      }
    },
    { new: true }
  )
  .populate('assignedTo', 'name email phone department')
  .populate('reportedBy',  'name email phone');

  if (!issue) return res.status(404).json({ success:false, message:'Issue not found' });

  success(res, { issue });
}));

module.exports = router;