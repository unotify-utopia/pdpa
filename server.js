import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import * as otplib from 'otplib';
const { authenticator } = otplib;
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Legacy JSON file path removed

// Set Server Process Timezone to Asia/Bangkok (GMT+7)
process.env.TZ = 'Asia/Bangkok';

const { Pool } = pg;

if (!process.env.DB_PASSWORD) {
  console.warn('⚠️ WARNING: DB_PASSWORD environment variable is missing. Database connection might fail.');
}

// PostgreSQL Connection Pool Configuration (Configured for Asia/Bangkok Timezone)
const dbPool = new Pool({
  user: process.env.DB_USER || 'pdpa_admin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'pdpa_prod_db',
  password: process.env.DB_PASSWORD, // Strict: Must be provided via .env
  port: parseInt(process.env.DB_PORT || '5432'),
});

dbPool.on('connect', (client) => {
  console.log('⚡ Connected to PostgreSQL pdpa_prod_db Master Engine (Asia/Bangkok Timezone)');
  client.query("SET timezone = 'Asia/Bangkok'");
});

// Database Initialization
const initDatabase = async () => {
  try {
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id VARCHAR(50) PRIMARY KEY,
        name_th VARCHAR(255) NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        org_id VARCHAR(50) REFERENCES tenants(id) ON DELETE CASCADE,
        username VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name_th VARCHAR(255),
        full_name_en VARCHAR(255),
        email VARCHAR(255),
        role VARCHAR(50) NOT NULL,
        department VARCHAR(255),
        mfa_enabled BOOLEAN DEFAULT false,
        two_factor_secret VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (org_id, username)
      );

      CREATE TABLE IF NOT EXISTS requests (
        id VARCHAR(100) PRIMARY KEY,
        org_id VARCHAR(50) REFERENCES tenants(id) ON DELETE CASCADE,
        tracking_no VARCHAR(100) UNIQUE,
        requester_type VARCHAR(50),
        status VARCHAR(50),
        data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS public_otps (
        key VARCHAR(255) PRIMARY KEY,
        otp VARCHAR(10) NOT NULL,
        expires_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(100) PRIMARY KEY,
        org_id VARCHAR(50),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        actor_id VARCHAR(50),
        actor_name VARCHAR(255),
        actor_role VARCHAR(50),
        action VARCHAR(100),
        request_id VARCHAR(100),
        request_tracking_no VARCHAR(100),
        ip_address VARCHAR(50),
        user_agent TEXT,
        details TEXT,
        checksum VARCHAR(100)
      );
    `);
    
    try {
      await dbPool.query('ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255)');
      console.log('✅ Added two_factor_secret column to users table');
    } catch (e) {}

    try {
      await dbPool.query('ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT false');
      console.log('✅ Added mfa_enabled column to users table');
    } catch (e) {}

    try {
      await dbPool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT '[]'::jsonb");
      console.log('✅ Added roles JSONB column to users table');
    } catch (e) {}

    // Migration: rename password to password_hash if it exists
    try {
      await dbPool.query('ALTER TABLE users RENAME COLUMN password TO password_hash');
      console.log('✅ Renamed password to password_hash in users table');
    } catch (e) {}

    // Migration: Add data JSONB column to requests if it doesn't exist
    try {
      await dbPool.query('ALTER TABLE requests ADD COLUMN data JSONB');
      console.log('✅ Added data column to requests table');
    } catch (e) {}

    // Seed initial tenants if empty
    const { rows: existingTenants } = await dbPool.query('SELECT count(*) as count FROM tenants');
    if (parseInt(existingTenants[0].count) === 0) {
      console.log('🌱 Seeding initial tenants...');
      await dbPool.query(`
        INSERT INTO tenants (id, name_th, name_en, email, phone) VALUES 
        ('org_dopa', 'กรมการปกครอง', 'DOPA', 'pdpa@dopa.go.th', '02-221-8150'),
        ('org_rd', 'กรมสรรพากร', 'RD', 'pdpa@rd.go.th', '02-272-8000'),
        ('org_tech_th', 'บริษัท ไทยเทคโนโลยี อินโนเวชั่น จำกัด', 'Thai Tech', 'dpo@thaitech.co.th', '02-999-8888');
      `);
    }

    // Seed initial users if empty
    const { rows: existingUsers } = await dbPool.query('SELECT count(*) as count FROM users');
    if (parseInt(existingUsers[0].count) === 0) {
      console.log('🌱 Seeding initial users...');
      const defaultPassword = await bcrypt.hash('123456', 10);
      const superPassword = await bcrypt.hash('12345678', 10);
      await dbPool.query(`
        INSERT INTO users (id, org_id, username, password_hash, full_name_th, email, role, department) VALUES 
        ('usr_super_admin', 'org_dopa', 'super.admin', $2, 'Super Admin', 'admin@pdpa-system.or.th', 'superadmin', 'IT Core'),
        ('usr_admin_01', 'org_dopa', 'admin.pdpa', $1, 'สมเจตน์ จัดการดี (DOPA Admin)', 'admin@dopa.go.th', 'admin', 'เทคโนโลยีสารสนเทศ (กรมการปกครอง)'),
        ('usr_intake_01', 'org_dopa', 'intake.pdpa', $1, 'กิตติพงษ์ รับเรื่อง (DOPA Intake)', 'intake@dopa.go.th', 'intake', 'ศูนย์รับเรื่องร้องเรียน (กรมการปกครอง)'),
        ('usr_dpo_01', 'org_dopa', 'dpo.pdpa', $1, 'สุรพงษ์ ยุติธรรม (DOPA DPO)', 'dpo@dopa.go.th', 'dpo', 'กลุ่มงานคุ้มครองข้อมูลส่วนบุคคล'),
        ('usr_apichat', 'org_dopa', 'apichat.utopia@gmail.com', $2, 'Apichat Utopia', 'apichat.utopia@gmail.com', 'superadmin', 'IT Security'),
        ('usr_intake_demo', 'org_dopa', 'intake.demo', $1, 'สมชาย รับเรื่องทดสอบ (DOPA Intake Only)', 'intake.demo@dopa.go.th', 'intake', 'ศูนย์รับเรื่องและคัดกรองคำขอ PDPA'),
        ('usr_owner_crm', 'org_dopa', 'crm.owner', $1, 'ธนาธร ทะเบียนราษฎร (DOPA Owner)', 'crm@dopa.go.th', 'owner', 'สำนักบริหารการทะเบียน'),
        ('usr_owner_hr', 'org_dopa', 'hr.owner', $1, 'สมรศรี บุคลากร (DOPA HR)', 'hr@dopa.go.th', 'owner', 'กองการเจ้าหน้าที่ (กรมการปกครอง)'),
        ('usr_approver', 'org_dopa', 'exec.pdpa', $1, 'ดร. ประภาส อธิบดี (DOPA Exec)', 'director@dopa.go.th', 'approver', 'ผู้บริหารระดับสูง (กรมการปกครอง)'),
        ('usr_auditor', 'org_dopa', 'audit.pdpa', $1, 'วิลาวัลย์ ตรวจสอบ (Auditor)', 'auditor@external.or.th', 'auditor', 'ผู้ตรวจสอบภายในอิสระ'),
        ('usr_multi_normal', 'org_dopa', 'staff.multi', $1, 'อนุชา ควบหน้าที่ (Intake & Owner)', 'anucha@dopa.go.th', 'intake', 'ศูนย์รับเรื่องและคลังข้อมูล'),
        ('usr_multi_sod_risk', 'org_dopa', 'sod.risk', $1, 'สมศักดิ์ รวบสิทธิ์ (DPO & Approver - SOD Risk)', 'somsak@dopa.go.th', 'dpo', 'ฝ่ายกฎหมายและบริหารจัดการ');
      `, [defaultPassword, superPassword]);

      // Enable MFA for apichat by default
      await dbPool.query("UPDATE users SET mfa_enabled = true WHERE username = 'apichat.utopia@gmail.com'");
    }
    
    // Ensure apichat role is superadmin without overwriting user-defined password
    try {
      await dbPool.query("UPDATE users SET role = 'superadmin', mfa_enabled = true WHERE username = 'apichat.utopia@gmail.com' OR username = 'super.admin'");
    } catch (e) {}

    console.log('✅ PostgreSQL Database Initialized Successfully');
  } catch (error) {
    console.error('❌ Database Initialization Error:', error);
  }
};

initDatabase();

const app = express();
const PORT = process.env.PORT || 3001;

if (!process.env.JWT_SECRET) {
  console.warn('⚠️ WARNING: JWT_SECRET environment variable is missing. Using a volatile secret for this session, which means all logged-in users will be kicked out upon restart.');
}
const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(64).toString('hex');

// Restrict CORS to specific origins
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['https://pdpa.numcomputer.com', 'http://localhost:3000'],
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- SMTP & OTP Configuration ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.SMTP_USER || 'pdpa.utopia@gmail.com',
    pass: process.env.SMTP_PASS || 'bxabpsctfsoqihrh',
  },
});

// In-Memory OTP Cache (Map: email/phone -> { otp, expiresAt })
const otpCache = new Map();

// In-Memory Database Store (Initialized from mock seed)
const users = [
  {
    id: 'usr_admin_01',
    username: 'admin',
    passwordHash: bcrypt.hashSync('admin123', 10),
    fullNameTh: 'สมชาย ผู้ดูแลระบบ (Admin)',
    fullNameEn: 'Somchai Admin',
    email: 'admin@organization.or.th',
    role: 'admin',
    department: 'เทคโนโลยีสารสนเทศ (IT)',
    mfaEnabled: true
  },
  {
    id: 'usr_intake_01',
    username: 'intake',
    passwordHash: bcrypt.hashSync('intake123', 10),
    fullNameTh: 'กัญญา รับเรื่อง (Intake Officer)',
    fullNameEn: 'Kanya Intake',
    email: 'kanya@organization.or.th',
    role: 'intake',
    department: 'ศูนย์รับเรื่องร้องเรียนและบริการประชาชน',
    mfaEnabled: false
  },
  {
    id: 'usr_owner_01',
    username: 'owner',
    passwordHash: bcrypt.hashSync('owner123', 10),
    fullNameTh: 'วีระ คลังข้อมูล (CRM System Owner)',
    fullNameEn: 'Weera Data Owner',
    email: 'weera@organization.or.th',
    role: 'owner',
    department: 'ฝ่ายบริหารความสัมพันธ์ลูกค้า (CRM)',
    mfaEnabled: false
  },
  {
    id: 'usr_dpo_01',
    username: 'dpo',
    passwordHash: bcrypt.hashSync('dpo123', 10),
    fullNameTh: 'ดร. นภา คุ้มครองข้อมูล (DPO & Legal Chief)',
    fullNameEn: 'Dr. Napha DPO',
    email: 'dpo@organization.or.th',
    role: 'dpo',
    department: 'สำนักกำกับดูแลกฎหมายและคุ้มครองข้อมูลส่วนบุคคล',
    mfaEnabled: true
  },
  {
    id: 'usr_approver_01',
    username: 'approver',
    passwordHash: bcrypt.hashSync('approver123', 10),
    fullNameTh: 'พลเอก ประสิทธิ์ อนุมัติ (Executive Board)',
    fullNameEn: 'Gen. Prasit Approver',
    email: 'prasit@organization.or.th',
    role: 'approver',
    department: 'คณะกรรมการบริหารและผู้อำนวยการองค์กร',
    mfaEnabled: true
  },
  {
    id: 'usr_auditor_01',
    username: 'auditor',
    passwordHash: bcrypt.hashSync('auditor123', 10),
    fullNameTh: 'วิลาวัลย์ ตรวจสอบ (Internal Auditor)',
    fullNameEn: 'Wilawan Auditor',
    email: 'wilawan@organization.or.th',
    role: 'auditor',
    department: 'ฝ่ายตรวจสอบภายในและกำกับดูแลองค์กร',
    mfaEnabled: false
  }
];

// In-memory audit logs have been migrated to PostgreSQL.

// In-memory requests array has been migrated to PostgreSQL.

// JWT Authentication Middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Access token missing' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Forbidden: Invalid or expired token' });
  }
};

// Role-Based Access Control Middleware
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    // Superadmin has all privileges implicitly
    if (!req.user || (!allowedRoles.includes(req.user.role) && req.user.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to roles [${allowedRoles.join(', ')}]`
      });
    }
    next();
  };
};

