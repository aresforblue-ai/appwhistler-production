-- database/schema.sql
-- AppWhistler Database Schema - PostgreSQL & SQLite Compatible

-- Apps table - Core app information
CREATE TABLE IF NOT EXISTS apps (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  package_id VARCHAR(255) UNIQUE NOT NULL,
  category VARCHAR(100),
  description TEXT,
  developer VARCHAR(255),
  icon_url TEXT,
  website_url TEXT,
  
  -- Truth metrics
  privacy_score INTEGER DEFAULT 50 CHECK (privacy_score >= 0 AND privacy_score <= 100),
  security_score INTEGER DEFAULT 50 CHECK (security_score >= 0 AND security_score <= 100),
  truth_rating INTEGER DEFAULT 50 CHECK (truth_rating >= 0 AND truth_rating <= 100),
  
  -- Metadata
  download_count BIGINT DEFAULT 0,
  platform VARCHAR(50) NOT NULL, -- 'android', 'ios', 'web'
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by_user_id INTEGER,
  average_rating DECIMAL(3,2) DEFAULT 0.0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table - Authentication and profiles
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  
  -- Blockchain
  wallet_address VARCHAR(255) UNIQUE,
  
  -- Reputation
  truth_score INTEGER DEFAULT 0,
  reputation INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  role VARCHAR(50) DEFAULT 'user', -- 'user', 'moderator', 'admin'
  
  -- Profile
  avatar_url TEXT,
  avatar_thumbnail_url TEXT,
  avatar_ipfs_hash VARCHAR(255),
  avatar_uploaded_at TIMESTAMP,
  bio TEXT,
  social_links TEXT,

  -- Settings (JSON for flexibility)
  preferences JSONB,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- Reviews table - User app reviews
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(app_id, user_id) -- One review per user per app
);

