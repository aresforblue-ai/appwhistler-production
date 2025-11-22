// backend/agents/__tests__/agents.test.js
// Comprehensive test suite for all 20 AI agents

const {
  agents,
  initializeAgents,
  shutdownAgents,
  getAgentStatus,
  processWithAgent,
} = require('../index');

describe('Agent System', () => {
  beforeAll(async () => {
    await initializeAgents();
  });

  afterAll(async () => {
    await shutdownAgents();
  });

  describe('Agent Registry', () => {
    test('should have all 20 agents registered', () => {
      expect(Object.keys(agents)).toHaveLength(20);
    });

    test('should have correct agent names', () => {
      const expectedAgents = [
        'contentModeration',
        'factChecking',
        'sentimentAnalysis',
        'spamDetection',
        'truthRating',
        'securityScanning',
        'privacyAnalysis',
        'recommendation',
        'behaviorAnalysis',
        'trendingDetection',
        'reviewAuthenticity',
        'imageVerification',
        'sourceCredibility',
        'claimExtraction',
        'newsClassification',
        'entityRecognition',
        'misinformationDetection',
        'biasDetection',
        'citationVerification',
        'realtimeMonitoring',
      ];

      expectedAgents.forEach(agentName => {
        expect(agents[agentName]).toBeDefined();
      });
    });
  });

  describe('Content Moderation Agent', () => {
    test('should detect hate speech', async () => {
      const result = await processWithAgent('contentModeration', 'This contains hate speech');
      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty('safe');
    });

    test('should allow safe content', async () => {
      const result = await processWithAgent('contentModeration', 'This is a normal message');
      expect(result.success).toBe(true);
      expect(result.result.safe).toBe(true);
    });
  });

  describe('Fact-Checking Agent', () => {
    test('should fact-check claims', async () => {
      const result = await processWithAgent('factChecking', 'The Earth is round');
      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty('verdict');
      expect(result.result).toHaveProperty('confidence');
    });

    test('should extract entities from claims', async () => {
      const result = await processWithAgent('factChecking', 'NASA announced new Mars mission');
      expect(result.success).toBe(true);
      expect(result.result.entities).toBeDefined();
    });
  });

  describe('Sentiment Analysis Agent', () => {
    test('should detect positive sentiment', async () => {
      const result = await processWithAgent('sentimentAnalysis', 'This is amazing and wonderful!');
      expect(result.success).toBe(true);
      expect(result.result.sentiment).toBe('positive');
    });

    test('should detect negative sentiment', async () => {
      const result = await processWithAgent('sentimentAnalysis', 'This is terrible and awful');
      expect(result.success).toBe(true);
      expect(result.result.sentiment).toBe('negative');
    });

    test('should detect neutral sentiment', async () => {
      const result = await processWithAgent('sentimentAnalysis', 'The sky is blue');
      expect(result.success).toBe(true);
      expect(result.result.sentiment).toBe('neutral');
    });
  });

  describe('Spam Detection Agent', () => {
    test('should detect spam patterns', async () => {
      const result = await processWithAgent('spamDetection', 'Click here now! Buy now! Limited time!');
      expect(result.success).toBe(true);
      expect(result.result.isSpam).toBe(true);
    });

    test('should allow legitimate messages', async () => {
      const result = await processWithAgent('spamDetection', 'Hello, how are you doing today?');
      expect(result.success).toBe(true);
      expect(result.result.isSpam).toBe(false);
    });
  });

  describe('Truth Rating Agent', () => {
    test('should calculate truth rating', async () => {
      const data = {
        factChecks: [{ verdict: 'true', confidenceScore: 0.9 }],
        sources: [{ credibilityLevel: 'high' }],
        upvotes: 100,
        downvotes: 10,
      };

      const result = await processWithAgent('truthRating', data);
      expect(result.success).toBe(true);
      expect(result.result.truthRating).toBeGreaterThan(0);
      expect(result.result.truthRating).toBeLessThanOrEqual(1);
    });
  });

  describe('Security Scanning Agent', () => {
    test('should detect SQL injection', async () => {
      const result = await processWithAgent('securityScanning', "SELECT * FROM users WHERE id = '1' OR '1'='1'");
      expect(result.success).toBe(true);
      expect(result.result.safe).toBe(false);
    });

    test('should detect XSS', async () => {
      const result = await processWithAgent('securityScanning', '<script>alert("XSS")</script>');
      expect(result.success).toBe(true);
      expect(result.result.safe).toBe(false);
    });
  });

  describe('Privacy Analysis Agent', () => {
    test('should analyze privacy policy', async () => {
      const data = {
        privacyPolicy: 'We collect your data and share with third parties',
        permissions: ['camera', 'location', 'contacts'],
      };

      const result = await processWithAgent('privacyAnalysis', data);
      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty('privacyScore');
      expect(result.result).toHaveProperty('grade');
    });
  });

  describe('Recommendation Agent', () => {
    test('should generate recommendations', async () => {
      const userProfile = {
        favoriteCategories: ['technology'],
      };

      const options = {
        availableApps: [
          { id: 1, category: 'technology', truthRating: 90, isVerified: true, downloadCount: 1000000 },
          { id: 2, category: 'social', truthRating: 70, isVerified: false, downloadCount: 500000 },
        ],
        limit: 5,
      };

      const result = await processWithAgent('recommendation', userProfile, options);
      expect(result.success).toBe(true);
      expect(result.result.recommendations).toBeDefined();
    });
  });

  describe('Behavior Analysis Agent', () => {
    test('should analyze user behavior', async () => {
      const userData = {
        actions: [
          { type: 'view', timestamp: new Date().toISOString() },
          { type: 'click', timestamp: new Date().toISOString() },
        ],
      };

      const result = await processWithAgent('behaviorAnalysis', userData);
      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty('engagement');
      expect(result.result).toHaveProperty('riskScore');
    });
  });

  describe('Trending Detection Agent', () => {
    test('should detect trending items', async () => {
      const items = [
        { id: 1, metrics: { views: 10000, growthRate24h: 2.5 }, createdAt: new Date() },
        { id: 2, metrics: { views: 1000, growthRate24h: 0.5 }, createdAt: new Date() },
      ];

      const result = await processWithAgent('trendingDetection', items);
      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty('trending');
    });
  });

  describe('Review Authenticity Agent', () => {
    test('should verify review authenticity', async () => {
      const review = {
        text: 'This is a detailed review with specific information about features and performance',
        rating: 4,
        createdAt: new Date().toISOString(),
      };

      const result = await processWithAgent('reviewAuthenticity', review);
      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty('isAuthentic');
      expect(result.result).toHaveProperty('authenticityScore');
    });
  });

  describe('Image Verification Agent', () => {
    test('should verify image', async () => {
      const imageData = {
        imageUrl: 'https://example.com/image.jpg',
        metadata: { dateTime: new Date().toISOString() },
      };

      const result = await processWithAgent('imageVerification', imageData);
      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty('isAuthentic');
      expect(result.result).toHaveProperty('verificationScore');
    });
  });

  describe('Source Credibility Agent', () => {
    test('should assess source credibility', async () => {
      const source = {
        url: 'https://reuters.com/article',
        author: 'John Doe',
        publishedAt: new Date().toISOString(),
      };

      const result = await processWithAgent('sourceCredibility', source);
      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty('credibilityScore');
      expect(result.result).toHaveProperty('credibilityLevel');
    });
  });

  describe('Claim Extraction Agent', () => {
    test('should extract claims from text', async () => {
      const text = 'The study found that 90% of users prefer this app. It has the best features.';

      const result = await processWithAgent('claimExtraction', text);
      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty('claims');
      expect(result.result.totalClaims).toBeGreaterThan(0);
    });
  });

  describe('News Classification Agent', () => {
    test('should classify news content', async () => {
      const content = {
        title: 'New AI Technology Breakthrough',
        body: 'Scientists have discovered a new AI algorithm that improves accuracy',
      };

      const result = await processWithAgent('newsClassification', content);
      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty('primaryCategory');
      expect(result.result).toHaveProperty('contentType');
    });
  });

  describe('Entity Recognition Agent', () => {
    test('should recognize entities', async () => {
      const text = 'John Smith works at Google in New York. The company announced 50% growth.';

      const result = await processWithAgent('entityRecognition', text);
      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty('entities');
      expect(result.result.totalEntities).toBeGreaterThan(0);
    });
  });

  describe('Misinformation Detection Agent', () => {
    test('should detect misinformation', async () => {
      const content = {
        text: 'Shocking! Doctors hate this one weird trick! Click here now!',
        title: 'You won\'t believe this!',
      };

      const result = await processWithAgent('misinformationDetection', content);
      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty('isMisinformation');
      expect(result.result).toHaveProperty('riskScore');
    });
  });

  describe('Bias Detection Agent', () => {
    test('should detect bias', async () => {
      const content = {
        text: 'This is absolutely terrible and completely outrageous!',
        title: 'Scandal!',
      };

      const result = await processWithAgent('biasDetection', content);
      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty('biasScore');
      expect(result.result).toHaveProperty('biasLevel');
    });
  });

  describe('Citation Verification Agent', () => {
    test('should verify citations', async () => {
      const citations = [
        {
          text: 'Research paper title',
          url: 'https://nature.com/article/123',
          author: 'Dr. Jane Smith',
          date: '2024-01-01',
        },
      ];

      const result = await processWithAgent('citationVerification', citations);
      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty('totalCitations');
      expect(result.result).toHaveProperty('verifiedCount');
    });
  });

  describe('Real-time Monitoring Agent', () => {
    test('should monitor events', async () => {
      const event = {
        type: 'content_published',
        data: { views: 1000, shares: 50 },
        timestamp: Date.now(),
      };

      const result = await processWithAgent('realtimeMonitoring', event);
      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty('analysis');
      expect(result.result).toHaveProperty('systemStatus');
    });
  });

  describe('Agent Status', () => {
    test('should get agent status', () => {
      const status = getAgentStatus();
      expect(status).toBeDefined();
      expect(Object.keys(status)).toHaveLength(20);

      Object.values(status).forEach(agentStatus => {
        expect(agentStatus).toHaveProperty('available');
        expect(agentStatus).toHaveProperty('version');
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid agent name', async () => {
      const result = await processWithAgent('nonexistentAgent', 'test data');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle invalid input', async () => {
      const result = await processWithAgent('contentModeration', null);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
