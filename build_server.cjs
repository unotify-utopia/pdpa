const { Client } = require('ssh2');
const conn = new Client();
const commands = [
  "cd /var/www/pdpa || cd /var/www/pdpa-portal",
  "npm run build"
];

conn.on('ready', () => {
  conn.exec(commands.join(' && '), (err, stream) => {
    stream.on('close', () => conn.end())
      .on('data', d => process.stdout.write(d.toString()))
      .stderr.on('data', d => process.stderr.write(d.toString()));
  });
}).connect({ host: '119.59.124.169', port: 22, username: 'root', password: 'wN4^bR7*vM1%xH+0qF(5' });
