// GraphQL Queries and Mutations for AppWhistler
// These connect to the backend GraphQL server

import { gql } from '@apollo/client';

// ==================== QUERIES ====================

// Get trending apps (top 10 by download count)
export const GET_TRENDING_APPS = gql`
  query GetTrendingApps($limit: Int) {
    trendingApps(limit: $limit) {
      id
      name
      packageId
      category
      description
      developer
      iconUrl
      websiteUrl
      truthRating
      downloadCount
      platform
      isVerified
      averageRating
      createdAt
    }
  }
`;

// Search apps with filters
export const SEARCH_APPS = gql`
  query SearchApps(
    $search: String
    $category: String
    $platform: String
    $minTruthRating: Float
    $limit: Int
    $offset: Int
  ) {
    apps(
      search: $search
      category: $category
      platform: $platform
      minTruthRating: $minTruthRating
      limit: $limit
      offset: $offset
    ) {
      edges {
        id
        name
        packageId
        category
        description
        developer
        iconUrl
        truthRating
        downloadCount
        platform
        isVerified
        averageRating
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

// Get single app details
export const GET_APP = gql`
  query GetApp($id: ID!) {
    app(id: $id) {
      id
      name
      packageId
      category
      description
      developer
      iconUrl
      websiteUrl
      privacyScore
      securityScore
      truthRating
      downloadCount
      platform
      isVerified
      verifiedBy {
        id
        username
      }
      reviews {
        id
        rating
        reviewText
        user {
          username
        }
        createdAt
      }
      averageRating
      createdAt
      updatedAt
    }
  }
`;

// Get current user info
export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    me {
      id
      username
      email
      walletAddress
      truthScore
      reputation
      isVerified
      role
      avatarUrl
      bio
      socialLinks {
        platform
        url
      }
      preferences {
        theme
        notifications {
          email
          push
          inApp
        }
        privacy {
          profileVisibility
          showReputation
        }
      }
      createdAt
    }
  }
`;

// Get leaderboard (top users by truth score)
export const GET_LEADERBOARD = gql`
  query GetLeaderboard($limit: Int) {
    leaderboard(limit: $limit) {
      id
      username
      truthScore
      reputation
      avatarUrl
      isVerified
    }
  }
`;

// ==================== MUTATIONS ====================

// User registration
export const REGISTER_USER = gql`
  mutation RegisterUser($input: RegisterInput!) {
    register(input: $input) {
      token
      refreshToken
      user {
        id
        username
        email
        truthScore
        role
      }
    }
  }
`;

// User login
export const LOGIN_USER = gql`
  mutation LoginUser($input: LoginInput!) {
    login(input: $input) {
      token
      refreshToken
      user {
        id
        username
        email
        truthScore
        role
        avatarUrl
      }
    }
  }
`;

// User logout
export const LOGOUT_USER = gql`
  mutation LogoutUser {
    logout
  }
`;

// Submit app review
export const SUBMIT_REVIEW = gql`
  mutation SubmitReview($input: ReviewInput!) {
    submitReview(input: $input) {
      id
      rating
      reviewText
      createdAt
    }
  }
`;

// ==================== SUBSCRIPTIONS ====================

// Subscribe to new fact checks
export const FACT_CHECK_ADDED = gql`
  subscription OnFactCheckAdded($category: String) {
    factCheckAdded(category: $category) {
      id
      claim
      verdict
      confidenceScore
      category
      createdAt
    }
  }
`;

// Subscribe to app verifications
export const APP_VERIFIED = gql`
  subscription OnAppVerified($id: ID!) {
    appVerified(id: $id) {
      id
      name
      isVerified
      verifiedBy {
        username
      }
    }
  }
`;
