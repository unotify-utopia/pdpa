import type { Request, ComplianceConfig, DocumentTemplate, AuditLog, User, RequestStatus, SLAEvent } from './types';
import { initialComplianceConfig, initialDocumentTemplates, initialAuditLogs } from './mockData';


// Storage keys
const KEYS = {
  CONFIG: 'pdpa_req_config',
  TEMPLATES: 'pdpa_req_templates',
  AUDIT_LOGS: 'pdpa_req_audit_logs',
  CURRENT_USER: 'pdpa_req_current_user',
};

// Initialize DB: Clear any legacy localStorage auth tokens
export const initializeDB = () => {
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


export const fetchComplianceConfig = async (): Promise<ComplianceConfig> => {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data.success && data.config) {
      return data.config;
    }
  } catch (err) {
    console.error('Failed to fetch config', err);
  }
  return initialComplianceConfig;
};

// Sync alias for createRequest/recalculateAllSLAs that need config synchronously
export const getComplianceConfig = (): ComplianceConfig => {
  return initialComplianceConfig;
};

export const saveComplianceConfig = async (config: ComplianceConfig, user: User, reason: string): Promise<void> => {
  const token = sessionStorage.getItem('pdpa_jwt_token') || sessionStorage.getItem('pdpa_token');
  try {
    await fetch('/api/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(config)
    });
    addAuditLog(
      'UPDATE_COMPLIANCE_CONFIG',
      `ปรับปรุงค่ากำหนดกฎหมายและ SLA เป็นเวอร์ชัน ${config.version}. เหตุผล: ${reason}`,
      user,
      undefined,
      undefined
    );
  } catch (err) {
    console.error('Failed to save config', err);
  }
};

export const fetchDocumentTemplates = async (): Promise<DocumentTemplate[]> => {
  try {
    const res = await fetch('/api/templates');
    const data = await res.json();
    if (data.success && data.templates && data.templates.length > 0) {
      return data.templates.map((t: any) => {
        const initial = initialDocumentTemplates.find(mock => mock.id === t.id) || {} as Partial<DocumentTemplate>;
        return {
          id: t.id,
          nameTh: t.name || initial.nameTh || '',
          nameEn: initial.nameEn || '',
          subjectTemplate: t.subject || initial.subjectTemplate || '',
          bodyTemplate: t.body || initial.bodyTemplate || '',
          version: initial.version || '1.0',
          confidentialityLevel: initial.confidentialityLevel || 'NORMAL'
        } as DocumentTemplate;
      });
    }
  } catch (err) {
    console.error('Failed to fetch templates', err);
  }
  return initialDocumentTemplates;
};

export const saveDocumentTemplates = async (templates: DocumentTemplate[]) => {
  const token = sessionStorage.getItem('pdpa_jwt_token') || sessionStorage.getItem('pdpa_token');
  try {
    const mappedToDb = templates.map(t => ({
      id: t.id,
      type: 'email',
      name: t.nameTh,
      subject: t.subjectTemplate,
      body: t.bodyTemplate,
      isActive: true
    }));
    await fetch('/api/templates', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ templates: mappedToDb })
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
    if (data.success && data.auditLogs && data.auditLogs.length > 0) {
      return data.auditLogs.map((l: any) => ({
        id: l.id,
        timestamp: l.timestamp,
        actorId: l.actorId || 'unknown',
        actorName: l.actorName || 'Unknown User',
        actorRole: l.actorRole || '',
        orgId: l.orgId || '',
        action: l.action,
        details: l.details,
        requestId: l.requestId || '',
        requestTrackingNo: l.requestTrackingNo || '',
        ipAddress: l.ipAddress || '-',
        userAgent: l.userAgent || '-',
        checksum: l.checksum || '000000'
      }));
    }
  } catch (err) {
    console.error('Failed to fetch audit logs from API, falling back to local storage', err);
  }
  
  // Fallback to local storage
  const localLogsStr = localStorage.getItem(KEYS.AUDIT_LOGS);
  if (localLogsStr) {
    try {
      return JSON.parse(localLogsStr);
    } catch (e) {
      console.error('Error parsing local audit logs', e);
    }
  }
  
  // Initialize with mock data if completely empty
  localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(initialAuditLogs));
  return initialAuditLogs;
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
  let realIp = '192.168.1.105';
  try {
    const ipRes = await fetch('https://api.ipify.org?format=json').catch(() => null);
    if (ipRes && ipRes.ok) {
      const ipData = await ipRes.json();
      realIp = ipData.ip;
    }
  } catch (e) {
    console.warn('Could not fetch real IP, using default');
  }

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
    ipAddress: realIp,
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
    }).catch(() => ({})); // Ignore network errors in frontend
  } catch (err) {
    console.error('Failed to sync audit log to PostgresDB:', err);
    // Don't throw for audit logs to not block main operations
  }
  
  // Always save to localStorage as a reliable fallback for Sandbox
  try {
    const localLogsStr = localStorage.getItem(KEYS.AUDIT_LOGS);
    let localLogs = [];
    if (localLogsStr) {
      localLogs = JSON.parse(localLogsStr);
    } else {
      localLogs = [...initialAuditLogs];
    }
    localLogs.unshift(newLog); // Add to beginning
    localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(localLogs));
  } catch (e) {
    console.error('Failed to save audit log locally:', e);
  }
  
  return newLog;
};


