// src/backend/queues/jobManager.js
// Background job queue management using Bull/BullMQ with fallback to inline execution

const { getSecret } = require('../config-secrets.cjs');

class JobManager {
  constructor() {
    this.queue = null;
    this.workers = new Map();
    this.redisEnabled = false;
    this.initializeQueue();
  }

  /**
   * Initialize job queue (Bull with Redis or fallback)
   */
  initializeQueue() {
    const redisUrl = getSecret('REDIS_URL');

    if (!redisUrl) {
      console.log('⚠️  Redis not configured. Using in-memory job execution (dev/test mode).');
      this.queue = 'memory'; // Marker for fallback mode
      return;
    }

    try {
      const { Queue } = require('bullmq');
      const redis = require('redis');

      this.redisClient = redis.createClient({
        url: redisUrl
      });

      this.redisClient.on('error', (err) => console.error('Redis error:', err));
      this.redisClient.on('connect', () => {
        console.log('✅ Redis connected for job queue');
        this.redisEnabled = true;
      });

      this.redisClient.connect().catch(() => {
        console.warn('⚠️  Redis connection failed, falling back to in-memory execution');
        this.queue = 'memory';
      });

      // Initialize job queues
      this.queue = {
        email: new Queue('email-jobs', { connection: this.redisClient }),
        blockchain: new Queue('blockchain-jobs', { connection: this.redisClient }),
        factCheck: new Queue('fact-check-jobs', { connection: this.redisClient })
      };

      this.redisEnabled = true;
    } catch (error) {
      console.warn('⚠️  Bull/BullMQ initialization failed, using in-memory execution:', error.message);
      this.queue = 'memory';
    }
  }

  /**
   * Register a job worker
   * @param {string} queueName - Name of the queue
   * @param {function} handler - Async handler function
   */
  registerWorker(queueName, handler) {
    if (!this.redisEnabled || this.queue === 'memory') {
      // Store handler for in-memory execution
      this.workers.set(queueName, handler);
      console.log(`📋 Worker registered (in-memory): ${queueName}`);
      return;
    }

    try {
      const { Worker } = require('bullmq');
      const redis = require('redis');

      const worker = new Worker(queueName, async (job) => {
        try {
          return await handler(job.data);
        } catch (error) {
          console.error(`❌ Job error in ${queueName}:`, error);
          throw error;
        }
      }, {
        connection: this.redisClient
      });

      worker.on('completed', (job) => {
        console.log(`✅ Job completed: ${queueName} (ID: ${job.id})`);
      });

      worker.on('failed', (job, error) => {
        console.error(`❌ Job failed: ${queueName} (ID: ${job.id}) - ${error.message}`);
      });

      this.workers.set(queueName, worker);
      console.log(`📋 Worker registered (Redis): ${queueName}`);
    } catch (error) {
      console.error(`Failed to register worker for ${queueName}:`, error.message);
    }
  }

  /**
   * Submit a job to the queue
   * @param {string} queueName - Queue name
   * @param {object} jobData - Job data
   * @param {object} options - Job options (delay, priority, repeat, etc.)
   * @returns {Promise<string|null>} Job ID or null
   */
  async submitJob(queueName, jobData, options = {}) {
    try {
      if (this.queue === 'memory' || !this.redisEnabled) {
        // In-memory execution
        return this.executeJobInMemory(queueName, jobData, options);
      }

      if (!this.queue || !this.queue[queueName]) {
        console.warn(`⚠️  Queue not found: ${queueName}`);
        return null;
      }

      const job = await this.queue[queueName].add(
        jobData,
        {
          ...options,
          attempts: options.attempts || 3,
          backoff: options.backoff || { type: 'exponential', delay: 2000 },
          removeOnComplete: options.removeOnComplete !== false,
          removeOnFail: options.removeOnFail === true
        }
      );

      console.log(`📤 Job submitted: ${queueName} (ID: ${job.id})`);
      return job.id.toString();
    } catch (error) {
      console.error(`Failed to submit job to ${queueName}:`, error.message);
      return null;
    }
  }

  /**
   * Execute job in-memory (fallback mode)
   */
  async executeJobInMemory(queueName, jobData, options) {
    const handler = this.workers.get(queueName);

    if (!handler) {
      console.warn(`⚠️  No handler registered for queue: ${queueName}`);
      return null;
    }

    try {
      console.log(`⏱️  Executing job in-memory: ${queueName}`);
      const result = await handler(jobData);
      console.log(`✅ In-memory job completed: ${queueName}`);
      return 'inline-job';
    } catch (error) {
      console.error(`❌ In-memory job error: ${queueName}`, error);
      throw error;
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(queueName, jobId) {
    try {
      if (!this.redisEnabled || this.queue === 'memory') {
        return { status: 'unknown', progress: 0 };
      }

      if (!this.queue || !this.queue[queueName]) {
        return null;
      }

      const job = await this.queue[queueName].getJob(jobId);
      if (!job) return null;

      const state = await job.getState();
      const progress = job.progress();

      return {
        id: job.id,
        status: state, // 'waiting', 'active', 'completed', 'failed', 'delayed'
        progress,
        data: job.data,
        result: job.returnvalue,
        error: job.failedReason
      };
    } catch (error) {
      console.error(`Error fetching job status:`, error);
      return null;
    }
  }

  /**
   * Get queue stats
   */
  async getQueueStats(queueName) {
    try {
      if (!this.redisEnabled || this.queue === 'memory') {
        return { waiting: 0, active: 0, completed: 0, failed: 0 };
      }

      if (!this.queue || !this.queue[queueName]) {
        return null;
      }

      return await this.queue[queueName].getJobCounts();
    } catch (error) {
      console.error(`Error fetching queue stats for ${queueName}:`, error);
      return null;
    }
  }

  /**
   * Pause queue
   */
  async pauseQueue(queueName) {
    try {
      if (!this.redisEnabled || this.queue === 'memory') {
        console.log(`⏸️  Queue paused (in-memory): ${queueName}`);
        return;
      }

      if (this.queue && this.queue[queueName]) {
        await this.queue[queueName].pause();
        console.log(`⏸️  Queue paused: ${queueName}`);
      }
    } catch (error) {
      console.error(`Error pausing queue ${queueName}:`, error);
    }
  }

  /**
   * Resume queue
   */
  async resumeQueue(queueName) {
    try {
      if (!this.redisEnabled || this.queue === 'memory') {
        console.log(`▶️  Queue resumed (in-memory): ${queueName}`);
        return;
      }

      if (this.queue && this.queue[queueName]) {
        await this.queue[queueName].resume();
        console.log(`▶️  Queue resumed: ${queueName}`);
      }
    } catch (error) {
      console.error(`Error resuming queue ${queueName}:`, error);
    }
  }

  /**
   * Close all queues gracefully
   */
  async close() {
    try {
      if (this.redisEnabled && this.queue && typeof this.queue === 'object') {
        for (const [name, queueOrWorker] of Object.entries(this.queue)) {
          if (queueOrWorker && typeof queueOrWorker.close === 'function') {
            await queueOrWorker.close();
          }
        }
      }

      if (this.redisClient) {
        await this.redisClient.quit();
      }

      console.log('✅ Job queue closed gracefully');
    } catch (error) {
      console.error('Error closing job queue:', error);
    }
  }
}

// Singleton instance
const jobManager = new JobManager();

module.exports = jobManager;
