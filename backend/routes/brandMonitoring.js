/**
 * Brand Monitoring API Routes
 * 
 * Provides REST endpoints for brand monitoring, fork scanning, and blockchain verification
 */

const express = require('express');
const router = express.Router();

// Import utilities
const brandMonitoring = require('../utils/brandMonitoring');
const forkScanner = require('../utils/forkScanner');
const blockchainBrand = require('../utils/blockchainBrand');

/**
 * GET /api/v1/brand/google-alerts-guide
 * Get guide for setting up Google Alerts
 */
router.get('/google-alerts-guide', (req, res) => {
  try {
    const guide = brandMonitoring.getGoogleAlertsGuide();
    res.json({
      success: true,
      guide,
    });
  } catch (error) {
    console.error('[Brand API] Error getting Google Alerts guide:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve Google Alerts guide',
    });
  }
});

/**
 * POST /api/v1/brand/scan
 * Scan a URL or content for brand violations using Grok AI
 * Body: { query: string, url?: string, content?: string }
 */
router.post('/scan', async (req, res) => {
  try {
    const { query, url, content } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required',
      });
    }

    // If URL and content provided, do full analysis
    if (url && content) {
      const analysis = await brandMonitoring.analyzeBrandUsage(url, content);
      return res.json({
        success: true,
        analysis,
      });
    }

    // Otherwise, use Grok API
    const result = await brandMonitoring.scanWithGrokAPI(query);
    res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('[Brand API] Error scanning:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scan for brand violations',
    });
  }
});

/**
 * POST /api/v1/brand/analyze-url
 * Analyze a specific URL for brand violations
 * Body: { url: string, content?: string }
 */
router.post('/analyze-url', async (req, res) => {
  try {
    const { url, content } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL parameter is required',
      });
    }

    const analysis = await brandMonitoring.analyzeBrandUsage(url, content);
    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('[Brand API] Error analyzing URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze URL',
    });
  }
});

/**
 * POST /api/v1/brand/track-mention
 * Track a brand mention from external source
 * Body: { source: string, url: string, context: string }
 */
router.post('/track-mention', async (req, res) => {
  try {
    const { source, url, context } = req.body;

    if (!source || !url || !context) {
      return res.status(400).json({
        success: false,
        error: 'source, url, and context are required',
      });
    }

    const mention = await brandMonitoring.trackBrandMention(source, url, context);
    res.json({
      success: true,
      mention,
    });
  } catch (error) {
    console.error('[Brand API] Error tracking mention:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track brand mention',
    });
  }
});

/**
 * GET /api/v1/brand/stats
 * Get brand monitoring statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = brandMonitoring.getBrandMonitoringStats();
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[Brand API] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
    });
  }
});

/**
 * GET /api/v1/brand/forks/scan
 * Scan all GitHub forks for brand violations
 * Warning: This can take a while for repositories with many forks
 */
router.get('/forks/scan', async (req, res) => {
  try {
    console.log('[Brand API] Starting fork scan...');
    const report = await forkScanner.scanAllForks();
    
    res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('[Brand API] Error scanning forks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scan forks',
      details: error.message,
    });
  }
});

/**
 * GET /api/v1/brand/forks/analyze/:owner/:repo
 * Analyze a specific fork for violations
 */
router.get('/forks/analyze/:owner/:repo', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    
    const analysis = await forkScanner.analyzeSingleFork(owner, repo);
    
    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('[Brand API] Error analyzing fork:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze fork',
    });
  }
});

/**
 * GET /api/v1/brand/forks/stats
 * Get fork scanner statistics
 */
router.get('/forks/stats', (req, res) => {
  try {
    const stats = forkScanner.getForkScannerStats();
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[Brand API] Error getting fork stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve fork statistics',
    });
  }
});

/**
 * GET /api/v1/brand/blockchain/guide
 * Get Sepolia blockchain verification guide
 */
