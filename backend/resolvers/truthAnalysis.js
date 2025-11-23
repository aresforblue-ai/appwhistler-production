// Truth Analysis Resolvers - Connect 5-agent system to GraphQL API
// Handles comprehensive app truth verification with AI-powered analysis

const AgentOrchestrator = require('../agents/AgentOrchestrator');
const { createGraphQLError } = require('../utils/errorHandler');
const { requireAuth, requireRole } = require('./helpers');

// Initialize the agent orchestrator
const orchestrator = new AgentOrchestrator();

module.exports = {
  // App type resolvers for truth verification fields
  App: {
    /**
     * Resolve truthAnalysis field on App type
     * Returns most recent truth analysis for the app
     */
    truthAnalysis: async (parent, _, { pool }) => {
      try {
        const result = await pool.query(
          `SELECT * FROM app_truth_analysis
           WHERE app_id = $1
           ORDER BY last_analyzed_at DESC
           LIMIT 1`,
          [parent.id]
        );

        if (result.rows.length === 0) {
          return null;
        }

        const analysis = result.rows[0];
        return {
          id: analysis.id,
          appId: analysis.app_id,
          overallTruthScore: analysis.overall_truth_score,
          letterGrade: analysis.letter_grade,
          socialPresenceScore: analysis.social_presence_score,
          financialTransparencyScore: analysis.financial_transparency_score,
          reviewAuthenticityScore: analysis.review_authenticity_score,
          developerCredibilityScore: analysis.developer_credibility_score,
          securityPrivacyScore: analysis.security_privacy_score,
          socialAnalysis: analysis.social_analysis,
          financialAnalysis: analysis.financial_analysis,
          reviewAnalysis: analysis.review_analysis,
          developerAnalysis: analysis.developer_analysis,
          securityAnalysis: analysis.security_analysis,
          confidenceLevel: analysis.confidence_level,
          lastAnalyzed: analysis.last_analyzed_at,
          analysisVersion: analysis.analysis_version,
          warningCount: analysis.warning_count
        };
      } catch (error) {
        console.error('Error fetching truth analysis for app:', error);
        return null;
      }
    },

    /**
     * Resolve redFlags field on App type
     * Returns active red flags for the app
     */
    redFlags: async (parent, _, { pool }) => {
      try {
        const result = await pool.query(
          `SELECT * FROM red_flags
           WHERE app_id = $1 AND status = 'active'
           ORDER BY detected_at DESC`,
          [parent.id]
        );

        return result.rows.map(row => ({
          id: row.id,
          severity: row.severity,
          category: row.category,
          title: row.title,
          description: row.description,
          evidence: row.evidence,
          evidenceUrls: row.evidence_urls ? JSON.parse(row.evidence_urls) : [],
          scoreImpact: row.score_impact,
          status: row.status,
          detectedAt: row.detected_at,
          detectedByAgent: row.detected_by_agent
        }));
      } catch (error) {
        console.error('Error fetching red flags for app:', error);
        return [];
      }
    },

    /**
     * Resolve lastAnalyzed field on App type
     */
    lastAnalyzed: async (parent, _, { pool }) => {
      try {
        const result = await pool.query(
          'SELECT last_analyzed_at FROM app_truth_analysis WHERE app_id = $1 ORDER BY last_analyzed_at DESC LIMIT 1',
          [parent.id]
        );

        return result.rows.length > 0 ? result.rows[0].last_analyzed_at : null;
      } catch (error) {
        return null;
      }
    },

    /**
     * Resolve analysisConfidence field on App type
     */
    analysisConfidence: async (parent, _, { pool }) => {
      try {
        const result = await pool.query(
          'SELECT confidence_level FROM app_truth_analysis WHERE app_id = $1 ORDER BY last_analyzed_at DESC LIMIT 1',
          [parent.id]
        );

        return result.rows.length > 0 ? result.rows[0].confidence_level : null;
      } catch (error) {
        return null;
      }
    }
  },

  Query: {
    /**
     * Get complete truth analysis for an app
     * Returns cached results if recent, otherwise triggers new analysis
     */
    appTruthAnalysis: async (_, { appId }, { pool, user }) => {
      try {
        // Check if analysis exists and is recent (< 7 days old)
        const existingResult = await pool.query(
          `SELECT * FROM app_truth_analysis
           WHERE app_id = $1
           AND last_analyzed_at > NOW() - INTERVAL '7 days'
           ORDER BY last_analyzed_at DESC
           LIMIT 1`,
          [appId]
        );

        if (existingResult.rows.length > 0) {
          const analysis = existingResult.rows[0];

          return {
            id: analysis.id,
            appId: analysis.app_id,
            overallTruthScore: analysis.overall_truth_score,
            letterGrade: analysis.letter_grade,
            socialPresenceScore: analysis.social_presence_score,
            financialTransparencyScore: analysis.financial_transparency_score,
            reviewAuthenticityScore: analysis.review_authenticity_score,
            developerCredibilityScore: analysis.developer_credibility_score,
            securityPrivacyScore: analysis.security_privacy_score,
            socialAnalysis: analysis.social_analysis,
            financialAnalysis: analysis.financial_analysis,
            reviewAnalysis: analysis.review_analysis,
            developerAnalysis: analysis.developer_analysis,
            securityAnalysis: analysis.security_analysis,
            confidenceLevel: analysis.confidence_level,
            lastAnalyzed: analysis.last_analyzed_at,
            analysisVersion: analysis.analysis_version,
            warningCount: analysis.warning_count
          };
        }

        // No recent analysis found - return null (client should trigger new analysis)
        return null;
      } catch (error) {
        console.error('Error fetching truth analysis:', error);
        throw createGraphQLError('Failed to fetch truth analysis', 'DATABASE_ERROR');
      }
    },

    /**
     * Get detailed score breakdown for an app
     */
    appDetailedScore: async (_, { appId }, { pool }) => {
      try {
        const result = await pool.query(
          `SELECT * FROM app_truth_analysis WHERE app_id = $1 ORDER BY last_analyzed_at DESC LIMIT 1`,
          [appId]
        );

        if (result.rows.length === 0) {
          return null;
        }

        const analysis = result.rows[0];

        return {
          overallScore: analysis.overall_truth_score,
          letterGrade: analysis.letter_grade,
          components: {
            socialPresence: {
              score: analysis.social_presence_score,
              weight: 0.15,
              details: analysis.social_analysis
            },
            reviewAuthenticity: {
              score: analysis.review_authenticity_score,
              weight: 0.25,
              details: analysis.review_analysis
            },
            financialTransparency: {
              score: analysis.financial_transparency_score,
              weight: 0.20,
              details: analysis.financial_analysis
            },
            developerCredibility: {
              score: analysis.developer_credibility_score,
              weight: 0.20,
              details: analysis.developer_analysis
            },
            securityPrivacy: {
              score: analysis.security_privacy_score,
              weight: 0.20,
              details: analysis.security_analysis
            }
          }
        };
      } catch (error) {
        console.error('Error fetching detailed score:', error);
        throw createGraphQLError('Failed to fetch detailed score', 'DATABASE_ERROR');
      }
    },

    /**
     * Get red flags for an app with optional filtering
     */
    appRedFlags: async (_, { appId, severity, category }, { pool }) => {
      try {
        let query = 'SELECT * FROM red_flags WHERE app_id = $1';
        const params = [appId];
        let paramCount = 1;

        if (severity) {
          paramCount++;
          query += ` AND severity = $${paramCount}`;
          params.push(severity);
        }

        if (category) {
          paramCount++;
          query += ` AND category = $${paramCount}`;
          params.push(category);
        }

        query += ' ORDER BY detected_at DESC';

        const result = await pool.query(query, params);

        return result.rows.map(row => ({
          id: row.id,
          severity: row.severity,
          category: row.category,
          title: row.title,
          description: row.description,
          evidence: row.evidence,
          evidenceUrls: row.evidence_urls ? JSON.parse(row.evidence_urls) : [],
          scoreImpact: row.score_impact,
          status: row.status || 'active',
          detectedAt: row.detected_at,
          detectedByAgent: row.detected_by_agent
        }));
      } catch (error) {
        console.error('Error fetching red flags:', error);
        throw createGraphQLError('Failed to fetch red flags', 'DATABASE_ERROR');
      }
    },

    /**
     * Get flagged/suspicious reviews for an app
     */
    flaggedReviews: async (_, { appId, platform, minConfidence }, { pool }) => {
      try {
        let query = `
          SELECT ra.*, r.review_text, r.rating, r.user_id, r.created_at as review_created_at
          FROM review_authenticity ra
          JOIN reviews r ON ra.review_id = r.id
          WHERE r.app_id = $1 AND ra.is_flagged = true
        `;
        const params = [appId];
        let paramCount = 1;

        if (platform) {
          paramCount++;
          query += ` AND ra.platform = $${paramCount}`;
          params.push(platform);
        }

        if (minConfidence !== undefined && minConfidence !== null) {
          paramCount++;
          query += ` AND ra.confidence >= $${paramCount}`;
          params.push(minConfidence);
        }

        query += ' ORDER BY ra.confidence DESC, ra.detected_at DESC';

        const result = await pool.query(query, params);

        return result.rows.map(row => ({
          id: row.id,
          reviewId: row.review_id,
          platform: row.platform,
          confidence: row.confidence,
          reason: row.reason,
          indicators: row.indicators,
          reviewText: row.review_text,
          rating: row.rating,
          userId: row.user_id,
          detectedAt: row.detected_at,
          reviewCreatedAt: row.review_created_at
        }));
      } catch (error) {
        console.error('Error fetching flagged reviews:', error);
        throw createGraphQLError('Failed to fetch flagged reviews', 'DATABASE_ERROR');
      }
    },

    /**
     * Get authenticity details for a specific review
     */
    reviewAuthenticity: async (_, { reviewId }, { pool }) => {
      try {
        const result = await pool.query(
          'SELECT * FROM review_authenticity WHERE review_id = $1',
          [reviewId]
        );

        if (result.rows.length === 0) {
          return null;
        }

        const row = result.rows[0];
        return {
          id: row.id,
          reviewId: row.review_id,
          authenticityScore: row.authenticity_score,
          isFake: row.is_fake,
          confidence: row.confidence,
          indicators: row.indicators,
          detectedAt: row.detected_at,
          analyzedBy: row.analyzed_by_agent || 'ReviewAnalysisAgent'
        };
      } catch (error) {
        console.error('Error fetching review authenticity:', error);
        throw createGraphQLError('Failed to fetch review authenticity', 'DATABASE_ERROR');
      }
    },

    /**
     * Get social media evidence for an app
     */
    socialEvidence: async (_, { appId, platform, sentiment }, { pool }) => {
      try {
        let query = 'SELECT * FROM social_media_evidence WHERE app_id = $1';
        const params = [appId];
        let paramCount = 1;

        if (platform) {
          paramCount++;
          query += ` AND platform = $${paramCount}`;
          params.push(platform);
        }

        if (sentiment) {
          paramCount++;
          query += ` AND sentiment = $${paramCount}`;
          params.push(sentiment);
        }

        query += ' ORDER BY collected_at DESC';

        const result = await pool.query(query, params);

        return result.rows.map(row => ({
          id: row.id,
          platform: row.platform,
          author: row.author,
          authorVerified: row.author_verified,
          content: row.content,
          sentiment: row.sentiment,
          sentimentScore: row.sentiment_score,
          engagement: row.engagement,
          sourceUrl: row.source_url,
          collectedAt: row.collected_at,
          credibilityScore: row.credibility_score
        }));
      } catch (error) {
        console.error('Error fetching social evidence:', error);
        throw createGraphQLError('Failed to fetch social evidence', 'DATABASE_ERROR');
      }
    },

    /**
     * Get analysis job by ID
     */
    analysisJob: async (_, { jobId }, { pool }) => {
      try {
        const result = await pool.query(
          'SELECT * FROM analysis_jobs WHERE id = $1',
          [jobId]
        );

        if (result.rows.length === 0) {
          throw createGraphQLError('Analysis job not found', 'NOT_FOUND');
        }

        const job = result.rows[0];
        return {
          id: job.id,
          appId: job.app_id,
          jobType: job.job_type,
          status: job.status,
          progress: job.progress,
          startedAt: job.started_at,
          completedAt: job.completed_at,
          durationSeconds: job.duration_seconds,
          result: job.result,
          errorMessage: job.error_message,
          agentVersion: job.agent_version,
          agentsUsed: job.agents_used ? JSON.parse(job.agents_used) : []
        };
      } catch (error) {
        console.error('Error fetching analysis job:', error);
        throw createGraphQLError('Failed to fetch analysis job', 'DATABASE_ERROR');
      }
    },

    /**
     * Get analysis jobs for an app with optional status filter
     */
    analysisJobs: async (_, { appId, status }, { pool }) => {
      try {
        let query = 'SELECT * FROM analysis_jobs WHERE app_id = $1';
        const params = [appId];

        if (status) {
          query += ' AND status = $2';
          params.push(status);
        }

        query += ' ORDER BY started_at DESC LIMIT 50';

        const result = await pool.query(query, params);

        return result.rows.map(row => ({
          id: row.id,
          appId: row.app_id,
          jobType: row.job_type,
          status: row.status,
          progress: row.progress,
          startedAt: row.started_at,
          completedAt: row.completed_at,
          durationSeconds: row.duration_seconds,
          result: row.result,
          errorMessage: row.error_message,
          agentVersion: row.agent_version,
          agentsUsed: row.agents_used ? JSON.parse(row.agents_used) : []
        }));
      } catch (error) {
        console.error('Error fetching analysis jobs:', error);
        throw createGraphQLError('Failed to fetch analysis jobs', 'DATABASE_ERROR');
      }
    }
  },

  Mutation: {
    /**
     * Trigger comprehensive app analysis
     * Creates an analysis job and runs it immediately (will be moved to queue in next phase)
     */
    analyzeApp: async (_, { appId, analysisType }, { pool, user }) => {
      // Require authentication for analysis requests
      requireAuth(user);

      try {
        // Verify app exists
        const appResult = await pool.query('SELECT * FROM apps WHERE id = $1', [appId]);
        if (appResult.rows.length === 0) {
          throw createGraphQLError('App not found', 'NOT_FOUND');
        }

        const app = appResult.rows[0];

        // Create analysis job record
        const jobResult = await pool.query(
          `INSERT INTO analysis_jobs
           (app_id, job_type, status, progress, started_at, agent_version)
           VALUES ($1, $2, 'running', 0, NOW(), '2.0')
           RETURNING *`,
          [appId, analysisType]
        );

        const job = jobResult.rows[0];

        // Execute analysis based on type (synchronously for now, will be async with queue)
        try {
          let analysisResult;

          switch (analysisType) {
            case 'FULL':
              analysisResult = await orchestrator.runFullAnalysis({ appId, pool, appData: app });
              break;
            case 'SOCIAL_ONLY':
              analysisResult = await orchestrator.runAgent('social', { appId, pool, appData: app });
              break;
            case 'REVIEWS_ONLY':
              analysisResult = await orchestrator.runAgent('reviews', { appId, pool, appData: app });
              break;
            case 'FINANCIAL':
              analysisResult = await orchestrator.runAgent('financial', { appId, pool, appData: app });
              break;
            case 'DEVELOPER':
              analysisResult = await orchestrator.runAgent('developer', { appId, pool, appData: app });
              break;
            case 'SECURITY':
              analysisResult = await orchestrator.runAgent('security', { appId, pool, appData: app });
              break;
            default:
              throw createGraphQLError('Invalid analysis type', 'VALIDATION_ERROR');
          }

          // Save results if full analysis
          if (analysisType === 'FULL') {
            await orchestrator.saveAnalysis(pool, analysisResult);
          }

          // Update job status to completed
          const duration = Math.round((Date.now() - new Date(job.started_at).getTime()) / 1000);
          await pool.query(
            `UPDATE analysis_jobs
             SET status = 'completed', progress = 100, completed_at = NOW(),
                 duration_seconds = $1, result = $2,
                 agents_used = $3
             WHERE id = $4`,
            [
              duration,
              JSON.stringify(analysisResult),
              JSON.stringify(analysisType === 'FULL' ? ['reviews', 'social', 'financial', 'developer', 'security'] : [analysisType.toLowerCase().replace('_only', '')]),
              job.id
            ]
          );

          console.log(`✅ Analysis completed for app ${appId} (${analysisType}) in ${duration}s`);

          return {
            id: job.id,
            appId: job.app_id,
            jobType: job.job_type,
            status: 'completed',
            progress: 100,
            startedAt: job.started_at,
            completedAt: new Date(),
            durationSeconds: duration,
            result: analysisResult,
            agentVersion: '2.0',
            agentsUsed: analysisType === 'FULL' ? ['reviews', 'social', 'financial', 'developer', 'security'] : [analysisType.toLowerCase().replace('_only', '')]
          };

        } catch (analysisError) {
          // Update job status to failed
          await pool.query(
            `UPDATE analysis_jobs
             SET status = 'failed', error_message = $1, completed_at = NOW()
             WHERE id = $2`,
            [analysisError.message, job.id]
          );

          throw createGraphQLError(`Analysis failed: ${analysisError.message}`, 'ANALYSIS_ERROR');
        }

      } catch (error) {
        console.error('Error analyzing app:', error);
        throw error.extensions ? error : createGraphQLError('Failed to analyze app', 'INTERNAL_ERROR');
      }
    },

    /**
     * Trigger social media analysis only
     */
    analyzeSocialMedia: async (_, { appId }, context) => {
      return module.exports.Mutation.analyzeApp(_, { appId, analysisType: 'SOCIAL_ONLY' }, context);
    },

    /**
     * Trigger financial analysis only
     */
    analyzeFinancials: async (_, { appId }, context) => {
      return module.exports.Mutation.analyzeApp(_, { appId, analysisType: 'FINANCIAL' }, context);
    },

    /**
     * Trigger review analysis only
     */
    analyzeReviews: async (_, { appId }, context) => {
      return module.exports.Mutation.analyzeApp(_, { appId, analysisType: 'REVIEWS_ONLY' }, context);
    },

    /**
     * Trigger developer background analysis only
     */
    analyzeDeveloper: async (_, { appId }, context) => {
      return module.exports.Mutation.analyzeApp(_, { appId, analysisType: 'DEVELOPER' }, context);
    },

    /**
     * Trigger security analysis only
     */
    analyzeSecurity: async (_, { appId }, context) => {
      return module.exports.Mutation.analyzeApp(_, { appId, analysisType: 'SECURITY' }, context);
    },

    /**
     * Report a fake/suspicious review
     */
    reportFakeReview: async (_, { reviewId, reason, evidence }, { pool, user }) => {
      requireAuth(user);

      try {
        // Check if review exists
        const reviewResult = await pool.query('SELECT * FROM reviews WHERE id = $1', [reviewId]);
        if (reviewResult.rows.length === 0) {
          throw createGraphQLError('Review not found', 'NOT_FOUND');
        }

        // Flag the review in review_authenticity table
        await pool.query(
          `INSERT INTO review_authenticity
           (review_id, is_flagged, reason, confidence, detected_at, reported_by_user)
           VALUES ($1, true, $2, 0.8, NOW(), $3)
           ON CONFLICT (review_id)
           DO UPDATE SET is_flagged = true, reason = $2, reported_by_user = $3`,
          [reviewId, reason, user.id]
        );

        console.log(`🚩 Review ${reviewId} flagged by user ${user.id}: ${reason}`);
        return true;
      } catch (error) {
        console.error('Error reporting fake review:', error);
        throw createGraphQLError('Failed to report review', 'DATABASE_ERROR');
      }
    },

    /**
     * Challenge a truth score (requires evidence and reasoning)
     */
    challengeTruthScore: async (_, { appId, reasoning, proposedScore }, { pool, user }) => {
      requireAuth(user);

      try {
        // Get current truth analysis
        const analysisResult = await pool.query(
          'SELECT * FROM app_truth_analysis WHERE app_id = $1 ORDER BY last_analyzed_at DESC LIMIT 1',
          [appId]
        );

        if (analysisResult.rows.length === 0) {
          throw createGraphQLError('No truth analysis found for this app', 'NOT_FOUND');
        }

        const currentAnalysis = analysisResult.rows[0];

        // Create a fact-check appeal record
        const appealResult = await pool.query(
          `INSERT INTO fact_check_appeals
           (user_id, target_type, target_id, current_verdict, proposed_verdict, reasoning, status, created_at)
           VALUES ($1, 'truth_score', $2, $3, $4, $5, 'pending', NOW())
           RETURNING *`,
          [
            user.id,
            appId,
            `${currentAnalysis.overall_truth_score} (${currentAnalysis.letter_grade})`,
            proposedScore ? `${proposedScore}` : 'User dispute',
            reasoning
          ]
        );

        console.log(`⚖️  Truth score challenge submitted for app ${appId} by user ${user.id}`);

        const appeal = appealResult.rows[0];
        return {
          id: appeal.id,
          userId: appeal.user_id,
          factCheckId: null,
          currentVerdict: appeal.current_verdict,
          proposedVerdict: appeal.proposed_verdict,
          reasoning: appeal.reasoning,
          evidence: appeal.evidence,
          supportingLinks: appeal.supporting_links ? JSON.parse(appeal.supporting_links) : [],
          status: appeal.status,
          createdAt: appeal.created_at,
          reviewedAt: appeal.reviewed_at,
          reviewedBy: appeal.reviewed_by,
          newVerdict: appeal.new_verdict
        };
      } catch (error) {
        console.error('Error challenging truth score:', error);
        throw createGraphQLError('Failed to submit challenge', 'DATABASE_ERROR');
      }
    },

    /**
     * Verify a red flag (admin only)
     */
    verifyRedFlag: async (_, { redFlagId }, { pool, user }) => {
      requireRole(user, ['admin', 'moderator']);

      try {
        const result = await pool.query(
          `UPDATE red_flags SET status = 'verified', verified_by = $1, verified_at = NOW()
           WHERE id = $2
           RETURNING *`,
          [user.id, redFlagId]
        );

        if (result.rows.length === 0) {
          throw createGraphQLError('Red flag not found', 'NOT_FOUND');
        }

        console.log(`✅ Red flag ${redFlagId} verified by ${user.username}`);

        const row = result.rows[0];
        return {
          id: row.id,
          severity: row.severity,
          category: row.category,
          title: row.title,
          description: row.description,
          evidence: row.evidence,
          evidenceUrls: row.evidence_urls ? JSON.parse(row.evidence_urls) : [],
          scoreImpact: row.score_impact,
          status: row.status,
          detectedAt: row.detected_at,
          detectedByAgent: row.detected_by_agent
        };
      } catch (error) {
        console.error('Error verifying red flag:', error);
        throw error.extensions ? error : createGraphQLError('Failed to verify red flag', 'DATABASE_ERROR');
      }
    },

    /**
     * Dismiss a red flag with reason (admin only)
     */
    dismissRedFlag: async (_, { redFlagId, reason }, { pool, user }) => {
      requireRole(user, ['admin', 'moderator']);

      try {
        const result = await pool.query(
          `UPDATE red_flags
           SET status = 'dismissed', dismissed_reason = $1, dismissed_by = $2, dismissed_at = NOW()
           WHERE id = $3
           RETURNING *`,
          [reason, user.id, redFlagId]
        );

        if (result.rows.length === 0) {
          throw createGraphQLError('Red flag not found', 'NOT_FOUND');
        }

        console.log(`🚫 Red flag ${redFlagId} dismissed by ${user.username}: ${reason}`);
        return true;
      } catch (error) {
        console.error('Error dismissing red flag:', error);
        throw createGraphQLError('Failed to dismiss red flag', 'DATABASE_ERROR');
      }
    }
  }
};
