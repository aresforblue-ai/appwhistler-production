jest.mock('@huggingface/inference', () => {
  const zeroShotClassification = jest.fn().mockResolvedValue({
    labels: ['true', 'false'],
    scores: [0.9, 0.1]
  });
  const textClassification = jest.fn().mockResolvedValue([
    { label: 'POSITIVE', score: 0.8 }
  ]);
  const imageClassification = jest.fn().mockResolvedValue([
    { label: 'document', score: 0.75 }
  ]);

  const HfInference = jest.fn().mockImplementation(() => ({
    zeroShotClassification,
    textClassification,
    imageClassification
  }));

  return { HfInference };
});

jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({ data: { claims: [] } })
}));

const factChecker = require('../../../src/ai/factChecker');

const { HfInference } = require('@huggingface/inference');

beforeEach(() => {
  factChecker.clearCache();
});

describe('factChecker', () => {
  test('verifyClaimComprehensive caches results', async () => {
    const hfClient = HfInference.mock.instances[0];

    await factChecker.verifyClaimComprehensive('Claim A', 'apps');
    await factChecker.verifyClaimComprehensive('Claim A', 'apps');

    expect(hfClient.zeroShotClassification).toHaveBeenCalledTimes(1);
    expect(hfClient.textClassification).toHaveBeenCalledTimes(1);
  });

  test('aggregateResults prefers external sources when available', () => {
    const combined = factChecker.aggregateResults(
      'claim',
      'general',
      { verdict: 'TRUE', confidence: 0.9 },
      [
        { verdict: 'FALSE', url: 'https://example.com', publisher: 'Example', source: 'Google Fact Check' },
        { verdict: 'FALSE', url: 'https://example.org', publisher: 'Org', source: 'Google Fact Check' }
      ],
      { hasEmotionalTriggers: false, sentiment: 'NEUTRAL' }
    );

    expect(combined.verdict).toBe('FALSE');
    expect(combined.sources.length).toBe(2);
    expect(combined.confidence).toBeGreaterThanOrEqual(0.8);
  });

  test('normalizeVerdict maps ratings consistently', () => {
    expect(factChecker.normalizeVerdict('Mostly False')).toBe('MISLEADING');
    expect(factChecker.normalizeVerdict('Accurate')).toBe('TRUE');
    expect(factChecker.normalizeVerdict('??')).toBe('UNVERIFIED');
  });

  test('verifyImage returns structured result', async () => {
    const result = await factChecker.verifyImage('https://example.com/image.png');
    expect(result.isAuthentic).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.7);
  });
});
