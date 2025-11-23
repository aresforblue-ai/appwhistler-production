// src/backend/routes/privacy.js
// REST endpoints for GDPR/CCPA compliance (data export & deletion)

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');
const { formatErrorResponse } = require('../utils/errorHandler');
const { buildUserDataExport, logPrivacyRequest } = require('../utils/privacy');
const { sanitizePlainText } = require('../utils/sanitizer');

module.exports = function createPrivacyRouter(pool) {
  const router = express.Router();
  const policyPath = path.join(process.cwd(), 'docs', 'privacy-policy.md');

  // Export personal data (authentication required)
  router.post('/export', requireAuth, async (req, res) => {
    try {
      const userId = req.user.userId;
      const exportPayload = await buildUserDataExport(pool, userId);

      await logPrivacyRequest(pool, {
        userId,
        requestType: 'export',
        status: 'completed',
        payload: { itemCounts: {
          reviews: exportPayload.reviews.length,
          factChecks: exportPayload.factChecks.length,
          bounties: exportPayload.bounties.length,
          activity: exportPayload.activity.length
        }}
      });

      return res.json({ success: true, data: exportPayload });
    } catch (error) {
      logger.error('Privacy export failed:', error);
      return res.status(500).json(formatErrorResponse(error, 'INTERNAL_SERVER_ERROR'));
    }
  });

  // Delete personal data (irreversible)
  router.post('/delete', requireAuth, async (req, res) => {
    try {
      const userId = req.user.userId;
      const reason = req.body?.reason ? sanitizePlainText(req.body.reason) : null;

      // Remove user-linked content
      await pool.query('DELETE FROM reviews WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM activity_log WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM auth_tokens WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM recommendations WHERE user_id = $1', [userId]);
      await pool.query('UPDATE fact_checks SET submitted_by = NULL WHERE submitted_by = $1', [userId]);
      await pool.query('UPDATE fact_checks SET verified_by = NULL WHERE verified_by = $1', [userId]);
      await pool.query('UPDATE bounties SET creator_id = NULL WHERE creator_id = $1', [userId]);
      await pool.query('UPDATE bounties SET claimer_id = NULL WHERE claimer_id = $1', [userId]);

      const safeIdFragment = userId.replace(/-/g, '').slice(0, 12) || 'anon';
      const anonymizedUsername = `deleted_${safeIdFragment}_${Date.now()}`;
      const anonymizedEmail = `deleted+${safeIdFragment}@appwhistler.local`;
      const randomHash = crypto.randomBytes(32).toString('hex');

      const anonymizeResult = await pool.query(
        `UPDATE users
         SET username = $2,
             email = $3,
             wallet_address = NULL,
             password_hash = $4,
             truth_score = 0,
             is_verified = FALSE,
             role = 'user',
             deleted_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id`,
        [userId, anonymizedUsername, anonymizedEmail, randomHash]
      );

      if (anonymizeResult.rowCount === 0) {
        return res.status(404).json({ success: false, error: { message: 'User not found.' } });
      }

      const payload = { reason: reason || null };
      await logPrivacyRequest(pool, {
        userId,
        requestType: 'delete',
        status: 'completed',
        payload
      });

      return res.json({ success: true, message: 'Account anonymized and scheduled for logout across sessions.' });
    } catch (error) {
      logger.error('Privacy deletion failed:', error);
      return res.status(500).json(formatErrorResponse(error, 'INTERNAL_SERVER_ERROR'));
    }
  });

  // Serve draft privacy policy for convenience
  router.get('/policy', (req, res) => {
    try {
      const markdown = fs.readFileSync(policyPath, 'utf8');
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      return res.send(markdown);
    } catch (error) {
      logger.error('Failed to read privacy policy file:', error);
      return res.status(500).json(formatErrorResponse(error, 'INTERNAL_SERVER_ERROR'));
    }
  });

  return router;
};
