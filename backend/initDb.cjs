// backend/initDb.cjs
// Quick database initializer that runs from backend directory

const fs = require('fs');
const path = require('path');

async function initDatabase() {
  console.log('🔧 Initializing database with SQLite...');

  try {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.join(__dirname, '..', 'database', 'appwhistler.db');

    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Failed to create database:', err);
        process.exit(1);
      }
      console.log('✅ SQLite database created at:', dbPath);
    });

    // Read SQLite-compatible schema
    const schemaPath = path.join(__dirname, 'schema-sqlite.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    await new Promise((resolve, reject) => {
      db.exec(schema, (err) => {
        if (err) {
          console.error('❌ Schema creation failed:', err);
          reject(err);
        } else {
          console.log('✅ Schema created successfully');
          resolve();
        }
      });
    });

    // Check if data already exists
    const hasData = await new Promise((resolve) => {
      db.get('SELECT COUNT(*) as count FROM apps', (err, row) => {
        if (err || !row) resolve(false);
        else resolve(row.count > 0);
      });
    });

    if (!hasData) {
      console.log('📊 Seeding database with demo data...');

      // Read and adapt seed data
      const seedPath = path.join(__dirname, '..', 'database', 'seed.sql');
      let seed = fs.readFileSync(seedPath, 'utf8');

      // Adapt for SQLite
      seed = seed.replace(/TRUE/g, '1').replace(/FALSE/g, '0');

      await new Promise((resolve, reject) => {
        db.exec(seed, (err) => {
          if (err) {
            console.error('❌ Seeding failed:', err);
            reject(err);
          } else {
            console.log('✅ Database seeded with 12 demo apps');
            resolve();
          }
        });
      });
    } else {
      console.log('✅ Database already has data');
    }

    // Verify data
    db.get('SELECT COUNT(*) as count FROM apps', (err, row) => {
      if (err) {
        console.error('❌ Verification failed:', err);
      } else {
        console.log(`✅ Total apps in database: ${row.count}`);
      }

      db.close((err) => {
        if (err) console.error('Error closing database:', err);
        else console.log('✅ Database initialization complete!');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };
