require('dotenv/config');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log('================================================');
  console.log('🧹 PDPA Portal - Mockup Data Cleanup Script 🧹');
  console.log('================================================');

  try {
    // ค้นหา ID ของ Utopia จากฐานข้อมูล
    const utopiaRes = await pool.query("SELECT id, name_th FROM tenants WHERE name_th LIKE '%ยูโทเปีย%' LIMIT 1");
    if (utopiaRes.rows.length === 0) {
      console.log('❌ ข้อผิดพลาด: ไม่พบหน่วยงานที่มีชื่อ "ยูโทเปีย" ในระบบ กรุณาตรวจสอบอีกครั้ง');
      return;
    }
    const TARGET_ORG = utopiaRes.rows[0].id;
    const TARGET_NAME = utopiaRes.rows[0].name_th;
    console.log(`✅ พบหน่วยงานหลัก: [${TARGET_ORG}] ${TARGET_NAME}`);
    console.log(`รายการอื่นๆ ที่ไม่ใช่หน่วยงานนี้จะถูกลบทั้งหมด\n`);

    // 1. Preview tenants to be deleted
    const tenantsRes = await pool.query('SELECT id, name_th FROM tenants WHERE id != $1', [TARGET_ORG]);
    const mockTenants = tenantsRes.rows;

    if (mockTenants.length === 0) {
      console.log('✅ ไม่พบหน่วยงาน Mockup ในระบบ (มีเพียง Utopia เท่านั้น)');
      return;
    }

    console.log(`พบหน่วยงาน Mockup ที่ไม่ได้ใช้งานจำนวน ${mockTenants.length} แห่ง:`);
    mockTenants.forEach(t => console.log(`  - [${t.id}] ${t.name_th}`));
    
    // Check how many users and requests belong to these mockups
    const usersRes = await pool.query('SELECT COUNT(*) FROM users WHERE org_id != $1', [TARGET_ORG]);
    const reqsRes = await pool.query('SELECT COUNT(*) FROM requests WHERE org_id != $1', [TARGET_ORG]);
    const logsRes = await pool.query('SELECT COUNT(*) FROM audit_logs WHERE org_id != $1', [TARGET_ORG]);
    
    console.log(`\nข้อมูลที่เกี่ยวข้องและจะถูกลบทิ้ง:`);
    console.log(`  - Users (เจ้าหน้าที่): ${usersRes.rows[0].count} บัญชี`);
    console.log(`  - Requests (คำขอ): ${reqsRes.rows[0].count} รายการ`);
    console.log(`  - Audit Logs: ${logsRes.rows[0].count} รายการ`);
    
    console.log('\nกำลังลบข้อมูล (Deleting data)...');

    // Perform Deletion
    await pool.query('DELETE FROM requests WHERE org_id != $1', [TARGET_ORG]);
    console.log('🗑️ ลบข้อมูล Requests สำเร็จ');

    await pool.query('DELETE FROM audit_logs WHERE org_id != $1', [TARGET_ORG]);
    console.log('🗑️ ลบข้อมูล Audit Logs สำเร็จ');

    await pool.query('DELETE FROM users WHERE org_id != $1', [TARGET_ORG]);
    console.log('🗑️ ลบข้อมูล Users สำเร็จ');

    await pool.query('DELETE FROM tenants WHERE id != $1', [TARGET_ORG]);
    console.log('🗑️ ลบข้อมูล Tenants สำเร็จ');

    console.log('\n✨ การเคลียร์ข้อมูล Mockup เสร็จสมบูรณ์แล้ว! ✨');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดระหว่างการลบข้อมูล:', error);
  } finally {
    pool.end();
  }
}

run();
