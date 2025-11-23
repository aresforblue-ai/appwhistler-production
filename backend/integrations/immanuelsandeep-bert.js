/**
 * ImmanuelSandeep BERT Transformer Integration
 * Source: github.com/ImmanuelSandeep/Transformer-Based-Fake-Review-Detection
 *
 * Original: Fine-tuned BERT (92% F1 score on OR vs CG classification)
 * This: JavaScript adapter for BERT API + offline fallback using linguistic heuristics
 *
 * License: Apache 2.0
 */

const axios = require('axios');
const logger = require('../utils/logger');

// BERT API endpoint (deployed separately as Flask service)
const BERT_ENDPOINT = process.env.BERT_ENDPOINT || 'http://localhost:5003/classify';

/**
 * Call BERT transformer API
 * OR = Organic Review (genuine)
 * CG = Computer Generated (fake)
 */
async function classifyWithBERT(reviewText, options = {}) {
  try {
    const response = await axios.post(
      BERT_ENDPOINT,
      {
        text: reviewText,
        model: 'bert-base-uncased',
        return_attention: options.includeAttention || false
      },
      {
        timeout: options.timeout || 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AppWhistler/1.0'
        }
      }
    );

    return {
      label: response.data.label, // 'OR' or 'CG'
      cgProbability: response.data.fake_score || response.data.cg_probability,
      orProbability: 1 - (response.data.fake_score || response.data.cg_probability),
      confidence: Math.max(response.data.fake_score, 1 - response.data.fake_score) * 100,
      attentionWeights: response.data.attention_summary || null,
      source: 'BERT_API'
    };
  } catch (error) {
    logger.error('[BERT Integration] API call failed:', error.message);

    // Fallback to heuristic-based classification
    if (options.allowFallback !== false) {
      logger.info('[BERT Integration] Using fallback heuristic classifier');
      return classifyWithHeuristics(reviewText);
    }

    throw error;
  }
}

/**
 * Heuristic-based fallback when BERT API is unavailable
 * Approximates transformer behavior using linguistic patterns
 */
function classifyWithHeuristics(reviewText) {
  const text = reviewText.toLowerCase();
  let cgScore = 0; // Computer-generated score

  // === BERT-like Feature Detection ===

  // 1. Overly formal/robotic language
  const formalPatterns = [
    /as an? (ai|bot|language model)/i,
    /i (would|must) (highly|strongly) recommend/i,
    /this (product|app|service) truly exceeds expectations/i,
    /in (summary|conclusion), (i|this)/i,
    /(furthermore|moreover|additionally), (it|this)/i,
    /exhibit(s)? (excellent|exceptional|outstanding)/i
  ];

  const formalMatches = formalPatterns.filter(p => p.test(text)).length;
  cgScore += formalMatches * 15;

  // 2. Template-like structure (BERT detects these well)
  const templateIndicators = [
    /^i (recently|just) (purchased|bought|downloaded|tried)/i,
    /i (would|will|must) definitely recommend/i,
    /(highly|strongly) (recommend|suggest) this/i,
    /(overall|in conclusion), (this|it) is (a )?(great|excellent|amazing)/i
  ];

  const templateMatches = templateIndicators.filter(p => p.test(text)).length;
  cgScore += templateMatches * 20;

  // 3. Excessive perfection (no negatives, all positive)
  const positiveWords = ['amazing', 'excellent', 'perfect', 'outstanding', 'incredible', 'fantastic', 'wonderful'];
  const negativeWords = ['but', 'however', 'although', 'issue', 'problem', 'wish', 'could'];

  const posCount = positiveWords.filter(w => text.includes(w)).length;
  const negCount = negativeWords.filter(w => text.includes(w)).length;

  if (posCount >= 3 && negCount === 0) {
    cgScore += 25; // Too perfect = likely fake
  }

  // 4. Unnatural sentence length consistency
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length >= 3) {
    const lengths = sentences.map(s => s.trim().split(/\s+/).length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((acc, len) => acc + Math.pow(len - avgLength, 2), 0) / lengths.length;

    // BERT detects that human writing has more variance
    if (variance < 5 && avgLength > 10) {
      cgScore += 20; // Very consistent = robotic
    }
  }

  // 5. Generic product descriptions
  const genericPhrases = [
    'user-friendly interface',
    'seamless experience',
    'highly intuitive',
    'game-changer',
    'exceeded my expectations',
    'worth every penny',
    'cannot recommend enough'
  ];

  const genericMatches = genericPhrases.filter(p => text.includes(p)).length;
  cgScore += genericMatches * 18;

  // 6. Lack of specific details (BERT notices this)
  const specificityMarkers = [
    /version \d+/i,
    /\$\d+/,
    /\d+ (days|weeks|months)/,
    /(my|i) (tried|used|tested) (it|this) (for|on)/i,
    /when i (first|initially)/i
  ];

  const specificMatches = specificityMarkers.filter(p => p.test(text)).length;
  if (specificMatches === 0 && text.split(/\s+/).length > 30) {
    cgScore += 15; // Long but vague = suspicious
  }

  // 7. Promotional language density
  const promoWords = ['buy', 'purchase', 'deal', 'offer', 'sale', 'discount', 'limited', 'now', 'today'];
  const promoCount = promoWords.filter(w => text.includes(w)).length;
  if (promoCount >= 3) {
    cgScore += 25;
  }

  // === Calculate final score ===
  const finalCgScore = Math.min(cgScore, 100);
  const label = finalCgScore >= 50 ? 'CG' : 'OR';
  const confidence = Math.abs(finalCgScore - 50) * 2; // Scale to 0-100

  return {
    label,
    cgProbability: finalCgScore / 100,
    orProbability: 1 - (finalCgScore / 100),
    confidence,
    attentionWeights: null,
    source: 'HEURISTIC_FALLBACK'
  };
}

