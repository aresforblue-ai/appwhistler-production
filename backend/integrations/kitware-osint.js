/**
 * Kitware OSINT Integration
 * Source: github.com/Kitware/analytic-catalog (SemaFor Semantic Forensics)
 *
 * Purpose: Media manipulation detection (deepfakes, image editing, metadata forensics)
 * Use cases: Verify app screenshots, promotional videos, user profile images
 *
 * License: Apache 2.0
 */

const axios = require('axios');
const logger = require('../utils/logger');

// Kitware API endpoint (deployed separately)
const KITWARE_ENDPOINT = process.env.KITWARE_ENDPOINT || 'http://localhost:5005/analyze';

/**
 * Analyze media for manipulation/deepfakes
 */
async function analyzeWithKitware(mediaUrl, options = {}) {
  try {
    const response = await axios.post(
      KITWARE_ENDPOINT,
      {
        media_url: mediaUrl,
        media_type: options.mediaType || 'auto', // 'image', 'video', 'auto'
        analysis_types: options.analysisTypes || ['deepfake', 'exif', 'attribution'],
        return_heatmap: options.returnHeatmap || false
      },
      {
        timeout: options.timeout || 15000, // Media analysis can be slow
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AppWhistler/1.0'
        }
      }
    );

    return {
      isManipulated: response.data.is_manipulated || false,
      manipulationScore: response.data.manipulation_score || 0,
      deepfakeProbability: response.data.deepfake_prob || 0,
      exifFlags: response.data.exif_flags || [],
      attributionSource: response.data.attribution_source || 'Unknown',
      heatmap: response.data.heatmap || null,
      metadata: {
        analyzedAt: new Date().toISOString(),
        source: 'KITWARE_API'
      }
    };
  } catch (error) {
    logger.error('[Kitware Integration] Analysis failed:', error.message);

    // Fallback to basic EXIF/format checking
    if (options.allowFallback !== false) {
      logger.info('[Kitware Integration] Using fallback EXIF checker');
      return analyzeWithFallback(mediaUrl);
    }

    throw error;
  }
}

/**
 * Fallback media analysis using basic EXIF and format checks
 */
async function analyzeWithFallback(mediaUrl) {
  try {
    // Download media to inspect headers/metadata
    const response = await axios.get(mediaUrl, {
      timeout: 8000,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AppWhistler/1.0)'
      }
    });

    const buffer = Buffer.from(response.data);
    const contentType = response.headers['content-type'];

    const analysis = {
      isManipulated: false,
      manipulationScore: 0,
      deepfakeProbability: 0,
      exifFlags: [],
      attributionSource: 'Unknown',
      heatmap: null,
      metadata: {
        analyzedAt: new Date().toISOString(),
        source: 'FALLBACK_EXIF_CHECKER',
        fileSize: buffer.length,
        contentType
      }
    };

    // Basic EXIF parsing for JPEG images
    if (contentType && contentType.includes('image/jpeg')) {
      const exifData = parseBasicEXIF(buffer);

      // Check for missing EXIF (suspicious for screenshots)
      if (!exifData.hasCameraInfo) {
        analysis.exifFlags.push({
          type: 'MISSING_CAMERA_DATA',
          severity: 'MEDIUM',
          description: 'No camera metadata found (may be edited or screenshot)'
        });
        analysis.manipulationScore += 20;
      }

      // Check for editing software signatures
      if (exifData.editingSoftware) {
        analysis.exifFlags.push({
          type: 'EDITING_SOFTWARE_DETECTED',
          severity: 'LOW',
          description: `Image edited with: ${exifData.editingSoftware}`
        });
        analysis.manipulationScore += 15;
      }

      // Check for timestamp inconsistencies
      if (exifData.timestampMismatch) {
        analysis.exifFlags.push({
          type: 'TIMESTAMP_MISMATCH',
          severity: 'HIGH',
          description: 'File timestamp doesn\'t match EXIF timestamp (possible forgery)'
        });
        analysis.manipulationScore += 30;
      }
    }

    // Check for suspiciously small file size (over-compressed = possibly manipulated)
    const pixelEstimate = buffer.length / (contentType?.includes('jpeg') ? 10 : 3);
    if (pixelEstimate < 100000) { // < 100k pixels
      analysis.exifFlags.push({
        type: 'LOW_QUALITY',
        severity: 'LOW',
        description: 'Image quality unusually low (may hide manipulation artifacts)'
      });
      analysis.manipulationScore += 10;
    }

    // Check for stock photo watermarks (common in fake apps)
    const watermarkPatterns = [
      'shutterstock',
      'gettyimages',
      'istockphoto',
      'depositphotos',
      'dreamstime'
    ];

    // Can't easily check image content without image processing library,
    // but we can check URL
    const urlLower = mediaUrl.toLowerCase();
    const hasWatermark = watermarkPatterns.some(w => urlLower.includes(w));
    if (hasWatermark) {
      analysis.exifFlags.push({
        type: 'STOCK_PHOTO',
        severity: 'HIGH',
        description: 'Image appears to be from stock photo site (not original)'
      });
      analysis.manipulationScore += 40;
      analysis.attributionSource = 'Stock Photo Site';
    }

    analysis.isManipulated = analysis.manipulationScore >= 50;
    analysis.deepfakeProbability = analysis.manipulationScore / 100;

    return analysis;
  } catch (error) {
    logger.error('[Kitware Fallback] Failed to analyze media:', error.message);
    return {
      isManipulated: false,
      manipulationScore: 0,
      deepfakeProbability: 0,
      exifFlags: [{ type: 'ANALYSIS_FAILED', severity: 'INFO', description: error.message }],
      attributionSource: 'Unknown',
      heatmap: null,
      metadata: {
        error: error.message,
        source: 'FALLBACK_EXIF_CHECKER'
      }
    };
  }
}

