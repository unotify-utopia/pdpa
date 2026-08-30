import fs from 'fs';
let app = fs.readFileSync('src/components/RopaBuilder.tsx', 'utf8');
app = app.replace(/alert\('บันทึกแบบร่างสำเร็ฃ'\)/g, 'showNotify ? showNotify("บันทึกแบบร่างสำเร็ฃ", "success") : alert("⺚⺱⺚⺭⺦⻉⺪ẚẪỌ�bẢ�Ẫả�b�")');
app = app.replace(/alert\('***************'\)/g, 'showNotify ? showNotify("***************", "success") : alert("***************")');
app = app.replace(/alert\(('>showNotify("$1", "error") : alert("$1")');
app = app.replace(/alert\((.+?)\)/g, 'showNotify ? showNotify($1, "error") : alert($1)');
fs.writeFileSync('src/components/RopaBuilder.tsx', app);
console.log('Done Ropa.replace');
