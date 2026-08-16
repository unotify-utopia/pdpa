const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const cmd = `cd /root/pdpa && node -e "import pg from 'pg'; const dbPool = new pg.Pool({ host: '127.0.0.1', port: 5432, user: 'pdpa_admin', password: 'Pdpa@Secure2070!', database: 'pdpa_prod_db' }); dbPool.query(\\"INSERT INTO users (id, org_id, username, password_hash, full_name_th, email, role, department) VALUES ('usr_super_admin', 'org_028384', 'super.admin', 'dummy_hash', 'Super Admin', 'admin@pdpa-system.or.th', 'superadmin', 'IT Core'), ('usr_apichat', 'org_028384', 'apichat.utopia@gmail.com', 'dummy_hash', 'Apichat Utopia', 'apichat.utopia@gmail.com', 'superadmin', 'IT Security') ON CONFLICT (id) DO NOTHING\\").then(() => { console.log('Super Admins Inserted Successfully!'); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });"`;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', (data) => console.log(data.toString()))
      .stderr.on('data', (data) => console.error(data.toString()));
  });
}).connect({ host: '119.59.124.169', port: 22, username: 'root', password: '9EIy;45Gf2n-' });
