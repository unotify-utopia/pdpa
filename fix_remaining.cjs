const fs = require('fs');

// ======== Fix App.tsx ========
let appCode = fs.readFileSync('src/App.tsx', 'utf-8');

// Fix Bug #10: Move safeUpdateRequest after showNotify
// Remove the old block from the top (before showNotify)
const safeReqBlock = `  // Helper to handle strict database mode
  const safeUpdateRequest = async (req: Request, actor: UserType, action: string, detail: string) => {
    try {
      await updateRequest(req, actor, action, detail);
      return true;
    } catch (err: any) {
      showNotify(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
      return false;
    }
  };`;

// Remove the early definition (before showNotify)
if (appCode.includes(safeReqBlock + '\n\n\n')) {
  appCode = appCode.replace(safeReqBlock + '\n\n\n', '\n');
} else if (appCode.includes(safeReqBlock + '\n\n')) {
  appCode = appCode.replace(safeReqBlock + '\n\n', '\n');
} else {
  appCode = appCode.replace(safeReqBlock, '');
}

// Insert after showNotify closing brace (setNotifyState line)
const showNotifyEnd = `    setNotifyState({ open: true, title: title || defaultTitle, message: cleanMessage, type, onConfirm, onCancel });
  };`;

// Make sure safeUpdateRequest is not already inserted (idempotency)
if (!appCode.includes('// Helper to handle strict database mode')) {
  appCode = appCode.replace(
    showNotifyEnd,
    showNotifyEnd + '\n\n' + safeReqBlock
  );
  console.log('✅ Bug #10: safeUpdateRequest moved after showNotify');
} else {
  // Already there — just verify order
  const safeIdx = appCode.indexOf('// Helper to handle strict database mode');
  const showNotifyIdx = appCode.indexOf('const showNotify = ');
  if (safeIdx < showNotifyIdx) {
    // Still wrong order — force remove and re-insert
    appCode = appCode.replace('// Helper to handle strict database mode\n' + safeReqBlock.replace('  // Helper to handle strict database mode\n', ''), '');
    appCode = appCode.replace(safeReqBlock, '');
    appCode = appCode.replace(showNotifyEnd, showNotifyEnd + '\n\n' + safeReqBlock);
    console.log('✅ Bug #10: Forced safeUpdateRequest after showNotify');
  } else {
    console.log('✅ Bug #10: Already in correct order');
  }
}

// Fix Bug #4 (setTimeout inside handleMarkAsDelivered) 
// setTimeout callback needs to be async
appCode = appCode.replace(
  `    // Automatically close after delivery
    setTimeout(() => {
      await changeRequestStatus(reqId, 'Closed', activeUser, 'คำขอสิ้นสุดกระบวนการ บันทึกระยะเวลาดำเนินการเฉลี่ยปิดงาน');
      reloadData();
    }, 1000);`,
  `    // Automatically close after delivery
    setTimeout(async () => {
      await changeRequestStatus(reqId, 'Closed', activeUser, 'คำขอสิ้นสุดกระบวนการ บันทึกระยะเวลาดำเนินการเฉลี่ยปิดงาน');
      reloadData();
    }, 1000);`
);

// Fix Bug #4 (remaining inline onClick without await)  
appCode = appCode.replace(
  `                              changeRequestStatus(activeRequestObj.id, 'Closed', activeUser, 'จัดส่งมอบลิงก์ดาวน์โหลดอย่างปลอดภัยและปิดเรื่องสำเร็จ');`,
  `                              await changeRequestStatus(activeRequestObj.id, 'Closed', activeUser, 'จัดส่งมอบลิงก์ดาวน์โหลดอย่างปลอดภัยและปิดเรื่องสำเร็จ');`
);
// Fix the surrounding onClick to be async if not already
appCode = appCode.replace(
  `onClick={() => {
                            if (window.confirm('ยืนยันการจัดส่งข้อมูลให้เจ้าของข้อมูลและปิดเรื่องคำขอนี้?')) {
                              await changeRequestStatus(activeRequestObj.id, 'Closed', activeUser, 'จัดส่งมอบลิงก์ดาวน์โหลดอย่างปลอดภัยและปิดเรื่องสำเร็จ');`,
  `onClick={async () => {
                            if (window.confirm('ยืนยันการจัดส่งข้อมูลให้เจ้าของข้อมูลและปิดเรื่องคำขอนี้?')) {
                              await changeRequestStatus(activeRequestObj.id, 'Closed', activeUser, 'จัดส่งมอบลิงก์ดาวน์โหลดอย่างปลอดภัยและปิดเรื่องสำเร็จ');`
);

