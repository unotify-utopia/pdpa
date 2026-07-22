import type { Request, ComplianceConfig, DocumentTemplate, AuditLog, User, RequestStatus, SLAEvent } from './types';
import { initialComplianceConfig, initialDocumentTemplates, seedRequests, initialAuditLogs } from './mockData';


// Storage keys
const KEYS = {
  REQUESTS: 'pdpa_req_requests',
  CONFIG: 'pdpa_req_config',
  TEMPLATES: 'pdpa_req_templates',
  AUDIT_LOGS: 'pdpa_req_audit_logs',
  CURRENT_USER: 'pdpa_req_current_user',
};

// Initialize DB with seed data if not present or empty
export const initializeDB = () => {
  const existingRequests = localStorage.getItem(KEYS.REQUESTS);
  if (!existingRequests || JSON.parse(existingRequests).length < 4) {
    localStorage.setItem(KEYS.REQUESTS, JSON.stringify(seedRequests));
  }
  if (!localStorage.getItem(KEYS.CONFIG)) {
    localStorage.setItem(KEYS.CONFIG, JSON.stringify(initialComplianceConfig));
  }
  if (!localStorage.getItem(KEYS.TEMPLATES)) {
    localStorage.setItem(KEYS.TEMPLATES, JSON.stringify(initialDocumentTemplates));
  }
  if (!localStorage.getItem(KEYS.AUDIT_LOGS)) {
    localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(initialAuditLogs));
  }
  if (!localStorage.getItem(KEYS.CURRENT_USER)) {
    // Initial state is unauthenticated (Clean Public Portal)
    localStorage.removeItem(KEYS.CURRENT_USER);
  }
};

// Helper: Calculate simple hash checksum
const generateChecksum = (data: string): string => {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
};

// Core DB Accessors
export const getRequests = (): Request[] => {
  initializeDB();
  const raw = localStorage.getItem(KEYS.REQUESTS);
  let parsed: Request[] = raw ? JSON.parse(raw) : [];
  
  // If storage got cleared or empty array, force re-seed
  if (!parsed || parsed.length === 0) {
    localStorage.setItem(KEYS.REQUESTS, JSON.stringify(seedRequests));
    parsed = seedRequests;
  }
  return parsed;
};

export const saveRequests = (requests: Request[]) => {
  localStorage.setItem(KEYS.REQUESTS, JSON.stringify(requests));
};

export const getComplianceConfig = (): ComplianceConfig => {
  initializeDB();
  return JSON.parse(localStorage.getItem(KEYS.CONFIG) || '{}');
};

export const saveComplianceConfig = (config: ComplianceConfig, user: User, reason: string) => {
  localStorage.setItem(KEYS.CONFIG, JSON.stringify(config));
  addAuditLog(
    'UPDATE_COMPLIANCE_CONFIG',
    `ปรับปรุงค่ากำหนดกฎหมายและ SLA เป็นเวอร์ชัน ${config.version}. เหตุผล: ${reason}`,
    user,
    undefined,
    undefined
  );
};

export const getDocumentTemplates = (): DocumentTemplate[] => {
  initializeDB();
  return JSON.parse(localStorage.getItem(KEYS.TEMPLATES) || '[]');
};

export const saveDocumentTemplates = (templates: DocumentTemplate[]) => {
  localStorage.setItem(KEYS.TEMPLATES, JSON.stringify(templates));
};

export const getAuditLogs = (): AuditLog[] => {
  initializeDB();
  return JSON.parse(localStorage.getItem(KEYS.AUDIT_LOGS) || '[]').reverse(); // Newest first
};

export const getCurrentUser = (): User => {
  initializeDB();
  return JSON.parse(localStorage.getItem(KEYS.CURRENT_USER) || 'null');
};

export const setCurrentUser = (user: User | null) => {
  if (!user) {
    localStorage.removeItem(KEYS.CURRENT_USER);
    localStorage.removeItem('pdpa_jwt_token');
    return;
  }
  localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
  addAuditLog('SWITCH_USER_ROLE', `เปลี่ยนสวมบทบาทการทำงานเป็น: ${user.fullNameTh} (${user.role.toUpperCase()})`, user);
};

