const { Client } = require('ssh2');

const script = `
cd /var/www/pdpa || exit 1

echo "" >> .env
echo "DB_USER=pdpa_admin" >> .env
echo "DB_PASSWORD=P@ssw0rdProd_1787881427_Secure" >> .env
echo "DB_HOST=localhost" >> .env
echo "DB_NAME=pdpa_prod_db" >> .env

pm2 restart all
`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(script, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', d => process.stdout.write(d.toString()))
      .stderr.on('data', d => process.stderr.write(d.toString()));
  });
}).connect({ host: '119.59.124.169', port: 22, username: 'root', password: 'wN4^bR7*vM1%xH+0qF(5' });