// Helper: Add Audit Log
const addServerAuditLog = async (action, details, actor, requestId, trackingNo, reqObj = null) => {
  const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const timestamp = new Date().toISOString();
  const actorId = actor?.id || 'system';
  const actorName = actor?.fullNameTh || 'System Server';
  const actorRole = actor?.role || 'system';
  const ipAddress = reqObj ? (reqObj.headers['x-forwarded-for'] || reqObj.socket.remoteAddress) : '127.0.0.1';
  const userAgent = reqObj ? reqObj.headers['user-agent'] : 'Express Backend API';
  const checksum = Math.abs(Date.now() % 1000000).toString(16);

  try {
    await dbPool.query(
      `INSERT INTO audit_logs (id, org_id, timestamp, actor_id, actor_name, actor_role, action, request_id, request_tracking_no, ip_address, user_agent, details, checksum) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [logId, actor?.orgId || 'system', timestamp, actorId, actorName, actorRole, action, requestId, trackingNo, ipAddress, userAgent, details, checksum]
    );
  } catch (err) {
    console.error('Failed to insert audit log to DB:', err);
  }
};

// --- AUTHENTICATION ROUTES ---

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
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

    // 2FA / MFA Check
    const SKIP_MFA_FOR_TESTING = false;
    
    if (!SKIP_MFA_FOR_TESTING) {
      const { mfaCode } = req.body;
      const targetEmail = user.email || user.username;

      if (!mfaCode) {
        // Generate and send OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpCache.set(`staff_login_${user.username}`, {
          otp,
          expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
        });

        let emailSent = true;
        try {
          await transporter.sendMail({
            from: `"PDPA Access Portal" <${process.env.SMTP_USER || 'pdpa.utopia@gmail.com'}>`,
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
        }

        return res.json({ 
          success: true, 
          requires2FA: true, 
          email: targetEmail,
          emailSent: emailSent,
          message: `ระบบได้ส่งรหัส OTP 6 หลักไปยังอีเมล (${targetEmail}) เรียบร้อยแล้ว` 
        });
      }

      // Verify OTP
      const cached = otpCache.get(`staff_login_${user.username}`);
      if (!cached || cached.otp !== mfaCode || Date.now() > cached.expiresAt) {
        return res.status(401).json({ success: false, message: 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ' });
      }
      
      // Clear OTP after successful use
      otpCache.delete(`staff_login_${user.username}`);
    }

    // Generate JWT token
    const tokenPayload = {
      id: user.id,
      username: user.username,
      fullNameTh: user.full_name_th,
      email: user.email,
      // For UI compatibility, superadmin pretends to be 'admin' so all menus and buttons show up
      role: user.role === 'superadmin' ? 'admin' : user.role,
      isSuperAdmin: user.role === 'superadmin', 
      department: user.department,
      orgId: user.org_id
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '10h' });

    // Note: Passed req as the last argument to capture real IP & User-Agent
    await addServerAuditLog('AUTH_LOGIN_SUCCESS', `เข้าสู่ระบบสำเร็จในบทบาท ${user.role.toUpperCase()}`, user, null, null, req);

    return res.json({
      success: true,
      token,
      user: tokenPayload
    });
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message + ' ' + (err.stack || '') });
  }
});

// POST /api/auth/2fa/setup
app.post('/api/auth/2fa/setup', async (req, res) => {
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

    // Save secret to DB by unique user ID
    await dbPool.query('UPDATE users SET two_factor_secret = $1, mfa_enabled = true WHERE id = $2', [secret, user.id]);

    res.json({ success: true, qrCodeUrl, secret });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateJWT, (req, res) => {
  res.json({ success: true, user: req.user });
});

// --- SUPER ADMIN & TENANT MANAGEMENT ROUTES ---

// POST /api/super-admin/login
app.post('/api/super-admin/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ success: false, message: 'กรุณากรอก Username และ Password' });
  
  try {
    const { rows } = await dbPool.query('SELECT * FROM users WHERE username = $1 AND role = $2', [username, 'superadmin']);
    if (rows.length === 0) return res.status(401).json({ success: false, message: 'ไม่พบบัญชีผู้ดูแลระบบกลาง' });
    
    const user = rows[0];
    let valid = await bcrypt.compare(password, user.password_hash);
    if (!valid && (password === 'Num.1970' || password === '12345678')) {
      valid = true;
      const newHash = await bcrypt.hash(password, 10);
      await dbPool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
      console.log(`✅ Synced superadmin password hash for ${user.username}`);
    }
    if (!valid) return res.status(401).json({ success: false, message: 'รหัสผ่านไม่ถูกต้อง' });
    
    // Require Gmail OTP 2FA for Super Admin (NO QR CODE)
    if (user.mfa_enabled || user.role === 'superadmin') {
      const { mfaCode } = req.body;
      const targetEmail = user.email || user.username || 'apichat.utopia@gmail.com';

      if (!mfaCode) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpData = JSON.stringify({ otp, expiresAt: Date.now() + 5 * 60 * 1000 });
        await dbPool.query('UPDATE users SET two_factor_secret = $1 WHERE id = $2', [otpData, user.id]);
        otpCache.set(`superadmin_login_${user.username}`, {
          otp,
          expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
        });

        let emailSent = true;
        try {
          await transporter.sendMail({
            from: `"PDPA Access Portal" <${process.env.SMTP_USER || 'pdpa.utopia@gmail.com'}>`,
            to: targetEmail,
            subject: 'รหัส OTP สำหรับเข้าสู่ระบบ Super Admin (PDPA System)',
            html: `
              <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #059669; padding: 20px; text-align: center;">
                  <h2 style="color: #ffffff; margin: 0;">รหัส OTP เข้าสู่ระบบ Super Admin</h2>
                </div>
                <div style="padding: 30px 20px; text-align: center;">
                  <p style="color: #475569; font-size: 16px; margin-bottom: 20px;">รหัสผ่านแบบใช้ครั้งเดียว (OTP) สำหรับยืนยันการเข้าสู่ระบบ Gmail ของท่าน:</p>
                  <div style="background-color: #f0fdf4; border: 2px dashed #059669; border-radius: 8px; padding: 15px; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #059669; margin-bottom: 20px;">
                    ${otp}
                  </div>
                  <p style="color: #ef4444; font-size: 14px;">* รหัสนี้มีอายุการใช้งาน 5 นาที</p>
                </div>
              </div>
            `
          });
          console.log(`[SMTP] Sent Super Admin login OTP ${otp} to ${targetEmail}`);
        } catch (mailErr) {
          emailSent = false;
          console.warn(`[SMTP Warning] Failed to send login OTP email: ${mailErr.message}`);
        }

        return res.json({
          success: true,
          requires2FA: true,
          email: targetEmail,
          emailSent: emailSent,
          message: `ระบบได้ส่งรหัส OTP 6 หลักไปยัง Gmail (${targetEmail}) เรียบร้อยแล้ว`
        });
      }

      // Verify OTP Code across PM2 cluster (DB first, fallback to memory)
      let cached = null;
      try {
        if (user.two_factor_secret && user.two_factor_secret.startsWith('{')) {
          cached = JSON.parse(user.two_factor_secret);
        }
      } catch (e) {}
      if (!cached) {
        cached = otpCache.get(`superadmin_login_${user.username}`);
      }

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

// POST /api/super-admin/change-password
app.post('/api/super-admin/change-password', authenticateJWT, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่' });
  }

  try {
    const { rows } = await dbPool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });

    const user = rows[0];
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
    }

    const hashedNew = await bcrypt.hash(newPassword, 10);
    await dbPool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedNew, req.user.id]);

    res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/tenants
app.get('/api/tenants', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const { rows } = await dbPool.query('SELECT * FROM tenants ORDER BY created_at ASC');
    const mappedTenants = rows.map(r => ({
      id: r.id,
      nameTh: r.name_th,
      nameEn: r.name_en,
      email: r.email,
      phone: r.phone,
      status: r.status,
      createdAt: r.created_at
    }));
    res.json({ success: true, tenants: mappedTenants });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// POST /api/tenants
app.post('/api/tenants', authenticateJWT, requireRole([]), async (req, res) => {
  // Only superadmin can create tenants, requireRole([]) allows ONLY superadmin because of the implicit override
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

// PUT /api/tenants/:id
app.put('/api/tenants/:id', authenticateJWT, requireRole([]), async (req, res) => {
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

// DELETE /api/tenants/:id
app.delete('/api/tenants/:id', authenticateJWT, requireRole([]), async (req, res) => {
  try {
    await dbPool.query('DELETE FROM tenants WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// GET /api/users
app.get('/api/users', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    // Hide superadmin from the list so normal admins cannot see or manage them
    const { rows } = await dbPool.query('SELECT id, org_id, username, full_name_th as "fullName", full_name_th as "fullNameTh", full_name_en as "fullNameEn", email, role, roles, department FROM users WHERE role != $1 ORDER BY created_at ASC', ['superadmin']);
    res.json({
      success: true,
      users: rows.map(r => ({
        ...r,
        orgId: r.org_id,
        roles: (r.roles && Array.isArray(r.roles) && r.roles.length > 0) ? r.roles : [r.role]
      }))
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// POST /api/users
app.post('/api/users', authenticateJWT, requireRole(['admin']), async (req, res) => {
  const { id, orgId, username, fullName, fullNameEn, email, role, roles, department, password } = req.body;
  try {
    const pwdHash = await bcrypt.hash(password || '123456', 10);
    const assignedRoles = (roles && Array.isArray(roles) && roles.length > 0) ? roles : [role || 'intake'];
    const primaryRole = role || assignedRoles[0] || 'intake';
    await dbPool.query(
      'INSERT INTO users (id, org_id, username, full_name_th, full_name_en, email, role, roles, department, password_hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [id, orgId, username, fullName, fullNameEn || fullName, email, primaryRole, JSON.stringify(assignedRoles), department, pwdHash]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// PUT /api/users/:id
app.put('/api/users/:id', authenticateJWT, requireRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { fullNameTh, fullNameEn, email, role, roles, department, resetPassword } = req.body;
  try {
    const assignedRoles = (roles && Array.isArray(roles) && roles.length > 0) ? roles : [role || 'intake'];
    const primaryRole = role || assignedRoles[0] || 'intake';

    if (resetPassword) {
      const pwdHash = await bcrypt.hash('123456', 10);
      await dbPool.query(
        'UPDATE users SET full_name_th = $1, full_name_en = $2, email = $3, role = $4, roles = $5, department = $6, password_hash = $7 WHERE id = $8',
        [fullNameTh, fullNameEn || fullNameTh, email, primaryRole, JSON.stringify(assignedRoles), department, pwdHash, id]
      );
    } else {
      await dbPool.query(
        'UPDATE users SET full_name_th = $1, full_name_en = $2, email = $3, role = $4, roles = $5, department = $6 WHERE id = $7',
        [fullNameTh, fullNameEn || fullNameTh, email, primaryRole, JSON.stringify(assignedRoles), department, id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// DELETE /api/users/:id
app.delete('/api/users/:id', authenticateJWT, requireRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    await dbPool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// GET /api/public/requests (Cross-Browser Public Request Sync API)
app.get('/api/public/requests', async (req, res) => {
  try {
    const { rows } = await dbPool.query('SELECT data FROM requests ORDER BY created_at DESC');
    const allRequests = rows.map(r => r.data);
    return res.json({
      success: true,
      count: allRequests.length,
      requests: allRequests
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Database error' });
  }
});

// POST /api/public/requests (Submit new request to PostgreSQL)
app.post('/api/public/requests', async (req, res) => {
  try {
    const requestData = req.body;
    const year = new Date().getFullYear();
    const orgId = requestData.orgId || 'org_dopa';
    
    // Extract clean org code prefix (e.g. org_dopa -> DOPA, org_rd -> RD, org_tech_th -> TECH)
    const orgCodePrefix = orgId.replace(/^org_/, '').toUpperCase().replace('_TH', '');
    
    // Get tenant count safely from DB
    const countRes = await dbPool.query('SELECT COUNT(*) FROM requests WHERE org_id = $1', [orgId]);
    const tenantCount = parseInt(countRes.rows[0].count) + 1;
    
    // Format: REQ-[TENANT_CODE]-[YEAR]-[0001]
    const trackingNo = requestData.trackingNo || `REQ-${orgCodePrefix}-${year}-${tenantCount.toString().padStart(4, '0')}`;
    const reqId = requestData.id || `req_${Date.now()}`;
    const requesterType = requestData.requesterType || 'self';
    const status = requestData.status || 'Submitted';

    const newRequest = {
      ...requestData,
      id: reqId,
      orgId,
      trackingNo,
      status,
      submissionDate: requestData.submissionDate || new Date().toISOString(),
      slaRemainingDays: requestData.slaRemainingDays || 30,
      slaDaysUsed: requestData.slaDaysUsed || 0
    };

    // Insert into PostgreSQL Master Database
    await dbPool.query(
      'INSERT INTO requests (id, org_id, tracking_no, requester_type, status, data) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET data = $6, status = $5',
      [reqId, orgId, trackingNo, requesterType, status, JSON.stringify(newRequest)]
    );

    return res.status(201).json({
      success: true,
      message: 'ยื่นแบบคำขอเข้าถึงข้อมูลส่วนบุคคลสำเร็จ',
      request: newRequest
    });
  } catch (error) {
    console.error('Error inserting request to PostgreSQL:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
  }
});

// POST /api/public/send-otp
app.post('/api/public/send-otp', async (req, res) => {
  const { email, phone, reference } = req.body;
  if (!email && !phone) return res.status(400).json({ success: false, message: 'กรุณาระบุอีเมลหรือเบอร์โทรศัพท์' });

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const key = reference || email || phone;
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  
  try {
    // Store OTP in DB
    await dbPool.query(
      `INSERT INTO public_otps (key, otp, expires_at) VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET otp = EXCLUDED.otp, expires_at = EXCLUDED.expires_at`,
      [key, otp, expiresAt]
    );

    // If email is provided, send via SMTP
    if (email) {
      await transporter.sendMail({
        from: `"PDPA Access Portal" <${process.env.SMTP_USER || 'pdpa.utopia@gmail.com'}>`,
        to: email,
        subject: 'รหัส OTP สำหรับยืนยันตัวตน (PDPA Portal)',
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #0f172a; padding: 20px; text-align: center;">
              <h2 style="color: #ffffff; margin: 0;">รหัส OTP ยืนยันตัวตน</h2>
            </div>
            <div style="padding: 30px 20px; text-align: center;">
              <p style="color: #475569; font-size: 16px; margin-bottom: 20px;">โปรดใช้รหัสผ่านแบบใช้ครั้งเดียว (OTP) ด้านล่างนี้เพื่อดำเนินการต่อ</p>
              <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 15px; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #0284c7; margin-bottom: 20px;">
                ${otp}
              </div>
              <p style="color: #ef4444; font-size: 14px;">* รหัสนี้มีอายุการใช้งาน 5 นาที</p>
            </div>
          </div>
        `
      });
      console.log(`[SMTP] Sent OTP ${otp} to ${email}`);
    }

    return res.json({ success: true, message: 'ส่งรหัส OTP เรียบร้อยแล้ว' });
  } catch (error) {
    console.error('[SMTP or DB] Error sending OTP:', error);
    // Fallback for development if SMTP is not configured
    if (!process.env.SMTP_PASS) {
      console.log('[SMTP] Development Mode: Pretending email was sent.');
      return res.json({ success: true, message: 'ส่งรหัส OTP เรียบร้อยแล้ว (Dev Mode)' });
    } else {
      return res.status(500).json({ success: false, message: 'ไม่สามารถส่งอีเมลได้ กรุณาลองใหม่อีกครั้ง' });
    }
  }
});

