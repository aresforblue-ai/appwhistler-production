// src/backend/queues/jobHandlers.js
// Job handlers for background tasks

const { sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/email');
const blockchain = require('../../blockchain/blockchain');

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

module.exports = {
  handleEmailJob,
  handleBlockchainJob,
  handleFactCheckJob
};
