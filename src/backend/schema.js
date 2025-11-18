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
    isVerified: Boolean!
    role: String!
    createdAt: DateTime!
    reviews: [Review!]
    factChecks: [FactCheck!]
  }

  # App recommendation type
  type App {
    id: ID!
    name: String!
    packageId: String!
    category: String
    description: String
    developer: String
    iconUrl: String
    websiteUrl: String
    privacyScore: Float
    securityScore: Float
    truthRating: Float!
    downloadCount: Int!
    platform: String!
    isVerified: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
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
    createdAt: DateTime!
    updatedAt: DateTime!
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
    packageId: String!
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
  }

  # Mutations (write operations)
  type Mutation {
    # Authentication
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    refreshToken(token: String!): AuthPayload!
    logout: Boolean!

    # Apps
    addApp(input: AppInput!): App!
    updateApp(id: ID!, input: AppInput!): App!
    deleteApp(id: ID!): Boolean!

    # Fact Checks
    submitFactCheck(input: FactCheckInput!): FactCheck!
    voteFactCheck(id: ID!, vote: Int!): FactCheck!
    verifyFactCheck(id: ID!): FactCheck!

    # Reviews
    submitReview(input: ReviewInput!): Review!
    markReviewHelpful(id: ID!): Review!

    # Bounties
    createBounty(claim: String!, rewardAmount: Float!): Bounty!
    claimBounty(id: ID!): Bounty!
    completeBounty(id: ID!, factCheckId: ID!): Bounty!

    # User actions
    updateProfile(username: String, walletAddress: String): User!
  }

  # Subscriptions (real-time updates via WebSocket)
  type Subscription {
    factCheckAdded(category: String): FactCheck!
    bountyCreated: Bounty!
    appVerified(id: ID!): App!
  }
`;

module.exports = typeDefs;