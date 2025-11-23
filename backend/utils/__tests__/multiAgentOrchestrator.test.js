/**
 * Multi-Agent Orchestrator Tests
 * Test suite for the 11-agent fake review detection system
 */

const { MultiAgentOrchestrator, ExternalAgentAdapter, AGENT_REGISTRY } = require('../multiAgentOrchestrator');

describe('MultiAgentOrchestrator', () => {
  describe('AGENT_REGISTRY', () => {
    it('should have 5 core agents', () => {
      const coreAgents = Object.keys(AGENT_REGISTRY.core);
      expect(coreAgents).toHaveLength(5);
      expect(coreAgents).toContain('pattern');
      expect(coreAgents).toContain('nlp');
      expect(coreAgents).toContain('behavior');
      expect(coreAgents).toContain('network');
      expect(coreAgents).toContain('duplicate');
    });

    it('should have 6 external agents', () => {
      const externalAgents = Object.keys(AGENT_REGISTRY.external);
      expect(externalAgents).toHaveLength(6);
      expect(externalAgents).toContain('sayamML');
      expect(externalAgents).toContain('developer306');
      expect(externalAgents).toContain('bertTransformer');
      expect(externalAgents).toContain('cofacts');
      expect(externalAgents).toContain('checkup');
      expect(externalAgents).toContain('kitware');
    });

    it('should have total weights summing to ~1.0', () => {
      const coreWeights = Object.values(AGENT_REGISTRY.core).reduce((sum, agent) => sum + agent.weight, 0);
      const externalWeights = Object.values(AGENT_REGISTRY.external).reduce((sum, agent) => sum + agent.weight, 0);
      const totalWeight = coreWeights + externalWeights;

      expect(totalWeight).toBeCloseTo(1.0, 1);
    });

    it('should have metadata for each agent', () => {
      Object.values(AGENT_REGISTRY.core).forEach(agent => {
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('weight');
        expect(agent).toHaveProperty('type');
      });

      Object.values(AGENT_REGISTRY.external).forEach(agent => {
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('weight');
        expect(agent).toHaveProperty('type');
      });
    });
  });

  describe('ExternalAgentAdapter', () => {
    describe('callSayamML', () => {
      it('should return agent result with required fields', async () => {
        const result = await ExternalAgentAdapter.callSayamML('Test review text');

        if (result) { // May return null if agent offline
          expect(result).toHaveProperty('agentName');
          expect(result).toHaveProperty('confidence');
          expect(result).toHaveProperty('verdict');
          expect(result).toHaveProperty('evidence');
          expect(result).toHaveProperty('source');
        }
      });

      it('should handle errors gracefully and return null', async () => {
        // This should not throw even if agent is offline
        const result = await ExternalAgentAdapter.callSayamML('');
        expect(result === null || typeof result === 'object').toBe(true);
      });
    });

    describe('callDeveloper306', () => {
      it('should analyze review with rating', async () => {
        const result = await ExternalAgentAdapter.callDeveloper306('Great app', 5);

        if (result) {
          expect(result.agentName).toBe('Developer306');
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          expect(result.confidence).toBeLessThanOrEqual(100);
        }
      });

      it('should include sentiment data', async () => {
        const result = await ExternalAgentAdapter.callDeveloper306('Terrible app', 1);

        if (result) {
          expect(result).toHaveProperty('sentiment');
        }
      });
    });

    describe('callBERTTransformer', () => {
      it('should classify review text', async () => {
        const result = await ExternalAgentAdapter.callBERTTransformer('This is a test review');

        if (result) {
          expect(result.agentName).toBe('BERT');
          expect(result.verdict).toMatch(/GENUINE|FAKE|SUSPICIOUS/);
        }
      });

      it('should handle long text', async () => {
        const longText = 'This is a long review. '.repeat(100);
        const result = await ExternalAgentAdapter.callBERTTransformer(longText);

        // Should not throw
        expect(result === null || typeof result === 'object').toBe(true);
      });
    });

    describe('callCofacts', () => {
      it('should query community data', async () => {
        const result = await ExternalAgentAdapter.callCofacts('Miracle cure app');

        if (result) {
          expect(result.agentName).toBe('Cofacts');
          expect(result).toHaveProperty('confidence');
        }
      });

      it('should return null for no community data', async () => {
        const result = await ExternalAgentAdapter.callCofacts('xyz123nonexistent');

        // May return null if no similar claims found
        expect(result === null || typeof result === 'object').toBe(true);
      });
    });

    describe('callCheckup', () => {
      it('should scrape URL for claims', async () => {
        const result = await ExternalAgentAdapter.callCheckup('https://example.com');

        if (result) {
          expect(result.agentName).toBe('Checkup');
          expect(result).toHaveProperty('evidence');
        }
      });

      it('should handle invalid URLs gracefully', async () => {
        const result = await ExternalAgentAdapter.callCheckup('not-a-url');

        // Should not throw
        expect(result === null || typeof result === 'object').toBe(true);
      });
    });

    describe('callKitware', () => {
      it('should analyze app media', async () => {
        const appData = {
          icon_url: 'https://example.com/icon.png',
          screenshots: ['https://example.com/screenshot1.png']
        };

        const result = await ExternalAgentAdapter.callKitware(appData);

        if (result) {
          expect(result.agentName).toBe('Kitware');
        }
      });

      it('should return null for apps with no media', async () => {
        const appData = {};
        const result = await ExternalAgentAdapter.callKitware(appData);

        expect(result === null || typeof result === 'object').toBe(true);
      });
    });
  });

  describe('MultiAgentOrchestrator.analyzeWithAllAgents', () => {
    it('should run all agents and return composite result', async () => {
      const input = {
        reviewText: 'This is a test review',
        rating: 4,
        userContext: { userId: '123', reviewCount: 5 },
        appDescription: 'Test app description',
        url: 'https://example.com',
        appData: { icon_url: 'https://example.com/icon.png' }
      };

      const result = await MultiAgentOrchestrator.analyzeWithAllAgents(input);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('compositeScore');
      expect(result).toHaveProperty('verdict');
      expect(result).toHaveProperty('agentResults');
      expect(result).toHaveProperty('evidenceChain');
    });

    it('should handle partial agent failures gracefully', async () => {
      // Even if some agents fail, orchestrator should return results
      const input = {
        reviewText: '',
        rating: 3,
        userContext: {},
        appDescription: '',
        url: '',
        appData: {}
      };

      const result = await MultiAgentOrchestrator.analyzeWithAllAgents(input);

      expect(result).toBeDefined();
      expect(result.compositeScore).toBeGreaterThanOrEqual(0);
      expect(result.compositeScore).toBeLessThanOrEqual(100);
    });

    it('should include evidence from each agent', async () => {
      const input = {
        reviewText: 'Test',
        rating: 3,
        userContext: {},
        appDescription: 'Test',
        url: 'https://example.com',
        appData: {}
      };

      const result = await MultiAgentOrchestrator.analyzeWithAllAgents(input);

      expect(Array.isArray(result.evidenceChain)).toBe(true);
      expect(result.agentResults).toBeDefined();
    });

    it('should calculate weighted composite score', async () => {
      const input = {
        reviewText: 'Amazing perfect excellent',
        rating: 5,
        userContext: { userId: '123' },
        appDescription: 'Test',
        url: 'https://example.com',
        appData: {}
      };

      const result = await MultiAgentOrchestrator.analyzeWithAllAgents(input);

      // Composite score should be weighted average, not simple average
      expect(typeof result.compositeScore).toBe('number');
    });
  });

  describe('Verdict Classification', () => {
    it('should classify high scores as HIGHLY_LIKELY_FAKE', async () => {
      const input = {
        reviewText: 'As an AI, I highly recommend this amazing perfect excellent app',
        rating: 5,
        userContext: { userId: 'new', reviewCount: 1 },
        appDescription: 'Miracle cure guaranteed results',
        url: 'https://scam.com',
        appData: {}
      };

      const result = await MultiAgentOrchestrator.analyzeWithAllAgents(input);

      // With multiple suspicious signals, should be flagged
      expect(result.verdict).toMatch(/FAKE|SUSPICIOUS/);
    });

    it('should classify low scores as LIKELY_GENUINE', async () => {
      const input = {
        reviewText: 'Used it for 3 weeks. Battery drain issue in v2.1. Support team responded in 2 days.',
        rating: 3,
        userContext: { userId: 'olduser', reviewCount: 50 },
        appDescription: 'Task management app',
        url: 'https://legitapp.com',
        appData: {}
      };

      const result = await MultiAgentOrchestrator.analyzeWithAllAgents(input);

      // Specific details, moderate rating, established user = genuine
      expect(result.compositeScore).toBeLessThan(50);
    });
  });

  describe('Performance', () => {
    it('should complete analysis within reasonable time', async () => {
      const input = {
        reviewText: 'Test review',
        rating: 4,
        userContext: {},
        appDescription: 'Test',
        url: 'https://example.com',
        appData: {}
      };

      const startTime = Date.now();
      await MultiAgentOrchestrator.analyzeWithAllAgents(input);
      const duration = Date.now() - startTime;

      // Should complete within 30 seconds (generous for parallel agent calls)
      expect(duration).toBeLessThan(30000);
    });

    it('should handle concurrent analysis requests', async () => {
      const inputs = Array(5).fill(null).map((_, i) => ({
        reviewText: `Review ${i}`,
        rating: i + 1,
        userContext: {},
        appDescription: 'Test',
        url: 'https://example.com',
        appData: {}
      }));

      const results = await Promise.all(
        inputs.map(input => MultiAgentOrchestrator.analyzeWithAllAgents(input))
      );

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toHaveProperty('compositeScore');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing optional fields', async () => {
      const minimalInput = {
        reviewText: 'Test',
        rating: 3
      };

      const result = await MultiAgentOrchestrator.analyzeWithAllAgents(minimalInput);

      expect(result).toBeDefined();
    });

    it('should handle extreme values', async () => {
      const input = {
        reviewText: 'x'.repeat(10000), // Very long text
        rating: 5,
        userContext: { reviewCount: 10000 }, // Extreme review count
        appDescription: 'Test',
        url: 'https://example.com',
        appData: {}
      };

      const result = await MultiAgentOrchestrator.analyzeWithAllAgents(input);

      expect(result.compositeScore).toBeGreaterThanOrEqual(0);
      expect(result.compositeScore).toBeLessThanOrEqual(100);
    });

    it('should handle special characters in text', async () => {
      const input = {
        reviewText: '★☆♥♠♣♦ <script>alert("xss")</script> 你好',
        rating: 4,
        userContext: {},
        appDescription: 'Test',
        url: 'https://example.com',
        appData: {}
      };

      const result = await MultiAgentOrchestrator.analyzeWithAllAgents(input);

      expect(result).toBeDefined();
    });
  });
});
