// Advanced API Client - Rate limiting, retries, caching, error handling
// Provides intelligent API request management for all agents

const axios = require('axios');

class ApiClient {
  constructor(name, config = {}) {
    this.name = name;
    this.baseUrl = config.baseUrl || '';
    this.rateLimit = config.rateLimit || 60; // Requests per minute
    this.requestQueue = [];
    this.requestTimes = [];
    this.cache = new Map();
    this.cacheTimeout = config.cacheTimeout || 300000; // 5 minutes default

    // Retry configuration
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000; // Start with 1 second
    this.backoffMultiplier = config.backoffMultiplier || 2; // Exponential backoff

    // Request timeout
    this.timeout = config.timeout || 10000; // 10 seconds
  }

  /**
   * Make an API request with rate limiting, retries, and caching
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - Response data
   */
  async request(options) {
    const cacheKey = this.generateCacheKey(options);

    // Check cache first
    if (options.cache !== false) {
      const cached = this.getCache(cacheKey);
      if (cached) {
        console.log(`📦 [${this.name}] Cache hit: ${options.url}`);
        return cached;
      }
    }

    // Wait for rate limit
    await this.waitForRateLimit();

    // Execute request with retries
    const response = await this.executeWithRetry(options);

    // Cache successful responses
    if (options.cache !== false && response) {
      this.setCache(cacheKey, response);
    }

    return response;
  }

  /**
   * Execute request with exponential backoff retry logic
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - Response data
   */
  async executeWithRetry(options) {
    let lastError = null;
    let delay = this.retryDelay;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 [${this.name}] Retry ${attempt}/${this.maxRetries} after ${delay}ms`);
          await this.sleep(delay);
          delay *= this.backoffMultiplier; // Exponential backoff
        }

        const response = await this.executeRequest(options);

        // Reset request times on success
        this.trackRequest();

        return response;
      } catch (error) {
        lastError = error;

        // Don't retry on certain errors
        if (error.response) {
          const status = error.response.status;

          // Don't retry 4xx errors (except 429 rate limit)
          if (status >= 400 && status < 500 && status !== 429) {
            console.error(`❌ [${this.name}] Non-retryable error (${status}):`, error.message);
            throw error;
          }
        }

        // If it's the last attempt, throw the error
        if (attempt === this.maxRetries) {
          console.error(`❌ [${this.name}] Max retries exceeded:`, error.message);
          throw error;
        }
      }
    }

    throw lastError;
  }

  /**
   * Execute the actual HTTP request
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - Response data
   */
  async executeRequest(options) {
    const config = {
      method: options.method || 'GET',
      url: this.baseUrl + (options.url || ''),
      headers: options.headers || {},
      timeout: options.timeout || this.timeout,
      params: options.params,
      data: options.data
    };

    console.log(`🌐 [${this.name}] ${config.method} ${config.url}`);

    const response = await axios(config);
    return response.data;
  }

  /**
   * Wait if rate limit would be exceeded
   */
  async waitForRateLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove requests older than 1 minute
    this.requestTimes = this.requestTimes.filter(time => time > oneMinuteAgo);

    // If we've hit the rate limit, wait
    if (this.requestTimes.length >= this.rateLimit) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = 60000 - (now - oldestRequest) + 100; // Add 100ms buffer

      if (waitTime > 0) {
        console.log(`⏳ [${this.name}] Rate limit reached, waiting ${waitTime}ms...`);
        await this.sleep(waitTime);
      }
    }
  }

  /**
   * Track a request for rate limiting
   */
  trackRequest() {
    this.requestTimes.push(Date.now());
  }

  /**
   * Generate cache key from request options
   * @param {Object} options - Request options
   * @returns {string} - Cache key
   */
  generateCacheKey(options) {
    const key = JSON.stringify({
      url: options.url,
      method: options.method || 'GET',
      params: options.params,
      data: options.data
    });
    return key;
  }

  /**
   * Get cached response
   * @param {string} key - Cache key
   * @returns {Object|null} - Cached data or null
   */
  getCache(key) {
    const cached = this.cache.get(key);

    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cache value
   * @param {string} key - Cache key
   * @param {Object} data - Data to cache
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Limit cache size
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * Clear entire cache
   */
  clearCache() {
    this.cache.clear();
    console.log(`🗑️  [${this.name}] Cache cleared`);
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Make multiple parallel requests with automatic batching
   * @param {Array} requests - Array of request options
   * @param {number} batchSize - Number of concurrent requests
   * @returns {Promise<Array>} - Array of responses
   */
  async batchRequest(requests, batchSize = 5) {
    const results = [];

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      console.log(`📦 [${this.name}] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(requests.length / batchSize)}`);

      const batchResults = await Promise.all(
        batch.map(options => this.request(options).catch(err => ({
          error: true,
          message: err.message
        })))
      );

      results.push(...batchResults);
    }

    return results;
  }
}

module.exports = ApiClient;
