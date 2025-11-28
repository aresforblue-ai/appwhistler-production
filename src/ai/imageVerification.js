// src/ai/imageVerification.js
// Image verification: reverse image search, EXIF analysis, manipulation detection

const axios = require('axios');
const ExifParser = require('exif-parser');
const { getSecret } = require('../config/secrets');

/**
 * Image verification service for fact-checking
 * Detects manipulated images, finds original sources, extracts metadata
 */
class ImageVerifier {
  constructor() {
    this.googleApiKey = getSecret('GOOGLE_CUSTOM_SEARCH_API_KEY');
    this.googleCxId = getSecret('GOOGLE_CUSTOM_SEARCH_CX'); // Custom Search Engine ID
    this.tineyeApiKey = getSecret('TINEYE_API_KEY');
    this.tineyeApiUrl = 'https://api.tineye.com/rest/search/';
  }

  /**
   * Comprehensive image verification
   * @param {string} imageUrl - URL of image to verify
   * @returns {object} Verification results with manipulation score, sources, metadata
   */
  async verifyImage(imageUrl) {
    console.log(`🖼️  Verifying image: ${imageUrl}`);

    try {
      const [
        reverseSearchResults,
        exifData,
        manipulationScore
      ] = await Promise.all([
        this.reverseImageSearch(imageUrl),
        this.extractExifData(imageUrl),
        this.detectManipulation(imageUrl)
      ]);

      return {
        url: imageUrl,
        isManipulated: manipulationScore > 0.6,
        manipulationScore: manipulationScore,
        manipulationIndicators: this.getManipulationIndicators(manipulationScore, exifData),
        originalSources: reverseSearchResults.sources,
        matchCount: reverseSearchResults.matchCount,
        exifData: exifData,
        verifiedAt: new Date().toISOString(),
        recommendation: this.generateRecommendation(manipulationScore, reverseSearchResults, exifData)
      };
    } catch (error) {
      console.error('Image verification failed:', error.message);
      return {
        url: imageUrl,
        error: error.message,
        isManipulated: null,
        recommendation: 'Unable to verify image. Manual review recommended.'
      };
    }
  }

