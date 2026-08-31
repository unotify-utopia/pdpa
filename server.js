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
import rateLimit from 'express-rate-limit';
import { createAuthMiddleware } from './middleware/auth.middleware.js';
import cron from 'node-cron';
import { startBackupScheduler } from './services/backup.service.js';
import archiveLogs from './archive_logs.cjs';
import { createReportsRouter } from './routes/reports.routes.js';
import { createRequestsRouter } from './routes/requests.routes.js';
import { createSuperAdminRouter } from './routes/superadmin.routes.js';
import { createPublicRouter } from './routes/public.routes.js';
import { createDownloadRouter } from './routes/download.routes.js';
import { createRopaRouter } from './routes/ropa.routes.js';
import helmet from 'helmet';

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
import { initDatabase } from './services/database.init.js';
initDatabase(dbPool);

const app = express();
const PORT = process.env.PORT || 3001;

if (!process.env.JWT_SECRET) {
  console.warn('⚠️ WARNING: JWT_SECRET environment variable is missing. Using a volatile secret for this session, which means all logged-in users will be kicked out upon restart.');
}
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

// Restrict CORS to specific origins
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : (process.env.NODE_ENV === 'production' ? ['https://utopia.pdpa.click'] : ['https://utopia.pdpa.click', 'http://localhost:3000']),
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// [SECURITY] Helmet — sets secure HTTP response headers (VULN-10)
// Covers: X-Frame-Options, X-Content-Type-Options, Content-Security-Policy, HSTS, etc.
app.use(helmet({
  contentSecurityPolicy: {
      directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://api.qrserver.com", "blob:"],
      connectSrc: ["'self'"],
      frameSrc: ["'self'", "blob:", "data:"],
    }
  },
  crossOriginEmbedderPolicy: false,
}));

// [SECURITY] Rate Limiting (VULN-03)
// Prevents brute-force attacks on authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // max 10 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'พยายาม login มากเกินไป กรุณารอ 15 นาทีแล้วลองใหม่' },
  handler: async (req, res, next, options) => {
    try {
      const crypto = await import('crypto');
      const ipAddress = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').substring(0, 50);
      const userAgent = String(req.headers['user-agent'] || 'Express Backend API').substring(0, 255);
      const logId = `log_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const timestamp = new Date().toISOString();
      const action = 'BRUTE_FORCE_DETECTED';
      const actorId = 'system';
      const actorName = 'Security System';
      const actorRole = 'system';
      const details = `ตรวจพบการโจมตี Brute Force (พยายามล็อกอินผิดพลาดเกิน 10 ครั้งใน 15 นาที)`;
      const checksum = crypto.createHmac('sha256', process.env.JWT_SECRET || 'fallback')
          .update(`${logId}|${actorId}|${action}|${timestamp}`).digest('hex');

      await dbPool.query(
          `INSERT INTO audit_logs (id, org_id, timestamp, actor_id, actor_name, actor_role, action, ip_address, user_agent, details, checksum) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [logId, 'system', timestamp, actorId, actorName, actorRole, action, ipAddress, userAgent, details, checksum]
      ).catch(() => {});
    } catch (err) {}
    res.status(options.statusCode).send(options.message);
  }
});
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // max 5 forgot-password requests per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'ส่งคำขอรีเซ็ตรหัสผ่านมากเกินไป กรุณารอ 1 ชั่วโมง' },
});

// [SECURITY] Body size limits (VULN-08)
// Global limit 1mb — only specific endpoints get larger limits
app.use('/api/auth/signature', express.json({ limit: '5mb' }));
app.use('/api/auth/signature', express.urlencoded({ limit: '5mb', extended: true }));

// อนุญาตให้ endpoint ส่งคำร้อง/แนบไฟล์ มีขนาดใหญ่ขึ้น (20MB) เพราะมีรูปภาพบัตร/หลักฐาน
app.use('/api/public/requests', express.json({ limit: '20mb' }));
app.use('/api/public/requests', express.urlencoded({ limit: '20mb', extended: true }));
app.use('/api/requests', express.json({ limit: '20mb' }));
app.use('/api/requests', express.urlencoded({ limit: '20mb', extended: true }));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// Apply auth rate limiters
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', forgotPasswordLimiter);

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
app.use('/api', createPublicRouter(dbPool, addServerAuditLog, authenticateJWT, requireRole));
app.use('/api', createDownloadRouter(dbPool, authenticateJWT, requireRole, addServerAuditLog, sendMailWithFallback, otpCache, JWT_SECRET));
app.get('/api/system/config', (req, res) => {
  res.json({
    success: true,
    mode: process.env.SYSTEM_MODE || 'MULTI_TENANT'
  });
});

app.use('/api', createRopaRouter(dbPool, authenticateJWT, requireRole, addServerAuditLog));

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
  res.sendFile(path.join(__dirname, 'super-admin-app', 'dist', 'index.html'));
});


// ── Workflow Engine Routes (ERPNext-inspired) ──────────────────────────────────────────────
// ── Workflow Engine Routes (ERPNext-inspired) ─────────────────────────────
app.use('/api/workflow', createWorkflowRouter(dbPool, authenticateJWT, requireRole));

// --- WEBHOOKS ---
app.post('/api/webhooks/resend', async (req, res) => {
  try {
    const payload = req.body;
    
    // Resend sends { type: "email.bounced", data: { to: ["..."] } }
    if (payload && payload.type === 'email.bounced') {
      const bouncedEmail = payload.data?.to?.[0];
      console.warn(`[Webhook] Resend Alert: Email bounced to ${bouncedEmail}`);
      
      // Log to database if needed
      await addServerAuditLog('EMAIL_BOUNCED', `Delivery failed for ${bouncedEmail}`, null).catch(() => {});
    }
    
    // Always return 200 OK so Resend knows we received it
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[Webhook] Error processing Resend webhook:', err);
    res.status(500).json({ success: false });
  }
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

// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    // Log the event directly using raw query or addServerAuditLog
    // Since addServerAuditLog requires (action, details, actor), we'll do:
    addServerAuditLog('PAYLOAD_TOO_LARGE_ATTEMPT', `Attempted to upload file > 20MB. IP: ${ip}, User-Agent: ${userAgent}`, null).catch(console.error);
    
    return res.status(413).json({
      success: false,
      message: 'Payload Too Large: The file or request body exceeds the maximum allowed limit of 20MB.'
    });
  }
  // Generic unhandled error logger could go here, but we pass to default express handler
  next(err);
});



app.listen(PORT, () => {
  console.log(`🚀 PDPA Portal Server (Mode: ${process.env.SYSTEM_MODE || 'MULTI_TENANT'}) running on port ${PORT}`);
  console.log(`Timezone set to: ${process.env.TZ}`);
  
  // Start the database backup scheduler (Runs daily at 02:00 AM)
  startBackupScheduler();
  
  // Schedule the Log Archiver to run on the 1st of every month at 02:00 AM
  cron.schedule('0 2 1 * *', () => {
    console.log('[Cron] Running scheduled log archival...');
    archiveLogs();
  });
});
