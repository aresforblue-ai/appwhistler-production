// backend/agents/entityRecognitionAgent.js
// AI agent for named entity recognition (people, organizations, locations, etc.)

class EntityRecognitionAgent {
  constructor() {
    this.name = 'EntityRecognitionAgent';
    this.version = '1.0.0';
    this.initialized = false;
    this.totalProcessed = 0;
    this.lastUsed = null;

    // Entity type patterns (simplified)
    this.patterns = {
      PERSON: /\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g,
      ORGANIZATION: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(Inc\.|Corp\.|Ltd\.|LLC|Company)\b/g,
      LOCATION: /\b(in|at|from|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g,
      DATE: /\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}|[A-Z][a-z]+\s+\d{1,2},?\s+\d{4})\b/g,
      MONEY: /\$[\d,]+(?:\.\d{2})?|\d+\s*(?:dollars?|euros?|pounds?)\b/gi,
      PERCENTAGE: /\d+(?:\.\d+)?%/g,
    };

    // Common entity keywords
    this.keywords = {
      PERSON: new Set(['president', 'ceo', 'director', 'senator', 'mayor', 'dr', 'professor']),
      ORGANIZATION: new Set(['university', 'hospital', 'government', 'department', 'agency']),
      LOCATION: new Set(['city', 'state', 'country', 'county', 'province']),
    };
  }

  async initialize() {
    console.log(`🤖 Initializing ${this.name}...`);
    // Initialize NER models
    this.initialized = true;
    return { status: 'ready', agent: this.name };
  }

  /**
   * Recognize entities in text
   * @param {string} text - The text to analyze
   * @param {Object} options - Recognition options
   * @returns {Object} Entity recognition result
   */
  async process(text, options = {}) {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text provided');
    }

    const { entityTypes = Object.keys(this.patterns), minConfidence = 0.5 } = options;

    const entities = [];

    // Extract entities by type
    entityTypes.forEach(type => {
      if (this.patterns[type]) {
        const extracted = this.extractEntities(text, type);
        entities.push(...extracted);
      }
    });

    // Deduplicate entities
    const uniqueEntities = this.deduplicateEntities(entities);

    // Filter by confidence
    const filteredEntities = uniqueEntities.filter(e => e.confidence >= minConfidence);

    // Group by type
    const grouped = this.groupByType(filteredEntities);

    // Extract relationships
    const relationships = this.extractRelationships(text, filteredEntities);

    this.totalProcessed++;
    this.lastUsed = new Date().toISOString();

    return {
      totalEntities: filteredEntities.length,
      entities: filteredEntities,
      grouped,
      relationships,
      summary: this.generateSummary(grouped),
      recognizedAt: new Date().toISOString(),
    };
  }

  /**
   * Extract entities of a specific type
   */
  extractEntities(text, type) {
    const entities = [];
    const pattern = this.patterns[type];

    if (!pattern) return entities;

    let match;
    const regex = new RegExp(pattern.source, pattern.flags);

    while ((match = regex.exec(text)) !== null) {
      const entityText = match[0].trim();
      const confidence = this.calculateConfidence(entityText, type);

      entities.push({
        text: entityText,
        type,
        confidence,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }

    return entities;
  }

  /**
   * Calculate confidence for an entity
   */
  calculateConfidence(entityText, type) {
    let confidence = 0.6; // Base confidence

    const lower = entityText.toLowerCase();

    // Check if entity text contains type-specific keywords
    if (this.keywords[type]) {
      const keywords = Array.from(this.keywords[type]);
      if (keywords.some(kw => lower.includes(kw))) {
        confidence += 0.2;
      }
    }

    // Check capitalization (proper nouns)
    if (/^[A-Z]/.test(entityText)) {
      confidence += 0.1;
    }

    // Type-specific confidence adjustments
    if (type === 'DATE' && /\d{4}/.test(entityText)) {
      confidence += 0.2; // Has year
    }

    if (type === 'MONEY' && /\$/.test(entityText)) {
      confidence += 0.2; // Has currency symbol
    }

    if (type === 'PERCENTAGE' && /%/.test(entityText)) {
      confidence += 0.3; // Clear percentage
    }

    return Math.min(confidence, 1);
  }

  /**
   * Deduplicate entities
   */
  deduplicateEntities(entities) {
    const seen = new Map();

    entities.forEach(entity => {
      const key = `${entity.type}:${entity.text.toLowerCase()}`;

      if (!seen.has(key) || seen.get(key).confidence < entity.confidence) {
        seen.set(key, entity);
      }
    });

    return Array.from(seen.values());
  }

  /**
   * Group entities by type
   */
  groupByType(entities) {
    const grouped = {};

    entities.forEach(entity => {
      if (!grouped[entity.type]) {
        grouped[entity.type] = [];
      }
      grouped[entity.type].push(entity);
    });

    return grouped;
  }

  /**
   * Extract relationships between entities
   */
  extractRelationships(text, entities) {
    const relationships = [];

    // Simple co-occurrence based relationships
    // In production, use dependency parsing and more sophisticated NLP

    const persons = entities.filter(e => e.type === 'PERSON');
    const orgs = entities.filter(e => e.type === 'ORGANIZATION');

    persons.forEach(person => {
      orgs.forEach(org => {
        // Check if person and org appear close together
        const distance = Math.abs(person.startIndex - org.startIndex);

        if (distance < 100) {
          // Within 100 characters
          relationships.push({
            subject: person.text,
            predicate: 'associated_with',
            object: org.text,
            confidence: 0.6,
          });
        }
      });
    });

    return relationships;
  }

  /**
   * Generate summary
   */
  generateSummary(grouped) {
    const summary = {
      totalTypes: Object.keys(grouped).length,
      byType: {},
    };

    Object.entries(grouped).forEach(([type, entities]) => {
      summary.byType[type] = {
        count: entities.length,
        examples: entities.slice(0, 3).map(e => e.text),
      };
    });

    return summary;
  }

  async shutdown() {
    console.log(`🛑 Shutting down ${this.name}...`);
    this.initialized = false;
  }
}

module.exports = new EntityRecognitionAgent();
