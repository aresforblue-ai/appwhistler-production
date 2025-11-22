// backend/agents/videoVerificationAgent.js
// AI agent for video verification, deepfake detection, and metadata analysis

class VideoVerificationAgent {
  constructor() {
    this.name = 'VideoVerificationAgent';
    this.version = '1.0.0';
    this.initialized = false;
    this.totalProcessed = 0;
    this.lastUsed = null;

    // YouTube URL patterns (Fix 2: Include embed URLs)
    this.youtubePatterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    ];

    // Language detection patterns (Fix 3: Improved heuristics)
    this.languagePatterns = {
      en: /\b(the|and|is|are|was|were|have|has|do|does|can|will|would|should)\b/gi,
      es: /\b(el|la|los|las|de|en|es|son|está|están|tiene|tienen)\b/gi,
      fr: /\b(le|la|les|de|du|des|est|sont|avoir|être)\b/gi,
      de: /\b(der|die|das|den|dem|des|ist|sind|haben|sein)\b/gi,
      zh: /[\u4e00-\u9fa5]/g,
      ja: /[\u3040-\u309f\u30a0-\u30ff]/g,
      ar: /[\u0600-\u06ff]/g,
      ru: /[\u0400-\u04ff]/g,
    };
  }

  async initialize() {
    console.log(`🤖 Initializing ${this.name}...`);
    this.initialized = true;
    return { status: 'ready', agent: this.name };
  }

  /**
   * Verify video authenticity
   * @param {Object} videoData - Video URL or metadata
   * @param {Object} options - Verification options
   * @returns {Object} Video verification result
   */
  async process(videoData, options = {}) {
    const { videoUrl, metadata = {}, checkDeepfake = true, analyzeAudio = true } = videoData;

    if (!videoUrl) {
      throw new Error('No video URL provided');
    }

    // Extract video ID if YouTube URL
    const videoId = this.extractYouTubeId(videoUrl);

    // Perform verification checks
    const metadataAnalysis = this.analyzeMetadata(metadata);
    const deepfakeCheck = checkDeepfake ? await this.checkDeepfake(videoUrl) : null;
    const audioAnalysis = analyzeAudio ? await this.analyzeAudio(videoUrl) : null;
    const languageDetection = this.detectLanguage(metadata.transcript || '');

    // Calculate verification score (Fix 1: Use proper precision)
    const verificationScore = this.calculateVerificationScore({
      metadataAnalysis,
      deepfakeCheck,
      audioAnalysis,
      languageDetection,
    });

    const isAuthentic = verificationScore >= 0.7;
    const isSuspicious = verificationScore < 0.4;

    this.totalProcessed++;
    this.lastUsed = new Date().toISOString();

    return {
      isAuthentic,
      isSuspicious,
      verificationScore,
      videoId,
      checks: {
        metadata: metadataAnalysis,
        deepfake: deepfakeCheck,
        audio: audioAnalysis,
        language: languageDetection,
      },
      warnings: this.generateWarnings(metadataAnalysis, deepfakeCheck, audioAnalysis),
      recommendation: this.getRecommendation(verificationScore),
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Extract YouTube video ID from URL (Fix 2: Handle embed URLs)
   */
  extractYouTubeId(url) {
    for (const pattern of this.youtubePatterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * Analyze video metadata
   */
  analyzeMetadata(metadata) {
    const analysis = {
      hasMetadata: Object.keys(metadata).length > 0,
      suspicious: false,
      findings: [],
    };

    // Check for missing critical metadata
    if (!metadata.duration && !metadata.uploadDate) {
      analysis.findings.push('missing_critical_metadata');
      analysis.suspicious = true;
    }

    // Check for metadata tampering
    if (metadata.editedWith) {
      analysis.findings.push('video_edited');
    }

    // Check upload date consistency
    if (metadata.uploadDate && metadata.createdDate) {
      const uploadTime = new Date(metadata.uploadDate).getTime();
      const createTime = new Date(metadata.createdDate).getTime();

      if (uploadTime < createTime) {
        analysis.findings.push('timestamp_inconsistency');
        analysis.suspicious = true;
      }
    }

    return analysis;
  }

  /**
   * Check for deepfake indicators
   */
  async checkDeepfake(videoUrl) {
    // In production, use deepfake detection ML models
    // For now, simulate the check

    const deepfakeScore = Math.random() * 0.3; // Simulate low deepfake probability

    return {
      isDeepfake: deepfakeScore > 0.7,
      confidence: 0.82,
      deepfakeScore,
      indicators: deepfakeScore > 0.7 ? ['facial_inconsistency', 'audio_mismatch'] : [],
    };
  }

  /**
   * Analyze audio track
   */
  async analyzeAudio(videoUrl) {
    // In production, analyze audio for manipulation, voice cloning, etc.
    // For now, simulate the check

    const audioScore = Math.random() * 0.2; // Simulate low manipulation probability

    return {
      isManipulated: audioScore > 0.6,
      confidence: 0.78,
      manipulationScore: audioScore,
      indicators: audioScore > 0.6 ? ['voice_cloning', 'audio_splicing'] : [],
    };
  }

  /**
   * Detect language from transcript (Fix 3: Improved language detection)
   */
  detectLanguage(transcript) {
    if (!transcript || transcript.length < 10) {
      return {
        detected: 'unknown',
        confidence: 0,
        scores: {},
      };
    }

    const scores = {};
    const lowerTranscript = transcript.toLowerCase();

    // Count matches for each language
    for (const [lang, pattern] of Object.entries(this.languagePatterns)) {
      const matches = (lowerTranscript.match(pattern) || []).length;
      const totalWords = lowerTranscript.split(/\s+/).length;

      // Calculate score based on match density
      // Fix 3: Proper calculation considering text length
      scores[lang] = totalWords > 0 ? matches / totalWords : 0;
    }

    // Find language with highest score
    let detectedLang = 'unknown';
    let maxScore = 0;

    for (const [lang, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedLang = lang;
      }
    }

    // Only consider detection valid if confidence is high enough
    const confidence = maxScore > 0.1 ? Math.min(maxScore * 5, 1) : 0;

    return {
      detected: confidence > 0.3 ? detectedLang : 'unknown',
      confidence,
      scores,
    };
  }

  /**
   * Calculate overall verification score (Fix 1: Proper floating-point handling)
   */
  calculateVerificationScore(checks) {
    let score = 1.0;

    // Deduct for suspicious metadata
    if (checks.metadataAnalysis.suspicious) {
      score -= 0.2;
    }

    // Deduct for deepfake
    if (checks.deepfakeCheck && checks.deepfakeCheck.isDeepfake) {
      score -= 0.4 * checks.deepfakeCheck.confidence;
    }

    // Deduct for audio manipulation
    if (checks.audioAnalysis && checks.audioAnalysis.isManipulated) {
      score -= 0.3 * checks.audioAnalysis.confidence;
    }

    // Boost for successful language detection
    if (checks.languageDetection.confidence > 0.5) {
      score += 0.05;
    }

    // Return with proper precision (round to 4 decimal places)
    return Math.round(Math.max(0, Math.min(1, score)) * 10000) / 10000;
  }

  /**
   * Generate warnings
   */
  generateWarnings(metadata, deepfake, audio) {
    const warnings = [];

    if (metadata.suspicious) {
      warnings.push('Suspicious or inconsistent metadata detected');
    }

    if (deepfake && deepfake.isDeepfake) {
      warnings.push('Possible deepfake or AI-generated content');
    }

    if (audio && audio.isManipulated) {
      warnings.push('Audio track shows signs of manipulation');
    }

    return warnings;
  }

  /**
   * Get recommendation based on score
   */
  getRecommendation(score) {
    if (score >= 0.85) return 'verified_authentic';
    if (score >= 0.65) return 'likely_authentic';
    if (score >= 0.40) return 'requires_manual_review';
    return 'likely_manipulated';
  }

  async shutdown() {
    console.log(`🛑 Shutting down ${this.name}...`);
    this.initialized = false;
  }
}

module.exports = new VideoVerificationAgent();
