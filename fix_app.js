const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/alert\((['t"`].+?['t"`])\)/g, 'showNotify($1, "error")');
app = app.replace(/alert\((.+?)\)/g, 'showNotify($1, "error")');
fs.writeFileSync('src/App.tsx', app);
console.log('DONE');