  /**
   * Reverse image search using Google and TinEye
   * @private
   */
  async reverseImageSearch(imageUrl) {
    const sources = [];
    let matchCount = 0;

    // Google Reverse Image Search
    if (this.googleApiKey && this.googleCxId) {
      try {
        const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
          params: {
            key: this.googleApiKey,
            cx: this.googleCxId,
            searchType: 'image',
            imgSize: 'large',
            q: imageUrl,
            num: 10
          },
          timeout: 10000
        });

        if (response.data.items) {
          matchCount += response.data.items.length;
          
          for (const item of response.data.items) {
            sources.push({
              url: item.link,
              title: item.title,
              source: item.displayLink,
              snippet: item.snippet,
              datePublished: item.image?.contextLink || null,
              searchEngine: 'google'
            });
          }
        }
      } catch (error) {
        console.warn('Google reverse image search failed:', error.message);
      }
    }

    // TinEye Reverse Image Search
    if (this.tineyeApiKey) {
      try {
        const response = await axios.get(this.tineyeApiUrl, {
          params: {
            api_key: this.tineyeApiKey,
            image_url: imageUrl
          },
          timeout: 10000
        });

        if (response.data.results) {
          matchCount += response.data.results.matches.length;
          
          for (const match of response.data.results.matches) {
            sources.push({
              url: match.backlink[0].url,
              domain: match.domain,
              crawlDate: match.crawl_date,
              searchEngine: 'tineye'
            });
          }
        }
      } catch (error) {
        console.warn('TinEye search failed:', error.message);
      }
    }

    // Sort by date (newest first)
    sources.sort((a, b) => {
      const dateA = new Date(a.datePublished || a.crawlDate || 0);
      const dateB = new Date(b.datePublished || b.crawlDate || 0);
      return dateB - dateA;
    });

    return {
      sources: sources.slice(0, 10), // Top 10 matches
      matchCount: matchCount,
      hasMultipleSources: matchCount > 1
    };
  }

  /**
   * Extract EXIF metadata from image
   * @private
   */
  async extractExifData(imageUrl) {
    try {
      // Download image buffer
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        maxContentLength: 10 * 1024 * 1024 // 10MB max
      });

      // Parse EXIF data
      const parser = ExifParser.create(response.data);
      const result = parser.parse();

      return {
        hasExif: !!result.tags,
        camera: result.tags?.Model || null,
        software: result.tags?.Software || null,
        dateTime: result.tags?.DateTime ? new Date(result.tags.DateTime * 1000).toISOString() : null,
        gps: result.tags?.GPSLatitude && result.tags?.GPSLongitude ? {
          latitude: result.tags.GPSLatitude,
          longitude: result.tags.GPSLongitude
        } : null,
        width: result.imageSize?.width || null,
        height: result.imageSize?.height || null,
        modificationDate: result.tags?.ModifyDate ? new Date(result.tags.ModifyDate * 1000).toISOString() : null
      };
    } catch (error) {
      console.warn('EXIF extraction failed:', error.message);
      return {
        hasExif: false,
        error: 'Could not extract EXIF data'
      };
    }
  }

  /**
   * Detect image manipulation using heuristics
   * @private
   */
  async detectManipulation(imageUrl) {
    // This is a simplified heuristic-based approach
    // For production, consider using ML models like:
    // - Forensically (https://29a.ch/photo-forensics/)
    // - Adobe Content Authenticity Initiative
    // - Deep learning models for deepfake detection

    let suspicionScore = 0;
    const indicators = [];

    try {
      // Download image for analysis
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        maxContentLength: 10 * 1024 * 1024
      });

      const buffer = Buffer.from(response.data);

      // Check 1: Missing EXIF data (suspicious for photos)
      try {
        const parser = ExifParser.create(buffer);
        const result = parser.parse();
        
        if (!result.tags || Object.keys(result.tags).length < 3) {
          suspicionScore += 0.2;
          indicators.push('Missing or minimal EXIF data');
        }
      } catch (e) {
        suspicionScore += 0.2;
        indicators.push('No EXIF data found');
      }

      // Check 2: File size anomalies
      const fileSize = buffer.length;
      if (fileSize < 50000) { // Very small file
        suspicionScore += 0.1;
        indicators.push('Unusually small file size');
      }

      // Check 3: Check for common manipulation software signatures
      const bufferStr = buffer.toString('utf8', 0, Math.min(buffer.length, 10000));
      const manipulationSoftware = ['photoshop', 'gimp', 'pixlr', 'canva', 'paint.net'];
      
      for (const software of manipulationSoftware) {
        if (bufferStr.toLowerCase().includes(software)) {
          suspicionScore += 0.3;
          indicators.push(`Edited with ${software}`);
          break;
        }
      }

      // Check 4: Multiple compression artifacts (suggests re-saving)
      // This would require more sophisticated image processing
      // For now, we'll skip this check

      return Math.min(suspicionScore, 1.0); // Cap at 1.0

    } catch (error) {
      console.warn('Manipulation detection failed:', error.message);
      return 0; // Unknown
    }
  }

  /**
   * Get human-readable manipulation indicators
   * @private
   */
  getManipulationIndicators(score, exifData) {
    const indicators = [];

    if (score > 0.6) {
      indicators.push('High likelihood of manipulation');
    } else if (score > 0.3) {
      indicators.push('Possible manipulation');
    } else {
      indicators.push('Low likelihood of manipulation');
    }

    if (!exifData.hasExif) {
      indicators.push('EXIF metadata missing or removed');
    }

    if (exifData.software) {
      indicators.push(`Image processed with: ${exifData.software}`);
    }

    if (exifData.modificationDate && exifData.dateTime) {
      const original = new Date(exifData.dateTime);
      const modified = new Date(exifData.modificationDate);
      const daysDiff = Math.abs((modified - original) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 1) {
        indicators.push(`Modified ${Math.round(daysDiff)} days after capture`);
      }
    }

    return indicators;
  }

  /**
   * Generate recommendation based on verification results
   * @private
   */
  generateRecommendation(manipulationScore, reverseSearchResults, exifData) {
    if (manipulationScore > 0.7) {
      return 'HIGH RISK: Image shows strong signs of manipulation. Verify with original source before using.';
    }

    if (manipulationScore > 0.4 && reverseSearchResults.matchCount === 0) {
      return 'MEDIUM RISK: Image may be manipulated and no original source found. Use with caution.';
    }

    if (reverseSearchResults.matchCount > 10) {
      const oldestSource = reverseSearchResults.sources[reverseSearchResults.sources.length - 1];
      return `LOW RISK: Image found on ${reverseSearchResults.matchCount} websites. Earliest source: ${oldestSource.source || oldestSource.domain}`;
    }

    if (!exifData.hasExif) {
      return 'CAUTION: No metadata found. Cannot verify authenticity.';
    }

    return 'Image appears authentic. Standard verification checks passed.';
  }

  /**
   * Batch verify multiple images
   * @param {array} imageUrls - Array of image URLs
   * @returns {array} Array of verification results
   */
  async verifyImages(imageUrls) {
    const results = [];
    
    for (const url of imageUrls) {
      try {
        const result = await this.verifyImage(url);
        results.push(result);
        
        // Rate limiting: wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          url,
          error: error.message,
          isManipulated: null
        });
      }
    }

    return results;
  }
}

// Singleton instance
const imageVerifier = new ImageVerifier();

module.exports = {
  ImageVerifier,
  imageVerifier,
  verifyImage: (url) => imageVerifier.verifyImage(url),
  verifyImages: (urls) => imageVerifier.verifyImages(urls)
};
