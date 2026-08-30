const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('cd /var/www/pdpa && git status && git log -n 1 --oneline', (err, stream) => {
    stream.on('close', () => conn.end())
      .on('data', d => process.stdout.write(d.toString()))
      .stderr.on('data', d => process.stderr.write(d.toString()));
  });
}).connect({ host: '119.59.124.169', port: 22, username: 'root', password: 'wN4^bR7*vM1%xH+0qF(5' });
