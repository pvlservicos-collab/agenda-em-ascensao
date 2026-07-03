const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não configurada nas variáveis de ambiente.');
}

const sql = neon(process.env.DATABASE_URL);

let migrated = null;
async function ensureSchema() {
  if (!migrated) {
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const statements = fs.readFileSync(schemaPath, 'utf8')
      .split(';')
      .map(s => s.trim())
      .filter(Boolean);
    migrated = (async () => {
      for (const stmt of statements) {
        await sql.query(stmt);
      }
    })();
  }
  return migrated;
}

function normalizeFone(v) {
  return String(v || '').replace(/\D/g, '');
}

module.exports = { sql, ensureSchema, normalizeFone };
