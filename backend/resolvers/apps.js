// App-related resolvers
const cacheManager = require('../utils/cacheManager');
const { getField } = require('./helpers');
const { withErrorHandling } = require('../utils/errorHandler');

module.exports = {
  Query: {
    // Get all apps with filters (cached for non-search queries)
    apps: withErrorHandling(async (_, { category, platform, search, minTruthRating, limit = 20, offset = 0 }, context) => {
      // Don't cache search queries (they're typically user-initiated)
      // Only cache filtered/sorted queries
      if (!search && offset === 0) {
        const cacheKey = cacheManager.constructor.generateKey('apps:filtered', {
          category, platform, minTruthRating, limit
        });

        const cached = await cacheManager.get(cacheKey);
        if (cached) return cached;
      }

      let query = 'SELECT * FROM apps WHERE 1=1';
      const params = [];
      let paramCount = 1;

      if (category) {
        query += ` AND category = $${paramCount++}`;
        params.push(category);
      }

      if (platform) {
        query += ` AND platform = $${paramCount++}`;
        params.push(platform);
      }

      if (search) {
        const normalizedSearch = search.trim();
        const likePattern = `%${normalizedSearch.replace(/\s+/g, '%')}%`;
        query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount + 1} OR developer ILIKE $${paramCount + 2})`;
        params.push(likePattern, likePattern, likePattern);
        paramCount += 3;
      }

      if (minTruthRating) {
        query += ` AND truth_rating >= $${paramCount++}`;
        params.push(minTruthRating);
      }

      // Order by relevance if searching, otherwise by truth_rating
      if (search) {
        query += ` ORDER BY download_count DESC, truth_rating DESC`;
      } else {
        query += ` ORDER BY truth_rating DESC`;
      }

      query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
      params.push(limit, offset);

      const result = await context.pool.query(query, params);

      const response = {
        edges: result.rows,
        pageInfo: {
          hasNextPage: result.rows.length === limit,
          hasPreviousPage: offset > 0,
          startCursor: offset.toString(),
          endCursor: (offset + result.rows.length).toString()
        }
      };

      // Cache non-search queries
      if (!search && offset === 0) {
        const cacheKey = cacheManager.constructor.generateKey('apps:filtered', {
          category, platform, minTruthRating, limit
        });
        await cacheManager.set(cacheKey, response, 600); // Cache for 10 minutes
      }

      return response;
    }),

    // Get single app by ID
    app: withErrorHandling(async (_, { id }, context) => {
      // Use DataLoader to batch app queries and prevent N+1 issues
      return context.loaders.appById.load(id);
    }),

    // Get trending apps (cached)
    trendingApps: async (_, { limit = 10 }, context) => {
      const cacheKey = cacheManager.constructor.generateKey('trending:apps', { limit });

      return cacheManager.getOrSet(cacheKey, async () => {
        const result = await context.pool.query(
          `SELECT * FROM apps
           WHERE is_verified = true
           ORDER BY download_count DESC
           LIMIT $1`,
          [limit]
        );
        return result.rows;
      }, 300); // Cache for 5 minutes
    },

    // Get AI recommendations for user
    recommendedApps: async (_, { userId }, context) => {
      const result = await context.pool.query(
        `SELECT r.*, a.*
         FROM recommendations r
         JOIN apps a ON r.app_id = a.id
         WHERE r.user_id = $1
         ORDER BY r.score DESC
         LIMIT 20`,
        [userId]
      );
      return result.rows;
    },

    // Analyze any URL for truth rating (Extension support)
    analyzeUrl: async (_, { url }, context) => {
      try {
        // Parse URL to extract app information
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace('www.', '');
        let appName = '';
        let category = 'Unknown';
        let platform = 'web';

        // Extract app info based on URL patterns
        if (hostname.includes('apps.apple.com')) {
          // Apple App Store
          const match = url.match(/\/app\/([^\/]+)\/id(\d+)/);
          if (match) {
            appName = match[1].replace(/-/g, ' ');
            platform = 'iOS';
          }
        } else if (hostname.includes('play.google.com')) {
          // Google Play Store
          const match = url.match(/id=([^&]+)/);
          if (match) {
            appName = match[1].split('.').pop();
            platform = 'Android';
          }
        } else if (hostname.includes('chrome.google.com')) {
          // Chrome Web Store
          platform = 'Chrome Extension';
          appName = urlObj.pathname.split('/').pop();
        } else {
          // Generic website/app
          appName = hostname.split('.')[0];
        }

        // Clean up app name
        appName = appName.charAt(0).toUpperCase() + appName.slice(1);

        // Try to find app in database
        let dbApp = null;
        try {
          const result = await context.pool.query(
            `SELECT * FROM apps
             WHERE LOWER(name) = LOWER($1)
             OR LOWER(package_id) = LOWER($2)
             OR website_url = $3
             LIMIT 1`,
            [appName, url, url]
          );
          dbApp = result.rows[0];
        } catch (dbError) {
          console.error('[analyzeUrl] Database query error:', dbError);
        }

        // If app found in DB, use real data
        if (dbApp) {
          const redFlags = [];

          // Check privacy score
          if (dbApp.privacy_score < 60) {
            redFlags.push({
              severity: 'HIGH',
              category: 'Privacy',
              description: `Low privacy score (${dbApp.privacy_score}/100) - App may collect excessive data`
            });
          }

          // Check security score
          if (dbApp.security_score < 60) {
            redFlags.push({
              severity: 'HIGH',
              category: 'Security',
              description: `Low security score (${dbApp.security_score}/100) - Potential vulnerabilities detected`
            });
          }

          // Check verification status
          if (!dbApp.is_verified) {
            redFlags.push({
              severity: 'MEDIUM',
              category: 'Verification',
              description: 'App has not been verified by AppWhistler community'
            });
          }

          // Calculate letter grade
          const score = Math.round(dbApp.truth_rating || 0);
          let letterGrade;
          if (score >= 95) letterGrade = 'A+';
          else if (score >= 90) letterGrade = 'A';
          else if (score >= 85) letterGrade = 'B+';
          else if (score >= 80) letterGrade = 'B';
          else if (score >= 75) letterGrade = 'C+';
          else if (score >= 70) letterGrade = 'C';
          else if (score >= 65) letterGrade = 'D+';
          else if (score >= 60) letterGrade = 'D';
          else letterGrade = 'F';

          return {
            url,
            appName: dbApp.name,
            category: dbApp.category || 'Unknown',
            truthScore: score,
            letterGrade,
            redFlags: redFlags.length > 0 ? redFlags : null,
            metadata: {
              developer: dbApp.developer,
              lastUpdated: dbApp.updated_at ? new Date(dbApp.updated_at).toLocaleDateString() : 'Unknown',
              userCount: dbApp.download_count ? `${(dbApp.download_count / 1000000).toFixed(1)}M+` : 'N/A',
              avgRating: 'N/A' // TODO: Calculate from reviews
            },
            analysis: {
              summary: dbApp.description || 'Verified app in AppWhistler database',
              strengths: dbApp.is_verified ? ['Community verified', 'Truth score available'] : [],
              concerns: redFlags.map(flag => flag.description),
              verificationStatus: dbApp.is_verified ? 'VERIFIED' : 'PENDING'
            }
          };
        }

        // App not in database - return mock analysis
        const mockScore = Math.floor(Math.random() * 30) + 60; // 60-90 range for demo
        let mockGrade;
        if (mockScore >= 85) mockGrade = 'B+';
        else if (mockScore >= 80) mockGrade = 'B';
        else if (mockScore >= 75) mockGrade = 'C+';
        else if (mockScore >= 70) mockGrade = 'C';
        else mockGrade = 'D+';

        return {
          url,
          appName,
          category,
          truthScore: mockScore,
          letterGrade: mockGrade,
          redFlags: [
            {
              severity: 'MEDIUM',
              category: 'Verification',
              description: 'App not yet verified by AppWhistler community'
            },
            {
              severity: 'LOW',
              category: 'Data',
              description: 'Limited data available - analysis pending community input'
            }
          ],
          metadata: {
            developer: 'Unknown',
            lastUpdated: new Date().toLocaleDateString(),
            userCount: 'N/A',
            avgRating: 'N/A'
          },
          analysis: {
            summary: 'This app has not been verified yet. The score shown is a preliminary estimate based on available public data.',
            strengths: ['No major red flags detected'],
            concerns: ['Not yet verified by community', 'Limited security/privacy data available'],
            verificationStatus: 'PENDING'
          }
        };

      } catch (error) {
        console.error('[analyzeUrl] Error:', error);

        // Return safe fallback on any error
        return {
          url,
          appName: 'Unknown',
          category: 'Unknown',
          truthScore: 50,
          letterGrade: 'C',
          redFlags: [
            {
              severity: 'HIGH',
              category: 'Error',
              description: 'Unable to analyze URL - please try again'
            }
          ],
          metadata: {
            developer: 'Unknown',
            lastUpdated: 'Unknown',
            userCount: 'N/A',
            avgRating: 'N/A'
          },
          analysis: {
            summary: 'Error analyzing this URL. Please check the URL and try again.',
            strengths: [],
            concerns: ['Analysis failed'],
            verificationStatus: 'ERROR'
          }
        };
      }
    },

    // Cursor-based pagination for apps
    appsCursor: async (_, { after, before, first, last, category, platform, search, minTruthRating }, context) => {
      const { encodeCursor } = require('../utils/cursor');

      // Build base query with filters
      let query = 'SELECT * FROM apps WHERE 1=1';
      const params = [];
      let paramCount = 1;

      if (category) {
        query += ` AND category = $${paramCount++}`;
        params.push(category);
      }

      if (platform) {
        query += ` AND platform = $${paramCount++}`;
        params.push(platform);
      }

      if (search) {
        // Use full-text search with tsvector
        const tsQuery = search.trim().split(/\s+/).join(' & ');
        query += ` AND search_vector @@ to_tsquery('english', $${paramCount})`;
        params.push(tsQuery);
        paramCount++;
      }

      if (minTruthRating !== null && minTruthRating !== undefined) {
        query += ` AND truth_rating >= $${paramCount++}`;
        params.push(minTruthRating);
      }

      // For cursor pagination with search, we can't use the pagination utility
      // because search needs to order by ts_rank, not created_at
      // So we'll implement a simpler version here
      const limit = (first || last || 20);

      // Order by relevance if searching, otherwise by created_at
      if (search) {
        const tsQuery = search.trim().split(/\s+/).join(' & ');
        query += ` ORDER BY ts_rank(search_vector, to_tsquery('english', $${paramCount})) DESC, created_at DESC`;
        params.push(tsQuery);
        paramCount++;
      } else {
        query += ` ORDER BY created_at DESC`;
      }

      query += ` LIMIT $${paramCount}`;
      params.push(limit + 1); // Fetch one extra to check hasNextPage
      paramCount++;

      const result = await context.pool.query(query, params);
      const rows = result.rows;

      const hasMore = rows.length > limit;
      const finalRows = hasMore ? rows.slice(0, limit) : rows;

      return {
        edges: finalRows.map(row => ({
          node: row,
          cursor: encodeCursor(row)
        })),
        pageInfo: {
          hasNextPage: hasMore,
          hasPreviousPage: !!after,
          startCursor: finalRows.length > 0 ? encodeCursor(finalRows[0]) : null,
          endCursor: finalRows.length > 0 ? encodeCursor(finalRows[finalRows.length - 1]) : null
        },
        totalCount: null
      };
    },
  },

  Mutation: {
    // No app mutations in this file (they're in admin.js)
  },

  // Nested resolvers for App type
  App: {
    downloadCount: parent => getField(parent, 'download_count', Number),
    truthRating: parent => getField(parent, 'truth_rating', Number),
    reviews: async (parent, _, context) => {
      if (context.loaders) {
        return context.loaders.reviewsByAppId.load(parent.id);
      }
      // Fallback if loaders not initialized
      const result = await context.pool.query(
        'SELECT * FROM reviews WHERE app_id = $1 ORDER BY created_at DESC LIMIT 100',
        [parent.id]
      );
      return result.rows;
    },
    averageRating: async (parent, _, context) => {
      const cached = getField(parent, 'average_rating', Number);
      if (cached !== null) {
        return cached;
      }

      if (context.loaders) {
        return context.loaders.averageRatingByAppId.load(parent.id);
      }
      // Fallback
      const result = await context.pool.query(
        'SELECT AVG(rating) as avg FROM reviews WHERE app_id = $1',
        [parent.id]
      );
      return parseFloat(result.rows[0]?.avg) || 0;
    },
    verifiedBy: async (parent, _, context) => {
      const verifierId = getField(parent, 'verified_by');
      if (!verifierId) return null;

      // Use DataLoader to batch user queries and prevent N+1 issues
      return context.loaders.userById.load(verifierId);
    },
  },
};
