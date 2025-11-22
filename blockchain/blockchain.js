// blockchain/blockchain.js
// Blockchain integration stub for AppWhistler
// Provides safe fallback when blockchain services are not configured

const { getSecret } = require('../config/secrets');

/**
 * Blockchain provider stub
 * Returns null when blockchain credentials are not configured
 */
const provider = getSecret('INFURA_PROJECT_ID') || getSecret('ALCHEMY_API_KEY') ? null : null;

/**
 * Blockchain signer stub
 * Returns null when private key is not configured
 */
const signer = getSecret('PRIVATE_KEY') ? null : null;

/**
 * Stamp a fact-check on the blockchain
 * @param {number} factCheckId - The fact-check ID
 * @param {object} data - Fact-check data to stamp
 * @returns {Promise<string>} Transaction hash
 */
async function stampFactCheck(factCheckId, data) {
  console.log(`⛓️  Blockchain stub: Would stamp fact-check ${factCheckId}`);
  console.log('⚠️  Blockchain provider not configured. Set INFURA_PROJECT_ID or ALCHEMY_API_KEY in .env to enable blockchain features.');
  throw new Error('Blockchain provider not configured');
}

/**
 * Record a donation on the blockchain
 * @param {string} donor - Donor address
 * @param {number} amount - Donation amount
 * @param {number} appId - App ID
 * @returns {Promise<string>} Transaction hash
 */
async function recordDonation(donor, amount, appId) {
  console.log(`⛓️  Blockchain stub: Would record donation from ${donor} for app ${appId}`);
  console.log('⚠️  Blockchain signer not configured. Set PRIVATE_KEY in .env to enable blockchain features.');
  throw new Error('Blockchain signer not configured');
}

module.exports = {
  provider,
  signer,
  stampFactCheck,
  recordDonation
};
