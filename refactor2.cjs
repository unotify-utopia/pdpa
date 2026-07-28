const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Inject the safeUpdateRequest helper at the beginning of the App component
if (!code.includes('const safeUpdateRequest')) {
  code = code.replace(
    'export default function App() {',
    `export default function App() {\n  // Helper to handle strict database mode\n  const safeUpdateRequest = async (req: Request, actor: User, action: string, detail: string) => {\n    try {\n      await updateRequest(req, actor, action, detail);\n      return true;\n    } catch (err: any) {\n      showNotify(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');\n      return false;\n    }\n  };\n`
  );
}

// 1. We replace updateRequest(req, actor, action, detail); with await safeUpdateRequest(req, actor, action, detail);
// Note: handleUploadEvidence uses 'updated' instead of 'req', and 'mockUser' instead of 'activeUser'
code = code.replace(/updateRequest\(([^,]+),\s*([^,]+),\s*('[^']+'),\s*([^)]+)\);/g, (match, req, actor, action, detail) => {
  return `await safeUpdateRequest(${req}, ${actor}, ${action}, ${detail});`;
});

// 2. We must make the containing functions async if they contain await safeUpdateRequest
const functionsToMakeAsync = [
  'handleUploadEvidence',
  'handleVerifyIdentity',
  'handleStatusChange',
  'handleCreateTask',
  'handleCompleteTask',
  'handleRedactSave',
  'handleFeeApprove',
  'handlePaymentConfirm',
  'handleDpoDecision',
  'handleApproverSign',
  'toggleLegalHold',
  'handleDestroyData',
  'handleExtendSLA',
  'handleSendMessage'
];

for (const fn of functionsToMakeAsync) {
  // Regex to match "const fn = (...) => {" or "const fn = () => {"
  const regex = new RegExp(`const ${fn} = \\(([^)]*)\\) => {`);
  code = code.replace(regex, `const ${fn} = async ($1) => {`);
}

fs.writeFileSync('src/App.tsx', code);
console.log('Done refactoring');
