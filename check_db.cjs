const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  conn.exec('sudo -u postgres psql -d pdpa_single_db -c "SELECT action, details, timestamp FROM audit_logs ORDER BY timestamp DESC LIMIT 3;"', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
          .on('data', (data) => console.log(data.toString()))
          .stderr.on('data', (data) => console.error(data.toString()));
  });
}).connect({ host: '119.59.102.26', port: 22, username: 'root', password: 'G)6cUxio73M5F' });
