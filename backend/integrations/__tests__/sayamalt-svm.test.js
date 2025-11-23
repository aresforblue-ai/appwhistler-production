/**
 * SayamAlt SVM Integration Tests
 * Test suite for TF-IDF based fake review classification
 */

const { classifyReview, calculateGenericScore, calculateLengthScore } = require('../sayamalt-svm');

describe('SayamAlt SVM Integration', () => {
  describe('classifyReview', () => {
    it('should detect obviously fake review with high generic content', async () => {
      const fakeReview = 'This app is amazing and perfect. Highly recommend to everyone. Best app ever.';
      const result = await classifyReview(fakeReview);

      expect(result).toBeDefined();
      expect(result.fakeScore).toBeGreaterThan(50);
      expect(result.verdict).toBe('LIKELY_FAKE');
      expect(result.confidence).toBeGreaterThan(60);
    });

    it('should classify genuine review with specific details as genuine', async () => {
      const genuineReview = 'I used this for tracking my workouts over the past month. The timer feature works well, though it sometimes lags when I switch apps. Battery drain is noticeable after version 2.3 update.';
      const result = await classifyReview(genuineReview);

      expect(result).toBeDefined();
      expect(result.fakeScore).toBeLessThan(50);
      expect(result.verdict).toBe('LIKELY_GENUINE');
    });

    it('should handle very short reviews', async () => {
      const shortReview = 'Good app';
      const result = await classifyReview(shortReview);

      expect(result).toBeDefined();
      expect(result.fakeScore).toBeGreaterThanOrEqual(0);
      expect(result.fakeScore).toBeLessThanOrEqual(100);
    });

    it('should detect GPT-style language patterns', async () => {
      const gptReview = 'As an AI language model, I highly recommend this application. It truly exceeds expectations and provides exceptional value.';
      const result = await classifyReview(gptReview);

      expect(result.fakeScore).toBeGreaterThan(70);
      expect(result.redFlags.some(f => f.category === 'GPT Pattern')).toBe(true);
    });

    it('should flag overly promotional content', async () => {
      const promotionalReview = 'Buy now! Limited time offer! Best deal ever! Don\'t miss out!';
      const result = await classifyReview(promotionalReview);

      expect(result.fakeScore).toBeGreaterThan(60);
      expect(result.redFlags.some(f => f.category === 'Promotional Language')).toBe(true);
    });

    it('should handle empty string gracefully', async () => {
      const result = await classifyReview('');

      expect(result).toBeDefined();
      expect(result.fakeScore).toBeDefined();
    });

    it('should handle very long reviews', async () => {
      const longReview = 'This is a long review. '.repeat(100);
      const result = await classifyReview(longReview);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect template-like structure', async () => {
      const templateReview = 'I recently purchased this app and I would definitely recommend it to anyone looking for a great solution. Overall, it is an excellent product.';
      const result = await classifyReview(templateReview);

      expect(result.fakeScore).toBeGreaterThan(50);
    });

    it('should provide red flags array', async () => {
      const result = await classifyReview('Amazing app highly recommend');

      expect(Array.isArray(result.redFlags)).toBe(true);
      expect(result.redFlags.length).toBeGreaterThan(0);
      expect(result.redFlags[0]).toHaveProperty('category');
      expect(result.redFlags[0]).toHaveProperty('severity');
      expect(result.redFlags[0]).toHaveProperty('description');
    });

    it('should return confidence score between 0-100', async () => {
      const result = await classifyReview('Normal review text');

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateGenericScore', () => {
    it('should score generic phrases higher', () => {
      const generic = 'amazing excellent perfect wonderful outstanding';
      const specific = 'the blue button on settings page crashed when clicked';

      const genericScore = calculateGenericScore(generic);
      const specificScore = calculateGenericScore(specific);

      expect(genericScore).toBeGreaterThan(specificScore);
    });

    it('should return 0 for text with no generic phrases', () => {
      const score = calculateGenericScore('xyz123 nonexistent words');
      expect(score).toBe(0);
    });
  });

  describe('calculateLengthScore', () => {
    it('should penalize very short reviews', () => {
      const shortScore = calculateLengthScore('Good');
      const normalScore = calculateLengthScore('This is a reasonably detailed review with multiple sentences.');

      expect(shortScore).toBeGreaterThan(normalScore);
    });

    it('should return score between 0-100', () => {
      const score = calculateLengthScore('Medium length review');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters', async () => {
      const result = await classifyReview('★★★★★ @@@ ### $$$ !!!');
      expect(result).toBeDefined();
    });

    it('should handle unicode characters', async () => {
      const result = await classifyReview('Great app 你好 مرحبا здравствуй');
      expect(result).toBeDefined();
    });

    it('should handle HTML tags', async () => {
      const result = await classifyReview('<b>Bold text</b> <script>alert("xss")</script>');
      expect(result).toBeDefined();
    });

    it('should handle newlines and whitespace', async () => {
      const result = await classifyReview('  Line 1  \n\n  Line 2  \t\t Tab  ');
      expect(result).toBeDefined();
    });
  });
});
