const { Client } = require('ssh2');

const setupFail2BanCommand = `
apt-get update -y && \
apt-get install -y fail2ban && \
bash -c 'cat <<EOF > /etc/fail2ban/jail.local
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 5
bantime = 3600
findtime = 600
EOF' && \
systemctl enable fail2ban && \
systemctl restart fail2ban && \
fail2ban-client status sshd
`;

async function installFail2Ban(host, password) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      console.log(`Connected to ${host}, installing Fail2Ban...`);
      conn.exec(setupFail2BanCommand, (err, stream) => {
        if (err) return reject(err);
        
        stream.on('close', (code, signal) => {
          console.log(`Finished on ${host} with exit code: ${code}`);
          conn.end();
          resolve();
        }).on('data', (data) => {
          process.stdout.write(data.toString());
        }).stderr.on('data', (data) => {
          process.stderr.write(data.toString());
        });
      });
    }).on('error', (err) => {
      reject(err);
    }).connect({
      host: host,
      port: 22,
      username: 'root',
      password: password
    });
  });
}

async function run() {
  try {
    const prodPassword = 'wN4^bR7*vM1%xH+0qF(5';
    const sandboxPassword = 'P8&xK!2mYc@5bW4^nJ7*';
    
    console.log('--- Setting up Fail2Ban on Production ---');
    await installFail2Ban('119.59.124.169', prodPassword);
    
    console.log('\\n--- Setting up Fail2Ban on Sandbox ---');
    await installFail2Ban('119.59.102.26', sandboxPassword);
    
    console.log('\\nAll servers protected with Fail2Ban successfully!');
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
