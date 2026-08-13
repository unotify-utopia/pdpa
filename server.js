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
import { initDatabase } from './services/database.init.js';
initDatabase(dbPool);

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
  res.sendFile(path.join(__dirname, 'super-admin-app', 'dist', 'index.html'));
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
