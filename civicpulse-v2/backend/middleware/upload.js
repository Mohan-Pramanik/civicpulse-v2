const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const ApiError = require('../utils/ApiError');

const dir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename:    (req, file, cb) => cb(null, `issue_${Date.now()}${path.extname(file.originalname)}`)
});

const fileFilter = (req, file, cb) => {
  if (/jpeg|jpg|png|webp/.test(path.extname(file.originalname).toLowerCase()))
    return cb(null, true);
  cb(new ApiError('Only image files allowed', 400));
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 }
});
