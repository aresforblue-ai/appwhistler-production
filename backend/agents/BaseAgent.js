// Base Agent Class - Foundation for all research agents
// All specialized agents extend this class

class BaseAgent {
  constructor(name, version = '2.0') {
    this.name = name;
    this.version = version;
    this.status = 'idle'; // 'idle', 'running', 'completed', 'failed'
    this.progress = 0; // 0-100
    this.startTime = null;
    this.endTime = null;
    this.errors = [];
  }

  /**
   * Main execution method - must be implemented by subclasses
   * @param {Object} context - Execution context (appId, database pool, etc.)
   * @returns {Promise<Object>} - Analysis results
   */
  async execute(context) {
    throw new Error(`${this.name}: execute() method must be implemented by subclass`);
  }

  /**
   * Validate input data before execution
   * @param {Object} context - Execution context
   * @returns {Object} - Validation result {valid: boolean, errors: []}
   */
  validate(context) {
    const errors = [];

    if (!context) {
      errors.push('Context is required');
    }

    if (!context.appId) {
      errors.push('appId is required');
    }

    if (!context.pool) {
      errors.push('Database pool is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Run the agent with error handling and progress tracking
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} - Execution result
   */
  async run(context) {
    console.log(`🤖 [${this.name}] Starting analysis...`);

    // Validate inputs
    const validation = this.validate(context);
    if (!validation.valid) {
      console.error(`❌ [${this.name}] Validation failed:`, validation.errors);
      return {
        success: false,
        errors: validation.errors,
        agent: this.name,
        version: this.version
      };
    }

    this.status = 'running';
    this.progress = 0;
    this.startTime = new Date();

    try {
      // Execute the agent's main logic
      const result = await this.execute(context);

      this.status = 'completed';
      this.progress = 100;
      this.endTime = new Date();

      const duration = (this.endTime - this.startTime) / 1000; // seconds

      console.log(`✅ [${this.name}] Completed in ${duration.toFixed(2)}s`);

      return {
        success: true,
        data: result,
        agent: this.name,
        version: this.version,
        duration,
        completedAt: this.endTime.toISOString()
      };
    } catch (error) {
      this.status = 'failed';
      this.errors.push(error.message);
      this.endTime = new Date();

      console.error(`❌ [${this.name}] Failed:`, error.message);

      return {
        success: false,
        error: error.message,
        agent: this.name,
        version: this.version,
        errors: this.errors
      };
    }
  }

  /**
   * Update progress (0-100)
   * @param {number} progress - Progress percentage
   */
  updateProgress(progress) {
    this.progress = Math.min(100, Math.max(0, progress));
    console.log(`📊 [${this.name}] Progress: ${this.progress}%`);
  }

  /**
   * Fetch app data from database
   * @param {Object} pool - Database pool
   * @param {string} appId - App ID
   * @returns {Promise<Object>} - App data
   */
  async fetchAppData(pool, appId) {
    const result = await pool.query(
      'SELECT * FROM apps WHERE id = $1',
      [appId]
    );

    if (result.rows.length === 0) {
      throw new Error(`App not found: ${appId}`);
    }

    return result.rows[0];
  }

  /**
   * Save results to database
   * @param {Object} pool - Database pool
   * @param {string} table - Table name
   * @param {Object} data - Data to save
   * @returns {Promise<Object>} - Saved record
   */
  async saveResults(pool, table, data) {
    // This is a generic save method - subclasses should override for specific tables
    console.log(`💾 [${this.name}] Saving results to ${table}...`);
    return data;
  }

  /**
   * Calculate score based on indicators
   * @param {Object} indicators - Analysis indicators
   * @returns {number} - Score (0-100)
   */
  calculateScore(indicators) {
    // Default scoring - subclasses should override
    return 50;
  }

  /**
   * Detect red flags based on analysis
   * @param {Object} data - Analysis data
   * @returns {Array} - Array of red flags
   */
  detectRedFlags(data) {
    // Default red flag detection - subclasses should override
    return [];
  }

  /**
   * Log agent activity
   * @param {string} level - Log level ('info', 'warn', 'error')
   * @param {string} message - Log message
   */
  log(level, message) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.name}]`;

    switch (level) {
      case 'info':
        console.log(`${prefix} ℹ️  ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ⚠️  ${message}`);
        break;
      case 'error':
        console.error(`${prefix} ❌ ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }
}

module.exports = BaseAgent;
