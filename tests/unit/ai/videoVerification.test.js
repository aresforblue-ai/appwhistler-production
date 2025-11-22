// tests/unit/ai/videoVerification.test.js
// Comprehensive tests for video verification agent with fixes applied

const videoVerificationAgent = require('../../../backend/agents/videoVerificationAgent');

describe('Video Verification Agent', () => {
  beforeAll(async () => {
    await videoVerificationAgent.initialize();
  });

  afterAll(async () => {
    await videoVerificationAgent.shutdown();
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      expect(videoVerificationAgent.initialized).toBe(true);
      expect(videoVerificationAgent.name).toBe('VideoVerificationAgent');
    });
  });

  describe('YouTube URL Extraction', () => {
    // Fix 2: Test all YouTube URL patterns including embed URLs
    test('should extract video ID from standard watch URL', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const videoId = videoVerificationAgent.extractYouTubeId(url);
      expect(videoId).toBe('dQw4w9WgXcQ');
    });

    test('should extract video ID from short URL', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ';
      const videoId = videoVerificationAgent.extractYouTubeId(url);
      expect(videoId).toBe('dQw4w9WgXcQ');
    });

    test('should extract video ID from embed URL', () => {
      // Fix 2: This test now passes with the corrected regex
      const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
      const videoId = videoVerificationAgent.extractYouTubeId(url);
      expect(videoId).toBe('dQw4w9WgXcQ');
    });

    test('should return null for non-YouTube URLs', () => {
      const url = 'https://vimeo.com/123456';
      const videoId = videoVerificationAgent.extractYouTubeId(url);
      expect(videoId).toBeNull();
    });
  });

  describe('Language Detection', () => {
    // Fix 3: Improved language detection with proper heuristics
    test('should detect English correctly', () => {
      const transcript = 'This is a sample English transcript with common words like the and is and are';
      const result = videoVerificationAgent.detectLanguage(transcript);

      expect(result.detected).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    test('should detect Spanish correctly', () => {
      const transcript = 'Este es un ejemplo de transcripción en español con palabras como el y la y es';
      const result = videoVerificationAgent.detectLanguage(transcript);

      // Fix 3: With improved heuristics, Spanish should be detected
      expect(result.detected).toBe('es');
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    test('should detect French correctly', () => {
      const transcript = 'Ceci est un exemple de transcription en français avec des mots comme le et la et est';
      const result = videoVerificationAgent.detectLanguage(transcript);

      expect(result.detected).toBe('fr');
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    test('should return unknown for very short text', () => {
      const transcript = 'Hi';
      const result = videoVerificationAgent.detectLanguage(transcript);

      expect(result.detected).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    test('should return unknown for empty transcript', () => {
      const transcript = '';
      const result = videoVerificationAgent.detectLanguage(transcript);

      expect(result.detected).toBe('unknown');
      expect(result.confidence).toBe(0);
    });
  });

  describe('Verification Score Calculation', () => {
    // Fix 1: Use toBeCloseTo for floating-point comparisons
    test('should calculate perfect score for clean video', () => {
      const checks = {
        metadataAnalysis: { suspicious: false },
        deepfakeCheck: { isDeepfake: false, confidence: 0.9 },
        audioAnalysis: { isManipulated: false, confidence: 0.85 },
        languageDetection: { confidence: 0.8 },
      };

      const score = videoVerificationAgent.calculateVerificationScore(checks);

      // Fix 1: Use toBeCloseTo instead of toBe for floating-point comparison
      expect(score).toBeCloseTo(1.05, 2); // 1.0 + 0.05 boost
      expect(score).toBeLessThanOrEqual(1.0); // Should be capped at 1.0
    });

    test('should deduct score for suspicious metadata', () => {
      const checks = {
        metadataAnalysis: { suspicious: true },
        deepfakeCheck: { isDeepfake: false, confidence: 0.9 },
        audioAnalysis: { isManipulated: false, confidence: 0.85 },
        languageDetection: { confidence: 0.8 },
      };

      const score = videoVerificationAgent.calculateVerificationScore(checks);

      // Fix 1: Proper floating-point comparison
      expect(score).toBeCloseTo(0.85, 2); // 1.05 - 0.2
    });

    test('should deduct score for deepfake detection', () => {
      const checks = {
        metadataAnalysis: { suspicious: false },
        deepfakeCheck: { isDeepfake: true, confidence: 0.9 },
        audioAnalysis: { isManipulated: false, confidence: 0.85 },
        languageDetection: { confidence: 0.8 },
      };

      const score = videoVerificationAgent.calculateVerificationScore(checks);

      // Fix 1: Use toBeCloseTo for precision
      expect(score).toBeCloseTo(0.69, 2); // 1.05 - (0.4 * 0.9)
    });

    test('should handle multiple issues correctly', () => {
      const checks = {
        metadataAnalysis: { suspicious: true },
        deepfakeCheck: { isDeepfake: true, confidence: 0.8 },
        audioAnalysis: { isManipulated: true, confidence: 0.7 },
        languageDetection: { confidence: 0.3 },
      };

      const score = videoVerificationAgent.calculateVerificationScore(checks);

      // Fix 1: Floating-point precision handled correctly
      // 1.0 - 0.2 (metadata) - 0.32 (deepfake) - 0.21 (audio) = 0.27
      expect(score).toBeCloseTo(0.27, 2);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    test('should never return score below 0', () => {
      const checks = {
        metadataAnalysis: { suspicious: true },
        deepfakeCheck: { isDeepfake: true, confidence: 1.0 },
        audioAnalysis: { isManipulated: true, confidence: 1.0 },
        languageDetection: { confidence: 0 },
      };

      const score = videoVerificationAgent.calculateVerificationScore(checks);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('Video Verification Process', () => {
    test('should verify authentic video', async () => {
      const videoData = {
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        metadata: {
          duration: 213,
          uploadDate: '2009-10-25',
          createdDate: '2009-10-24',
        },
      };

      const result = await videoVerificationAgent.process(videoData);

      expect(result).toHaveProperty('isAuthentic');
      expect(result).toHaveProperty('verificationScore');
      expect(result).toHaveProperty('videoId');
      expect(result.videoId).toBe('dQw4w9WgXcQ');
    });

    test('should detect suspicious video', async () => {
      const videoData = {
        videoUrl: 'https://www.youtube.com/watch?v=suspicious123',
        metadata: {
          uploadDate: '2020-01-01',
          createdDate: '2020-01-05', // Created after upload - suspicious!
        },
      };

      const result = await videoVerificationAgent.process(videoData);

      expect(result.checks.metadata.suspicious).toBe(true);
      expect(result.checks.metadata.findings).toContain('timestamp_inconsistency');
    });

    test('should handle video with transcript', async () => {
      const videoData = {
        videoUrl: 'https://www.youtube.com/watch?v=test123',
        metadata: {
          transcript: 'This is an English transcript with many common words',
          duration: 120,
        },
      };

      const result = await videoVerificationAgent.process(videoData);

      expect(result.checks.language.detected).toBe('en');
      expect(result.checks.language.confidence).toBeGreaterThan(0);
    });

    test('should throw error for missing video URL', async () => {
      const videoData = {
        metadata: {},
      };

      await expect(videoVerificationAgent.process(videoData)).rejects.toThrow('No video URL provided');
    });
  });

  describe('Metadata Analysis', () => {
    test('should flag missing critical metadata', () => {
      const metadata = {
        title: 'Test Video',
      };

      const result = videoVerificationAgent.analyzeMetadata(metadata);

      expect(result.suspicious).toBe(true);
      expect(result.findings).toContain('missing_critical_metadata');
    });

    test('should detect edited videos', () => {
      const metadata = {
        duration: 120,
        uploadDate: '2024-01-01',
        editedWith: 'Adobe Premiere',
      };

      const result = videoVerificationAgent.analyzeMetadata(metadata);

      expect(result.findings).toContain('video_edited');
    });

    test('should pass clean metadata', () => {
      const metadata = {
        duration: 120,
        uploadDate: '2024-01-02',
        createdDate: '2024-01-01',
      };

      const result = videoVerificationAgent.analyzeMetadata(metadata);

      expect(result.suspicious).toBe(false);
      expect(result.findings.length).toBeLessThan(2);
    });
  });

  describe('Recommendations', () => {
    test('should recommend verified_authentic for high scores', () => {
      const recommendation = videoVerificationAgent.getRecommendation(0.9);
      expect(recommendation).toBe('verified_authentic');
    });

    test('should recommend likely_authentic for good scores', () => {
      const recommendation = videoVerificationAgent.getRecommendation(0.7);
      expect(recommendation).toBe('likely_authentic');
    });

    test('should recommend manual review for medium scores', () => {
      const recommendation = videoVerificationAgent.getRecommendation(0.5);
      expect(recommendation).toBe('requires_manual_review');
    });

    test('should recommend likely_manipulated for low scores', () => {
      const recommendation = videoVerificationAgent.getRecommendation(0.3);
      expect(recommendation).toBe('likely_manipulated');
    });
  });

  describe('Performance', () => {
    test('should track usage statistics', async () => {
      const initialCount = videoVerificationAgent.totalProcessed;

      const videoData = {
        videoUrl: 'https://www.youtube.com/watch?v=test123',
        metadata: {},
      };

      await videoVerificationAgent.process(videoData);

      expect(videoVerificationAgent.totalProcessed).toBe(initialCount + 1);
      expect(videoVerificationAgent.lastUsed).toBeDefined();
    });
  });
});
