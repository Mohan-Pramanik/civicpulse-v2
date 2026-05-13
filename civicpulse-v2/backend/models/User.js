const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  name:       { type: String, required: [true,'Name required'], trim: true, maxlength: 80 },
  email:      { type: String, required: [true,'Email required'], unique: true, lowercase: true,
                match: [/^\S+@\S+\.\S+$/, 'Invalid email'] },
  password:   { type: String, required: [true,'Password required'], minlength: 6, select: false },
  phone:      { type: String, match: [/^[6-9]\d{9}$/, 'Invalid Indian phone number'] },
  role:       { type: String, enum: ['citizen','department','admin'], default: 'citizen' },
  department: { type: String },           // only for department users
  avatar:     { type: String, default: '' },
  ward:       { type: String },           // civic ward
  area:       { type: String },
  isActive:   { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  lastLogin:  { type: Date },
  loginCount: { type: Number, default: 0 },
  resetPasswordToken:   String,
  resetPasswordExpire:  Date,
  createdAt:  { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });

// Hash password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Sign JWT
UserSchema.methods.getSignedToken = function() {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Match password
UserSchema.methods.matchPassword = function(entered) {
  return bcrypt.compare(entered, this.password);
};

// Remove sensitive fields from JSON output
UserSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpire;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
