const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Imports
code = code.replace(
  /import \{\s*getRequests,\s*saveRequests,\s*getComplianceConfig,\s*saveComplianceConfig,\s*getDocumentTemplates,\s*saveDocumentTemplates,\s*resetDocumentTemplates,\s*getAuditLogs,/g,
  'import { getRequests, saveRequests, fetchComplianceConfig, saveComplianceConfig, fetchDocumentTemplates, saveDocumentTemplates, resetDocumentTemplates, fetchAuditLogs,'
);

// 2. reloadData() async fetch
const newReloadData = `  const reloadData = async () => {
    const currentUser = getCurrentUser();
    
    // Fetch newly async states
    const allLogs = await fetchAuditLogs();
    const serverConfig = await fetchComplianceConfig();
    const serverTemplates = await fetchDocumentTemplates();

    setConfig(serverConfig);
    setTemplates(serverTemplates);

    // Setup Audit Logs from DB
    if (currentUser && currentUser.orgId) {
      setAuditLogs(allLogs.filter((l) => !l.orgId || l.orgId === currentUser.orgId));
    } else {
      setAuditLogs(allLogs);
    }

    if (currentUser) {`;

code = code.replace(
  /  const reloadData = \(\) => \{\s*const currentUser = getCurrentUser\(\);\s*const allLogs = getAuditLogs\(\);\s*\/\/ Setup Audit Logs from LocalStorage for now\s*if \(currentUser && currentUser\.orgId\) \{\s*setAuditLogs\(allLogs\.filter\(\(l\) => !l\.orgId \|\| l\.orgId === currentUser\.orgId\)\);\s*\} else \{\s*setAuditLogs\(allLogs\);\s*\}\s*if \(currentUser\) \{/s,
  newReloadData
);

// 3. handleSaveConfig async
code = code.replace(
  /    saveComplianceConfig\(updatedConfig, activeUser, configForm\.changeReason\);\s*showNotify\('บันทึกการตั้งค่าระบบเรียบร้อยแล้ว', 'success'\);/s,
  `    await saveComplianceConfig(updatedConfig, activeUser, configForm.changeReason);
    showNotify('บันทึกการตั้งค่าระบบเรียบร้อยแล้ว', 'success');`
);
// Ensure handleSaveConfig itself is async
code = code.replace(
  /  const handleSaveConfig = \(\) => \{/s,
  `  const handleSaveConfig = async () => {`
);

// 4. Templates async saving
code = code.replace(
  /                saveDocumentTemplates\(updated\);\s*showNotify\(`บันทึกเทมเพลต "\${activeTemplate\.name}" เรียบร้อย`, 'success'\);/s,
  `                await saveDocumentTemplates(updated);
                showNotify(\`บันทึกเทมเพลต "\${activeTemplate.name}" เรียบร้อย\`, 'success');`
);

code = code.replace(
  /                            const defaults = resetDocumentTemplates\(\);\s*setTemplates\(defaults\);\s*showNotify\('รีเซ็ตเทมเพลตทั้งหมดกลับเป็นค่าเริ่มต้นเรียบร้อยแล้ว', 'success'\);/s,
  `                            const defaults = await resetDocumentTemplates();
                            setTemplates(defaults);
                            showNotify('รีเซ็ตเทมเพลตทั้งหมดกลับเป็นค่าเริ่มต้นเรียบร้อยแล้ว', 'success');`
);

// Ensure the parent function of templates save is async
// Actually, it's inside an onClick arrow function, so we need to make the onClick async.
// Let's replace the button onClick for saving template
code = code.replace(
  /onClick=\{\(\) => \{\s*if \(!activeTemplate\) return;\s*const updated = templates\.map\(t => /s,
  `onClick={async () => {
              if (!activeTemplate) return;
              const updated = templates.map(t => `
);

// Replace button onClick for reset template
code = code.replace(
  /onClick=\{\(\) => \{\s*if \(window\.confirm\('คุณแน่ใจหรือไม่ที่จะรีเซ็ตเทมเพลตทั้งหมด/s,
  `onClick={async () => {
                          if (window.confirm('คุณแน่ใจหรือไม่ที่จะรีเซ็ตเทมเพลตทั้งหมด`
);

// 5. Initial setup in useEffect shouldn't call getComplianceConfig() or getDocumentTemplates() anymore if they are removed.
// Actually, I already replaced them inside reloadData. Does App.tsx call them anywhere else?
code = code.replace(
  /    setConfig\(getComplianceConfig\(\)\);\s*setTemplates\(getDocumentTemplates\(\)\);/s,
  `    // config and templates will be loaded via reloadData()`
);

fs.writeFileSync('src/App.tsx', code);
console.log('App.tsx patched successfully');
