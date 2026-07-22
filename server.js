import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'pdpa-super-secret-jwt-key-2026';

app.use(cors());
app.use(express.json());

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

let auditLogs = [
  {
    id: 'log_seed_01',
    timestamp: new Date().toISOString(),
    actorId: 'system',
    actorName: 'System Core',
    actorRole: 'system',
    action: 'SYSTEM_BOOT',
    ipAddress: '127.0.0.1',
    userAgent: 'Node.js Backend Server Engine',
    details: 'เริ่มต้นระบบงานบริหารคำขอ PDPA Access Request Backend Service สำเร็จ',
    checksum: 'a8f9c102'
  }
];

let requests = [];

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
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to roles [${allowedRoles.join(', ')}]`
      });
    }
    next();
  };
};

// Helper: Add Audit Log
const addServerAuditLog = (action, details, actor, requestId, trackingNo) => {
  const log = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    actorId: actor?.id || 'system',
    actorName: actor?.fullNameTh || 'System Server',
    actorRole: actor?.role || 'system',
    action,
    requestId,
    requestTrackingNo: trackingNo,
    ipAddress: '127.0.0.1',
    userAgent: 'Express Backend API',
    details,
    checksum: Math.abs(Date.now() % 1000000).toString(16)
  };
  auditLogs.unshift(log);
  return log;
};

// --- AUTHENTICATION ROUTES ---

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'กรุณากรอก Username และ Password' });
  }

  const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
  }

  // Generate JWT token (expires in 10 minutes according to security policy)
  const tokenPayload = {
    id: user.id,
    username: user.username,
    fullNameTh: user.fullNameTh,
    email: user.email,
    role: user.role,
    department: user.department
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '10m' });

  addServerAuditLog('AUTH_LOGIN_SUCCESS', `เข้าสู่ระบบสำเร็จในบทบาท ${user.role.toUpperCase()}`, user);

  return res.json({
    success: true,
    token,
    user: tokenPayload
  });
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateJWT, (req, res) => {
  res.json({ success: true, user: req.user });
});

// --- PUBLIC ROUTES ---

// POST /api/public/requests (Submit new request)
app.post('/api/public/requests', (req, res) => {
  const requestData = req.body;
  const year = new Date().getFullYear();
  const trackingNo = `REQ-${year}-${(requests.length + 1).toString().padStart(4, '0')}`;
  const uuid = 'pk-' + Math.random().toString(36).substring(2, 15);

  const newRequest = {
    ...requestData,
    id: `req_${Date.now()}`,
    uuid,
    trackingNo,
    status: 'Submitted',
    submissionDate: new Date().toISOString(),
    slaRemainingDays: 30,
    slaDaysUsed: 0,
    slaPaused: false,
    slaExtended: false,
    slaEvents: [],
    statusHistory: [
      { status: 'Submitted', changedAt: new Date().toISOString(), changedBy: 'System (Public Portal)' }
    ],
    identityVerification: {
      status: 'pending',
      assuranceLevel: 'low',
      method: 'document_check'
    },
    dataCollectionTasks: [],
    redactionRecords: [],
    feeCalculation: {
      noFee: requestData.requestDetails?.deliveryMethod === 'secure_download',
      paperPages: 0,
      computerPages: 0,
      certificationsCount: 0,
      otherCosts: [],
      totalCalculated: 0,
      isApproved: false,
      paymentStatus: 'pending'
    },
    messageThread: [],
    legalHold: false
  };

  requests.push(newRequest);
  addServerAuditLog('SUBMIT_REQUEST', `ผู้รับข้อมูลยื่นคำขอใหม่แบบออนไลน์ เลขที่ ${trackingNo}`, null, newRequest.id, trackingNo);

  res.status(201).json({ success: true, request: newRequest });
});

// GET /api/public/track/:trackingNo
app.get('/api/public/track/:trackingNo', (req, res) => {
  const reqObj = requests.find((r) => r.trackingNo.toUpperCase() === req.params.trackingNo.trim().toUpperCase());
  if (!reqObj) {
    return res.status(404).json({ success: false, message: 'ไม่พบคำร้องขอข้อมูลหมายเลขนี้' });
  }

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
});

// --- PROTECTED INTERNAL ROUTES ---

// GET /api/requests (List requests - protected)
app.get('/api/requests', authenticateJWT, (req, res) => {
  res.json({ success: true, requests });
});

// GET /api/audit-logs (View audit logs - protected)
app.get('/api/audit-logs', authenticateJWT, requireRole(['admin', 'auditor', 'dpo']), (req, res) => {
  res.json({ success: true, auditLogs });
});

app.listen(PORT, () => {
  console.log(`[PDPA Backend Engine] Running on http://localhost:${PORT}`);
});
