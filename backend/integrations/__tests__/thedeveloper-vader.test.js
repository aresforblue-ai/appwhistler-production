/**
 * Developer306 VADER Sentiment Integration Tests
 * Test suite for sentiment-rating mismatch detection
 */

const { analyzeReview, analyzeSentiment, detectMismatch } = require('../thedeveloper-vader');

describe('Developer306 VADER Integration', () => {
  describe('analyzeReview', () => {
    it('should detect sentiment-rating mismatch (negative text, high rating)', async () => {
      const reviewText = 'This app is terrible and crashes constantly. Worst experience ever.';
      const rating = 5;

      const result = await analyzeReview(reviewText, rating);

      expect(result).toBeDefined();
      expect(result.fakeScore).toBeGreaterThan(60);
      expect(result.verdict).toBe('LIKELY_FAKE');
      expect(result.sentimentMismatch.mismatch).toBe(true);
    });

    it('should detect sentiment-rating mismatch (positive text, low rating)', async () => {
      const reviewText = 'Amazing app! Works perfectly and the interface is beautiful.';
      const rating = 1;

      const result = await analyzeReview(reviewText, rating);

      expect(result.fakeScore).toBeGreaterThan(60);
      expect(result.sentimentMismatch.mismatch).toBe(true);
    });

    it('should classify matching sentiment-rating as genuine', async () => {
      const reviewText = 'Good app with nice features. Works as expected.';
      const rating = 4;

      const result = await analyzeReview(reviewText, rating);

      expect(result.fakeScore).toBeLessThan(50);
      expect(result.sentimentMismatch.mismatch).toBe(false);
    });

    it('should handle neutral sentiment', async () => {
      const reviewText = 'The app exists. It opens and closes.';
      const rating = 3;

      const result = await analyzeReview(reviewText, rating);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect excessive caps usage', async () => {
      const reviewText = 'THIS IS THE BEST APP EVER!!!';
      const rating = 5;

      const result = await analyzeReview(reviewText, rating);

      expect(result.capsRatio).toBeGreaterThan(0.5);
      expect(result.redFlags.some(f => f.category === 'Excessive Caps')).toBe(true);
    });

    it('should detect excessive exclamation marks', async () => {
      const reviewText = 'Amazing!!!! Great!!!! Perfect!!!!';
      const rating = 5;

      const result = await analyzeReview(reviewText, rating);

      expect(result.exclamationRatio).toBeGreaterThan(0.15);
      expect(result.redFlags.some(f => f.category === 'Excessive Exclamation')).toBe(true);
    });

    it('should handle reviews with emojis', async () => {
      const reviewText = '😀 Great app! 👍 Love it! ❤️';
      const rating = 5;

      const result = await analyzeReview(reviewText, rating);

      expect(result).toBeDefined();
    });

    it('should validate rating bounds', async () => {
      const reviewText = 'Good app';

      expect(() => analyzeReview(reviewText, 6)).toThrow();
      expect(() => analyzeReview(reviewText, 0)).toThrow();
      expect(() => analyzeReview(reviewText, -1)).toThrow();
    });
  });

  describe('analyzeSentiment', () => {
    it('should detect positive sentiment', () => {
      const sentiment = analyzeSentiment('I love this app! It\'s amazing and works perfectly.');

      expect(sentiment.compound).toBeGreaterThan(0.5);
      expect(sentiment.positive).toBeGreaterThan(0);
    });

    it('should detect negative sentiment', () => {
      const sentiment = analyzeSentiment('Terrible app. Crashes constantly. Waste of money.');

      expect(sentiment.compound).toBeLessThan(-0.5);
      expect(sentiment.negative).toBeGreaterThan(0);
    });

    it('should detect neutral sentiment', () => {
      const sentiment = analyzeSentiment('The app has a blue button.');

      expect(Math.abs(sentiment.compound)).toBeLessThan(0.3);
    });

    it('should handle empty text', () => {
      const sentiment = analyzeSentiment('');

      expect(sentiment.compound).toBe(0);
      expect(sentiment.positive).toBe(0);
      expect(sentiment.negative).toBe(0);
      expect(sentiment.neutral).toBe(0);
    });
  });

  describe('detectMismatch', () => {
    it('should detect high rating with negative sentiment', () => {
      const reviewText = 'Horrible terrible awful app';
      const rating = 5;

      const mismatch = detectMismatch(reviewText, rating);

      expect(mismatch.mismatch).toBe(true);
      expect(mismatch.expected).toBe('POSITIVE');
      expect(mismatch.actual).toBe('NEGATIVE');
    });

    it('should detect low rating with positive sentiment', () => {
      const reviewText = 'Amazing wonderful excellent app';
      const rating = 1;

      const mismatch = detectMismatch(reviewText, rating);

      expect(mismatch.mismatch).toBe(true);
      expect(mismatch.expected).toBe('NEGATIVE');
      expect(mismatch.actual).toBe('POSITIVE');
    });

    it('should not flag matching sentiment and rating', () => {
      const reviewText = 'Great app works well';
      const rating = 4;

      const mismatch = detectMismatch(reviewText, rating);

      expect(mismatch.mismatch).toBe(false);
    });

    it('should calculate severity score', () => {
      const reviewText = 'Terrible awful horrible';
      const rating = 5;

      const mismatch = detectMismatch(reviewText, rating);

      expect(mismatch.severity).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long reviews', async () => {
      const longReview = 'This app is good. '.repeat(500);
      const result = await analyzeReview(longReview, 4);

      expect(result).toBeDefined();
    });

    it('should handle reviews with only punctuation', async () => {
      const result = await analyzeReview('!!! ??? ...', 3);

      expect(result).toBeDefined();
    });

    it('should handle mixed language reviews', async () => {
      const result = await analyzeReview('Good app 很好 très bien', 4);

      expect(result).toBeDefined();
    });

    it('should handle sarcastic reviews', async () => {
      // Note: Sentiment analysis struggles with sarcasm - this is a known limitation
      const result = await analyzeReview('Oh yeah, this app is just wonderful </sarcasm>', 1);

      expect(result).toBeDefined();
    });
  });

  describe('Red Flags Generation', () => {
    it('should generate appropriate red flags for suspicious reviews', async () => {
      const result = await analyzeReview('TERRIBLE APP!!!', 5);

      expect(result.redFlags).toBeDefined();
      expect(result.redFlags.length).toBeGreaterThan(0);
      expect(result.redFlags.every(f => f.hasOwnProperty('category'))).toBe(true);
      expect(result.redFlags.every(f => f.hasOwnProperty('severity'))).toBe(true);
      expect(result.redFlags.every(f => f.hasOwnProperty('description'))).toBe(true);
    });

    it('should include mismatch in red flags when detected', async () => {
      const result = await analyzeReview('Horrible terrible awful', 5);

      expect(result.redFlags.some(f => f.category === 'Sentiment Mismatch')).toBe(true);
    });
  });
});
