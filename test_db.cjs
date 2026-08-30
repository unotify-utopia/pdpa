const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec("PGPASSWORD=P@ssw0rdProd_1787881427_Secure psql -h localhost -U pdpa_admin -d pdpa_prod_db -c 'SELECT 1;'", (err, stream) => {
    stream.on('close', () => conn.end())
      .on('data', d => console.log(d.toString()))
      .stderr.on('data', d => console.error(d.toString()));
  });
}).connect({ host: '119.59.124.169', port: 22, username: 'root', password: 'wN4^bR7*vM1%xH+0qF(5' });
