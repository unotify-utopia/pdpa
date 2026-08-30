const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  conn.exec("pm2 logs pdpa-single-node --lines 30 --nostream", (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
          .on('data', (data) => console.log(data.toString()))
          .stderr.on('data', (data) => console.error(data.toString()));
  });
}).connect({ host: '119.59.102.26', port: 22, username: 'root', password: 'P8&xK!2mYc@5bW4^nJ7*' });
