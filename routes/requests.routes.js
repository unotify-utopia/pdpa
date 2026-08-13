// routes/requests.routes.js
import express from 'express';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { applyFieldPermissions, applyFieldPermissionsToList } from '../middleware/fieldPermissions.js';
import { calculateOrgSLAReport } from '../services/sla.service.js';
import { sendMailWithFallback } from '../services/email.service.js';

export function createRequestsRouter(dbPool, authenticateJWT, requireRole, addServerAuditLog) {
  const router = express.Router();

  // Helper to resolve a download token by token string, request_id, OR tracking_no (auto-creates if needed)
  async function resolveDownloadToken(param) {
    if (!param) return null;
    // 1. Search in download_tokens table
    const { rows } = await dbPool.query(
      `SELECT dt.*, r.tracking_no, r.data as req_data, r.org_id, r.id as req_id
       FROM download_tokens dt
       JOIN requests r ON r.id = dt.request_id
       WHERE dt.token = $1 OR dt.request_id = $1 OR r.tracking_no = $1
       ORDER BY dt.created_at DESC LIMIT 1`,
      [param]
    );
    if (rows.length > 0) {
      return rows[0];
    }

    // 2. If no download_token row exists yet, check if request exists in requests table
    const { rows: reqRows } = await dbPool.query(
      `SELECT id, tracking_no, data, org_id FROM requests
       WHERE tracking_no = $1 OR id = $1 LIMIT 1`,
      [param]
    );
    if (reqRows.length === 0) {
      return null; // Neither token nor request found
    }

    const reqRow = reqRows[0];
    // 3. Auto-generate a secure token for this request with 30 days validity
    const newToken = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    await dbPool.query(
      'INSERT INTO download_tokens (token, request_id, org_id, expires_at) VALUES ($1, $2, $3, $4)',
      [newToken, reqRow.id, reqRow.org_id, expiresAt]
    );

    // Also update request data so it has downloadToken
    try {
      const dataObj = reqRow.data || {};
      dataObj.downloadToken = newToken;
      await dbPool.query('UPDATE requests SET data = $1 WHERE id = $2', [JSON.stringify(dataObj), reqRow.id]);
    } catch (e) {}

    return {
      token: newToken,
      request_id: reqRow.id,
      org_id: reqRow.org_id,
      expires_at: expiresAt,
      downloaded_count: 0,
      is_revoked: false,
      tracking_no: reqRow.tracking_no,
      req_data: reqRow.data || {},
      req_id: reqRow.id
    };
  }

  // POST /api/requests/:id/tasks/:taskId/upload (Secure file upload for Data Discovery)
  router.post('/requests/:id/tasks/:taskId/upload', authenticateJWT, requireRole(['admin', 'owner']), async (req, res) => {
    try {
      const { id, taskId } = req.params;
      const { filename, fileData } = req.body;
      
      if (!filename || !fileData) {
        return res.status(400).json({ success: false, message: 'Missing file data' });
      }
      
      const fileId = `file_${Date.now()}`;
      
      await dbPool.query(
        `INSERT INTO task_files (id, request_id, task_id, filename, file_data, uploaded_by) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [fileId, id, taskId, filename, fileData, req.user.username]
      );

      // Also log to audit_logs
      await dbPool.query(
        `INSERT INTO audit_logs (id, org_id, actor_id, actor_name, actor_role, action, request_id, details) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [`log_${Date.now()}`, req.user.orgId, req.user.id || req.user.username, req.user.fullNameTh || req.user.username, req.user.role, 'UPLOAD_DATA_DISCOVERY_FILE', id, `อัปโหลดไฟล์ ${filename} สำหรับภารกิจ ${taskId}`]
      );
      
      res.json({ success: true, fileId });
    } catch (err) {
      console.error('Upload Error:', err);
      res.status(500).json({ success: false, message: err.message || 'Upload failed' });
    }
  });


  // POST /api/requests/:id/deliver (Deliver to requester)
  router.post('/requests/:id/deliver', authenticateJWT, requireRole(['intake', 'admin', 'dpo', 'approver']), async (req, res) => {
    try {
      const { id } = req.params;
      
      // In a real app we'd fetch the DB. Here we use the mockup logic.
      // For demo, we just extract email from the request if it was sent in body or fetch from DB.
      const { trackingNo, email, requesterName } = req.body;
      
      if (!email) {
        return res.status(400).json({ success: false, message: 'Missing email address' });
      }

      // Generate QR Code for the direct download link
      const directDownloadUrl = `https://pdpa.numcomputer.com/dl/${trackingNo}`;
      const qrDataUrl = await QRCode.toDataURL(directDownloadUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 150,
        color: { dark: '#000000', light: '#ffffff' }
      });

      const emailHtml = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0f172a;">แจ้งผลการดำเนินการและส่งมอบข้อมูลส่วนบุคคล</h2>
          <p>เรียน คุณ ${requesterName || 'ผู้ร้องขอ'},</p>
          <p>องค์กรได้พิจารณาอนุมัติการเข้าถึงข้อมูลตามสิทธิของท่านเรียบร้อยแล้ว รายละเอียดข้อมูลของท่านได้รับการตรวจสอบและจัดเตรียมไว้เป็นที่เรียบร้อย</p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 24px 0; text-align: center;">
            <h3 style="margin-top: 0; color: #334155; font-size: 14px;">ช่องทางดาวน์โหลดและตรวจสอบความถูกต้องเอกสาร (ใช้งานได้ 7 วัน):</h3>
            
            <div style="margin: 16px 0;">
              <img src="${qrDataUrl}" alt="QR Code for Download" style="border-radius: 8px; border: 1px solid #cbd5e1; padding: 8px; background: white;" />
            </div>
            <p style="font-size: 14px; margin-bottom: 8px;">หรือสแกน QR Code เพื่อดาวน์โหลดเอกสาร</p>
            <p style="margin: 4px 0;">เข้าสู่เว็บไซต์: <a href="https://pdpa.numcomputer.com/dl" style="color: #2563eb;">pdpa.numcomputer.com/dl</a></p>
            <p style="margin: 4px 0;">และระบุรหัสอ้างอิง: <strong>${trackingNo}</strong></p>
          </div>
          <p style="font-size: 12px; color: #64748b;">
            *ข้อแนะนำในการเข้าถึงข้อมูล: ท่านต้องกรอกรหัสผ่านแบบใช้ครั้งเดียว (OTP) ที่จะส่งเข้ามือถือหรืออีเมลของท่านเมื่อเข้าสู่หน้าดาวน์โหลด*
          </p>
        </div>
      `;

      await sendMailWithFallback({
        to: email,
        subject: `แจ้งผลการดำเนินการและส่งมอบข้อมูลส่วนบุคคล คำขอเลขที่ ${trackingNo}`,
        html: emailHtml
      });

      res.json({ success: true, message: 'Email sent successfully' });
    } catch (err) {
      console.error('Deliver Error:', err);
      res.status(500).json({ success: false, message: err.message || 'Delivery failed' });
    }
  });

  // DELETE /api/requests/:id/tasks/:taskId/files/:fileId (Soft Delete file)
  router.delete('/requests/:id/tasks/:taskId/files/:fileId', authenticateJWT, requireRole(['admin', 'owner', 'superadmin']), async (req, res) => {
    try {
      const { id, taskId, fileId } = req.params;
      
      // Update is_deleted to true
      const { rowCount } = await dbPool.query(
        `UPDATE task_files SET is_deleted = true WHERE id = $1 AND request_id = $2 AND task_id = $3`,
        [fileId, id, taskId]
      );

      if (rowCount === 0) {
        return res.status(404).json({ success: false, message: 'File not found' });
      }

      // Log to audit_logs
      await dbPool.query(
        `INSERT INTO audit_logs (id, org_id, actor_id, actor_name, actor_role, action, request_id, details) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [`log_${Date.now()}`, req.user.orgId, req.user.id || req.user.username, req.user.fullNameTh || req.user.username, req.user.role, 'DELETE_DATA_DISCOVERY_FILE', id, `ลบไฟล์ ${fileId} ของภารกิจ ${taskId}`]
      );
      
      res.json({ success: true });
    } catch (err) {
      console.error('Delete File Error:', err);
      res.status(500).json({ success: false, message: err.message || 'Delete failed' });
    }
  });

  // GET /api/requests/:id/tasks/:taskId/files/:fileId (Secure file download)
  router.get('/requests/:id/tasks/:taskId/files/:fileId', authenticateJWT, requireRole(['admin', 'owner', 'dpo', 'superadmin', 'approver', 'intake']), async (req, res) => {
    try {
      const { id, taskId, fileId } = req.params;
      
      let query = `SELECT filename, file_data FROM task_files WHERE id = $1 AND request_id = $2 AND task_id = $3`;
      // If not superadmin, ensure file is not deleted
      if (req.user.role !== 'superadmin') {
        query += ` AND (is_deleted = false OR is_deleted IS NULL)`;
      }
      
      const { rows } = await dbPool.query(query, [fileId, id, taskId]);
      
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'File not found' });
      }

      // Log to audit_logs for secure export
      await dbPool.query(
        `INSERT INTO audit_logs (id, org_id, actor_id, actor_name, actor_role, action, request_id, details) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [`log_${Date.now()}`, req.user.orgId, req.user.id || req.user.username, req.user.fullNameTh || req.user.username, req.user.role, 'EXPORT_DATA_DISCOVERY_FILE', id, `ดาวน์โหลดไฟล์ ${rows[0].filename} ของภารกิจ ${taskId}`]
      );
      
      res.json({ success: true, filename: rows[0].filename, fileData: rows[0].file_data });
    } catch (err) {
      console.error('Download Error:', err);
      res.status(500).json({ success: false, message: 'Download failed' });
    }
  });

  // GET /api/requests (List requests - protected)
  router.get('/requests', authenticateJWT, async (req, res) => {
    try {
      let query = 'SELECT data FROM requests ORDER BY created_at DESC';
      let params = [];
      
      if (!req.user.isSuperAdmin) {
        query = 'SELECT data FROM requests WHERE org_id = $1 ORDER BY created_at DESC';
        params = [req.user.orgId];
      }
      
      const { rows } = await dbPool.query(query, params);
      const userRole = req.user?.role || 'auditor';

      // ── Field-Level Permissions (ERPNext-inspired) ────────────────────────
      // Mask sensitive PII fields based on the requesting user's role
      const sanitizedRequests = applyFieldPermissionsToList(rows.map(r => r.data), userRole);

      res.json({ success: true, requests: sanitizedRequests });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Database error' });
    }
  });

  // GET /api/sla/report (SLA analytics dashboard report with Dual Scope)
  router.get('/sla/report', authenticateJWT, async (req, res) => {
    try {
      let query = 'SELECT data FROM requests';
      let params = [];
      if (!req.user.isSuperAdmin) {
        query = 'SELECT data FROM requests WHERE org_id = $1';
        params = [req.user.orgId];
      }
      const { rows } = await dbPool.query(query, params);
      const requests = rows.map(r => r.data || {});
      const report = calculateOrgSLAReport(requests);
      res.json({ success: true, report });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error generating SLA report' });
    }
  });

  // ── Partial Loading API (ERPNext DocType Sub-document pattern) ────────────
  // These endpoints return lightweight sub-sections of a request
  // so the list view / timeline view doesn't need to load the full JSONB

  // GET /api/requests/:id/header — metadata only (no tasks, no redactions)
  router.get('/requests/:id/header', authenticateJWT, async (req, res) => {
    try {
      const { id } = req.params;
      const queryStr = req.user.isSuperAdmin
        ? 'SELECT data FROM requests WHERE id = $1'
        : 'SELECT data FROM requests WHERE id = $1 AND org_id = $2';
      const params = req.user.isSuperAdmin ? [id] : [id, req.user.orgId];
      const { rows } = await dbPool.query(queryStr, params);
      if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });

      const data = rows[0].data || {};
      const userRole = req.user?.role || 'auditor';

      // Return only header fields — omit heavy arrays
      const header = applyFieldPermissions({
        id: data.id, uuid: data.uuid, orgId: data.orgId,
        trackingNo: data.trackingNo, status: data.status,
        submissionDate: data.submissionDate, receivedDate: data.receivedDate,
        slaStartDate: data.slaStartDate, slaDeadlineDate: data.slaDeadlineDate,
        slaRemainingDays: data.slaRemainingDays, slaDaysUsed: data.slaDaysUsed,
        slaPaused: data.slaPaused, slaExtended: data.slaExtended, legalHold: data.legalHold,
        requesterType: data.requesterType, requester: data.requester,
        representative: data.representative, contactChannel: data.contactChannel,
        requestDetails: data.requestDetails, identityVerification: data.identityVerification,
      }, userRole);

      res.json({ success: true, header });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Database error' });
    }
  });

  // GET /api/requests/:id/tasks — data collection tasks only
  router.get('/requests/:id/tasks', authenticateJWT, async (req, res) => {
    try {
      const { id } = req.params;
      const queryStr = req.user.isSuperAdmin
        ? "SELECT data->'dataCollectionTasks' as tasks FROM requests WHERE id = $1"
        : "SELECT data->'dataCollectionTasks' as tasks FROM requests WHERE id = $1 AND org_id = $2";
      const params = req.user.isSuperAdmin ? [id] : [id, req.user.orgId];
      const { rows } = await dbPool.query(queryStr, params);
      if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, tasks: rows[0].tasks || [] });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Database error' });
    }
  });

  // GET /api/requests/:id/timeline — status history + SLA events only
  router.get('/requests/:id/timeline', authenticateJWT, async (req, res) => {
    try {
      const { id } = req.params;
      const queryStr = req.user.isSuperAdmin
        ? "SELECT data->'statusHistory' as history, data->'slaEvents' as sla_events FROM requests WHERE id = $1"
        : "SELECT data->'statusHistory' as history, data->'slaEvents' as sla_events FROM requests WHERE id = $1 AND org_id = $2";
      const params = req.user.isSuperAdmin ? [id] : [id, req.user.orgId];
      const { rows } = await dbPool.query(queryStr, params);
      if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, statusHistory: rows[0].history || [], slaEvents: rows[0].sla_events || [] });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Database error' });
    }
  });

  // GET /api/requests/:id/decision — decision + redaction records only
  router.get('/requests/:id/decision', authenticateJWT, requireRole(['admin', 'dpo', 'approver', 'superadmin']), async (req, res) => {
    try {
      const { id } = req.params;
      const queryStr = req.user.isSuperAdmin
        ? "SELECT data->'decision' as decision, data->'redactionRecords' as redactions FROM requests WHERE id = $1"
        : "SELECT data->'decision' as decision, data->'redactionRecords' as redactions FROM requests WHERE id = $1 AND org_id = $2";
      const params = req.user.isSuperAdmin ? [id] : [id, req.user.orgId];
      const { rows } = await dbPool.query(queryStr, params);
      if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, decision: rows[0].decision || null, redactionRecords: rows[0].redactions || [] });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Database error' });
    }
  });

  // GET /api/audit-logs (View audit logs - protected)
  router.get('/audit-logs', authenticateJWT, requireRole(['superadmin', 'owner', 'admin', 'intake', 'dpo', 'approver', 'auditor']), async (req, res) => {
    try {
      let query = 'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500';
      let params = [];
      
      // Non-superadmins only see logs for their org
      if (!req.user.isSuperAdmin) {
        query = 'SELECT * FROM audit_logs WHERE org_id = $1 ORDER BY timestamp DESC LIMIT 500';
        params = [req.user.orgId];
      }
      
      const { rows } = await dbPool.query(query, params);
      
      // Map db columns back to camelCase for frontend
      const mappedLogs = rows.map(r => ({
        id: r.id,
        orgId: r.org_id,
        timestamp: r.timestamp,
        actorId: r.actor_id,
        actorName: r.actor_name,
        actorRole: r.actor_role,
        action: r.action,
        requestId: r.request_id,
        requestTrackingNo: r.request_tracking_no,
        ipAddress: r.ip_address,
        userAgent: r.user_agent,
        details: r.details,
        checksum: r.checksum
      }));
      
      res.json({ success: true, auditLogs: mappedLogs });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error fetching audit logs' });
    }
  });


  // POST /api/requests/:id/generate-download-token
  // Staff generates a 30-day secure download token for a request
  router.post('/requests/:id/generate-download-token', authenticateJWT, async (req, res) => {
    try {
      const requestId = req.params.id;
      const { rows } = await dbPool.query('SELECT * FROM requests WHERE id = $1 OR tracking_no = $1 LIMIT 1', [requestId]);
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'Request not found' });

      const request = rows[0];
      const data = request.data || {};

      // Revoke old tokens for this request
      await dbPool.query('UPDATE download_tokens SET is_revoked = true WHERE request_id = $1', [request.id]);

      // Generate a new secure random token
      const token = crypto.randomBytes(48).toString('hex');
      
      // Calculate expiration: 30 days from approval date
      let approvedAt = new Date();
      if (data.decision && data.decision.approvedAt) {
        approvedAt = new Date(data.decision.approvedAt);
      }
      let expiresAt = new Date(approvedAt.getTime() + 30 * 24 * 60 * 60 * 1000); 
      
      // If already expired at the time of generation (which shouldn't happen usually, but just in case),
      // we still enforce the 30 days from approval rule.
      
      await dbPool.query(
        'INSERT INTO download_tokens (token, request_id, org_id, expires_at) VALUES ($1, $2, $3, $4)',
        [token, requestId, request.org_id, expiresAt]
      );

      try {
        data.downloadToken = token;
        data.downloadExpiresAt = expiresAt.toISOString();
        await dbPool.query('UPDATE requests SET data = $1 WHERE id = $2', [JSON.stringify(data), requestId]);
      } catch (e) {}

      // Build the public download URL
      const baseUrl = process.env.APP_BASE_URL || `https://pdpa.numcomputer.com`;
      const downloadUrl = `${baseUrl}/dl/${token}`;

      // Generate QR code as data URL
      const qrDataUrl = await QRCode.toDataURL(downloadUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 200,
        color: { dark: '#000000', light: '#ffffff' }
      });

      console.log(`🔑 Download token generated for request ${request.tracking_no || requestId} by ${req.user?.username}`);
      res.json({ success: true, token, downloadUrl, qrDataUrl, expiresAt });
    } catch (err) {
      console.error('Generate token error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // POST /api/requests/:id/extend-download-expiration
  // Admin extends download expiration by up to 30 days, capped at 1 year from approval
  router.post('/requests/:id/extend-download-expiration', authenticateJWT, requireRole(['admin']), async (req, res) => {
    try {
      const requestId = req.params.id;
      const { rows } = await dbPool.query('SELECT * FROM requests WHERE id = $1 OR tracking_no = $1 LIMIT 1', [requestId]);
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'Request not found' });

      const request = rows[0];
      const data = request.data || {};
      
      let approvedAt = new Date();
      if (data.decision && data.decision.approvedAt) {
        approvedAt = new Date(data.decision.approvedAt);
      }
      const maxExpiration = new Date(approvedAt.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year limit
      
      // Find active token
      const tokenResult = await dbPool.query('SELECT * FROM download_tokens WHERE request_id = $1 AND is_revoked = false ORDER BY created_at DESC LIMIT 1', [request.id]);
      if (tokenResult.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'No active download token found to extend' });
      }
      const currentToken = tokenResult.rows[0];
      
      const baseDate = new Date(Math.max(new Date().getTime(), new Date(currentToken.expires_at).getTime()));
      let newExpiresAt = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000); // Add 30 days
      
      if (newExpiresAt > maxExpiration) {
        newExpiresAt = maxExpiration;
      }
      
      if (newExpiresAt <= new Date()) {
        return res.status(400).json({ success: false, message: 'Cannot extend further. Maximum 1 year limit reached.' });
      }
      
      await dbPool.query('UPDATE download_tokens SET expires_at = $1 WHERE token = $2', [newExpiresAt, currentToken.token]);
      
      try {
        data.downloadExpiresAt = newExpiresAt.toISOString();
        await dbPool.query('UPDATE requests SET data = $1 WHERE id = $2', [JSON.stringify(data), requestId]);
      } catch (e) {}
      
      // Log to audit_logs
      await dbPool.query(
        `INSERT INTO audit_logs (id, org_id, actor_id, actor_name, actor_role, action, request_id, details) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          crypto.randomUUID ? crypto.randomUUID() : `uuid-${Date.now()}`,
          request.org_id,
          req.user.id || req.user.userId,
          req.user.username || 'System',
          req.user.role || 'system',
          'EXTEND_DOWNLOAD',
          request.id,
          JSON.stringify({ oldExpiration: currentToken.expires_at, newExpiration: newExpiresAt })
        ]
      );
      
      res.json({ success: true, message: 'Expiration extended successfully', expiresAt: newExpiresAt });
    } catch (err) {
      console.error('Extend token error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  return router;
}
