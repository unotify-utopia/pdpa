const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const cmd = `cat << 'EOF' > /var/www/pdpa-sandbox/.env
DB_HOST=localhost
DB_PORT=5432
DB_USER=pdpa_admin
DB_PASSWORD='T7#yM2@pW9$vK5^nR8!cJ4&q'
DB_NAME=pdpa_single_db
PORT=3001
JWT_SECRET=pdpa-super-secret-jwt-key-2026
SYSTEM_MODE=SINGLE_NODE
EOF
pm2 restart pdpa-single-node
`;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => console.log(d.toString())).stderr.on('data', d => console.error(d.toString())).on('close', () => conn.end());
  });
}).connect({host: '119.59.102.26', username: 'root', password: 'G)6cUxio73M5F'});
