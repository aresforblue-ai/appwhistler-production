require('dotenv').config();

function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = encodeURIComponent(process.env.DB_USER || 'postgres');
  const password = process.env.DB_PASSWORD ? `:${encodeURIComponent(process.env.DB_PASSWORD)}` : '';
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const database = process.env.DB_NAME || 'appwhistler';

  return `postgres://${user}${password}@${host}:${port}/${database}`;
}

module.exports = {
  databaseUrl: buildDatabaseUrl(),
  dir: 'database/migrations',
  migrationsTable: 'appwhistler_migrations',
  direction: 'up'
};
