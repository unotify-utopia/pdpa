const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
  const query = `
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

    -- 3. Delete all other tenants (this might cascade delete if foreign keys are set up, but let's be safe)
    -- First, delete users of other tenants
    DELETE FROM users 
    WHERE org_id != 'default-tenant';

    -- Delete requests of other tenants
    DELETE FROM requests
    WHERE tenant_id != 'default-tenant';

    -- Delete audit_logs of other tenants
    DELETE FROM audit_logs
    WHERE org_id != 'default-tenant' AND org_id != 'system';

    -- Finally, delete the tenants themselves
    DELETE FROM tenants 
    WHERE id != 'default-tenant';

    COMMIT;
  `;

  conn.exec(`sudo -u postgres psql -d pdpa_single_db -c "${query.replace(/\n/g, ' ')}"`, (err, stream) => { 
    stream.on('data', d => process.stdout.write(d.toString()))
          .stderr.on('data', d => process.stderr.write(d.toString()))
          .on('close', () => conn.end()); 
  }); 
}).connect({host: '119.59.102.26', username: 'root', password: 'P8&xK!2mYc@5bW4^nJ7*'});
