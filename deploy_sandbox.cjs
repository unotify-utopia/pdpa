const { Client } = require('ssh2');

const host = '119.59.102.26';
const username = 'root';
const password = process.env.SSH_PASSWORD;

const conn = new Client();

const commands = [
  'echo "--- 1. Setting up Database ---"',
  'sudo -u postgres psql -c "CREATE DATABASE pdpa_single_db;" || true',
  'sudo -u postgres psql -c "CREATE USER pdpa_admin WITH ENCRYPTED PASSWORD \'PdpaSecure_Prod2026\';" || true',
  'sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE pdpa_single_db TO pdpa_admin;"',
  'sudo -u postgres psql -d pdpa_single_db -c "GRANT ALL ON SCHEMA public TO pdpa_admin;"',
  'echo "--- 2. Cloning Repository ---"',
  'cd /var/www || mkdir -p /var/www && cd /var/www',
  'rm -rf pdpa-sandbox || true',
  'git clone https://github.com/unotify-utopia/pdpa.git pdpa-sandbox',
  'cd pdpa-sandbox',
  'git checkout sandbox-single-node',
  'echo "--- 3. Creating .env file ---"',
  'cat << \'EOF\' > .env\nDB_HOST=localhost\nDB_PORT=5432\nDB_USER=pdpa_admin\nDB_PASSWORD=PdpaSecure_Prod2026\nDB_NAME=pdpa_single_db\n\nPORT=3001\nJWT_SECRET=pdpa-super-secret-jwt-key-2026\nSYSTEM_MODE=SINGLE_NODE\nEOF',
  'echo "--- 4. Installing Dependencies ---"',
  'npm install',
  'echo "--- 5. Building Frontend ---"',
  'npm run build',
  'echo "--- 6. Setting up PM2 for Background Running ---"',
  'npm install -g pm2',
  'pm2 start server.js --name "pdpa-single-node" || pm2 restart "pdpa-single-node"',
  'pm2 save',
  'echo "--- Deployment Complete! ---"'
];

const fullScript = commands.join('\n');

conn.on('ready', () => {
  console.log('SSH Connection ready. Starting deployment...');
  
  conn.exec(fullScript, (err, stream) => {
    if (err) {
      console.error('Execution error:', err);
      conn.end();
      return;
    }
    
    stream.on('close', (code, signal) => {
      console.log('Stream closed with code ' + code);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('SSH Error:', err);
}).connect({
  host: host,
  port: 22,
  username: username,
  password: password,
  readyTimeout: 99999
});
