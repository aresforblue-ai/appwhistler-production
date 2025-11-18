// src/blockchain/blockchain.js
// Web3.js integration for Ethereum/blockchain interactions

const { ethers } = require('ethers');
const donationContractABI = require('./DonationContract.json'); // ABI from compiled contract

/**
 * Blockchain manager for AppWhistler
 * Handles wallet connections, smart contract interactions, and on-chain verification
 */
class BlockchainManager {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.donationContract = null;
    this.network = process.env.NETWORK || 'goerli'; // Use testnet by default
    
    this.initializeProvider();
  }

  /**
   * Initialize Web3 provider (connects to Ethereum network)
   */
  initializeProvider() {
    // Use Infura or Alchemy for free RPC access
    const rpcUrl = process.env.INFURA_PROJECT_ID 
      ? `https://${this.network}.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
      : process.env.ALCHEMY_API_KEY
      ? `https://eth-${this.network}.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
      : null;

    if (!rpcUrl) {
      console.warn('⚠️  No blockchain RPC configured. Blockchain features disabled.');
      return;
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    console.log(`✅ Blockchain provider initialized: ${this.network}`);

    // Initialize signer if private key is set (for server-side transactions)
    if (process.env.PRIVATE_KEY) {
      this.signer = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
      console.log(`✅ Wallet loaded: ${this.signer.address}`);
    }
  }

  /**
   * Connect to donation smart contract
   * @param {string} contractAddress - Deployed contract address
   */
  connectDonationContract(contractAddress) {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    this.donationContract = new ethers.Contract(
      contractAddress,
      donationContractABI,
      this.signer || this.provider
    );

    console.log(`✅ Connected to donation contract: ${contractAddress}`);
  }

  /**
   * Send donation through smart contract (auto-splits 50/50)
   * @param {string} amountInEth - Amount to donate in ETH
   * @param {string} message - Optional message from donor
   * @returns {object} Transaction receipt
   */
  async sendDonation(amountInEth, message = '') {
    if (!this.donationContract || !this.signer) {
      throw new Error('Contract or signer not initialized');
    }

    try {
      const amountWei = ethers.parseEther(amountInEth.toString());
      
      let tx;
      if (message) {
        // Call donate() function with message
        tx = await this.donationContract.donate(message, {
          value: amountWei
        });
      } else {
        // Send ETH directly (uses receive() function)
        tx = await this.signer.sendTransaction({
          to: await this.donationContract.getAddress(),
          value: amountWei
        });
      }

      console.log(`📤 Donation transaction sent: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log(`✅ Donation confirmed in block ${receipt.blockNumber}`);

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      console.error('Donation failed:', error);
      throw new Error(`Donation failed: ${error.message}`);
    }
  }

  /**
   * Get donation statistics from smart contract
   * @returns {object} Total amounts donated and kept by platform
   */
  async getDonationStats() {
    if (!this.donationContract) {
      throw new Error('Contract not initialized');
    }

    try {
      const [daoTotal, platformTotal, combinedTotal] = 
        await this.donationContract.getTotalStats();

      return {
        totalDonatedToDAO: ethers.formatEther(daoTotal),
        totalKeptByPlatform: ethers.formatEther(platformTotal),
        totalProcessed: ethers.formatEther(combinedTotal),
        splitRatio: '50/50'
      };

    } catch (error) {
      console.error('Failed to get donation stats:', error);
      return null;
    }
  }

  /**
   * Store fact-check on blockchain for immutability
   * @param {object} factCheck - Fact-check data to store
   * @returns {string} Transaction hash (proof of immutability)
   */
  async storeFactCheckOnChain(factCheck) {
    if (!this.signer) {
      throw new Error('Signer not initialized');
    }

    try {
      // Create hash of fact-check data
      const dataString = JSON.stringify({
        claim: factCheck.claim,
        verdict: factCheck.verdict,
        confidence: factCheck.confidence,
        timestamp: Date.now()
      });

      const dataHash = ethers.keccak256(ethers.toUtf8Bytes(dataString));

      // Store hash on-chain (using simple value transfer with data)
      // In production, use a dedicated fact-check registry contract
      const tx = await this.signer.sendTransaction({
        to: this.signer.address, // Send to self (just storing data)
        value: 0,
        data: dataHash
      });

      await tx.wait();
      console.log(`✅ Fact-check stored on-chain: ${tx.hash}`);

      return tx.hash;

    } catch (error) {
      console.error('Failed to store fact-check on chain:', error);
      throw error;
    }
  }

  /**
   * Verify fact-check hasn't been tampered with
   * @param {object} factCheck - Fact-check to verify
   * @param {string} txHash - Original transaction hash
   * @returns {boolean} True if data matches blockchain record
   */
  async verifyFactCheckIntegrity(factCheck, txHash) {
    try {
      const tx = await this.provider.getTransaction(txHash);
      
      if (!tx) {
        return false;
      }

      // Recreate hash from current data
      const dataString = JSON.stringify({
        claim: factCheck.claim,
        verdict: factCheck.verdict,
        confidence: factCheck.confidence,
        timestamp: factCheck.timestamp
      });

      const expectedHash = ethers.keccak256(ethers.toUtf8Bytes(dataString));

      // Compare with blockchain data
      return tx.data === expectedHash;

    } catch (error) {
      console.error('Verification failed:', error);
      return false;
    }
  }

  /**
   * Create Decentralized Identifier (DID) for user
   * @param {string} walletAddress - User's wallet address
   * @returns {string} DID string
   */
  createDID(walletAddress) {
    // DID format: did:ethr:network:address
    return `did:ethr:${this.network}:${walletAddress}`;
  }

  /**
   * Verify user owns a wallet address (for authentication)
   * @param {string} address - Wallet address to verify
   * @param {string} signature - Signed message
   * @param {string} message - Original message that was signed
   * @returns {boolean} True if signature is valid
   */
  verifySignature(address, signature, message) {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Get wallet balance
   * @param {string} address - Wallet address
   * @returns {string} Balance in ETH
   */
  async getBalance(address) {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const balance = await this.provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  /**
   * Estimate gas cost for transaction
   * @param {object} tx - Transaction object
   * @returns {string} Estimated cost in ETH
   */
  async estimateGasCost(tx) {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const gasEstimate = await this.provider.estimateGas(tx);
    const feeData = await this.provider.getFeeData();
    const gasCost = gasEstimate * feeData.gasPrice;
    
    return ethers.formatEther(gasCost);
  }

  /**
   * Listen for donation events (real-time)
   * @param {function} callback - Function to call when donation received
   */
  listenForDonations(callback) {
    if (!this.donationContract) {
      throw new Error('Contract not initialized');
    }

    this.donationContract.on('DonationReceived', (from, totalAmount, daoShare, platformShare, timestamp) => {
      callback({
        from,
        totalAmount: ethers.formatEther(totalAmount),
        daoShare: ethers.formatEther(daoShare),
        platformShare: ethers.formatEther(platformShare),
        timestamp: new Date(timestamp.toNumber() * 1000)
      });
    });

    console.log('👂 Listening for donations...');
  }

  /**
   * Stop listening for events
   */
  stopListening() {
    if (this.donationContract) {
      this.donationContract.removeAllListeners();
      console.log('🔇 Stopped listening for events');
    }
  }

  /**
   * Get transaction details
   * @param {string} txHash - Transaction hash
   * @returns {object} Transaction details
   */
  async getTransaction(txHash) {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const tx = await this.provider.getTransaction(txHash);
    const receipt = await this.provider.getTransactionReceipt(txHash);

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: ethers.formatEther(tx.value),
      blockNumber: receipt.blockNumber,
      status: receipt.status === 1 ? 'success' : 'failed',
      gasUsed: receipt.gasUsed.toString()
    };
  }
}

// Singleton instance
const blockchainManager = new BlockchainManager();

// Initialize donation contract if address is set
if (process.env.DONATION_CONTRACT_ADDRESS) {
  blockchainManager.connectDonationContract(process.env.DONATION_CONTRACT_ADDRESS);
}

module.exports = blockchainManager;

/**
 * USAGE EXAMPLES:
 * 
 * // Send donation
 * const result = await blockchainManager.sendDonation('0.1', 'Supporting truth!');
 * console.log(`Donation tx: ${result.txHash}`);
 * 
 * // Get stats
 * const stats = await blockchainManager.getDonationStats();
 * console.log(`Total donated to DAO: ${stats.totalDonatedToDAO} ETH`);
 * 
 * // Store fact-check immutably
 * const txHash = await blockchainManager.storeFactCheckOnChain(factCheckData);
 * 
 * // Listen for real-time donations
 * blockchainManager.listenForDonations((donation) => {
 *   console.log(`New donation: ${donation.totalAmount} ETH from ${donation.from}`);
 * });
 */