// Add Audit Log Entry (Section 3.11)
export const addAuditLog = (
  action: string,
  details: string,
  user: User,
  requestId?: string,
  trackingNo?: string
): AuditLog => {
  const logs = JSON.parse(localStorage.getItem(KEYS.AUDIT_LOGS) || '[]');
  const newLog: AuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    orgId: user.orgId || 'org_dopa',
    timestamp: new Date().toISOString(),
    actorId: user.id,
    actorName: user.fullNameTh,
    actorRole: user.role,
    action,
    requestId,
    requestTrackingNo: trackingNo,
    ipAddress: '192.168.1.105', // Static mock IP
    userAgent: navigator.userAgent || 'Mozilla/5.0 Client',
    details,
    checksum: '',
  };

  // Compute integrity hash using fields
  const plainText = `${newLog.timestamp}|${newLog.actorId}|${newLog.action}|${newLog.details}`;
  newLog.checksum = generateChecksum(plainText);

  logs.push(newLog);
  localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(logs));
  return newLog;
};

// Request Management Functions
export const getRequestById = (id: string): Request | undefined => {
  return getRequests().find((r) => r.id === id);
};

export const getRequestByTrackingNo = (trackingNo: string): Request | undefined => {
  return getRequests().find((r) => r.trackingNo.toUpperCase() === trackingNo.trim().toUpperCase());
};

// Generate Next Tracking Number (REQ-YYYY-XXXX)
export const generateTrackingNumber = (): string => {
  const requests = getRequests();
  const year = new Date().getFullYear();
  const prefix = `REQ-${year}-`;
  
  // Find highest number in current year
  let maxNum = 0;
  requests.forEach((r) => {
    if (r.trackingNo.startsWith(prefix)) {
      const parts = r.trackingNo.split('-');
      const num = parseInt(parts[2], 10);
      if (num > maxNum) maxNum = num;
    }
  });

  const nextNum = (maxNum + 1).toString().padStart(4, '0');
  return `${prefix}${nextNum}`;
};

// Insert New Request (Section 3.2)
export const createRequest = (requestData: Omit<Request, 'id' | 'orgId' | 'uuid' | 'trackingNo' | 'status' | 'submissionDate' | 'slaRemainingDays' | 'slaDaysUsed' | 'slaPaused' | 'slaExtended' | 'slaEvents' | 'statusHistory' | 'dataCollectionTasks' | 'redactionRecords' | 'feeCalculation' | 'messageThread' | 'legalHold' | 'identityVerification'>): Request => {
  const requests = getRequests();
  const config = getComplianceConfig();
  
  const trackingNo = generateTrackingNumber();
  const uuid = 'pk-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  const newRequest: Request = {
    ...requestData,
    id: `req_${Date.now()}`,
    orgId: (requestData as any).orgId || 'org_dopa',
    uuid,
    trackingNo,
    status: 'Submitted',
    submissionDate: new Date().toISOString(),
    slaRemainingDays: config.sla.processingDays,
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
      noFee: requestData.requestDetails.deliveryMethod === 'secure_download',
      paperPages: 0,
      computerPages: 0,
      certificationsCount: 0,
      otherCosts: [],
      totalCalculated: 0,
      isApproved: false,
      paymentStatus: 'pending'
    },
    messageThread: [],
    legalHold: false,
  };

  requests.unshift(newRequest);
  saveRequests(requests);

  // Sync to PostgreSQL Master Database via API
  fetch('/api/public/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newRequest)
  }).catch((err) => console.log('PostgreSQL Background Sync:', err));

  // Log creation
  const mockSystemUser: User = { id: 'system', orgId: 'org_dopa', username: 'system', fullNameTh: 'พอร์ทัลสาธารณะ', fullNameEn: 'Public Portal', email: '', role: 'intake', roles: ['intake'], mfaEnabled: false };
  addAuditLog('SUBMIT_REQUEST', `ผู้รับข้อมูลยื่นคำขอใหม่แบบออนไลน์ เลขที่ ${trackingNo}`, mockSystemUser, newRequest.id, trackingNo);

  return newRequest;
};

// Update Request Details & Status (Section 4)
export const updateRequest = (updatedReq: Request, actor: User, auditAction: string, auditDetail: string) => {
  const requests = getRequests();
  const index = requests.findIndex((r) => r.id === updatedReq.id);
  if (index !== -1) {
    requests[index] = updatedReq;
    saveRequests(requests);
    addAuditLog(auditAction, auditDetail, actor, updatedReq.id, updatedReq.trackingNo);
  }
};