/**
 * Basic EXIF parser (simplified - doesn't handle all EXIF tags)
 */
function parseBasicEXIF(buffer) {
  const result = {
    hasCameraInfo: false,
    editingSoftware: null,
    timestampMismatch: false
  };

  try {
    // Look for EXIF marker (0xFFE1) in JPEG
    const markerIndex = buffer.indexOf(Buffer.from([0xFF, 0xE1]));
    if (markerIndex === -1) return result;

    // Check for common EXIF tags (simplified detection)
    const exifString = buffer.toString('utf8', markerIndex, markerIndex + 1000);

    // Camera/Device info
    if (exifString.includes('Canon') || exifString.includes('Nikon') ||
        exifString.includes('iPhone') || exifString.includes('Samsung')) {
      result.hasCameraInfo = true;
    }

    // Editing software
    const softwarePatterns = ['Photoshop', 'GIMP', 'Lightroom', 'Snapseed', 'Instagram'];
    for (const software of softwarePatterns) {
      if (exifString.includes(software)) {
        result.editingSoftware = software;
        break;
      }
    }

    // Note: Timestamp checking requires more complex EXIF parsing
    // This is a placeholder for the concept

  } catch (error) {
    logger.error('[EXIF Parser] Error:', error.message);
  }

  return result;
}

/**
 * Analyze app media with Kitware (main export for orchestrator)
 */
