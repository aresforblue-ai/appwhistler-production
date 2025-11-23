// src/backend/utils/ipfsUpload.js
// IPFS file upload utility using Pinata for permanent, decentralized storage

const pinataSDK = require('@pinata/sdk');
const sharp = require('sharp');
const crypto = require('crypto');
const { getSecret } = require('../../config/secrets');

// Initialize Pinata client
const PINATA_API_KEY = getSecret('PINATA_API_KEY');
const PINATA_SECRET_KEY = getSecret('PINATA_SECRET_KEY');

let pinata = null;
if (PINATA_API_KEY && PINATA_API_KEY !== 'your_pinata_api_key') {
  pinata = new pinataSDK(PINATA_API_KEY, PINATA_SECRET_KEY);
}

// File validation constants
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const AVATAR_SIZE = 256; // 256x256px
const APP_ICON_SIZE = 512; // 512x512px
const THUMBNAIL_SIZE = 128; // 128x128px

/**
 * Validate file upload
 */
function validateImageFile(file) {
  const errors = [];

  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    errors.push(`Invalid file type. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Check if file buffer exists
  if (!file.buffer) {
    errors.push('File buffer is missing');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Optimize and resize image
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {Object} options - Resize options
 * @returns {Promise<Buffer>} - Optimized image buffer
 */
async function optimizeImage(imageBuffer, options = {}) {
  const {
    width = 512,
    height = 512,
    format = 'webp',
    quality = 85
  } = options;

  try {
    let pipeline = sharp(imageBuffer)
      .resize(width, height, {
        fit: 'cover',
        position: 'center'
      });

    // Convert to specified format with optimization
    if (format === 'webp') {
      pipeline = pipeline.webp({ quality, effort: 6 });
    } else if (format === 'jpeg' || format === 'jpg') {
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
    } else if (format === 'png') {
      pipeline = pipeline.png({ quality, compressionLevel: 9 });
    }

    const optimized = await pipeline.toBuffer();
    return optimized;
  } catch (error) {
    throw new Error(`Image optimization failed: ${error.message}`);
  }
}

/**
 * Generate thumbnail from image
 */
async function generateThumbnail(imageBuffer, size = THUMBNAIL_SIZE) {
  return optimizeImage(imageBuffer, {
    width: size,
    height: size,
    format: 'webp',
    quality: 75
  });
}

/**
 * Upload buffer to IPFS via Pinata
 * @param {Buffer} buffer - File buffer to upload
 * @param {Object} metadata - File metadata
 * @returns {Promise<Object>} - Upload result with IPFS hash and URL
 */
async function uploadToIPFS(buffer, metadata = {}) {
  if (!pinata) {
    throw new Error('Pinata not configured. Set PINATA_API_KEY and PINATA_SECRET_KEY in .env');
  }

  try {
    // Test Pinata authentication
    await pinata.testAuthentication();

    const {
      name = `upload-${Date.now()}`,
      type = 'image',
      userId = null,
      description = ''
    } = metadata;

    // Create a readable stream from buffer
    const Readable = require('stream').Readable;
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    // Upload to IPFS
    const options = {
      pinataMetadata: {
        name,
        keyvalues: {
          type,
          userId: userId || 'anonymous',
          uploadedAt: new Date().toISOString(),
          description
        }
      },
      pinataOptions: {
        cidVersion: 1
      }
    };

    const result = await pinata.pinFileToIPFS(stream, options);

    // Generate gateway URLs
    const ipfsHash = result.IpfsHash;
    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    const dedicatedGateway = `https://appwhistler.mypinata.cloud/ipfs/${ipfsHash}`; // If you set up dedicated gateway

    return {
      success: true,
      ipfsHash,
      url: gatewayUrl,
      dedicatedUrl: dedicatedGateway,
      size: result.PinSize,
      timestamp: result.Timestamp
    };
  } catch (error) {
    logger.error('IPFS upload error:', error);
    throw new Error(`Failed to upload to IPFS: ${error.message}`);
  }
}

/**
 * Upload avatar image
 * - Validates image
 * - Resizes to 256x256
 * - Optimizes for web
 * - Uploads to IPFS
 * - Generates thumbnail
 */
async function uploadAvatar(file, userId) {
  // Validate file
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }

  // Optimize avatar (256x256, WebP)
  const optimized = await optimizeImage(file.buffer, {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    format: 'webp',
    quality: 85
  });

  // Upload to IPFS
  const result = await uploadToIPFS(optimized, {
    name: `avatar-${userId}-${Date.now()}.webp`,
    type: 'avatar',
    userId,
    description: 'User avatar image'
  });

  // Generate thumbnail (128x128)
  const thumbnail = await generateThumbnail(file.buffer, THUMBNAIL_SIZE);
  const thumbnailResult = await uploadToIPFS(thumbnail, {
    name: `avatar-thumb-${userId}-${Date.now()}.webp`,
    type: 'avatar-thumbnail',
    userId,
    description: 'Avatar thumbnail'
  });

  return {
    avatar: {
      url: result.url,
      ipfsHash: result.ipfsHash,
      size: result.size
    },
    thumbnail: {
      url: thumbnailResult.url,
      ipfsHash: thumbnailResult.ipfsHash,
      size: thumbnailResult.size
    }
  };
}

