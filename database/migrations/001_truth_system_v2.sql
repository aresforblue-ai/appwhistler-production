-- ============================================================================
-- APPWHISTLER TRUTH VERIFICATION SYSTEM V2.0 - DATABASE MIGRATION
-- ============================================================================
-- This migration adds comprehensive truth analysis capabilities with
-- specialized agent data storage, review authenticity tracking, and
-- multi-source verification support.
--
-- Migration: 001
-- Date: 2025-11-23
-- Version: 2.0
-- ============================================================================

-- ============================================================================
-- 1. APP TRUTH ANALYSIS - Comprehensive Analysis Storage
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_truth_analysis (
  id SERIAL PRIMARY KEY,
  app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,

  -- Overall Scores (0-100)
  overall_truth_score INTEGER CHECK (overall_truth_score >= 0 AND overall_truth_score <= 100),
  letter_grade VARCHAR(3), -- 'A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'

  -- Component Scores (0-100 each)
  social_presence_score INTEGER CHECK (social_presence_score >= 0 AND social_presence_score <= 100),
  financial_transparency_score INTEGER CHECK (financial_transparency_score >= 0 AND financial_transparency_score <= 100),
  review_authenticity_score INTEGER CHECK (review_authenticity_score >= 0 AND review_authenticity_score <= 100),
  developer_credibility_score INTEGER CHECK (developer_credibility_score >= 0 AND developer_credibility_score <= 100),
  security_privacy_score INTEGER CHECK (security_privacy_score >= 0 AND security_privacy_score <= 100),

  -- Detailed Analysis (JSONB for flexibility)
  social_analysis JSONB,
  financial_analysis JSONB,
  review_analysis JSONB,
  developer_analysis JSONB,
  security_analysis JSONB,

  -- Metadata
  last_analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  analysis_version VARCHAR(10) DEFAULT '2.0',
  confidence_level INTEGER DEFAULT 0 CHECK (confidence_level >= 0 AND confidence_level <= 100),

  -- Red flags and warnings
  red_flags JSONB DEFAULT '[]'::jsonb,
  warning_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Ensure one analysis per app (can be updated)
  UNIQUE(app_id)
);

COMMENT ON TABLE app_truth_analysis IS 'Stores comprehensive truth verification analysis for apps with multi-dimensional scoring';
COMMENT ON COLUMN app_truth_analysis.overall_truth_score IS 'Weighted composite score (0-100) from all analysis components';
COMMENT ON COLUMN app_truth_analysis.confidence_level IS 'Confidence in this analysis (0-100), affects final score';
COMMENT ON COLUMN app_truth_analysis.red_flags IS 'Array of detected red flags with severity and evidence';

-- ============================================================================
-- 2. REVIEW AUTHENTICITY - Fake Review Detection
-- ============================================================================

CREATE TABLE IF NOT EXISTS review_authenticity (
  id SERIAL PRIMARY KEY,
  review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,

  -- Authenticity Analysis
  authenticity_score INTEGER CHECK (authenticity_score >= 0 AND authenticity_score <= 100),
  is_likely_fake BOOLEAN DEFAULT FALSE,
  is_paid_endorsement BOOLEAN DEFAULT FALSE,
  has_bias_indicators BOOLEAN DEFAULT FALSE,

  -- Detection Indicators
  indicators JSONB DEFAULT '{}'::jsonb,
  -- Example structure:
  -- {
  --   "generic_language": true,
  --   "new_account": true,
  --   "timing_cluster": false,
  --   "sponsored_keywords": false,
  --   "profile_age_days": 3,
  --   "review_detail_score": 45,
  --   "language_naturalness": 0.67
  -- }

  -- Evidence and Reasoning
  evidence_summary TEXT,
  flagged_reason VARCHAR(255),

  -- Metadata
  analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  analyzer_version VARCHAR(10) DEFAULT '2.0',

  -- Ensure one analysis per review
  UNIQUE(review_id)
);

COMMENT ON TABLE review_authenticity IS 'Tracks authenticity analysis for user reviews, detecting fake/paid/biased content';
COMMENT ON COLUMN review_authenticity.authenticity_score IS 'Review authenticity score (0-100), higher = more authentic';
COMMENT ON COLUMN review_authenticity.indicators IS 'JSONB object with detection algorithm indicators';

