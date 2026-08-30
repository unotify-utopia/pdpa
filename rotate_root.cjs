const { Client } = require('ssh2');

async function changeRootPassword(host, currentPassword, newPassword) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      console.log(`Connected to ${host}`);
      // Escape the new password to prevent shell injection/evaluation issues
      // Since it contains characters like $, ^, &, %, we must wrap it in single quotes carefully.
      // Easiest robust way in bash is to echo it securely or just wrap in strict single quotes:
      // echo 'newpass' | chpasswd
      const escapedPassword = newPassword.replace(/'/g, "'\\''");
      conn.exec(`echo 'root:${escapedPassword}' | chpasswd`, (err, stream) => {
        if (err) return reject(err);
        stream.on('close', (code, signal) => {
          console.log(`Password changed for ${host}, exit code: ${code}`);
          conn.end();
          resolve();
        }).on('data', (data) => {
          console.log('STDOUT: ' + data);
        }).stderr.on('data', (data) => {
          console.error('STDERR: ' + data);
        });
      });
    }).on('error', (err) => {
      reject(err);
    }).connect({
      host: host,
      port: 22,
      username: 'root',
      password: currentPassword
    });
  });
}

async function run() {
  try {
    const prodCurrent = 'wN4^bR7*vM1%xH+0qF(5';
    const prodNew = 'wN4^bR7*vM1%xH+0qF(5';
    
    const sandboxCurrent = 'P8&xK!2mYc@5bW4^nJ7*';
    const sandboxNew = 'P8&xK!2mYc@5bW4^nJ7*';
    
    await changeRootPassword('119.59.124.169', prodCurrent, prodNew);
    console.log(`Prod new root password set to user preference.`);
    
    await changeRootPassword('119.59.102.26', sandboxCurrent, sandboxNew);
    console.log(`Sandbox new root password set to user preference.`);
    
  } catch (err) {
    console.error('Error changing passwords:', err);
  }
}

run();
