// database/init.js
// Smart Database Initializer - Works with PostgreSQL OR SQLite

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try PostgreSQL first, fallback to SQLite
let dbClient = null;
let dbType = null;

async function initializeDatabase() {
  console.log('🔧 Initializing database...');

  // Try PostgreSQL
  try {
    const pg = await import('pg');
    const { Pool } = pg.default || pg;

    // Use createRequire to load CommonJS module from ES module
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const { getDatabaseConfig } = require('../config/secrets.cjs');

    const config = getDatabaseConfig();
    const pool = new Pool(config);

    // Test connection
    await pool.query('SELECT NOW()');

    dbClient = pool;
    dbType = 'postgresql';
    console.log('✅ PostgreSQL connected');

    await runMigrations(pool, 'postgresql');
    return { client: pool, type: 'postgresql' };

  } catch (pgError) {
    console.log('⚠️  PostgreSQL not available:', pgError.message);
    console.log('🔄 Falling back to SQLite...');

    // Fallback to SQLite
    try {
      const sqlite3Module = await import('sqlite3');
      const sqlite3 = sqlite3Module.default;
      const dbPath = path.join(__dirname, 'appwhistler.db');

      const db = new sqlite3.Database(dbPath);
      dbClient = db;
      dbType = 'sqlite';
      console.log('✅ SQLite connected');

      await runMigrations(db, 'sqlite');
      return { client: db, type: 'sqlite' };

    } catch (sqliteError) {
      // Install SQLite if needed
      console.log('📦 Installing SQLite...');
      const { execSync } = await import('child_process');

      // Use platform-specific npm command (npm.cmd on Windows)
      const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const backendPath = path.join(__dirname, '..', 'backend');

      try {
        execSync(`${npmCmd} install sqlite3`, { cwd: backendPath, stdio: 'inherit' });
      } catch (installError) {
        console.error('Failed to install SQLite automatically:', installError.message);
        console.log('Please run manually: cd backend && npm install sqlite3');
        throw new Error('SQLite installation failed. Please install manually.');
      }

      // Retry
      const sqlite3Module = await import('sqlite3');
      const sqlite3 = sqlite3Module.default;
      const dbPath = path.join(__dirname, 'appwhistler.db');
      const db = new sqlite3.Database(dbPath);

      dbClient = db;
      dbType = 'sqlite';
      console.log('✅ SQLite installed and connected');

      await runMigrations(db, 'sqlite');
      return { client: db, type: 'sqlite' };
    }
  }
}

async function runMigrations(client, type) {
  console.log(`🔄 Running ${type} migrations...`);

  // Read schema file
  const schemaPath = path.join(__dirname, 'schema.sql');
  let schema = fs.readFileSync(schemaPath, 'utf8');

  // Adapt for SQLite if needed
  if (type === 'sqlite') {
    schema = schema
      .replace(/SERIAL PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT')
      .replace(/BIGINT/g, 'INTEGER')
      .replace(/VARCHAR\(\d+\)/g, 'TEXT')
      .replace(/DECIMAL\(\d+,\d+\)/g, 'REAL')
      .replace(/TIMESTAMP/g, 'TEXT')
      .replace(/JSONB/g, 'TEXT')
      .replace(/TEXT\[\]/g, 'TEXT') // Arrays as JSON strings
      .replace(/CURRENT_TIMESTAMP/g, 'DATETIME("now")')
      .replace(/BOOLEAN/g, 'INTEGER');

    // Remove PostgreSQL-specific GIN indexes (full-text search)
    // These use USING gin(to_tsvector()) which SQLite doesn't support
    const lines = schema.split('\n');
    schema = lines.filter(line => !line.includes('USING gin')).join('\n');
  }

  // Execute schema
  if (type === 'postgresql') {
    await client.query(schema);
  } else {
    // For SQLite, split and execute statements individually
    // because exec() has issues with some complex SQL
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.length > 0) {
        try {
          await new Promise((resolve, reject) => {
            client.run(statement, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        } catch (err) {
          // Log but continue - some statements might fail if tables/indexes already exist
          if (!err.message.includes('already exists')) {
            console.warn('Warning executing statement:', err.message);
          }
        }
      }
    }
  }

  console.log('✅ Schema created');

  // Check if data exists
  const hasData = await checkForData(client, type);

  if (!hasData) {
    console.log('📊 Seeding database...');
    await seedDatabase(client, type);
  } else {
    console.log('✅ Database already has data');
  }
}

async function checkForData(client, type) {
  if (type === 'postgresql') {
    const result = await client.query('SELECT COUNT(*) FROM apps');
    return parseInt(result.rows[0].count) > 0;
  } else {
    return new Promise((resolve) => {
      client.get('SELECT COUNT(*) as count FROM apps', (err, row) => {
        resolve(row && row.count > 0);
      });
    });
  }
}

async function seedDatabase(client, type) {
  const seedPath = path.join(__dirname, 'seed.sql');
  let seed = fs.readFileSync(seedPath, 'utf8');

  // Adapt for SQLite
  if (type === 'sqlite') {
    seed = seed.replace(/TRUE/g, '1').replace(/FALSE/g, '0');
  }

  if (type === 'postgresql') {
    await client.query(seed);
  } else {
    await new Promise((resolve, reject) => {
      client.exec(seed, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  console.log('✅ Database seeded with demo data');
}

// Run if executed directly
// Use pathToFileURL for Windows compatibility
const isRunDirectly = import.meta.url === pathToFileURL(process.argv[1]).href;

if (isRunDirectly) {
  initializeDatabase()
    .then(() => {
      console.log('🎉 Database initialization complete!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Database initialization failed:', err);
      process.exit(1);
    });
}

export { initializeDatabase, dbClient, dbType };
