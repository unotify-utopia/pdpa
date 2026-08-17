require('dotenv').config();
const { Client } = require('ssh2');

const conn = new Client();

console.log('========================================================');
console.log('       กำลังเชื่อมต่อไปยัง Production Server (119.59.124.169)...');
console.log('========================================================\n');

conn.on('ready', () => {
  console.log('✅ เชื่อมต่อ Server สำเร็จ! กำลังอัปเดตระบบ...');
  const cmd = `cd /root/pdpa && git fetch --all && git reset --hard origin/main && npm run build && (pm2 restart pdpa-backend || pm2 restart all)`;
  
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('❌ เกิดข้อผิดพลาดในการรันคำสั่ง:', err);
      conn.end();
      process.exit(1);
    }
    
    stream.on('close', (code, signal) => {
      console.log('\n========================================================');
      if (code === 0) {
        console.log('🎉 อัปเดตและรีสตาร์ทระบบบน Production Server สำเร็จเรียบร้อย!');
      } else {
        console.log(`❌ คำสั่งเสร็จสิ้นด้วยรหัสข้อผิดพลาด: ${code}`);
      }
      console.log('========================================================');
      conn.end();
      process.exit(code || 0);
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('❌ ไม่สามารถเชื่อมต่อ SSH ไปยัง Server ได้:', err.message);
  process.exit(1);
}).connect({
  host: process.env.SSH_HOST || '119.59.124.169',
  port: 22,
  username: process.env.SSH_USER || 'root',
  password: process.env.SSH_PASSWORD
});
