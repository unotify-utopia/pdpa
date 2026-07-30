const fs = require('fs');
let code = fs.readFileSync('src/components/ThaiLetterView.tsx', 'utf8');

// Ensure useState, useEffect are imported
if (!code.includes('import React, { useState, useEffect }')) {
  code = code.replace(/import React from 'react';/, 'import React, { useState, useEffect } from \'react\';');
}

// Replace the sync org logic
const newOrgLogic = `  const [org, setOrg] = useState<any>(
    orgData || 
    initialOrganizations.find(o => o.id === request.orgId) || 
    initialOrganizations[0]
  );

  useEffect(() => {
    if (!orgData && request.orgId) {
      fetch('/api/public/tenants')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.tenants) {
            const found = data.tenants.find((t: any) => t.id === request.orgId);
            if (found) {
              setOrg({
                id: found.id,
                nameTh: found.name_th,
                nameEn: found.name_en,
                shortName: found.short_name,
                contactEmail: found.email,
                contactPhone: found.phone
              });
            }
          }
        })
        .catch(err => console.error(err));
    }
  }, [orgData, request.orgId]);
`;

code = code.replace(
  /  let org = orgData;[\s\S]*?  if \(!org\) org = initialOrganizations\[0\];\s*/,
  newOrgLogic
);

fs.writeFileSync('src/components/ThaiLetterView.tsx', code);
console.log('ThaiLetterView.tsx patched successfully');
