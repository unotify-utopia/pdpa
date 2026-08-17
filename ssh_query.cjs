require('dotenv').config();
const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const dbUser = process.env.DB_USER || 'pdpa_admin';
  const dbPassword = process.env.DB_PASSWORD;
  const dbName = process.env.DB_NAME || 'pdpa_prod_db';
  
  if (!dbPassword || !process.env.SSH_PASSWORD) {
    console.error('Error: Please provide DB_PASSWORD and SSH_PASSWORD in your .env file.');
    process.exit(1);
  }

  const cmd = `cd /root/pdpa && node -e "import pg from 'pg'; const dbPool = new pg.Pool({ host: '127.0.0.1', port: 5432, user: '${dbUser}', password: '${dbPassword}', database: '${dbName}' }); dbPool.query(\\"DELETE FROM users WHERE role = 'superadmin' AND email != 'apichat.utopia@gmail.com'\\").then((res) => { console.log('Deleted rows:', res.rowCount); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });"`;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', (data) => console.log(data.toString()))
      .stderr.on('data', (data) => console.error(data.toString()));
  });
}).connect({ host: process.env.SSH_HOST || '119.59.124.169', port: 22, username: process.env.SSH_USER || 'root', password: process.env.SSH_PASSWORD });