-- ============================================================================
-- 3. SOCIAL MEDIA EVIDENCE - Cross-Platform Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_media_evidence (
  id SERIAL PRIMARY KEY,
  app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,

  -- Platform Information
  platform VARCHAR(50) NOT NULL, -- 'twitter', 'reddit', 'github', 'linkedin', 'hackernews', 'youtube'
  platform_id VARCHAR(255), -- External platform ID (tweet_id, reddit_post_id, etc.)
  url TEXT NOT NULL,

  -- Content
  content TEXT,
  author VARCHAR(255),
  author_verified BOOLEAN DEFAULT FALSE,

  -- Analysis
  sentiment VARCHAR(20), -- 'positive', 'negative', 'neutral', 'controversial', 'mixed'
  credibility_impact INTEGER CHECK (credibility_impact >= -100 AND credibility_impact <= 100),
  relevance_score INTEGER DEFAULT 50 CHECK (relevance_score >= 0 AND relevance_score <= 100),

  -- Metadata
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  post_date TIMESTAMP,

  -- Full context (for AI analysis)
  context JSONB DEFAULT '{}'::jsonb
  -- Example:
  -- {
  --   "likes": 234,
  --   "retweets": 45,
  --   "replies": 12,
  --   "engagement_rate": 0.15
  -- }
);

COMMENT ON TABLE social_media_evidence IS 'Stores social media mentions, reviews, and discussions about apps';
COMMENT ON COLUMN social_media_evidence.credibility_impact IS 'Impact on credibility score (-100 to +100)';
COMMENT ON COLUMN social_media_evidence.relevance_score IS 'How relevant this evidence is to truth assessment';

-- ============================================================================
-- 4. FINANCIAL RECORDS - Money Trail Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_records (
  id SERIAL PRIMARY KEY,
  app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,

  -- Funding Information
  funding_total VARCHAR(50), -- e.g., "$50M", "Bootstrapped"
  funding_rounds JSONB DEFAULT '[]'::jsonb,
  -- Example:
  -- [
  --   {
  --     "round": "Series A",
  --     "amount": "$10M",
  --     "date": "2023-06-15",
  --     "lead_investor": "Acme Ventures"
  --   }
  -- ]

  -- Investors
  investors JSONB DEFAULT '[]'::jsonb,
  -- Example:
  -- [
  --   {
  --     "name": "Acme Ventures",
  --     "reputation_score": 85,
  --     "ethical_concerns": [],
  --     "country": "USA"
  --   }
  -- ]

  -- Ownership
  ownership JSONB DEFAULT '{}'::jsonb,
  -- Example:
  -- {
  --   "parent_company": "TechCorp Inc.",
  --   "country": "USA",
  --   "public_filings": true,
  --   "ownership_type": "private",
  --   "beneficial_owners": []
  -- }

  -- Revenue Model
  revenue_model VARCHAR(100), -- 'subscription', 'ads', 'freemium', 'data_monetization', etc.
  declared_revenue_model VARCHAR(100),
  verified_revenue_match BOOLEAN,

  -- Analysis
  transparency_score INTEGER CHECK (transparency_score >= 0 AND transparency_score <= 100),
  red_flags JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_sources JSONB DEFAULT '[]'::jsonb,

  -- Ensure one record per app
  UNIQUE(app_id)
);

COMMENT ON TABLE financial_records IS 'Tracks funding, ownership, and revenue model transparency for apps';
COMMENT ON COLUMN financial_records.transparency_score IS 'Financial transparency score (0-100)';

-- ============================================================================
-- 5. DEVELOPER PROFILES - Background Checks
-- ============================================================================

CREATE TABLE IF NOT EXISTS developer_profiles (
  id SERIAL PRIMARY KEY,
  app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,

  -- Developer Information
  developer_name VARCHAR(255),
  company_name VARCHAR(255),
  company_country VARCHAR(100),

  -- Experience
  years_active INTEGER,
  team_size INTEGER,

  -- Previous Apps
  previous_apps JSONB DEFAULT '[]'::jsonb,
  -- Example:
  -- [
  --   {
  --     "name": "OldApp",
  --     "platform": "ios",
  --     "rating": 4.2,
  --     "downloads": "1M+",
  --     "controversies": []
  --   }
  -- ]

  -- Incident History
  incident_history JSONB DEFAULT '{}'::jsonb,
  -- Example:
  -- {
  --   "security_breaches": 0,
  --   "privacy_violations": 0,
  --   "lawsuits": 0,
  --   "app_store_removals": 0,
  --   "details": []
  -- }

  -- Code Quality Metrics
  code_quality_metrics JSONB DEFAULT '{}'::jsonb,
  -- Example:
  -- {
  --   "github_stars": 2340,
  --   "code_review_score": 85,
  --   "open_source_contributions": true,
  --   "stack_overflow_reputation": 5400
  -- }

  -- Analysis
  credibility_score INTEGER CHECK (credibility_score >= 0 AND credibility_score <= 100),

  -- Metadata
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_sources JSONB DEFAULT '[]'::jsonb,

  -- Ensure one profile per app
  UNIQUE(app_id)
);

