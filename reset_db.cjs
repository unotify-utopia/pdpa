const { Pool } = require('pg');

const pool = new Pool({
  user: 'pdpa_admin',
  host: 'localhost',
  database: 'pdpa_prod_db',
  password: 'PdpaSecure_Prod2026',
  port: 5432
});

async function run() {
  try {
    console.log('Clearing old database tables to fix schema mismatch...');
    await pool.query('DROP TABLE IF EXISTS users CASCADE;');
    await pool.query('DROP TABLE IF EXISTS tenants CASCADE;');
    await pool.query('DROP TABLE IF EXISTS requests CASCADE;');
    console.log('✅ Tables dropped. Please restart PM2 to recreate them with the correct schema.');
  } catch (e) {
    console.error('Error dropping tables:', e);
  } finally {
    pool.end();
  }
}
run();
