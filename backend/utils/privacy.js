// src/backend/utils/privacy.js
// Helpers for GDPR/CCPA compliance workflows

const { v4: uuidv4 } = require('uuid');

async function logPrivacyRequest(pool, { userId, requestType, status = 'completed', payload = {} }) {
  const result = await pool.query(
    `INSERT INTO privacy_requests (user_id, request_type, status, payload)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, requestType, status, JSON.stringify(payload)]
  );
  return result.rows[0];
}

async function buildUserDataExport(pool, userId) {
  const user = await pool.query(
    `SELECT id, username, email, wallet_address AS "walletAddress", truth_score AS "truthScore",
            is_verified AS "isVerified", role, created_at AS "createdAt", updated_at AS "updatedAt"
     FROM users WHERE id = $1`,
    [userId]
  );

  const reviews = await pool.query(
    `SELECT r.id, r.app_id AS "appId", r.rating, r.review_text AS "reviewText", r.created_at AS "createdAt"
     FROM reviews r WHERE r.user_id = $1 ORDER BY r.created_at DESC`,
    [userId]
  );

  const factChecks = await pool.query(
    `SELECT id, claim, verdict, confidence_score AS "confidenceScore", sources, explanation,
            category, image_url AS "imageUrl", created_at AS "createdAt"
     FROM fact_checks WHERE submitted_by = $1 ORDER BY created_at DESC`,
    [userId]
  );

  const bounties = await pool.query(
    `SELECT id, claim, reward_amount AS "rewardAmount", status, created_at AS "createdAt", closed_at AS "closedAt"
     FROM bounties WHERE creator_id = $1 OR claimer_id = $1 ORDER BY created_at DESC`,
    [userId]
  );

  const activityLog = await pool.query(
    `SELECT id, action, metadata, ip_address AS "ipAddress", user_agent AS "userAgent", created_at AS "createdAt"
     FROM activity_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 500`,
    [userId]
  );

  return {
    exportId: uuidv4(),
    generatedAt: new Date().toISOString(),
    user: user.rows[0] || null,
    reviews: reviews.rows,
    factChecks: factChecks.rows,
    bounties: bounties.rows,
    activity: activityLog.rows
  };
}

module.exports = {
  logPrivacyRequest,
  buildUserDataExport
};
