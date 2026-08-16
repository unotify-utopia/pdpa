const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const cmd = `cd /root/pdpa && node -e "import pg from 'pg'; const dbPool = new pg.Pool({ host: '127.0.0.1', port: 5432, user: 'pdpa_admin', password: 'Pdpa@Secure2070!', database: 'pdpa_prod_db' }); dbPool.query(\\"DELETE FROM users WHERE role = 'superadmin' AND email != 'apichat.utopia@gmail.com'\\").then((res) => { console.log('Deleted rows:', res.rowCount); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });"`;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', (data) => console.log(data.toString()))
      .stderr.on('data', (data) => console.error(data.toString()));
  });
}).connect({ host: '119.59.124.169', port: 22, username: 'root', password: '9EIy;45Gf2n-' });
