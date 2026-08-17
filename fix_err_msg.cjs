const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.routes.js'));

for (const file of files) {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace: message: err.message || '...' -> message: 'เกิดข้อผิดพลาดจากระบบ กรุณาลองใหม่อีกครั้ง'
  content = content.replace(/message:\s*err\.message\s*\|\|\s*'[^']*'/g, "message: 'เกิดข้อผิดพลาดจากระบบ กรุณาลองใหม่อีกครั้ง'");
  
  // Replace: message: err.message -> message: 'เกิดข้อผิดพลาดจากระบบ กรุณาลองใหม่อีกครั้ง'
  content = content.replace(/message:\s*err\.message/g, "message: 'เกิดข้อผิดพลาดจากระบบ กรุณาลองใหม่อีกครั้ง'");

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
}
