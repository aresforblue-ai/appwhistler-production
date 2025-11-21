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
  bio TEXT,
  
  -- Settings (JSON for flexibility)
  preferences JSONB,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
  sources TEXT[], -- Array of source URLs
  category VARCHAR(100),
  checked_by_user_id INTEGER REFERENCES users(id),
  blockchain_proof_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
