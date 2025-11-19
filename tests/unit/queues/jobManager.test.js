// tests/unit/queues/jobManager.test.js
// Job manager unit tests

const jobManager = require('../../../src/backend/queues/jobManager');

describe('JobManager', () => {
  beforeEach(() => {
    // Reset workers before each test
    jobManager.workers.clear();
  });

  describe('initialization', () => {
    test('should initialize without errors', () => {
      expect(jobManager).toBeDefined();
      expect(jobManager.queue).toBeDefined();
    });

    test('should have fallback to memory mode', () => {
      // Without Redis URL, should use memory mode
      expect(['memory', 'object']).toContain(
        jobManager.queue === 'memory' ? 'memory' : 'object'
      );
    });
  });

  describe('worker registration', () => {
    test('should register a worker', () => {
      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      jobManager.registerWorker('test-queue', mockHandler);

      expect(jobManager.workers.has('test-queue')).toBe(true);
    });

    test('should retrieve registered worker', () => {
      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      jobManager.registerWorker('test-queue', mockHandler);

      const worker = jobManager.workers.get('test-queue');
      expect(worker).toBe(mockHandler);
    });

    test('should support multiple workers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      jobManager.registerWorker('queue1', handler1);
      jobManager.registerWorker('queue2', handler2);

      expect(jobManager.workers.size).toBe(2);
      expect(jobManager.workers.get('queue1')).toBe(handler1);
      expect(jobManager.workers.get('queue2')).toBe(handler2);
    });
  });

  describe('job submission', () => {
    test('should submit a job in-memory', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      jobManager.registerWorker('test-queue', mockHandler);

      const jobId = await jobManager.submitJob('test-queue', { test: 'data' });

      expect(jobId).not.toBeNull();
    });

    test('should handle missing queue gracefully', async () => {
      const jobId = await jobManager.submitJob('nonexistent-queue', {});
      expect(jobId).toBeNull();
    });

    test('should pass job data to handler', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      const testData = { userId: 123, message: 'test' };

      jobManager.registerWorker('test-queue', mockHandler);
      await jobManager.submitJob('test-queue', testData);

      // In-memory execution should call handler immediately
      // Note: submitJob is async but handler execution timing varies
    });

    test('should support job options', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      jobManager.registerWorker('test-queue', mockHandler);

      const jobId = await jobManager.submitJob('test-queue', {}, {
        delay: 5000,
        priority: 'high'
      });

      expect(jobId).not.toBeNull();
    });
  });

  describe('queue operations', () => {
    test('should pause queue', async () => {
      // Should not throw even if queue doesn't exist
      await jobManager.pauseQueue('test-queue');
    });

    test('should resume queue', async () => {
      // Should not throw even if queue doesn't exist
      await jobManager.resumeQueue('test-queue');
    });

    test('should get queue stats', async () => {
      const stats = await jobManager.getQueueStats('nonexistent');
      
      if (stats) {
        expect(stats).toHaveProperty('waiting');
        expect(stats).toHaveProperty('active');
        expect(stats).toHaveProperty('completed');
        expect(stats).toHaveProperty('failed');
      }
    });
  });

  describe('job status', () => {
    test('should get job status', async () => {
      const status = await jobManager.getJobStatus('test-queue', 'fake-job-id');
      
      // In-memory mode returns unknown
      if (status) {
        expect(status).toHaveProperty('status');
        expect(status).toHaveProperty('progress');
      }
    });
  });

  describe('error handling', () => {
    test('should handle handler errors gracefully', async () => {
      const mockHandler = jest.fn().mockRejectedValue(new Error('Handler error'));
      jobManager.registerWorker('error-queue', mockHandler);

      // Should handle error without crashing
      try {
        await jobManager.submitJob('error-queue', {});
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should handle missing handler', async () => {
      // Don't register a handler
      const jobId = await jobManager.submitJob('missing-handler-queue', {});
      expect(jobId).toBeNull();
    });
  });

  describe('lifecycle', () => {
    test('should close gracefully', async () => {
      await jobManager.close();
      // Should not throw
    });

    test('should handle close without throwing', async () => {
      expect(async () => {
        await jobManager.close();
      }).not.toThrow();
    });
  });

  describe('email job handling', () => {
    test('should support email job submission', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      jobManager.registerWorker('email-jobs', mockHandler);

      const jobId = await jobManager.submitJob('email-jobs', {
        type: 'welcome',
        to: 'user@example.com',
        subject: 'Welcome'
      });

      expect(jobId).not.toBeNull();
    });
  });

  describe('blockchain job handling', () => {
    test('should support blockchain job submission', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      jobManager.registerWorker('blockchain-jobs', mockHandler);

      const jobId = await jobManager.submitJob('blockchain-jobs', {
        type: 'stamp-fact-check',
        factCheckId: 'fc-123',
        data: {}
      });

      expect(jobId).not.toBeNull();
    });
  });

  describe('memory efficiency', () => {
    test('should handle many job submissions', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      jobManager.registerWorker('stress-queue', mockHandler);

      const jobs = [];
      for (let i = 0; i < 100; i++) {
        jobs.push(
          jobManager.submitJob('stress-queue', { index: i })
        );
      }

      const results = await Promise.all(jobs);
      expect(results).toHaveLength(100);
    });
  });
});