router.get('/blockchain/guide', (req, res) => {
  try {
    const guide = blockchainBrand.getSepoliaBrandVerificationGuide();
    res.json({
      success: true,
      guide,
    });
  } catch (error) {
    console.error('[Brand API] Error getting blockchain guide:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve blockchain guide',
    });
  }
});

/**
 * GET /api/v1/brand/blockchain/mock-nft
 * Generate mock NFT brand verification (for testing)
 */
router.get('/blockchain/mock-nft', (req, res) => {
  try {
    const mockNFT = blockchainBrand.mockNFTBrandVerification();
    res.json({
      success: true,
      mockNFT,
      note: 'This is a mock NFT for development. Follow the guide to create real verification.',
    });
  } catch (error) {
    console.error('[Brand API] Error generating mock NFT:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate mock NFT',
    });
  }
});

/**
 * GET /api/v1/brand/blockchain/metadata
 * Get NFT metadata template
 */
router.get('/blockchain/metadata', (req, res) => {
  try {
    const metadata = blockchainBrand.generateNFTMetadata();
    res.json({
      success: true,
      metadata,
      instructions: 'Upload this metadata to IPFS and use the IPFS hash when minting your NFT',
    });
  } catch (error) {
    console.error('[Brand API] Error generating metadata:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate NFT metadata',
    });
  }
});

/**
 * GET /api/v1/brand/blockchain/ipfs-guide
 * Get IPFS upload guide
 */
router.get('/blockchain/ipfs-guide', (req, res) => {
  try {
    const guide = blockchainBrand.getIPFSUploadGuide();
    res.json({
      success: true,
      guide,
    });
  } catch (error) {
    console.error('[Brand API] Error getting IPFS guide:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve IPFS guide',
    });
  }
});

/**
 * GET /api/v1/brand/blockchain/status
 * Get current blockchain verification status
 */
router.get('/blockchain/status', (req, res) => {
  try {
    const status = blockchainBrand.getBlockchainVerificationStatus();
    res.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error('[Brand API] Error getting blockchain status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve blockchain status',
    });
  }
});

/**
 * POST /api/v1/brand/blockchain/verify
 * Verify brand ownership via blockchain
 * Body: { contractAddress: string, tokenId: string }
 */
router.post('/blockchain/verify', async (req, res) => {
  try {
    const { contractAddress, tokenId } = req.body;

    if (!contractAddress || !tokenId) {
      return res.status(400).json({
        success: false,
        error: 'contractAddress and tokenId are required',
      });
    }

    const verification = await blockchainBrand.verifyBrandOwnership(contractAddress, tokenId);
    res.json({
      success: true,
      verification,
    });
  } catch (error) {
    console.error('[Brand API] Error verifying ownership:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify brand ownership',
    });
  }
});

/**
 * GET /api/v1/brand/config
 * Get brand monitoring configuration
 */
router.get('/config', (req, res) => {
  try {
    const config = {
      brand: brandMonitoring.BRAND_CONFIG,
      repository: forkScanner.REPO_CONFIG,
      blockchain: {
        network: blockchainBrand.BLOCKCHAIN_CONFIG.network,
        chainId: blockchainBrand.BLOCKCHAIN_CONFIG.chainId,
        explorer: blockchainBrand.BLOCKCHAIN_CONFIG.sepoliaExplorer,
        opensea: blockchainBrand.BLOCKCHAIN_CONFIG.openSeaTestnet,
      },
      features: {
        googleAlerts: 'Free web monitoring',
        grokAPI: process.env.GROK_API_KEY ? 'Configured' : 'Mock mode',
        forkScanning: process.env.GITHUB_TOKEN ? 'Enhanced (with token)' : 'Standard rate limits',
        blockchain: 'Sepolia testnet',
      },
    };

    res.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('[Brand API] Error getting config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve configuration',
    });
  }
});

module.exports = router;