// Create New Request (Section 3) - Pure function now
export const createRequest = (requestData: Omit<Request, 'id' | 'uuid' | 'trackingNo' | 'status' | 'submissionDate' | 'slaRemainingDays' | 'slaDaysUsed' | 'slaPaused' | 'slaExtended' | 'slaEvents' | 'statusHistory' | 'dataCollectionTasks' | 'redactionRecords' | 'feeCalculation' | 'messageThread' | 'legalHold' | 'identityVerification'> & { orgId?: string }): Request => {
  const config = getComplianceConfig();
  const targetOrgId = requestData.orgId || 'org_dopa';
  
  const trackingNo = ''; // Will be assigned by backend API
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
  const token = sessionStorage.getItem('pdpa_jwt_token') || sessionStorage.getItem('pdpa_token');
  const endpoint = token ? `/api/requests/${updatedReq.id}` : '/api/public/requests';
  const method = token ? 'PUT' : 'POST';
  
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Sync to PostgreSQL Master Database via API FIRST (Strict Mode)
  const res = await fetch(endpoint, {
    method,
    headers,
    body: JSON.stringify(updatedReq)
  });
  
  if (!res.ok) {
    throw new Error('การบันทึกข้อมูลไปยังฐานข้อมูลล้มเหลว กรุณาลองใหม่อีกครั้ง');
  }

  // Update local cache only if DB sync succeeds
    // Do not block UI for audit log
    addAuditLog(auditAction, auditDetail, actor, updatedReq.id, updatedReq.trackingNo).catch(console.error);
    
    // Notify staff UI that email workflow notification was sent ONLY if status changed
    if (auditAction.startsWith('CHANGE_STATUS_')) {
      window.dispatchEvent(new CustomEvent('workflow-notify', {
        detail: {
          title: 'แจ้งเตือนตาม Flow เอกสาร (Email Workflow)',
          message: `ส่งอีเมลแจ้งความคืบหน้าสถานะ "${updatedReq.status}" ไปยังผู้เกี่ยวข้องตาม Workflow เรียบร้อยแล้ว`
        }
      }));
    }
    return updatedReq;
};

// Change Request Status & Manage SLA Events
export const changeRequestStatus = async (
  req: Request | undefined,
  newStatus: RequestStatus,
  actor: User,
  comment?: string,
  configParam?: ComplianceConfig
) => {
  if (!req) return undefined;

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
    const config = configParam || getComplianceConfig();
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
    if (!req.slaEvents) {
      req.slaEvents = [];
    }
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
    if (!req.slaEvents) {
      req.slaEvents = [];
    }
    req.slaEvents.push(resumeEvent);
    
    // Adjust deadline date based on elapsed pause time
    if (req.slaPausedAt && req.slaDeadlineDate) {
      const pausedMs = Date.now() - new Date(req.slaPausedAt).getTime();
      const currentDeadline = new Date(req.slaDeadlineDate).getTime();
      req.slaDeadlineDate = new Date(currentDeadline + pausedMs).toISOString();
    }
  }

  // Push status history
  if (!req.statusHistory) {
    req.statusHistory = [];
  }
  req.statusHistory.push({
    status: newStatus,
    changedAt: new Date().toISOString(),
    changedBy: actor.fullNameTh,
    comment,
  });

  await updateRequest(req, actor, 'UPDATE_STATUS', `เปลี่ยนสถานะคำขอจาก "${prevStatus}" เป็น "${newStatus}"${comment ? ` (ความเห็น: ${comment})` : ''}`);
  return req;
};

// SLA Calculations Utility (Section 5)
export const recalculateAllSLAs = (requests: Request[], config: ComplianceConfig): Request[] => {
  const now = new Date();

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
    }

    return req;
  });

  return updatedRequests;
};
