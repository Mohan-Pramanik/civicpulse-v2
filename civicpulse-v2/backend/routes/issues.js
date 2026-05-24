const express = require('express');
const router  = express.Router();
const Issue   = require('../models/Issue');
const ApiError     = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { protect, authorize } = require('../middleware/auth');
const { issueRules, validate } = require('../middleware/validate');
const upload = require('../middleware/upload');
const { sendEmail }    = require('../services/emailService');
const { paginated, success } = require('../utils/response');

// GET /api/issues
router.get('/', asyncHandler(async (req, res) => {
  const { category, status, priority, area, department, search, page = 1, limit = 20, sort = '-createdAt' } = req.query;
  const filter = {};
  if (category)   filter.category = category;
  if (status)     filter.status   = status;
  if (priority)   filter.priority = priority;
  if (area)       filter['location.area'] = new RegExp(area, 'i');
  if (department) filter.department = new RegExp(department, 'i');
  if (search)     filter.$or = [{ title: new RegExp(search,'i') }, { description: new RegExp(search,'i') }];

  const skip = (page - 1) * limit;
  const [issues, total] = await Promise.all([
    Issue.find(filter).populate('reportedBy','name').populate('assignedTo','name').sort(sort).skip(skip).limit(Number(limit)),
    Issue.countDocuments(filter)
  ]);
  paginated(res, issues, total, page, limit);
}));

// GET /api/issues/mine
router.get('/mine', protect, asyncHandler(async (req, res) => {
  const issues = await Issue.find({ reportedBy: req.user._id })
  .populate('assignedTo', 'name email phone department')
  .sort('-createdAt');
  success(res, { issues });
}));

// GET /api/issues/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id)
    .populate('reportedBy','name email phone')
    .populate('assignedTo','name email phone department')
    .populate('statusHistory.updatedBy','name')
    .populate('comments.author','name role');
  if (!issue) throw new ApiError('Issue not found', 404);
  issue.viewCount += 1;
  await issue.save({ validateBeforeSave: false });
  success(res, { issue });
}));

// POST /api/issues
router.post('/', protect, upload.array('images', 5), issueRules, validate, asyncHandler(async (req, res) => {
  const { title, description, category, priority, address, landmark, area, ward, city, pincode, lat, lng, tags } = req.body;
  const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];

  const issue = await Issue.create({
    title, description, category,
    priority: priority || 'medium',
    location: { address, landmark, area, ward, city, pincode, lat: Number(lat)||undefined, lng: Number(lng)||undefined },
    images,
    tags: tags ? tags.split(',').map(t => t.trim()) : [],
    reportedBy: req.user._id,
    statusHistory: [{ status:'pending', message:'Issue reported by citizen', updatedBy: req.user._id }]
  });

  // Send confirmation email
  const populated = await issue.populate('reportedBy','name email');
  sendEmail(req.user.email, 'issueCreated', populated);

  success(res, { issue }, 201);
}));

// PUT /api/issues/:id/upvote
router.put('/:id/upvote', protect, asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) throw new ApiError('Issue not found', 404);
  const idx = issue.upvotes.indexOf(req.user._id);
  if (idx === -1) issue.upvotes.push(req.user._id);
  else issue.upvotes.splice(idx, 1);
  await issue.save({ validateBeforeSave: false });
  success(res, { upvotes: issue.upvotes.length, voted: idx === -1 });
}));

// PUT /api/issues/:id/status  (admin/department)
router.put('/:id/status', protect, authorize('admin','department'), upload.single('proofImage'), asyncHandler(async (req, res) => {
  const { status, message } = req.body;

  if (status === 'resolved' && !req.file) {
    return res.status(400).json({ success:false, message:'A proof image is required when marking an issue as resolved.' });
  }

  const issue = await Issue.findById(req.params.id).populate('reportedBy','email name');
  if (!issue) throw new ApiError('Issue not found', 404);

  const proofImage = req.file ? (req.file.path || `/uploads/${req.file.filename}`) : null;

  issue.status = status;
  issue.statusHistory.push({ status, message, updatedBy: req.user._id, proofImage });

  if (proofImage) issue.images.push(proofImage);

  await issue.save();
  sendEmail(issue.reportedBy.email, 'statusUpdated', issue, status, message);
  success(res, { issue });
}));

// PUT /api/issues/:id/assign  (admin)
router.put('/:id/assign', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const issue = await Issue.findByIdAndUpdate(req.params.id, {
    assignedTo: req.body.userId,
    status: 'assigned',
    $push: { statusHistory: { status:'assigned', message: req.body.message || 'Assigned to field officer', updatedBy: req.user._id } }
 }, { new: true }).populate('assignedTo','name email phone department');
  if (!issue) throw new ApiError('Issue not found', 404);
  success(res, { issue });
}));

// POST /api/issues/:id/comments
router.post('/:id/comments', protect, asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) throw new ApiError('Issue not found', 404);
  const isPublic = req.user.role === 'citizen' ? true : (req.body.isPublic !== false);
  issue.comments.push({ text: req.body.text, author: req.user._id, isPublic });
  await issue.save();
  success(res, { comments: issue.comments });
}));

// PUT /api/issues/:id/rate  (citizen - satisfaction after resolve)
router.put('/:id/rate', protect, asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const issue = await Issue.findOneAndUpdate(
    { _id: req.params.id, reportedBy: req.user._id, status: 'resolved' },
    { satisfactionRating: rating, satisfactionComment: comment },
    { new: true }
  );
  if (!issue) throw new ApiError('Not allowed or issue not resolved', 403);
  success(res, { issue });
}));

// DELETE /api/issues/:id  (admin or own pending issue)
router.delete('/:id', protect, asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) throw new ApiError('Issue not found', 404);
  const isOwner = issue.reportedBy.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) throw new ApiError('Not authorized', 403);
  if (isOwner && issue.status !== 'pending') throw new ApiError('Can only delete pending issues', 400);
  await issue.deleteOne();
  success(res, { message: 'Issue deleted' });
}));

module.exports = router;
