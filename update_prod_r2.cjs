const { Client } = require('ssh2');

const updateEnv = `
cd /root/pdpa
sed -i 's/^R2_ACCESS_KEY_ID=.*/R2_ACCESS_KEY_ID=f2dc90cedb4d2b0331cd6a15df39b773/' .env
sed -i 's/^R2_SECRET_ACCESS_KEY=.*/R2_SECRET_ACCESS_KEY=ea3e06a829db2f6836576ea2633e176245e0f9f81be9eeb0fe0865e4b91b58da/' .env
pm2 restart pdpa-portal --update-env
pm2 save
`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(updateEnv, (err, stream) => {
    stream.on('close', () => {
      console.log('Production R2 keys updated.');
      conn.end();
    })
    .on('data', d => console.log(d.toString()))
    .stderr.on('data', d => console.error(d.toString()));
  });
}).connect({ host: '119.59.124.169', port: 22, username: 'root', password: 'wN4^bR7*vM1%xH+0qF(5' });
