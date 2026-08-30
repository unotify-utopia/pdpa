const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const script = `
sed -i 's/server_name pdpa.utopia.in.th portal.pdpa.click pdpa.numcomputer.com;/server_name portal.pdpa.click;/' /etc/nginx/sites-available/pdpa
nginx -t && systemctl reload nginx
`;
  conn.exec(script, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', (data) => console.log(data.toString()))
      .stderr.on('data', (data) => console.error(data.toString()));
  });
}).connect({ host: '119.59.124.169', port: 22, username: 'root', password: '9EIy;45Gf2n-' });