-- Fact checks table - Verified claims
CREATE TABLE IF NOT EXISTS fact_checks (
  id SERIAL PRIMARY KEY,
  claim TEXT NOT NULL,
  verdict VARCHAR(50) NOT NULL, -- 'true', 'false', 'misleading', 'unverified'
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  evidence TEXT,
  explanation TEXT,
  sources TEXT[], -- Array of source URLs
  category VARCHAR(100),
  image_url TEXT,
  checked_by_user_id INTEGER REFERENCES users(id),
  submitted_by INTEGER REFERENCES users(id),
  verified_by INTEGER REFERENCES users(id),
  blockchain_proof_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fact check votes table - User votes on fact checks
CREATE TABLE IF NOT EXISTS fact_check_votes (
  id SERIAL PRIMARY KEY,
  fact_check_id INTEGER NOT NULL REFERENCES fact_checks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote_type VARCHAR(20) NOT NULL CHECK (vote_type IN ('agree', 'disagree', 'unsure')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(fact_check_id, user_id) -- One vote per user per fact check
);

-- Fact check appeals table - Appeals for disputed fact checks
CREATE TABLE IF NOT EXISTS fact_check_appeals (
  id SERIAL PRIMARY KEY,
  fact_check_id INTEGER NOT NULL REFERENCES fact_checks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bounties table - Rewards for fact-checking contributions
CREATE TABLE IF NOT EXISTS bounties (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  reward_amount DECIMAL(18, 8) NOT NULL, -- Crypto amount
  currency VARCHAR(20) DEFAULT 'ETH',
  creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  claim_id TEXT, -- Claim to be fact-checked
  winner_id INTEGER REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'open', -- 'open', 'claimed', 'completed', 'cancelled'
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Blockchain transactions table - Blockchain verification records
CREATE TABLE IF NOT EXISTS blockchain_transactions (
  id SERIAL PRIMARY KEY,
  transaction_hash VARCHAR(255) UNIQUE NOT NULL,
  blockchain VARCHAR(50) NOT NULL, -- 'ethereum', 'polygon', etc.
  transaction_type VARCHAR(50) NOT NULL, -- 'verification', 'bounty_payment', etc.
  from_address VARCHAR(255),
  to_address VARCHAR(255),
  amount DECIMAL(18, 8),
  gas_used BIGINT,
  block_number BIGINT,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'failed'
  metadata JSONB, -- Additional transaction data
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP
);

-- Activity log table - User activity tracking
CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(100) NOT NULL, -- 'login', 'fact_check_submitted', 'review_created', etc.
  description TEXT,
  ip_address VARCHAR(45), -- IPv4 or IPv6
  user_agent TEXT,
  metadata JSONB, -- Additional activity data
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password reset requests table - Password reset token management
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  consumed_at TIMESTAMP,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recommendations table - Personalized app recommendations
CREATE TABLE IF NOT EXISTS recommendations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  score DECIMAL(5, 2) NOT NULL, -- Recommendation confidence score
  reason TEXT, -- Why this app is recommended
  algorithm VARCHAR(100), -- Recommendation algorithm used
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, app_id) -- One recommendation per user per app
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_apps_category ON apps(category);
CREATE INDEX IF NOT EXISTS idx_apps_platform ON apps(platform);
CREATE INDEX IF NOT EXISTS idx_apps_truth_rating ON apps(truth_rating DESC);
CREATE INDEX IF NOT EXISTS idx_apps_download_count ON apps(download_count DESC);
CREATE INDEX IF NOT EXISTS idx_apps_created_at ON apps(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_truth_score ON users(truth_score DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_app_id ON reviews(app_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fact_checks_category ON fact_checks(category);
CREATE INDEX IF NOT EXISTS idx_fact_checks_verdict ON fact_checks(verdict);
CREATE INDEX IF NOT EXISTS idx_fact_checks_created_at ON fact_checks(created_at DESC);

-- ============================================================================
-- PERFORMANCE INDEXES FOR COMPLEX QUERIES
-- ============================================================================
-- These composite and specialized indexes optimize common query patterns
-- identified in the GraphQL resolvers and prevent full table scans.

-- Composite index for filtered app queries (category + platform + rating sort)
-- Optimizes: queries filtering by category and platform, sorted by truth_rating
-- Used in: trendingApps, searchApps with category/platform filters
CREATE INDEX IF NOT EXISTS idx_apps_category_platform_rating
  ON apps(category, platform, truth_rating DESC);

-- Composite index for verified app listings sorted by popularity
-- Optimizes: queries for verified apps on specific platforms, sorted by downloads
-- Used in: verified app queries, trending verified apps by platform
CREATE INDEX IF NOT EXISTS idx_apps_platform_verified_downloads
  ON apps(platform, is_verified, download_count DESC);

-- Partial index for verified apps only
-- Optimizes: queries that only need verified apps (WHERE is_verified = true)
-- Reduces index size by excluding non-verified apps (partial index)
-- Used in: verifiedApps query, fact-check verification lists
CREATE INDEX IF NOT EXISTS idx_apps_verified
  ON apps(is_verified) WHERE is_verified = true;

-- Index for role-based queries
-- Optimizes: admin/moderator queries, permission checks
-- Used in: user management, role-based filtering, authorization checks
CREATE INDEX IF NOT EXISTS idx_users_role
  ON users(role);

-- Composite index for review aggregations
-- Optimizes: calculating average ratings per app with rating distribution
-- Used in: app detail pages showing review statistics, rating filters
CREATE INDEX IF NOT EXISTS idx_reviews_app_rating
  ON reviews(app_id, rating);

-- Composite index for fact-check filtering and sorting
-- Optimizes: filtering fact-checks by category and verdict, sorted by date
-- Used in: fact-check feeds, category-specific fact-check lists
CREATE INDEX IF NOT EXISTS idx_fact_checks_category_verdict_created
  ON fact_checks(category, verdict, created_at DESC);

-- ============================================================================
-- FULL-TEXT SEARCH INDEXES (PostgreSQL GIN indexes)
-- ============================================================================
-- GIN (Generalized Inverted Index) indexes for efficient text search
-- Note: These use PostgreSQL-specific features and won't work with SQLite

-- Full-text search on app names
-- Optimizes: text search queries on app names using to_tsvector
-- Used in: searchApps query with text matching on name field
CREATE INDEX IF NOT EXISTS idx_apps_search_name
  ON apps USING gin(to_tsvector('english', name));

-- Full-text search on app descriptions
-- Optimizes: text search queries on app descriptions using to_tsvector
-- Used in: searchApps query with text matching on description field
CREATE INDEX IF NOT EXISTS idx_apps_search_description
  ON apps USING gin(to_tsvector('english', description));

-- ============================================================================
-- INDEXES FOR NEW TABLES
-- ============================================================================

-- Fact check votes indexes
CREATE INDEX IF NOT EXISTS idx_fact_check_votes_fact_check ON fact_check_votes(fact_check_id);
CREATE INDEX IF NOT EXISTS idx_fact_check_votes_user ON fact_check_votes(user_id);

-- Fact check appeals indexes
CREATE INDEX IF NOT EXISTS idx_fact_check_appeals_fact_check ON fact_check_appeals(fact_check_id);
CREATE INDEX IF NOT EXISTS idx_fact_check_appeals_user ON fact_check_appeals(user_id);
CREATE INDEX IF NOT EXISTS idx_fact_check_appeals_status ON fact_check_appeals(status);

-- Bounties indexes
CREATE INDEX IF NOT EXISTS idx_bounties_creator ON bounties(creator_id);
CREATE INDEX IF NOT EXISTS idx_bounties_winner ON bounties(winner_id);
CREATE INDEX IF NOT EXISTS idx_bounties_status ON bounties(status);
CREATE INDEX IF NOT EXISTS idx_bounties_created_at ON bounties(created_at DESC);

-- Blockchain transactions indexes
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_hash ON blockchain_transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_status ON blockchain_transactions(status);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_type ON blockchain_transactions(transaction_type);

-- Activity log indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

-- Password reset requests indexes
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_requests(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_requests(expires_at);

-- Recommendations indexes
CREATE INDEX IF NOT EXISTS idx_recommendations_user ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_app ON recommendations(app_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_score ON recommendations(score DESC);
