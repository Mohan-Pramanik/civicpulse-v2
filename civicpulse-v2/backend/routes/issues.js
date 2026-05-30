const express      = require('express');
const router       = express.Router();
const Issue        = require('../models/Issue');
const ApiError     = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { protect, authorize } = require('../middleware/auth');
const { issueRules, validate } = require('../middleware/validate');
const upload       = require('../middleware/upload');
const { sendEmail }           = require('../services/emailService');
const { paginated, success }  = require('../utils/response');

// ── Duplicate detection radius ────────────────────────────────
const DUPLICATE_RADIUS_METERS = 300; // 300m

// ─────────────────────────────────────────────────────────────
// GET /api/issues — list all issues with filters & optional
//   geospatial filter (?lat=22.5&lng=88.3&radius=500)
// ─────────────────────────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  const {
    category, status, priority, area, department,
    search,
    page  = 1,
    limit = 20,
    sort  = '-createdAt',
    lat, lng, radius,
  } = req.query;

  const filter = {};
  if (category)   filter.category              = category;
  if (status)     filter.status                = status;
  if (priority)   filter.priority              = priority;
  if (area)       filter['location.area']      = new RegExp(area, 'i');
  if (department) filter.department            = new RegExp(department, 'i');
  if (search)     filter.$or = [
    { title:       new RegExp(search, 'i') },
    { description: new RegExp(search, 'i') },
  ];

  // Geospatial filter
  if (lat && lng) {
    filter['location.geo'] = {
      $near: {
        $geometry:   { type: 'Point', coordinates: [Number(lng), Number(lat)] },
        $maxDistance: Number(radius) || 1000,
      },
    };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [issues, total] = await Promise.all([
    Issue.find(filter)
      .populate('reportedBy', 'name')
      .populate('assignedTo', 'name email phone department')
      .sort(lat && lng ? undefined : sort)   // $near has its own sort
      .skip(skip)
      .limit(Number(limit)),
    Issue.countDocuments(filter),
  ]);

  paginated(res, issues, total, page, limit);
}));

// ─────────────────────────────────────────────────────────────
// GET /api/issues/nearby — map display + pre-submission check
// Query: ?lat=22.57&lng=88.36&radius=500&category=road
// ─────────────────────────────────────────────────────────────
router.get('/nearby', asyncHandler(async (req, res) => {
  const { lat, lng, radius = 500, category, status } = req.query;

  if (!lat || !lng) throw new ApiError('lat and lng are required', 400);

  const radiusMeters = Math.min(Number(radius), 5000); // cap at 5km
  const filter = {
    'location.geo': {
      $near: {
        $geometry:   { type: 'Point', coordinates: [Number(lng), Number(lat)] },
        $maxDistance: radiusMeters,
      },
    },
  };
  if (category) filter.category = category;
  if (status)   filter.status   = status;

  const issues = await Issue.find(filter)
    .select('title category status priority location upvotes createdAt ticketId')
    .limit(50);

  // Attach distance in metres
  const withDistance = issues.map(issue => {
    const [iLng, iLat] = issue.location?.geo?.coordinates || [0, 0];
    const dist = haversine(Number(lat), Number(lng), iLat, iLng);
    return { ...issue.toObject(), distanceMeters: Math.round(dist) };
  });

  success(res, { issues: withDistance, count: withDistance.length });
}));

// ─────────────────────────────────────────────────────────────
// GET /api/issues/mine — logged-in user's own issues
// ─────────────────────────────────────────────────────────────
router.get('/mine', protect, asyncHandler(async (req, res) => {
  const issues = await Issue.find({ reportedBy: req.user._id })
    .populate('assignedTo', 'name email phone department')
    .sort('-createdAt');
  success(res, { issues });
}));

// ─────────────────────────────────────────────────────────────
// GET /api/issues/:id — single issue (increments viewCount)
// ─────────────────────────────────────────────────────────────
router.get('/:id', asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id)
    .populate('reportedBy',      'name email phone')
    .populate('assignedTo',      'name email phone department isHead')
    .populate('statusHistory.updatedBy', 'name')
    .populate('comments.author', 'name role');

  if (!issue) throw new ApiError('Issue not found', 404);
  issue.viewCount += 1;
  await issue.save({ validateBeforeSave: false });
  success(res, { issue });
}));

// ─────────────────────────────────────────────────────────────
// POST /api/issues — create issue WITH duplicate detection
// ─────────────────────────────────────────────────────────────
router.post('/',
  protect,
  upload.array('images', 5),
  issueRules,
  validate,
  asyncHandler(async (req, res) => {
    const {
      title, description, category, priority,
      address, landmark, area, ward, city, pincode,
      lat, lng, tags,
    } = req.body;

    const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];

    // ── 🔍 DUPLICATE DETECTION (300m radius, same category) ──
    if (lat && lng) {
      const existing = await Issue.findOne({
        category,
        status: { $nin: ['resolved', 'closed', 'rejected'] },
        'location.geo': {
          $near: {
            $geometry:   { type: 'Point', coordinates: [Number(lng), Number(lat)] },
            $maxDistance: DUPLICATE_RADIUS_METERS,
          },
        },
      });

      if (existing) {
        return res.status(409).json({
          success:     false,
          isDuplicate: true,
          message:     `A similar ${category} issue has already been reported in this area (within ${DUPLICATE_RADIUS_METERS}m).`,
          existingIssue: {
            _id:       existing._id,
            ticketId:  existing.ticketId,
            title:     existing.title,
            status:    existing.status,
            category:  existing.category,
            createdAt: existing.createdAt,
          },
        });
      }
    }

    // ── Build location object ─────────────────────────────────
    const locationData = {
      address,
      landmark,
      area,
      ward,
      city:    city    || 'Kolkata',
      pincode,
    };
    if (lat && lng) {
      locationData.lat = Number(lat);
      locationData.lng = Number(lng);
      locationData.geo = {          // GeoJSON Point for $near queries
        type:        'Point',
        coordinates: [Number(lng), Number(lat)],  // [lng, lat] — GeoJSON order
      };
    }

    const issue = await Issue.create({
      title,
      description,
      category,
      priority:  priority || 'medium',
      location:  locationData,
      images,
      tags:      tags ? tags.split(',').map(t => t.trim()) : [],
      reportedBy: req.user._id,
      statusHistory: [{
        status:    'pending',
        message:   'Issue reported by citizen',
        updatedBy: req.user._id,
      }],
    });

    const populated = await issue.populate('reportedBy', 'name email');
    // Non-blocking email
    sendEmail(req.user.email, 'issueCreated', populated).catch(() => {});

    success(res, { issue }, 201);
  })
);

