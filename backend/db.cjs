// backend/db.cjs
// Database wrapper - supports both PostgreSQL and SQLite
//  Currently using SQLite for development

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'database', 'appwhistler.db');

console.log(`📂 Using SQLite database at: ${dbPath}`);

// Open SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Failed to open SQLite database:', err.message);
    process.exit(1);
  }
  console.log('✅ SQLite database opened successfully');
});

// Promisify SQLite query methods to work like PostgreSQL pool
const pool = {
  query: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      // Handle PostgreSQL-specific queries
      if (sql.includes('SELECT NOW()')) {
        // SQLite equivalent
        db.get("SELECT datetime('now') as now", [], (err, row) => {
          if (err) reject(err);
          else resolve({ rows: [row] });
        });
        return;
      }

      // Handle parameterized queries - convert PostgreSQL $1, $2 to SQLite ?
      let sqliteSql = sql;
      if (params && params.length > 0) {
        // Replace $1, $2, etc. with ? for SQLite
        for (let i = params.length; i > 0; i--) {
          sqliteSql = sqliteSql.replace(new RegExp(`\\$${i}`, 'g'), '?');
        }
      }

      // Determine query type
      if (sqliteSql.trim().toUpperCase().startsWith('SELECT') ||
          sqliteSql.trim().toUpperCase().startsWith('PRAGMA')) {
        // SELECT query
        db.all(sqliteSql, params, (err, rows) => {
          if (err) {
            console.error('❌ SQLite query error:', err.message);
            console.error('   SQL:', sqliteSql);
            console.error('   Params:', params);
            reject(err);
          } else {
            resolve({ rows: rows || [] });
          }
        });
      } else {
        // INSERT, UPDATE, DELETE
        db.run(sqliteSql, params, function(err) {
          if (err) {
            console.error('❌ SQLite query error:', err.message);
            console.error('   SQL:', sqliteSql);
            console.error('   Params:', params);
            reject(err);
          } else {
            resolve({
              rows: [],
              rowCount: this.changes,
              lastID: this.lastID
            });
          }
        });
      }
    });
  },

  end: () => {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

// Export pool interface
module.exports = pool;
