require('dotenv').config();
const { Client } = require('ssh2');
const conn = new Client();

console.log('Fixing DB Permissions on Production Server...');

conn.on('ready', () => {
  const sql = `
    ALTER TABLE workflow_states OWNER TO pdpa_admin;
    ALTER TABLE workflow_transitions OWNER TO pdpa_admin;
    GRANT ALL PRIVILEGES ON TABLE workflow_states TO pdpa_admin;
    GRANT ALL PRIVILEGES ON TABLE workflow_transitions TO pdpa_admin;
  `;
  const cmd = `sudo -u postgres psql -d pdpa_prod_db -c "${sql}" && pm2 restart pdpa-backend`;
  
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('Error:', err);
      conn.end();
      process.exit(1);
    }
    
    stream.on('close', (code) => {
      console.log('Permission fix finished with code:', code);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('Connection error:', err);
  process.exit(1);
}).connect({
  host: process.env.SSH_HOST || '119.59.124.169',
  port: 22,
  username: process.env.SSH_USER || 'root',
  password: process.env.SSH_PASSWORD
});
