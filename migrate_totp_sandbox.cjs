const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
  const query = `
    ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT false;
  `;
  conn.exec(`sudo -u postgres psql -d pdpa_single_db -c "${query.replace(/\n/g, ' ')}"`, (err, stream) => { 
    stream.on('data', d => process.stdout.write(d.toString()))
          .stderr.on('data', d => process.stderr.write(d.toString()))
          .on('close', () => conn.end()); 
  }); 
}).connect({host: '119.59.102.26', username: 'root', password: 'P8&xK!2mYc@5bW4^nJ7*'});