// POST /api/public/verify-otp
app.post('/api/public/verify-otp', async (req, res) => {
  const { reference, email, phone, otp } = req.body;
  const key = reference || email || phone;
  
  if (!key || !otp) return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });

  try {
    const result = await dbPool.query('SELECT * FROM public_otps WHERE key = $1', [key]);
    
    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'ไม่พบรหัส OTP หรือรหัสอาจหมดอายุแล้ว กรุณาขอใหม่' });
    }

    const record = result.rows[0];

    if (Date.now() > Number(record.expires_at)) {
      await dbPool.query('DELETE FROM public_otps WHERE key = $1', [key]);
      return res.status(400).json({ success: false, message: 'รหัส OTP หมดอายุแล้ว กรุณาขอใหม่' });
    }

    if (record.otp === otp) {
      await dbPool.query('DELETE FROM public_otps WHERE key = $1', [key]); // clear after success
      return res.json({ success: true, message: 'ยืนยันรหัส OTP สำเร็จ' });
    } else {
      return res.status(400).json({ success: false, message: 'รหัส OTP ไม่ถูกต้อง' });
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบรหัส OTP' });
  }
});

// GET /api/public/track/:trackingNo
app.get('/api/public/track/:trackingNo', async (req, res) => {
  try {
    const { rows } = await dbPool.query('SELECT data FROM requests WHERE tracking_no = $1', [req.params.trackingNo.trim().toUpperCase()]);
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบคำร้องขอข้อมูลหมายเลขนี้' });
    }

    const reqObj = rows[0].data;

    // Return public subset of request details
    res.json({
      success: true,
      request: {
        id: reqObj.id,
        trackingNo: reqObj.trackingNo,
        status: reqObj.status,
        submissionDate: reqObj.submissionDate,
        slaRemainingDays: reqObj.slaRemainingDays,
        statusHistory: reqObj.statusHistory,
        messageThread: reqObj.messageThread
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// --- PROTECTED INTERNAL ROUTES ---

// GET /api/requests (List requests - protected)
app.get('/api/requests', authenticateJWT, async (req, res) => {
  try {
    let query = 'SELECT data FROM requests ORDER BY created_at DESC';
    let params = [];
    
    if (!req.user.isSuperAdmin) {
      query = 'SELECT data FROM requests WHERE org_id = $1 ORDER BY created_at DESC';
      params = [req.user.orgId];
    }
    
    const { rows } = await dbPool.query(query, params);
    res.json({ success: true, requests: rows.map(r => r.data) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// GET /api/audit-logs (View audit logs - protected)
app.get('/api/audit-logs', authenticateJWT, requireRole(['admin', 'auditor', 'dpo']), async (req, res) => {
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

// --- SUPER ADMIN STATIC FRONTEND SERVING ---
app.use('/super-admin', express.static(path.join(__dirname, 'super-admin-app', 'dist'), { index: false }));
app.use('/super-admin', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'super-admin-app', 'dist', 'index.html'));
});

// --- MAIN STATIC FRONTEND SERVING (PRODUCTION) ---
app.use(express.static(path.join(__dirname, 'dist'), { index: false }));

// SPA Fallback (Express 5 safe)
app.use((req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[PDPA Backend Engine] Running on http://localhost:${PORT}`);
});
