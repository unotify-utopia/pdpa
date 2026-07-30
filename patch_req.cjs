const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const helper = `  const getRequestClone = (id: string): Request | undefined => {
    const r = requests.find(r => r.id === id) || getRequestById(id);
    return r ? JSON.parse(JSON.stringify(r)) : undefined;
  };
`;

code = code.replace('  const reloadData = () => {', helper + '\n  const reloadData = () => {');

code = code.replace(/\bgetRequestById\(/g, 'getRequestClone(');
code = code.replace('|| getRequestClone(id)', '|| getRequestById(id)'); // Fix the helper itself

fs.writeFileSync('src/App.tsx', code);
console.log('App.tsx patched successfully.');
