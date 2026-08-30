const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('grep -r "server_name" /etc/nginx/sites-available/ && certbot certificates', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', (data) => console.log(data.toString()))
      .stderr.on('data', (data) => console.error(data.toString()));
  });
}).connect({ host: '119.59.124.169', port: 22, username: 'root', password: 'T7#yM2@pW9$vK5^nR8!cJ4&q' });
