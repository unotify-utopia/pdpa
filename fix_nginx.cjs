const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const script = "sed -i 's/server_name utopia.pdpa.click sandbox.utopia.in.th;/server_name sandbox.pdpa.click;/' /etc/nginx/sites-available/pdpa\nsed -i 's|/etc/letsencrypt/live/utopia.pdpa.click/fullchain.pem|/etc/letsencrypt/live/sandbox.pdpa.click/fullchain.pem|' /etc/nginx/sites-available/pdpa\nsed -i 's|/etc/letsencrypt/live/utopia.pdpa.click/privkey.pem|/etc/letsencrypt/live/sandbox.pdpa.click/privkey.pem|' /etc/nginx/sites-available/pdpa\nsed -i 's/server_name sandboox.pdpa.click sandbox.utopia.in.th;/server_name utopia.pdpa.click;/' /etc/nginx/sites-available/sandbox.utopia.in.th\nnginx -t && systemctl reload nginx\ncertbot install --cert-name utopia.pdpa.click --nginx -n\nsystemctl reload nginx";
  conn.exec(script, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', (data) => console.log(data.toString()))
      .stderr.on('data', (data) => console.error(data.toString()));
  });
}).connect({ host: '119.59.102.26', port: 22, username: 'root', password: 'P8&xK!2mYc@5bW4^nJ7*' });
