// scripts/generate-rest-spec.js
// Emit OpenAPI specification for REST endpoints that complements GraphQL

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'api');
const SPEC_PATH = path.join(OUTPUT_DIR, 'rest-openapi.yaml');

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

const spec = {
  openapi: '3.0.1',
  info: {
    title: 'AppWhistler REST API',
    version: '0.1.0',
    description: 'Snapshot of the public REST endpoints that complement the GraphQL API.'
  },
  servers: [
    { url: 'http://localhost:5000', description: 'Local development' }
  ],
  paths: {
    '/api/v1/apps/trending': {
      get: {
        summary: 'Trending verified apps',
        tags: ['Apps'],
        parameters: [
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            required: false,
            description: 'Optional search query to filter trending apps.'
          }
        ],
        responses: {
          '200': {
            description: 'List of trending apps',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          name: { type: 'string' },
                          package_id: { type: 'string' },
                          truth_rating: { type: 'number' },
                          download_count: { type: 'integer' },
                          is_verified: { type: 'boolean' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/v1/privacy/export': {
      post: {
        summary: 'Request data export',
        tags: ['Privacy'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Export request accepted'
          },
          '401': {
            description: 'Authentication required'
          }
        }
      }
    },
    '/api/v1/privacy/delete': {
      post: {
        summary: 'Request account deletion',
        tags: ['Privacy'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Deletion request accepted' },
          '401': { description: 'Authentication required' }
        }
      }
    },
    '/api/v1/privacy/policy': {
      get: {
        summary: 'Fetch latest privacy policy',
        tags: ['Privacy'],
        responses: {
          '200': {
            description: 'Markdown privacy policy',
            content: {
              'text/markdown': { schema: { type: 'string' } }
            }
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  }
};

function generate() {
  ensureOutputDir();
  const yamlString = yaml.dump(spec, { noRefs: true });
  fs.writeFileSync(SPEC_PATH, yamlString, 'utf8');
  console.log(`📝 REST OpenAPI spec written to ${path.relative(process.cwd(), SPEC_PATH)}`);
}

generate();
