const { Client } = require('ssh2');

const updateProdEnv = `
cd /root/pdpa
sed -i 's/^R2_ACCESS_KEY_ID=.*/R2_ACCESS_KEY_ID=f2dc90cedb4d2b0331cd6a15df39b773/' .env
sed -i 's/^R2_SECRET_ACCESS_KEY=.*/R2_SECRET_ACCESS_KEY=ea3e06a829db2f6836576ea2633e176245e0f9f81be9eeb0fe0865e4b91b58da/' .env
pm2 restart pdpa-req-system --update-env
pm2 save
`;

const updateSandboxEnv = `
cd /var/www/pdpa-sandbox
sed -i 's/^R2_ACCESS_KEY_ID=.*/R2_ACCESS_KEY_ID=f2dc90cedb4d2b0331cd6a15df39b773/' .env
sed -i 's/^R2_SECRET_ACCESS_KEY=.*/R2_SECRET_ACCESS_KEY=ea3e06a829db2f6836576ea2633e176245e0f9f81be9eeb0fe0865e4b91b58da/' .env
pm2 restart pdpa-sandbox --update-env
pm2 save
`;

const connProd = new Client();
connProd.on('ready', () => {
  connProd.exec(updateProdEnv, (err, stream) => {
    stream.on('close', () => {
      console.log('Production R2 keys updated and PM2 restarted.');
      connProd.end();
    })
    .on('data', d => console.log('PROD:', d.toString()))
    .stderr.on('data', d => console.error('PROD ERR:', d.toString()));
  });
}).connect({ host: '119.59.124.169', port: 22, username: 'root', password: 'wN4^bR7*vM1%xH+0qF(5' });

const connSand = new Client();
connSand.on('ready', () => {
  connSand.exec(updateSandboxEnv, (err, stream) => {
    stream.on('close', () => {
      console.log('Sandbox R2 keys updated and PM2 restarted.');
      connSand.end();
    })
    .on('data', d => console.log('SANDBOX:', d.toString()))
    .stderr.on('data', d => console.error('SANDBOX ERR:', d.toString()));
  });
}).connect({ host: '119.59.102.26', port: 22, username: 'root', password: 'P8&xK!2mYc@5bW4^nJ7*' });
