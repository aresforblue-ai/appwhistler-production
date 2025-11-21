// Test PostgreSQL connection
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const require = createRequire(import.meta.url);
const { getDatabaseConfig } = require('../config/secrets.cjs');

async function testConnection() {
  console.log('Testing PostgreSQL connection...');

  try {
    const config = getDatabaseConfig();
    console.log('Config loaded:', {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password ? '***' + config.password.slice(-3) : 'NOT SET'
    });

    const pg = await import('pg');
    const { Pool } = pg.default || pg;
    const pool = new Pool(config);

    console.log('Attempting to connect...');
    const result = await pool.query('SELECT NOW() as time, version() as version');
    console.log('✅ Connected successfully!');
    console.log('Time:', result.rows[0].time);
    console.log('PostgreSQL version:', result.rows[0].version);

    // Check if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\nExisting tables:');
    if (tablesResult.rows.length === 0) {
      console.log('  (none - database is empty)');
    } else {
      tablesResult.rows.forEach(row => {
        console.log('  -', row.table_name);
      });
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Full error:', error);
  }
}

testConnection();
