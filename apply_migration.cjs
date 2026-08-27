const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

async function applyMigration() {
  try {
    const sql = fs.readFileSync('migrations/003_cookie_consent.sql', 'utf8');
    await pool.query(sql);
    console.log('Migration 003_cookie_consent.sql applied successfully.');
  } catch (err) {
    console.error('Error applying migration:', err);
  } finally {
    pool.end();
  }
}

applyMigration();
