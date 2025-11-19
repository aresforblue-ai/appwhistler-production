// scripts/run-migration.js
// Run database migrations

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function runMigration(filename) {
  const migrationPath = path.join(__dirname, '..', 'database', 'migrations', filename);
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log(`Running migration: ${filename}`);

  try {
    await pool.query(sql);
    console.log(`✅ Migration completed: ${filename}`);
  } catch (error) {
    console.error(`❌ Migration failed: ${filename}`);
    console.error(error.message);
    throw error;
  }
}

async function main() {
  const migrationFile = process.argv[2] || '001_add_avatar_url.sql';

  try {
    await runMigration(migrationFile);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
