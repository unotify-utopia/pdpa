const fs = require('fs');

let serverCode = fs.readFileSync('server.js', 'utf8');

// 1. Add document_templates to CREATE TABLE IF NOT EXISTS
const createTemplatesTable = `
      CREATE TABLE IF NOT EXISTS document_templates (
        id VARCHAR(100) PRIMARY KEY,
        type VARCHAR(100),
        name VARCHAR(255),
        subject VARCHAR(255),
        body TEXT,
        is_active BOOLEAN DEFAULT true,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(255)
      );
`;
if (!serverCode.includes('CREATE TABLE IF NOT EXISTS document_templates')) {
  serverCode = serverCode.replace(
    /CREATE TABLE IF NOT EXISTS task_files \([^;]+\);/s,
    match => match + createTemplatesTable
  );
}

// 2. Add API endpoints for Config
const configEndpoints = `
// ==========================================
// NEW CONFIG API (Migrated from LocalStorage)
// ==========================================

// GET /api/config
app.get('/api/config', async (req, res) => {
  try {
    const { rows } = await dbPool.query("SELECT value FROM system_settings WHERE key = 'app_config'");
    if (rows.length > 0) {
      return res.json({ success: true, config: JSON.parse(rows[0].value) });
    }
    return res.json({ success: true, config: null }); // Client will use defaults if null
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/config
app.put('/api/config', authenticateJWT, async (req, res) => {
  const config = req.body;
  try {
    await dbPool.query(
      "INSERT INTO system_settings (key, value) VALUES ('app_config', $1) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP",
      [JSON.stringify(config)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
`;

if (!serverCode.includes('GET /api/config')) {
  serverCode = serverCode.replace(
    /\/\/ POST \/api\/auth\/login/s,
    configEndpoints + '\n// POST /api/auth/login'
  );
}

// 3. Add API endpoints for Templates
const templateEndpoints = `
// ==========================================
// NEW TEMPLATES API (Migrated from LocalStorage)
// ==========================================

// GET /api/templates
app.get('/api/templates', async (req, res) => {
  try {
    const { rows } = await dbPool.query("SELECT * FROM document_templates");
    res.json({ success: true, templates: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/templates
app.put('/api/templates', authenticateJWT, async (req, res) => {
  const templates = req.body.templates || [];
  try {
    for (const t of templates) {
      await dbPool.query(
        "INSERT INTO document_templates (id, type, name, subject, body, is_active) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET type = $2, name = $3, subject = $4, body = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP",
        [t.id, t.type, t.name, t.subject, t.body, t.isActive]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
`;

if (!serverCode.includes('GET /api/templates')) {
  serverCode = serverCode.replace(
    /\/\/ POST \/api\/auth\/login/s,
    templateEndpoints + '\n// POST /api/auth/login'
  );
}

// 4. Check Audit Logs API
// The existing app.post('/api/audit-logs') works, but it's currently at app.post('/api/audit-logs', async (req, res) => ...
// Let's check if GET /api/audit-logs exists. It does at line 1813: app.get('/api/audit-logs'
// But wait, it's authenticateJWT, requireRole(['admin', 'auditor', 'dpo'])
// Intake users also need to see it!
// Let's modify the requireRole for GET /api/audit-logs to include 'intake', 'approver', 'owner', 'superadmin'
serverCode = serverCode.replace(
  /app\.get\('\/api\/audit-logs', authenticateJWT, requireRole\(\['admin', 'auditor', 'dpo'\]\),/g,
  "app.get('/api/audit-logs', authenticateJWT, requireRole(['superadmin', 'owner', 'admin', 'intake', 'dpo', 'approver', 'auditor']),"
);

// We should also make POST /api/audit-logs authenticated if it isn't?
// Wait, currently POST /api/audit-logs is used by public forms too (if they do actions). Let's leave it public but with optional auth.
// It is already public in server.js line 1379: app.post('/api/audit-logs', async (req, res) => {

fs.writeFileSync('server.js', serverCode);
console.log('server.js patched successfully');
