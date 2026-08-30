const fs = require('fs');

const appPath = 'd:/PDPA req/src/App.tsx';
let app = fs.readFileSync(appPath, 'utf8');
app = app.replace('v1.0.0-beta', 'v1.1.0-beta');
fs.writeFileSync(appPath, app, 'utf8');

const pkgPath = 'd:/PDPA req/package.json';
let pkg = fs.readFileSync(pkgPath, 'utf8');
pkg = pkg.replace(/"version":\s*"[^"]+"/, '"version": "1.1.0-beta"');
fs.writeFileSync(pkgPath, pkg, 'utf8');

console.log('Version updated to 1.1.0-beta!');