console.log('✅ Bug #4: setTimeout async fixed, inline onClick async fixed');

fs.writeFileSync('src/App.tsx', appCode);
console.log('✅ App.tsx saved');

// ======== Fix server.js ========
let serverCode = fs.readFileSync('server.js', 'utf-8');

// Fix Bug #6: tenant auto-create uses wrong column names
const buggy6 = `        'INSERT INTO tenants (id, name, code) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
        [orgId, requestData.targetOrgName || orgId, orgCodePrefix]`;
const fixed6 = `        'INSERT INTO tenants (id, name_th, name_en, email, phone) VALUES ($1, $2, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
        [orgId, requestData.targetOrgName || orgId, 'contact@example.com', '-']`;

if (serverCode.includes(buggy6)) {
  serverCode = serverCode.replace(buggy6, fixed6);
  console.log('✅ Bug #6: tenant auto-create column names fixed');
} else {
  console.log('⚠️ Bug #6: target string not found - may already be fixed or format mismatch');
}

// Fix Bug #9: audit-logs endpoint requires JWT blocking public requests
const buggy9 = `app.post('/api/audit-logs', authenticateJWT, async (req, res) => {
  try {
    const log = req.body;
    await dbPool.query(
      \`INSERT INTO audit_logs (id, org_id, timestamp, actor_id, actor_name, actor_role, action, request_id, request_tracking_no, ip_address, user_agent, details, checksum) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)\`,
      [
        log.id || \`log_\${Date.now()}\`,
        log.orgId || req.user.orgId,
        log.timestamp || new Date().toISOString(),
        log.actorId || req.user.id,
        log.actorName || req.user.fullNameTh,
        log.actorRole || req.user.role,`;

const fixed9 = `app.post('/api/audit-logs', async (req, res) => {
  // Allow unauthenticated (public) submissions for citizen-side audit trails
  try {
    const log = req.body;
    const reqUser = req.user || {};
    await dbPool.query(
      \`INSERT INTO audit_logs (id, org_id, timestamp, actor_id, actor_name, actor_role, action, request_id, request_tracking_no, ip_address, user_agent, details, checksum) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)\`,
      [
        log.id || \`log_\${Date.now()}\`,
        log.orgId || reqUser.orgId || 'public',
        log.timestamp || new Date().toISOString(),
        log.actorId || reqUser.id || 'public_user',
        log.actorName || reqUser.fullNameTh || 'ประชาชน',
        log.actorRole || reqUser.role || 'public',`;

if (serverCode.includes(buggy9)) {
  serverCode = serverCode.replace(buggy9, fixed9);
  console.log('✅ Bug #9: audit-logs endpoint opened for public (no JWT required)');
} else {
  // Try lenient optional JWT middleware
  serverCode = serverCode.replace(
    `app.post('/api/audit-logs', authenticateJWT, async (req, res) => {`,
    `app.post('/api/audit-logs', async (req, res) => {`
  );
  // Also fix the req.user references that would throw if user is undefined
  serverCode = serverCode.replace(
    `        log.orgId || req.user.orgId,`,
    `        log.orgId || (req.user && req.user.orgId) || 'public',`
  );
  serverCode = serverCode.replace(
    `        log.actorId || req.user.id,`,
    `        log.actorId || (req.user && req.user.id) || 'public_user',`
  );
  serverCode = serverCode.replace(
    `        log.actorName || req.user.fullNameTh,`,
    `        log.actorName || (req.user && req.user.fullNameTh) || 'ประชาชน',`
  );
  serverCode = serverCode.replace(
    `        log.actorRole || req.user.role,`,
    `        log.actorRole || (req.user && req.user.role) || 'public',`
  );
  console.log('✅ Bug #9: audit-logs endpoint patched (lenient mode)');
}

fs.writeFileSync('server.js', serverCode);
console.log('✅ server.js saved');
