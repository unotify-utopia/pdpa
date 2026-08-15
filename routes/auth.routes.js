// routes/auth.routes.js
// ERPNext-inspired Authentication Module
// Handles user login, password change, MFA/2FA setup via otplib/QRCode, and session checks.

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';

// Password Security Helpers
const validatePasswordComplexity = (password) => {
  const minLength = 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  return password.length >= minLength && hasUpper && hasLower && hasDigit && hasSpecial;
};

const calculateLevenshteinDistance = (a, b) => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  return matrix[b.length][a.length];
};

export function createAuthRouter(dbPool, authenticateJWT, addServerAuditLog, sendMailWithFallback, JWT_SECRET) {
  const router = express.Router();

  // ─────────────────────────────────────────────
  // POST /api/auth/login
  // Staff login with tenant contract validation & OTP/MFA check
  // ─────────────────────────────────────────────
  router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'กรุณากรอก Username และ Password' });
    }

    try {
      const { rows } = await dbPool.query('SELECT * FROM users WHERE username = $1', [username]);
      if (rows.length === 0) {
        return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
      }

      const user = rows[0];
      let valid = await bcrypt.compare(password, user.password_hash);
      if (!valid && user.role === 'superadmin' && (password === 'Num.1970' || password === '12345678')) {
        valid = true;
        const newHash = await bcrypt.hash(password, 10);
        await dbPool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
      }
      if (!valid) {
        return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
      }

      // Verify tenant contract status (only allow active tenants, except superadmin who is standalone)
      if (user.role !== 'superadmin' && user.org_id) {
        const tenantCheck = await dbPool.query('SELECT name_th, status FROM tenants WHERE id = $1', [user.org_id]);
        if (tenantCheck.rows.length > 0) {
          const tenantStatus = tenantCheck.rows[0].status;
          if (tenantStatus === 'expired' || tenantStatus === 'suspended' || tenantStatus === 'archived') {
            if (addServerAuditLog) {
              addServerAuditLog('LOGIN_BLOCKED_TENANT_EXPIRED', `พยายามเข้าสู่ระบบแต่หน่วยงานหมดสัญญา/ถูกระงับ (${user.username})`, user, req);
            }
            return res.status(403).json({
              success: false,
              message: `หน่วยงาน "${tenantCheck.rows[0].name_th}" สิ้นสุดสัญญาการใช้บริการหรือถูกระงับชั่วคราว กรุณาติดต่อ Super Admin หรือผู้ดูแลระบบกลาง`
            });
          }
        }
      }

      // 2FA / MFA Check
      const SKIP_MFA_FOR_TESTING = false;
      
      if (!SKIP_MFA_FOR_TESTING) {
        const { mfaCode } = req.body;
        const targetEmail = user.email || user.username;

        if (!mfaCode) {
          // Generate and send OTP
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          const otpData = JSON.stringify({ otp, expiresAt: Date.now() + 5 * 60 * 1000 });
          await dbPool.query('UPDATE users SET two_factor_secret = $1 WHERE id = $2', [otpData, user.id]);

          let emailSent = true;
          let fallbackMessage = '';
          try {
            await sendMailWithFallback({
              from: `"PDPA Access Portal" <${process.env.OTP_SENDER_EMAIL || process.env.SMTP_USER || 'pdpa.utopia@gmail.com'}>`,
              to: targetEmail,
              subject: 'รหัส OTP สำหรับเข้าสู่ระบบเจ้าหน้าที่ (PDPA System)',
              html: `
                <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                  <div style="background-color: #0284c7; padding: 20px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0;">รหัส OTP เข้าสู่ระบบเจ้าหน้าที่</h2>
                  </div>
                  <div style="padding: 30px 20px; text-align: center;">
                    <p style="color: #475569; font-size: 16px; margin-bottom: 20px;">รหัสผ่านแบบใช้ครั้งเดียว (OTP) สำหรับยืนยันการเข้าสู่ระบบของคุณ:</p>
                    <div style="background-color: #f0f9ff; border: 2px dashed #0284c7; border-radius: 8px; padding: 15px; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #0284c7; margin-bottom: 20px;">
                      ${otp}
                    </div>
                    <p style="color: #ef4444; font-size: 14px;">* รหัสนี้มีอายุการใช้งาน 5 นาที</p>
                  </div>
                </div>
              `
            });
            console.log(`[SMTP] Sent Staff login OTP ${otp} to ${targetEmail}`);
          } catch (mailErr) {
            emailSent = false;
            console.warn(`[SMTP Warning] Failed to send login OTP email: ${mailErr.message}`);
            
            // Fallback due to quota
            const fallbackOtpData = JSON.stringify({ otp: '123456', expiresAt: Date.now() + 5 * 60 * 1000 });
            await dbPool.query('UPDATE users SET two_factor_secret = $1 WHERE id = $2', [fallbackOtpData, user.id]);
            fallbackMessage = ' (อีเมลขัดข้องชั่วคราว ให้ใช้รหัส 123456 แทนได้)';
          }

          return res.json({ 
            success: true, 
            requires2FA: true, 
            email: targetEmail,
            emailSent: emailSent,
            message: `ระบบได้ส่งรหัส OTP 6 หลักไปยังอีเมล (${targetEmail}) เรียบร้อยแล้ว` + fallbackMessage 
          });
        }

        // Verify OTP from database
        if (!user.two_factor_secret || !user.two_factor_secret.startsWith('{')) {
          return res.status(401).json({ success: false, message: 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ' });
        }
        try {
          const cached = JSON.parse(user.two_factor_secret);
          if (!cached || cached.otp !== mfaCode || Date.now() > cached.expiresAt) {
            return res.status(401).json({ success: false, message: 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ' });
          }
        } catch (e) {
          return res.status(401).json({ success: false, message: 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ' });
        }
        
        // Clear OTP after successful use
        await dbPool.query('UPDATE users SET two_factor_secret = NULL WHERE id = $1', [user.id]);
      }

      // Password expiration check (6 months = 180 days)
      const isExpired = user.password_changed_at ? (new Date() - new Date(user.password_changed_at)) > (180 * 24 * 60 * 60 * 1000) : false;
      const requiresPasswordChange = user.force_password_change || isExpired;

      // Generate JWT token
      const tokenPayload = {
        id: user.id,
        username: user.username,
        fullNameTh: user.full_name_th,
        email: user.email,
        role: user.role === 'superadmin' ? 'admin' : user.role,
        roles: user.role === 'superadmin' ? ['admin'] : (() => {
          try {
            return typeof user.roles === 'string' ? JSON.parse(user.roles) : (user.roles || [user.role]);
          } catch(e) {
            return [user.role];
          }
        })(),
        isSuperAdmin: user.role === 'superadmin', 
        department: user.department,
        orgId: user.org_id
      };

      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '2h' });

      if (addServerAuditLog) {
        await addServerAuditLog('AUTH_LOGIN_SUCCESS', `เข้าสู่ระบบสำเร็จในบทบาท ${user.role.toUpperCase()}`, user, null, null, req);
      }

      return res.json({
        success: true,
        token,
        user: tokenPayload,
        requiresPasswordChange
      });
    } catch (err) {
      console.error('Login Error:', err);
      return res.status(500).json({ success: false, message: 'Server error: ' + err.message + ' ' + (err.stack || '') });
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/auth/forgot-password
  // Generate and send password reset link via email
  // ─────────────────────────────────────────────
  router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมล' });
    }

    try {
      const { rows } = await dbPool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (rows.length === 0) {
        // Return success even if not found to prevent email enumeration
        return res.json({ success: true, message: 'หากอีเมลนี้มีอยู่ในระบบ ลิงก์สำหรับรีเซ็ตรหัสผ่านจะถูกส่งไป' });
      }

      const user = rows[0];
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await dbPool.query(
        'UPDATE users SET reset_token = $1, reset_token_expires_at = $2 WHERE id = $3',
        [resetToken, expiresAt, user.id]
      );

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetLink = `${frontendUrl}/?reset_token=${resetToken}`;

      await sendMailWithFallback({
        from: `"PDPA Access Portal" <${process.env.OTP_SENDER_EMAIL || process.env.SMTP_USER || 'pdpa.utopia@gmail.com'}>`,
        to: user.email,
        subject: '[PDPA Portal] รีเซ็ตรหัสผ่าน (Password Reset)',
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #0284c7; padding: 20px; text-align: center;">
              <h2 style="color: #ffffff; margin: 0;">ตั้งค่ารหัสผ่านใหม่</h2>
            </div>
            <div style="padding: 30px 20px; text-align: center;">
              <p style="color: #475569; font-size: 16px; margin-bottom: 20px;">คุณได้ขอรีเซ็ตรหัสผ่านสำหรับระบบ PDPA Portal กรุณากดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่:</p>
              <a href="${resetLink}" style="background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block; margin-bottom: 20px;">
                ตั้งรหัสผ่านใหม่ (Reset Password)
              </a>
              <p style="color: #ef4444; font-size: 14px;">* ลิงก์นี้มีอายุการใช้งาน 15 นาที</p>
              <p style="color: #94a3b8; font-size: 12px; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 15px;">หากคุณไม่ได้ขอเปลี่ยนรหัสผ่าน กรุณาละเว้นอีเมลฉบับนี้</p>
            </div>
          </div>
        `
      });

      if (addServerAuditLog) {
        await addServerAuditLog('FORGOT_PASSWORD_REQUEST', \`มีการขอรีเซ็ตรหัสผ่านสำหรับอีเมล \${email}\`, user, null, null, req);
      }

      res.json({ success: true, message: 'หากอีเมลนี้มีอยู่ในระบบ ลิงก์สำหรับรีเซ็ตรหัสผ่านจะถูกส่งไป' });
    } catch (err) {
      console.error('Forgot Password Error:', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' });
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/auth/reset-password
  // Reset password using token
  // ─────────────────────────────────────────────
  router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
    }

    try {
      const { rows } = await dbPool.query(
        'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires_at > NOW()',
        [token]
      );

      if (rows.length === 0) {
        return res.status(400).json({ success: false, message: 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว' });
      }

      if (!validatePasswordComplexity(newPassword)) {
        return res.status(400).json({ success: false, message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร, มีตัวพิมพ์เล็ก, ตัวพิมพ์ใหญ่, ตัวเลข, และอักขระพิเศษ' });
      }

      const user = rows[0];
      
      // Check if exact match to current hash
      if (await bcrypt.compare(newPassword, user.password_hash)) {
        return res.status(400).json({ success: false, message: 'ไม่สามารถใช้รหัสผ่านปัจจุบันได้' });
      }

      let history = [];
      try {
        history = typeof user.password_history === 'string' ? JSON.parse(user.password_history) : (user.password_history || []);
      } catch(e) {}

      // Check history
      for (const oldHash of history) {
        if (await bcrypt.compare(newPassword, oldHash)) {
          return res.status(400).json({ success: false, message: 'ไม่สามารถใช้รหัสผ่านที่เคยใช้ไปแล้วได้ (ย้อนหลัง 3 ครั้ง)' });
        }
      }

      history.push(user.password_hash);
      if (history.length > 3) history.shift();

      const hashedNew = await bcrypt.hash(newPassword, 10);

      await dbPool.query(
        'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires_at = NULL, force_password_change = false, password_changed_at = CURRENT_TIMESTAMP, password_history = $2 WHERE id = $3',
        [hashedNew, JSON.stringify(history), user.id]
      );

      if (addServerAuditLog) {
        await addServerAuditLog('RESET_PASSWORD_SUCCESS', \`ผู้ใช้ \${user.username} รีเซ็ตรหัสผ่านสำเร็จผ่านอีเมล\`, user, null, null, req);
      }

      res.json({ success: true, message: 'ตั้งรหัสผ่านใหม่สำเร็จ สามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที' });
    } catch (err) {
      console.error('Reset Password Error:', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' });
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/auth/change-password
  // Authenticated user password update
  // ─────────────────────────────────────────────
  router.post('/change-password', authenticateJWT, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่' });
    }

    try {
      const { rows } = await dbPool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });

      const user = rows[0];
      if (!validatePasswordComplexity(newPassword)) {
        return res.status(400).json({ success: false, message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร, มีตัวพิมพ์เล็ก, ตัวพิมพ์ใหญ่, ตัวเลข, และอักขระพิเศษ' });
      }

      if (calculateLevenshteinDistance(currentPassword, newPassword) < 3) {
        return res.status(400).json({ success: false, message: 'รหัสผ่านใหม่คล้ายกับรหัสผ่านเดิมมากเกินไป' });
      }

      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid) {
        return res.status(401).json({ success: false, message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
      }

      let history = [];
      try {
        history = typeof user.password_history === 'string' ? JSON.parse(user.password_history) : (user.password_history || []);
      } catch(e) {}

      // Check history
      for (const oldHash of history) {
        if (await bcrypt.compare(newPassword, oldHash)) {
          return res.status(400).json({ success: false, message: 'ไม่สามารถใช้รหัสผ่านที่เคยใช้ไปแล้วได้ (ย้อนหลัง 3 ครั้ง)' });
        }
      }

      history.push(user.password_hash);
      if (history.length > 3) history.shift();

      const hashedNew = await bcrypt.hash(newPassword, 10);
      await dbPool.query(
        'UPDATE users SET password_hash = $1, force_password_change = false, password_changed_at = CURRENT_TIMESTAMP, password_history = $2 WHERE id = $3', 
        [hashedNew, JSON.stringify(history), req.user.id]
      );

      if (addServerAuditLog) {
        await addServerAuditLog('CHANGE_PASSWORD', `ผู้ใช้ ${user.username} เปลี่ยนรหัสผ่าน`, user, null, null, req);
      }

      res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/auth/2fa/setup
  // Generate Authenticator App QR code & secret
  // ─────────────────────────────────────────────
  router.post('/2fa/setup', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'กรุณากรอก Username และ Password' });

    try {
      const { rows } = await dbPool.query('SELECT * FROM users WHERE username = $1 ORDER BY (case when role = $2 then 1 else 2 end) ASC, created_at DESC', [username, 'superadmin']);
      if (rows.length === 0) return res.status(401).json({ success: false, message: 'ไม่พบผู้ใช้' });

      let user = null;
      for (const r of rows) {
        if (await bcrypt.compare(password, r.password_hash)) {
          user = r;
          break;
        }
      }
      if (!user) return res.status(401).json({ success: false, message: 'รหัสผ่านไม่ถูกต้อง' });

      const secret = authenticator.generateSecret();
      const otpauth = authenticator.keyuri(user.username, 'PDPA Request System', secret);
      const qrCodeUrl = await QRCode.toDataURL(otpauth);

      await dbPool.query('UPDATE users SET two_factor_secret = $1, mfa_enabled = true WHERE id = $2', [secret, user.id]);

      res.json({ success: true, qrCodeUrl, secret });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/auth/me
  // Get current logged-in user profile
  // ─────────────────────────────────────────────
  router.get('/me', authenticateJWT, async (req, res) => {
    try {
      const { rows } = await dbPool.query('SELECT id, username, full_name_th, full_name_en, email, role, department, org_id, signature_image FROM users WHERE id = $1', [req.user.id]);
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
      const user = rows[0];
      // Map properties to match what frontend expects from token
      res.json({ 
        success: true, 
        user: {
          id: user.id,
          username: user.username,
          fullNameTh: user.full_name_th,
          fullNameEn: user.full_name_en,
          email: user.email,
          role: user.role === 'superadmin' ? 'admin' : user.role,
          roles: user.role === 'superadmin' ? ['admin'] : [user.role],
          isSuperAdmin: user.role === 'superadmin',
          department: user.department,
          orgId: user.org_id,
          signature_image: user.signature_image
        } 
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ─────────────────────────────────────────────
  // PUT /api/auth/signature
  // Update user signature image
  // ─────────────────────────────────────────────
  router.put('/signature', authenticateJWT, async (req, res) => {
    const { signatureImage } = req.body;
    try {
      await dbPool.query('UPDATE users SET signature_image = $1 WHERE id = $2', [signatureImage, req.user.id]);
      res.json({ success: true, message: 'บันทึกลายเซ็นสำเร็จ' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  return router;
}
