const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  conn.exec(`sudo -u postgres psql -d pdpa_single_db -c "SELECT id, name_th FROM tenants;"`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', (data) => console.log('STDOUT:\n' + data.toString()))
      .stderr.on('data', (data) => console.error('STDERR:\n' + data.toString()));
  });
}).connect({ host: '119.59.102.26', port: 22, username: 'root', password: 'P8&xK!2mYc@5bW4^nJ7*' });
