const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  user: 'pdpa_admin',
  host: 'localhost',
  database: 'pdpa_prod_db',
  password: 'PdpaSecure_Prod2026',
  port: 5432
});

async function run() {
  try {
    const res = await pool.query("SELECT * FROM users WHERE username = 'apichat.utopia@gmail.com'");
    if (res.rows.length === 0) {
      const hash = await bcrypt.hash('admin1234', 10);
      await pool.query(
        "INSERT INTO users (id, org_id, username, password_hash, full_name_th, email, role, department, mfa_enabled) VALUES ('usr_apichat', 'org_dopa', 'apichat.utopia@gmail.com', $1, 'Apichat Utopia', 'apichat.utopia@gmail.com', 'admin', 'IT Security', true)",
        [hash]
      );
      console.log('Added apichat user');
    } else {
      await pool.query("UPDATE users SET mfa_enabled = true WHERE username = 'apichat.utopia@gmail.com'");
      console.log('User already exists, updated mfa_enabled');
    }
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
