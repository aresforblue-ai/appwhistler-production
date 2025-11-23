// src/backend/middleware/upload.js
// Multer middleware for handling file uploads with validation and security

const multer = require('multer');
const crypto = require('crypto');
const { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } = require('../utils/ipfsUpload');

// Configure multer to use memory storage (we'll upload to IPFS, not disk)
const storage = multer.memoryStorage();

// File filter for validation
const fileFilter = (req, file, cb) => {
  // Check MIME type
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`), false);
  }
};

// Base multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1 // Only allow 1 file per request
  }
});

// Specific upload handlers for different use cases
const uploadAvatar = upload.single('avatar');
const uploadAppIcon = upload.single('icon');
const uploadFactCheckImage = upload.single('image');

// Error handling middleware
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        message: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Only 1 file allowed per upload'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Unexpected field',
        message: 'Invalid file field name'
      });
    }
    return res.status(400).json({
      error: 'Upload error',
      message: err.message
    });
  } else if (err) {
    // Custom errors (e.g., from fileFilter)
    return res.status(400).json({
      error: 'Upload validation failed',
      message: err.message
    });
  }
  next();
}

// Middleware to ensure user is authenticated before upload
function requireAuthForUpload(req, res, next) {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'You must be logged in to upload files'
    });
  }
  next();
}

// Security middleware: Add upload metadata to request
function addUploadMetadata(req, res, next) {
  if (req.file) {
    // Generate unique upload ID for tracking
    req.uploadId = crypto.randomBytes(16).toString('hex');
    req.uploadTimestamp = new Date().toISOString();
    req.uploadIp = req.ip || req.connection.remoteAddress;
    req.uploadUserAgent = req.headers['user-agent'];

    // Log upload attempt for audit trail
    logger.info(`📤 Upload attempt: ${req.uploadId} by user ${req.user?.userId || 'anonymous'}`);
  }
  next();
}

// Rate limiting specifically for uploads (separate from general API rate limiting)
const uploadRateLimiter = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per 15 minutes
  message: {
    error: 'Too many uploads',
    message: 'Upload rate limit exceeded. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for admins
    return req.user?.role === 'admin';
  }
});

module.exports = {
  uploadAvatar,
  uploadAppIcon,
  uploadFactCheckImage,
  handleUploadError,
  requireAuthForUpload,
  addUploadMetadata,
  uploadRateLimiter
};