COMMENT ON TABLE developer_profiles IS 'Stores developer/company background checks and credibility analysis';
COMMENT ON COLUMN developer_profiles.credibility_score IS 'Developer credibility score (0-100)';

-- ============================================================================
-- 6. SECURITY ANALYSIS - Security & Privacy Assessment
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_analysis (
  id SERIAL PRIMARY KEY,
  app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,

  -- Security Scores
  security_score INTEGER CHECK (security_score >= 0 AND security_score <= 100),
  privacy_score INTEGER CHECK (privacy_score >= 0 AND privacy_score <= 100),

  -- Permissions Analysis
  permissions JSONB DEFAULT '{}'::jsonb,
  -- Example:
  -- {
  --   "requested": ["camera", "location", "contacts"],
  --   "justified": ["camera"],
  --   "suspicious": ["contacts"],
  --   "explanation_quality": "medium",
  --   "over_privileged": true
  -- }

  -- Third-Party Trackers
  third_party_trackers JSONB DEFAULT '[]'::jsonb,
  -- Example:
  -- [
  --   {
  --     "name": "Google Analytics",
  --     "purpose": "Analytics",
  --     "data_shared": ["usage patterns"],
  --     "disclosed": true,
  --     "privacy_risk": "low"
  --   }
  -- ]

  -- Vulnerabilities
  vulnerabilities JSONB DEFAULT '[]'::jsonb,
  -- Example:
  -- [
  --   {
  --     "cve_id": "CVE-2023-1234",
  --     "severity": "medium",
  --     "patched": true,
  --     "description": "XSS vulnerability in input field"
  --   }
  -- ]

  -- Encryption & Security Standards
  encryption_standard VARCHAR(50), -- 'TLS 1.3', 'TLS 1.2', 'None', etc.
  certificate_valid BOOLEAN,

  -- Data Collection
  data_collection JSONB DEFAULT '{}'::jsonb,
  -- Example:
  -- {
  --   "disclosed": ["email", "usage data", "location"],
  --   "undisclosed_detected": [],
  --   "data_retention_period": "2 years",
  --   "data_deletion_available": true
  -- }

  -- Metadata
  last_scan_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  scanner_version VARCHAR(10) DEFAULT '2.0',

  -- Ensure one analysis per app
  UNIQUE(app_id)
);

COMMENT ON TABLE security_analysis IS 'Stores security and privacy analysis including permissions, trackers, and vulnerabilities';
COMMENT ON COLUMN security_analysis.security_score IS 'Overall security score (0-100)';
COMMENT ON COLUMN security_analysis.privacy_score IS 'Overall privacy score (0-100)';

-- ============================================================================
-- 7. ANALYSIS JOBS - Background Job Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS analysis_jobs (
  id SERIAL PRIMARY KEY,
  app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,

  -- Job Information
  job_type VARCHAR(50) NOT NULL, -- 'full_analysis', 'review_check', 'social_scan', 'financial_check', 'security_scan'
  status VARCHAR(20) DEFAULT 'queued', -- 'queued', 'running', 'completed', 'failed'
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

  -- Execution
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_seconds INTEGER,

  -- Results
  result JSONB,
  error_message TEXT,

  -- Agent Information
  agent_version VARCHAR(10) DEFAULT '2.0',
  agents_used JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),

  -- Priority for queue
  priority INTEGER DEFAULT 0
);

COMMENT ON TABLE analysis_jobs IS 'Tracks background analysis jobs for truth verification';
COMMENT ON COLUMN analysis_jobs.job_type IS 'Type of analysis: full_analysis, review_check, social_scan, etc.';
COMMENT ON COLUMN analysis_jobs.progress IS 'Job progress percentage (0-100)';

