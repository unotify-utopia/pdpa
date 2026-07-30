const fs = require('fs');

// =============================================
// FIX db.ts
// =============================================
let dbCode = fs.readFileSync('src/db.ts', 'utf8');

// 1. Remove getComplianceConfig (still exists, replace with fetchComplianceConfig)
dbCode = dbCode.replace(
  /export const getComplianceConfig = \(\): ComplianceConfig => \{[\s\S]*?\};\s*/,
  `export const fetchComplianceConfig = async (): Promise<ComplianceConfig> => {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data.success && data.config) {
      return data.config;
    }
  } catch (err) {
    console.error('Failed to fetch config', err);
  }
  return initialComplianceConfig;
};

// Sync alias for createRequest/recalculateAllSLAs that need config synchronously
export const getComplianceConfig = (): ComplianceConfig => {
  return initialComplianceConfig;
};

export const saveComplianceConfig = async (config: ComplianceConfig, user: User, reason: string): Promise<void> => {
  const token = sessionStorage.getItem('pdpa_jwt_token') || sessionStorage.getItem('pdpa_token');
  try {
    await fetch('/api/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': \`Bearer \${token}\` } : {})
      },
      body: JSON.stringify(config)
    });
    addAuditLog(
      'UPDATE_COMPLIANCE_CONFIG',
      \`ปรับปรุงค่ากำหนดกฎหมายและ SLA เป็นเวอร์ชัน \${config.version}. เหตุผล: \${reason}\`,
      user,
      undefined,
      undefined
    );
  } catch (err) {
    console.error('Failed to save config', err);
  }
};

`
);

// 2. Remove orphan fetchComplianceConfig if it got added twice (shouldn't happen, but be safe)
// Count occurrences
const count1 = (dbCode.match(/export const fetchComplianceConfig/g) || []).length;
if (count1 > 1) {
  // Remove the second one
  dbCode = dbCode.replace(/(export const fetchComplianceConfig[\s\S]*?^};)/gm, (m, p1, offset, str) => {
    const idx = str.indexOf(m);
    const second = str.indexOf(m, idx + m.length);
    if (second !== -1) return '';
    return m;
  });
}

// 3. Fix initialAuditLogs unused warning - remove from import if not needed
// db.ts imports initialAuditLogs from ./mockData - check if used
if (!dbCode.includes('initialAuditLogs') || dbCode.indexOf('initialAuditLogs') === dbCode.lastIndexOf('initialAuditLogs')) {
  dbCode = dbCode.replace(', initialAuditLogs', '');
}

// 4. Fix initialComplianceConfig if it's declared but unused (it IS used in our new code above)
// So leave it.

fs.writeFileSync('src/db.ts', dbCode);
console.log('db.ts fixed');

// =============================================
// FIX App.tsx - imports
// =============================================
let appCode = fs.readFileSync('src/App.tsx', 'utf8');

// Fix imports - add fetchComplianceConfig, fetchDocumentTemplates, fetchAuditLogs
// Remove getDocumentTemplates, getAuditLogs since they no longer exist as exports
appCode = appCode.replace(
  /import \{\s*getRequests,\s*getComplianceConfig,\s*getDocumentTemplates,\s*getAuditLogs,\s*getCurrentUser,\s*setCurrentUser,\s*changeRequestStatus,\s*createRequest,\s*updateRequest,\s*recalculateAllSLAs,\s*addAuditLog,\s*getRequestById,\s*saveComplianceConfig,\s*saveRequests,\s*generateTrackingNumber,\s*saveDocumentTemplates,\s*resetDocumentTemplates\s*\} from '\.\/db';/s,
  `import {
  getRequests,
  getComplianceConfig,
  fetchComplianceConfig,
  fetchDocumentTemplates,
  fetchAuditLogs,
  getCurrentUser,
  setCurrentUser,
  changeRequestStatus,
  createRequest,
  updateRequest,
  recalculateAllSLAs,
  addAuditLog,
  getRequestById,
  saveComplianceConfig,
  saveRequests,
  generateTrackingNumber,
  saveDocumentTemplates,
  resetDocumentTemplates
} from './db';`
);

