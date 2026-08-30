const { Client } = require('ssh2');
const script = `
cd /root/pdpa
cat << 'EOF' > test_tz2.cjs
process.env.TZ = 'Asia/Bangkok';
const { Pool } = require('pg');
const pool = new Pool({
  user: 'pdpa_admin',
  host: 'localhost',
  database: 'pdpa_prod_db',
  password: 'P@ssw0rdProd_1787881427_Secure'
});
async function run() {
  const res = await pool.query('SELECT timestamp FROM audit_logs ORDER BY timestamp DESC LIMIT 1');
  console.log("Current row Date:", res.rows[0].timestamp);
  console.log("Current row ISO :", res.rows[0].timestamp.toISOString());
  console.log("Current row toString:", res.rows[0].timestamp.toString());
  
  await pool.query("BEGIN;");
  await pool.query("ALTER TABLE audit_logs ALTER COLUMN timestamp TYPE TIMESTAMPTZ USING timestamp AT TIME ZONE 'UTC'");
  
  const res2 = await pool.query('SELECT timestamp FROM audit_logs ORDER BY timestamp DESC LIMIT 1');
  console.log("After ALTER Date:", res2.rows[0].timestamp);
  console.log("After ALTER ISO :", res2.rows[0].timestamp.toISOString());
  console.log("After ALTER toString:", res2.rows[0].timestamp.toString());
  
  await pool.query("ROLLBACK;");
  process.exit(0);
}
run();
EOF
node test_tz2.cjs
`;
const conn = new Client();
conn.on('ready', () => {
  conn.exec(script, (err, stream) => {
    stream.on('close', () => conn.end())
      .on('data', d => console.log(d.toString()))
      .stderr.on('data', d => console.error(d.toString()));
  });
}).connect({ host: '119.59.124.169', port: 22, username: 'root', password: 'wN4^bR7*vM1%xH+0qF(5' });
