const pg = require('pg');

async function main() {
  const pool = new pg.Pool({ 
    host: 'utopia.pdpa.click', 
    port: 5432, 
    user: 'pdpa_admin', 
    password: 'PdpaSecure_Prod2026', 
    database: 'pdpa_prod_db',
    connectionTimeoutMillis: 5000 
  });

  try {
    const { rows } = await pool.query("SELECT id, username, email, role, mfa_enabled FROM users WHERE role='superadmin'");
    console.table(rows);
  } catch(e) {
    console.error(e.message);
  } finally {
    await pool.end();
  }
}
main();
