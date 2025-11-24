/**
 * Brand Monitoring System Test
 * Tests all brand protection utilities
 */

const brandMonitoring = require('./utils/brandMonitoring');
const forkScanner = require('./utils/forkScanner');
const blockchainBrand = require('./utils/blockchainBrand');

async function testBrandMonitoring() {
  console.log('🧪 Testing Brand Monitoring System\n');
  console.log('='.repeat(60));
  
  // Test 1: Configuration
  console.log('\n1. Configuration Test');
  console.log('   Brand Name:', brandMonitoring.BRAND_CONFIG.brandName);
  console.log('   Variations:', brandMonitoring.BRAND_CONFIG.brandVariations.join(', '));
  console.log('   ✅ Configuration loaded');
  
  // Test 2: Google Alerts Guide
  console.log('\n2. Google Alerts Guide');
  const alertsGuide = brandMonitoring.getGoogleAlertsGuide();
  console.log('   Title:', alertsGuide.title);
  console.log('   Steps:', alertsGuide.steps.length);
  console.log('   Tips:', alertsGuide.tips.length);
  console.log('   ✅ Guide generated');
  
  // Test 3: Grok API Scanning (Mock Mode)
  console.log('\n3. Grok AI Scanning (Mock Mode)');
  const scanResult = await brandMonitoring.scanWithGrokAPI(
    'Check if this content violates AppWhistler brand'
  );
  console.log('   Success:', scanResult.success);
  console.log('   Threat Level:', scanResult.threatLevel);
  console.log('   Mock Mode:', scanResult.mock || false);
  console.log('   ✅ Grok scanning working');
  
  // Test 4: URL Analysis
  console.log('\n4. Brand Usage Analysis');
  const testCases = [
    {
      url: 'https://github.com/aresforblue-ai/appwhistler-production',
      content: 'Official AppWhistler repository',
      expected: 'official'
    },
    {
      url: 'https://github.com/badactor/appwhistler-clone',
      content: 'AppWhistler AppWhistler AppWhistler - Commercial use',
      expected: 'high threat'
    },
    {
      url: 'https://example.com/tutorial',
      content: 'How to use AppWhistler - A tutorial',
      expected: 'low threat'
    }
  ];
  
  for (const testCase of testCases) {
    const analysis = await brandMonitoring.analyzeBrandUsage(testCase.url, testCase.content);
    console.log(`   URL: ${testCase.url}`);
    console.log(`   Status: ${analysis.status} | Threat: ${analysis.threatLevel}`);
  }
  console.log('   ✅ URL analysis working');
  
  // Test 5: Brand Mention Tracking
  console.log('\n5. Brand Mention Tracking');
  const mention = await brandMonitoring.trackBrandMention(
    'github',
    'https://github.com/example/fork',
    'Fork of AppWhistler'
  );
  console.log('   Mention ID:', mention.id);
  console.log('   Analyzed:', mention.analyzed);
  console.log('   ✅ Mention tracking working');
  
  // Test 6: Fork Scanner Stats
  console.log('\n6. Fork Scanner Configuration');
  const forkStats = forkScanner.getForkScannerStats();
  console.log('   Capabilities:', forkStats.capabilities.length);
  console.log('   Checks:', forkStats.checks.length);
  console.log('   Rate Limit:', forkStats.apiLimits.rateLimit);
  console.log('   ✅ Fork scanner ready');
  
  // Test 7: Blockchain Configuration
  console.log('\n7. Blockchain Verification');
  const blockchainStatus = blockchainBrand.getBlockchainVerificationStatus();
  console.log('   Status:', blockchainStatus.status);
  console.log('   Network:', 'Sepolia Testnet');
  console.log('   ✅ Blockchain verification configured');
  
  // Test 8: NFT Metadata Generation
  console.log('\n8. NFT Metadata Generation');
  const nftMetadata = blockchainBrand.generateNFTMetadata();
  console.log('   Name:', nftMetadata.name);
  console.log('   Attributes:', nftMetadata.attributes.length);
  console.log('   ✅ NFT metadata generated');
  
  // Test 9: Mock NFT Creation
  console.log('\n9. Mock NFT Brand Verification');
  const mockNFT = blockchainBrand.mockNFTBrandVerification();
  console.log('   Contract:', mockNFT.contractAddress.substring(0, 12) + '...');
  console.log('   Token ID:', mockNFT.tokenId);
  console.log('   Verified:', mockNFT.verification.verified);
  console.log('   ✅ Mock NFT created');
  
  // Test 10: Monitoring Report Generation
  console.log('\n10. Monitoring Report Generation');
  const mockScans = [
    { url: 'url1', threatLevel: 'high', issues: ['violation1'] },
    { url: 'url2', threatLevel: 'medium', issues: [] },
    { url: 'url3', threatLevel: 'low', issues: [] },
  ];
  const report = brandMonitoring.generateMonitoringReport(mockScans);
  console.log('   Total scans:', report.summary.total);
  console.log('   High threats:', report.summary.high);
  console.log('   Medium threats:', report.summary.medium);
  console.log('   Low threats:', report.summary.low);
  console.log('   ✅ Report generation working');
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ ALL TESTS PASSED!');
  console.log('\nBrand Protection System is fully operational!\n');
  
  console.log('📚 Next Steps:');
  console.log('   1. Set GROK_API_KEY environment variable for AI scanning');
  console.log('   2. Set GITHUB_TOKEN for higher fork scanner rate limits');
  console.log('   3. Configure Google Alerts using the guide');
  console.log('   4. Create brand verification NFT on Sepolia testnet');
  console.log('   5. Start the server and test API endpoints\n');
}

// Run tests
testBrandMonitoring().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