async function analyzeAppMedia(appData, options = {}) {
  try {
    // Collect all media URLs from app data
    const mediaUrls = [];
    if (appData.icon_url) mediaUrls.push({ url: appData.icon_url, type: 'icon' });
    if (appData.screenshots) {
      appData.screenshots.forEach((screenshot, idx) => {
        mediaUrls.push({ url: screenshot, type: 'screenshot', index: idx });
      });
    }
    if (appData.promotional_video) mediaUrls.push({ url: appData.promotional_video, type: 'video' });

    if (mediaUrls.length === 0) {
      return {
        fakeScore: 0,
        confidence: 0,
        verdict: 'NO_MEDIA_TO_ANALYZE',
        mediaAnalysis: [],
        redFlags: []
      };
    }

    // Analyze each media item
    const analyses = [];
    for (const media of mediaUrls) {
      const analysis = await analyzeWithKitware(media.url, {
        ...options,
        mediaType: media.type === 'video' ? 'video' : 'image'
      });

      analyses.push({
        ...analysis,
        mediaType: media.type,
        mediaUrl: media.url
      });

      // Rate limit to avoid overwhelming API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Calculate composite score
    const avgManipulationScore = analyses.reduce((sum, a) => sum + a.manipulationScore, 0) / analyses.length;
    const maxDeepfakeProb = Math.max(...analyses.map(a => a.deepfakeProbability));

    const fakeScore = Math.round(
      avgManipulationScore * 0.6 +
      maxDeepfakeProb * 100 * 0.4
    );

    return {
      fakeScore,
      confidence: analyses.length >= 3 ? 75 : 60, // More media = higher confidence
      verdict: fakeScore >= 70 ? 'LIKELY_FAKE' :
               fakeScore >= 40 ? 'SUSPICIOUS' :
               'LIKELY_GENUINE',
      mediaAnalysis: analyses,
      summary: {
        totalMediaAnalyzed: analyses.length,
        manipulatedCount: analyses.filter(a => a.isManipulated).length,
        avgManipulationScore,
        maxDeepfakeProb
      },
      redFlags: generateKitwareRedFlags(analyses)
    };
  } catch (error) {
    logger.error('[Kitware Integration] App media analysis failed:', error.message);
    return null;
  }
}

/**
 * Generate red flags based on Kitware analysis
 */
function generateKitwareRedFlags(analyses) {
  const flags = [];

  const manipulatedMedia = analyses.filter(a => a.isManipulated);
  if (manipulatedMedia.length > 0) {
    flags.push({
      category: 'Media Manipulation',
      severity: manipulatedMedia.length > 2 ? 'CRITICAL' : 'HIGH',
      description: `${manipulatedMedia.length} of ${analyses.length} media items show signs of manipulation`
    });
  }

  const deepfakes = analyses.filter(a => a.deepfakeProbability > 0.5);
  if (deepfakes.length > 0) {
    flags.push({
      category: 'Deepfake Detection',
      severity: 'CRITICAL',
      description: `${deepfakes.length} media item(s) flagged as potential deepfakes`
    });
  }

  const stockPhotos = analyses.filter(a =>
    a.attributionSource && a.attributionSource !== 'Unknown' && a.attributionSource !== 'Original'
  );
  if (stockPhotos.length > 0) {
    flags.push({
      category: 'Stock Photography',
      severity: 'HIGH',
      description: `App uses ${stockPhotos.length} stock photo(s) instead of original content`
    });
  }

  const exifIssues = analyses.filter(a => a.exifFlags.length > 0);
  if (exifIssues.length > 0) {
    const criticalExif = analyses.flatMap(a => a.exifFlags).filter(f => f.severity === 'HIGH');
    if (criticalExif.length > 0) {
      flags.push({
        category: 'EXIF Metadata',
        severity: 'HIGH',
        description: `Found ${criticalExif.length} critical EXIF issue(s): ${criticalExif[0].description}`
      });
    }
  }

  const fallbackUsed = analyses.some(a => a.metadata.source === 'FALLBACK_EXIF_CHECKER');
  if (fallbackUsed) {
    flags.push({
      category: 'Analysis Method',
      severity: 'INFO',
      description: 'Kitware API unavailable - used basic EXIF analysis (lower accuracy)'
    });
  }

  return flags;
}

/**
 * Health check for Kitware API
 */
async function checkKitwareHealth() {
  try {
    const response = await axios.get(`${KITWARE_ENDPOINT.replace('/analyze', '')}/health`, { timeout: 3000 });
    return {
      available: true,
      endpoint: KITWARE_ENDPOINT,
      status: response.data
    };
  } catch (error) {
    return {
      available: false,
      endpoint: KITWARE_ENDPOINT,
      error: error.message
    };
  }
}

module.exports = {
  analyzeAppMedia,
  analyzeWithKitware,
  analyzeWithFallback,
  checkKitwareHealth
};
