const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
  conn.exec(`sudo -u postgres psql -d pdpa_single_db -c "SELECT username, totp_secret FROM users WHERE totp_secret IS NOT NULL"`, (err, stream) => { 
    stream.on('data', d => console.log('STDOUT: ' + d.toString()));
    stream.stderr.on('data', d => console.log('STDERR: ' + d.toString()));
    stream.on('close', () => conn.end()); 
  }); 
}).connect({host: '119.59.102.26', username: 'root', password: 'P8&xK!2mYc@5bW4^nJ7*'});
