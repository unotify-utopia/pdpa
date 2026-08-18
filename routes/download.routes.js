// routes/download.routes.js
import express from 'express';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { generateCoverLetterPdf, generateDiscoveryReportPdf } from '../services/pdf.service.js';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'พยายามร้องขอหรือยืนยัน OTP มากเกินไป กรุณารอ 15 นาที' }
});

export function createDownloadRouter(dbPool, authenticateJWT, requireRole, addServerAuditLog, sendMailFn, otpCache) {
  const router = express.Router();

  // helper resolveDownloadToken
  async function resolveDownloadToken(param) {
    if (!param) return null;
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
  
    const { rows: reqRows } = await dbPool.query(
      `SELECT id, tracking_no, data, org_id FROM requests
       WHERE tracking_no = $1 OR id = $1 LIMIT 1`,
      [param]
    );
    if (reqRows.length === 0) {
      return null;
    }
  
    const reqRow = reqRows[0];
    const newToken = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  
    await dbPool.query(
      'INSERT INTO download_tokens (token, request_id, org_id, expires_at) VALUES ($1, $2, $3, $4)',
      [newToken, reqRow.id, reqRow.org_id, expiresAt]
    );
  
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

  // POST /api/public/requests/:id/download-package
  router.post('/public/requests/:id/download-package', otpRateLimiter, async (req, res) => {
    const { id } = req.params;
    const { email, phone, otp, reference } = req.body;
    const key = reference || email || phone || id;
    
    if (!key || !otp) return res.status(400).json({ success: false, message: 'Missing parameters' });
  
    console.log(`[DOWNLOAD-PACKAGE] Verifying OTP. key=${key}, otp=${otp}, reference=${reference}`);
  
    try {
      // 1. Verify OTP
      const otpResult = await dbPool.query('SELECT * FROM public_otps WHERE key = $1', [key]);
      if (otpResult.rows.length === 0) {
        console.log(`[DOWNLOAD-PACKAGE] OTP not found for key=${key}`);
        return res.status(400).json({ success: false, message: 'OTP not found' });
      }
      const isValidOtp = await bcrypt.compare(otp, otpResult.rows[0].otp);
      if (!isValidOtp) {
        console.log(`[DOWNLOAD-PACKAGE] OTP mismatch for key=${key}`);
        return res.status(400).json({ success: false, message: 'Invalid OTP' });
      }
  
      // 2. Fetch Request Data
      const reqResult = await dbPool.query('SELECT * FROM requests WHERE id = $1', [id]);
      if (reqResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Request not found' });
      const pdpaRequest = reqResult.rows[0];
      const data = typeof pdpaRequest.data === 'string' ? JSON.parse(pdpaRequest.data) : pdpaRequest.data;
      
      // 2.5 Check Token Expiration
      const tokenResult = await dbPool.query('SELECT * FROM download_tokens WHERE request_id = $1 AND is_revoked = false ORDER BY created_at DESC LIMIT 1', [id]);
      if (tokenResult.rows.length > 0) {
        const tokenRow = tokenResult.rows[0];
        if (new Date(tokenRow.expires_at) < new Date()) {
          return res.status(403).json({ success: false, message: 'เอกสารหมดอายุการดาวน์โหลดแล้ว (เกิน 30 วัน) กรุณาติดต่อหน่วยงานเพื่อขอต่ออายุการดาวน์โหลด' });
        }
      }
  
      // 3. Extract active file IDs from JSON data
      const activeFileIds = [];
      if (data.dataCollectionTasks && Array.isArray(data.dataCollectionTasks)) {
        data.dataCollectionTasks.forEach(task => {
          if (task.uploadedFiles && Array.isArray(task.uploadedFiles)) {
            task.uploadedFiles.forEach(file => {
              if (!file.isDeleted && file.id) {
                activeFileIds.push(file.id);
              }
            });
          }
        });
      }
      
      let filesResult = { rows: [] };
      if (activeFileIds.length > 0) {
        // Fetch only the specific active files
        const queryParams = activeFileIds.map((_, i) => `$${i + 1}`);
        filesResult = await dbPool.query(
          `SELECT filename, file_data FROM task_files WHERE id IN (${queryParams.join(', ')})`,
          activeFileIds
        );
      }
      
      // 4. Compute SHA-256 for integrity
      const exportSummary = {
        trackingNo: data.trackingNo,
        requesterName: `${data.requester.firstName} ${data.requester.lastName}`,
        exportedAt: new Date().toISOString(),
        filesCount: filesResult.rows.length,
        rawData: data
      };
      const summaryStr = JSON.stringify(exportSummary, null, 2);
      const sha256Hash = crypto.createHash('sha256').update(summaryStr).digest('hex');
  
      // 5. Generate PDF Cover Letter
      const signerName = data.decision?.approverName || data.decision?.dpoName || '';
      const signerSignatureImage = data.decision?.approverSignatureImage || data.decision?.dpoSignatureImage || null;
      const pdfBuffer = await generateCoverLetterPdf(data, filesResult.rows, sha256Hash, signerName, signerSignatureImage);
      
      // 6. Build ZIP
      const { default: AdmZip } = await import('adm-zip');
      const zip = new AdmZip();
      zip.addFile(`Cover_Letter_${data.trackingNo}.pdf`, pdfBuffer);
      zip.addFile(`Request_Summary_${data.trackingNo}.json`, Buffer.from(summaryStr, 'utf8'));
      
      for (const file of filesResult.rows) {
        if (file.file_data.includes(';base64,')) {
          const base64Data = file.file_data.split(';base64,')[1];
          zip.addFile(file.filename, Buffer.from(base64Data, 'base64'));
        } else {
          zip.addFile(file.filename, Buffer.from(file.file_data, 'utf8'));
        }
      }
      
      const zipBuffer = zip.toBuffer();
      res.set('Content-Type', 'application/zip');
      res.set('Content-Disposition', `attachment; filename="PDPA_Package_${data.trackingNo}.zip"`);
      res.send(zipBuffer);
    } catch (err) {
      console.error('Download Package Error:', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดจากระบบ กรุณาลองใหม่อีกครั้ง' });
    }
  });

  // GET /api/requests/:id/preview-attachment-pdf
  router.get('/requests/:id/preview-attachment-pdf', authenticateJWT, async (req, res) => {
    try {
      const { id } = req.params;
      const { rows } = await dbPool.query('SELECT * FROM requests WHERE id = $1 OR tracking_no = $1 LIMIT 1', [id]);
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'Request not found' });
  
      const pdpaRequest = rows[0];
      if (req.user.role !== 'superadmin' && pdpaRequest.org_id !== req.user.orgId) {
        return res.status(403).json({ success: false, message: 'Forbidden: ไม่อนุญาตให้เข้าถึงข้อมูลข้ามองค์กร' });
      }
      const data = typeof pdpaRequest.data === 'string' ? JSON.parse(pdpaRequest.data) : (pdpaRequest.data || {});
  
      // Collect active file rows from task_files
      const { rows: taskFiles } = await dbPool.query(
        'SELECT filename, file_data, uploaded_by, uploaded_at FROM task_files WHERE (request_id = $1 OR request_id = $2) AND (is_deleted IS NULL OR is_deleted = false)',
        [pdpaRequest.id, pdpaRequest.tracking_no]
      );
  
      // Also check uploadedFiles inside dataCollectionTasks for completeness
      const allFilesList = [...taskFiles];
      if (data.dataCollectionTasks && Array.isArray(data.dataCollectionTasks)) {
        data.dataCollectionTasks.forEach(task => {
          if (task.uploadedFiles && Array.isArray(task.uploadedFiles)) {
            task.uploadedFiles.forEach(f => {
              if (!f.isDeleted && !allFilesList.some(tf => tf.filename === f.filename)) {
                allFilesList.push({ filename: f.filename || 'Untitled File', uploaded_by: task.assigneeName || task.systemName, created_at: f.uploadedAt || new Date() });
              }
            });
          }
        });
      }
  
      const summaryStr = JSON.stringify({ trackingNo: data.trackingNo, filesCount: allFilesList.length, generatedAt: new Date().toISOString() }, null, 2);
      const sha256Hash = crypto.createHash('sha256').update(summaryStr).digest('hex');
  
      const isCompleted = ['Ready for Delivery', 'Delivered', 'Receipt Confirmed', 'Closed'].includes(pdpaRequest.status) || !!data.decision?.approvedAt;
      let signerName = data.decision?.approverName || data.decision?.dpoName || req.user?.username || 'เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO)';
      let signerSignatureImage = data.decision?.approverSignatureImage || data.decision?.dpoSignatureImage || null;
      
      // Fallback: If no signature is found in the request (e.g. previewing DRAFT before signing),
      // try to use the current logged-in user's signature to render the preview.
      if (!signerSignatureImage && req.user?.id) {
        try {
          const userRes = await dbPool.query('SELECT signature_image, full_name_th FROM users WHERE id = $1', [req.user.id]);
          if (userRes.rows.length > 0 && userRes.rows[0].signature_image) {
            signerSignatureImage = userRes.rows[0].signature_image;
            if (!data.decision?.approverName && !data.decision?.dpoName) {
              signerName = userRes.rows[0].full_name_th || signerName;
            }
          }
        } catch (e) {
          console.error('Failed to fetch user signature for preview', e);
        }
      }

      const pdfBuffer = await generateDiscoveryReportPdf(data, allFilesList, sha256Hash, isCompleted, signerName, signerSignatureImage);
  
      res.set('Content-Type', 'application/pdf');
      res.set('Content-Disposition', `inline; filename="PDPA_Compiled_Report_${data.trackingNo || id}.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      console.error('Preview attachment PDF error:', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดจากระบบ กรุณาลองใหม่อีกครั้ง' });
    }
  });

  // GET /api/requests/:id/download-package-admin
  router.get('/requests/:id/download-package-admin', authenticateJWT, async (req, res) => {
    try {
      const { id } = req.params;
      const { rows } = await dbPool.query('SELECT * FROM requests WHERE id = $1 OR tracking_no = $1 LIMIT 1', [id]);
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'Request not found' });
  
      const pdpaRequest = rows[0];
      if (req.user.role !== 'superadmin' && pdpaRequest.org_id !== req.user.orgId) {
        return res.status(403).json({ success: false, message: 'Forbidden: ไม่อนุญาตให้เข้าถึงข้อมูลข้ามองค์กร' });
      }
      const data = typeof pdpaRequest.data === 'string' ? JSON.parse(pdpaRequest.data) : (pdpaRequest.data || {});
  
      // Fetch active files from task_files
      const { rows: taskFiles } = await dbPool.query(
        'SELECT filename, file_data FROM task_files WHERE (request_id = $1 OR request_id = $2) AND (is_deleted IS NULL OR is_deleted = false)',
        [pdpaRequest.id, pdpaRequest.tracking_no]
      );
  
      const exportSummary = {
        trackingNo: data.trackingNo,
        requesterName: `${data.requester?.firstName || ''} ${data.requester?.lastName || ''}`.trim(),
        exportedAt: new Date().toISOString(),
        filesCount: taskFiles.length,
        rawData: data
      };
      const summaryStr = JSON.stringify(exportSummary, null, 2);
      const sha256Hash = crypto.createHash('sha256').update(summaryStr).digest('hex');
  
      // Generate Cover Letter PDF
      let signerName = data.decision?.approverName || data.decision?.dpoName || '';
      let signerSignatureImage = data.decision?.approverSignatureImage || data.decision?.dpoSignatureImage || null;

      // Fallback to current user signature if missing
      if (!signerSignatureImage && req.user?.id) {
        try {
          const userRes = await dbPool.query('SELECT signature_image, full_name_th FROM users WHERE id = $1', [req.user.id]);
          if (userRes.rows.length > 0 && userRes.rows[0].signature_image) {
            signerSignatureImage = userRes.rows[0].signature_image;
            if (!data.decision?.approverName && !data.decision?.dpoName) {
              signerName = userRes.rows[0].full_name_th || signerName;
            }
          }
        } catch (e) {
          console.error('Failed to fetch user signature for admin package', e);
        }
      }

      const pdfBuffer = await generateCoverLetterPdf(data, taskFiles, sha256Hash, signerName, signerSignatureImage);
  
      const { default: AdmZip } = await import('adm-zip');
      const zip = new AdmZip();
      zip.addFile(`Cover_Letter_${data.trackingNo || id}.pdf`, pdfBuffer);
      zip.addFile(`Request_Summary_${data.trackingNo || id}.json`, Buffer.from(summaryStr, 'utf8'));
  
      for (const file of taskFiles) {
        if (file.file_data.includes(';base64,')) {
          const base64Data = file.file_data.split(';base64,')[1];
          zip.addFile(file.filename, Buffer.from(base64Data, 'base64'));
        } else {
          zip.addFile(file.filename, Buffer.from(file.file_data, 'utf8'));
        }
      }
  
      const zipBuffer = zip.toBuffer();
      res.set('Content-Type', 'application/zip');
      res.set('Content-Disposition', `attachment; filename="PDPA_Package_${data.trackingNo || id}.zip"`);
      res.send(zipBuffer);
    } catch (err) {
      console.error('Download package admin error:', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดจากระบบ กรุณาลองใหม่อีกครั้ง' });
    }
  });

  // GET /api/dl/info/:token
  router.get('/dl/info/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const row = await resolveDownloadToken(token);
      if (!row) return res.status(404).json({ success: false, message: 'ไม่พบลิงก์นี้ในระบบ' });
      if (row.is_revoked) return res.status(410).json({ success: false, message: 'ลิงก์นี้ถูกยกเลิกแล้ว' });
      if (new Date(row.expires_at) < new Date()) return res.status(410).json({ success: false, message: 'ลิงก์หมดอายุแล้ว (เกิน 30 วัน)' });
  
      const reqData = row.req_data || {};
      
      const actor = {
        id: `public_${reqData.requester?.email || 'unknown'}`,
        fullNameTh: `Public User (${reqData.requester?.email || 'unknown'})`,
        role: 'public',
        orgId: row.org_id
      };
      addServerAuditLog('SECURE_DOWNLOAD_PORTAL_ACCESSED', `Accessed secure download portal (token: ${token})`, actor, row.req_id, row.tracking_no, req).catch(() => {});

      res.json({
        success: true,
        trackingNo: row.tracking_no,
        requesterEmail: reqData.requester?.email || '',
        requesterName: `${reqData.requester?.firstName || ''} ${reqData.requester?.lastName || ''}`.trim(),
        expiresAt: row.expires_at,
        downloadedCount: row.downloaded_count
      });
    } catch (err) {
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดจากระบบ กรุณาลองใหม่อีกครั้ง' });
    }
  });
  
  // POST /api/dl/request-otp
  router.post('/dl/request-otp', otpRateLimiter, async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ success: false, message: 'Token required' });
  
      const row = await resolveDownloadToken(token);
      if (!row) return res.status(404).json({ success: false, message: 'ไม่พบลิงก์นี้' });
      if (row.is_revoked || new Date(row.expires_at) < new Date()) {
        return res.status(410).json({ success: false, message: 'ลิงก์หมดอายุหรือถูกยกเลิก' });
      }
  
      const reqData = row.req_data || {};
      const email = reqData.requester?.email;
      if (!email) return res.status(400).json({ success: false, message: 'ไม่พบอีเมลผู้ยื่นคำร้อง' });
  
      const actor = {
        id: `public_${email}`,
        fullNameTh: `Public User (${email})`,
        role: 'public',
        orgId: row.org_id
      };
      addServerAuditLog('SECURE_DOWNLOAD_OTP_REQUESTED', `Requested OTP for secure download (token: ${token})`, actor, row.req_id, row.tracking_no, req).catch(() => {});

      // Generate 6-digit OTP
      const otp = String(crypto.randomInt(100000, 1000000));
      const hashedOtp = await bcrypt.hash(otp, 10);
      const otpKey1 = `dl_otp:${row.request_id}`;
      const otpKey2 = `dl_otp:${token}`;
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 min
  
      await dbPool.query(
        'INSERT INTO public_otps (key, otp, expires_at) VALUES ($1, $2, $3) ON CONFLICT (key) DO UPDATE SET otp = $2, expires_at = $3',
        [otpKey1, hashedOtp, expiresAt]
      );
      if (otpKey1 !== otpKey2) {
        await dbPool.query(
          'INSERT INTO public_otps (key, otp, expires_at) VALUES ($1, $2, $3) ON CONFLICT (key) DO UPDATE SET otp = $2, expires_at = $3',
          [otpKey2, hashedOtp, expiresAt]
        );
      }
  
      // Format expiry for display
      const expiresDisplay = new Date(row.expires_at).toLocaleDateString('th-TH', {
        year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Bangkok'
      });
  
      await sendMailFn({
        to: email,
        subject: `[PDPA] รหัส OTP สำหรับดาวน์โหลดเอกสาร - ${row.tracking_no}`,
        html: `
          <div style="font-family:'Sarabun',Arial,sans-serif;max-width:520px;margin:auto;background:#f8fafc;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
            <div style="background:linear-gradient(135deg,#0284c7,#0369a1);padding:32px 24px;text-align:center">
              <div style="background:rgba(255,255,255,0.15);border-radius:50%;width:64px;height:64px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:28px">🔐</div>
              <h1 style="color:#fff;margin:0;font-size:22px">รหัส OTP ดาวน์โหลดเอกสาร</h1>
              <p style="color:#bae6fd;margin:8px 0 0;font-size:14px">Secure Document Download OTP</p>
            </div>
            <div style="padding:32px 24px">
              <p style="color:#334155;font-size:16px">เรียน คุณ ${reqData.requester?.firstName || 'ผู้ยื่นคำขอ'},</p>
              <p style="color:#64748b;font-size:14px;line-height:1.6">คุณได้ร้องขอ OTP เพื่อดาวน์โหลดเอกสารสำหรับ<br><strong>เลขที่คำขอ: ${row.tracking_no}</strong></p>
              <div style="background:#fff;border:2px solid #e2e8f0;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
                <p style="color:#64748b;font-size:13px;margin:0 0 8px">รหัส OTP ของคุณ (มีอายุ 10 นาที)</p>
                <div style="font-size:42px;font-weight:700;font-family:monospace;letter-spacing:0.3em;color:#0284c7;background:#f0f9ff;border-radius:8px;padding:16px">${otp}</div>
              </div>
              <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:12px 16px;margin-bottom:16px">
                <p style="margin:0;color:#854d0e;font-size:13px">⚠️ ลิงก์ดาวน์โหลดนี้จะหมดอายุวันที่ <strong>${expiresDisplay}</strong><br>กรุณาอย่าแชร์รหัสนี้ให้ผู้อื่น</p>
              </div>
              <p style="color:#94a3b8;font-size:12px">หากคุณไม่ได้ร้องขอ กรุณาเพิกเฉยต่ออีเมลนี้</p>
            </div>
            <div style="background:#f1f5f9;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0">
              <p style="color:#94a3b8;font-size:12px;margin:0">PDPA Secure Document System &copy; 2026</p>
            </div>
          </div>
        `
      });
  
      const maskedEmail = email.replace(/(.)(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 6)) + c);
      console.log(`📧 Download OTP sent to ${maskedEmail} for token ${token.substring(0, 8)}...`);
      res.json({ success: true, maskedEmail });
    } catch (err) {
      console.error('DL OTP request error:', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดจากระบบ กรุณาลองใหม่อีกครั้ง' });
    }
  });
  
  // POST /api/dl/verify-otp
  router.post('/dl/verify-otp', otpRateLimiter, async (req, res) => {
    try {
      const { token, otp } = req.body;
      if (!token || !otp) return res.status(400).json({ success: false, message: 'Missing params' });
  
      const row = await resolveDownloadToken(token);
      if (!row) return res.status(404).json({ success: false, message: 'ไม่พบลิงก์นี้' });
  
      const otpKey1 = `dl_otp:${row.request_id}`;
      const otpKey2 = `dl_otp:${token}`;
      const { rows: otpRows } = await dbPool.query(
        'SELECT * FROM public_otps WHERE key = $1 OR key = $2 LIMIT 1',
        [otpKey1, otpKey2]
      );
      if (otpRows.length === 0) return res.status(400).json({ success: false, message: 'ไม่พบ OTP กรุณาขอใหม่อีกครั้ง' });
      const otpRow = otpRows[0];
      
      const reqData = row.req_data || {};
      const actor = {
        id: `public_${reqData.requester?.email || 'unknown'}`,
        fullNameTh: `Public User (${reqData.requester?.email || 'unknown'})`,
        role: 'public',
        orgId: row.org_id
      };

      if (Date.now() > Number(otpRow.expires_at)) {
        addServerAuditLog('SECURE_DOWNLOAD_OTP_FAILED', `OTP expired for secure download (token: ${token})`, actor, row.req_id, row.tracking_no, req).catch(() => {});
        return res.status(400).json({ success: false, message: 'OTP หมดอายุแล้ว กรุณาขอใหม่อีกครั้ง' });
      }
      
      const isValidOtp = await bcrypt.compare(otp.trim(), otpRow.otp);
      if (!isValidOtp) {
        addServerAuditLog('SECURE_DOWNLOAD_OTP_FAILED', `Invalid OTP for secure download (token: ${token})`, actor, row.req_id, row.tracking_no, req).catch(() => {});
        return res.status(400).json({ success: false, message: 'รหัส OTP ไม่ถูกต้อง' });
      }
  
      // OTP valid — delete it (one-time use)
      await dbPool.query('DELETE FROM public_otps WHERE key = $1 OR key = $2', [otpKey1, otpKey2]);
  
      // Increment download count
      await dbPool.query(
        'UPDATE download_tokens SET downloaded_count = downloaded_count + 1 WHERE token = $1 OR request_id = $2',
        [row.token, row.request_id]
      );
  
      // Issue a short-lived (15 min) signed download session token
      const sessionToken = jwt.sign({ request_id: row.request_id, downloadToken: row.token, at: Date.now() }, process.env.JWT_SECRET || 'pdpa-secret', { expiresIn: '15m' });
      
      addServerAuditLog('SECURE_DOWNLOAD_OTP_VERIFIED', `OTP verified successfully for secure download (token: ${token})`, actor, row.req_id, row.tracking_no, req).catch(() => {});
      
      res.json({ success: true, sessionToken });
    } catch (err) {
      console.error('DL verify OTP error:', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดจากระบบ กรุณาลองใหม่อีกครั้ง' });
    }
  });
  
  // GET /api/dl/download/:token
  router.get('/dl/download/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const { session } = req.query;
      if (!session) return res.status(401).json({ success: false, message: 'Session token required' });
  
      // Verify session token
      let payload;
      try {
        payload = jwt.verify(session, process.env.JWT_SECRET || 'pdpa-secret');
      } catch {
        return res.status(401).json({ success: false, message: 'Session หมดอายุ กรุณายืนยัน OTP ใหม่' });
      }
  
      const row = await resolveDownloadToken(token);
      if (!row) return res.status(404).json({ success: false, message: 'ไม่พบ Token' });
      if (payload.request_id !== row.request_id && payload.downloadToken !== row.token && payload.downloadToken !== token) {
        return res.status(403).json({ success: false, message: 'Token mismatch' });
      }
  
      if (row.is_revoked || new Date(row.expires_at) < new Date()) {
        return res.status(410).json({ success: false, message: 'ลิงก์หมดอายุหรือถูกยกเลิก' });
      }
  
      // Collect all task_files for this request
      const { rows: files } = await dbPool.query(
        'SELECT * FROM task_files WHERE (request_id = $1 OR request_id = $2) AND (is_deleted IS NULL OR is_deleted = false)',
        [row.request_id, row.tracking_no]
      );
  
      const reqData = row.req_data || {};
      const AdmZip = (await import('adm-zip')).default;
      const zip = new AdmZip();
  
      // Add request info JSON
      const info = {
        trackingNo: row.tracking_no,
        requesterName: `${reqData.requester?.firstName || ''} ${reqData.requester?.lastName || ''}`.trim(),
        downloadedAt: new Date().toISOString(),
        tokenExpiresAt: row.expires_at,
        filesCount: files.length,
        rawData: reqData
      };
      const summaryStr = JSON.stringify(info, null, 2);
      const sha256Hash = crypto.createHash('sha256').update(summaryStr).digest('hex');
      
      zip.addFile(`Request_Summary_${row.tracking_no}.json`, Buffer.from(summaryStr, 'utf8'));
      
      // Generate and add Cover Letter PDF
      const signerName = reqData.decision?.approverName || reqData.decision?.dpoName || '';
      const signerSignatureImage = reqData.decision?.approverSignatureImage || reqData.decision?.dpoSignatureImage || null;
      const pdfBuffer = await generateCoverLetterPdf(reqData, files, sha256Hash, signerName, signerSignatureImage);
      zip.addFile(`Cover_Letter_${row.tracking_no}.pdf`, pdfBuffer);
  
      // Add each attached file
      for (const f of files) {
        try {
          if (f.file_data) {
            if (f.file_data.includes(';base64,')) {
              const base64Data = f.file_data.split(';base64,')[1];
              const buf = Buffer.from(base64Data, 'base64');
              zip.addFile(f.filename || `file_${f.id}`, buf);
            } else {
              const buf = Buffer.from(f.file_data, 'utf8');
              zip.addFile(f.filename || `file_${f.id}`, buf);
            }
          }
        } catch {}
      }
  
      const zipBuffer = zip.toBuffer();
      res.set('Content-Type', 'application/zip');
      res.set('Content-Disposition', `attachment; filename="PDPA_${row.tracking_no}.zip"`);
      res.send(zipBuffer);
  
      const actor = {
        id: `public_${reqData.requester?.email || 'unknown'}`,
        fullNameTh: `Public User (${reqData.requester?.email || 'unknown'})`,
        role: 'public',
        orgId: row.org_id
      };
      addServerAuditLog('SECURE_DOWNLOAD_COMPLETED', `Package downloaded successfully (token: ${token}, files: ${files.length})`, actor, row.request_id, row.tracking_no, req).catch(() => {});

      console.log(`⬇️ Download executed for ${row.tracking_no}, session verified`);
    } catch (err) {
      console.error('DL download error:', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดจากระบบ กรุณาลองใหม่อีกครั้ง' });
    }
  });

  return router;
}
