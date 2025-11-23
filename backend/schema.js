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

  # URL Analysis result for extension
  type UrlAnalysisResult {
    url: String!
    appName: String!
    category: String
    truthScore: Int!
    letterGrade: String!
    redFlags: [RedFlag!]
    metadata: AppMetadata
    analysis: AnalysisSummary
  }

  type RedFlag {
    severity: String!
    category: String!
    description: String!
  }

  type AppMetadata {
    developer: String
    lastUpdated: String
    userCount: String
    avgRating: String
  }

  type AnalysisSummary {
    summary: String!
    strengths: [String!]
    concerns: [String!]
    verificationStatus: String!
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

    # Extension support - analyze any URL for truth rating
    analyzeUrl(url: String!): UrlAnalysisResult!

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