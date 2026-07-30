const fs = require('fs');

let dbCode = fs.readFileSync('src/db.ts', 'utf8');

// 1. Remove initializeDB() lines related to CONFIG, TEMPLATES, AUDIT_LOGS
dbCode = dbCode.replace(/  if \(!localStorage\.getItem\(KEYS\.CONFIG\)\) \{\s*localStorage\.setItem\(KEYS\.CONFIG, JSON\.stringify\(initialComplianceConfig\)\);\s*\}/, '');
dbCode = dbCode.replace(/  if \(!localStorage\.getItem\(KEYS\.TEMPLATES\)\) \{\s*localStorage\.setItem\(KEYS\.TEMPLATES, JSON\.stringify\(initialDocumentTemplates\)\);\s*\}/, '');
dbCode = dbCode.replace(/  if \(!localStorage\.getItem\(KEYS\.AUDIT_LOGS\)\) \{\s*localStorage\.setItem\(KEYS\.AUDIT_LOGS, JSON\.stringify\(initialAuditLogs\)\);\s*\}/, '');

// 2. Replace Config functions
const configFunctions = `
export const fetchComplianceConfig = async (): Promise<ComplianceConfig> => {
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

export const saveComplianceConfig = async (config: ComplianceConfig, user: User, reason: string) => {
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
`;

dbCode = dbCode.replace(
  /export const getComplianceConfig = \(\): ComplianceConfig => \{[^}]+\};/s,
  configFunctions
);
dbCode = dbCode.replace(
  /export const saveComplianceConfig = \(config: ComplianceConfig, user: User, reason: string\) => \{[\s\S]*?\n\};/s,
  ''
);

// 3. Replace Templates functions
const templateFunctions = `
export const fetchDocumentTemplates = async (): Promise<DocumentTemplate[]> => {
  try {
    const res = await fetch('/api/templates');
    const data = await res.json();
    if (data.success && data.templates && data.templates.length > 0) {
      // Map back database snake_case to camelCase
      return data.templates.map((t: any) => ({
        id: t.id,
        type: t.type,
        name: t.name,
        subject: t.subject,
        body: t.body,
        isActive: t.is_active
      }));
    }
  } catch (err) {
    console.error('Failed to fetch templates', err);
  }
  return initialDocumentTemplates;
};

export const saveDocumentTemplates = async (templates: DocumentTemplate[]) => {
  const token = sessionStorage.getItem('pdpa_jwt_token') || sessionStorage.getItem('pdpa_token');
  try {
    await fetch('/api/templates', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': \`Bearer \${token}\` } : {})
      },
      body: JSON.stringify({ templates })
    });
  } catch (err) {
    console.error('Failed to save templates', err);
  }
};
`;

dbCode = dbCode.replace(
  /export const getDocumentTemplates = \(\): DocumentTemplate\[\] => \{[^}]+\};/s,
  templateFunctions
);
dbCode = dbCode.replace(
  /export const saveDocumentTemplates = \(templates: DocumentTemplate\[\]\) => \{[^}]+\};/s,
  ''
);

dbCode = dbCode.replace(
  /export const resetDocumentTemplates = \(\): DocumentTemplate\[\] => \{[^}]+\};/s,
  `export const resetDocumentTemplates = async (): Promise<DocumentTemplate[]> => {
  await saveDocumentTemplates(initialDocumentTemplates);
  return initialDocumentTemplates;
};`
);

// 4. Replace Audit Logs functions
const auditFunctions = `
export const fetchAuditLogs = async (): Promise<AuditLog[]> => {
  const token = sessionStorage.getItem('pdpa_jwt_token') || sessionStorage.getItem('pdpa_token');
  try {
    const res = await fetch('/api/audit-logs', {
      headers: { ...(token ? { 'Authorization': \`Bearer \${token}\` } : {}) }
    });
    const data = await res.json();
    if (data.success && data.logs) {
      return data.logs.map((l: any) => ({
        id: l.id,
        timestamp: l.timestamp,
        actor: {
          id: l.actor_id || 'unknown',
          fullNameTh: l.actor_name,
          role: l.actor_role,
          orgId: l.org_id,
          username: '',
          email: ''
        },
        action: l.action,
        details: l.details,
        requestId: l.request_id,
        requestTrackingNo: l.request_tracking_no,
        ipAddress: l.ip_address,
        userAgent: l.user_agent,
        checksum: l.checksum
      }));
    }
  } catch (err) {
    console.error('Failed to fetch audit logs', err);
  }
  return [];
};
`;

dbCode = dbCode.replace(
  /export const getAuditLogs = \(\): AuditLog\[\] => \{[^}]+\};/s,
  auditFunctions
);

// 5. Update addAuditLog
// Just remove the lines that write to localStorage
dbCode = dbCode.replace(/  const logs = JSON\.parse\(localStorage\.getItem\(KEYS\.AUDIT_LOGS\) \|\| '\[\]'\);\s*logs\.unshift\(newLog\);\s*localStorage\.setItem\(KEYS\.AUDIT_LOGS, JSON\.stringify\(logs\)\);\s*/s, '  ');

fs.writeFileSync('src/db.ts', dbCode);
console.log('src/db.ts patched successfully');
