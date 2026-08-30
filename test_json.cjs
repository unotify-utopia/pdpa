const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
  conn.exec(`node -e "
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: 'postgres://pdpa_admin:T7#yM2@pW9$vK5^nR8!cJ4&q@127.0.0.1:5432/pdpa_single_db' });
    pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 1').then(res => {
      console.log(JSON.stringify({ success: true, logs: res.rows }));
      process.exit(0);
    });
  "`, (err, stream) => { 
    stream.on('data', d => process.stdout.write(d.toString()))
          .stderr.on('data', d => process.stderr.write(d.toString()))
          .on('close', () => conn.end()); 
  }); 
}).connect({host: '119.59.102.26', username: 'root', password: 'P8&xK!2mYc@5bW4^nJ7*'});
