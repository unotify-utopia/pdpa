const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  user: 'pdpa_admin',
  host: 'localhost',
  database: 'pdpa_prod_db',
  password: process.env.DB_PASSWORD,
  port: 5432
});

async function run() {
  try {
    const res = await pool.query("SELECT * FROM users WHERE username = 'apichat.utopia@gmail.com'");
    const hash = await bcrypt.hash('12345678', 10);
    if (res.rows.length === 0) {
      await pool.query(
        "INSERT INTO users (id, org_id, username, password_hash, full_name_th, email, role, department, mfa_enabled) VALUES ('usr_apichat', 'org_dopa', 'apichat.utopia@gmail.com', $1, 'Apichat Utopia', 'apichat.utopia@gmail.com', 'superadmin', 'IT Security', true)",
        [hash]
      );
      console.log('Added apichat user with password 12345678');
    } else {
      await pool.query("UPDATE users SET password_hash = $1, role = 'superadmin', mfa_enabled = true WHERE username = 'apichat.utopia@gmail.com'", [hash]);
      console.log('Updated apichat user to superadmin with password 12345678');
    }
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
