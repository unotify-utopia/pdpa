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
  if (!existingRequests) {
    localStorage.setItem(KEYS.REQUESTS, JSON.stringify(seedRequests));
  } else {
    try {
      const parsed: Request[] = JSON.parse(existingRequests);
      let updated = false;
      const merged = [...parsed];
      for (const seed of seedRequests) {
        const idx = merged.findIndex(r => r.id === seed.id || r.trackingNo === seed.trackingNo);
        if (idx === -1) {
          merged.push(seed);
          updated = true;
        } else if (!merged[idx].orgId || merged[idx].requester.firstName === 'พงศกร' || merged[idx].requester.firstName === 'somkiat' || (merged[idx].messageThread[0] && merged[idx].messageThread[0].timestamp.endsWith('Z'))) {
          merged[idx] = seed;
          updated = true;
        }
      }
      // Clean up legacy duplicate seed request REQ-TECH-2026-0008
      const filtered = merged.filter(r => r.id !== 'req_tech_008' && r.trackingNo !== 'REQ-TECH-2026-0008');
      if (filtered.length !== merged.length) {
        updated = true;
      }
      if (updated) {
        localStorage.setItem(KEYS.REQUESTS, JSON.stringify(filtered));
      }
    } catch {
      localStorage.setItem(KEYS.REQUESTS, JSON.stringify(seedRequests));
    }
  }



  // Clean up any legacy persistent login in localStorage so user session is never remembered across browser restarts/tabs
  localStorage.removeItem(KEYS.CURRENT_USER);
  localStorage.removeItem('pdpa_jwt_token');
  localStorage.removeItem('pdpa_token');
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




export const fetchDocumentTemplates = async (): Promise<DocumentTemplate[]> => {
  try {
    const res = await fetch('/api/templates');
    const data = await res.json();
    if (data.success && data.templates && data.templates.length > 0) {
      // Map back database snake_case to camelCase
      return data.templates.map((t: any) => ({
        id: t.id,
        type: t.type,
        name: t.name,
        subject: t.subject,
        body: t.body,
        isActive: t.is_active
      }));
    }
  } catch (err) {
    console.error('Failed to fetch templates', err);
  }
  return initialDocumentTemplates;
};

export const saveDocumentTemplates = async (templates: DocumentTemplate[]) => {
  const token = sessionStorage.getItem('pdpa_jwt_token') || sessionStorage.getItem('pdpa_token');
  try {
    await fetch('/api/templates', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ templates })
    });
  } catch (err) {
    console.error('Failed to save templates', err);
  }
};




export const resetDocumentTemplates = async (): Promise<DocumentTemplate[]> => {
  await saveDocumentTemplates(initialDocumentTemplates);
  return initialDocumentTemplates;
};


export const fetchAuditLogs = async (): Promise<AuditLog[]> => {
  const token = sessionStorage.getItem('pdpa_jwt_token') || sessionStorage.getItem('pdpa_token');
  try {
    const res = await fetch('/api/audit-logs', {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    });
    const data = await res.json();
    if (data.success && data.logs) {
      return data.logs.map((l: any) => ({
        id: l.id,
        timestamp: l.timestamp,
        actor: {
          id: l.actor_id || 'unknown',
          fullNameTh: l.actor_name,
          role: l.actor_role,
          orgId: l.org_id,
          username: '',
          email: ''
        },
        action: l.action,
        details: l.details,
        requestId: l.request_id,
        requestTrackingNo: l.request_tracking_no,
        ipAddress: l.ip_address,
        userAgent: l.user_agent,
        checksum: l.checksum
      }));
    }
  } catch (err) {
    console.error('Failed to fetch audit logs', err);
  }
  return [];
};


export const getCurrentUser = (): User => {
  initializeDB();
  return JSON.parse(sessionStorage.getItem(KEYS.CURRENT_USER) || 'null');
};

export const setCurrentUser = (user: User | null) => {
  localStorage.removeItem(KEYS.CURRENT_USER);
  localStorage.removeItem('pdpa_jwt_token');
  localStorage.removeItem('pdpa_token');

  if (!user) {
    sessionStorage.removeItem(KEYS.CURRENT_USER);
    sessionStorage.removeItem('pdpa_jwt_token');
    sessionStorage.removeItem('pdpa_token');
    return;
  }
  sessionStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
  addAuditLog('SWITCH_USER_ROLE', `เปลี่ยนสวมบทบาทการทำงานเป็น: ${user.fullNameTh} (${user.role.toUpperCase()})`, user);
};

// Add Audit Log Entry (Section 3.11)
export const addAuditLog = async (
  action: string,
  details: string,
  user: User,
  requestId?: string,
  trackingNo?: string
): Promise<AuditLog> => {
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

  // Sync to PostgreSQL Master Database via API
  try {
    const token = sessionStorage.getItem('pdpa_token') || sessionStorage.getItem('pdpa_jwt_token');
    await fetch('/api/audit-logs', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(newLog)
    });
  } catch (err) {
    console.error('Failed to sync audit log to PostgresDB:', err);
    // Don't throw for audit logs to not block main operations
  }
  
  return newLog;
};

// Request Management Functions
export const getRequestById = (id: string): Request | undefined => {
  return getRequests().find((r) => r.id === id);
};

