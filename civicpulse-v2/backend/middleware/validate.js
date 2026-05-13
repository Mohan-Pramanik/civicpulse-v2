const { body, validationResult } = require('express-validator');

exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

exports.registerRules = [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be 6+ chars'),
];

exports.loginRules = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

exports.issueRules = [
  body('title').trim().notEmpty().withMessage('Title required').isLength({ max: 150 }),
  body('description').trim().notEmpty().withMessage('Description required'),
  body('category').isIn(['road','water','waste','electricity','encroachment','other']).withMessage('Invalid category'),
  body('address').trim().notEmpty().withMessage('Address required'),
];
