const fs = require('fs');
let code = fs.readFileSync('src/components/RopaBuilder.tsx', 'utf8');

code = code.replace(/alert\('บันทึกแบบร่างสำเร็ฃ'\)/g, 'showNotify ? showNotify("บันทึกแบบร่างสำเร็ฃ", "success") : alert("⺚⺱⺚⺭⺦⻉⺪ẚẪỌ�bẢ�Ẫả�b�")');
code = code.replace(/alert\('ส่งตรวจสอบสำเร็ก'\)/g, 'showNotify ? showNotify("ส่งตรวจสอบสำเร็ก", "success") : alert("ສ่งตรวจสอบสำเร็ฃ ')');
code = code.replace(/alert\('(.+?)'\)/g, 'showNotify ? showNotify("$1", "error") : alert("$1")');
code = code.replace(/alert\((.+?)\)/g, 'showNotify ? showNotify($1, "error") : alert($1)');

fs.writeFileSync('src/components/RopaBuilder.tsx', code);
