const { Client } = require('ssh2');
const script = `
cat << 'EOF' > test_ts.cjs
const { Pool } = require('pg');
const pool = new Pool({
  user: 'pdpa_admin',
  host: 'localhost',
  database: 'pdpa_prod_db',
  password: 'P@ssw0rdProd_1787881427_Secure'
});
pool.query('SELECT timestamp FROM audit_logs ORDER BY timestamp DESC LIMIT 1')
  .then(res => {
    console.log(res.rows[0].timestamp);
    console.log(typeof res.rows[0].timestamp);
    console.log(res.rows[0].timestamp.toISOString?.());
    process.exit(0);
  });
EOF
node test_ts.cjs
`;
const conn = new Client();
conn.on('ready', () => {
  conn.exec(script, (err, stream) => {
    stream.on('close', () => conn.end())
      .on('data', d => console.log(d.toString()))
      .stderr.on('data', d => console.error(d.toString()));
  });
}).connect({ host: '119.59.124.169', port: 22, username: 'root', password: 'wN4^bR7*vM1%xH+0qF(5' });
