const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
  conn.exec(`curl -X POST http://localhost:3001/api/super-admin/login -H "Content-Type: application/json" -d '{"username":"apichat.utopia@gmail.com", "password":"password123"}'`, (err, stream) => { 
    stream.on('data', d => process.stdout.write(d.toString()))
          .stderr.on('data', d => process.stderr.write(d.toString()))
          .on('close', () => conn.end()); 
  }); 
}).connect({host: '119.59.102.26', username: 'root', password: 'P8&xK!2mYc@5bW4^nJ7*'});
