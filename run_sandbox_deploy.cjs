const { Client } = require('ssh2');
const conn = new Client();

const commands = [
  "echo '--- Installing Redis ---'",
  "apt-get update && apt-get install redis-server -y",
  "systemctl enable redis-server && systemctl start redis-server",
  "echo '--- Updating Code ---'",
  "cd /var/www/pdpa-sandbox",
  "git pull origin sandbox-single-node",
  "npm install",
  "npm run build",
  "echo '--- Setting up REDIS_URL in .env ---'",
  "grep -q 'REDIS_URL' .env || echo '\nREDIS_URL=redis://localhost:6379' >> .env",
  "echo '--- Restarting Server ---'",
  "pm2 restart all",
  "pm2 save"
];

conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec(commands.join(' && '), (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.error('STDERR: ' + data);
    });
  });
}).connect({
  host: '119.59.102.26',
  port: 22,
  username: 'root',
  password: 'P8&xK!2mYc@5bW4^nJ7*'
});
