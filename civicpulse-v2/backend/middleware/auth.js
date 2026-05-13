const jwt      = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError     = require('../utils/ApiError');
const User         = require('../models/User');

exports.protect = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return next(new ApiError('Not authorized — no token', 401));

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = await User.findById(decoded.id);
  if (!req.user || !req.user.isActive) return next(new ApiError('User not found or deactivated', 401));
  next();
});

exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return next(new ApiError(`Role '${req.user.role}' not authorized`, 403));
  next();
};
