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
import crypto from 'crypto';

// ── ERPNext-inspired modules ──────────────────────────────────────────────
import { createWorkflowRouter } from './routes/workflow.routes.js';
import { refreshTransitionCache } from './middleware/workflow.middleware.js';
import { seedWorkflowData } from './services/workflow.seed.js';
import { applyFieldPermissions, applyFieldPermissionsToList } from './middleware/fieldPermissions.js';
import { sendMailWithFallback, sendWorkflowNotification, workflowEmailLogs, getStatusNameTh, getTaximailSessionId } from './services/email.service.js';
import { DEFAULT_SLA_DAYS, calculateSLADate, calculateRemainingDays, updateRequestSLA, calculateOrgSLAReport } from './services/sla.service.js';
import { generateCoverLetterPdf, generateDiscoveryReportPdf } from './services/pdf.service.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createUsersRouter } from './routes/users.routes.js';
import { createAuthMiddleware } from './middleware/auth.middleware.js';
import { createReportsRouter } from './routes/reports.routes.js';
import { createRequestsRouter } from './routes/requests.routes.js';
import { createSuperAdminRouter } from './routes/superadmin.routes.js';
import { createPublicRouter } from './routes/public.routes.js';
import { createDownloadRouter } from './routes/download.routes.js';

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
});

