const mongoose = require('mongoose');
const { ROUTING_MAP } = require('../services/routingService');

const StatusHistorySchema = new mongoose.Schema({
  status:     { type:String, required:true },
  message:    { type:String, default:'' },
  updatedBy:  { type:mongoose.Schema.Types.ObjectId, ref:'User' },
  proofImage: { type:String },               // proof photo URL on resolve
  timestamp:  { type:Date, default:Date.now }
}, { _id:false });

const CommentSchema = new mongoose.Schema({
  text:      { type:String, required:true },
  author:    { type:mongoose.Schema.Types.ObjectId, ref:'User', required:true },
  isPublic:  { type:Boolean, default:true },
  createdAt: { type:Date, default:Date.now }
});

// ── Notification log (escalation records) ────────────────────
const NotificationSchema = new mongoose.Schema({
  type:      { type:String, enum:['overdue_officer','escalate_head','escalate_admin'] },
  sentAt:    { type:Date, default:Date.now },
  message:   { type:String }
}, { _id:false });

const IssueSchema = new mongoose.Schema({
  ticketId: {
    type:String, unique:true,
    default: () => `CIV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  },
  title:        { type:String, required:[true,'Title required'], trim:true, maxlength:150 },
  description:  { type:String, required:[true,'Description required'], maxlength:1000 },
  category: {
    type:String, required:[true,'Category required'],
    enum:['road','water','waste','electricity','encroachment','other']
  },
  priority: {
    type:String, enum:['low','medium','high','critical'], default:'medium'
  },
  status: {
    type:String,
    enum:['pending','assigned','in_progress','pending_verification','resolved','closed','rejected'],
    default:'pending'
  },
  location: {
    address:  { type:String, required:[true,'Address required'] },
    landmark: { type:String },
    area:     { type:String },
    ward:     { type:String },
    city:     { type:String, default:'Kolkata' },
    pincode:  { type:String },
    lat:      { type:Number },
    lng:      { type:Number },
    // ── Dedicated GeoJSON field for $near / $geoNear ──────────
    // Must be a SEPARATE nested object — not mixed with plain fields
    geo: {
      type:        { type:String, enum:['Point'] },
      coordinates: { type:[Number] }   // [lng, lat]  ← GeoJSON order
    }
  },
  images:     [{ type:String }],
  reportedBy: { type:mongoose.Schema.Types.ObjectId, ref:'User', required:true },
  assignedTo: { type:mongoose.Schema.Types.ObjectId, ref:'User' },
  department: { type:String },

  // ── Deadline system ─────────────────────────────────────────
  deadline:   { type:Date },   // set when issue is assigned
  resolvedAt: { type:Date },
  expectedResolution: { type:Date },

  // ── Penalty tracking ─────────────────────────────────────────
  delayDays:          { type:Number, default:0 },      // how many days late
  penaltyPointsAdded: { type:Number, default:0 },      // points given for this issue
  compensationAmount: { type:Number, default:0 },      // delayDays × 100

  // ── Escalation tracking ──────────────────────────────────────
  escalationLevel:    { type:Number, default:0 },      // 0=none,1=officer,2=head/admin
  notifications:      [NotificationSchema],

  upvotes:       [{ type:mongoose.Schema.Types.ObjectId, ref:'User' }],
  statusHistory: [StatusHistorySchema],
  comments:      [CommentSchema],
  tags:          [{ type:String }],
  viewCount:     { type:Number, default:0 },
  satisfactionRating:  { type:Number, min:1, max:5 },
  satisfactionComment: { type:String }
}, { timestamps:true });

// ── Indexes ───────────────────────────────────────────────────
IssueSchema.index({ status:1, deadline:1 });
IssueSchema.index({ assignedTo:1, status:1 });
IssueSchema.index({ department:1, status:1 });
IssueSchema.index({ 'location.geo': '2dsphere' }); // ← must point to the GeoJSON sub-field

// ── Pre-save: auto-route + set expectedResolution ─────────────
IssueSchema.pre('save', function(next) {
  if (this.isNew) {
    const route = ROUTING_MAP[this.category] || ROUTING_MAP['other'];
    this.department = this.department || route.department;
    if (!this.expectedResolution) {
      const eta = parseInt(route.eta.split('–')[0]) || 7;
      this.expectedResolution = new Date(Date.now() + eta * 24 * 3600 * 1000);
    }
  }
  if (this.isModified('status') && this.status === 'resolved' && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }
  // clear resolvedAt if reopened
  if (this.isModified('status') && ['pending','in_progress','pending_verification'].includes(this.status)) {
    this.resolvedAt = undefined;
  }
  next();
});

// ── Virtuals ──────────────────────────────────────────────────
IssueSchema.virtual('upvoteCount').get(function() { return this.upvotes.length; });

// isOverdue: past deadline and not yet resolved
IssueSchema.virtual('isOverdue').get(function() {
  if (['resolved','closed','rejected','pending_verification'].includes(this.status)) return false;
  if (!this.deadline) return false;
  return new Date() > this.deadline;
});

IssueSchema.set('toJSON',   { virtuals:true });
IssueSchema.set('toObject', { virtuals:true });

module.exports = mongoose.model('Issue', IssueSchema);