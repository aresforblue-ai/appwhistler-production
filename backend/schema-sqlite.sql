-- SQLite-compatible schema for AppWhistler
-- Simplified version without PostgreSQL-specific features

CREATE TABLE IF NOT EXISTS apps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  package_id TEXT UNIQUE NOT NULL,
  category TEXT,
  description TEXT,
  developer TEXT,
  icon_url TEXT,
  website_url TEXT,
  privacy_score INTEGER DEFAULT 50 CHECK (privacy_score >= 0 AND privacy_score <= 100),
  security_score INTEGER DEFAULT 50 CHECK (security_score >= 0 AND security_score <= 100),
  truth_rating INTEGER DEFAULT 50 CHECK (truth_rating >= 0 AND truth_rating <= 100),
  download_count INTEGER DEFAULT 0,
  platform TEXT NOT NULL,
  is_verified INTEGER DEFAULT 0,
  verified_by_user_id INTEGER,
  average_rating REAL DEFAULT 0.0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  wallet_address TEXT UNIQUE,
  truth_score INTEGER DEFAULT 0,
  reputation INTEGER DEFAULT 0,
  is_verified INTEGER DEFAULT 0,
  role TEXT DEFAULT 'user',
  avatar_url TEXT,
  bio TEXT,
  preferences TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_login TEXT
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_verified_purchase INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(app_id, user_id)
);

CREATE TABLE IF NOT EXISTS fact_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  claim TEXT NOT NULL,
  verdict TEXT NOT NULL,
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  evidence TEXT,
  sources TEXT,
  category TEXT,
  checked_by_user_id INTEGER REFERENCES users(id),
  blockchain_proof_hash TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Basic indexes
CREATE INDEX IF NOT EXISTS idx_apps_category ON apps(category);
CREATE INDEX IF NOT EXISTS idx_apps_platform ON apps(platform);
CREATE INDEX IF NOT EXISTS idx_apps_truth_rating ON apps(truth_rating DESC);
CREATE INDEX IF NOT EXISTS idx_apps_download_count ON apps(download_count DESC);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE INDEX IF NOT EXISTS idx_reviews_app_id ON reviews(app_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);

CREATE INDEX IF NOT EXISTS idx_fact_checks_category ON fact_checks(category);
