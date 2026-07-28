const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Fix User -> UserType in safeUpdateRequest
code = code.replace('safeUpdateRequest = async (req: Request, actor: User, action: string, detail: string)', 'safeUpdateRequest = async (req: Request, actor: UserType, action: string, detail: string)');

// Fix handleManualSubmit
code = code.replace('const handleManualSubmit = (e: React.FormEvent) => {', 'const handleManualSubmit = async (e: React.FormEvent) => {');

// The functions that need to be async:
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
  'handleSendMessage',
  'handleFeeSubmit' // wait, handleFeeSubmit is not in the list but let's make sure
];

for (const fn of functionsToMakeAsync) {
  // We can just replace "const fn = (" or "const fn =("
  // But maybe they are already async? Let's check:
  if (!code.includes(`const ${fn} = async`)) {
    code = code.replace(new RegExp(`const ${fn} = \\s*\\((.*?)\\)\\s*=>\\s*{`), `const ${fn} = async ($1) => {`);
  }
}

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed async issues');