/**
 * Analyze review with BERT (main export for orchestrator)
 */
async function analyzeWithBERT(reviewText, metadata = {}) {
  try {
    const result = await classifyWithBERT(reviewText, {
      timeout: metadata.timeout || 10000,
      includeAttention: metadata.includeAttention || false,
      allowFallback: metadata.allowFallback !== false
    });

    // Convert to AppWhistler format
    const fakeScore = Math.round(result.cgProbability * 100);

    return {
      fakeScore,
      confidence: result.confidence,
      verdict: result.label === 'CG' ? 'LIKELY_FAKE' :
               result.label === 'OR' ? 'LIKELY_GENUINE' :
               'UNCERTAIN',
      classification: {
        label: result.label,
        cgProbability: result.cgProbability,
        orProbability: result.orProbability,
        method: result.source
      },
      features: {
        attentionWeights: result.attentionWeights,
        modelUsed: result.source === 'BERT_API' ? 'bert-base-uncased' : 'heuristic-fallback'
      },
      redFlags: generateBERTRedFlags(reviewText, result)
    };
  } catch (error) {
    logger.error('[BERT Integration] Analysis failed:', error.message);
    return null;
  }
}

/**
 * Generate red flags based on BERT analysis
 */
function generateBERTRedFlags(reviewText, bertResult) {
  const flags = [];

  if (bertResult.label === 'CG' && bertResult.cgProbability > 0.7) {
    flags.push({
      category: 'AI Generation',
      severity: 'HIGH',
      description: `BERT transformer detected ${Math.round(bertResult.cgProbability * 100)}% probability of computer-generated text`
    });
  }

  if (bertResult.source === 'HEURISTIC_FALLBACK') {
    flags.push({
      category: 'Analysis Method',
      severity: 'INFO',
      description: 'BERT API unavailable - used heuristic fallback (lower accuracy)'
    });
  }

  // Check for specific patterns detected by fallback
  const text = reviewText.toLowerCase();
  if (/as an? (ai|bot|language model)/i.test(text)) {
    flags.push({
      category: 'AI Self-Reference',
      severity: 'CRITICAL',
      description: 'Review explicitly mentions being AI-generated'
    });
  }

  if (bertResult.cgProbability > 0.5 && reviewText.split(/\s+/).length < 20) {
    flags.push({
      category: 'Brevity + AI',
      severity: 'MEDIUM',
      description: 'Short review with high AI probability (common bot pattern)'
    });
  }

  return flags;
}

/**
 * Batch analysis for multiple reviews (more efficient)
 */
async function batchAnalyzeWithBERT(reviews, options = {}) {
  const batchSize = options.batchSize || 10;
  const results = [];

  for (let i = 0; i < reviews.length; i += batchSize) {
    const batch = reviews.slice(i, i + batchSize);
    const promises = batch.map(review =>
      analyzeWithBERT(review.review_text || review.text, {
        ...options,
        reviewId: review.id
      })
    );

    const batchResults = await Promise.allSettled(promises);
    results.push(...batchResults.map(r => r.status === 'fulfilled' ? r.value : null));
  }

  return results.filter(Boolean);
}

/**
 * Health check for BERT API
 */
async function checkBERTHealth() {
  try {
    const response = await axios.get(`${BERT_ENDPOINT}/health`, { timeout: 3000 });
    return {
      available: true,
      endpoint: BERT_ENDPOINT,
      status: response.data
    };
  } catch (error) {
    return {
      available: false,
      endpoint: BERT_ENDPOINT,
      error: error.message
    };
  }
}

module.exports = {
  analyzeWithBERT,
  classifyWithBERT,
  classifyWithHeuristics,
  batchAnalyzeWithBERT,
  checkBERTHealth
};
