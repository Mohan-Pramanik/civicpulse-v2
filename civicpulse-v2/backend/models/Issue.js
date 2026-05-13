const mongoose = require('mongoose');
const { ROUTING_MAP } = require('../services/routingService');

const StatusHistorySchema = new mongoose.Schema({
  status:    { type: String, required: true },
  message:   { type: String, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const CommentSchema = new mongoose.Schema({
  text:      { type: String, required: true },
  author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isPublic:  { type: Boolean, default: true },   // false = internal admin note
  createdAt: { type: Date, default: Date.now }
});

const IssueSchema = new mongoose.Schema({
  ticketId: {
    type: String, unique: true,
    default: () => `CIV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  },
  title:       { type: String, required: [true,'Title required'], trim: true, maxlength: 150 },
  description: { type: String, required: [true,'Description required'], maxlength: 1000 },
  category: {
    type: String, required: [true,'Category required'],
    enum: ['road','water','waste','electricity','encroachment','other']
  },
  subcategory: { type: String },
  priority: {
    type: String, enum: ['low','medium','high','critical'], default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending','assigned','in_progress','resolved','closed','rejected'],
    default: 'pending'
  },
  location: {
    address:  { type: String, required: [true,'Address required'] },
    landmark: { type: String },
    area:     { type: String },
    ward:     { type: String },
    city:     { type: String, default: 'Kolkata' },
    state:    { type: String, default: 'West Bengal' },
    pincode:  { type: String },
    lat:      { type: Number },
    lng:      { type: Number }
  },
  images:        [{ type: String }],
  reportedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  department:    { type: String },
  departmentCode:{ type: String },
  upvotes:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  statusHistory: [StatusHistorySchema],
  comments:      [CommentSchema],
  tags:          [{ type: String }],
  isVerified:    { type: Boolean, default: false },   // admin verified
  isDuplicate:   { type: Boolean, default: false },
  duplicateOf:   { type: mongoose.Schema.Types.ObjectId, ref: 'Issue' },
  viewCount:     { type: Number, default: 0 },
  resolvedAt:    { type: Date },
  expectedResolution: { type: Date },
  satisfactionRating: { type: Number, min:1, max:5 },
  satisfactionComment: { type: String }
}, { timestamps: true });

// Compound indexes for fast queries
IssueSchema.index({ category: 1, status: 1 });
IssueSchema.index({ priority: -1, createdAt: -1 });
IssueSchema.index({ reportedBy: 1, createdAt: -1 });
IssueSchema.index({ department: 1, status: 1 });
IssueSchema.index({ 'location.area': 1 });
IssueSchema.index({ 'location.lat': 1, 'location.lng': 1 });

// Auto-assign department + expected resolution on create
IssueSchema.pre('save', function(next) {
  if (this.isNew) {
    const route = ROUTING_MAP[this.category] || ROUTING_MAP['other'];
    this.department     = this.department     || route.department;
    this.departmentCode = this.departmentCode || route.code;
    if (!this.expectedResolution) {
      const eta = parseInt(route.eta.split('–')[0]) || 7;
      this.expectedResolution = new Date(Date.now() + eta * 24 * 3600 * 1000);
    }
  }
  if (this.isModified('status') && this.status === 'resolved' && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }
  next();
});

// Virtuals
IssueSchema.virtual('upvoteCount').get(function() { return this.upvotes.length; });
IssueSchema.virtual('resolutionDays').get(function() {
  if (!this.resolvedAt) return null;
  return Math.round((this.resolvedAt - this.createdAt) / 86400000);
});
IssueSchema.virtual('isOverdue').get(function() {
  if (this.status === 'resolved' || !this.expectedResolution) return false;
  return new Date() > this.expectedResolution;
});

IssueSchema.set('toJSON', { virtuals: true });
IssueSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Issue', IssueSchema);
