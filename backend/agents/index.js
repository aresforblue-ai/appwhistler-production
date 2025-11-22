// backend/agents/index.js
// Central hub for all AI agents in the AppWhistler platform
// Each agent is specialized for specific tasks related to truth verification,
// fact-checking, content moderation, and security

const contentModerationAgent = require('./contentModerationAgent');
const factCheckingAgent = require('./factCheckingAgent');
const sentimentAnalysisAgent = require('./sentimentAnalysisAgent');
const spamDetectionAgent = require('./spamDetectionAgent');
const truthRatingAgent = require('./truthRatingAgent');
const securityScanningAgent = require('./securityScanningAgent');
const privacyAnalysisAgent = require('./privacyAnalysisAgent');
const recommendationAgent = require('./recommendationAgent');
const behaviorAnalysisAgent = require('./behaviorAnalysisAgent');
const trendingDetectionAgent = require('./trendingDetectionAgent');
const reviewAuthenticityAgent = require('./reviewAuthenticityAgent');
const imageVerificationAgent = require('./imageVerificationAgent');
const sourceCredibilityAgent = require('./sourceCredibilityAgent');
const claimExtractionAgent = require('./claimExtractionAgent');
const newsClassificationAgent = require('./newsClassificationAgent');
const entityRecognitionAgent = require('./entityRecognitionAgent');
const misinformationDetectionAgent = require('./misinformationDetectionAgent');
const biasDetectionAgent = require('./biasDetectionAgent');
const citationVerificationAgent = require('./citationVerificationAgent');
const realtimeMonitoringAgent = require('./realtimeMonitoringAgent');

/**
 * Agent registry - all 20 AI agents
 */
const agents = {
  contentModeration: contentModerationAgent,
  factChecking: factCheckingAgent,
  sentimentAnalysis: sentimentAnalysisAgent,
  spamDetection: spamDetectionAgent,
  truthRating: truthRatingAgent,
  securityScanning: securityScanningAgent,
  privacyAnalysis: privacyAnalysisAgent,
  recommendation: recommendationAgent,
  behaviorAnalysis: behaviorAnalysisAgent,
  trendingDetection: trendingDetectionAgent,
  reviewAuthenticity: reviewAuthenticityAgent,
  imageVerification: imageVerificationAgent,
  sourceCredibility: sourceCredibilityAgent,
  claimExtraction: claimExtractionAgent,
  newsClassification: newsClassificationAgent,
  entityRecognition: entityRecognitionAgent,
  misinformationDetection: misinformationDetectionAgent,
  biasDetection: biasDetectionAgent,
  citationVerification: citationVerificationAgent,
  realtimeMonitoring: realtimeMonitoringAgent,
};

/**
 * Initialize all agents
 */
async function initializeAgents() {
  console.log('🤖 Initializing 20 AI agents...');
  const startTime = Date.now();

  const initPromises = Object.entries(agents).map(async ([name, agent]) => {
    try {
      if (agent.initialize) {
        await agent.initialize();
      }
      console.log(`✅ Agent initialized: ${name}`);
      return { name, status: 'ready' };
    } catch (error) {
      console.error(`❌ Agent failed to initialize: ${name}`, error.message);
      return { name, status: 'failed', error: error.message };
    }
  });

  const results = await Promise.all(initPromises);
  const duration = Date.now() - startTime;

  const successCount = results.filter(r => r.status === 'ready').length;
  console.log(`🎯 ${successCount}/20 agents initialized successfully in ${duration}ms`);

  return results;
}

/**
 * Shutdown all agents gracefully
 */
async function shutdownAgents() {
  console.log('🛑 Shutting down agents...');

  const shutdownPromises = Object.entries(agents).map(async ([name, agent]) => {
    try {
      if (agent.shutdown) {
        await agent.shutdown();
      }
      console.log(`✅ Agent shutdown: ${name}`);
    } catch (error) {
      console.error(`❌ Agent shutdown error: ${name}`, error.message);
    }
  });

  await Promise.all(shutdownPromises);
  console.log('✅ All agents shutdown complete');
}

/**
 * Get agent health status
 */
function getAgentStatus() {
  const status = {};

  Object.entries(agents).forEach(([name, agent]) => {
    status[name] = {
      available: typeof agent.process === 'function',
      initialized: agent.initialized || false,
      version: agent.version || '1.0.0',
      lastUsed: agent.lastUsed || null,
      totalProcessed: agent.totalProcessed || 0,
    };
  });

  return status;
}

/**
 * Process data with a specific agent
 */
async function processWithAgent(agentName, data, options = {}) {
  const agent = agents[agentName];

  if (!agent) {
    throw new Error(`Agent not found: ${agentName}`);
  }

  if (!agent.process) {
    throw new Error(`Agent ${agentName} does not support processing`);
  }

  const startTime = Date.now();

  try {
    const result = await agent.process(data, options);
    const duration = Date.now() - startTime;

    // Track usage
    if (agent.totalProcessed !== undefined) {
      agent.totalProcessed++;
    } else {
      agent.totalProcessed = 1;
    }
    agent.lastUsed = new Date().toISOString();

    console.log(`✅ Agent ${agentName} processed in ${duration}ms`);

    return {
      success: true,
      result,
      duration,
      agent: agentName,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Agent ${agentName} failed after ${duration}ms:`, error.message);

    return {
      success: false,
      error: error.message,
      duration,
      agent: agentName,
    };
  }
}

module.exports = {
  agents,
  initializeAgents,
  shutdownAgents,
  getAgentStatus,
  processWithAgent,
};
