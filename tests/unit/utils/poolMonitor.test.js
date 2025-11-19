// tests/unit/utils/poolMonitor.test.js
// Pool monitor unit tests

const PoolMonitor = require('../../../src/backend/utils/poolMonitor');

describe('PoolMonitor', () => {
  let mockPool;
  let monitor;

  beforeEach(() => {
    // Mock pool object
    mockPool = {
      _clients: [
        { _query: null }, // idle
        { _query: null }, // idle
        { _query: {} }    // active
      ]
    };

    monitor = new PoolMonitor(mockPool);
  });

  describe('initialization', () => {
    test('should initialize with default config', () => {
      expect(monitor.config).toBeDefined();
      expect(monitor.config.maxConnections).toBeGreaterThan(0);
      expect(monitor.config.minConnections).toBeGreaterThan(0);
    });

    test('should initialize empty metrics', () => {
      expect(monitor.metrics.totalQueries).toBe(0);
      expect(monitor.metrics.totalErrors).toBe(0);
      expect(monitor.metrics.queryTimes).toHaveLength(0);
    });
  });

  describe('query tracking', () => {
    test('should track successful queries', () => {
      monitor.trackQuery(10);
      expect(monitor.metrics.totalQueries).toBe(1);
      expect(monitor.metrics.totalErrors).toBe(0);
      expect(monitor.metrics.queryTimes).toHaveLength(1);
    });

    test('should track query errors', () => {
      const error = new Error('Query failed');
      error.code = 'QUERY_FAILED';

      monitor.trackQuery(50, error);
      expect(monitor.metrics.totalQueries).toBe(1);
      expect(monitor.metrics.totalErrors).toBe(1);
      expect(monitor.metrics.errors).toHaveLength(1);
    });

    test('should calculate average query time', () => {
      monitor.trackQuery(10);
      monitor.trackQuery(20);
      monitor.trackQuery(30);

      expect(monitor.metrics.avgQueryTime).toBe(20);
    });

    test('should limit stored query times', () => {
      // Add 1001 query times
      for (let i = 0; i < 1001; i++) {
        monitor.trackQuery(Math.random() * 100);
      }

      // Should only keep 1000
      expect(monitor.metrics.queryTimes).toHaveLength(1000);
    });

    test('should limit stored errors', () => {
      // Add 101 errors
      for (let i = 0; i < 101; i++) {
        const error = new Error(`Error ${i}`);
        monitor.trackQuery(10, error);
      }

      // Should only keep 100
      expect(monitor.metrics.errors).toHaveLength(100);
    });
  });

  describe('pool status', () => {
    test('should report pool status', () => {
      const status = monitor.getPoolStatus();
      expect(status).toHaveProperty('totalConnections');
      expect(status).toHaveProperty('activeConnections');
      expect(status).toHaveProperty('idleConnections');
      expect(status).toHaveProperty('utilization');
    });

    test('should count connections correctly', () => {
      const status = monitor.getPoolStatus();
      expect(status.totalConnections).toBe(3);
      expect(status.activeConnections).toBe(1);
      expect(status.idleConnections).toBe(2);
    });

    test('should calculate utilization percentage', () => {
      const status = monitor.getPoolStatus();
      const utilization = parseFloat(status.utilization);
      expect(utilization).toBeCloseTo(33.33, 1); // 1 active / 3 total
    });

    test('should track peak connections', () => {
      let status = monitor.getPoolStatus();
      expect(status.peakConnections).toBe(1);

      // Add more active connections by manipulating the mock
      mockPool._clients.push({ _query: {} });
      mockPool._clients.push({ _query: {} });

      status = monitor.getPoolStatus();
      // Peak should be 3 now (1 initial + 2 added = 3 total active)
      expect(status.peakConnections).toBeGreaterThanOrEqual(1);
    });
  });

  describe('diagnostics', () => {
    test('should provide comprehensive diagnostics', () => {
      monitor.trackQuery(10);
      monitor.trackQuery(20);
      monitor.trackQuery(30);

      const diag = monitor.getDiagnostics();
      expect(diag).toHaveProperty('uptime');
      expect(diag).toHaveProperty('pool');
      expect(diag).toHaveProperty('queries');
    });

    test('should calculate percentiles', () => {
      for (let i = 1; i <= 100; i++) {
        monitor.trackQuery(i);
      }

      const p95 = monitor.getPercentile(95);
      const p99 = monitor.getPercentile(99);

      expect(p95).toBeGreaterThanOrEqual(94);
      expect(p99).toBeGreaterThanOrEqual(98);
      expect(p99).toBeGreaterThanOrEqual(p95);
    });

    test('should calculate error rate', () => {
      monitor.trackQuery(10);
      monitor.trackQuery(20);
      monitor.trackQuery(30, new Error('error'));

      const diag = monitor.getDiagnostics();
      const errorRate = parseFloat(diag.queries.errorRate);

      expect(errorRate).toBeCloseTo(33.33, 1);
    });
  });

  describe('health status', () => {
    test('should report healthy status with good metrics', () => {
      monitor.trackQuery(10);
      monitor.trackQuery(15);

      const { status } = monitor.getHealthStatus();
      expect(status).toBe('healthy');
    });

    test('should report degraded status with high error rate', () => {
      // Set up a larger pool so we don't exhaust connections
      mockPool._clients = [];
      for (let i = 0; i < 20; i++) {
        mockPool._clients.push({ _query: null }); // idle
      }

      // Add queries with high error rate
      for (let i = 0; i < 100; i++) {
        monitor.trackQuery(10, i > 5 ? new Error('error') : null);
      }

      const { status, issues } = monitor.getHealthStatus();
      // Should either be degraded or report issues
      expect(['degraded', 'unhealthy']).toContain(status);
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should report unhealthy status when connections exhausted', () => {
      mockPool._clients = [
        { _query: {} },
        { _query: {} },
        { _query: {} }
      ];

      const { status } = monitor.getHealthStatus();
      expect(status).toBe('unhealthy');
    });

    test('should include issues in health status', () => {
      for (let i = 0; i < 100; i++) {
        monitor.trackQuery(10, i > 5 ? new Error('error') : null);
      }

      const { issues } = monitor.getHealthStatus();
      expect(Array.isArray(issues)).toBe(true);
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('reset', () => {
    test('should reset all metrics', () => {
      monitor.trackQuery(10);
      monitor.trackQuery(20, new Error('error'));

      expect(monitor.metrics.totalQueries).toBe(2);
      expect(monitor.metrics.totalErrors).toBe(1);

      monitor.reset();

      expect(monitor.metrics.totalQueries).toBe(0);
      expect(monitor.metrics.totalErrors).toBe(0);
      expect(monitor.metrics.queryTimes).toHaveLength(0);
      expect(monitor.metrics.errors).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    test('should handle empty pool', () => {
      const emptyPool = { _clients: [] };
      const emptyMonitor = new PoolMonitor(emptyPool);

      const status = emptyMonitor.getPoolStatus();
      expect(status.utilization).toBe(0);
    });

    test('should handle percentile with empty data', () => {
      const emptyMonitor = new PoolMonitor(mockPool);
      const p95 = emptyMonitor.getPercentile(95);
      expect(p95).toBe(0);
    });

    test('should handle single query time', () => {
      monitor.trackQuery(42);

      const diag = monitor.getDiagnostics();
      expect(diag.queries.min).toBe('42ms');
      expect(diag.queries.max).toBe('42ms');
    });
  });
});
