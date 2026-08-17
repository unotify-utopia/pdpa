// routes/superadmin.routes.js
// ERPNext-inspired Super Admin & Tenant Management Module
// Handles: Super Admin login/2FA, Tenant CRUD, Settings, Data Offboarding

import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { execSync } from 'child_process';
import { maskEmailOrUsername, maskIpAddress } from '../services/email.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_HANDOVER_MEMO_TEMPLATE = `================================================================================
          หนังสือบันทึกข้อตกลงการส่งมอบข้อมูลและสิ้นสุดสัญญาการใช้บริการ
          (PDPA DATA OFFBOARDING & HANDOVER MEMORANDUM)
================================================================================

วันที่ส่งมอบ: {{EXPORT_DATE}}
รหัสอ้างอิงส่งมอบ: OFFBOARD-{{TENANT_ID}}-{{EXPORT_DATE_SHORT}}

1. ข้อมูลหน่วยงานผู้ใช้บริการ (Data Controller)
   - ชื่อหน่วยงาน: {{TENANT_NAME_TH}} ({{TENANT_NAME_EN}})
   - รหัสหน่วยงานในระบบ (Tenant ID): {{TENANT_ID}}
   - สถานะสัญญา ณ วันส่งมอบ: สิ้นสุดสัญญาการใช้บริการ / ไม่ต่ออายุสัญญา (EXPIRED)

2. รายละเอียดชุดข้อมูลที่ส่งมอบ (Export Package Manifest)
   - ชื่อไฟล์ที่ส่งมอบ: {{FILENAME}}
   - ขนาดไฟล์: {{FILE_SIZE_KB}} KB
   - จำนวนบัญชีผู้ใช้ในสังกัด: {{TOTAL_USERS}} บัญชี
   - จำนวนคำขอสิทธิ์ PDPA ทั้งหมด: {{TOTAL_REQUESTS}} รายการ
   - จำนวนบันทึกความปลอดภัย (Audit Logs): {{TOTAL_LOGS}} รายการ

3. รหัสรับรองความถูกต้องแท้จริงทางอิเล็กทรอนิกส์ (Cryptographic Integrity Hash)
   - อัลกอริทึมที่ใช้: Secure Hash Algorithm 256-bit (SHA-256)
   - รหัส SHA-256 Checksum:
     [ {{SHA256_CHECKSUM}} ]

4. คำรับรองคู่สัญญา
   ผู้ให้บริการระบบ (Service Provider) ได้ทำการส่งมอบไฟล์ข้อมูลตามรายละเอียดข้างต้น
   คืนให้แก่ผู้แทนหน่วยงานเรียบร้อยแล้ว โดยผู้แทนหน่วยงานได้ตรวจสอบรหัส SHA-256
   และยืนยันว่าข้อมูลถูกต้องครบถ้วน สมบูรณ์ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562

   ทั้งนี้ ผู้ให้บริการระบบยืนยันว่าได้ระงับการเข้าถึงระบบของบัญชีผู้ใช้สังกัดหน่วยงานดังกล่าว
   และดำเนินการจัดการข้อมูลบนเซิร์ฟเวอร์กลางตามมาตรฐานความปลอดภัยเรียบร้อยแล้ว


     ลงชื่อ ..............................................         ลงชื่อ ..............................................
          ( .......................................... )               ( .......................................... )
           ผู้แทนผู้ให้บริการระบบ (Super Admin)                  ผู้แทนหน่วยงานผู้ใช้บริการ (Data Controller)
           วันที่: ........ / ........ / ............           วันที่: ........ / ........ / ............
