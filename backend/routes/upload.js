// src/backend/routes/upload.js
// REST endpoints for file uploads (multipart/form-data doesn't work well with GraphQL)

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  uploadAvatar,
  uploadAppIcon,
  uploadFactCheckImage,
  handleUploadError,
  requireAuthForUpload,
  addUploadMetadata,
  uploadRateLimiter
} = require('../middleware/upload');
const {
  uploadAvatar: uploadAvatarToIPFS,
  uploadAppIcon: uploadAppIconToIPFS,
  uploadFactCheckImage: uploadFactCheckImageToIPFS
} = require('../utils/ipfsUpload');

/**
 * POST /api/v1/upload/avatar
 * Upload user avatar to IPFS
 */
router.post(
  '/avatar',
  uploadRateLimiter,
  requireAuth,
  requireAuthForUpload,
  uploadAvatar,
  handleUploadError,
  addUploadMetadata,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Please provide an avatar image file'
        });
      }

      const { userId } = req.user;

      // Upload to IPFS
      const result = await uploadAvatarToIPFS(req.file, userId);

      // Log successful upload
      logger.info(`✅ Avatar uploaded for user ${userId}: ${result.avatar.ipfsHash}`);

      res.status(200).json({
        success: true,
        message: 'Avatar uploaded successfully to IPFS',
        data: {
          avatarUrl: result.avatar.url,
          thumbnailUrl: result.thumbnail.url,
          ipfsHash: result.avatar.ipfsHash,
          thumbnailIpfsHash: result.thumbnail.ipfsHash,
          size: result.avatar.size
        }
      });
    } catch (error) {
      logger.error('Avatar upload error:', error);
      res.status(500).json({
        error: 'Upload failed',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/v1/upload/app-icon
 * Upload app icon to IPFS
 */
router.post(
  '/app-icon',
  uploadRateLimiter,
  requireAuth,
  requireAuthForUpload,
  uploadAppIcon,
  handleUploadError,
  addUploadMetadata,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Please provide an app icon image file'
        });
      }

      const { userId } = req.user;
      const { appId } = req.body;

      if (!appId) {
        return res.status(400).json({
          error: 'Missing app ID',
          message: 'Please provide the app ID'
        });
      }

      // Upload to IPFS
      const result = await uploadAppIconToIPFS(req.file, appId, userId);

      logger.info(`✅ App icon uploaded for app ${appId}: ${result.icon.ipfsHash}`);

      res.status(200).json({
        success: true,
        message: 'App icon uploaded successfully to IPFS',
        data: {
          iconUrl: result.icon.url,
          thumbnailUrl: result.thumbnail.url,
          ipfsHash: result.icon.ipfsHash,
          thumbnailIpfsHash: result.thumbnail.ipfsHash,
          size: result.icon.size
        }
      });
    } catch (error) {
      logger.error('App icon upload error:', error);
      res.status(500).json({
        error: 'Upload failed',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/v1/upload/fact-check-image
 * Upload fact-check image to IPFS
 */
router.post(
  '/fact-check-image',
  uploadRateLimiter,
  requireAuth,
  requireAuthForUpload,
  uploadFactCheckImage,
  handleUploadError,
  addUploadMetadata,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Please provide a fact-check image file'
        });
      }

      const { userId } = req.user;
      const { factCheckId } = req.body;

      if (!factCheckId) {
        return res.status(400).json({
          error: 'Missing fact-check ID',
          message: 'Please provide the fact-check ID'
        });
      }

      // Upload to IPFS
      const result = await uploadFactCheckImageToIPFS(req.file, factCheckId, userId);

      logger.info(`✅ Fact-check image uploaded: ${result.image.ipfsHash}`);

      res.status(200).json({
        success: true,
        message: 'Fact-check image uploaded successfully to IPFS',
        data: {
          imageUrl: result.image.url,
          thumbnailUrl: result.thumbnail.url,
          ipfsHash: result.image.ipfsHash,
          thumbnailIpfsHash: result.thumbnail.ipfsHash,
          size: result.image.size,
          dimensions: result.image.dimensions
        }
      });
    } catch (error) {
      logger.error('Fact-check image upload error:', error);
      res.status(500).json({
        error: 'Upload failed',
        message: error.message
      });
    }
  }
);

module.exports = router;
