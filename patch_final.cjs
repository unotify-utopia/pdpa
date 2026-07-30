const fs = require('fs');

// 1. Patch App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf8');

// Fix 'getComplianceConfig' is declared but its value is never read.
appCode = appCode.replace(/getComplianceConfig,\s*fetchComplianceConfig,/, 'fetchComplianceConfig,');

// Fix 'getAuditLogs' in template onSubmit
appCode = appCode.replace(
  /              addAuditLog\([\s\S]*?\);\s*setAuditLogs\(getAuditLogs\(\)\);\s*setEditingTemplate\(null\);/g,
  `              addAuditLog(
                  'UPDATE_TEMPLATE',
                  \`แก้ไขแม่แบบหนังสือราชการ: \${editingTemplate.nameTh} (\${editingTemplate.id})\`,
                  (activeUser || initialUser) as any
                );
                reloadData(); // Reload data async to get updated templates and logs
                setEditingTemplate(null);`
);

// Ensure the onSubmit function itself is async
appCode = appCode.replace(
  /onSubmit=\{\(e\) => \{\s*e\.preventDefault\(\);\s*const updated = templates/g,
  `onSubmit={async (e) => {
                e.preventDefault();
              const updated = templates`
);

fs.writeFileSync('src/App.tsx', appCode);
console.log('App.tsx patched');

// 2. Patch ThaiLetterView.tsx
let tvCode = fs.readFileSync('src/components/ThaiLetterView.tsx', 'utf8');
tvCode = tvCode.replace(/import React, \{ useState \} from 'react';/, "import React, { useState, useEffect } from 'react';");
fs.writeFileSync('src/components/ThaiLetterView.tsx', tvCode);
console.log('ThaiLetterView.tsx patched');
