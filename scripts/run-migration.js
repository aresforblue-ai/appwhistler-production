// scripts/run-migration.js
// Helper script to create timestamped SQL migrations compatible with node-pg-migrate

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'database', 'migrations');

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');

  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join('');
}

function ensureMigrationsDir() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
  }
}

function createMigrationFile(name = 'new_migration') {
  ensureMigrationsDir();

  const safeName = name
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'migration';

  const fileName = `${timestamp()}_${safeName}.sql`;
  const filePath = path.join(MIGRATIONS_DIR, fileName);

  const template = `-- ${fileName}
-- Up migration

BEGIN;

-- TODO: add migration SQL here

COMMIT;

-- Down migration (rollback)
-- BEGIN;
--   -- add rollback SQL here
-- COMMIT;
`;

  fs.writeFileSync(filePath, template, 'utf8');
  console.log(`🆕 Created migration at database/migrations/${fileName}`);
}

function printUsage() {
  console.log('Usage: node scripts/run-migration.js create [name]');
}

function main() {
  const [command, name] = process.argv.slice(2);

  if (!command || command === 'help') {
    printUsage();
    return;
  }

  if (command !== 'create') {
    console.error(`Unknown command '${command}'.`);
    printUsage();
    process.exit(1);
  }

  createMigrationFile(name);
}

main();
