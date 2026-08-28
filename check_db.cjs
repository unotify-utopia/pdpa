const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec("grep -E 'process.env.DB|pool' /var/www/pdpa/services/database.init.js", (err, stream) => {
    stream.on('close', () => conn.end())
      .on('data', d => console.log(d.toString()))
      .stderr.on('data', d => console.error(d.toString()));
  });
}).connect({ host: '119.59.124.169', port: 22, username: 'root', password: 'B7!cN1^yHj6*' });
