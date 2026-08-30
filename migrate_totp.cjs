const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function run() {
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN totp_secret VARCHAR(255)`);
    await pool.query(`ALTER TABLE users ADD COLUMN totp_enabled BOOLEAN DEFAULT false`);
    console.log('Columns added successfully.');
  } catch(e) {
    console.log('Error or columns already exist:', e.message);
  }
  pool.end();
}
run();
