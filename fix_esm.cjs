const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// The original injected code has these lines:
// const AdmZip = require('adm-zip');
// // const crypto = require('crypto'); (already imported)
// // const path = require('path'); (already imported)
// and inside the route:
// const PdfPrinter = require('pdfmake');

code = code.replace("const AdmZip = require('adm-zip');", "");
code = code.replace("// const crypto = require('crypto'); (already imported)", "");
code = code.replace("// const path = require('path'); (already imported)", "");

code = code.replace("const zip = new AdmZip();", "const { default: AdmZip } = await import('adm-zip');\n      const zip = new AdmZip();");
code = code.replace("const PdfPrinter = require('pdfmake');", "const { default: PdfPrinter } = await import('pdfmake');");

fs.writeFileSync('server.js', code);
console.log('Fixed ESM require errors in server.js');
