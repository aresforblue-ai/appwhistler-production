// Simple database initializer
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { getDatabaseConfig } = require('../config/secrets');

async function initDatabase() {
  console.log('🔧 Initializing PostgreSQL database...');

  const config = getDatabaseConfig();
  const pool = new Pool(config);

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected');

    // Read and execute schema
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('✅ Schema created/updated');

    // Check if we need to seed
    const result = await pool.query('SELECT COUNT(*) FROM apps');
    const hasData = parseInt(result.rows[0].count) > 0;

    if (!hasData) {
      console.log('📊 Seeding database...');
      const seedPath = path.join(__dirname, '../database/seed.sql');
      const seed = fs.readFileSync(seedPath, 'utf8');
      await pool.query(seed);
      console.log('✅ Database seeded');
    } else {
      console.log('✅ Database already has data');
    }

    await pool.end();
    console.log('✅ Database initialization complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

initDatabase();
