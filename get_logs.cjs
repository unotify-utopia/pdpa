require('dotenv').config();
const { Client } = require('ssh2');
const conn = new Client();

console.log('Fetching logs from Production Server...');

conn.on('ready', () => {
  const cmd = `pm2 logs pdpa-backend --lines 100 --nostream`;
  
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('Error:', err);
      conn.end();
      process.exit(1);
    }
    
    stream.on('close', (code) => {
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('Connection error:', err);
  process.exit(1);
}).connect({
  host: process.env.SSH_HOST || '119.59.124.169',
  port: 22,
  username: process.env.SSH_USER || 'root',
  password: process.env.SSH_PASSWORD
});
