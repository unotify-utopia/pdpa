const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regexPattern = /const (handle[A-Za-z0-9_]+|toggleLegalHold) = \([^)]*\) => {([\s\S]*?)updateRequest\([^;]+;([\s\S]*?)reloadData\(\);\s*}/g;

code = code.replace(regexPattern, (match, funcName, beforeUpdate, afterUpdate) => {
  // Extract the updateRequest call
  const updateMatch = match.match(/(updateRequest\([^;]+;)/);
  if (!updateMatch) return match;
  
  const updateCall = updateMatch[1];
  
  // Create async signature
  let newMatch = match.replace(`const ${funcName} = (`, `const ${funcName} = async (`);
  if (newMatch === match) {
      // maybe no args
      newMatch = match.replace(`const ${funcName} = () => {`, `const ${funcName} = async () => {`);
  }
  
  // wrap in try catch
  const tryBlock = `
    try {
      await ${updateCall.replace('updateRequest(', 'updateRequest(')}
      ${afterUpdate.trim()}
      reloadData();
    } catch (err: any) {
      showNotify(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    }
  }`;
  
  return `const ${funcName} = ` + newMatch.split('=> {')[1].split(updateCall)[0] + tryBlock;
});

// Specifically fix handleSendMessage which has two updateRequest calls
code = code.replace(/const handleSendMessage = \(\) => {([\s\S]*?)updateRequest\(req, activeUser, 'SEND_MESSAGE'([^;]+);([\s\S]*?)updateRequest\(req, mockSubjectUser, 'SEND_MESSAGE'([^;]+);([\s\S]*?)reloadData\(\);\s*}/, 
`const handleSendMessage = async () => {$1
    try {
      if (isStaff) {
        await updateRequest(req, activeUser, 'SEND_MESSAGE'$2;
      } else {
        await updateRequest(req, mockSubjectUser, 'SEND_MESSAGE'$4;
      }
      $5
      reloadData();
    } catch (err: any) {
      showNotify(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    }
}`);

fs.writeFileSync('src/App.tsx', code);
console.log('Done refactoring');
