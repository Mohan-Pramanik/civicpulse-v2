const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: 80,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false,
  },

  // ── 🇮🇳 INDIA-ONLY: phone must be +91XXXXXXXXXX ─────────────
  phone: {
    type: String,
    validate: {
      validator: function (v) {
        if (!v) return true; // optional field
        return /^\+91[6-9]\d{9}$/.test(v);
      },
      message: 'Phone must be a valid Indian number (+91XXXXXXXXXX, e.g. +919876543210)',
    },
  },

  // ── 🇮🇳 INDIA-ONLY: 6-digit Indian pincode ──────────────────
  pincode: {
    type: String,
    validate: {
      validator: function (v) {
        if (!v) return true; // optional
        return /^[1-9][0-9]{5}$/.test(v);
      },
      message: 'Pincode must be a valid 6-digit Indian pincode (e.g. 700001)',
    },
  },

  role:       { type: String, enum: ['citizen', 'department', 'admin'], default: 'citizen' },
  department: { type: String },
  isHead:     { type: Boolean, default: false },
  avatar:     { type: String, default: '' },
  ward:       { type: String },
  area:       { type: String },
  address:    { type: String },
  isActive:   { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  lastLogin:  { type: Date },
  loginCount: { type: Number, default: 0 },

  // ── Penalty & Performance (field officers only) ───────────────
  penaltyPoints:  { type: Number, default: 0 }, // accumulates over time
  totalAssigned:  { type: Number, default: 0 }, // total issues ever assigned
  resolvedOnTime: { type: Number, default: 0 }, // resolved before deadline
  resolvedLate:   { type: Number, default: 0 }, // resolved after deadline

  resetPasswordToken:  String,
  resetPasswordExpire: Date,
}, { timestamps: true });

// ── Virtual: accountability score as 0–100 percentage ────────
UserSchema.virtual('accountabilityScore').get(function () {
  if (!this.totalAssigned) return 100;
  return Math.round((this.resolvedOnTime / this.totalAssigned) * 100);
});

UserSchema.set('toJSON',   { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

// email index is auto-created by unique:true above — no manual index needed
UserSchema.index({ role: 1 });
UserSchema.index({ department: 1 });

// ── Hash password before save ─────────────────────────────────
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Generate JWT ──────────────────────────────────────────────
UserSchema.methods.getSignedToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role, isHead: this.isHead },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// ── Match entered password against hash ───────────────────────
UserSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

// ── Strip sensitive fields from JSON output ───────────────────
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpire;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);