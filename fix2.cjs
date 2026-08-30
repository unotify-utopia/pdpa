const { Client } = require('ssh2');  
const conn = new Client();  
conn.on('ready', () = 
conn.exec("sudo -u postgres psql -d pdpa_prod_db -c 'UPDATE users SET org_id = ''default-tenant'' WHERE org_id = ''org_dopa'';'", (err, stream) = 
stream.on('close', () =, data =; });  
}).connect({ host: '119.59.102.26', username: 'root', password: 'P8&xK!2mYc@5bW4^nJ7*' });  