/**
 * Upload app icon image
 * - Validates image
 * - Resizes to 512x512
 * - Optimizes for web
 * - Uploads to IPFS
 * - Generates thumbnail
 */
async function uploadAppIcon(file, appId, userId) {
  // Validate file
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }

  // Optimize icon (512x512, WebP)
  const optimized = await optimizeImage(file.buffer, {
    width: APP_ICON_SIZE,
    height: APP_ICON_SIZE,
    format: 'webp',
    quality: 90
  });

  // Upload to IPFS
  const result = await uploadToIPFS(optimized, {
    name: `app-icon-${appId}-${Date.now()}.webp`,
    type: 'app-icon',
    userId,
    description: 'Application icon'
  });

  // Generate thumbnail (128x128)
  const thumbnail = await generateThumbnail(file.buffer, THUMBNAIL_SIZE);
  const thumbnailResult = await uploadToIPFS(thumbnail, {
    name: `app-icon-thumb-${appId}-${Date.now()}.webp`,
    type: 'app-icon-thumbnail',
    userId,
    description: 'App icon thumbnail'
  });

  return {
    icon: {
      url: result.url,
      ipfsHash: result.ipfsHash,
      size: result.size
    },
    thumbnail: {
      url: thumbnailResult.url,
      ipfsHash: thumbnailResult.ipfsHash,
      size: thumbnailResult.size
    }
  };
}

/**
 * Upload fact-check image (for image-based claims)
 */
async function uploadFactCheckImage(file, factCheckId, userId) {
  // Validate file
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }

  // Optimize image (max 1920x1080, preserve aspect ratio)
  const metadata = await sharp(file.buffer).metadata();
  const aspectRatio = metadata.width / metadata.height;
  let width = 1920;
  let height = Math.round(width / aspectRatio);

  if (height > 1080) {
    height = 1080;
    width = Math.round(height * aspectRatio);
  }

  const optimized = await optimizeImage(file.buffer, {
    width,
    height,
    format: 'webp',
    quality: 85
  });

  // Upload to IPFS
  const result = await uploadToIPFS(optimized, {
    name: `factcheck-${factCheckId}-${Date.now()}.webp`,
    type: 'fact-check-image',
    userId,
    description: 'Fact-check claim image'
  });

  // Generate thumbnail
  const thumbnail = await generateThumbnail(file.buffer, THUMBNAIL_SIZE);
  const thumbnailResult = await uploadToIPFS(thumbnail, {
    name: `factcheck-thumb-${factCheckId}-${Date.now()}.webp`,
    type: 'fact-check-thumbnail',
    userId,
    description: 'Fact-check thumbnail'
  });

  return {
    image: {
      url: result.url,
      ipfsHash: result.ipfsHash,
      size: result.size,
      dimensions: { width, height }
    },
    thumbnail: {
      url: thumbnailResult.url,
      ipfsHash: thumbnailResult.ipfsHash,
      size: thumbnailResult.size
    }
  };
}

/**
 * Delete file from IPFS (unpin)
 * Note: IPFS content is permanent, but unpinning removes it from Pinata's servers
 */
async function deleteFromIPFS(ipfsHash) {
  if (!pinata) {
    throw new Error('Pinata not configured');
  }

  try {
    await pinata.unpin(ipfsHash);
    return { success: true, message: 'File unpinned from IPFS' };
  } catch (error) {
    logger.error('IPFS deletion error:', error);
    throw new Error(`Failed to unpin from IPFS: ${error.message}`);
  }
}

/**
 * Get file metadata from Pinata
 */
async function getIPFSMetadata(ipfsHash) {
  if (!pinata) {
    throw new Error('Pinata not configured');
  }

  try {
    const filters = {
      ipfsPinHash: ipfsHash
    };
    const result = await pinata.pinList(filters);
    return result.rows[0] || null;
  } catch (error) {
    logger.error('IPFS metadata error:', error);
    throw new Error(`Failed to get IPFS metadata: ${error.message}`);
  }
}

module.exports = {
  validateImageFile,
  optimizeImage,
  generateThumbnail,
  uploadToIPFS,
  uploadAvatar,
  uploadAppIcon,
  uploadFactCheckImage,
  deleteFromIPFS,
  getIPFSMetadata,
  // Constants
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  AVATAR_SIZE,
  APP_ICON_SIZE,
  THUMBNAIL_SIZE
};
