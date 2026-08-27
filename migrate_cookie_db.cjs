require('dotenv').config();
const { Client } = require('ssh2');

const sql = `
CREATE TABLE IF NOT EXISTS cookie_consent_logs (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  action VARCHAR(50) NOT NULL,
  preferences JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cookie_session_id ON cookie_consent_logs(session_id);
`;

const runMigration = (name, host, username, password, dbName) => {
  return new Promise((resolve, reject) => {
    console.log(`\n========================================================`);
    console.log(`กำลังเชื่อมต่อไปยัง ${name} (${host})...`);
    console.log(`========================================================`);

    const conn = new Client();
    conn.on('ready', () => {
      console.log(`✅ เชื่อมต่อ ${name} สำเร็จ! กำลังสร้างตาราง cookie_consent_logs...`);
      const cmd = `sudo -u postgres psql -d ${dbName} -c "${sql.replace(/\n/g, ' ')}"`;
      
      conn.exec(cmd, (err, stream) => {
        if (err) {
          console.error(`❌ เกิดข้อผิดพลาดในการรันคำสั่งบน ${name}:`, err);
          conn.end();
          return reject(err);
        }
        
        stream.on('close', (code) => {
          if (code === 0) {
            console.log(`🎉 สร้างตารางในฐานข้อมูล ${name} สำเร็จเรียบร้อย!`);
          } else {
            console.log(`❌ คำสั่งเสร็จสิ้นด้วยรหัสข้อผิดพลาด: ${code}`);
          }
          conn.end();
          resolve();
        }).on('data', (data) => {
          process.stdout.write(data.toString());
        }).stderr.on('data', (data) => {
          process.stderr.write(data.toString());
        });
      });
    }).on('error', (err) => {
      console.error(`❌ ไม่สามารถเชื่อมต่อ SSH ไปยัง ${name} ได้:`, err.message);
      reject(err);
    }).connect({
      host: host,
      port: 22,
      username: username,
      password: password
    });
  });
};

async function main() {
  try {
    // 1. Run for Production Server
    const prodHost = process.env.SSH_HOST || '119.59.124.169';
    const prodUser = process.env.SSH_USER || 'root';
    const prodPass = process.env.SSH_PASSWORD;
    
    if (prodPass) {
      await runMigration('Production Server', prodHost, prodUser, prodPass, 'pdpa_prod_db');
    } else {
      console.log('⚠️ ข้ามการเชื่อมต่อ Production Server เนื่องจากไม่พบรหัสผ่าน SSH ใน .env (SSH_PASSWORD)');
    }

    // 2. Run for Sandbox Server
    const sandboxHost = '119.59.102.26';
    const sandboxUser = 'root';
    const sandboxPass = 'G)6cUxio73M5F';
    
    await runMigration('Sandbox Server', sandboxHost, sandboxUser, sandboxPass, 'pdpa_single_db');
    
    console.log('\n========================================================');
    console.log('การดำเนินการอัปเดตฐานข้อมูลทั้งหมดเสร็จสิ้น!');
    console.log('========================================================\n');
    process.exit(0);

  } catch (err) {
    console.error('Error during migration:', err);
    process.exit(1);
  }
}

main();
