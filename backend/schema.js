// src/backend/schema.js
// GraphQL schema defining all types and operations

const { gql } = require('apollo-server-express');

const typeDefs = gql`
  # Scalar types for custom data
  scalar DateTime
  scalar JSON

  # User type with authentication and gamification
  type User {
    id: ID!
    username: String!
    email: String!
    walletAddress: String
    truthScore: Int!
    reputation: Int
    isVerified: Boolean!
    role: String!
    avatarUrl: String
    avatar: String
    avatarThumbnailUrl: String
    avatarUploadedAt: DateTime
    bio: String
    socialLinks: [SocialLink!]
    preferences: UserPreferences
    createdAt: DateTime!
    reviews: [Review!]
    factChecks: [FactCheck!]
  }

  type SocialLink {
    platform: String!
    url: String!
  }

  input SocialLinkInput {
    platform: String!
    url: String!
  }

  type UserPreferences {
    notifications: NotificationPreferences!
    privacy: PrivacyPreferences!
    theme: String!
  }

  type NotificationPreferences {
    email: Boolean!
    push: Boolean!
    inApp: Boolean!
  }

  type PrivacyPreferences {
    profileVisibility: String!
    showReputation: Boolean!
  }

  input PreferencesInput {
    notifications: NotificationPreferencesInput
    privacy: PrivacyPreferencesInput
    theme: String
  }

  input NotificationPreferencesInput {
    email: Boolean
    push: Boolean
    inApp: Boolean
  }

  input PrivacyPreferencesInput {
    profileVisibility: String
    showReputation: Boolean
  }

  # App recommendation type
  type App {
    id: ID!
    name: String!
    packageId: String
    category: String
    description: String
    developer: String
    iconUrl: String
    websiteUrl: String
    privacyScore: Float
    securityScore: Float
    truthRating: Float
    downloadCount: Int
    platform: String
    isVerified: Boolean
    verifiedBy: User
    createdAt: DateTime
    updatedAt: DateTime
    reviews: [Review!]
    averageRating: Float

    # Enhanced truth verification (V2.0)
    truthAnalysis: AppTruthAnalysis
    detailedScore: DetailedScoreBreakdown
    redFlags: [RedFlag!]
    lastAnalyzed: DateTime
    analysisConfidence: Int
  }

  # ============================================================================
  # TRUTH VERIFICATION SYSTEM V2.0 - ENHANCED TYPES
  # ============================================================================

  # Comprehensive truth analysis for an app
  type AppTruthAnalysis {
    id: ID!
    appId: ID!
    overallTruthScore: Int!
    letterGrade: String!  # "A+", "A", "B+", "B", "C+", "C", "D+", "D", "F"

    # Component Scores (0-100 each)
    socialPresenceScore: Int
    financialTransparencyScore: Int
    reviewAuthenticityScore: Int
    developerCredibilityScore: Int
    securityPrivacyScore: Int

    # Detailed Breakdowns
    socialAnalysis: SocialAnalysis
    financialAnalysis: FinancialAnalysis
    reviewAnalysis: ReviewAnalysis
    developerAnalysis: DeveloperAnalysis
    securityAnalysis: SecurityAnalysisDetail

    # Metadata
    confidenceLevel: Int!
    lastAnalyzed: DateTime!
    analysisVersion: String!
    warningCount: Int!
  }

  # Social media presence and reputation analysis
  type SocialAnalysis {
    presenceScore: Int!
    platforms: [SocialPlatformData!]!
    credibilityIndicators: JSON
    controversyFlags: [String!]
    communitySentiment: String
    evidence: [SocialEvidence!]
  }

  type SocialPlatformData {
    platform: String!
    accountVerified: Boolean
    followerCount: Int
    engagementRate: Float
    authenticityScore: Int
  }

  type SocialEvidence {
    id: ID!
    platform: String!
    url: String!
    content: String!
    author: String
    sentiment: String!
    credibilityImpact: Int!
    relevanceScore: Int!
    discoveredAt: DateTime!
  }

  # Financial transparency and funding analysis
  type FinancialAnalysis {
    transparencyScore: Int!
    funding: FundingInfo
    ownership: OwnershipInfo
    revenueModel: RevenueModel
    redFlags: [String!]
  }

  type FundingInfo {
    totalRaised: String
    rounds: [FundingRound!]
    investors: [Investor!]
  }

  type FundingRound {
    round: String!
    amount: String!
    date: String
    leadInvestor: String
  }

  type Investor {
    name: String!
    reputationScore: Int
    ethicalConcerns: [String!]
    country: String
  }

  type OwnershipInfo {
    parentCompany: String
    country: String
    publicFilings: Boolean
    ownershipType: String
  }

  type RevenueModel {
    declared: String
    verified: Boolean
    hiddenMonetization: [String!]
  }

  # Review authenticity analysis (CRITICAL)
  type ReviewAnalysis {
    authenticityScore: Int!
    totalReviewsAnalyzed: Int!
    authenticReviews: Int!
    suspiciousReviews: Int!
    paidEndorsementsDetected: Int!
    biasIndicators: JSON
    flaggedReviews: [FlaggedReview!]
    authenticSentiment: SentimentBreakdown
  }

  type FlaggedReview {
    reviewId: ID!
    platform: String!
    reason: String!
    confidence: Float!
    textSample: String
    indicators: JSON
    isFake: Boolean!
    isPaid: Boolean!
    hasBias: Boolean!
  }

  type SentimentBreakdown {
    positive: Int!
    neutral: Int!
    negative: Int!
  }

  # Developer background and credibility
  type DeveloperAnalysis {
    credibilityScore: Int!
    experience: DeveloperExperience
    incidentHistory: IncidentHistory
    codeQuality: CodeQualityMetrics
  }

  type DeveloperExperience {
    yearsActive: Int
    teamSize: Int
    previousApps: [PreviousApp!]
    technicalExpertise: String
  }

  type PreviousApp {
    name: String!
    platform: String!
    rating: Float
    downloads: String
    controversies: [String!]
  }

  type IncidentHistory {
    securityBreaches: Int!
    privacyViolations: Int!
    lawsuits: Int!
    appStoreRemovals: Int!
    details: [Incident!]
  }

  type Incident {
    type: String!
    description: String!
    date: String
    resolved: Boolean!
  }

  type CodeQualityMetrics {
    githubStars: Int
    codeReviewScore: Int
    openSourceContributions: Boolean
    stackOverflowReputation: Int
  }

  # Security and privacy assessment
  type SecurityAnalysisDetail {
    securityScore: Int!
    privacyScore: Int!
    permissions: PermissionsAnalysis
    thirdPartyTrackers: [Tracker!]
    vulnerabilities: [Vulnerability!]
    encryption: String
    dataCollection: DataCollectionInfo
  }

  type PermissionsAnalysis {
    requested: [String!]!
    justified: [String!]
    suspicious: [String!]
    explanationQuality: String
    overPrivileged: Boolean
  }

  type Tracker {
    name: String!
    purpose: String!
    dataShared: [String!]
    disclosed: Boolean!
    privacyRisk: String
  }

  type Vulnerability {
    cveId: String
    severity: String!
    patched: Boolean!
    description: String!
    discoveredDate: String
  }

  type DataCollectionInfo {
    disclosed: [String!]!
    undisclosedDetected: [String!]
    dataRetentionPeriod: String
    dataDeletionAvailable: Boolean
  }

  # Red flag tracking
  type RedFlag {
    id: ID!
    severity: String!  # "critical", "major", "minor"
    category: String!  # "privacy", "security", "financial", "reviews", "developer"
    title: String!
    description: String!
    evidence: String
    evidenceUrls: [String!]
    scoreImpact: Int!
    status: String!
    detectedAt: DateTime!
    detectedByAgent: String
  }

  # Analysis job tracking
  type AnalysisJob {
    id: ID!
    appId: ID!
    jobType: String!
    status: String!  # "queued", "running", "completed", "failed"
    progress: Int!
    startedAt: DateTime
    completedAt: DateTime
    durationSeconds: Int
    result: JSON
    errorMessage: String
    agentVersion: String
    agentsUsed: [String!]
  }

  # Review authenticity details
  type ReviewAuthenticity {
    id: ID!
    reviewId: ID!
    authenticityScore: Int!
    isLikelyFake: Boolean!
    isPaidEndorsement: Boolean!
    hasBiasIndicators: Boolean!
    indicators: JSON
    evidenceSummary: String
    flaggedReason: String
    analyzedAt: DateTime!
  }

  # Detailed score breakdown (for visualization)
  type DetailedScoreBreakdown {
    overall: ScoreComponent!
    social: ScoreComponent!
    financial: ScoreComponent!
    reviews: ScoreComponent!
    developer: ScoreComponent!
    security: ScoreComponent!
  }

  type ScoreComponent {
    score: Int!
    weight: Float!
    contributionToOverall: Float!
    status: String!  # "excellent", "good", "average", "poor", "critical"
    keyFindings: [String!]
  }

  # Fact check type for NewsTruth vertical
  type FactCheck {
    id: ID!
    claim: String!
    verdict: String!
    confidenceScore: Float!
    sources: JSON
    explanation: String
    category: String!
    imageUrl: String
    submittedBy: User
    verifiedBy: User
    blockchainHash: String
    upvotes: Int!
    downvotes: Int!
    appeals: [FactCheckAppeal!]
    sourceCredibilityScore: Float
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Fact-check appeal type (user challenges verdict)
  type FactCheckAppeal {
    id: ID!
    factCheck: FactCheck!
    submittedBy: User!
    proposedVerdict: String!
    reasoning: String!
    evidence: String
    supportingLinks: [String!]
    status: String!
    reviewedBy: User
    reviewedAt: DateTime
    createdAt: DateTime!
  }

  # Blockchain transaction record
  type BlockchainTransaction {
    id: ID!
    hash: String!
    type: String!
    status: String!
    user: User!
    factCheckId: ID
    description: String
    timestamp: Int
    blockNumber: Int
    gasUsed: String
    createdAt: DateTime!
  }

  # User review type
  type Review {
    id: ID!
    app: App!
    user: User!
    rating: Float!
    reviewText: String
    isVerifiedPurchase: Boolean!
    helpfulCount: Int!
    createdAt: DateTime!
  }

  # AI recommendation type
  type Recommendation {
    id: ID!
    app: App!
    score: Float!
    reason: String
    clicked: Boolean!
    installed: Boolean!
  }

  # Bounty type for crowd-sourced fact checking
  type Bounty {
    id: ID!
    claim: String!
    rewardAmount: Float!
    status: String!
    creator: User!
    claimer: User
    factCheck: FactCheck
    blockchainTx: String
    createdAt: DateTime!
    closedAt: DateTime
  }

  # Authentication response
  type AuthPayload {
    token: String!
    refreshToken: String!
    user: User!
  }

  # Paginated results
  type AppConnection {
    edges: [App!]!
    pageInfo: PageInfo!
  }

  type FactCheckConnection {
    edges: [FactCheck!]!
    pageInfo: PageInfo!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  # Cursor-based pagination (Relay-compliant, more performant)
  type AppEdge {
    node: App!
    cursor: String!
  }

  type AppConnectionCursor {
    edges: [AppEdge!]!
    pageInfo: PageInfoCursor!
    totalCount: Int
  }

  type FactCheckEdge {
    node: FactCheck!
    cursor: String!
  }

  type FactCheckConnectionCursor {
    edges: [FactCheckEdge!]!
    pageInfo: PageInfoCursor!
    totalCount: Int
  }

  type PageInfoCursor {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  # File upload response type
  type UploadResponse {
    success: Boolean!
    url: String!
    thumbnailUrl: String
    ipfsHash: String!
    message: String
  }

  # Input types for mutations
  input RegisterInput {
    username: String!
    email: String!
    password: String!
    walletAddress: String
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input AppInput {
    name: String!
    packageId: String
    category: String
    description: String
    developer: String
    platform: String!
  }

  input FactCheckInput {
    claim: String!
    verdict: String!
    confidenceScore: Float
    sources: JSON
    explanation: String
    category: String!
    imageUrl: String
  }

  input ReviewInput {
    appId: ID!
    rating: Float!
    reviewText: String
  }

  # Queries (read operations)
  type Query {
    # Authentication
    me: User

    # Apps
    apps(
      category: String
      platform: String
      search: String
      minTruthRating: Float
      limit: Int
      offset: Int
    ): AppConnection!
    
    app(id: ID!): App
    trendingApps(limit: Int): [App!]!
    recommendedApps(userId: ID!): [Recommendation!]!

    # Fact Checks
    factChecks(
      category: String
      verdict: String
      search: String
      limit: Int
      offset: Int
    ): FactCheckConnection!
    
    factCheck(id: ID!): FactCheck
    verifyImage(imageUrl: String!): FactCheck

    # Users
    user(id: ID!): User
    leaderboard(limit: Int): [User!]!

    # Bounties
    bounties(status: String): [Bounty!]!
    bounty(id: ID!): Bounty

    # Blockchain & Transactions
    userTransactions(walletAddress: String, userId: ID): [BlockchainTransaction!]!
    transaction(hash: String!): BlockchainTransaction

    # Fact-check appeals
    factCheckAppeals(factCheckId: ID, status: String): [FactCheckAppeal!]!
    factCheckAppeal(id: ID!): FactCheckAppeal

    # Admin queries (require admin/moderator role)
    pendingApps(limit: Int, offset: Int): AppConnection!
    pendingFactChecks(limit: Int, offset: Int): FactCheckConnection!
    adminStats: AdminStats!

    # Cursor-based pagination queries (recommended for better performance)
    appsCursor(
      after: String
      before: String
      first: Int
      last: Int
      category: String
      platform: String
      search: String
      minTruthRating: Float
    ): AppConnectionCursor!

    factChecksCursor(
      after: String
      before: String
      first: Int
      last: Int
      category: String
      verdict: String
      search: String
    ): FactCheckConnectionCursor!

    pendingAppsCursor(
      after: String
      before: String
      first: Int
      last: Int
    ): AppConnectionCursor!

    pendingFactChecksCursor(
      after: String
      before: String
      first: Int
      last: Int
    ): FactCheckConnectionCursor!

    # Truth Verification V2.0 Queries
    # Get comprehensive truth analysis for an app
    appTruthAnalysis(appId: ID!): AppTruthAnalysis

    # Get detailed score breakdown with visualization data
    appDetailedScore(appId: ID!): DetailedScoreBreakdown

    # Get red flags for an app
    appRedFlags(appId: ID!, severity: String, category: String): [RedFlag!]!

    # Get flagged/suspicious reviews for an app
    flaggedReviews(appId: ID!, platform: String, minConfidence: Float): [FlaggedReview!]!

    # Get review authenticity details
    reviewAuthenticity(reviewId: ID!): ReviewAuthenticity

    # Get social media evidence for an app
    socialEvidence(appId: ID!, platform: String, sentiment: String): [SocialEvidence!]!

    # Get analysis job status
    analysisJob(jobId: ID!): AnalysisJob
    analysisJobs(appId: ID!, status: String): [AnalysisJob!]!
  }

  # Mutations (write operations)
  type Mutation {
    # Authentication
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    refreshToken(token: String!): AuthPayload!
    logout: Boolean!
    requestPasswordReset(email: String!): Boolean!
    resetPassword(token: String!, newPassword: String!): Boolean!

    # Apps
    addApp(input: AppInput!): App!
    updateApp(id: ID!, input: AppInput!): App!
    deleteApp(id: ID!): Boolean!

    # Fact Checks
    submitFactCheck(input: FactCheckInput!): FactCheck!
    voteFactCheck(id: ID!, vote: Int!): FactCheck!

    # Reviews
    submitReview(input: ReviewInput!): Review!
    markReviewHelpful(id: ID!): Review!

    # Bounties
    createBounty(claim: String!, rewardAmount: Float!): Bounty!
    claimBounty(id: ID!): Bounty!
    completeBounty(id: ID!, factCheckId: ID!): Bounty!

    # User profile and preferences
    updateProfile(userId: ID!, bio: String, avatar: String, socialLinks: [SocialLinkInput!]): User!
    updateUserProfile(userId: ID!, bio: String, avatar: String, socialLinks: [SocialLinkInput!]): User!
    updateUserPreferences(userId: ID!, preferences: PreferencesInput!): User!
    updateAvatar(avatarUrl: String!, thumbnailUrl: String, ipfsHash: String!): User!

    # Blockchain transactions
    recordBlockchainTransaction(
      hash: String!
      type: String!
      status: String!
      factCheckId: ID
      description: String
    ): BlockchainTransaction!

    # Fact-check appeals (user challenges verdicts)
    submitFactCheckAppeal(
      factCheckId: ID!
      proposedVerdict: String!
      reasoning: String!
      evidence: String
      supportingLinks: [String!]
    ): FactCheckAppeal!

    reviewFactCheckAppeal(
      appealId: ID!
      approved: Boolean!
      newVerdict: String
    ): FactCheckAppeal!

    # Admin mutations (require admin/moderator role)
    verifyApp(id: ID!): App!
    verifyFactCheck(id: ID!): FactCheck!
    rejectApp(id: ID!, reason: String): Boolean!
    rejectFactCheck(id: ID!, reason: String): Boolean!

    # Truth Verification V2.0 Mutations
    # Trigger comprehensive analysis for an app
    analyzeApp(appId: ID!, analysisType: AnalysisType!): AnalysisJob!

    # Manually trigger specific agent analyses
    analyzeSocialMedia(appId: ID!): AnalysisJob!
    analyzeFinancials(appId: ID!): AnalysisJob!
    analyzeReviews(appId: ID!): AnalysisJob!
    analyzeDeveloper(appId: ID!): AnalysisJob!
    analyzeSecurity(appId: ID!): AnalysisJob!

    # Report a fake/suspicious review
    reportFakeReview(reviewId: ID!, reason: String!, evidence: String): Boolean!

    # Challenge a truth score (similar to fact-check appeals)
    challengeTruthScore(appId: ID!, reasoning: String!, proposedScore: Int): FactCheckAppeal!

    # Admin: Verify or dismiss a red flag
    verifyRedFlag(redFlagId: ID!): RedFlag!
    dismissRedFlag(redFlagId: ID!, reason: String!): Boolean!
  }

  # Analysis type enum for specific agent selection
  enum AnalysisType {
    FULL          # All agents - comprehensive analysis
    SOCIAL_ONLY   # Social media intelligence only
    REVIEWS_ONLY  # Review authenticity analysis only
    FINANCIAL     # Financial transparency only
    DEVELOPER     # Developer background only
    SECURITY      # Security & privacy only
    QUICK         # Quick refresh of existing data
  }

  # Admin dashboard types
  type AdminStats {
    pendingAppsCount: Int!
    pendingFactChecksCount: Int!
    totalUsers: Int!
    totalVerifiedApps: Int!
    totalVerifiedFactChecks: Int!
    recentActivity: [ActivityItem!]!
  }

  type ActivityItem {
    action: String!
    timestamp: DateTime!
    metadata: JSON
  }

  # Subscriptions (real-time updates via WebSocket)
  type Subscription {
    factCheckAdded(category: String): FactCheck!
    bountyCreated: Bounty!
    appVerified(id: ID!): App!
    notificationAdded(userId: ID!): Notification!
  }

  type Notification {
    id: ID!
    userId: ID!
    type: String!
    title: String!
    message: String!
    data: JSON
    read: Boolean!
    createdAt: DateTime!
  }
`;

module.exports = typeDefs;