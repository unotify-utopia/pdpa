const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const cmd = `cd /var/www/pdpa-sandbox && git pull origin sandbox-single-node && pm2 restart pdpa-single-node`;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => console.log(d.toString())).stderr.on('data', d => console.error(d.toString())).on('close', () => conn.end());
  });
}).connect({host: '119.59.102.26', username: 'root', password: 'G)6cUxio73M5F'});
