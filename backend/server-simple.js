const express = require('express');
const cors = require('cors');
const { loadSecrets, getSecret } = require('./config-secrets.cjs');
const { initializeDatabase } = require('../database/init.cjs');

const app = express();
app.use(cors({ origin: ['http://localhost:3000'], credentials: true }));
app.use(express.json());

let dbClient, dbType;

async function startServer() {
  try {
    console.log('🔐 Loading secrets...');
    await loadSecrets();
    
    console.log('🔧 Initializing database...');
    const db = await initializeDatabase();
    dbClient = db.client;
    dbType = db.type;
    
    app.get('/health', (req, res) => {
      res.json({ status: 'healthy', database: dbType });
    });
    
    app.get('/api/v1/apps/trending', async (req, res) => {
      try {
        if (dbType === 'postgresql') {
          const result = await dbClient.query(`
            SELECT 
              id, name, package_id as "packageId", category, description, developer,
              truth_rating as "truthRating", download_count as "downloadCount",
              platform, is_verified as "isVerified", average_rating as "averageRating"
            FROM apps
            WHERE is_verified = true
            ORDER BY download_count DESC
            LIMIT 20
          `);
          res.json({ success: true, data: result.rows });
        } else {
          dbClient.all(`
            SELECT 
              id, name, package_id as packageId, category, description, developer,
              truth_rating as truthRating, download_count as downloadCount,
              platform, is_verified as isVerified, average_rating as averageRating
            FROM apps
            WHERE is_verified = 1
            ORDER BY download_count DESC
            LIMIT 20
          `, (err, rows) => {
            if (err) res.status(500).json({ success: false, error: err.message });
            else res.json({ success: true, data: rows });
          });
        }
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });
    
    const PORT = getSecret('PORT', 5000);
    app.listen(PORT, () => {
      console.log(`
🚀 AppWhistler Server Ready!
━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 API: http://localhost:${PORT}/api/v1
📍 Health: http://localhost:${PORT}/health  
📍 Database: ${dbType.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    });
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
}

startServer();