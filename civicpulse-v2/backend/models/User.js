const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  name:       { type:String, required:[true,'Name required'], trim:true, maxlength:80 },
  email:      { type:String, required:[true,'Email required'], unique:true, lowercase:true, match:[/^\S+@\S+\.\S+$/,'Invalid email'] },
  password:   { type:String, required:[true,'Password required'], minlength:6, select:false },
  phone:      { type:String },
  role:       { type:String, enum:['citizen','department','admin'], default:'citizen' },
  department: { type:String },
  isHead:     { type:Boolean, default:false }, // true = dept head, false = field officer
  avatar:     { type:String, default:'' },
  ward:       { type:String },
  area:       { type:String },
  isActive:   { type:Boolean, default:true },
  isVerified: { type:Boolean, default:false },
  lastLogin:  { type:Date },
  loginCount: { type:Number, default:0 },
  resetPasswordToken:  String,
  resetPasswordExpire: Date,
}, { timestamps:true });

UserSchema.index({ email:1 });
UserSchema.index({ role:1 });

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.getSignedToken = function() {
  return jwt.sign(
    { id:this._id, role:this.role, isHead:this.isHead },
    process.env.JWT_SECRET,
    { expiresIn:process.env.JWT_EXPIRE }
  );
};

UserSchema.methods.matchPassword = function(entered) {
  return bcrypt.compare(entered, this.password);
};

UserSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpire;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);