// Fix handleSaveConfig to be async
appCode = appCode.replace(
  /  const handleSaveConfig = \(e: React\.FormEvent\) => \{/,
  `  const handleSaveConfig = async (e: React.FormEvent) => {`
);

// Fix saveComplianceConfig to be awaited
appCode = appCode.replace(
  /    saveComplianceConfig\(updatedConfig, activeUser, configForm\.changeReason\);\s*reloadData\(\);\s*showNotify\('บันทึกค่ากำหนดความสอดคล้องทางกฎหมายเรียบร้อยแล้ว'\);/,
  `    await saveComplianceConfig(updatedConfig, activeUser, configForm.changeReason);
    reloadData();
    showNotify('บันทึกค่ากำหนดความสอดคล้องทางกฎหมายเรียบร้อยแล้ว');`
);

// Fix resetDocumentTemplates in template tab (it's now async, need await)
appCode = appCode.replace(
  /showNotify\('ยืนยันการรีเซ็ตข้อความแม่แบบทั้งหมดกลับเป็นค่าเริ่มต้นมาตรฐานของระบบหรือไม่\?', 'confirm', 'ยืนยันการรีเซ็ตแม่แบบ', \(\) => \{\s*const defaults = resetDocumentTemplates\(\);\s*setTemplates\(defaults\);\s*showNotify\('รีเซ็ตข้อความแม่แบบหนังสือราชการทั้งหมดกลับเป็นค่าเริ่มต้นเรียบร้อยแล้ว', 'success', 'รีเซ็ตสำเร็จ'\);\s*\}\);/s,
  `showNotify('ยืนยันการรีเซ็ตข้อความแม่แบบทั้งหมดกลับเป็นค่าเริ่มต้นมาตรฐานของระบบหรือไม่?', 'confirm', 'ยืนยันการรีเซ็ตแม่แบบ', async () => {
                            const defaults = await resetDocumentTemplates();
                            setTemplates(defaults);
                            showNotify('รีเซ็ตข้อความแม่แบบหนังสือราชการทั้งหมดกลับเป็นค่าเริ่มต้นเรียบร้อยแล้ว', 'success', 'รีเซ็ตสำเร็จ');
                          });`
);

// Fix template onSubmit to await saveDocumentTemplates
appCode = appCode.replace(
  /e\.preventDefault\(\);\s*const updated = templates\.map\(\(t\) =>\s*t\.id === editingTemplate\.id \? editingTemplate : t\s*\);\s*setTemplates\(updated\);\s*saveDocumentTemplates\(updated\);\s*addAuditLog\(/s,
  `e.preventDefault();
              const updated = templates.map((t) =>
                t.id === editingTemplate.id ? editingTemplate : t
              );
              setTemplates(updated);
              saveDocumentTemplates(updated);
              addAuditLog(`
);

// Ensure onClick of reset template button is async (the showNotify callback)
// Already handled above

fs.writeFileSync('src/App.tsx', appCode);
console.log('App.tsx fixed');

// =============================================
// FIX ThaiLetterView.tsx - useEffect import
// =============================================
let tvCode = fs.readFileSync('src/components/ThaiLetterView.tsx', 'utf8');

// Ensure useState, useEffect are imported
if (!tvCode.includes('useState') && !tvCode.includes('useEffect')) {
  tvCode = tvCode.replace(`import React from 'react'`, `import React, { useState, useEffect } from 'react'`);
} else if (!tvCode.includes('useEffect')) {
  tvCode = tvCode.replace(/import React, \{ ([^}]+) \}/, `import React, { $1, useEffect }`);
} else if (!tvCode.includes('useState')) {
  tvCode = tvCode.replace(/import React, \{ ([^}]+) \}/, `import React, { useState, $1 }`);
}

fs.writeFileSync('src/components/ThaiLetterView.tsx', tvCode);
console.log('ThaiLetterView.tsx fixed');

console.log('All fixes done!');