================================================================================`;

export function createSuperAdminRouter(dbPool, authenticateJWT, requireRole, addServerAuditLog, sendMailWithFallback, otpCache, JWT_SECRET) {
  const router = express.Router();

  // ─────────────────────────────────────────────
  // POST /api/super-admin/login
  // ─────────────────────────────────────────────
  router.post('/super-admin/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'กรุณากรอก Username และ Password' });

    try {
      const { rows } = await dbPool.query('SELECT * FROM users WHERE username = $1 AND role = $2', [username, 'superadmin']);
      if (rows.length === 0) return res.status(401).json({ success: false, message: 'ไม่พบบัญชีผู้ดูแลระบบกลาง' });

      const user = rows[0];
      let valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ success: false, message: 'รหัสผ่านไม่ถูกต้อง' });

      // Require Gmail OTP 2FA for Super Admin
      if (user.mfa_enabled || user.role === 'superadmin') {
        const { mfaCode } = req.body;
        const targetEmail = user.email || user.username || 'apichat.utopia@gmail.com';

        if (!mfaCode) {
          const otp = crypto.randomInt(100000, 1000000).toString();
          const otpData = JSON.stringify({ otp, expiresAt: Date.now() + 5 * 60 * 1000 });
          await dbPool.query('UPDATE users SET two_factor_secret = $1 WHERE id = $2', [otpData, user.id]);
          otpCache.set(`superadmin_login_${user.username}`, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

          const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
          const timestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

          try {
            await sendMailWithFallback({
              from: `"PDPA Access Portal" <${process.env.OTP_SENDER_EMAIL || process.env.SMTP_USER || 'pdpa.utopia@gmail.com'}>`,
              to: targetEmail,
              subject: 'รหัส OTP สำหรับเข้าสู่ระบบ Super Admin (PDPA System)',
              html: `
                <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                  <div style="background-color: #059669; padding: 20px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0;">รหัส OTP เข้าสู่ระบบ Super Admin</h2>
                  </div>
                  <div style="padding: 30px 20px; text-align: center;">
                    <p style="color: #475569; font-size: 16px; margin-bottom: 20px;">รหัสผ่านแบบใช้ครั้งเดียว (OTP) สำหรับยืนยันการเข้าสู่ระบบผู้ดูแลสูงสุดของ PDPA Portal:</p>
                    <div style="background-color: #f0fdf4; border: 2px dashed #059669; border-radius: 8px; padding: 15px; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #059669; margin-bottom: 20px;">
                      ${otp}
                    </div>
                    <p style="color: #ef4444; font-size: 14px; margin-bottom: 30px;">* รหัสนี้มีอายุการใช้งาน 5 นาที</p>

                    <div style="background-color: #f8fafc; border-radius: 6px; padding: 15px; text-align: left; font-size: 13px; color: #64748b; border: 1px solid #e2e8f0;">
                      <p style="margin: 0 0 8px 0;"><strong>ข้อมูลการทำรายการ:</strong></p>
                      <p style="margin: 0 0 4px 0;">👤 บัญชี: ${maskEmailOrUsername(user.username)}</p>
                      <p style="margin: 0 0 4px 0;">⏰ เวลา: ${timestamp}</p>
                      <p style="margin: 0;">🌐 IP Address: ${maskIpAddress(userIp)}</p>
                    </div>

                    <p style="color: #94a3b8; font-size: 12px; margin-top: 20px; border-top: 1px solid #f1f5f9; padding-top: 15px;">⚠️ แจ้งเตือน: หากคุณไม่ได้พยายามเข้าสู่ระบบ กรุณาตรวจสอบความปลอดภัยของบัญชีและระบบเครือข่ายของท่านทันที</p>
                  </div>
                </div>
              `
            });
            console.log(`[SMTP] Sent Super Admin login OTP ${otp} to ${targetEmail}`);
          } catch(mailErr) {
            console.error(`[SMTP Error] Failed to send login OTP email: ${mailErr.message}`);
            await dbPool.query('UPDATE users SET two_factor_secret = NULL WHERE id = $1', [user.id]);
            otpCache.delete(`superadmin_login_${user.username}`);
            return res.status(503).json({ success: false, message: 'ระบบส่งอีเมลขัดข้อง ไม่สามารถส่งรหัส OTP ได้' });
          }

          return res.json({
            success: true, requires2FA: true, email: targetEmail, emailSent: true,
            message: `ระบบได้ส่งรหัส OTP 6 หลักไปยัง Gmail (${targetEmail}) เรียบร้อยแล้ว`
          });
        }

        // Verify OTP
        let cached = null;
        try {
          if (user.two_factor_secret && user.two_factor_secret.startsWith('{')) {
            cached = JSON.parse(user.two_factor_secret);
          }
        } catch (e) {}
        if (!cached) cached = otpCache.get(`superadmin_login_${user.username}`);

        if (!cached || Date.now() > cached.expiresAt || cached.otp !== mfaCode.trim()) {
          return res.status(401).json({ success: false, message: 'รหัส OTP ไม่ถูกต้องหรือหมดอายุแล้ว กรุณาตรวจสอบ Gmail ของท่านอีกครั้ง' });
        }
        await dbPool.query('UPDATE users SET two_factor_secret = NULL WHERE id = $1', [user.id]);
        otpCache.delete(`superadmin_login_${user.username}`);
      }

      const token = jwt.sign({ id: user.id, role: user.role, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
      return res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/super-admin/change-password
  // ─────────────────────────────────────────────
  router.post('/super-admin/change-password', authenticateJWT, requireRole(['superadmin']), async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่' });
    }
    try {
      const { rows } = await dbPool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });

      const user = rows[0];
      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid) return res.status(401).json({ success: false, message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });

      const hashedNew = await bcrypt.hash(newPassword, 10);
      await dbPool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedNew, req.user.id]);
      res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดจากระบบ กรุณาลองใหม่อีกครั้ง' });
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/tenants
  // ─────────────────────────────────────────────
  router.get('/tenants', authenticateJWT, requireRole(['superadmin', 'admin', 'intake', 'dpo', 'owner', 'approver', 'auditor']), async (req, res) => {
    try {
      let query = 'SELECT * FROM tenants';
      let params = [];
      if (req.user.role !== 'superadmin') {
        query += ' WHERE id = $1';
        params.push(req.user.orgId);
      }
      query += ' ORDER BY created_at ASC';
      const { rows } = await dbPool.query(query, params);
      const mappedTenants = rows.map(r => ({
        id: r.id, nameTh: r.name_th, nameEn: r.name_en,
        email: r.email, phone: r.phone, status: r.status, createdAt: r.created_at
      }));
      res.json({ success: true, tenants: mappedTenants });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/tenants
  // ─────────────────────────────────────────────
  router.post('/tenants', authenticateJWT, requireRole(['superadmin']), async (req, res) => {
    const { id, nameTh, nameEn, email, phone, status } = req.body;
    try {
      await dbPool.query(
        'INSERT INTO tenants (id, name_th, name_en, email, phone, status) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, nameTh, nameEn, email, phone, status || 'active']
      );
      res.json({ success: true, tenant: req.body });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // ─────────────────────────────────────────────
  // PUT /api/tenants/:id
  // ─────────────────────────────────────────────
  router.put('/tenants/:id', authenticateJWT, requireRole(['superadmin']), async (req, res) => {
    const { nameTh, nameEn, email, phone, status } = req.body;
    try {
      await dbPool.query(
        'UPDATE tenants SET name_th = $1, name_en = $2, email = $3, phone = $4, status = $5 WHERE id = $6',
        [nameTh, nameEn, email, phone, status, req.params.id]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // ─────────────────────────────────────────────
  // DELETE /api/tenants/:id
  // ─────────────────────────────────────────────
  router.delete('/tenants/:id', authenticateJWT, requireRole(['superadmin']), async (req, res) => {
    try {
      await dbPool.query('DELETE FROM tenants WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // ─────────────────────────────────────────────
  // PUT /api/super-admin/tenants/:id/status
  // ─────────────────────────────────────────────
  router.put('/super-admin/tenants/:id/status', authenticateJWT, requireRole(['superadmin']), async (req, res) => {
    const { status } = req.body;
    const tenantId = req.params.id;
    if (!status) return res.status(400).json({ success: false, message: 'ระบุสถานะสัญญา' });
    try {
      const tenantRes = await dbPool.query('SELECT name_th FROM tenants WHERE id = $1', [tenantId]);
      if (tenantRes.rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบหน่วยงาน' });

      await dbPool.query('UPDATE tenants SET status = $1 WHERE id = $2', [status, tenantId]);
      addServerAuditLog('UPDATE_TENANT_CONTRACT_STATUS', `เปลี่ยนสถานะสัญญาหน่วยงาน ${tenantRes.rows[0].name_th} (${tenantId}) เป็น: ${status.toUpperCase()}`, req.user, null, null, req);
      res.json({ success: true, message: `เปลี่ยนสถานะหน่วยงานเป็น ${status} เรียบร้อยแล้ว` });
    } catch (err) {
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดจากระบบ กรุณาลองใหม่อีกครั้ง' });
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/super-admin/settings/:key
  // ─────────────────────────────────────────────
  router.get('/super-admin/settings/:key', authenticateJWT, requireRole(['superadmin']), async (req, res) => {
    const { key } = req.params;
    try {
      const { rows } = await dbPool.query('SELECT value, updated_at FROM system_settings WHERE key = $1', [key]);
      if (rows.length === 0) {
        if (key === 'handover_memo_template') {
          return res.json({ success: true, key, value: DEFAULT_HANDOVER_MEMO_TEMPLATE, isDefault: true });
        }
        return res.status(404).json({ success: false, message: 'ไม่พบค่ากำหนดนี้' });
      }
      res.json({ success: true, key, value: rows[0].value, updatedAt: rows[0].updated_at });
    } catch (err) {
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดจากระบบ กรุณาลองใหม่อีกครั้ง' });
    }
  });

  // ─────────────────────────────────────────────
  // PUT /api/super-admin/settings/:key
  // ─────────────────────────────────────────────
  router.put('/super-admin/settings/:key', authenticateJWT, requireRole(['superadmin']), async (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    if (value === undefined) return res.status(400).json({ success: false, message: 'กรุณาระบุข้อความที่ต้องการบันทึก' });
    try {
      await dbPool.query(
        `INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
        [key, value]
      );
      addServerAuditLog('UPDATE_SYSTEM_SETTING', `อัปเดตแบบฟอร์มการตั้งค่าระบบ: ${key}`, req.user, null, null, req);
      res.json({ success: true, message: 'บันทึกแบบฟอร์มต้นแบบเรียบร้อยแล้ว' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดจากระบบ กรุณาลองใหม่อีกครั้ง' });
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/super-admin/tenants/:id/offboard-export
  // ─────────────────────────────────────────────
  router.post('/super-admin/tenants/:id/offboard-export', authenticateJWT, requireRole(['superadmin']), async (req, res) => {
    const tenantId = req.params.id;
    try {
      const tenantRes = await dbPool.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
      if (tenantRes.rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบหน่วยงานนี้ในระบบ' });
      const tenant = tenantRes.rows[0];

      const usersRes = await dbPool.query(
        'SELECT id, username, email, full_name_th, full_name_en, role, department, created_at FROM users WHERE org_id = $1',
        [tenantId]
      );
      const requestsRes = await dbPool.query('SELECT * FROM requests WHERE org_id = $1 ORDER BY created_at DESC', [tenantId]);
      const logsRes = await dbPool.query(
        "SELECT * FROM audit_logs WHERE org_id = $1 OR details LIKE '%' || $2 || '%' ORDER BY timestamp DESC LIMIT 5000",
        [tenantId, tenant.name_th]
      );

      const generatedAt = new Date().toISOString();
      const archivePayload = {
        meta: {
          exportVersion: '2.5.0-ENTERPRISE-OFFBOARDING',
          exportType: 'PDPA_COMPLETE_TENANT_SNAPSHOT_ARCHIVE',
          tenantId: tenant.id, tenantNameTh: tenant.name_th, tenantNameEn: tenant.name_en,
          contractStatusAtExport: tenant.status, generatedBy: req.user.username, generatedAt,
          legalNotice: 'ชุดข้อมูลนี้ถูกนำออกและลงนามรับรองความถูกต้องด้วย SHA-256 Checksum ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 สำหรับกรณีสิ้นสุดสัญญาการให้บริการ'
        },
        tenantProfile: tenant,
        staffAccounts: usersRes.rows,
        pdpaRequests: requestsRes.rows,
        auditTrail: logsRes.rows
      };

      const jsonString = JSON.stringify(archivePayload, null, 2);
      const checksum = crypto.createHash('sha256').update(jsonString).digest('hex');
      archivePayload.meta.sha256Checksum = checksum;

      let memoTemplate = DEFAULT_HANDOVER_MEMO_TEMPLATE;
      try {
        const memoRes = await dbPool.query('SELECT value FROM system_settings WHERE key = $1', ['handover_memo_template']);
        if (memoRes.rows.length > 0 && memoRes.rows[0].value) memoTemplate = memoRes.rows[0].value;
      } catch (e) {}

      const exportDateShort = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const filename = `${tenant.id}_PDPA_OFFBOARDING_ARCHIVE_${new Date().toISOString().split('T')[0]}.json`;
      const sizeKb = (Buffer.byteLength(jsonString, 'utf8') / 1024).toFixed(2);

      const handoverMemoText = memoTemplate
        .replace(/{{TENANT_ID}}/g, tenant.id)
        .replace(/{{TENANT_NAME_TH}}/g, tenant.name_th)
        .replace(/{{TENANT_NAME_EN}}/g, tenant.name_en)
        .replace(/{{EXPORT_DATE}}/g, new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }))
        .replace(/{{EXPORT_DATE_SHORT}}/g, exportDateShort)
        .replace(/{{FILENAME}}/g, filename)
        .replace(/{{FILE_SIZE_KB}}/g, sizeKb)
        .replace(/{{TOTAL_USERS}}/g, String(usersRes.rows.length))
        .replace(/{{TOTAL_REQUESTS}}/g, String(requestsRes.rows.length))
        .replace(/{{TOTAL_LOGS}}/g, String(logsRes.rows.length))
        .replace(/{{SHA256_CHECKSUM}}/g, checksum);

      addServerAuditLog('TENANT_OFFBOARD_EXPORT', `ส่งมอบและนำออกข้อมูลหน่วยงานหมดสัญญา: ${tenant.name_th} (${tenantId}) - SHA-256: ${checksum.substring(0, 16)}...`, req.user, null, null, req);

      res.json({
        success: true, checksum, exportedAt: generatedAt,
        stats: {
          totalUsers: usersRes.rows.length, totalRequests: requestsRes.rows.length,
          totalAuditLogs: logsRes.rows.length, packageSizeBytes: Buffer.byteLength(jsonString, 'utf8')
        },
        packageData: archivePayload,
        handoverMemoText
      });
    } catch (err) {
      console.error('Error in offboard export:', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการนำออกข้อมูลหน่วยงาน: ' + err.message });
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/super-admin/dashboard-stats
  // ─────────────────────────────────────────────
  router.get('/super-admin/dashboard-stats', authenticateJWT, requireRole(['superadmin']), async (req, res) => {
    try {
      // 1. DB Size & Log Size
      const dbSizeRes = await dbPool.query(`
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as size_pretty, 
          pg_database_size(current_database()) as size_bytes,
          pg_size_pretty(pg_total_relation_size('audit_logs')) as log_size_pretty,
          pg_total_relation_size('audit_logs') as log_size_bytes
      `);
      
      // 2. Metrics
      const metricsRes = await dbPool.query(`
        SELECT 
          (SELECT COUNT(*) FROM audit_logs WHERE action = 'PAYLOAD_TOO_LARGE_ATTEMPT' OR action = 'FRONTEND_PAYLOAD_TOO_LARGE') as payload_blocks,
          (SELECT COUNT(*) FROM audit_logs WHERE action = 'OTP_VERIFICATION_FAILED') as otp_failures,
          (SELECT COUNT(*) FROM audit_logs) as total_audit_logs,
          (SELECT COUNT(*) FROM requests) as total_requests,
          (SELECT COUNT(*) FROM tenants) as total_tenants,
          (SELECT COUNT(*) FROM users) as total_users
      `);

      // 3. Archives Size
      let archivesSize = 0;
      let archivesCount = 0;
      const archiveDir = path.join(__dirname, '..', 'archives');
      if (fs.existsSync(archiveDir)) {
        const files = fs.readdirSync(archiveDir);
        for (const file of files) {
          const stats = fs.statSync(path.join(archiveDir, file));
          archivesSize += stats.size;
          archivesCount++;
        }
      }

      // 4. Recent Alerts (Critical logs)
      const alertsRes = await dbPool.query(`
        SELECT * FROM audit_logs 
        WHERE action IN ('PAYLOAD_TOO_LARGE_ATTEMPT', 'FRONTEND_PAYLOAD_TOO_LARGE', 'OTP_VERIFICATION_FAILED', 'SUPERADMIN_LOGIN_FAILED')
        ORDER BY timestamp DESC 
        LIMIT 10
      `);

      // 5. System Usage (CPU, RAM, Uptime)
      const systemInfo = {
        cpuCount: os.cpus().length,
        cpuModel: os.cpus()[0].model,
        loadAvg: os.loadavg(),
        totalMem: os.totalmem(),
        freeMem: os.freemem(),
        uptime: os.uptime()
      };

      // 6. Disk Usage
      let diskInfo = { total: 0, free: 0 };
      try {
        if (os.platform() === 'win32') {
          const out = execSync('wmic logicaldisk where "DeviceID=\'C:\'" get size,freespace').toString();
          const lines = out.trim().split('\n');
          if (lines.length > 1) {
            const parts = lines[1].trim().split(/\s+/);
            diskInfo.free = parseInt(parts[0], 10);
            diskInfo.total = parseInt(parts[1], 10);
          }
        } else {
          const out = execSync('df -k /').toString();
          const lines = out.trim().split('\n');
          if (lines.length > 1) {
            const parts = lines[1].trim().split(/\s+/);
            diskInfo.total = parseInt(parts[1], 10) * 1024;
            diskInfo.free = parseInt(parts[3], 10) * 1024;
          }
        }
      } catch (e) {
        console.error('Error fetching disk space:', e);
      }

      res.json({
        success: true,
        dbSize: dbSizeRes.rows[0],
        metrics: metricsRes.rows[0],
        archives: { count: archivesCount, sizeBytes: archivesSize },
        recentAlerts: alertsRes.rows,
        systemInfo: systemInfo,
        diskInfo: diskInfo
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
    }
  });

  return router;
}