-- ============================================================================
-- 8. RED FLAGS - Centralized Red Flag Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS red_flags (
  id SERIAL PRIMARY KEY,
  app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,

  -- Red Flag Details
  severity VARCHAR(20) NOT NULL, -- 'critical', 'major', 'minor'
  category VARCHAR(50) NOT NULL, -- 'privacy', 'security', 'financial', 'reviews', 'developer'
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,

  -- Evidence
  evidence TEXT,
  evidence_urls JSONB DEFAULT '[]'::jsonb,

  -- Impact
  score_impact INTEGER, -- Negative impact on truth score
  auto_flagged BOOLEAN DEFAULT TRUE,
  verified_by_human BOOLEAN DEFAULT FALSE,

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'resolved', 'disputed'
  resolved_at TIMESTAMP,
  resolution_notes TEXT,

  -- Metadata
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  detected_by_agent VARCHAR(100)
);

COMMENT ON TABLE red_flags IS 'Centralized tracking of red flags detected by analysis agents';
COMMENT ON COLUMN red_flags.severity IS 'Severity: critical (major concerns), major (significant issues), minor (small concerns)';
COMMENT ON COLUMN red_flags.score_impact IS 'Negative impact on truth score';

-- ============================================================================
-- 9. INDEXES FOR PERFORMANCE
-- ============================================================================

-- App Truth Analysis
CREATE INDEX idx_app_truth_analysis_app_id ON app_truth_analysis(app_id);
CREATE INDEX idx_app_truth_analysis_score ON app_truth_analysis(overall_truth_score DESC);
CREATE INDEX idx_app_truth_analysis_updated ON app_truth_analysis(updated_at DESC);

-- Review Authenticity
CREATE INDEX idx_review_authenticity_review_id ON review_authenticity(review_id);
CREATE INDEX idx_review_authenticity_fake ON review_authenticity(is_likely_fake) WHERE is_likely_fake = true;
CREATE INDEX idx_review_authenticity_paid ON review_authenticity(is_paid_endorsement) WHERE is_paid_endorsement = true;
CREATE INDEX idx_review_authenticity_score ON review_authenticity(authenticity_score);

-- Social Media Evidence
CREATE INDEX idx_social_media_evidence_app_id ON social_media_evidence(app_id);
CREATE INDEX idx_social_media_evidence_platform ON social_media_evidence(platform);
CREATE INDEX idx_social_media_evidence_sentiment ON social_media_evidence(sentiment);
CREATE INDEX idx_social_media_evidence_discovered ON social_media_evidence(discovered_at DESC);

-- Financial Records
CREATE INDEX idx_financial_records_app_id ON financial_records(app_id);
CREATE INDEX idx_financial_records_transparency ON financial_records(transparency_score);

-- Developer Profiles
CREATE INDEX idx_developer_profiles_app_id ON developer_profiles(app_id);
CREATE INDEX idx_developer_profiles_credibility ON developer_profiles(credibility_score);

-- Security Analysis
CREATE INDEX idx_security_analysis_app_id ON security_analysis(app_id);
CREATE INDEX idx_security_analysis_security_score ON security_analysis(security_score);
CREATE INDEX idx_security_analysis_privacy_score ON security_analysis(privacy_score);

-- Analysis Jobs
CREATE INDEX idx_analysis_jobs_app_id ON analysis_jobs(app_id);
CREATE INDEX idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX idx_analysis_jobs_created ON analysis_jobs(created_at DESC);
CREATE INDEX idx_analysis_jobs_priority ON analysis_jobs(priority DESC, created_at ASC);

-- Red Flags
CREATE INDEX idx_red_flags_app_id ON red_flags(app_id);
CREATE INDEX idx_red_flags_severity ON red_flags(severity);
CREATE INDEX idx_red_flags_status ON red_flags(status);
CREATE INDEX idx_red_flags_detected ON red_flags(detected_at DESC);

-- ============================================================================
-- 10. TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Auto-update updated_at timestamp for app_truth_analysis
CREATE OR REPLACE FUNCTION update_truth_analysis_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_app_truth_analysis_timestamp
BEFORE UPDATE ON app_truth_analysis
FOR EACH ROW
EXECUTE FUNCTION update_truth_analysis_timestamp();

-- ============================================================================
-- 11. SAMPLE DATA (For Development)
-- ============================================================================

-- This will be populated by the analysis agents in production
-- For development, you can add sample data here

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
