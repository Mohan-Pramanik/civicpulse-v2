require('dotenv').config();
const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const morgan       = require('morgan');
const compression  = require('compression');
const rateLimit    = require('express-rate-limit');
const mongoSanitize= require('express-mongo-sanitize');
const path         = require('path');
const fs           = require('fs');

const connectDB      = require('./config/db');
const logger         = require('./utils/logger');
const errorHandler   = require('./middleware/errorHandler');

const app = express();

// ── Security ────────────────────────────────────────────────
app.use(helmet());
app.use(mongoSanitize());
app.use(compression());

// ── Rate Limiting ────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
  max:       parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message:   { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// ── CORS ─────────────────────────────────────────────────────
// app.use(cors({
//   origin: [process.env.CLIENT_URL || 'http://localhost:3000'],
//   credentials: true
// }));

app.use(cors({
  origin: true,
  credentials: true
}));

// ── Body Parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ──────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── Static Files ─────────────────────────────────────────────
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync('./logs'))   fs.mkdirSync('./logs',   { recursive: true });
app.use('/uploads', express.static(path.join(__dirname, uploadDir)));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',   require('./routes/auth'));
app.use('/api/issues', require('./routes/issues'));
app.use('/api/admin',  require('./routes/admin'));

// ── Health Check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({
  status: 'OK', env: process.env.NODE_ENV, time: new Date()
}));

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ── Error Handler ─────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => logger.info(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`));
}).catch(err => {
  logger.error(`DB connection failed: ${err.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  process.exit(1);
});

module.exports = app;
