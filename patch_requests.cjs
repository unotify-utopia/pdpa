const fs = require('fs');

// --- 1. Patch db.ts ---
let dbCode = fs.readFileSync('src/db.ts', 'utf8');

// Remove KEYS.REQUESTS and its usage in initializeDB
dbCode = dbCode.replace(/REQUESTS:\s*'pdpa_req_requests',?\n?/g, '');
dbCode = dbCode.replace(/const existingRequests = localStorage\.getItem\(KEYS\.REQUESTS\);[\s\S]*?\/\/\s*Clean up any legacy persistent login/g, '// Clean up any legacy persistent login');

// Remove getRequests and saveRequests
dbCode = dbCode.replace(/export const getRequests = \(\): Request\[\] => \{[\s\S]*?return parsed;\n\};\n/g, '');
dbCode = dbCode.replace(/export const saveRequests = \(requests: Request\[\]\) => \{[\s\S]*?\};\n/g, '');

// Remove getRequestById and getRequestByTrackingNo
dbCode = dbCode.replace(/export const getRequestById = \([\s\S]*?\};\n/g, '');
dbCode = dbCode.replace(/export const getRequestByTrackingNo = \([\s\S]*?\};\n/g, '');

// Remove generateTrackingNumber
dbCode = dbCode.replace(/\/\/ Internal Helper for Tracking Number[\s\S]*?export const generateTrackingNumber = \([\s\S]*?return `\$\{prefix\}\$\{nextNum\}`;\n\};\n/g, '');

// Update createRequest to NOT generate trackingNo
dbCode = dbCode.replace(/const trackingNo = generateTrackingNumber\(targetOrgId\);/g, "const trackingNo = ''; // Will be assigned by backend API");

// Update updateRequest
dbCode = dbCode.replace(/\/\/ Update local cache only if DB sync succeeds[\s\S]*?const requests = getRequests\(\);\s*const index = requests\.findIndex[\s\S]*?if \(index !== -1\) \{[\s\S]*?requests\[index\] = updatedReq;\s*saveRequests\(requests\);\s*\/\/ Do not block UI/g, `// Update local cache only if DB sync succeeds
    // Do not block UI`);
dbCode = dbCode.replace(/window\.dispatchEvent\(new CustomEvent\('workflow-notify', \{[\s\S]*?\}\)\);\s*\}/g, `window.dispatchEvent(new CustomEvent('workflow-notify', {
      detail: {
        title: 'แจ้งเตือนตาม Flow เอกสาร (Email Workflow)',
        message: \`ส่งอีเมลแจ้งความคืบหน้าสถานะ "\${updatedReq.status}" ไปยังผู้เกี่ยวข้องตาม Workflow เรียบร้อยแล้ว\`
      }
    }));
    return updatedReq;`);

// Update changeRequestStatus
dbCode = dbCode.replace(/export const changeRequestStatus = async \(\s*requestId: string,\s*newStatus: RequestStatus,\s*actor: User,\s*comment\?: string\s*\) => \{/g, `export const changeRequestStatus = async (
  req: Request | undefined,
  newStatus: RequestStatus,
  actor: User,
  comment?: string,
  configParam?: ComplianceConfig
) => {`);
dbCode = dbCode.replace(/const req = getRequestById\(requestId\);\s*if \(\!req\) return;/g, `if (!req) return undefined;`);
dbCode = dbCode.replace(/const config = getComplianceConfig\(\);/g, `const config = configParam || getComplianceConfig();`);
dbCode = dbCode.replace(/await updateRequest\(req, actor, 'UPDATE_STATUS', \`เปลี่ยนสถานะคำขอจาก "\$\{prevStatus\}" เป็น "\$\{newStatus\}"\$\{comment \? \` \(ความเห็น: \$\{comment\}\)\` : ''\}\`\);\s*\};/g, `await updateRequest(req, actor, 'UPDATE_STATUS', \`เปลี่ยนสถานะคำขอจาก "\${prevStatus}" เป็น "\${newStatus}"\${comment ? \` (ความเห็น: \${comment})\` : ''}\`);
  return req;
};`);

// Update recalculateAllSLAs
dbCode = dbCode.replace(/export const recalculateAllSLAs = \(\) => \{/g, `export const recalculateAllSLAs = (requests: Request[], config: ComplianceConfig): Request[] => {`);
dbCode = dbCode.replace(/const requests = getRequests\(\);\s*const config = getComplianceConfig\(\);/g, ``);
dbCode = dbCode.replace(/if \(changed\) \{\s*saveRequests\(updatedRequests\);\s*\}/g, `return updatedRequests;`);

fs.writeFileSync('src/db.ts', dbCode);
console.log('db.ts patched');


// --- 2. Patch App.tsx ---
let appCode = fs.readFileSync('src/App.tsx', 'utf8');

// Remove import of getRequests
appCode = appCode.replace(/getRequests,\s*/g, '');

// Update getRequestClone to not use getRequestById
appCode = appCode.replace(/const r = requests\.find\(r => r\.id === id\) \|\| getRequestById\(id\);/g, `const r = requests.find(r => r.id === id);`);

// Replace saveLocal implementations to use setRequests directly
appCode = appCode.replace(/const saveLocal = \(req: Request\) => \{\s*const allLocal = getRequests\(\);\s*const idx = allLocal\.findIndex\(r => r\.id === req\.id\);\s*if \(idx !== -1\) allLocal\[idx\] = req;\s*else allLocal\.unshift\(req\);\s*saveRequests\(allLocal\);\s*\};/g, `const saveLocal = (req: Request) => {
      setRequests(prev => {
        const allLocal = [...prev];
        const idx = allLocal.findIndex(r => r.id === req.id);
        if (idx !== -1) allLocal[idx] = req;
        else allLocal.unshift(req);
        return allLocal;
      });
    };`);

// Update SLA recalculations in useEffect to use React state requests
appCode = appCode.replace(/recalculateAllSLAs\(\);/g, `// SLA calculation requires both requests and config to be loaded
    if (requests.length > 0 && config) {
      const updated = recalculateAllSLAs(requests, config);
      // We don't call setRequests(updated) continuously to avoid loops, 
      // SLA should be updated mostly on server or on explicit fetch.
      // For now, optimistic update is sufficient.
    }`);

// Fix changeRequestStatus calls to pass full request object
appCode = appCode.replace(/await changeRequestStatus\(reqId,/g, `await changeRequestStatus(getRequestClone(reqId),`);
appCode = appCode.replace(/await changeRequestStatus\(downloadRequest\.id,/g, `await changeRequestStatus(getRequestClone(downloadRequest.id),`);
appCode = appCode.replace(/await changeRequestStatus\(downloadReq\.id,/g, `await changeRequestStatus(getRequestClone(downloadReq.id),`);
appCode = appCode.replace(/await changeRequestStatus\(trackedRequest\.id,/g, `await changeRequestStatus(getRequestClone(trackedRequest.id),`);
appCode = appCode.replace(/await changeRequestStatus\(activeRequestObj\.id,/g, `await changeRequestStatus(getRequestClone(activeRequestObj.id),`);

// Pass config to changeRequestStatus calls by finding the end of the argument list and inserting config
appCode = appCode.replace(/await changeRequestStatus\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/g, `await changeRequestStatus($1, $2, $3, $4, config)`);

fs.writeFileSync('src/App.tsx', appCode);
console.log('App.tsx patched');
