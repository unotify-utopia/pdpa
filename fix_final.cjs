const fs = require('fs');

// Read with binary to preserve CRLF exactly
let buf = fs.readFileSync('src/App.tsx');
let code = buf.toString('utf-8');

// ===== Bug #10: Insert safeUpdateRequest after showNotify closing brace =====
// The showNotify function ends with this exact line (line 147) before a blank line
const insertAfter = '    setNotifyState({ open: true, title: title || defaultTitle, message: cleanMessage, type, onConfirm, onCancel });\r\n  };\r\n\r\n  // App context navigation states';
const insertWith   = '    setNotifyState({ open: true, title: title || defaultTitle, message: cleanMessage, type, onConfirm, onCancel });\r\n  };\r\n\r\n  // Helper to handle strict database mode — declared AFTER showNotify so it can call it on error\r\n  const safeUpdateRequest = async (req: Request, actor: UserType, action: string, detail: string) => {\r\n    try {\r\n      await updateRequest(req, actor, action, detail);\r\n      return true;\r\n    } catch (err: any) {\r\n      showNotify(err.message || \'เกิดข้อผิดพลาดในการบันทึกข้อมูล\', \'error\');\r\n      return false;\r\n    }\r\n  };\r\n\r\n  // App context navigation states';

if (code.includes(insertAfter)) {
  code = code.replace(insertAfter, insertWith);
  console.log('✅ Bug #10: safeUpdateRequest inserted after showNotify');
} else {
  console.log('⚠️ Could not find insertion point. Dumping 300 chars around setNotifyState...');
  const i = code.indexOf('setNotifyState({ open: true, title: title || defaultTitle');
  console.log(JSON.stringify(code.substring(i, i+300)));
}

// ===== Bug #1/#4: Add await to all remaining non-awaited changeRequestStatus calls =====
// These patterns appear: changeRequestStatus(reqId, '...' or changeRequestStatus(trackedRequest.id
// We already fixed most in prior sessions; let's ensure all are awaited
let count = 0;
// Pattern: any changeRequestStatus call NOT already preceded by 'await '
code = code.replace(/(?<!\bawait\s)(\s*)(changeRequestStatus\([^)]+\))/g, (match, ws, call) => {
  // Skip import line
  if (match.trim().startsWith('changeRequestStatus,')) return match;
  count++;
  return `${ws}await ${call.trim()}`;
});
console.log(`✅ Bug #1/#4: Added 'await' to ${count} remaining changeRequestStatus calls`);

// ===== Bug #2: handleVerifyIdentityQuick - make async and use safeUpdateRequest =====
code = code.replace(
  'const handleVerifyIdentityQuick = (reqId: string, status: \'verified\' | \'rejected\', assurance: \'low\' | \'medium\' | \'high\') => {',
  'const handleVerifyIdentityQuick = async (reqId: string, status: \'verified\' | \'rejected\', assurance: \'low\' | \'medium\' | \'high\') => {'
);
code = code.replace(
  '    updateRequest(req, activeUser, \'VERIFY_IDENTITY\',',
  '    await safeUpdateRequest(req, activeUser, \'VERIFY_IDENTITY\','
);
console.log('✅ Bug #2: handleVerifyIdentityQuick made async');

// ===== Bug #3: handleFeeSubmit - use safeUpdateRequest instead of updateRequest =====
code = code.replace(
  '    updateRequest(req, activeUser, \'CALCULATE_FEE\',',
  '    await safeUpdateRequest(req, activeUser, \'CALCULATE_FEE\','
);
console.log('✅ Bug #3: handleFeeSubmit uses safeUpdateRequest');

// ===== Bug #4: handleSaveRedactionAll - make async =====
code = code.replace(
  'const handleSaveRedactionAll = (reqId: string) => {',
  'const handleSaveRedactionAll = async (reqId: string) => {'
);
console.log('✅ Bug #4: handleSaveRedactionAll made async');

// ===== Bug #4: handleWithdrawRequest - make async if not already =====
code = code.replace(
  'const handleWithdrawRequest = (reqId: string, reason: string) => {',
  'const handleWithdrawRequest = async (reqId: string, reason: string) => {'
);
console.log('✅ Bug #4: handleWithdrawRequest made async');

// ===== Bug #4: markCompletenessDone - already async, just verify await =====
// Already done in prior pass

// ===== Bug #4: setTimeout in handleMarkAsDelivered fix =====
code = code.replace(
  'setTimeout(() => {\r\n      changeRequestStatus(reqId, \'Closed\'',
  'setTimeout(async () => {\r\n      await changeRequestStatus(reqId, \'Closed\''
);
// Also catch Linux LF version
code = code.replace(
  'setTimeout(() => {\n      changeRequestStatus(reqId, \'Closed\'',
  'setTimeout(async () => {\n      await changeRequestStatus(reqId, \'Closed\''
);
console.log('✅ Bug #4: setTimeout callback made async');

// ===== Bug #4: inline onClick for download close =====
code = code.replace(
  "onClick={() => {\r\n                            if (window.confirm('ยืนยันการจัดส่งข้อมูลให้เจ้าของข้อมูลและปิดเรื่องคำขอนี้?')) {\r\n                              changeRequestStatus(activeRequestObj.id, 'Closed'",
  "onClick={async () => {\r\n                            if (window.confirm('ยืนยันการจัดส่งข้อมูลให้เจ้าของข้อมูลและปิดเรื่องคำขอนี้?')) {\r\n                              await changeRequestStatus(activeRequestObj.id, 'Closed'"
);
console.log('✅ Bug #4: onClick async for Closed inline');

// Write back
fs.writeFileSync('src/App.tsx', code);
console.log('\n✅ All fixes written to src/App.tsx successfully');
