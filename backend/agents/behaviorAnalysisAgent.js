// backend/agents/behaviorAnalysisAgent.js
// AI agent for analyzing user behavior patterns and detecting anomalies

class BehaviorAnalysisAgent {
  constructor() {
    this.name = 'BehaviorAnalysisAgent';
    this.version = '1.0.0';
    this.initialized = false;
    this.totalProcessed = 0;
    this.lastUsed = null;

    // Behavior pattern types
    this.patternTypes = {
      engagement: ['clicks', 'time_spent', 'returns'],
      interaction: ['reviews', 'votes', 'submissions'],
      navigation: ['pages_visited', 'search_queries'],
      social: ['shares', 'follows', 'messages'],
    };

    // Anomaly thresholds
    this.anomalyThresholds = {
      rapid_actions: { count: 10, timeWindow: 60 }, // 10 actions in 60 seconds
      unusual_hours: { start: 2, end: 5 }, // 2 AM - 5 AM
      excessive_voting: { count: 50, timeWindow: 3600 }, // 50 votes in 1 hour
    };
  }

  async initialize() {
    console.log(`🤖 Initializing ${this.name}...`);
    this.initialized = true;
    return { status: 'ready', agent: this.name };
  }

  /**
   * Analyze user behavior
   * @param {Object} userData - User activity data
   * @param {Object} options - Analysis options
   * @returns {Object} Behavior analysis result
   */
  async process(userData, options = {}) {
    if (!userData || !userData.actions) {
      throw new Error('No user data provided');
    }

    const { actions, profile = {}, history = [] } = userData;

    // Analyze different behavior aspects
    const engagementAnalysis = this.analyzeEngagement(actions);
    const patternAnalysis = this.analyzePatterns(actions, history);
    const anomalies = this.detectAnomalies(actions);
    const userSegment = this.segmentUser(profile, actions);
    const riskScore = this.calculateRiskScore(anomalies, actions);

    this.totalProcessed++;
    this.lastUsed = new Date().toISOString();

    return {
      engagement: engagementAnalysis,
      patterns: patternAnalysis,
      anomalies,
      segment: userSegment,
      riskScore,
      isSuspicious: riskScore > 70,
      requiresReview: riskScore > 50,
      insights: this.generateInsights(engagementAnalysis, patternAnalysis, userSegment),
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Analyze user engagement
   */
  analyzeEngagement(actions) {
    const totalActions = actions.length;
    const uniqueDays = new Set(actions.map(a => new Date(a.timestamp).toDateString())).size;

    const actionTypes = {};
    actions.forEach(action => {
      actionTypes[action.type] = (actionTypes[action.type] || 0) + 1;
    });

    // Calculate average session duration
    const sessions = this.groupIntoSessions(actions);
    const avgSessionDuration = sessions.reduce((sum, s) => sum + s.duration, 0) / (sessions.length || 1);

    return {
      totalActions,
      uniqueDays,
      actionTypes,
      sessionsCount: sessions.length,
      avgSessionDuration,
      engagementLevel: this.categorizeEngagement(totalActions, uniqueDays),
    };
  }

  /**
   * Analyze behavior patterns
   */
  analyzePatterns(actions, history) {
    const patterns = {
      timeOfDay: this.analyzeTimePatterns(actions),
      dayOfWeek: this.analyzeDayPatterns(actions),
      frequency: this.analyzeFrequency(actions, history),
      consistency: this.analyzeConsistency(actions, history),
    };

    return patterns;
  }

  /**
   * Detect behavioral anomalies
   */
  detectAnomalies(actions) {
    const anomalies = [];

    // Check for rapid actions
    const rapidActions = this.detectRapidActions(actions);
    if (rapidActions) {
      anomalies.push({
        type: 'rapid_actions',
        severity: 'high',
        description: 'Unusually rapid sequence of actions detected',
        details: rapidActions,
      });
    }

    // Check for unusual hours
    const unusualHours = this.detectUnusualHours(actions);
    if (unusualHours.length > 0) {
      anomalies.push({
        type: 'unusual_hours',
        severity: 'medium',
        description: 'Activity during unusual hours',
        details: { count: unusualHours.length },
      });
    }

    // Check for repetitive patterns (bot-like behavior)
    const repetitive = this.detectRepetitive(actions);
    if (repetitive) {
      anomalies.push({
        type: 'repetitive_pattern',
        severity: 'high',
        description: 'Repetitive bot-like behavior detected',
        details: repetitive,
      });
    }

    return anomalies;
  }

  /**
   * Segment user based on behavior
   */
  segmentUser(profile, actions) {
    const actionsPerDay = actions.length / 30; // Assuming 30-day window

    if (actionsPerDay > 20) return 'power_user';
    if (actionsPerDay > 5) return 'active_user';
    if (actionsPerDay > 1) return 'regular_user';
    if (actionsPerDay > 0.1) return 'casual_user';
    return 'inactive_user';
  }

  /**
   * Calculate risk score
   */
  calculateRiskScore(anomalies, actions) {
    let score = 0;

    anomalies.forEach(anomaly => {
      if (anomaly.severity === 'high') score += 30;
      if (anomaly.severity === 'medium') score += 15;
      if (anomaly.severity === 'low') score += 5;
    });

    // Additional risk factors
    const actionTypes = {};
    actions.forEach(a => {
      actionTypes[a.type] = (actionTypes[a.type] || 0) + 1;
    });

    // Check for vote manipulation
    if (actionTypes.vote > 50) score += 20;

    return Math.min(score, 100);
  }

  /**
   * Group actions into sessions
   */
  groupIntoSessions(actions) {
    const sessions = [];
    const sessionGap = 30 * 60 * 1000; // 30 minutes

    let currentSession = null;

    actions
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .forEach(action => {
        const time = new Date(action.timestamp);

        if (!currentSession || time - currentSession.end > sessionGap) {
          if (currentSession) {
            currentSession.duration = currentSession.end - currentSession.start;
            sessions.push(currentSession);
          }
          currentSession = { start: time, end: time, actions: [action] };
        } else {
          currentSession.end = time;
          currentSession.actions.push(action);
        }
      });

    if (currentSession) {
      currentSession.duration = currentSession.end - currentSession.start;
      sessions.push(currentSession);
    }

    return sessions;
  }

  /**
   * Analyze time of day patterns
   */
  analyzeTimePatterns(actions) {
    const hourCounts = new Array(24).fill(0);

    actions.forEach(action => {
      const hour = new Date(action.timestamp).getHours();
      hourCounts[hour]++;
    });

    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

    return { hourCounts, peakHour };
  }

  /**
   * Analyze day of week patterns
   */
  analyzeDayPatterns(actions) {
    const dayCounts = new Array(7).fill(0);

    actions.forEach(action => {
      const day = new Date(action.timestamp).getDay();
      dayCounts[day]++;
    });

    return { dayCounts };
  }

  /**
   * Analyze frequency
   */
  analyzeFrequency(actions, history) {
    const recentCount = actions.length;
    const historicalAvg = history.length > 0 ? history.reduce((sum, h) => sum + h.count, 0) / history.length : recentCount;

    return {
      recent: recentCount,
      historical: historicalAvg,
      trend: recentCount > historicalAvg ? 'increasing' : recentCount < historicalAvg ? 'decreasing' : 'stable',
    };
  }

  /**
   * Analyze consistency
   */
  analyzeConsistency(actions, history) {
    const timestamps = actions.map(a => new Date(a.timestamp).getTime());
    if (timestamps.length < 2) return { score: 0, pattern: 'insufficient_data' };

    // Calculate intervals between actions
    const intervals = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }

    // Calculate standard deviation of intervals
    const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // Lower stdDev = more consistent (potentially bot-like)
    const consistencyScore = Math.max(0, 100 - stdDev / 1000);

    return {
      score: consistencyScore,
      pattern: consistencyScore > 80 ? 'highly_consistent' : consistencyScore > 50 ? 'consistent' : 'variable',
    };
  }

  /**
   * Detect rapid actions
   */
  detectRapidActions(actions) {
    const { count, timeWindow } = this.anomalyThresholds.rapid_actions;
    const sorted = actions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    for (let i = 0; i < sorted.length - count; i++) {
      const windowStart = new Date(sorted[i].timestamp);
      const windowEnd = new Date(sorted[i + count - 1].timestamp);
      const duration = (windowEnd - windowStart) / 1000; // seconds

      if (duration < timeWindow) {
        return { count, duration, threshold: timeWindow };
      }
    }

    return null;
  }

  /**
   * Detect unusual hours
   */
  detectUnusualHours(actions) {
    const { start, end } = this.anomalyThresholds.unusual_hours;

    return actions.filter(action => {
      const hour = new Date(action.timestamp).getHours();
      return hour >= start && hour < end;
    });
  }

  /**
   * Detect repetitive patterns
   */
  detectRepetitive(actions) {
    if (actions.length < 5) return null;

    // Check for exact repetition of action sequences
    const sequences = actions.map(a => `${a.type}-${a.target || ''}`);
    const uniqueSequences = new Set(sequences);

    if (uniqueSequences.size / sequences.length < 0.3) {
      return { uniqueRatio: uniqueSequences.size / sequences.length, threshold: 0.3 };
    }

    return null;
  }

  /**
   * Categorize engagement level
   */
  categorizeEngagement(totalActions, uniqueDays) {
    const actionsPerDay = totalActions / uniqueDays;

    if (actionsPerDay > 50) return 'very_high';
    if (actionsPerDay > 20) return 'high';
    if (actionsPerDay > 5) return 'medium';
    return 'low';
  }

  /**
   * Generate insights
   */
  generateInsights(engagement, patterns, segment) {
    const insights = [];

    insights.push(`User segment: ${segment}`);
    insights.push(`Engagement level: ${engagement.engagementLevel}`);

    if (patterns.frequency.trend === 'increasing') {
      insights.push('User activity is increasing');
    } else if (patterns.frequency.trend === 'decreasing') {
      insights.push('User activity is declining');
    }

    if (patterns.timeOfDay.peakHour) {
      insights.push(`Most active at hour ${patterns.timeOfDay.peakHour}`);
    }

    return insights;
  }

  async shutdown() {
    console.log(`🛑 Shutting down ${this.name}...`);
    this.initialized = false;
  }
}

module.exports = new BehaviorAnalysisAgent();
