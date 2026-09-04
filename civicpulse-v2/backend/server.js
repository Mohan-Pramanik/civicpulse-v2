require('dotenv').config();
const express       = require('express');
const helmet        = require('helmet');
const cors          = require('cors');
const morgan        = require('morgan');
const compression   = require('compression');
const rateLimit     = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const path          = require('path');
const fs            = require('fs');
const mongoose      = require('mongoose');

const connectDB    = require('./config/db');
const logger       = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ── Security ─────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(mongoSanitize());
app.use(compression());

// ── Rate Limiting ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
  skip: req => req.path === '/api/health',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many login attempts, please try again in 15 minutes.' },
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);

// ── CORS ──────────────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body Parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging ───────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// ── Static Files ──────────────────────────────────────────────
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync('./logs'))   fs.mkdirSync('./logs',   { recursive: true });

app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  next();
}, express.static(path.resolve(__dirname, uploadDir)));

// ── Routes ────────────────────────────────────────────────────
// All routes must be registered BEFORE syncIndexes() so their
// models are loaded and Mongoose knows which indexes to create.
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/issues',   require('./routes/issues'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/deadline', require('./routes/deadline'));

// ── Health Check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'OK', env: process.env.NODE_ENV, time: new Date() }));

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ── Error Handler ─────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  // Sync indexes AFTER connectDB AND after all routes (models) are loaded.
  // This ensures the 2dsphere index on location.geo is created/updated correctly.
  try {
    await mongoose.connection.syncIndexes();
    logger.info('MongoDB indexes synced');
  } catch (err) {
    logger.error(`Index sync failed: ${err.message}`);
  }

  app.listen(PORT, () => logger.info(`🚀 Server on port ${PORT} [${process.env.NODE_ENV}]`));
}).catch(err => { logger.error(`DB failed: ${err.message}`); process.exit(1); });

process.on('unhandledRejection', err => { logger.error(`Unhandled: ${err.message}`); process.exit(1); });

require('./jobs/Deadlinejob');
module.exports = app;