const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const wrongCode = `                          <span>การจัดการบัญชีผู้ใช้และกำหนดสิทธิ์ (User & Access Control Management)</span>
                          <span className="md:absolute md:right-4 text-[10px] text-slate-400 font-medium mt-2 md:mt-0">
                            เวอร์ชั่น 1.5.0 (Strict DB)
                          </span>`;
const correctCode = `                          <span>การจัดการบัญชีผู้ใช้และกำหนดสิทธิ์ (User & Access Control Management)</span>`;

code = code.replace(wrongCode, correctCode);

const oldFooterRegex = /\{typeof __APP_VERSION__ !== 'undefined' && \(\s*<span[^>]*>[\s\S]*?<\/span>\s*\)\}/;
const newFooter = `<span className="md:absolute md:right-4 text-[10px] text-slate-400 font-medium mt-2 md:mt-0">
            เวอร์ชั่น 1.5.0 (Strict DB Mode)
          </span>`;

code = code.replace(oldFooterRegex, newFooter);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed footer');