// Change Request Status & Manage SLA Events
export const changeRequestStatus = (
  requestId: string,
  newStatus: RequestStatus,
  actor: User,
  comment?: string
) => {
  const req = getRequestById(requestId);
  if (!req) return;

  const prevStatus = req.status;
  req.status = newStatus;
  
  // Set received date
  if (newStatus === 'Received' && !req.receivedDate) {
    req.receivedDate = new Date().toISOString();
  }

  // Set completeness check date & SLA Start
  if (newStatus === 'Complete' && !req.completenessCheckedDate) {
    req.completenessCheckedDate = new Date().toISOString();
    req.slaStartDate = new Date().toISOString();
    const config = getComplianceConfig();
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + config.sla.processingDays);
    req.slaDeadlineDate = deadline.toISOString();
  }

  // Handle SLA Pause/Resume on deficiency states (Section 3.4)
  if (newStatus === 'Awaiting Additional Information' && !req.slaPaused) {
    req.slaPaused = true;
    req.slaPausedAt = new Date().toISOString();
    const pauseEvent: SLAEvent = {
      id: `evt_${Date.now()}`,
      type: 'pause',
      timestamp: new Date().toISOString(),
      reason: comment || 'พักสายชั่วคราวเนื่องจากรอยื่นเอกสารเพิ่มเติม',
      operator: actor.fullNameTh,
    };
    req.slaEvents.push(pauseEvent);
  } else if (prevStatus === 'Awaiting Additional Information' && req.slaPaused) {
    req.slaPaused = false;
    const resumeEvent: SLAEvent = {
      id: `evt_${Date.now()}`,
      type: 'resume',
      timestamp: new Date().toISOString(),
      reason: 'ได้รับเอกสารเพิ่มเติมและยืนยันประมวลผลต่อ',
      operator: actor.fullNameTh,
    };
    req.slaEvents.push(resumeEvent);
    
    // Adjust deadline date based on elapsed pause time
    if (req.slaPausedAt && req.slaDeadlineDate) {
      const pausedMs = Date.now() - new Date(req.slaPausedAt).getTime();
      const currentDeadline = new Date(req.slaDeadlineDate).getTime();
      req.slaDeadlineDate = new Date(currentDeadline + pausedMs).toISOString();
    }
  }

  // Push status history
  req.statusHistory.push({
    status: newStatus,
    changedAt: new Date().toISOString(),
    changedBy: actor.fullNameTh,
    comment,
  });

  updateRequest(req, actor, 'UPDATE_STATUS', `เปลี่ยนสถานะคำขอจาก "${prevStatus}" เป็น "${newStatus}"${comment ? ` (ความเห็น: ${comment})` : ''}`);
};

// SLA Calculations Utility (Section 5)
export const recalculateAllSLAs = () => {
  const requests = getRequests();
  const config = getComplianceConfig();
  const now = new Date();
  let changed = false;

  const updatedRequests = requests.map((req) => {
    // If request is closed, resolved, or not yet marked "Complete" (SLA starts on Completeness checked)
    if (!req.slaStartDate || ['Closed', 'Delivered', 'Receipt Confirmed', 'Withdrawn', 'Disposed for Incomplete Information', 'Destroyed'].includes(req.status)) {
      return req;
    }

    // Calculate elapsed and remaining
    const start = new Date(req.slaStartDate);

    // Calculate how many days used, excluding paused periods
    let totalMsUsed = now.getTime() - start.getTime();
    
    // Deduct paused duration
    let totalMsPaused = 0;
    req.slaEvents.forEach((evt, idx) => {
      if (evt.type === 'pause') {
        const pauseStart = new Date(evt.timestamp).getTime();
        // find matching resume
        const nextResume = req.slaEvents.find((r, rIdx) => rIdx > idx && r.type === 'resume');
        const pauseEnd = nextResume ? new Date(nextResume.timestamp).getTime() : now.getTime();
        totalMsPaused += (pauseEnd - pauseStart);
      }
    });

    totalMsUsed -= totalMsPaused;
    if (totalMsUsed < 0) totalMsUsed = 0;

    const daysUsed = Math.floor(totalMsUsed / (1000 * 60 * 60 * 24));
    
    const limitDays = req.slaExtended ? (config.sla.processingDays + config.sla.extensionDays) : config.sla.processingDays;
    const remainingDays = limitDays - daysUsed;

    if (req.slaDaysUsed !== daysUsed || req.slaRemainingDays !== remainingDays) {
      req.slaDaysUsed = daysUsed;
      req.slaRemainingDays = remainingDays;
      changed = true;
    }

    return req;
  });

  if (changed) {
    saveRequests(updatedRequests);
  }
};
