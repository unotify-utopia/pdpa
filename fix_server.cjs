const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf-8');

// Fix 6: Auto-create tenant column name
const target6 = `        'INSERT INTO tenants (id, name, code) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
        [orgId, requestData.targetOrgName || orgId, orgCodePrefix]`;
const replace6 = `        'INSERT INTO tenants (id, name_th, name_en, email, phone) VALUES ($1, $2, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
        [orgId, requestData.targetOrgName || orgId, 'contact@example.com', '-']`;
code = code.replace(target6, replace6);

// Fix 9: Audit log endpoint without JWT for public access
const target9 = `app.post('/api/audit-logs', authenticateJWT, async (req, res) => {
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

const replace9 = `app.post('/api/audit-logs', async (req, res) => {
  try {
    const log = req.body;
    await dbPool.query(
      \`INSERT INTO audit_logs (id, org_id, timestamp, actor_id, actor_name, actor_role, action, request_id, request_tracking_no, ip_address, user_agent, details, checksum) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)\`,
      [
        log.id || \`log_\${Date.now()}\`,
        log.orgId || (req.user ? req.user.orgId : 'public'),
        log.timestamp || new Date().toISOString(),
        log.actorId || (req.user ? req.user.id : 'public'),
        log.actorName || (req.user ? req.user.fullNameTh : 'Public User'),
        log.actorRole || (req.user ? req.user.role : 'public'),`;

code = code.replace(target9, replace9);

fs.writeFileSync('server.js', code);
console.log('Fixed server.js');
