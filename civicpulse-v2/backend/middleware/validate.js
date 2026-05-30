const { body, validationResult } = require('express-validator');

// ── Run validation results and return errors ──────────────────
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors:  errors.array(),
    });
  }
  next();
};

// ── Register rules (🇮🇳 India-only phone & pincode) ──────────
exports.registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 80 }).withMessage('Name too long'),

  body('email')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  // ── 🇮🇳 Phone: +91 followed by 10 digits starting 6-9 ───────
  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^\+91[6-9]\d{9}$/)
    .withMessage('Phone must be a valid Indian number (+91XXXXXXXXXX). Only Indian numbers allowed.'),

  // ── 🇮🇳 Pincode: 6-digit Indian format ──────────────────────
  body('pincode')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^[1-9][0-9]{5}$/)
    .withMessage('Pincode must be a valid 6-digit Indian pincode (e.g. 700001)'),
];

// ── Login rules ───────────────────────────────────────────────
exports.loginRules = [
  body('email')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),
];

// ── Issue rules ───────────────────────────────────────────────
exports.issueRules = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 150 }).withMessage('Title too long'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ max: 2000 }).withMessage('Description too long'),

  body('category')
    .isIn(['road', 'water', 'waste', 'electricity', 'encroachment', 'other'])
    .withMessage('Invalid category'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid priority'),

  // Coordinates (optional — required for duplicate detection)
  body('lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),

  body('lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
];