dbPool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
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

      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS task_files (
        id VARCHAR(100) PRIMARY KEY,
        request_id VARCHAR(100),
        task_id VARCHAR(100),
        filename VARCHAR(255),
        file_data TEXT,
        uploaded_by VARCHAR(255),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS document_templates (
        id VARCHAR(100) PRIMARY KEY,
        type VARCHAR(100),
        name VARCHAR(255),
        subject VARCHAR(255),
        body TEXT,
        is_active BOOLEAN DEFAULT true,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(255)
      );

      CREATE TABLE IF NOT EXISTS download_tokens (
        token VARCHAR(128) PRIMARY KEY,
        request_id VARCHAR(100) NOT NULL,
        org_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        downloaded_count INTEGER DEFAULT 0,
        is_revoked BOOLEAN DEFAULT false
      );

      -- ── Workflow Engine Tables (ERPNext-inspired) ────────────────────────
      CREATE TABLE IF NOT EXISTS workflow_states (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(100) UNIQUE NOT NULL,
        label_th    VARCHAR(200) NOT NULL,
        label_en    VARCHAR(200) NOT NULL,
        color       VARCHAR(30)  DEFAULT 'gray',
        is_terminal BOOLEAN      DEFAULT FALSE,
        sort_order  INT          DEFAULT 0,
        created_at  TIMESTAMP    DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS workflow_transitions (
        id               SERIAL PRIMARY KEY,
        from_state       VARCHAR(100) REFERENCES workflow_states(name) ON DELETE CASCADE,
        to_state         VARCHAR(100) REFERENCES workflow_states(name) ON DELETE CASCADE,
        allowed_roles    TEXT[]       DEFAULT '{}',
        requires_comment BOOLEAN      DEFAULT FALSE,
        auto_notify      BOOLEAN      DEFAULT TRUE,
        created_at       TIMESTAMP    DEFAULT NOW()
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
      await dbPool.query('ALTER TABLE task_files ADD COLUMN is_deleted BOOLEAN DEFAULT false');
    } catch(e) {}
    
    try {
      await dbPool.query('ALTER TABLE audit_logs ADD COLUMN actor_id VARCHAR(50)');
    } catch(e) {}
    try {
      await dbPool.query('ALTER TABLE audit_logs ADD COLUMN actor_name VARCHAR(255)');
    } catch(e) {}
    try {
      await dbPool.query('ALTER TABLE audit_logs ADD COLUMN actor_role VARCHAR(50)');
    } catch(e) {}
    try {
      await dbPool.query('ALTER TABLE audit_logs ADD COLUMN org_id VARCHAR(50)');
    } catch(e) {}
    try {
      await dbPool.query('ALTER TABLE audit_logs ADD COLUMN request_id VARCHAR(100)');
    } catch(e) {}
    try {
      await dbPool.query('ALTER TABLE audit_logs ADD COLUMN request_tracking_no VARCHAR(100)');
    } catch(e) {}
    try {
      await dbPool.query('ALTER TABLE audit_logs ADD COLUMN ip_address VARCHAR(50)');
    } catch(e) {}
    try {
      await dbPool.query('ALTER TABLE audit_logs ADD COLUMN user_agent TEXT');
    } catch(e) {}
    try {
      await dbPool.query('ALTER TABLE audit_logs ADD COLUMN checksum VARCHAR(100)');
    } catch(e) {}
    
    try {
      await dbPool.query('ALTER TABLE audit_logs ALTER COLUMN performed_by DROP NOT NULL');
    } catch(e) {}
    
    // Fix: Upgrade columns to TEXT to prevent 'value too long' errors
    const colsToText = ['actor_id', 'actor_name', 'actor_role', 'org_id', 'request_id', 'request_tracking_no', 'ip_address', 'action'];
    for (const col of colsToText) {
      try {
        await dbPool.query(`ALTER TABLE audit_logs ALTER COLUMN ${col} TYPE TEXT`);
      } catch (e) {}
    }
    
    console.log('✅ Added missing columns to audit_logs');

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

    // Run migration: Update old 'Complete' status to 'Documents Verified' in both column and JSON data
    try {
      const { rows } = await dbPool.query("SELECT id, data FROM requests WHERE status = 'Complete' OR data->>'status' = 'Complete'");
      
      for (const row of rows) {
        if (row.data) {
          row.data.status = 'Documents Verified';
          if (Array.isArray(row.data.statusHistory)) {
            row.data.statusHistory.forEach(h => {
              if (h.status === 'Complete') {
                h.status = 'Documents Verified';
              }
            });
          }
          await dbPool.query("UPDATE requests SET status = 'Documents Verified', data = $1 WHERE id = $2", [row.data, row.id]);
        }
      }
      console.log('✅ Migrated Complete status to Documents Verified');
    } catch (e) {
      console.log('Migration error:', e);
    }

    // ── Seed Workflow Engine data (idempotent) ────────────────────────────
    await seedWorkflowData(dbPool);

    // ── Load workflow transition cache into memory ─────────────────────────
    await refreshTransitionCache(dbPool);

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

// ============================================================
// MODULAR ROUTES (ERPNext-inspired Strangler Fig Pattern)
// All routes have been migrated out of server.js:
//  - /api/auth            → routes/auth.routes.js
//  - /api/users           → routes/users.routes.js
//  - /api/reports         → routes/reports.routes.js
//  - /api/requests, /sla  → routes/requests.routes.js
//  - /api/super-admin     → routes/superadmin.routes.js
//  - /api/tenants         → routes/superadmin.routes.js
//  - /api/public/*        → routes/public.routes.js
//  - /api/dl/*            → routes/download.routes.js
//  - /api/workflow        → routes/workflow.routes.js
// ============================================================

// --- SMTP & OTP Configuration (Migrated to services/email.service.js) ---

// In-Memory OTP Cache (Map: email/phone -> { otp, expiresAt })
const otpCache = new Map();

// --- AUTHENTICATION, AUTHORIZATION & AUDIT LOG MIDDLEWARE ---
const { authenticateJWT, requireRole, addServerAuditLog } = createAuthMiddleware(dbPool, JWT_SECRET);

// --- MOUNT MODULAR ROUTERS (ERPNext-inspired) ---
app.use('/api/auth', createAuthRouter(dbPool, authenticateJWT, addServerAuditLog, sendMailWithFallback, JWT_SECRET));
app.use('/api/users', createUsersRouter(dbPool, authenticateJWT, requireRole));
app.use('/api/reports', createReportsRouter(dbPool, authenticateJWT, requireRole));
app.use('/api', createRequestsRouter(dbPool, authenticateJWT, requireRole, addServerAuditLog));
app.use('/api', createSuperAdminRouter(dbPool, authenticateJWT, requireRole, addServerAuditLog, sendMailWithFallback, otpCache, JWT_SECRET));
app.use('/api', createPublicRouter(dbPool, addServerAuditLog, authenticateJWT));
app.use('/api', createDownloadRouter(dbPool, authenticateJWT, sendMailWithFallback, otpCache));

// --- SUPER ADMIN, TENANTS (Migrated to routes/superadmin.routes.js) ---
// --- USER MANAGEMENT (Migrated to routes/users.routes.js) ---
// --- PUBLIC ROUTES (Migrated to routes/public.routes.js) ---
// --- USER MANAGEMENT (Migrated to routes/users.routes.js) ---

// --- PROTECTED INTERNAL ROUTES ---
// --- PROTECTED INTERNAL ROUTES ---

// --- REQUESTS ROUTES (Migrated to routes/requests.routes.js) ---

// --- SUPER ADMIN STATIC FRONTEND SERVING ---
app.use('/super-admin', express.static(path.join(__dirname, 'super-admin-app', 'dist'), { index: false }));
app.use('/super-admin', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
});


// ── Workflow Engine Routes (ERPNext-inspired) ──────────────────────────────────────────────
// ── Workflow Engine Routes (ERPNext-inspired) ─────────────────────────────
app.use('/api/workflow', createWorkflowRouter(dbPool, authenticateJWT, requireRole));

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
