-- database/seed.sql
-- Demo data for AppWhistler - Truth-rated apps

-- Insert demo apps with varied truth ratings
INSERT INTO apps (name, package_id, category, description, developer, truth_rating, download_count, platform, is_verified, average_rating) VALUES
('TruthGuard News', 'com.truthguard.news', 'news', 'AI-powered fact-checking for news articles in real-time. Verifies claims against trusted databases and flags misinformation instantly.', 'TruthTech Inc', 95, 2500000, 'android', TRUE, 4.7),

('SourceTrace', 'com.sourcetrace.app', 'research', 'Track information origins across social platforms. See the complete chain of how news spreads and identify original sources.', 'OpenVerify Labs', 92, 850000, 'android', TRUE, 4.6),

('FactCheck Pro', 'com.factcheck.pro', 'verification', 'Real-time claim verification with trusted fact-checking databases. Integrates with Snopes, PolitiFact, and FactCheck.org.', 'VerifyNow', 98, 1200000, 'android', TRUE, 4.8),

('MediaLens', 'com.medialens.analyzer', 'news', 'Media bias analyzer with sentiment detection. Identifies political leaning and emotional manipulation in articles.', 'Neutral Media Co', 88, 450000, 'android', TRUE, 4.3),

('TruthScore Social', 'com.truthscore.social', 'social', 'Crowdsourced fact-checking by verified experts. Community-driven truth ratings for viral claims.', 'CommunityTruth', 84, 3200000, 'android', TRUE, 4.5),

('DeepFake Detector', 'com.deepfake.detect', 'verification', 'Detects AI-generated deepfakes and manipulated content. Uses advanced ML to identify synthetic media.', 'AI Safety Labs', 91, 680000, 'android', TRUE, 4.6),

('NewsGuardian', 'com.newsguardian.app', 'news', 'Browser extension that rates news sources. Shows credibility scores for websites and articles.', 'MediaWatch Foundation', 87, 1900000, 'android', TRUE, 4.4),

('ClaimCheck', 'com.claimcheck.mobile', 'verification', 'Instant claim verification via screenshot or text. Checks facts while you browse social media.', 'QuickVerify Inc', 82, 560000, 'android', FALSE, 4.2),

('InfoShield', 'com.infoshield.security', 'verification', 'Protects against phishing and scam websites. Real-time security scanning and threat detection.', 'CyberShield Labs', 94, 4100000, 'android', TRUE, 4.7),

('TrendAnalyzer', 'com.trend.analyzer', 'research', 'Identifies viral misinformation early. Tracks trending false claims before they spread widely.', 'Viral Truth', 79, 290000, 'android', FALSE, 4.0),

('CredScore News', 'com.credscore.news', 'news', 'Journalist credibility tracker. Rates reporters based on accuracy history and corrections issued.', 'JournoTrust', 86, 720000, 'android', TRUE, 4.3),

('VerifyMe', 'com.verifyme.claims', 'verification', 'Personal fact-checker assistant. Paste any claim and get instant verification with sources.', 'SmartCheck', 90, 1500000, 'android', TRUE, 4.5);

-- Insert demo user (password: 'demo123' - hashed with bcrypt)
INSERT INTO users (username, email, password_hash, truth_score, reputation, is_verified, role) VALUES
('demo_user', 'demo@appwhistler.com', '$2a$10$rB3qNqHvXqPEJzJZK.T3.uH6qWEqYx0vE0ZqYI6qWOGT9QqKHNIWi', 250, 85, TRUE, 'user');

-- Insert sample reviews
INSERT INTO reviews (app_id, user_id, rating, review_text, is_verified_purchase) VALUES
(1, 1, 5, 'Best fact-checking app I''ve used! Caught several fake news articles before I shared them.', TRUE),
(2, 1, 5, 'Love being able to trace back to original sources. Eye-opening!', TRUE),
(3, 1, 4, 'Very accurate, but sometimes slow to load. Still the best option available.', TRUE);

-- Insert sample fact checks
INSERT INTO fact_checks (claim, verdict, confidence_score, evidence, category, checked_by_user_id) VALUES
('Vaccines cause autism', 'false', 99, 'Multiple peer-reviewed studies from CDC, WHO, and NIH have found no link between vaccines and autism. The original study claiming this was retracted due to fraudulent data.', 'health', 1),
('Earth is flat', 'false', 100, 'Direct photographic evidence from satellites and ISS, physics of gravity and planetary formation, circumnavigation, and countless scientific observations prove Earth is spherical.', 'science', 1),
('5G causes COVID-19', 'false', 100, 'COVID-19 is caused by SARS-CoV-2 virus. 5G is non-ionizing radiation that cannot affect biological systems. Countries without 5G also had COVID-19 outbreaks.', 'health', 1);
