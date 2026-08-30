const { Client } = require('ssh2');
const script = `
cd /root/pdpa
cat << 'EOF' > test_tz3.cjs
process.env.TZ = 'Asia/Bangkok';
const { Pool } = require('pg');
const pool = new Pool({
  user: 'pdpa_admin',
  host: 'localhost',
  database: 'pdpa_prod_db',
  password: 'P@ssw0rdProd_1787881427_Secure'
});
async function run() {
  await pool.query("BEGIN;");
  
  // Insert a test row with the exact bug
  const testId = 'test_' + Date.now();
  const utcString = new Date().toISOString(); // e.g. 02:30:00Z
  await pool.query('INSERT INTO audit_logs (id, timestamp, action) VALUES ($1, $2, $3)', [testId, utcString, 'TEST']);
  
  // Fetch it BEFORE ALTER
  const res1 = await pool.query('SELECT timestamp FROM audit_logs WHERE id = $1', [testId]);
  console.log("Before ALTER stringify:", res1.rows[0].timestamp.toISOString()); // Will output 19:30:00Z
  
  // Fix the schema
  await pool.query("ALTER TABLE audit_logs ALTER COLUMN timestamp TYPE TIMESTAMPTZ USING timestamp AT TIME ZONE 'UTC'");
  
  // Fetch it AFTER ALTER
  const res2 = await pool.query('SELECT timestamp FROM audit_logs WHERE id = $1', [testId]);
  console.log("After ALTER stringify:", res2.rows[0].timestamp.toISOString()); // Should output 02:30:00Z
  
  await pool.query("ROLLBACK;");
  process.exit(0);
}
run();
EOF
node test_tz3.cjs
`;
const conn = new Client();
conn.on('ready', () => {
  conn.exec(script, (err, stream) => {
    stream.on('close', () => conn.end())
      .on('data', d => console.log(d.toString()))
      .stderr.on('data', d => console.error(d.toString()));
  });
}).connect({ host: '119.59.124.169', port: 22, username: 'root', password: 'wN4^bR7*vM1%xH+0qF(5' });
