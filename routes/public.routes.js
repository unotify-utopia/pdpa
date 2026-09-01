// routes/public.routes.js
// Public (unauthenticated) + Config + Template routes
// Handles: Public tenant list, request submission, OTP, tracking, config, templates

import express from 'express';
import rateLimit from 'express-rate-limit';
import { applyFieldPermissionsToList } from '../middleware/fieldPermissions.js';
import { sendMailWithFallback, sendWorkflowNotification, workflowEmailLogs, maskEmailOrUsername, maskIpAddress } from '../services/email.service.js';
import { updateRequestSLA } from '../services/sla.service.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

import { execSync } from 'child_process';

export function createPublicRouter(dbPool, addServerAuditLog, authenticateJWT, requireRole) {
  const router = express.Router();

  // DEBUG ENDPOINT
  router.get('/public/debug-logs', (req, res) => {
    try {
      const logs = execSync('tail -n 200 ~/.pm2/logs/*error*.log').toString();
      res.type('text/plain').send(logs);
    } catch (e) {
      res.status(500).send(e.toString());
    }
  });

  router.get('/public/debug-db', async (req, res) => {
    try {
      const { rows } = await dbPool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10');
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.toString() });
    }
  });

  const auditLogLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 20,
    message: { success: false, message: 'Too many audit logs requests from this IP, please try again after 5 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const otpRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'พยายามร้องขอหรือยืนยัน OTP มากเกินไป กรุณารอ 15 นาที' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // ─────────────────────────────────────────────
  // GET /api/config
  // ─────────────────────────────────────────────
  router.get('/config', async (req, res) => {
    try {
      const { rows } = await dbPool.query("SELECT value FROM system_settings WHERE key = 'app_config'");
      if (rows.length > 0) {
        return res.json({ success: true, config: JSON.parse(rows[0].value) });
      }
      return res.json({ success: true, config: null });
    } catch (err) {
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดจากระบบ กรุณาลองใหม่อีกครั้ง' });
    }
  });

  // ─────────────────────────────────────────────
  // PUT /api/config
  // ─────────────────────────────────────────────
  router.put('/config', authenticateJWT, requireRole(['admin', 'superadmin']), async (req, res) => {
    const config = req.body;
    try {
      await dbPool.query(
        "INSERT INTO system_settings (key, value) VALUES ('app_config', $1) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP",
        [JSON.stringify(config)]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดจากระบบ กรุณาลองใหม่อีกครั้ง' });
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/templates
  // ─────────────────────────────────────────────
  router.get('/templates', async (req, res) => {
    try {
      const { rows } = await dbPool.query('SELECT * FROM document_templates');
      res.json({ success: true, templates: rows });
    } catch (err) {
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดจากระบบ กรุณาลองใหม่อีกครั้ง' });
    }
  });

  // ─────────────────────────────────────────────
  // PUT /api/templates
  // ─────────────────────────────────────────────
  router.put('/templates', authenticateJWT, requireRole(['admin', 'superadmin']), async (req, res) => {
    const templates = req.body.templates || [];
    try {
      for (const t of templates) {
        await dbPool.query(
          'INSERT INTO document_templates (id, type, name, subject, body, is_active) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET type = $2, name = $3, subject = $4, body = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP',
          [t.id, t.type, t.name, t.subject, t.body, t.isActive]
        );
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดจากระบบ กรุณาลองใหม่อีกครั้ง' });
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/public/tenants
  // ─────────────────────────────────────────────
  router.get('/public/tenants', async (req, res) => {
    try {
      let query = "SELECT id, name_th, name_en, status FROM tenants WHERE (status = 'active' OR status IS NULL)";
      let params = [];
      if (process.env.SYSTEM_MODE && process.env.SYSTEM_MODE.trim() === 'SINGLE_NODE') {
        query += " AND id = $1";
        params.push('default-tenant');
      }
      query += " ORDER BY created_at ASC";
      const { rows } = await dbPool.query(query, params);
      const mappedTenants = rows.map(t => ({
        id: t.id, nameTh: t.name_th, nameEn: t.name_en, code: t.id.replace('org_', '')
      }));
      res.json({ success: true, tenants: mappedTenants });
    } catch (err) {
      console.error('Error fetching public tenants:', err);
      res.status(500).json({ success: false, message: 'Server error fetching public tenants' });
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/audit-logs (Client-side audit log ingestion)
  // ─────────────────────────────────────────────
  router.post('/audit-logs', authenticateJWT, auditLogLimiter, async (req, res) => {
    try {
      const log = req.body;
      // [SECURITY] Override actor fields from authenticated JWT — never trust client
      const actorId = (req.user && req.user.id) || 'unknown';
      const actorName = (req.user && req.user.fullNameTh) || 'Unknown User';
      const actorRole = (req.user && req.user.role) || 'unknown';
      const orgId = (req.user && req.user.orgId) || 'public';
      await dbPool.query(
        `INSERT INTO audit_logs (id, org_id, timestamp, actor_id, actor_name, actor_role, action, request_id, request_tracking_no, ip_address, user_agent, details, checksum) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          log.id || `log_${Date.now()}`,
          orgId,
          new Date().toISOString(),
          actorId,
          actorName,
          actorRole,
          log.action || 'UNKNOWN_ACTION', log.requestId || null, log.requestTrackingNo || null,
          String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').substring(0, 50),
          req.headers['user-agent'] || 'Frontend API',
          log.details || '', log.checksum || ''
        ]
      );
      res.status(201).json({ success: true, message: 'Audit log created' });
    } catch (err) {
      console.error('Failed to create audit log via API:', err);
      res.status(500).json({ success: false, message: 'Failed to create audit log' });
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/public/requests - REMOVED for security
  // ─────────────────────────────────────────────

  // [SECURITY] Rate limiter for public request submission — prevents spam/DDoS
  const publicRequestLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 ชั่วโมง
    max: 10,                   // max 10 คำร้อง/IP/ชั่วโมง
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'ส่งคำร้องมากเกินไป กรุณารอ 1 ชั่วโมงแล้วลองใหม่' },
  });

  // ─────────────────────────────────────────────
  // POST /api/public/requests
  // ─────────────────────────────────────────────
  router.post('/public/requests', publicRequestLimiter, async (req, res) => {
    try {
      let requestData = req.body;
      // [SECURITY] For new requests, server generates ID. Client-provided ID is only used to lookup existing requests for messageThread updates.
      const clientProvidedId = requestData.id;
      const serverGeneratedId = `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      
      let isNewRequest = true;
      let oldStatus = null;
      let existingData = null;
      let isNewCitizenMessage = false;
      let isNewStaffMessage = false;

      // Only check for existing request if client provides an ID (for messageThread append flow)
      if (clientProvidedId) {
        try {
          const existRes = await dbPool.query('SELECT status, data FROM requests WHERE id = $1', [clientProvidedId]);
          if (existRes.rows.length > 0) {
            isNewRequest = false;
            oldStatus = existRes.rows[0].status;
            existingData = typeof existRes.rows[0].data === 'string' ? JSON.parse(existRes.rows[0].data) : (existRes.rows[0].data || {});
          }
        } catch (existErr) { console.warn('Check existing request warning:', existErr.message); }
      }

      const reqId = isNewRequest ? serverGeneratedId : clientProvidedId;

      if (!isNewRequest && existingData) {
        // [SECURITY] C3: For existing requests from public endpoint,
        // ONLY allow: (1) appending to messageThread, (2) adding attachments when status is 'Awaiting Additional Information'
        // All other fields are preserved from the existing DB record — client cannot modify status, decision, requester info, etc.
        const mergedData = { ...existingData };
        
        // (1) Allow messageThread append only (new messages at the end)
        if (requestData.messageThread && requestData.messageThread.length > (existingData.messageThread || []).length) {
            // Only append genuinely new messages — preserve all existing ones
            const existingCount = (existingData.messageThread || []).length;
            const newMessages = requestData.messageThread.slice(existingCount);
            mergedData.messageThread = [...(existingData.messageThread || []), ...newMessages];
            
            const latestMsg = newMessages[newMessages.length - 1];
            if (latestMsg && latestMsg.sender === 'user') isNewCitizenMessage = true;
            else if (latestMsg && latestMsg.sender === 'staff') isNewStaffMessage = true;
        }
        
        // (2) Allow attachments append only when 'Awaiting Additional Information'
        if (oldStatus === 'Awaiting Additional Information' && requestData.attachments) {
          const existingAttachments = existingData.attachments || [];
          if (requestData.attachments.length > existingAttachments.length) {
            mergedData.attachments = requestData.attachments;
          }
        }

        requestData = mergedData;
        requestData.status = oldStatus; // Never allow public user to change status
      } else {
        // It's a new request. Strip sensitive fields.
        delete requestData.status;
        delete requestData.decision;
        delete requestData.statusHistory;
        delete requestData.assignedTo;
        delete requestData.slaRemainingDays;
        delete requestData.slaDaysUsed;
        requestData.status = 'Submitted';
      }

      const year = new Date().getFullYear();
      const orgId = requestData.orgId || 'org_dopa';
      const orgCodePrefix = orgId.replace(/^org_/, '').toUpperCase().replace('_TH', '');

      const countRes = await dbPool.query('SELECT COUNT(*) FROM requests WHERE org_id = $1', [orgId]);
      const tenantCount = parseInt(countRes.rows[0].count) + 1;
      const trackingNo = requestData.trackingNo || `REQ-${orgCodePrefix}-${year}-${tenantCount.toString().padStart(4, '0')}`;
      const requesterType = requestData.requesterType || 'self';
      const status = requestData.status || 'Submitted';

      const newRequest = {
        ...requestData, id: reqId, orgId, trackingNo, status,
        submissionDate: requestData.submissionDate || new Date().toISOString(),
        slaRemainingDays: requestData.slaRemainingDays || 30,
        slaDaysUsed: requestData.slaDaysUsed || 0
      };

      try {
        await dbPool.query(
          'INSERT INTO tenants (id, name_th, name_en, email, phone) VALUES ($1, $2, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
          [orgId, requestData.targetOrgName || orgId, 'contact@example.com', '-']
        );
      } catch (tenantErr) { console.warn('Auto-create tenant warning:', tenantErr.message); }

      const updatedRequest = updateRequestSLA(newRequest, status);

      await dbPool.query(
        'INSERT INTO requests (id, org_id, tracking_no, requester_type, status, data) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET data = $6, status = $5',
        [reqId, orgId, trackingNo, requesterType, status, JSON.stringify(updatedRequest)]
      );

      // --- Add Audit Log for Public Submission ---
      if (isNewRequest) {
        const ipAddress = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').substring(0, 50);
        const userAgent = String(req.headers['user-agent'] || 'Frontend API').substring(0, 255);
        const logId = `log_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const timestamp = new Date().toISOString();
        const action = 'PUBLIC_SUBMIT_REQUEST';
        const actorId = 'public_user';
        const actorName = updatedRequest.requester?.name || 'ผู้ยื่นคำร้อง (Public)';
        const actorRole = 'public';
        const details = `ประชาชนยื่นคำร้องใหม่รหัส: ${trackingNo}`;
        const checksum = crypto.createHmac('sha256', process.env.JWT_SECRET || 'fallback_secret')
          .update(`${logId}|${actorId}|${action}|${timestamp}`).digest('hex');

        await dbPool.query(
          `INSERT INTO audit_logs (id, org_id, timestamp, actor_id, actor_name, actor_role, action, request_id, request_tracking_no, ip_address, user_agent, details, checksum) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [logId, orgId, timestamp, actorId, actorName, actorRole, action, reqId, trackingNo, ipAddress, userAgent, details, checksum]
        ).catch(err => console.error('Failed to write public submit audit log', err));
      }

      try {
        if (isNewRequest) {
          await sendWorkflowNotification(updatedRequest, null, status, 'CREATE', dbPool);
        } else if (isNewCitizenMessage) {
          await sendWorkflowNotification(updatedRequest, null, status, 'UPDATE_BY_CITIZEN', dbPool);
          // Add Audit Log for Citizen Reply
          const ipAddress = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').substring(0, 50);
          const userAgent = String(req.headers['user-agent'] || 'Frontend API').substring(0, 255);
          const logId = `log_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
          const timestamp = new Date().toISOString();
          const action = 'PUBLIC_ADD_MESSAGE';
          const actorId = 'public_user';
          const actorName = updatedRequest.requester?.name || 'ผู้ยื่นคำร้อง (Public)';
          const actorRole = 'public';
          const details = `ประชาชนส่งข้อความ/แนบไฟล์เพิ่มเติมสำหรับรหัส: ${trackingNo}`;
          const checksum = crypto.createHmac('sha256', process.env.JWT_SECRET || 'fallback_secret')
            .update(`${logId}|${actorId}|${action}|${timestamp}`).digest('hex');

          await dbPool.query(
            `INSERT INTO audit_logs (id, org_id, timestamp, actor_id, actor_name, actor_role, action, request_id, request_tracking_no, ip_address, user_agent, details, checksum) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [logId, orgId, timestamp, actorId, actorName, actorRole, action, reqId, trackingNo, ipAddress, userAgent, details, checksum]
          ).catch(err => console.error('Failed to write public reply audit log', err));
        } else {
          if (oldStatus && oldStatus !== status) {
            await sendWorkflowNotification(updatedRequest, oldStatus, status, 'STATUS_CHANGE', dbPool);
          }
          if (isNewCitizenMessage) {
            await sendWorkflowNotification(updatedRequest, oldStatus, status, 'NEW_MESSAGE', dbPool);
          }
          if (isNewStaffMessage) {
            await sendWorkflowNotification(updatedRequest, oldStatus, status, 'STAFF_REPLY', dbPool);
          }
        }
      } catch (notifyErr) { console.error('Workflow notification error:', notifyErr.message); }

      return res.status(201).json({ success: true, message: 'ยื่นแบบคำขอเข้าถึงข้อมูลส่วนบุคคลสำเร็จ', request: updatedRequest });
    } catch (error) {
      console.error('Error inserting request to PostgreSQL:', error);
      return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/public/email-logs
  // ─────────────────────────────────────────────
  router.get('/public/email-logs', authenticateJWT, requireRole(['superadmin', 'admin']), async (req, res) => {
    return res.json({ success: true, logs: workflowEmailLogs.slice(-100) });
  });

  // ─────────────────────────────────────────────
  // POST /api/notify/workflow
  // ─────────────────────────────────────────────
  router.post('/notify/workflow', authenticateJWT, async (req, res) => {
    try {
      const { request, oldStatus, newStatus, eventType } = req.body;
      if (!request) return res.status(400).json({ success: false, message: 'Missing request object' });
      await sendWorkflowNotification(request, oldStatus || null, newStatus || request.status, eventType || 'STATUS_CHANGE', dbPool);
      return res.json({ success: true, message: 'ส่งอีเมลแจ้งเตือนตาม Flow เอกสารเรียบร้อยแล้ว' });
    } catch (err) {
      console.error('Manual notify workflow error:', err);
      return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการส่งอีเมลแจ้งเตือน' });
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/public/send-otp
  // ─────────────────────────────────────────────
  router.post('/public/send-otp', otpRateLimiter, async (req, res) => {
    const { email, phone, reference } = req.body;
    if (!email && !phone) return res.status(400).json({ success: false, message: 'กรุณาระบุอีเมลหรือเบอร์โทรศัพท์' });

    const otp = crypto.randomInt(100000, 1000000).toString();
    const key = reference || email || phone;
    const expiresAt = Date.now() + 5 * 60 * 1000;

    try {
      const hashedOtp = await bcrypt.hash(otp, 10);
      await dbPool.query(
        `INSERT INTO public_otps (key, otp, expires_at) VALUES ($1, $2, $3) ON CONFLICT (key) DO UPDATE SET otp = EXCLUDED.otp, expires_at = EXCLUDED.expires_at`,
        [key, hashedOtp, expiresAt]
      );

      if (email) {
        const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
        const timestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

        await sendMailWithFallback({
          from: `"PDPA Access Portal" <${process.env.OTP_SENDER_EMAIL || process.env.SMTP_USER || 'pdpa.utopia@gmail.com'}>`,
          to: email,
          subject: 'รหัส OTP สำหรับยืนยันตัวตน (PDPA Portal)',
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #0f172a; padding: 24px 20px; text-align: center;">
                <div style="background-color: #ffffff; width: 56px; height: 56px; margin: 0 auto 12px; border-radius: 12px; overflow: hidden; padding: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <img src="${process.env.APP_BASE_URL || "https://utopia.pdpa.click"}/pdpa-logo.jpg" alt="PDPA Logo" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
                </div>
                <h2 style="color: #ffffff; margin: 0;">รหัส OTP สำหรับผู้ใช้บริการ</h2>
              </div>
              <div style="padding: 30px 20px; text-align: center;">
                <p style="color: #475569; font-size: 16px; margin-bottom: 20px;">รหัสผ่านแบบใช้ครั้งเดียว (OTP) สำหรับยืนยันตัวตนเพื่อเข้าถึงแบบฟอร์มหรือติดตามสถานะคำร้องขอใช้สิทธิ (Data Subject Right Request)</p>
                <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 15px; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #0284c7; margin-bottom: 20px;">
                  ${otp}
                </div>
                <p style="color: #ef4444; font-size: 14px; margin-bottom: 30px;">* รหัสนี้มีอายุการใช้งาน 5 นาที</p>

                <div style="background-color: #f8fafc; border-radius: 6px; padding: 15px; text-align: left; font-size: 13px; color: #64748b; border: 1px solid #e2e8f0;">
                  <p style="margin: 0 0 8px 0;"><strong>ข้อมูลการทำรายการ:</strong></p>
                  <p style="margin: 0 0 4px 0;">อ้างอิง: ${maskEmailOrUsername(key)}</p>
                  <p style="margin: 0 0 4px 0;">⏰ เวลา: ${timestamp}</p>
                  <p style="margin: 0;">🌐 IP Address: ${maskIpAddress(userIp)}</p>
                </div>
                
                <p style="color: #94a3b8; font-size: 12px; margin-top: 20px; border-top: 1px solid #f1f5f9; padding-top: 15px;">หากคุณไม่ได้ทำรายการนี้ กรุณาละเว้นอีเมลฉบับนี้</p>
              </div>
            </div>
          `
        });
        console.log(`[SMTP] Sent OTP to ${email}`);
      }

      return res.json({ success: true, message: 'ส่งรหัส OTP เรียบร้อยแล้ว' });
    } catch (error) {
      console.error('[SMTP or DB] Error sending OTP:', error);
      await dbPool.query('DELETE FROM public_otps WHERE key = $1', [key]);
      return res.status(503).json({ success: false, message: 'ระบบส่งอีเมลขัดข้อง: ' + error.message });
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/public/verify-otp
  // ─────────────────────────────────────────────
  router.post('/public/verify-otp', otpRateLimiter, async (req, res) => {
    const { reference, email, phone, otp } = req.body;
    const key = reference || email || phone;
    if (!key || !otp) return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });

    try {
      const result = await dbPool.query('SELECT * FROM public_otps WHERE key = $1', [key]);
      if (result.rows.length === 0) {
        addServerAuditLog('OTP_VERIFICATION_FAILED', `No OTP found or expired for key: ${key}`, null).catch(console.error);
        return res.status(400).json({ success: false, message: 'ไม่พบรหัส OTP หรือรหัสอาจหมดอายุแล้ว กรุณาขอใหม่' });
      }

      const record = result.rows[0];
      if (Date.now() > Number(record.expires_at)) {
        await dbPool.query('DELETE FROM public_otps WHERE key = $1', [key]);
        addServerAuditLog('OTP_VERIFICATION_FAILED', `OTP expired for key: ${key}`, null).catch(console.error);
        return res.status(400).json({ success: false, message: 'รหัส OTP หมดอายุแล้ว กรุณาขอใหม่' });
      }
      const isValidOtp = await bcrypt.compare(otp, record.otp);
      if (isValidOtp) {
        await dbPool.query('DELETE FROM public_otps WHERE key = $1', [key]);
        return res.json({ success: true, message: 'ยืนยันรหัส OTP สำเร็จ' });
      } else {
        addServerAuditLog('OTP_VERIFICATION_FAILED', `Incorrect OTP attempt for key: ${key}`, null).catch(console.error);
        return res.status(400).json({ success: false, message: 'รหัส OTP ไม่ถูกต้อง' });
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบรหัส OTP' });
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/public/requests/search
  // ─────────────────────────────────────────────
  router.post('/public/requests/search', async (req, res) => {
    try {
      const { keyword } = req.body;
      if (!keyword || keyword.trim() === '') return res.status(400).json({ success: false, message: 'กรุณากรอกคำค้นหา' });

      const query = keyword.trim().toUpperCase();
      const cleanDigits = query.replace(/[^0-9]/g, '');
      
      let dbQuery = `SELECT data FROM requests WHERE tracking_no ILIKE $1`;
      let params = [`%${query}%`];
      
      if (cleanDigits.length > 0) {
        dbQuery += ` OR regexp_replace(tracking_no, '[^0-9]', '', 'g') LIKE $2`;
        params.push(`%${cleanDigits}`);
      }
      dbQuery += ` ORDER BY created_at DESC LIMIT 50`;

      const { rows } = await dbPool.query(dbQuery, params);

      const matches = rows.map(r => r.data).filter(r => {
        const tNo = (r.trackingNo || '').toUpperCase();
        if (tNo === query) return true;
        if (tNo.includes(query)) return true;
        if (cleanDigits.length > 0 && tNo.replace(/[^0-9]/g, '').endsWith(cleanDigits)) return true;
        return false;
      });

      // [SECURITY] Server-side PII masking — don't expose raw data before OTP verification
      const maskEmail = (e) => {
        if (!e || typeof e !== 'string') return '';
        const [local, domain] = e.split('@');
        if (!domain) return e[0] + '***';
        return local[0] + '***@' + domain;
      };
      const maskPhone = (p) => {
        if (!p || typeof p !== 'string') return '';
        return p.substring(0, 2) + 'x-xxx-x' + p.slice(-3);
      };

      const safeMatches = matches.map(reqObj => ({
        id: reqObj.id,
        trackingNo: reqObj.trackingNo,
        status: reqObj.status,
        submissionDate: reqObj.submissionDate,
        requester: {
          firstName: (reqObj.requester?.firstName || '')[0] || '',
          lastName: (reqObj.requester?.lastName || '')[0] || '',
          email: maskEmail(reqObj.requester?.email),
          phone: maskPhone(reqObj.requester?.phone),
        },
        requesterType: reqObj.requesterType,
        // messageThread, representative, statusHistory intentionally excluded (VULN-H1)
      }));

      res.json({ success: true, results: safeMatches });
    } catch (err) {
      console.error('Error searching public requests:', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการค้นหา' });
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/public/track/:trackingNo — REMOVED (VULN-H2)
  // Was: returned messageThread + statusHistory without auth
  // Frontend uses POST /api/public/requests/search instead
  // ─────────────────────────────────────────────

  // ─────────────────────────────────────────────
  // POST /api/cookie-consent
  // ─────────────────────────────────────────────
  // [SECURITY] Rate limiter for cookie consent
  const cookieConsentLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 นาที
    max: 20,                  // max 20 req/IP/5 นาที
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests' },
  });

  router.post('/cookie-consent', cookieConsentLimiter, async (req, res) => {
    try {
      const { sessionId, action, preferences } = req.body;
      const ipAddress = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').substring(0, 45);
      const userAgent = req.headers['user-agent'] || 'Unknown';
      
      await dbPool.query(
        `INSERT INTO cookie_consent_logs (session_id, ip_address, user_agent, action, preferences) 
         VALUES ($1, $2, $3, $4, $5)`,
        [sessionId, ipAddress, userAgent, action, JSON.stringify(preferences)]
      );
      
      res.json({ success: true, message: 'Cookie consent saved' });
    } catch (err) {
      console.error('Error saving cookie consent:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  return router;
}