export const getRequestByTrackingNo = (trackingNo: string): Request | undefined => {
  return getRequests().find((r) => r.trackingNo.toUpperCase() === trackingNo.trim().toUpperCase());
};

// Internal Helper for Tracking Number
export const generateTrackingNumber = (orgId: string = 'org_dopa', isManual: boolean = false): string => {
  const requests = getRequests();
  const yearBE = new Date().getFullYear() + 543;
  const orgCodePrefix = orgId.replace(/^org_/, '').toUpperCase().replace('_TH', '');
  const manualSuffix = isManual ? 'M' : '';
  const prefix = `REQ-${orgCodePrefix}${manualSuffix}-${yearBE}-`;
  
  // Count existing requests for this specific tenant organization
  let maxNum = 0;
  requests.forEach((r) => {
    if (r.orgId === orgId && r.trackingNo) {
      const parts = r.trackingNo.split('-');
      // Must start with REQ-ORG... to filter out old REQ-MANUAL-YYYY-XXXX entries
      if (parts.length >= 3 && parts[0] === 'REQ' && parts[1].startsWith(orgCodePrefix)) {
        // The sequential number is always the last part after a dash
        const num = parseInt(parts[parts.length - 1], 10);
        // Ensure the parsed number is valid and less than a reasonable threshold to prevent parsing years/random big numbers
        if (!isNaN(num) && num < 100000 && num > maxNum) {
          maxNum = num;
        }
      }
    }
  });

  const nextNum = (maxNum + 1).toString().padStart(4, '0');
  return `${prefix}${nextNum}`;
};

// Create New Request (Section 3) - Pure function now
export const createRequest = (requestData: Omit<Request, 'id' | 'uuid' | 'trackingNo' | 'status' | 'submissionDate' | 'slaRemainingDays' | 'slaDaysUsed' | 'slaPaused' | 'slaExtended' | 'slaEvents' | 'statusHistory' | 'dataCollectionTasks' | 'redactionRecords' | 'feeCalculation' | 'messageThread' | 'legalHold' | 'identityVerification'> & { orgId?: string }): Request => {
  const config = getComplianceConfig();
  const targetOrgId = requestData.orgId || 'org_dopa';
  
  const trackingNo = generateTrackingNumber(targetOrgId);
  const uuid = 'pk-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  const newRequest: Request = {
    ...requestData,
    id: `req_${Date.now()}`,
    orgId: targetOrgId,
    targetOrgId: requestData.targetOrgId || targetOrgId,
    targetOrgName: requestData.targetOrgName || 'หน่วยงานผู้รับคำขอ PDPA',
    uuid,
    trackingNo,
    status: 'Submitted',
    submissionDate: new Date().toISOString(),
    slaRemainingDays: config.sla.processingDays,
    slaDaysUsed: 0,
    slaPaused: false,
    slaExtended: false,
    slaEvents: [],
    statusHistory: [{
      status: 'Submitted',
      changedAt: new Date().toISOString(),
      changedBy: requestData.requester.firstName + ' ' + requestData.requester.lastName,
      comment: 'ยื่นคำร้องขอใช้สิทธิเข้าสู่ระบบ'
    }],
    identityVerification: {
      status: 'pending',
      assuranceLevel: 'medium',
      method: 'document_check'
    },
    dataCollectionTasks: [],
    redactionRecords: [],
    feeCalculation: {
      noFee: true,
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

  return newRequest;
};

// Update Request Details & Status (Section 4)
export const updateRequest = async (updatedReq: Request, actor: User, auditAction: string, auditDetail: string) => {
  // Sync to PostgreSQL Master Database via API FIRST (Strict Mode)
  const res = await fetch('/api/public/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedReq)
  });
  
  if (!res.ok) {
    throw new Error('การบันทึกข้อมูลไปยังฐานข้อมูลล้มเหลว กรุณาลองใหม่อีกครั้ง');
  }

  // Update local cache only if DB sync succeeds
  const requests = getRequests();
  const index = requests.findIndex((r) => r.id === updatedReq.id);
  if (index !== -1) {
    requests[index] = updatedReq;
    saveRequests(requests);
    
    // Do not block UI for audit log
    addAuditLog(auditAction, auditDetail, actor, updatedReq.id, updatedReq.trackingNo).catch(console.error);
    
    // Notify staff UI that email workflow notification was sent
    window.dispatchEvent(new CustomEvent('workflow-notify', {
      detail: {
        title: 'แจ้งเตือนตาม Flow เอกสาร (Email Workflow)',
        message: `ส่งอีเมลแจ้งความคืบหน้าสถานะ "${updatedReq.status}" ไปยังผู้เกี่ยวข้องตาม Workflow เรียบร้อยแล้ว`
      }
    }));
  }
};

// Change Request Status & Manage SLA Events
export const changeRequestStatus = async (
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
  if (newStatus === 'Documents Verified' && !req.completenessCheckedDate) {
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

  await updateRequest(req, actor, 'UPDATE_STATUS', `เปลี่ยนสถานะคำขอจาก "${prevStatus}" เป็น "${newStatus}"${comment ? ` (ความเห็น: ${comment})` : ''}`);
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
