const { Client } = require('ssh2');
const script = `
cd /var/www/pdpa-sandbox
cat << 'EOF' > fix_tz.cjs
const { Pool } = require('pg');
const pool = new Pool({
  user: 'pdpa_admin',
  host: 'localhost',
  database: 'pdpa_single_db',
  password: 'T7#yM2@pW9$vK5^nR8!cJ4&q'
});
async function run() {
  await pool.query("ALTER TABLE audit_logs ALTER COLUMN timestamp TYPE TIMESTAMPTZ USING timestamp AT TIME ZONE 'UTC'");
  console.log("Fixed audit_logs timestamp column on Sandbox");
  process.exit(0);
}
run();
EOF
node fix_tz.cjs
`;
const conn = new Client();
conn.on('ready', () => {
  conn.exec(script, (err, stream) => {
    stream.on('close', () => conn.end())
      .on('data', d => console.log(d.toString()))
      .stderr.on('data', d => console.error(d.toString()));
  });
}).connect({ host: '119.59.102.26', port: 22, username: 'root', password: 'P8&xK!2mYc@5bW4^nJ7*' });
