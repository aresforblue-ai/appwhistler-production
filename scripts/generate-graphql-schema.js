// scripts/generate-graphql-schema.js
// Generate SDL and markdown documentation for the GraphQL schema

const fs = require('fs');
const path = require('path');
const { printSchema, buildASTSchema } = require('graphql');
const typeDefs = require('../src/backend/schema');

const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'api');
const SDL_PATH = path.join(OUTPUT_DIR, 'graphql-schema.graphql');
const MARKDOWN_PATH = path.join(OUTPUT_DIR, 'graphql-schema.md');

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function generate() {
  ensureOutputDir();
  const schema = buildASTSchema(typeDefs);
  const sdl = printSchema(schema);

  fs.writeFileSync(SDL_PATH, `${sdl}\n`, 'utf8');

  const markdown = `# GraphQL Schema\n\nGenerated ${new Date().toISOString()}\n\n\u0060\u0060\u0060graphql\n${sdl}\n\u0060\u0060\u0060\n`;
  fs.writeFileSync(MARKDOWN_PATH, markdown, 'utf8');

  console.log(`📝 GraphQL schema written to ${path.relative(process.cwd(), SDL_PATH)}`);
  console.log(`📝 Markdown written to ${path.relative(process.cwd(), MARKDOWN_PATH)}`);
}

generate();
