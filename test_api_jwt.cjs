const { Client } = require('ssh2'); 
const jwt = require('jsonwebtoken');

const token = jwt.sign({ id: 'mock', role: 'superadmin' }, 'pdpa-super-secret-jwt-key-2026', { expiresIn: '1h' });

const conn = new Client(); 
conn.on('ready', () => { 
  conn.exec(`curl -s -H "Authorization: Bearer ${token}" http://127.0.0.1:3001/api/audit-logs`, (err, stream) => { 
    stream.on('data', d => process.stdout.write(d.toString()))
          .stderr.on('data', d => process.stderr.write(d.toString()))
          .on('close', () => conn.end()); 
  }); 
}).connect({host: '119.59.102.26', username: 'root', password: 'P8&xK!2mYc@5bW4^nJ7*'});
