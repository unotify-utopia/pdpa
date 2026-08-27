const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const nginxConf = `server {
    listen 80;
    server_name sandbox.utopia.in.th;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_cache_bypass \\$http_upgrade;
        
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
    }
}`;

  const cmd = `
  echo "${nginxConf}" > /etc/nginx/sites-available/sandbox.utopia.in.th
  ln -sf /etc/nginx/sites-available/sandbox.utopia.in.th /etc/nginx/sites-enabled/
  nginx -t && systemctl reload nginx
  
  cd /var/www/pdpa-sandbox
  git pull origin sandbox-single-node
  pm2 restart pdpa-single-node
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => console.log(d.toString())).stderr.on('data', d => console.error(d.toString())).on('close', () => conn.end());
  });
}).connect({host: '119.59.102.26', username: 'root', password: 'G)6cUxio73M5F'});
