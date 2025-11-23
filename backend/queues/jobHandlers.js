// src/backend/queues/jobHandlers.js
// Job handlers for background tasks

const { sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/email');
const blockchain = require('../../blockchain/blockchain');
const AgentOrchestrator = require('../agents/AgentOrchestrator');

// Initialize agent orchestrator for truth analysis
const orchestrator = new AgentOrchestrator();

/**
 * Handler for email jobs
 */
async function handleEmailJob(jobData) {
  const { type, to, subject, templateData } = jobData;

  console.log(`📧 Processing email job: ${type} to ${to}`);

  try {
    switch (type) {
      case 'welcome':
        await sendWelcomeEmail(to, templateData);
        break;
      case 'password-reset':
        await sendPasswordResetEmail(to, templateData.resetLink, templateData.expiresIn);
        break;
      case 'notification':
        // Custom notification email
        console.log(`📧 Sending notification to ${to}:`, templateData);
        break;
      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    console.log(`✅ Email sent: ${type} to ${to}`);
    return { success: true, type, recipient: to };
  } catch (error) {
    console.error(`❌ Email job failed: ${type}`, error.message);
    throw error;
  }
}

/**
 * Handler for blockchain jobs
 */
async function handleBlockchainJob(jobData) {
  const { type, factCheckId, data } = jobData;

  console.log(`⛓️  Processing blockchain job: ${type} for fact-check ${factCheckId}`);

  try {
    switch (type) {
      case 'stamp-fact-check':
        // Stamp fact-check on blockchain
        if (blockchain.provider) {
          const txHash = await blockchain.stampFactCheck(factCheckId, data);
          console.log(`✅ Fact-check stamped on blockchain: ${txHash}`);
          return { success: true, type, txHash, factCheckId };
        } else {
          console.warn('⚠️  Blockchain provider not available, skipping stamp');
          return { success: false, reason: 'No blockchain provider' };
        }
        break;

      case 'record-donation':
        // Record donation on blockchain
        if (blockchain.signer) {
          const txHash = await blockchain.recordDonation(data.donor, data.amount, data.appId);
          console.log(`✅ Donation recorded: ${txHash}`);
          return { success: true, type, txHash };
        } else {
          console.warn('⚠️  Blockchain signer not available, skipping donation');
          return { success: false, reason: 'No blockchain signer' };
        }
        break;

      default:
        throw new Error(`Unknown blockchain job type: ${type}`);
    }
  } catch (error) {
    console.error(`❌ Blockchain job failed: ${type}`, error.message);
    throw error;
  }
}

/**
 * Handler for fact-check verification jobs
 */
async function handleFactCheckJob(jobData) {
  const { type, factCheckId, claimId } = jobData;

  console.log(`🔍 Processing fact-check job: ${type}`);

  try {
    switch (type) {
      case 'verify-claim':
        // Perform async fact-checking (could integrate with AI service)
        console.log(`🔍 Verifying claim ${claimId} for fact-check ${factCheckId}`);
        // This would trigger more detailed verification
        return { success: true, type, factCheckId, claimId };

      case 'update-scores':
        // Update cached scores
        console.log(`📊 Updating fact-check scores for ${factCheckId}`);
        return { success: true, type, factCheckId };

      default:
        throw new Error(`Unknown fact-check job type: ${type}`);
    }
  } catch (error) {
    console.error(`❌ Fact-check job failed: ${type}`, error.message);
    throw error;
  }
}

/**
 * Handler for truth analysis jobs
 * Executes specialized agent analyses in the background
 */
async function handleTruthAnalysisJob(jobData) {
  const { type, appId, analysisType, pool, appData, jobId } = jobData;

  console.log(`🔍 Processing truth analysis job: ${analysisType} for app ${appId}`);

  try {
    // Update job status to running
    if (pool && jobId) {
      await pool.query(
        'UPDATE analysis_jobs SET status = $1, progress = $2 WHERE id = $3',
        ['running', 10, jobId]
      );
    }

    let analysisResult;
    const startTime = Date.now();

    switch (analysisType) {
      case 'FULL':
        console.log(`🚀 Running FULL analysis for app ${appId} with all 5 agents...`);

        // Update progress: 20%
        if (pool && jobId) {
          await pool.query(
            'UPDATE analysis_jobs SET progress = $1 WHERE id = $2',
            [20, jobId]
          );
        }

        analysisResult = await orchestrator.runFullAnalysis({ appId, pool, appData });

        // Save full analysis results to database
        if (pool) {
          await orchestrator.saveAnalysis(pool, analysisResult);
        }
        break;

      case 'SOCIAL_ONLY':
        console.log(`🐦 Running SOCIAL media analysis for app ${appId}...`);
        analysisResult = await orchestrator.runAgent('social', { appId, pool, appData });
        break;

      case 'REVIEWS_ONLY':
        console.log(`⭐ Running REVIEW authenticity analysis for app ${appId}...`);
        analysisResult = await orchestrator.runAgent('reviews', { appId, pool, appData });
        break;

      case 'FINANCIAL':
        console.log(`💰 Running FINANCIAL transparency analysis for app ${appId}...`);
        analysisResult = await orchestrator.runAgent('financial', { appId, pool, appData });
        break;

      case 'DEVELOPER':
        console.log(`👨‍💻 Running DEVELOPER background analysis for app ${appId}...`);
        analysisResult = await orchestrator.runAgent('developer', { appId, pool, appData });
        break;

      case 'SECURITY':
        console.log(`🔒 Running SECURITY & privacy analysis for app ${appId}...`);
        analysisResult = await orchestrator.runAgent('security', { appId, pool, appData });
        break;

      case 'QUICK':
        console.log(`⚡ Running QUICK refresh for app ${appId}...`);
        // Quick refresh just updates metadata without deep analysis
        analysisResult = {
          app_id: appId,
          quick_refresh: true,
          completed_at: new Date().toISOString()
        };
        break;

      default:
        throw new Error(`Unknown analysis type: ${analysisType}`);
    }

    const duration = Math.round((Date.now() - startTime) / 1000);

    // Update job status to completed
    if (pool && jobId) {
      await pool.query(
        `UPDATE analysis_jobs
         SET status = $1, progress = $2, completed_at = NOW(),
             duration_seconds = $3, result = $4,
             agents_used = $5
         WHERE id = $6`,
        [
          'completed',
          100,
          duration,
          JSON.stringify(analysisResult),
          JSON.stringify(
            analysisType === 'FULL'
              ? ['reviews', 'social', 'financial', 'developer', 'security']
              : [analysisType.toLowerCase().replace('_only', '')]
          ),
          jobId
        ]
      );
    }

    console.log(`✅ Truth analysis completed: ${analysisType} for app ${appId} in ${duration}s`);

    return {
      success: true,
      type,
      appId,
      analysisType,
      duration,
      result: analysisResult
    };

  } catch (error) {
    console.error(`❌ Truth analysis job failed: ${analysisType} for app ${appId}`, error);

    // Update job status to failed
    if (pool && jobId) {
      await pool.query(
        `UPDATE analysis_jobs
         SET status = $1, error_message = $2, completed_at = NOW()
         WHERE id = $3`,
        ['failed', error.message, jobId]
      );
    }

    throw error;
  }
}

module.exports = {
  handleEmailJob,
  handleBlockchainJob,
  handleFactCheckJob,
  handleTruthAnalysisJob
};
