const { Client } = require('ssh2'); 
const conn = new Client(); 
const sql = `
BEGIN;

-- 1. Rename default-tenant
UPDATE tenants 
SET name_th = 'บริษัท ยูโทเปีย เอ็นแอนด์เอ็น จำกัด',
    name_en = 'Utopia N&N Co.,Ltd.'
WHERE id = 'default-tenant';

-- 2. Move Super Admins to default-tenant so they aren't orphaned or deleted
UPDATE users 
SET org_id = 'default-tenant'
WHERE role = 'superadmin';

-- 3. Delete all other tenants
DELETE FROM users WHERE org_id != 'default-tenant';
DELETE FROM requests WHERE org_id != 'default-tenant';
DELETE FROM audit_logs WHERE org_id != 'default-tenant' AND org_id != 'system';
DELETE FROM tenants WHERE id != 'default-tenant';

COMMIT;
`;

conn.on('ready', () => { 
  conn.exec(`cat << 'EOF' > /tmp/cleanup.sql\n${sql}\nEOF\nsudo -u postgres psql -d pdpa_single_db -f /tmp/cleanup.sql`, (err, stream) => { 
    stream.on('data', d => process.stdout.write(d.toString()))
          .stderr.on('data', d => process.stderr.write(d.toString()))
          .on('close', () => conn.end()); 
  }); 
}).connect({host: '119.59.102.26', username: 'root', password: 'P8&xK!2mYc@5bW4^nJ7*'});
