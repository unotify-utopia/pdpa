const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  conn.exec("cd /var/www/pdpa-portal && git branch -a", (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
          .on('data', (data) => console.log(data.toString()))
          .stderr.on('data', (data) => console.error(data.toString()));
  });
}).connect({ host: '119.59.124.169', port: 22, username: 'root', password: 'T7#yM2@pW9^nR8!cJ4&q' });