// ─────────────────────────────────────────────────────────────
// PATCH /api/issues/:id — partial update (priority, etc.)
//   Admin or department roles only
// ─────────────────────────────────────────────────────────────
router.patch('/:id',
  protect,
  authorize('admin', 'department'),
  asyncHandler(async (req, res) => {
    const ALLOWED = ['priority', 'department', 'tags'];
    const updates = {};
    ALLOWED.forEach(key => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    if (Object.keys(updates).length === 0) {
      throw new ApiError('No valid fields to update', 400);
    }

    const issue = await Issue.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email');

    if (!issue) throw new ApiError('Issue not found', 404);
    success(res, { issue });
  })
);

// ─────────────────────────────────────────────────────────────
// PUT /api/issues/:id/upvote — toggle upvote
// ─────────────────────────────────────────────────────────────
router.put('/:id/upvote', protect, asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) throw new ApiError('Issue not found', 404);

  const idx = issue.upvotes.indexOf(req.user._id);
  if (idx === -1) issue.upvotes.push(req.user._id);
  else            issue.upvotes.splice(idx, 1);

  await issue.save({ validateBeforeSave: false });
  success(res, { upvotes: issue.upvotes.length, voted: idx === -1 });
}));

// ─────────────────────────────────────────────────────────────
// PUT /api/issues/:id/status — admin / department only
//   Requires proof image when status = 'resolved'
// ─────────────────────────────────────────────────────────────
router.put('/:id/status',
  protect,
  authorize('admin', 'department'),
  upload.single('proofImage'),
  asyncHandler(async (req, res) => {
    const { status, message } = req.body;

    if (status === 'resolved' && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'A proof image is required when marking an issue as resolved.',
      });
    }

    const issue = await Issue.findById(req.params.id)
      .populate('reportedBy', 'email name');
    if (!issue) throw new ApiError('Issue not found', 404);

    const proofImage = req.file ? `/uploads/${req.file.filename}` : null;

    issue.status = status;
    issue.statusHistory.push({ status, message, updatedBy: req.user._id, proofImage });
    if (proofImage) issue.images.push(proofImage);

    await issue.save();
    sendEmail(issue.reportedBy.email, 'statusUpdated', issue, status, message).catch(() => {});
    success(res, { issue });
  })
);

// ─────────────────────────────────────────────────────────────
// PUT /api/issues/:id/assign — admin or dept head
// ─────────────────────────────────────────────────────────────
router.put('/:id/assign',
  protect,
  authorize('admin', 'department'),
  asyncHandler(async (req, res) => {
    const issue = await Issue.findByIdAndUpdate(
      req.params.id,
      {
        assignedTo: req.body.userId,
        status:     'assigned',
        $push: {
          statusHistory: {
            status:    'assigned',
            message:   req.body.message || 'Assigned to field officer',
            updatedBy: req.user._id,
          },
        },
      },
      { new: true }
    ).populate('assignedTo', 'name email phone department');

    if (!issue) throw new ApiError('Issue not found', 404);
    success(res, { issue });
  })
);

// ─────────────────────────────────────────────────────────────
// POST /api/issues/:id/comments
// ─────────────────────────────────────────────────────────────
router.post('/:id/comments', protect, asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) throw new ApiError('Issue not found', 404);

  const isPublic = req.user.role === 'citizen' ? true : (req.body.isPublic !== false);
  issue.comments.push({ text: req.body.text, author: req.user._id, isPublic });
  await issue.save();
  success(res, { comments: issue.comments });
}));

// ─────────────────────────────────────────────────────────────
// PUT /api/issues/:id/rate — citizen satisfaction after resolve
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// DELETE /api/issues/:id — owner (pending only) or admin
// ─────────────────────────────────────────────────────────────
router.delete('/:id', protect, asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) throw new ApiError('Issue not found', 404);

  const isOwner = issue.reportedBy.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin)             throw new ApiError('Not authorized', 403);
  if (isOwner && issue.status !== 'pending')
    throw new ApiError('Can only delete pending issues', 400);

  await issue.deleteOne();
  success(res, { message: 'Issue deleted' });
}));

// ── Haversine helper (metres) ─────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R    = 6371000;
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a    = Math.sin(dLat / 2) ** 2
             + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2))
             * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function deg2rad(d) { return d * Math.PI / 180; }

module.exports = router;