const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = code.split('\n');

const linesWithAwait = [1006, 1175, 1214, 1261, 1293, 1366, 1414, 1497, 1590, 1615, 1618];

for (const lineNum of linesWithAwait) {
  // walk backwards to find const fn = (
  for (let i = lineNum - 1; i >= 0; i--) {
    if (lines[i].match(/const [a-zA-Z0-9_]+ = \([^)]*\) => {/)) {
      if (!lines[i].includes('async')) {
        lines[i] = lines[i].replace(/const ([a-zA-Z0-9_]+) = \(([^)]*)\) => {/, 'const $1 = async ($2) => {');
        console.log('Fixed async for:', lines[i]);
      }
      break;
    }
  }
}

fs.writeFileSync('src/App.tsx', lines.join('\n'));
console.log('Fixed async dynamically');
