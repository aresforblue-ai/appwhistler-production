// src/backend/utils/poolMonitor.js
// PostgreSQL connection pool monitoring and diagnostics

const { getNumber, getSecret } = require('../../config/secrets');

class PoolMonitor {
  constructor(pool) {
    this.pool = pool;
    this.metrics = {
      totalQueries: 0,
      totalErrors: 0,
      avgQueryTime: 0,
      peakConnections: 0,
      queryTimes: [],
      errors: []
    };
    
    this.config = {
      maxConnections: getNumber('DB_POOL_MAX', 20),
      minConnections: getNumber('DB_POOL_MIN', 5),
      idleTimeout: getNumber('DB_POOL_IDLE_TIMEOUT_MS', 30000),
      connectionTimeout: getNumber('DB_POOL_CONNECTION_TIMEOUT_MS', 5000),
      queryTimeout: getNumber('DB_POOL_QUERY_TIMEOUT_MS', 30000)
    };

    this.startTime = Date.now();
  }

  /**
   * Track query execution time and errors
   */
  trackQuery(duration, error = null) {
    this.metrics.totalQueries++;
    this.metrics.queryTimes.push(duration);
    
    // Keep only last 1000 query times to avoid memory bloat
    if (this.metrics.queryTimes.length > 1000) {
      this.metrics.queryTimes.shift();
    }

    if (error) {
      this.metrics.totalErrors++;
      this.metrics.errors.push({
        timestamp: new Date(),
        message: error.message,
        code: error.code
      });
      
      // Keep only last 100 errors
      if (this.metrics.errors.length > 100) {
        this.metrics.errors.shift();
      }
    }

    // Update average
    this.metrics.avgQueryTime = this.metrics.queryTimes.reduce((a, b) => a + b, 0) / this.metrics.queryTimes.length;
  }

  /**
   * Get current pool status
   */
  getPoolStatus() {
    const poolState = this.pool._clients || [];
    const activeConnections = poolState.filter(c => c._query).length;
    const idleConnections = poolState.length - activeConnections;
    
    if (activeConnections > this.metrics.peakConnections) {
      this.metrics.peakConnections = activeConnections;
    }

    return {
      totalConnections: poolState.length,
      activeConnections,
      idleConnections,
      peakConnections: this.metrics.peakConnections,
      utilization: poolState.length > 0 ? ((activeConnections / poolState.length) * 100).toFixed(2) : 0
    };
  }

  /**
   * Get comprehensive diagnostics
   */
  getDiagnostics() {
    const poolStatus = this.getPoolStatus();
    const uptime = Date.now() - this.startTime;
    const p95Time = this.getPercentile(95);
    const p99Time = this.getPercentile(99);
    const errorRate = this.metrics.totalQueries > 0 
      ? ((this.metrics.totalErrors / this.metrics.totalQueries) * 100).toFixed(2) 
      : 0;

    return {
      uptime: `${(uptime / 1000 / 60).toFixed(2)} minutes`,
      pool: {
        ...poolStatus,
        config: this.config
      },
      queries: {
        total: this.metrics.totalQueries,
        errors: this.metrics.totalErrors,
        errorRate: `${errorRate}%`,
        avgTime: `${this.metrics.avgQueryTime.toFixed(2)}ms`,
        p95Time: `${p95Time}ms`,
        p99Time: `${p99Time}ms`,
        min: `${Math.min(...this.metrics.queryTimes)}ms`,
        max: `${Math.max(...this.metrics.queryTimes)}ms`
      },
      recentErrors: this.metrics.errors.slice(-10)
    };
  }

  /**
   * Calculate percentile of query times
   */
  getPercentile(percentile) {
    if (this.metrics.queryTimes.length === 0) return 0;
    
    const sorted = [...this.metrics.queryTimes].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  /**
   * Get health status (red/yellow/green)
   */
  getHealthStatus() {
    const diagnostics = this.getDiagnostics();
    const { pool, queries } = diagnostics;

    let status = 'healthy'; // green
    let issues = [];

    // Check error rate
    if (parseFloat(queries.errorRate) > 5) {
      status = 'degraded'; // yellow
      issues.push(`High error rate: ${queries.errorRate}%`);
    }

    // Check connection utilization
    if (parseFloat(pool.utilization) > 90) {
      status = 'degraded';
      issues.push(`High connection utilization: ${pool.utilization}%`);
    }

    // Check query times
    if (parseFloat(queries.p99Time) > this.config.queryTimeout) {
      status = 'degraded';
      issues.push(`P99 query time exceeds timeout: ${queries.p99Time}ms`);
    }

    // Critical issues
    if (pool.activeConnections >= pool.totalConnections) {
      status = 'unhealthy'; // red
      issues.push('All connections in use - pool exhausted');
    }

    if (parseFloat(queries.errorRate) > 25) {
      status = 'unhealthy';
      issues.push(`Critical error rate: ${queries.errorRate}%`);
    }

    return {
      status, // 'healthy', 'degraded', 'unhealthy'
      issues,
      diagnostics
    };
  }

  /**
   * Reset metrics (useful for testing)
   */
  reset() {
    this.metrics = {
      totalQueries: 0,
      totalErrors: 0,
      avgQueryTime: 0,
      peakConnections: 0,
      queryTimes: [],
      errors: []
    };
    this.startTime = Date.now();
  }
}

module.exports = PoolMonitor;
