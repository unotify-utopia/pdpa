import React, { useState, useEffect } from 'react';
import {
  Shield,
  FileText,
  UserCheck,
  CheckCircle,
  Search,
  FileSpreadsheet,
  List,
  Layers,
  User,
  Users,
  Send,
  AlertTriangle,
  Lock,
  Plus,
  DollarSign,
  Download,
  Trash2,
  BookOpen,
  ArrowLeft,
  Mail,
  FileCheck2,
  Scale
} from 'lucide-react';

import type {
  Request,
  RequestStatus,
  User as UserType,
  Role,
  ComplianceConfig,
  DocumentTemplate,
  AuditLog,
  MessageThread,
  Attachment,
  DataCollectionTask,
  RedactionRecord
} from './types';

import {
  getRequests,
  getComplianceConfig,
  getDocumentTemplates,
  getAuditLogs,
  getCurrentUser,
  setCurrentUser,
  changeRequestStatus,
  createRequest,
  updateRequest,
  recalculateAllSLAs,
  addAuditLog,
  getRequestById,
  saveComplianceConfig
} from './db';


import { initialOrganizations, systemUsers } from './mockData';
import { SignaturePad } from './components/SignaturePad';
import { WatermarkedUpload } from './components/WatermarkedUpload';
import { RedactionCanvas } from './components/RedactionCanvas';
import { ThaiLetterView, convertToThaiDate } from './components/ThaiLetterView';
import { DashboardCharts } from './components/DashboardCharts';
import { StaffLoginModal } from './components/StaffLoginModal';

export default function App() {
  // App context navigation states
  const [view, setView] = useState<'public' | 'internal' | 'tracking' | 'download'>('public');
  const [publicTab, setPublicTab] = useState<'landing' | 'submit' | 'submitted_success'>('landing');
  const [internalTab, setInternalTab] = useState<'dashboard' | 'requests' | 'kanban' | 'users' | 'compliance' | 'templates' | 'retention' | 'audit'>('dashboard');

  // DB States
  const [requests, setRequests] = useState<Request[]>([]);
  const [config, setConfig] = useState<ComplianceConfig | null>(null);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeUser, setActiveUser] = useState<UserType | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Reload local state from DB with Multi-tenant Filtering
  const reloadData = () => {
    const currentUser = getCurrentUser();
    const allRequests = getRequests();
    const allLogs = getAuditLogs();

    if (currentUser && currentUser.orgId) {
      setRequests(allRequests.filter((r) => !r.orgId || r.orgId === currentUser.orgId));
      setAuditLogs(allLogs.filter((l) => !l.orgId || l.orgId === currentUser.orgId));
    } else {
      setRequests(allRequests);
      setAuditLogs(allLogs);
    }

    setConfig(getComplianceConfig());
    setTemplates(getDocumentTemplates());
  };

  // Active Selections
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isNewRequestSuccess, setIsNewRequestSuccess] = useState<Request | null>(null);
  
  // Public tracking inputs
  const [trackNo, setTrackNo] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [trackedRequest, setTrackedRequest] = useState<Request | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  // Secure download link simulation
  const [downloadToken, setDownloadToken] = useState<string | null>(null);
  const [downloadRequest, setDownloadRequest] = useState<Request | null>(null);
  const [downloadOtpCode, setDownloadOtpCode] = useState('');
  const [showDownloadOtpModal, setShowDownloadOtpModal] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  
  // Dashboard Interactive Navigation Filter State
  const [statusFilterGroup, setStatusFilterGroup] = useState<RequestStatus[] | null>(null);



  useEffect(() => {
    recalculateAllSLAs();
    const interval = setInterval(() => {
      recalculateAllSLAs();
      reloadData();
    }, 30000); // every 30s
    return () => clearInterval(interval);
  }, []);

  // 10-Minute Inactivity Session Timeout for Staff Security (PDPA Access Control Rule)
  useEffect(() => {
    if (!activeUser || view !== 'internal') return;

    let inactivityTimer: ReturnType<typeof setTimeout>;
    const TIMEOUT_DURATION = 10 * 60 * 1000; // 10 minutes in ms

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        alert('เซสชันหมดอายุเนื่องจากไม่มีการใช้งานเกิน 10 นาที ระบบได้ทำการล็อกเอาต์อัตโนมัติเพื่อความปลอดภัยตามมาตรฐาน PDPA');
        setActiveUser(null);
        setView('public');
      }, TIMEOUT_DURATION);
    };

    // User action listeners
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, resetTimer));

    resetTimer(); // Initialize timer

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [activeUser, view]);

  // Handle switching active role for current logged in multi-role user
  const handleRoleChange = (roleName: Role) => {
    if (!activeUser) return;
    
    // Update active working role for current user
    const updatedUser: UserType = {
      ...activeUser,
      role: roleName
    };

    setCurrentUser(updatedUser);
    setActiveUser(updatedUser);
    setSelectedRequestId(null);
    reloadData();
  };

  // State calculations helper for sidebar badge count
  const getBadgeCount = (statuses: RequestStatus[]) => {
    return requests.filter(r => statuses.includes(r.status)).length;
  };

  // --- PUBLIC PORTAL FORM STATE WIZARD ---
  const [wizardStep, setWizardStep] = useState(1);
  const [reqType, setReqType] = useState<'self' | 'representative'>('self');
  const [requesterForm, setRequesterForm] = useState({
    firstName: '',
    lastName: '',
    idNumber: '',
    email: '',
    phone: '',
    address: ''
  });
  const [repForm, setRepForm] = useState({
    firstName: '',
    lastName: '',
    idNumber: '',
    email: '',
    phone: '',
    address: '',
    scope: 'การยื่นขอใช้สิทธิดึงประวัติการเงินและข้อมูลส่วนบุคคลแทนผู้มอบอำนาจทั้งหมด',
    validFrom: new Date().toISOString().split('T')[0],
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [scopeForm, setScopeForm] = useState({
    requestType: 'access_and_copy' as 'access' | 'copy' | 'access_and_copy',
    description: '',
    systems: [] as string[],
    timeframeStart: '',
    timeframeEnd: '',
    deliveryMethod: 'secure_download' as 'pickup' | 'registered_mail' | 'secure_download'
  });
  const [uploadedAttachments, setUploadedAttachments] = useState<{name: string, data: string}[]>([]);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [accuracyCertified, setAccuracyCertified] = useState(false);

  const handleSystemToggle = (sysName: string) => {
    setScopeForm(prev => ({
      ...prev,
      systems: prev.systems.includes(sysName)
        ? prev.systems.filter(s => s !== sysName)
        : [...prev.systems, sysName]
    }));
  };

  const handleFileUpload = (fileName: string, dataUrl: string) => {
    setUploadedAttachments(prev => [...prev, { name: fileName, data: dataUrl }]);
  };

  const handleResetWizard = () => {
    setWizardStep(1);
    setReqType('self');
    setRequesterForm({ firstName: '', lastName: '', idNumber: '', email: '', phone: '', address: '' });
    setRepForm({ firstName: '', lastName: '', idNumber: '', email: '', phone: '', address: '', scope: '', validFrom: '', validTo: '' });
    setScopeForm({ requestType: 'access_and_copy', description: '', systems: [], timeframeStart: '', timeframeEnd: '', deliveryMethod: 'secure_download' });
    setUploadedAttachments([]);
    setSignatureData(null);
    setConsentAccepted(false);
    setAccuracyCertified(false);
  };

  const submitPublicRequest = (e: React.FormEvent) => {
    e.preventDefault();

    if (!consentAccepted || !accuracyCertified || !signatureData) {
      alert('กรุณายอมรับนโยบายความเป็นส่วนตัว คำรับรองความถูกต้อง และลงลายมือชื่อก่อนยื่นคำขอ');
      return;
    }

    const attachmentsList: Attachment[] = uploadedAttachments.map((f, index) => ({
      id: `att_wizard_${Date.now()}_${index}`,
      name: f.name,
      size: Math.round(f.data.length * 0.75), // base64 estimate
      type: f.data.split(';')[0].split(':')[1],
      isMasked: true,
      watermarkApplied: true,
      uploadedAt: new Date().toISOString(),
      fileUrl: f.data
    }));

    // Add Signature as attachment
    attachmentsList.push({
      id: `att_sig_${Date.now()}`,
      name: 'signature_e_sign.png',
      size: signatureData.length,
      type: 'image/png',
      isMasked: false,
      watermarkApplied: false,
      uploadedAt: new Date().toISOString(),
      fileUrl: signatureData
    });

    const newReq = createRequest({
      requesterType: reqType,
      requester: requesterForm,
      representative: reqType === 'representative' ? {
        firstName: repForm.firstName,
        lastName: repForm.lastName,
        idNumber: repForm.idNumber,
        email: repForm.email,
        phone: repForm.phone,
        address: repForm.address,
        scopeOfAuthority: repForm.scope,
        validFrom: repForm.validFrom,
        validTo: repForm.validTo
      } : undefined,
      contactChannel: 'web',
      requestDetails: {
        requestType: scopeForm.requestType,
        description: scopeForm.description,
        targetSystems: scopeForm.systems,
        timeframeStart: scopeForm.timeframeStart || undefined,
        timeframeEnd: scopeForm.timeframeEnd || undefined,
        deliveryMethod: scopeForm.deliveryMethod
      },
      attachments: attachmentsList
    });

    setIsNewRequestSuccess(newReq);
    setPublicTab('submitted_success');
    handleResetWizard();
    reloadData();
  };

  // --- PUBLIC TRACKING LOGIC ---
  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTrackingError(null);
    const req = requests.find(r => r.trackingNo.toUpperCase() === trackNo.trim().toUpperCase());
    
    if (!req) {
      setTrackingError('ไม่พบเลขคำขอดังกล่าวในระบบ กรุณาตรวจสอบความถูกต้องอีกครั้ง');
      return;
    }

    // Simulate OTP triggers
    setTrackedRequest(req);
    setShowOtpModal(true);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode === '123456') {
      setShowOtpModal(false);
      setView('tracking');
    } else {
      alert('รหัส OTP ไม่ถูกต้อง (ระบุทดสอบเป็น: 123456)');
    }
  };

  const handleWithdrawRequest = (reqId: string, reason: string) => {
    const mockUser: UserType = { id: 'user', orgId: 'org_dopa', username: 'data.subject', fullNameTh: 'ผู้ยื่นคำขอ', fullNameEn: 'Data Subject', email: '', role: 'intake', roles: ['intake'], mfaEnabled: false };
    changeRequestStatus(reqId, 'Withdrawn', mockUser, `ถอนคำขอเนื่องจาก: ${reason}`);
    // Update active tracked view
    const req = getRequestById(reqId);
    if (req) setTrackedRequest(req);
    reloadData();
  };

  const handleUploadAdditionalTrack = (fileName: string, dataUrl: string) => {
    if (!trackedRequest) return;
    const newAtt: Attachment = {
      id: `att_track_${Date.now()}`,
      name: fileName,
      size: Math.round(dataUrl.length * 0.75),
      type: dataUrl.split(';')[0].split(':')[1],
      isMasked: true,
      watermarkApplied: true,
      uploadedAt: new Date().toISOString(),
      fileUrl: dataUrl
    };

    const updated = {
      ...trackedRequest,
      attachments: [...trackedRequest.attachments, newAtt]
    };

    const mockUser: UserType = { id: 'user', orgId: 'org_dopa', username: 'data.subject', fullNameTh: 'ผู้ยื่นคำขอ', fullNameEn: 'Data Subject', email: '', role: 'intake', roles: ['intake'], mfaEnabled: false };
    updateRequest(updated, mockUser, 'UPLOAD_EVIDENCE', `ผู้ยื่นอัปโหลดเอกสารเพิ่มเติมชื่อ: ${fileName}`);
    setTrackedRequest(updated);
    
    // Automatically transition if waiting for info
    if (trackedRequest.status === 'Awaiting Additional Information') {
      changeRequestStatus(trackedRequest.id, 'Completeness Review', mockUser, 'ผู้ยื่นอัปโหลดเอกสารแก้ไขเรียบร้อยแล้ว');
      const updatedReq = getRequestById(trackedRequest.id);
      if (updatedReq) setTrackedRequest(updatedReq);
    }
    
    reloadData();
    alert('อัปโหลดไฟล์เพิ่มเติมเรียบร้อยแล้ว');
  };

  // --- SECURE DOWNLOAD VERIFICATION (Section 3.9) ---
  const handleDownloadCheck = (uuid: string) => {
    const req = requests.find(r => r.uuid === uuid);
    if (!req) {
      setDownloadError('ลิงก์ดาวน์โหลดไม่ถูกต้องหรือหมดอายุการใช้งานแล้ว');
      setView('download');
      return;
    }

    if (req.status !== 'Ready for Delivery' && req.status !== 'Delivered' && req.status !== 'Receipt Confirmed') {
      setDownloadError('เอกสารของคำขอนี้ยังไม่พร้อมส่งมอบ หรือถูกระงับสิทธิ์');
      setView('download');
      return;
    }

    setDownloadRequest(req);
    setDownloadToken(uuid);
    setDownloadError(null);
    setShowDownloadOtpModal(true);
    setView('download');
  };

  const handleVerifyDownloadOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!downloadRequest) return;

    if (downloadOtpCode === '123456') {
      setShowDownloadOtpModal(false);
      // Log downloand access
      const mockSubjectUser: UserType = {
        id: 'subject',
        orgId: downloadRequest.orgId || 'org_dopa',
        username: 'data.subject',
        fullNameTh: `${downloadRequest.requester.firstName} ${downloadRequest.requester.lastName}`,
        fullNameEn: 'Data Subject',
        email: downloadRequest.requester.email,
        role: 'intake',
        roles: ['intake'],
        mfaEnabled: false
      };
      
      addAuditLog('SECURE_DOWNLOAD_FILE', `ผู้ยื่นยืนยัน OTP สำเร็จและดาวน์โหลดไฟล์ส่งมอบ`, mockSubjectUser, downloadRequest.id, downloadRequest.trackingNo);
      
      // Update status if it was not closed
      if (downloadRequest.status === 'Ready for Delivery') {
        changeRequestStatus(downloadRequest.id, 'Delivered', mockSubjectUser, 'ผู้ยื่นดาวน์โหลดข้อมูลผ่านระบบจัดส่งปลอดภัยสำเร็จ');
      }
      
      reloadData();
      
      // Simulate file download by creating mockup file
      const link = document.createElement('a');
      link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(`[CONFIDENTIAL DATA REPORT FOR ${downloadRequest.requester.firstName}]\n\nข้อมูลรายงานการใช้งานของท่าน ได้รับการตรวจสอบและส่งมอบตามสิทธิเรียบร้อยแล้ว.`);
      link.download = `PDPA_EXPORT_${downloadRequest.trackingNo}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('รหัส OTP ไม่ถูกต้อง (ระบุทดสอบเป็น: 123456)');
    }
  };

  // --- STAFF WORKSPACE ACTION CONTROLLERS (Section 3) ---
  
  // Checklist State Management (Section 3.4)
  const [checkItems, setCheckItems] = useState({
    name: false,
    contact: false,
    scope: false,
    identity: false,
    signature: false,
    repDocs: false,
    noticeConsent: false
  });

  const [incompleteComment, setIncompleteComment] = useState('');
  const [showIncompletePanel, setShowIncompletePanel] = useState(false);

  // Initialize checklist when request details page opens
  useEffect(() => {
    if (selectedRequestId) {
      const req = requests.find(r => r.id === selectedRequestId);
      if (req) {
        setCheckItems({
          name: true, // Default true for mock requests
          contact: true,
          scope: true,
          identity: req.identityVerification.status === 'verified',
          signature: req.attachments.some(a => a.name.includes('signature')) || req.contactChannel !== 'web',
          repDocs: req.requesterType === 'representative' ? req.attachments.some(a => a.name.includes('power')) : true,
          noticeConsent: true
        });
        setIncompleteComment('');
        setShowIncompletePanel(false);
      }
    }
  }, [selectedRequestId]);

  const handleCheckItemToggle = (key: keyof typeof checkItems) => {
    setCheckItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleVerifyIdentityQuick = (reqId: string, status: 'verified' | 'rejected', assurance: 'low' | 'medium' | 'high') => {
    if (!activeUser) return;
    const req = getRequestById(reqId);
    if (!req) return;

    req.identityVerification = {
      status,
      assuranceLevel: assurance,
      method: req.contactChannel === 'web' ? 'otp_email' : 'document_check',
      verifiedBy: activeUser.fullNameTh,
      verifiedAt: new Date().toISOString(),
      notes: 'ตรวจสอบผ่านระบบวิเคราะห์เอกสารความถูกต้องแบบแมนนวลสำเร็จ'
    };

    if (status === 'verified') {
      setCheckItems(prev => ({ ...prev, identity: true }));
    }

    updateRequest(req, activeUser, 'VERIFY_IDENTITY', `ยืนยันตัวตนระดับ ${assurance.toUpperCase()} ผลเป็น: ${status === 'verified' ? 'ผ่าน' : 'ปฏิเสธ'}`);
    reloadData();
  };

  const markCompletenessDone = (reqId: string) => {
    if (!activeUser) return;
    changeRequestStatus(reqId, 'Complete', activeUser, 'ตรวจสอบเอกสารครบถ้วนเรียบร้อย เริ่มนับระยะเวลาดำเนินการ SLA');
    reloadData();
  };

  const markCompletenessDeficient = (reqId: string) => {
    if (!activeUser) return;
    
    const missing: string[] = [];
    if (!checkItems.name) missing.push('ชื่อและนามสกุลผู้ยื่นคำขอ');
    if (!checkItems.contact) missing.push('ข้อมูลการติดต่อกลับ');
    if (!checkItems.identity) missing.push('เอกสารยืนยันตัวตน / สำเนาบัตรประชาชนที่ชัดเจน');
    if (!checkItems.signature) missing.push('ลายมือชื่ออิเล็กทรอนิกส์');
    if (!checkItems.repDocs) missing.push('หนังสือมอบอำนาจหรือเอกสารประจำตัวผู้รับมอบอำนาจ');

    const comment = `เอกสารหลักฐานขาดความสมบูรณ์: ขอเอกสารเพิ่มเติมสำหรับ ${missing.join(', ')}. ${incompleteComment}`;
    changeRequestStatus(reqId, 'Awaiting Additional Information', activeUser, comment);
    
    // Auto-generate notification thread message
    const req = getRequestById(reqId);
    if (req) {
      req.messageThread.push({
        id: `msg_auto_${Date.now()}`,
        sender: 'staff',
        senderName: activeUser.fullNameTh,
        message: `เรียน คุณ ${req.requester.firstName} องค์กรขอรับหลักฐานเพิ่มเติมเนื่องจากเอกสารหลักฐานตรวจสอบความสมบูรณ์ไม่ผ่าน คือ: ${missing.join(', ')} กรุณาอัปโหลดเอกสารใหม่เพิ่มเติมเข้าระบบในหน้าติดตามสถานะ`,
        timestamp: new Date().toISOString()
      });
      updateRequest(req, activeUser, 'SEND_MESSAGE', 'ส่งหนังสือเตือนขอเอกสารเพิ่มเติมอ้างอิงสถานะรอการดำเนินการ');
    }

    setShowIncompletePanel(false);
    reloadData();
  };

  // Data Discovery System Owner Assign Task (Section 3.5)
  const [selectedTaskSystem, setSelectedTaskSystem] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('ธนาธร ระบบลูกค้า');
  const [searchQueryParam, setSearchQueryParam] = useState('');

  const handleCreateSearchTask = (reqId: string) => {
    if (!activeUser || !selectedTaskSystem) return;
    const req = getRequestById(reqId);
    if (!req) return;

    const newTask: DataCollectionTask = {
      id: `task_${Date.now()}`,
      systemName: selectedTaskSystem,
      assignee: taskAssignee,
      status: 'pending',
      queryUsed: searchQueryParam || `Search for: ${req.requester.firstName} ${req.requester.lastName} (ID: ${req.requester.idNumber})`,
      uploadedFiles: []
    };

    req.dataCollectionTasks.push(newTask);
    
    // Switch state to data collection
    if (req.status === 'Assigned' || req.status === 'Complete') {
      req.status = 'Data Collection';
      req.statusHistory.push({
        status: 'Data Collection',
        changedAt: new Date().toISOString(),
        changedBy: activeUser.fullNameTh,
        comment: `มอบหมายภารกิจค้นหาข้อมูลไปยังระบบ: ${selectedTaskSystem}`
      });
    }

    updateRequest(req, activeUser, 'CREATE_DATA_TASK', `สร้างงานค้นหาข้อมูลระบบ: ${selectedTaskSystem} มอบให้: ${taskAssignee}`);
    setSelectedTaskSystem('');
    setSearchQueryParam('');
    reloadData();
  };

  const handleOwnerCompleteTask = (reqId: string, taskId: string, isFound: 'found' | 'not_found' | 'not_applicable') => {
    if (!activeUser) return;
    const req = getRequestById(reqId);
    if (!req) return;

    const taskIndex = req.dataCollectionTasks.findIndex((t: DataCollectionTask) => t.id === taskId);
    if (taskIndex === -1) return;

    req.dataCollectionTasks[taskIndex].status = isFound;
    req.dataCollectionTasks[taskIndex].completedAt = new Date().toISOString();
    req.dataCollectionTasks[taskIndex].completedBy = activeUser.fullNameTh;
    req.dataCollectionTasks[taskIndex].dataLineage = `ระบบ ${req.dataCollectionTasks[taskIndex].systemName} -> กวาดค้นหาด้วย SQL / Index -> จัดเก็บไฟล์ใน Object Private Container`;
    
    if (isFound === 'found') {
      // Mock uploading data file
      req.dataCollectionTasks[taskIndex].uploadedFiles = [
        {
          id: `att_export_${Date.now()}`,
          name: `${req.dataCollectionTasks[taskIndex].systemName.replace(/ /g, '_')}_Result.xlsx`,
          size: 32000,
          type: 'application/vnd.ms-excel',
          isMasked: false,
          watermarkApplied: false,
          uploadedAt: new Date().toISOString(),
          fileUrl: 'mock_export_content_url'
        }
      ];
    }

    // Auto transition to Data Owner Review if all tasks complete
    const allDone = req.dataCollectionTasks.every((t: DataCollectionTask) => t.status !== 'pending');
    if (allDone) {
      req.status = 'Data Owner Review';
      req.statusHistory.push({
        status: 'Data Owner Review',
        changedAt: new Date().toISOString(),
        changedBy: activeUser.fullNameTh,
        comment: 'งานค้นหาระบบภายในเสร็จสิ้นครบถ้วน ส่งต่อตรวจเอกสารเผยแพร่'
      });
    }

    updateRequest(req, activeUser, 'COMPLETE_DATA_TASK', `อัปเดตผลภารกิจค้นหาระบบ ${req.dataCollectionTasks[taskIndex].systemName} เป็น: ${isFound}`);
    reloadData();
  };

  // Redaction applied callback (Section 3.6)
  const handleRedactionApplied = (
    reqId: string,
    redactRecord: Omit<RedactionRecord, 'id' | 'timestamp' | 'operator'>
  ) => {
    if (!activeUser) return;
    const req = getRequestById(reqId);
    if (!req) return;

    const newRecord: RedactionRecord = {
      ...redactRecord,
      id: `red_${Date.now()}`,
      operator: activeUser.fullNameTh,
      timestamp: new Date().toISOString()
    };

    req.redactionRecords.push(newRecord);
    
    if (req.status !== 'Redaction Required') {
      req.status = 'Redaction Required';
      req.statusHistory.push({
        status: 'Redaction Required',
        changedAt: new Date().toISOString(),
        changedBy: activeUser.fullNameTh,
        comment: 'เริ่มเซ็นเซอร์ปกปิดข้อมูลส่วนบุคคลบุคคลอื่นในรายงาน'
      });
    }

    updateRequest(req, activeUser, 'REDACT_DOCUMENT', `ปกปิดข้อมูลส่วนที่: ${newRecord.itemRedacted} ในไฟล์: ${newRecord.itemId}`);
    reloadData();
  };

  const handleSaveRedactionAll = (reqId: string) => {
    if (!activeUser) return;
    const req = getRequestById(reqId);
    if (!req) return;

    // Transition to DPO or Legal review
    changeRequestStatus(reqId, 'DPO or Legal Review', activeUser, 'บันทึกการถมดำและส่งต่อให้กฎหมาย/DPO พิจารณาฐานสิทธิ์และเอกสารแจ้งผล');
    reloadData();
  };

  // Fee management (Section 3.8)
  const [feeForm, setFeeForm] = useState({
    noFee: true,
    paperPages: 0,
    computerPages: 0,
    certifications: 0,
    otherItem: '',
    otherCost: 0
  });

  const handleFeeSubmit = (e: React.FormEvent, reqId: string) => {
    e.preventDefault();
    if (!activeUser) return;
    const req = getRequestById(reqId);
    if (!req) return;

    const ratePaper = config?.feeRates.paperCopyRate || 1.0;
    const rateComputer = config?.feeRates.computerPrintRate || 3.0;
    const rateCert = config?.feeRates.certificationRate || 5.0;

    let subtotal = 0;
    const otherCostsList: {item: string, cost: number}[] = [];

    if (!feeForm.noFee) {
      subtotal += feeForm.paperPages * ratePaper;
      subtotal += feeForm.computerPages * rateComputer;
      subtotal += feeForm.certifications * rateCert;
      if (feeForm.otherItem && feeForm.otherCost > 0) {
        otherCostsList.push({ item: feeForm.otherItem, cost: feeForm.otherCost });
        subtotal += feeForm.otherCost;
      }
    }

    req.feeCalculation = {
      noFee: feeForm.noFee,
      paperPages: feeForm.paperPages,
      computerPages: feeForm.computerPages,
      certificationsCount: feeForm.certifications,
      otherCosts: otherCostsList,
      totalCalculated: subtotal,
      isApproved: true,
      paymentStatus: subtotal > 0 ? 'pending' : 'waived'
    };

    updateRequest(req, activeUser, 'CALCULATE_FEE', `คำนวณอัตราค่าธรรมเนียมสำเร็จ ยอดสุทธิ: ${subtotal} บาท (สถานะ: ${subtotal > 0 ? 'รอนัดชำระ' : 'ยกเว้น'})`);
    reloadData();
    alert('คำนวณและบันทึกอัตราค่าธรรมเนียมเรียบร้อยแล้ว');
  };

  // Simulating Payment Upload / Verification
  const handleMarkAsPaid = (reqId: string) => {
    if (!activeUser) return;
    const req = getRequestById(reqId);
    if (!req) return;

    req.feeCalculation.paymentStatus = 'paid';
    req.feeCalculation.paymentReceiptNo = `REC-${Date.now().toString().substr(-6)}`;
    req.feeCalculation.paidAt = new Date().toISOString();

    updateRequest(req, activeUser, 'RECEIVE_PAYMENT', `ยืนยันการชำระเงินเรียบร้อย ใบเสร็จเลขที่: ${req.feeCalculation.paymentReceiptNo}`);
    
    // Automatically advance state
    if (req.status === 'Awaiting Payment' || req.status === 'Fee Notification') {
      changeRequestStatus(reqId, 'Ready for Delivery', activeUser, 'ชำระค่าธรรมเนียมแล้ว เตรียมส่งข้อมูลสิทธิ์ทางช่องทางปลอดภัย');
    }
    
    reloadData();
  };

  // DPO and Approver Decisions (Section 3.7)
  const [decisionType, setDecisionType] = useState<'approved' | 'partially_approved' | 'denied' | 'no_data'>('approved');
  const [denialBasisCode, setDenialBasisCode] = useState('');
  const [legalBasisInput, setLegalBasisInput] = useState('มาตรา 30 วรรคหนึ่ง แห่งพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562');
  const [decisionNotes, setDecisionNotes] = useState('');

  const handleSubmitDecisionProposal = (reqId: string) => {
    if (!activeUser) return;
    const req = getRequestById(reqId);
    if (!req) return;

    const reasons: string[] = [];
    if (decisionType === 'denied') {
      const selectedReason = config?.rejectionReasons.find(r => r.code === denialBasisCode);
      reasons.push(selectedReason ? selectedReason.labelTh : 'การปฏิเสธเนื่องจากสิทธิขัดกับกฎหมายหลัก');
    } else if (decisionType === 'partially_approved') {
      reasons.push('ปกปิดข้อมูลส่วนบุคคลของบุคคลอื่นเพื่อรักษาความปลอดภัย');
    } else {
      reasons.push('ข้อมูลส่วนบุคคลถูกต้องตรงตามขอบเขตและตรวจสอบไม่พบข้อยกเว้นปฏิเสธสิทธิ');
    }

    req.decision = {
      result: decisionType,
      reasons,
      legalBasisText: legalBasisInput,
      dpoRecommendation: decisionNotes,
      dpoCheckedAt: new Date().toISOString(),
      dpoName: activeUser.fullNameTh
    };

    req.status = 'Approval Pending';
    req.statusHistory.push({
      status: 'Approval Pending',
      changedAt: new Date().toISOString(),
      changedBy: activeUser.fullNameTh,
      comment: `DPO ยื่นข้อเสนอมุมมองกฎหมายสรุปผล: ${decisionType === 'approved' ? 'อนุมัติทั้งหมด' : decisionType === 'partially_approved' ? 'อนุมัติบางส่วน' : 'ปฏิเสธคำขอ'}`
    });

    updateRequest(req, activeUser, 'SUBMIT_DPO_DECISION', `บันทึกคำพิจารณาผลและขออนุมัติอย่างเป็นทางการ`);
    reloadData();
  };

  const handleApproverSign = (reqId: string, resultStatus: 'Approved' | 'Partially Approved' | 'Denied' | 'No Data Found') => {
    if (!activeUser) return;
    const req = getRequestById(reqId);
    if (!req) return;

    if (req.decision) {
      req.decision.approvedAt = new Date().toISOString();
      req.decision.approverName = activeUser.fullNameTh;
      req.decision.approverOpinion = 'เห็นชอบและยินยอมให้ลงนามหนังสือตามประกาศ DPO';
    }

    // Change status
    changeRequestStatus(reqId, resultStatus, activeUser, `ผู้อนุมัติมีคำสั่งอย่างเป็นทางการ: ${resultStatus}`);

    // If approved and has fees, go to payment. If not, go to Ready for Delivery (digital)
    if (['Approved', 'Partially Approved'].includes(resultStatus)) {
      if (req.feeCalculation && req.feeCalculation.totalCalculated > 0 && req.feeCalculation.paymentStatus === 'pending') {
        changeRequestStatus(reqId, 'Fee Notification', activeUser, 'แจ้งเรียกเก็บค่าธรรมเนียมตามใบแจ้งหนี้ก่อนส่งมอบข้อมูล');
      } else {
        changeRequestStatus(reqId, 'Ready for Delivery', activeUser, 'ไม่มีค่าธรรมเนียมหรือยกเว้นแล้ว เตรียมส่งข้อมูลสิทธิ์');
      }
    } else {
      // Rejections or no data go straight to close or delivery of reject letter
      changeRequestStatus(reqId, 'Ready for Delivery', activeUser, 'พร้อมส่งมอบหนังสือชี้แจงคำปฏิเสธ / ไม่พบข้อมูล');
    }

    reloadData();
  };

  // Delivery package (Section 3.9)
  const handleMarkAsDelivered = (reqId: string) => {
    if (!activeUser) return;
    changeRequestStatus(reqId, 'Delivered', activeUser, 'เจ้าหน้าที่ทำการจัดส่งหนังสือราชการและข้อมูลสำเร็จ');
    
    // Automatically close after delivery
    setTimeout(() => {
      changeRequestStatus(reqId, 'Closed', activeUser, 'คำขอสิ้นสุดกระบวนการ บันทึกระยะเวลาดำเนินการเฉลี่ยปิดงาน');
      reloadData();
    }, 1000);
  };

  // Legal hold toggles (Section 3.11)
  const handleToggleLegalHold = (reqId: string) => {
    if (!activeUser) return;
    const req = getRequestById(reqId);
    if (!req) return;

    req.legalHold = !req.legalHold;
    updateRequest(req, activeUser, 'TOGGLE_LEGAL_HOLD', `ปรับเปลี่ยนสถานะ Legal Hold เป็น: ${req.legalHold ? 'เปิดใช้งาน (ห้ามทำลาย)' : 'ปิดการใช้งาน'}`);
    reloadData();
  };

  // Retention & Destruction simulator (Section 3.11)
  const handleSimulateDestruction = (reqId: string) => {
    if (!activeUser) return;
    const req = getRequestById(reqId);
    if (!req) return;

    if (req.legalHold) {
      alert('ไม่สามารถทำลายข้อมูลที่อยู่ภายใต้ Legal Hold คดีความได้');
      return;
    }

    req.status = 'Destroyed';
    req.destroyedDate = new Date().toISOString();
    req.destroyedBy = activeUser.fullNameTh;
    req.destroyedWitness = 'วิลาวัลย์ ตรวจสอบ (Auditor)';
    
    // Remove attachments payload to simulate clean delete
    req.attachments = [];
    req.dataCollectionTasks.forEach((t: DataCollectionTask) => t.uploadedFiles = []);

    req.statusHistory.push({
      status: 'Destroyed',
      changedAt: new Date().toISOString(),
      changedBy: activeUser.fullNameTh,
      comment: 'ดำเนินการทำลายสำเนาหลักฐานตามกำหนดอายุจัดเก็บ 2 ปี เรียบร้อยแล้ว'
    });

    updateRequest(req, activeUser, 'DESTROY_EXPIRED_DATA', `ลบทำลายไฟล์และเอกสารหลักฐานระบุตัวตนถาวรตาม Retention Policy พยานร่วมตรวจสอบ: ${req.destroyedWitness}`);
    reloadData();
    alert('ทำลายเอกสารหลักฐานและปิดประวัติเรียบร้อยแล้ว');
  };

  // Compliance Config Edit Panel (Section 1)
  const [configForm, setConfigForm] = useState({
    completenessCheckDays: 15,
    deficiencyResponseDays: 10,
    processingDays: 30,
    extensionDays: 30,
    feePaper: 1.0,
    feePrint: 3.0,
    feeCert: 5.0,
    changeReason: ''
  });

  useEffect(() => {
    if (config) {
      setConfigForm({
        completenessCheckDays: config.sla.completenessCheckDays,
        deficiencyResponseDays: config.sla.deficiencyResponseDays,
        processingDays: config.sla.processingDays,
        extensionDays: config.sla.extensionDays,
        feePaper: config.feeRates.paperCopyRate,
        feePrint: config.feeRates.computerPrintRate,
        feeCert: config.feeRates.certificationRate,
        changeReason: ''
      });
    }
  }, [config]);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser || !config) return;

    if (!configForm.changeReason) {
      alert('กรุณากรอกเหตุผลในการแก้ไขกฎเกณฑ์นโยบายความสอดคล้อง');
      return;
    }

    const updatedConfig: ComplianceConfig = {
      ...config,
      version: config.version + 1,
      effectiveDate: new Date().toISOString().split('T')[0],
      sla: {
        ...config.sla,
        completenessCheckDays: configForm.completenessCheckDays,
        deficiencyResponseDays: configForm.deficiencyResponseDays,
        processingDays: configForm.processingDays,
        extensionDays: configForm.extensionDays
      },
      feeRates: {
        paperCopyRate: configForm.feePaper,
        computerPrintRate: configForm.feePrint,
        certificationRate: configForm.feeCert
      },
      updatedBy: activeUser.fullNameTh,
      updatedAt: new Date().toISOString(),
      changeReason: configForm.changeReason
    };

    saveComplianceConfig(updatedConfig, activeUser, configForm.changeReason);
    reloadData();
    alert('บันทึกค่ากำหนดความสอดคล้องทางกฎหมายเรียบร้อยแล้ว');
  };

  // SLA extension (Section 5)
  const handleExtendSla = (reqId: string, reason: string) => {
    if (!activeUser) return;
    const req = getRequestById(reqId);
    if (!req) return;

    req.slaExtended = true;
    req.slaExtensionReason = reason;
    req.slaExtendedBy = activeUser.fullNameTh;
    
    // Add 30 days to deadline date
    if (req.slaDeadlineDate) {
      const deadline = new Date(req.slaDeadlineDate);
      deadline.setDate(deadline.getDate() + (config?.sla.extensionDays || 30));
      req.slaDeadlineDate = deadline.toISOString();
    }

    // Add event
    req.slaEvents.push({
      id: `evt_ext_${Date.now()}`,
      type: 'extend',
      timestamp: new Date().toISOString(),
      reason: `ขยายเวลา SLA: ${reason}`,
      operator: activeUser.fullNameTh
    });

    updateRequest(req, activeUser, 'EXTEND_SLA_TIMELINE', `ขยายระยะเวลารับสิทธิเพิ่ม ${config?.sla.extensionDays || 30} วันด้วยเหตุจำเป็น`);
    reloadData();
    alert('ขยายเวลา SLA สำเร็จ');
  };

  // Staff manual message post
  const [chatMessage, setChatMessage] = useState('');
  const handleSendMessage = (e: React.FormEvent, reqId: string, senderRole: 'staff' | 'user') => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const req = getRequestById(reqId);
    if (!req) return;

    const newMsg: MessageThread = {
      id: `msg_${Date.now()}`,
      sender: senderRole,
      senderName: senderRole === 'staff' ? (activeUser?.fullNameTh || 'เจ้าหน้าที่กฎหมาย') : `${req.requester.firstName} ${req.requester.lastName}`,
      message: chatMessage,
      timestamp: new Date().toISOString()
    };

    req.messageThread.push(newMsg);
    
    if (senderRole === 'staff' && activeUser) {
      updateRequest(req, activeUser, 'SEND_MESSAGE', `เจ้าหน้าที่ส่งข้อความสื่อสารเพิ่มเติมเลขคำขอ: ${req.trackingNo}`);
    } else {
      const mockSubjectUser: UserType = { id: 'user', orgId: 'org_dopa', username: 'data.subject', fullNameTh: 'ผู้ยื่นคำขอ', fullNameEn: 'Data Subject', email: '', role: 'intake', roles: ['intake'], mfaEnabled: false };
      updateRequest(req, mockSubjectUser, 'SEND_MESSAGE', `ผู้ยื่นส่งข้อความติดต่อกลับเลขคำขอ: ${req.trackingNo}`);
    }

    setChatMessage('');
    reloadData();
    
    // Update tracked view if public is using it
    if (senderRole === 'user') {
      setTrackedRequest(req);
    }
  };

  // Clean UI lookup helper for active requests details
  const activeRequestObj = selectedRequestId ? requests.find(r => r.id === selectedRequestId) : null;

  return (
    <div className="min-h-screen flex flex-col font-sans">
      
      {/* Header Navigation Bar */}
      <div className="bg-slate-900 text-slate-200 px-4 py-2 flex flex-wrap items-center justify-between text-xs gap-2 select-none border-b border-slate-800 z-10">
        <div className="flex items-center gap-2 font-bold">
          <Shield className="h-4 w-4 text-brand-500" />
          <span>ระบบบริหารคำขอเข้าถึงข้อมูลส่วนบุคคล (PDPA Portal)</span>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {/* If user is logged in as staff */}
          {activeUser ? (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-brand-400 font-bold bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
                🏢 {initialOrganizations.find((o) => o.id === activeUser.orgId)?.nameTh || 'หน่วยงานทั่วไป'} ({activeUser.fullNameTh})
              </span>

              <button
                onClick={() => { setView('public'); setPublicTab('landing'); }}
                className={`px-3 py-1 rounded font-bold transition ${
                  view === 'public' || view === 'tracking'
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                หน้าหลักประชาชน
              </button>

              <button
                onClick={() => { setView('internal'); setInternalTab('dashboard'); setSelectedRequestId(null); }}
                className={`px-3 py-1 rounded font-bold transition ${
                  view === 'internal'
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                ระบบงานเจ้าหน้าที่ (Staff Portal)
              </button>

              {/* Show role switcher dropdown ONLY IF user holds multiple roles */}
              {activeUser.roles && activeUser.roles.length > 1 ? (
                <div className="flex items-center gap-1.5 border-l border-slate-700 pl-3">
                  <span className="text-slate-400 font-semibold text-[11px]">สลับบทบาทในหน้าที่:</span>
                  <select
                    value={activeUser.role}
                    onChange={(e) => handleRoleChange(e.target.value as Role)}
                    className="bg-slate-800 border border-brand-500/50 text-brand-300 rounded px-2 py-0.5 font-bold text-[11px] focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    {[
                      { value: 'intake', label: 'Intake (รับคำขอ)' },
                      { value: 'owner', label: 'Data Owner (สืบค้น)' },
                      { value: 'dpo', label: 'DPO (กฎหมาย/ถมดำ)' },
                      { value: 'approver', label: 'Approver (อนุมัติ)' },
                      { value: 'auditor', label: 'Auditor (ตรวจสอบ)' },
                      { value: 'admin', label: 'Admin (ผู้ดูแลระบบ)' }
                    ]
                      .filter((opt) => activeUser.roles.includes(opt.value as Role))
                      .map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 border-l border-slate-700 pl-3">
                  <span className="text-slate-400 font-semibold text-[11px]">สิทธิ์การทำงาน:</span>
                  <span className="bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded font-bold text-[11px] uppercase">
                    {activeUser.role}
                  </span>
                </div>
              )}

              <button
                onClick={() => {
                  setCurrentUser(null);
                  setActiveUser(null);
                  setSelectedRequestId(null);
                  setView('public');
                  setPublicTab('landing');
                  reloadData();
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-2.5 py-1 rounded transition text-xs shadow-sm cursor-pointer"
              >
                ออกจากระบบ (Logout)
              </button>
            </div>
          ) : (
            /* If public visitor */
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold px-3 py-1 rounded transition flex items-center gap-1.5 text-xs"
            >
              <Lock className="h-3.5 w-3.5 text-brand-400" />
              <span>เจ้าหน้าที่เข้าสู่ระบบ (Staff Login)</span>
            </button>
          )}
        </div>
      </div>

      {/* Staff Login Modal */}
      <StaffLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setActiveUser(user);
          reloadData();
          setView('internal');
          setInternalTab('dashboard');
        }}
      />

      {/* --- RENDER VIEW 1: PUBLIC REQUEST PORTAL --- */}
      {view === 'public' && (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="font-bold text-slate-900 text-base leading-tight">ระบบยื่นคำขอเข้าถึงข้อมูลส่วนบุคคล (PDPA Access Portal)</h1>
                  <p className="text-xs text-slate-500">ยื่นคำขอใช้สิทธิและรับข้อมูลความมั่นคงปลอดภัยตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562</p>
                </div>
              </div>

              <div className="flex gap-4 text-xs font-semibold text-slate-700">
                <button
                  onClick={() => setPublicTab('landing')}
                  className={`hover:text-brand-600 transition ${publicTab === 'landing' ? 'text-brand-600 border-b-2 border-brand-600 pb-1' : ''}`}
                >
                  หน้าหลักสิทธิ์
                </button>
                <button
                  onClick={() => setPublicTab('submit')}
                  className={`hover:text-brand-600 transition ${publicTab === 'submit' ? 'text-brand-600 border-b-2 border-brand-600 pb-1' : ''}`}
                >
                  กรอกคำขอออนไลน์
                </button>
                <button
                  onClick={() => {
                    const no = prompt('กรุณาระบุเลขติดตามคำขอตัวอย่าง เพื่อความรวดเร็ว:\n- REQ-2026-0001 (สถานะอนุมัติแล้ว)\n- REQ-2026-0002 (สถานะรอเอกสารเพิ่มเติม)\n- REQ-2026-0003 (สถานะยื่นใหม่)\n- REQ-2026-0004 (อยู่ระหว่างค้นหา)');
                    if (no) {
                      setTrackNo(no);
                      const req = requests.find(r => r.trackingNo.toUpperCase() === no.trim().toUpperCase());
                      if (req) {
                        setTrackedRequest(req);
                        setShowOtpModal(true);
                      } else {
                        alert('ไม่พบเลขคำขอดังกล่าว');
                      }
                    }
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg transition"
                >
                  ติดตามสถานะคำขอ
                </button>
              </div>
            </div>
          </header>

          {/* Body Content */}
          <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
            
            {/* Landing / Rights Information Section */}
            {publicTab === 'landing' && (
              <div className="space-y-6">
                
                {/* Visual Intro Banner */}
                <div className="bg-gradient-to-r from-brand-900 to-slate-900 text-white rounded-2xl p-8 shadow-md relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-3 max-w-xl">
                    <span className="inline-block bg-brand-500/20 text-brand-300 border border-brand-500/40 text-[11px] px-3.5 py-1.5 rounded-full font-bold mb-1 shadow-sm tracking-wide">
                      พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (มาตรา 30)
                    </span>
                    <h2 className="text-2xl md:text-3xl font-bold leading-snug pt-1">
                      มีสิทธิขอเข้าถึงและรับสำเนาข้อมูลส่วนบุคคลของท่านที่อยู่ในความดูแลขององค์กร
                    </h2>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      ท่านสามารถยื่นคำร้องขอตรวจสอบ หรือคัดลอกไฟล์ประวัติการจอง การเข้าใช้บริการ ประวัติพนักงาน หรือบันทึกข้อมูลอื่นที่เป็นของท่านได้อย่างรวดเร็ว ปลอดภัย และถูกต้องตามขั้นตอน
                    </p>
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setPublicTab('submit')}
                        className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold py-2.5 px-5 rounded-lg shadow-sm transition"
                      >
                        ยื่นแบบคำร้องออนไลน์ทันที
                      </button>
                      <button
                        onClick={() => {
                          setTrackNo('REQ-2026-0001');
                          setTrackedRequest(requests[0]);
                          setShowOtpModal(true);
                        }}
                        className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold py-2.5 px-5 rounded-lg transition"
                      >
                        ติดตามสถานะคำร้องเดิม
                      </button>
                    </div>
                  </div>
                  {/* Icon illustration */}
                  <Shield className="h-40 w-40 text-brand-500/10 shrink-0 hidden md:block" />
                </div>

                {/* Steps Process */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
                    <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-600 font-bold flex items-center justify-center text-sm">1</div>
                    <span className="block font-bold text-slate-800 text-sm">ยื่นคำขอและยืนยันตัว</span>
                    <p className="text-xs text-slate-500 leading-relaxed">กรอกข้อมูล เลือกขอบเขตข้อมูล อัปโหลดภาพบัตรที่ผ่านระบบเซนเซอร์และยืนยัน OTP</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
                    <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-600 font-bold flex items-center justify-center text-sm">2</div>
                    <span className="block font-bold text-slate-800 text-sm">คัดกรองความสมบูรณ์</span>
                    <p className="text-xs text-slate-500 leading-relaxed">เจ้าหน้าที่รับคำกรอง ตรวจสอบข้อมูลครบถ้วนภายใน 15 วัน หากขาดจะแจ้งกลับทันที</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
                    <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-600 font-bold flex items-center justify-center text-sm">3</div>
                    <span className="block font-bold text-slate-800 text-sm">พิจารณาและคัดลอก</span>
                    <p className="text-xs text-slate-500 leading-relaxed">ค้นหาข้อมูล สั่งถมดำเซนเซอร์ปกปิดบุคคลภายนอก และอนุมัติปิดงานภายใน 30 วัน</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
                    <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-600 font-bold flex items-center justify-center text-sm">4</div>
                    <span className="block font-bold text-slate-800 text-sm">รับข้อมูลปลอดภัย</span>
                    <p className="text-xs text-slate-500 leading-relaxed">รับรหัสดาวน์โหลดไฟล์ผ่าน Signed URL อายุสั้น หรือรับเอกสารด้วยตนเองที่สำนักงาน</p>
                  </div>
                </div>

                {/* ค้นหาและติดตามสถานะคำขอ */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Search className="h-4 w-4 text-brand-600" />
                    <span>ค้นหาและติดตามสถานะคำร้องขอข้อมูล</span>
                  </h3>
                  <form onSubmit={handleTrackSubmit} className="flex gap-2 flex-col sm:flex-row items-stretch">
                    <input
                      type="text"
                      placeholder="กรอกเลขคำขอ เช่น REQ-2026-0001"
                      value={trackNo}
                      onChange={(e) => setTrackNo(e.target.value)}
                      className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-brand-500 bg-white text-slate-900"
                    />
                    <button
                      type="submit"
                      className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold py-2 px-5 rounded-lg transition shrink-0"
                    >
                      ค้นหาคำร้อง
                    </button>
                  </form>
                  {trackingError && (
                    <div className="text-red-600 text-xs mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>{trackingError}</span>
                    </div>
                  )}
                </div>

                {/* Warning & Disclaimers */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-900 text-xs">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block font-bold mb-1">ข้อพิจารณาทางกฎหมาย (Legal Note):</span>
                    <p className="leading-relaxed">
                      {config?.disclaimerText || 'ระบบนี้เป็นเครื่องมือสนับสนุนการดำเนินงาน ไม่ใช่ระบบให้คำปรึกษากฎหมายโดยอัตโนมัติ การอนุมัติ ปฏิเสธ หรือเปิดเผยข้อมูลต้องผ่านการพิจารณาของเจ้าหน้าที่ผู้รับผิดชอบ'}
                    </p>
                  </div>
                </div>

                {/* FAQ details (Progressive disclosures) */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-brand-600" />
                    <span>คำถามที่พบบ่อยเกี่ยวกับการขอสิทธิข้อมูล (FAQs)</span>
                  </h3>
                  
                  <div className="divide-y divide-slate-100 space-y-3 pt-2">
                    <div className="pt-2 space-y-1">
                      <span className="block font-semibold text-slate-700 text-xs">มีค่าใช้จ่ายในการยื่นคำร้องขอข้อมูลหรือไม่?</span>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        การดาวน์โหลดเอกสารอิเล็กทรอนิกส์ผ่านระบบพอร์ทัลไม่มีค่าใช้จ่าย แต่หากต้องการให้จัดพิมพ์สำเนาลงกระดาษ A4 (ไม่เกินแผ่นละ 1 บาท) หรือรับรองสำเนาถูกต้อง (ไม่เกินคำรับรองละ 5 บาท) จะมีค่าธรรมเนียมตามที่องค์กรกำหนด
                      </p>
                    </div>
                    <div className="pt-3 space-y-1">
                      <span className="block font-semibold text-slate-700 text-xs">หากยื่นเอกสารไม่ครบถ้วน ต้องดำเนินการภายในกี่วัน?</span>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        หากเจ้าหน้าที่แจ้งขอเอกสารเพิ่มเติม ระบบจะหยุดนับเวลา SLA ชั่วคราว และท่านต้องอัปโหลดข้อมูลเพิ่มเติมภายในเวลาไม่น้อยกว่า 10 วันนับจากวันที่ได้รับแจ้ง มิฉะนั้นคำขอจะถูกจำหน่ายตามระบบ
                      </p>
                    </div>
                    <div className="pt-3 space-y-1">
                      <span className="block font-semibold text-slate-700 text-xs">ความมั่นคงปลอดภัยของการแนบรูปบัตรประชาชนเป็นอย่างไร?</span>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        ระบบอัปโหลดของเราติดตั้งตัวช่วยเซนเซอร์ข้อมูลอ่อนไหวอัตโนมัติบนเบราว์เซอร์ เพื่อให้ท่านปกปิดข้อมูลศาสนา และเลขเลเซอร์บาร์โค้ด พร้อมทั้งปั๊มลายน้ำระบุวัตถุประสงค์โดยตรงก่อนข้อมูลจะส่งมาถึงเซิร์ฟเวอร์
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Submission Form Wizard */}
            {publicTab === 'submit' && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden max-w-3xl mx-auto">
                <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">แบบคำขอรับสิทธิข้อมูลส่วนบุคคลออนไลน์</h3>
                    <p className="text-xs text-slate-500">กรุณากรอกข้อมูลส่วนสำคัญตามขั้นตอนการขอสิทธิ์</p>
                  </div>
                  <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
                    ขั้นตอนที่ {wizardStep} / 3
                  </span>
                </div>

                <form onSubmit={submitPublicRequest} className="p-6 space-y-6">
                  
                  {/* Step 1: Requester Details */}
                  {wizardStep === 1 && (
                    <div className="space-y-4">
                      <div className="flex gap-4 border-b border-slate-100 pb-4 mb-4">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                          <input
                            type="radio"
                            name="reqType"
                            checked={reqType === 'self'}
                            onChange={() => setReqType('self')}
                            className="text-brand-600 focus:ring-brand-500"
                          />
                          <span>ขอยื่นคำขอเป็นเจ้าของข้อมูลด้วยตนเอง</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                          <input
                            type="radio"
                            name="reqType"
                            checked={reqType === 'representative'}
                            onChange={() => setReqType('representative')}
                            className="text-brand-600 focus:ring-brand-500"
                          />
                          <span>ขอยื่นแทนในฐานะผู้รับมอบอำนาจ</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-700">ชื่อจริง (Thai First Name) <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required
                            placeholder="เช่น สมเกียรติ"
                            value={requesterForm.firstName}
                            onChange={(e) => setRequesterForm({...requesterForm, firstName: e.target.value})}
                            className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-brand-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-700">นามสกุล (Thai Last Name) <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required
                            placeholder="เช่น รักไทย"
                            value={requesterForm.lastName}
                            onChange={(e) => setRequesterForm({...requesterForm, lastName: e.target.value})}
                            className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-brand-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-medium text-slate-700">เลขบัตรประจำตัวประชาชน <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required
                            placeholder="เช่น 1-1234-56789-01-2"
                            value={requesterForm.idNumber}
                            onChange={(e) => setRequesterForm({...requesterForm, idNumber: e.target.value})}
                            className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-brand-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-700">เบอร์โทรศัพท์ติดต่อ <span className="text-red-500">*</span></label>
                          <input
                            type="tel"
                            required
                            placeholder="เช่น 081-234-5678"
                            value={requesterForm.phone}
                            onChange={(e) => setRequesterForm({...requesterForm, phone: e.target.value})}
                            className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-brand-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">อีเมลติดต่อ <span className="text-red-500">*</span></label>
                        <input
                          type="email"
                          required
                          placeholder="เช่น somkiat@example.com"
                          value={requesterForm.email}
                          onChange={(e) => setRequesterForm({...requesterForm, email: e.target.value})}
                          className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-brand-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">ที่อยู่จัดส่งเอกสารทางไปรษณีย์ (ระบุหากเลือกส่งไปรษณีย์)</label>
                        <textarea
                          placeholder="ระบุที่อยู่จัดส่งโดยละเอียด..."
                          value={requesterForm.address}
                          onChange={(e) => setRequesterForm({...requesterForm, address: e.target.value})}
                          className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-brand-500 h-16"
                        />
                      </div>

                      {/* Rep Details Form */}
                      {reqType === 'representative' && (
                        <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-4 mt-6">
                          <span className="block font-bold text-teal-900 text-xs flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            ข้อมูลสำหรับผู้รับมอบอำนาจ (Authorized Representative)
                          </span>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-slate-700">ชื่อจริงผู้รับมอบอำนาจ <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                required
                                value={repForm.firstName}
                                onChange={(e) => setRepForm({...repForm, firstName: e.target.value})}
                                className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-brand-500 bg-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-slate-700">นามสกุลผู้รับมอบอำนาจ <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                required
                                value={repForm.lastName}
                                onChange={(e) => setRepForm({...repForm, lastName: e.target.value})}
                                className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-brand-500 bg-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-slate-700">เลขบัตรผู้แทนสิทธิ <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                required
                                value={repForm.idNumber}
                                onChange={(e) => setRepForm({...repForm, idNumber: e.target.value})}
                                className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-brand-500 bg-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-slate-700">เบอร์โทรผู้แทน <span className="text-red-500">*</span></label>
                              <input
                                type="tel"
                                required
                                value={repForm.phone}
                                onChange={(e) => setRepForm({...repForm, phone: e.target.value})}
                                className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-brand-500 bg-white"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">ขอบเขตอำนาจกระทำการแทนตามใบมอบอำนาจ <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              required
                              value={repForm.scope}
                              onChange={(e) => setRepForm({...repForm, scope: e.target.value})}
                              className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-brand-500 bg-white"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end pt-4">
                        <button
                          type="button"
                          onClick={() => setWizardStep(2)}
                          className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold py-2 px-6 rounded-lg transition"
                        >
                          ขั้นตอนถัดไป
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Scope & Systems */}
                  {wizardStep === 2 && (
                    <div className="space-y-4">
                      
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">ประเภทสิทธิที่ต้องการขอใช้ <span className="text-red-500">*</span></label>
                        <select
                          value={scopeForm.requestType}
                          onChange={(e) => setScopeForm({...scopeForm, requestType: e.target.value as any})}
                          className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-brand-500"
                        >
                          <option value="access">ขอเข้าถึงข้อมูลส่วนบุคคล (Right to Access)</option>
                          <option value="copy">ขอรับสำเนาข้อมูลส่วนบุคคล (Right to obtain a copy)</option>
                          <option value="access_and_copy">ขอเข้าถึงพร้อมขอรับสำเนาข้อมูล (Access & Copy)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">รายละเอียดระบุข้อมูลส่วนบุคคลที่ท่านต้องการเข้าถึง <span className="text-red-500">*</span></label>
                        <textarea
                          required
                          rows={3}
                          placeholder="กรุณาระบุหมวดหมู่ข้อมูล เช่น รายการสมาชิกภาพ, ประวัติสั่งซื้อผลิตภัณฑ์, ไฟล์เสียงสนทนากับเจ้าหน้าที่คอลเซ็นเตอร์..."
                          value={scopeForm.description}
                          onChange={(e) => setScopeForm({...scopeForm, description: e.target.value})}
                          className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-brand-500"
                        />
                      </div>

                      {/* Systems selector (Data sources checklist) */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-700">ระบุระบบที่จัดเก็บข้อมูลเท่าที่ทราบ (Target Databases)</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {[
                            'ระบบบริหารลูกค้า (CRM)',
                            'ระบบสมาชิกเว็บไซต์และแอป',
                            'ระบบบริหารทรัพยากรบุคคล (HR)',
                            'ระบบการเงินและชำระค่าสินค้า',
                            'กล้องวงจรปิดนิรภัย (CCTV)'
                          ].map((sys) => (
                            <label
                              key={sys}
                              className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer text-xs transition ${
                                scopeForm.systems.includes(sys)
                                  ? 'bg-brand-50 border-brand-300 font-semibold'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={scopeForm.systems.includes(sys)}
                                onChange={() => handleSystemToggle(sys)}
                                className="rounded text-brand-600 focus:ring-brand-500"
                              />
                              <span>{sys}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-700">ขอบเขตวันและเวลาเริ่มต้นข้อมูล</label>
                          <input
                            type="date"
                            value={scopeForm.timeframeStart}
                            onChange={(e) => setScopeForm({...scopeForm, timeframeStart: e.target.value})}
                            className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-brand-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-700">ขอบเขตวันและเวลาสิ้นสุดข้อมูล</label>
                          <input
                            type="date"
                            value={scopeForm.timeframeEnd}
                            onChange={(e) => setScopeForm({...scopeForm, timeframeEnd: e.target.value})}
                            className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-brand-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">รูปแบบการรับข้อมูลที่ต้องการ (Delivery preference) <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
                          {[
                            { code: 'secure_download', label: 'ดาวน์โหลดไฟล์ออนไลน์ปลอดภัย', desc: 'ไม่มีค่าธรรมเนียม' },
                            { code: 'pickup', label: 'เข้าตรวจดู ณ สำนักงาน', desc: 'ไม่มีค่าธรรมเนียม' },
                            { code: 'registered_mail', label: 'จัดส่งสำเนาทางไปรษณีย์', desc: 'คิดค่าธรรมเนียมกระดาษ/ส่ง' }
                          ].map((del) => (
                            <label
                              key={del.code}
                              className={`flex flex-col p-2.5 border rounded-lg cursor-pointer transition ${
                                scopeForm.deliveryMethod === del.code
                                  ? 'bg-brand-50 border-brand-400 font-semibold ring-1 ring-brand-300'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <input
                                type="radio"
                                name="deliveryMethod"
                                checked={scopeForm.deliveryMethod === del.code}
                                onChange={() => setScopeForm({...scopeForm, deliveryMethod: del.code as any})}
                                className="sr-only"
                              />
                              <span className="text-xs text-slate-900">{del.label}</span>
                              <span className="text-[10px] text-slate-400 font-bold">{del.desc}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between pt-4">
                        <button
                          type="button"
                          onClick={() => setWizardStep(1)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-6 rounded-lg transition"
                        >
                          ย้อนกลับ
                        </button>
                        <button
                          type="button"
                          onClick={() => setWizardStep(3)}
                          className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold py-2 px-6 rounded-lg transition"
                        >
                          ขั้นตอนถัดไป
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Identity & Consents */}
                  {wizardStep === 3 && (
                    <div className="space-y-6">
                      
                      {/* Identity Verification Component */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 block">อัปโหลดหลักฐานและป้องกันความเป็นส่วนตัว</label>
                        <p className="text-[11px] text-slate-400">กรุณาอัปโหลดรูปภาพบัตรประชาชนและใช้ระบบขีดฆ่าถมดำเพื่อปิดบังข้อมูลศาสนา/เลเซอร์โค้ด</p>
                        
                        <WatermarkedUpload
                          label={reqType === 'self' ? 'บัตรประชาชนของเจ้าของสิทธิ' : 'บัตรประจำตัวผู้รับมอบอำนาจ'}
                          orgName="สถาบันคุ้มครองข้อมูลองค์กร"
                          onFileProcessed={handleFileUpload}
                        />

                        {reqType === 'representative' && (
                          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
                            <span className="block text-xs font-bold text-slate-700">แนบเอกสารหนังสือมอบอำนาจ (Power of Attorney)</span>
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setUploadedAttachments(prev => [...prev, { name: file.name, data: 'mock_pdf_poa_blob' }]);
                                }
                              }}
                              className="text-xs block w-full text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                            />
                          </div>
                        )}
                      </div>

                      {/* E-signature draw pad */}
                      <div className="border-t border-slate-100 pt-4">
                        <SignaturePad
                          onSave={(data) => setSignatureData(data)}
                          onClear={() => setSignatureData(null)}
                        />
                      </div>

                      {/* Consent forms checkboxes */}
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                        <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600">
                          <input
                            type="checkbox"
                            required
                            checked={consentAccepted}
                            onChange={(e) => setConsentAccepted(e.target.checked)}
                            className="rounded text-brand-600 focus:ring-brand-500 mt-0.5"
                          />
                          <span>ขอยินยอมให้องค์กรเก็บ รวบรวม และประมวลผลข้อมูลส่วนบุคคลของข้าพเจ้าที่ยื่นในคำขอนี้ เพื่อใช้สำหรับตรวจสอบสิทธิและจัดส่งข้อมูลตามความต้องการของสิทธินี้เท่านั้นตาม <strong className="text-brand-600 hover:underline">นโยบายความเป็นส่วนตัว (Privacy Notice)</strong></span>
                        </label>
                        <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600">
                          <input
                            type="checkbox"
                            required
                            checked={accuracyCertified}
                            onChange={(e) => setAccuracyCertified(e.target.checked)}
                            className="rounded text-brand-600 focus:ring-brand-500 mt-0.5"
                          />
                          <span>ขอรับรองว่าข้อมูลข้างต้น เอกสารประจำตัว และหนังสือมอบอำนาจ (ถ้ามี) เป็นข้อมูลที่ถูกต้องและแท้จริงทุกประการ</span>
                        </label>
                      </div>

                      <div className="flex justify-between pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setWizardStep(2)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-6 rounded-lg transition"
                        >
                          ย้อนกลับ
                        </button>
                        <button
                          type="submit"
                          className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold py-2.5 px-8 rounded-lg transition shadow-sm"
                        >
                          ยืนยันการส่งคำขออย่างเป็นทางการ
                        </button>
                      </div>

                    </div>
                  )}

                </form>
              </div>
            )}

            {/* Submitted Success Panel */}
            {publicTab === 'submitted_success' && isNewRequestSuccess && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden max-w-lg mx-auto p-8 text-center space-y-6">
                <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                  <CheckCircle className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-800 text-lg">ยื่นคำขอรับสิทธิข้อมูลส่วนบุคคลสำเร็จ!</h3>
                  <p className="text-xs text-slate-500">
                    คำร้องของท่านได้รับการบันทึกเข้าระบบแล้ว และเริ่มกระบวนการคัดกรองตัวตน
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2 max-w-sm mx-auto">
                  <span className="text-xs text-slate-400 block font-bold">เลขอ้างอิงติดตามผลคำขอ (Tracking Number)</span>
                  <span className="text-xl font-mono font-bold text-slate-800 block select-all">
                    {isNewRequestSuccess.trackingNo}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    *กรุณาจดจำเลขนี้เพื่อติดตามสถานะผลและดาวน์โหลดไฟล์*
                  </span>
                </div>

                <div className="p-3 bg-brand-50 border border-brand-100 text-brand-800 rounded-xl text-[11px] leading-relaxed max-w-sm mx-auto">
                  <strong>ข้อมูลประกอบระบบ Sandbox:</strong> <br />
                  รหัสผ่านแบบใช้ครั้งเดียว (OTP) สำหรับยืนยันตัวตนเพื่อสืบค้นสถานะคือ: <strong>123456</strong>
                </div>

                <div className="flex gap-2 justify-center pt-2">
                  <button
                    onClick={() => setPublicTab('landing')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2 px-5 rounded-lg transition"
                  >
                    กลับสู่หน้าแรก
                  </button>
                  <button
                    onClick={() => {
                      setTrackNo(isNewRequestSuccess.trackingNo);
                      setTrackedRequest(isNewRequestSuccess);
                      setShowOtpModal(true);
                    }}
                    className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold py-2 px-5 rounded-lg transition shadow-sm"
                  >
                    เปิดหน้าติดตามผลเลย
                  </button>
                </div>
              </div>
            )}

          </main>
        </div>
      )}

      {/* --- RENDER VIEW 2: PUBLIC TRACKING AND TIMELINE --- */}
      {view === 'tracking' && trackedRequest && (
        <div className="flex-1 flex flex-col bg-slate-50">
          <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <button
                onClick={() => setView('public')}
                className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>กลับพอร์ทัลสาธารณะ</span>
              </button>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">ติดตามคำขอเลขที่</span>
                <span className="text-sm font-bold text-slate-800">{trackedRequest.trackingNo}</span>
              </div>
            </div>
          </header>

          <main className="flex-1 max-w-5xl w-full mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left sidebar: Request summary */}
            <div className="md:col-span-1 space-y-6">
              
              {/* Status card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">สถานะคำร้องปัจจุบัน</span>
                
                <div>
                  <span className="inline-block bg-brand-50 text-brand-700 border border-brand-100 rounded-full px-3 py-1 text-xs font-bold">
                    {trackedRequest.status}
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>วันที่ส่งคำขอ:</span>
                    <span className="font-semibold">{convertToThaiDate(trackedRequest.submissionDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ประเภทสิทธิ:</span>
                    <span className="font-semibold uppercase">{trackedRequest.requestDetails.requestType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ช่องทางรับมอบ:</span>
                    <span className="font-semibold text-brand-600">
                      {trackedRequest.requestDetails.deliveryMethod === 'secure_download' ? 'ดาวน์โหลดออนไลน์' : trackedRequest.requestDetails.deliveryMethod === 'pickup' ? 'รับ ณ สำนักงาน' : 'ส่งทางไปรษณีย์'}
                    </span>
                  </div>
                </div>

                {/* Secure Download Link if Ready */}
                {['Ready for Delivery', 'Delivered', 'Receipt Confirmed'].includes(trackedRequest.status) && (
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleDownloadCheck(trackedRequest.uuid)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
                    >
                      <Download className="h-4 w-4" />
                      <span>ดาวน์โหลดสำเนาข้อมูลของท่าน</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Upload extra files when requested */}
              {trackedRequest.status === 'Awaiting Additional Information' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
                  <span className="block font-bold text-amber-900 text-xs flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    เจ้าหน้าที่ร้องขอหลักฐานเพิ่มเติม
                  </span>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    กรุณาถ่ายรูปเอกสารที่ถูกต้องหรืออัปเดตไฟล์ให้เหมาะสมเพื่อดำเนินการประมวลผลต่อ
                  </p>
                  
                  <WatermarkedUpload
                    label="เอกสารเพิ่มเติมที่ร้องขอ"
                    orgName="สถาบันคุ้มครองข้อมูลองค์กร"
                    onFileProcessed={handleUploadAdditionalTrack}
                  />
                </div>
              )}

              {/* Withdraw request action */}
              {!['Closed', 'Withdrawn', 'Destroyed'].includes(trackedRequest.status) && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                  <button
                    onClick={() => {
                      const reason = prompt('กรุณากรอกเหตุผลความจำเป็นในการขอถอนสิทธิยื่นคำขอนี้:');
                      if (reason) {
                        handleWithdrawRequest(trackedRequest.id, reason);
                      }
                    }}
                    className="text-xs text-red-500 hover:text-red-700 font-medium transition"
                  >
                    ต้องการถอนคำร้องขอเข้าถึงข้อมูล (Withdraw)
                  </button>
                </div>
              )}
            </div>

            {/* Right details: Status timeline and communication */}
            <div className="md:col-span-2 space-y-6">
              
              {/* Timeline list */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">บันทึกขั้นตอนการดำเนินการ (Timeline History)</span>
                
                <div className="relative pl-6 border-l border-slate-200 space-y-6 pt-2">
                  {trackedRequest.statusHistory.slice().reverse().map((h, i) => (
                    <div key={i} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[30px] top-0.5 h-4.5 w-4.5 rounded-full border-2 border-white bg-brand-500 flex items-center justify-center text-[10px] text-white">
                        ✓
                      </span>
                      <div className="text-xs font-bold text-slate-800">{h.status}</div>
                      <div className="text-[10px] text-slate-400">{convertToThaiDate(h.changedAt)} โดย {h.changedBy}</div>
                      {h.comment && (
                        <div className="mt-1 p-2 bg-slate-50 border border-slate-100 rounded text-slate-600 text-[11px] leading-relaxed">
                          {h.comment}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat Communication panel */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-96">
                <div className="bg-slate-50 border-b border-slate-100 p-4">
                  <span className="block font-bold text-slate-800 text-xs">ช่องทางติดต่อเจ้าหน้าที่โดยตรง (Message Board)</span>
                  <span className="text-[10px] text-slate-500">สอบถามรายละเอียด ยื่นข้อซักถาม หรือส่งคำอธิบายเพิ่มเติม</span>
                </div>
                
                {/* Chat items */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {trackedRequest.messageThread.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      ยังไม่มีประวัติการส่งข้อความ สนทนาถามตอบด้านล่างได้ทันที
                    </div>
                  ) : (
                    trackedRequest.messageThread.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[80%] rounded-lg p-2.5 text-xs ${
                          msg.sender === 'user'
                            ? 'bg-brand-50 text-brand-900 border border-brand-100 ml-auto'
                            : 'bg-slate-100 text-slate-900 mr-auto'
                        }`}
                      >
                        <span className="font-bold text-[10px] text-slate-400 mb-0.5">{msg.senderName}</span>
                        <p>{msg.message}</p>
                        <span className="text-[9px] text-slate-400 text-right mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString('th-TH')}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <form
                  onSubmit={(e) => handleSendMessage(e, trackedRequest.id, 'user')}
                  className="border-t border-slate-100 p-2 flex gap-2 bg-slate-50"
                >
                  <input
                    type="text"
                    required
                    placeholder="พิมพ์ข้อความสอบถามส่งเจ้าหน้าที่ที่นี่..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <button
                    type="submit"
                    className="bg-brand-600 hover:bg-brand-700 text-white p-2 rounded-lg transition"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>

            </div>

          </main>
        </div>
      )}

      {/* --- RENDER VIEW 3: SECURE DOWNLOAD VERIFICATION VIEW --- */}
      {view === 'download' && (
        <div className="flex-1 flex items-center justify-center p-6 bg-slate-950 text-white relative">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative space-y-6">
            
            <div className="text-center space-y-2">
              <Lock className="h-12 w-12 text-brand-500 mx-auto" />
              <h3 className="font-bold text-lg">ระบบดาวน์โหลดข้อมูลเข้ารหัสปลอดภัย</h3>
              <p className="text-xs text-slate-400">
                Secure Data Download Portal (Section 3.9)
              </p>
            </div>

            {downloadError ? (
              <div className="p-4 bg-red-950/50 border border-red-800 text-red-300 rounded-xl text-xs text-center space-y-3">
                <p>{downloadError}</p>
                <button
                  type="button"
                  onClick={() => setView('public')}
                  className="bg-red-800 hover:bg-red-700 text-white px-4 py-1.5 rounded text-xs font-semibold"
                >
                  กลับหน้าแรกพอร์ทัล
                </button>
              </div>
            ) : (
              showDownloadOtpModal && downloadRequest && (
                <form onSubmit={handleVerifyDownloadOtp} className="space-y-4">
                  <div className="p-3.5 bg-brand-950/40 border border-brand-900 text-brand-300 rounded-xl text-xs leading-relaxed space-y-1">
                    <span className="block font-bold">ยืนยันรหัสเข้าถึง (Two-Factor OTP Verification):</span>
                    <span>ระบบได้ทดลองส่ง OTP 6 หลัก ไปที่เบอร์โทร {downloadRequest.requester.phone} หรืออีเมล {downloadRequest.requester.email} ของท่านแล้ว</span>
                    <span className="block text-[10px] text-slate-500 font-mono mt-1">TOKEN: {downloadToken}</span>
                  </div>

                  <div className="space-y-1 text-slate-300">
                    <label className="text-xs font-medium">ระบุรหัส OTP (สำหรับทดสอบกรอก: 123456)</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="XXXXXX"
                      value={downloadOtpCode}
                      onChange={(e) => setDownloadOtpCode(e.target.value)}
                      className="w-full text-center font-mono text-base font-bold bg-slate-800 border border-slate-700 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-brand-500 text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition shadow-md"
                  >
                    ถอดรหัสลับและดาวน์โหลดรายงานข้อมูล
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setView('public')}
                    className="w-full text-slate-400 hover:text-slate-300 text-xs py-1.5 transition"
                  >
                    ยกเลิกกระบวนการ
                  </button>
                </form>
              )
            )}

            <div className="text-[10px] text-slate-600 text-center">
              สิทธิข้อมูลส่วนบุคคลของหน่วยงาน พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
            </div>
          </div>
        </div>
      )}

      {/* --- RENDER VIEW 4: INTERNAL WORKSPACE STAFF PORTAL --- */}
      {view === 'internal' && activeUser && (
        <div className="flex-1 flex flex-col md:flex-row">
          
          {/* Internal Sidebar Menu */}
          <aside className="w-full md:w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col justify-between shrink-0">
            <div className="p-4 space-y-6">
              
              <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
                <div className="h-8 w-8 rounded bg-brand-500 flex items-center justify-center text-white font-bold text-xs">
                  PDPA
                </div>
                <div>
                  <span className="block font-bold text-white text-xs">หน่วยงานควบคุมข้อมูล</span>
                  <span className="block text-[9px] text-slate-500">ระบบบริหารสิทธิมาตรา 30</span>
                </div>
              </div>

              {/* Navigation Items */}
              <nav className="space-y-1">
                {[
                  { id: 'dashboard', label: 'หน้าแผงควบคุมหลัก', icon: Layers, roles: ['admin', 'intake', 'dpo', 'approver', 'auditor'] },
                  { id: 'requests', label: 'รายการคำขอทั้งหมด', icon: List, roles: ['admin', 'intake', 'dpo', 'approver', 'auditor', 'owner'] },
                  { id: 'kanban', label: 'Kanban บอร์ดสิทธิ์', icon: Layers, roles: ['admin', 'intake', 'dpo', 'approver', 'owner'] },
                  { id: 'users', label: 'จัดการผู้ใช้และสิทธิ์', icon: UserCheck, roles: ['admin'] },
                  { id: 'compliance', label: 'Compliance ตั้งค่ากฎหมาย', icon: Scale, roles: ['admin', 'dpo'] },
                  { id: 'templates', label: 'Template หนังสือราชการ', icon: FileCheck2, roles: ['admin', 'dpo'] },
                  { id: 'retention', label: 'ทำลายและจัดเก็บข้อมูล', icon: Trash2, roles: ['admin', 'dpo'] },
                  { id: 'audit', label: 'รายงานบันทึกตรวจสอบสิทธิ์', icon: Lock, roles: ['admin', 'auditor', 'dpo'] }
                ].map((item) => {
                  const userRoles = activeUser.roles || [activeUser.role];
                  const hasAccess = item.roles.some((r) => userRoles.includes(r as Role));
                  if (!hasAccess) return null;

                  const isActive = internalTab === item.id;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setInternalTab(item.id as any);
                        setSelectedRequestId(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition ${
                        isActive
                          ? 'bg-brand-600 text-white'
                          : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      
                      {/* Mini count badges */}
                      {item.id === 'requests' && requests.length > 0 && (
                        <span className="bg-slate-800 text-slate-300 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                          {requests.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

            </div>

            {/* Bottom active user display */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-2 text-xs">
              <User className="h-4 w-4 text-brand-500" />
              <div>
                <span className="block font-bold text-white leading-tight">{activeUser.fullNameTh}</span>
                <span className="block text-[9px] text-slate-500 capitalize">{activeUser.role} Portal</span>
              </div>
            </div>

          </aside>

          {/* Core Content Area */}
          <main className="flex-1 p-6 space-y-6 overflow-y-auto">
            
            {/* SOD Compliance Risk Warning Banner */}
            {activeUser.sodWarnings && activeUser.sodWarnings.length > 0 && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex gap-3 text-amber-900 text-xs shadow-sm">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-sm mb-1 text-amber-900">แจ้งเตือนความเสี่ยงหลักการคานอำนาจ (Segregation of Duties - SOD Warning):</span>
                  {activeUser.sodWarnings.map((warn, idx) => (
                    <p key={idx} className="leading-relaxed font-medium">{warn}</p>
                  ))}
                  <span className="block text-[10px] text-amber-700 mt-1 font-mono">ข้อแนะนำ: บัญชีผู้ใช้นี้ถือสิทธิ์ซ้ำซ้อน ควรแยกสิทธิ์ให้เจ้าหน้าที่อื่นลงนามอนุมัติเพื่อความสอดคล้องตามมาตรฐาน Audit</span>
                </div>
              </div>
            )}
            {selectedRequestId && activeRequestObj ? (
              <div className="space-y-6">
                
                {/* Header card with back button */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedRequestId(null)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-lg transition"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-base">{activeRequestObj.trackingNo}</h3>
                        <span className="bg-brand-50 text-brand-700 text-xs px-2 py-0.5 rounded-full font-bold">
                          {activeRequestObj.status}
                        </span>
                        {activeRequestObj.slaPaused && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            SLA Paused (รอข้อมูลผู้ยื่น)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">ผู้ขอ: {activeRequestObj.requester.firstName} {activeRequestObj.requester.lastName} ({activeRequestObj.requesterType === 'self' ? 'เจ้าของสิทธิยื่นเอง' : 'ผู้แทนตามหนังสือมอบอำนาจ'})</p>
                    </div>
                  </div>

                  {/* SLA Countdowns (Section 5) */}
                  <div className="flex gap-4 text-xs font-bold text-slate-700">
                    <div className="text-center p-2 bg-slate-50 rounded border border-slate-200 min-w-[100px]">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">SLA ดำเนินการ</span>
                      <span className={`text-sm block ${activeRequestObj.slaRemainingDays < 0 ? 'text-rose-600 animate-pulse' : activeRequestObj.slaRemainingDays <= 7 ? 'text-amber-600' : 'text-slate-800'}`}>
                        {activeRequestObj.slaRemainingDays} วัน
                      </span>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded border border-slate-200 min-w-[100px] flex flex-col justify-between items-center">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">ขยายระยะเวลา</span>
                      <span className="text-xs block text-slate-800 font-bold">
                        {activeRequestObj.slaExtended ? 'ขยายแล้ว (+30 วัน)' : 'ยังไม่เคยขยาย'}
                      </span>
                      {!activeRequestObj.slaExtended && ['admin', 'dpo'].includes(activeUser.role) && !['Closed', 'Delivered', 'Withdrawn', 'Destroyed'].includes(activeRequestObj.status) && (
                        <button
                          type="button"
                          onClick={() => {
                            const reason = prompt('ระบุเหตุจำเป็นหรือเหตุขัดข้องในการขยายระยะเวลาสืบค้นข้อมูล:');
                            if (reason) {
                              handleExtendSla(activeRequestObj.id, reason);
                            }
                          }}
                          className="mt-1 bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded transition"
                        >
                          ขยายเวลา +30 วัน
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Main Action Modules for Request Details */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Intake details, identity, completeness checks */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* General Request Metadata */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                      <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">ขอบเขตข้อมูลที่ร้องขอ (Request Scope)</span>
                      
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-800">
                        {activeRequestObj.requestDetails.description}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <span className="text-slate-400 block font-semibold">เป้าหมายระบบงานสืบค้น:</span>
                          <span className="font-bold text-slate-800">
                            {activeRequestObj.requestDetails.targetSystems.join(', ') || 'สืบค้นทุกระบบที่บันทึกข้อมูลบุคคล'}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-400 block font-semibold">ช่วงเวลาข้อมูล:</span>
                          <span className="font-bold text-slate-800">
                            {activeRequestObj.requestDetails.timeframeStart ? `${activeRequestObj.requestDetails.timeframeStart} ถึง ${activeRequestObj.requestDetails.timeframeEnd}` : 'ข้อมูลทั้งหมดที่มีประวัติ'}
                          </span>
                        </div>
                      </div>

                      {/* Attachments Section */}
                      <div className="space-y-2">
                        <span className="text-slate-400 text-xs font-semibold block">เอกสารประกอบการยื่นสิทธิ์:</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {activeRequestObj.attachments.map((att) => (
                            <div key={att.id} className="flex items-center justify-between border border-slate-200 rounded-lg p-2 text-xs bg-white hover:bg-slate-50">
                              <div className="flex items-center gap-2 truncate">
                                <FileText className="h-4 w-4 text-brand-500 shrink-0" />
                                <div className="truncate">
                                  <span className="block font-bold text-slate-800 truncate">{att.name}</span>
                                  <span className="text-[10px] text-slate-400 font-medium">({Math.round(att.size / 1024)} KB)</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {att.isMasked && (
                                  <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded font-bold">
                                    Masked
                                  </span>
                                )}
                                {att.watermarkApplied && (
                                  <span className="bg-brand-100 text-brand-800 text-[9px] px-1.5 py-0.5 rounded font-bold">
                                    Watermark
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Log download of uploader ID
                                    addAuditLog('VIEW_FILE', `เจ้าหน้าที่เปิดดูเอกสารประกอบ: ${att.name}`, activeUser, activeRequestObj.id, activeRequestObj.trackingNo);
                                    if (att.fileUrl.startsWith('data:image')) {
                                      const w = window.open();
                                      w?.document.write(`<img src="${att.fileUrl}" style="max-width:100%"/>`);
                                    } else {
                                      alert('กำลังจำลองเปิดดูเนื้อหาเอกสารตามมาตรการความลับข้อมูล');
                                    }
                                  }}
                                  className="text-brand-600 hover:text-brand-800 p-1 font-semibold"
                                >
                                  ดูไฟล์
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Module A: Identity & Completeness verification (INTAKE ROLE) */}
                    {['intake', 'admin', 'dpo'].includes(activeUser.role) && (
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <UserCheck className="h-4 w-4 text-brand-600" />
                          <span>การตรวจสอบข้อมูลและสิทธิยื่นเรื่อง (Intake Verification & Completeness)</span>
                        </span>

                        {/* Assurance select */}
                        <div className="flex gap-4 items-center flex-wrap pb-2 border-b border-slate-100">
                          <div className="text-xs">
                            <span className="block font-semibold text-slate-500">ผลยืนยันตน:</span>
                            <span className={`font-bold ${activeRequestObj.identityVerification.status === 'verified' ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {activeRequestObj.identityVerification.status === 'verified' ? 'ผ่านการยืนยันแล้ว' : 'ยังไม่ผ่าน/รอการตรวจ'}
                            </span>
                          </div>
                          
                          {activeRequestObj.identityVerification.status !== 'verified' && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleVerifyIdentityQuick(activeRequestObj.id, 'verified', 'medium')}
                                className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold py-1 px-3 rounded transition"
                              >
                                ยืนยันผ่าน (Medium Assurance)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleVerifyIdentityQuick(activeRequestObj.id, 'verified', 'high')}
                                className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold py-1 px-3 rounded transition"
                              >
                                ผ่าน (High Assurance)
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Checklist tools */}
                        <div className="space-y-3">
                          <span className="block text-xs font-semibold text-slate-600">เช็คลิสต์ตรวจเอกสารสิทธิตามประกาศ พ.ร.บ. (Section 3.4)</span>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            {[
                              { key: 'name', label: 'ชื่อ-นามสกุลครบถ้วนชัดเจน' },
                              { key: 'contact', label: 'ที่อยู่/เบอร์ติดต่อครบถ้วน' },
                              { key: 'scope', label: 'รายละเอียดระบุตัวตนครบถ้วน' },
                              { key: 'identity', label: 'หลักฐานแสดงตัวตนผ่านเกณฑ์' },
                              { key: 'signature', label: 'ลงนามลายมือชื่ออิเล็กทรอนิกส์' },
                              { key: 'repDocs', label: 'หนังสือมอบอำนาจและเอกสารประกอบ (ถ้ามี)' },
                              { key: 'noticeConsent', label: 'การรับทราบเงื่อนไข Privacy Notice' }
                            ].map((item) => (
                              <label
                                key={item.key}
                                className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={(checkItems as any)[item.key]}
                                  onChange={() => handleCheckItemToggle(item.key as any)}
                                  className="rounded text-brand-600 focus:ring-brand-500"
                                />
                                <span>{item.label}</span>
                              </label>
                            ))}
                          </div>

                          {/* Completeness submission bar */}
                          {['Submitted', 'Received', 'Identity Verification', 'Completeness Review', 'Awaiting Additional Information'].includes(activeRequestObj.status) && (
                            <div className="pt-4 border-t border-slate-100 flex gap-2">
                              
                              {showIncompletePanel ? (
                                <div className="w-full space-y-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                  <label className="block text-xs font-semibold text-amber-900">ระบุรายละเอียดเอกสารหลักฐานที่ขาด:</label>
                                  <textarea
                                    required
                                    value={incompleteComment}
                                    onChange={(e) => setIncompleteComment(e.target.value)}
                                    placeholder="ระบุ เช่น ภาพบัตรประชาชนเบลอมาก, ข้อมูลหนังสือมอบอำนาจกรอกวันหมดอายุผู้แทนไม่ชัด..."
                                    className="w-full text-xs border border-amber-300 rounded p-2 bg-white"
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      type="button"
                                      onClick={() => setShowIncompletePanel(false)}
                                      className="text-slate-500 text-xs px-2.5"
                                    >
                                      ยกเลิก
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => markCompletenessDeficient(activeRequestObj.id)}
                                      className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-1 px-3 rounded text-xs transition"
                                    >
                                      ส่งแจ้งเตือนขาดเอกสาร (Pause SLA)
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => markCompletenessDone(activeRequestObj.id)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg text-xs transition"
                                  >
                                    เอกสารครบถ้วนแล้ว (Mark Complete)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setShowIncompletePanel(true)}
                                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-lg text-xs transition"
                                  >
                                    ปฏิเสธ / แจ้งขอเพิ่ม
                                  </button>
                                </>
                              )}

                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Module B: Data Gathering Tasking (Section 3.5) */}
                    {['owner', 'admin', 'intake', 'dpo'].includes(activeUser.role) && (
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Search className="h-4 w-4 text-brand-600" />
                          <span>งานค้นหาและสืบค้นข้อมูลระบบภายใน (Data Discovery & Gathering)</span>
                        </span>

                        {/* Task assigner form for admin/DPO */}
                        {['admin', 'intake', 'dpo'].includes(activeUser.role) && (
                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                            <span className="block font-bold text-slate-700 text-xs">สร้างงานค้นหาข้อมูลระบบใหม่</span>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold block">เลือกฐานข้อมูล:</label>
                                <select
                                  value={selectedTaskSystem}
                                  onChange={(e) => setSelectedTaskSystem(e.target.value)}
                                  className="w-full text-xs border border-slate-300 rounded p-1.5 bg-white"
                                >
                                  <option value="">-- โปรดเลือกระบบ --</option>
                                  <option value="ระบบบริหารความสัมพันธ์ลูกค้า (CRM)">ระบบ CRM</option>
                                  <option value="ระบบสมาชิกเว็บไซต์และ Mobile App">ระบบสมาชิก Web/App</option>
                                  <option value="ระบบทรัพยากรบุคคล (HRIS)">ระบบ HR (สำหรับประวัติงาน)</option>
                                  <option value="ระบบการเงินและบัญชี">ระบบการเงิน</option>
                                  <option value="กล้องวงจรปิดนิรภัย (CCTV)">กล้อง CCTV</option>
                                </select>
                              </div>
                              
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold block">ผู้รับผิดชอบงาน:</label>
                                <select
                                  value={taskAssignee}
                                  onChange={(e) => setTaskAssignee(e.target.value)}
                                  className="w-full text-xs border border-slate-300 rounded p-1.5 bg-white"
                                >
                                  <option value="ธนาธร ระบบลูกค้า">ธนาธร (ฝ่าย CRM)</option>
                                  <option value="สมรศรี งานบุคคล">สมรศรี (ฝ่าย HR)</option>
                                  <option value="กิตติพงษ์ รับเรื่อง">กิตติพงษ์ (ความปลอดภัย CCTV)</option>
                                </select>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleCreateSearchTask(activeRequestObj.id)}
                                disabled={!selectedTaskSystem}
                                className={`font-semibold py-1.5 px-3 rounded text-xs transition flex items-center justify-center gap-1 ${
                                  selectedTaskSystem ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>มอบหมายสืบค้น</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Discovery Tasks list */}
                        <div className="space-y-3 pt-2">
                          <span className="block text-xs font-semibold text-slate-600">รายการภารกิจที่กำลังค้นหา:</span>
                          {activeRequestObj.dataCollectionTasks.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                              ยังไม่ได้มอบหมายภารกิจระบบสืบค้นในคำร้องนี้
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {activeRequestObj.dataCollectionTasks.map((t) => (
                                <div key={t.id} className="border border-slate-200 rounded-lg p-3 space-y-2 text-xs bg-white">
                                  <div className="flex justify-between items-center flex-wrap gap-2">
                                    <div>
                                      <span className="font-bold text-slate-800">{t.systemName}</span>
                                      <span className="text-[10px] text-slate-400 block">ผู้รับผิดชอบ: {t.assignee}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      t.status === 'found' ? 'bg-emerald-100 text-emerald-800' :
                                      t.status === 'not_found' ? 'bg-rose-100 text-rose-800' :
                                      t.status === 'in_progress' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                                      'bg-slate-100 text-slate-500'
                                    }`}>
                                      {t.status === 'found' ? 'พบข้อมูล' : t.status === 'not_found' ? 'ไม่พบข้อมูล' : t.status === 'in_progress' ? 'กำลังสืบค้น' : 'รอการดำเนินงาน'}
                                    </span>
                                  </div>

                                  <div className="text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded font-mono break-all">
                                    คำสืบค้น: {t.queryUsed}
                                  </div>

                                  {/* Lineage documentation (Section 3.5) */}
                                  {t.dataLineage && (
                                    <div className="text-[9px] text-slate-400 font-bold block">
                                      Lineage: {t.dataLineage}
                                    </div>
                                  )}

                                  {/* System Owner task completion action simulation */}
                                  {t.status === 'pending' || t.status === 'in_progress' ? (
                                    activeUser.role === 'owner' || activeUser.role === 'admin' ? (
                                      <div className="flex gap-2 pt-1.5 border-t border-slate-100 justify-end">
                                        <button
                                          type="button"
                                          onClick={() => handleOwnerCompleteTask(activeRequestObj.id, t.id, 'found')}
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1 px-2.5 rounded transition"
                                        >
                                          ✓ อัปโหลดผล (พบข้อมูล)
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleOwnerCompleteTask(activeRequestObj.id, t.id, 'not_found')}
                                          className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold py-1 px-2.5 rounded transition"
                                        >
                                          ✗ อัปเดตไม่พบข้อมูล
                                        </button>
                                      </div>
                                    ) : null
                                  ) : (
                                    t.uploadedFiles.length > 0 && (
                                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 p-1 rounded font-bold mt-1">
                                        <FileSpreadsheet className="h-3.5 w-3.5" />
                                        <span>แนบไฟล์ผลลัพธ์: {t.uploadedFiles[0].name} (พร้อมนำเข้าระบบถมดำ)</span>
                                      </div>
                                    )
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Module C: Document Redaction Panel (DPO/LEGAL ROLE) */}
                    {['dpo', 'admin'].includes(activeUser.role) && (
                      <div className="space-y-4">
                        <RedactionCanvas
                          onRedactApplied={(record) => handleRedactionApplied(activeRequestObj.id, record)}
                          onSaveAll={() => handleSaveRedactionAll(activeRequestObj.id)}
                        />
                      </div>
                    )}

                  </div>

                  {/* Right Column: Legal basis checks, fee rules, double-signed decisions */}
                  <div className="lg:col-span-1 space-y-6">
                    
                    {/* Module D: Fee rules calculator (Section 3.8) */}
                    {['intake', 'admin', 'dpo'].includes(activeUser.role) && (
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <DollarSign className="h-4.5 w-4.5 text-brand-600" />
                          <span>การจัดการค่าธรรมเนียมสิทธิ (Fee Management)</span>
                        </span>

                        <form onSubmit={(e) => handleFeeSubmit(e, activeRequestObj.id)} className="space-y-3">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                            <input
                              type="checkbox"
                              checked={feeForm.noFee}
                              onChange={(e) => setFeeForm({ ...feeForm, noFee: e.target.checked })}
                              className="rounded text-brand-600 focus:ring-brand-500"
                            />
                            <span>ขอยกเว้นค่าธรรมเนียมให้คำขอร้องนี้</span>
                          </label>

                          {!feeForm.noFee && (
                            <div className="space-y-2.5 pt-1 border-t border-slate-100 text-xs">
                              <div className="flex justify-between items-center">
                                <span>คัดสำเนากระดาษ A4 (แผ่นละ {config?.feeRates.paperCopyRate} บ.):</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={feeForm.paperPages}
                                  onChange={(e) => setFeeForm({ ...feeForm, paperPages: parseInt(e.target.value) || 0 })}
                                  className="w-16 border rounded p-1 text-center"
                                />
                              </div>
                              
                              <div className="flex justify-between items-center">
                                <span>สั่งพิมพ์คอมพิวเตอร์ A4 (แผ่นละ {config?.feeRates.computerPrintRate} บ.):</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={feeForm.computerPages}
                                  onChange={(e) => setFeeForm({ ...feeForm, computerPages: parseInt(e.target.value) || 0 })}
                                  className="w-16 border rounded p-1 text-center"
                                />
                              </div>

                              <div className="flex justify-between items-center">
                                <span>รับรองสำเนาถูกต้อง (ชุดละ {config?.feeRates.certificationRate} บ.):</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={feeForm.certifications}
                                  onChange={(e) => setFeeForm({ ...feeForm, certifications: parseInt(e.target.value) || 0 })}
                                  className="w-16 border rounded p-1 text-center"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                                <input
                                  type="text"
                                  placeholder="ค่าส่ง / ค่าแรงพิเศษ"
                                  value={feeForm.otherItem}
                                  onChange={(e) => setFeeForm({ ...feeForm, otherItem: e.target.value })}
                                  className="border rounded p-1 text-xs"
                                />
                                <input
                                  type="number"
                                  placeholder="บาท"
                                  value={feeForm.otherCost || ''}
                                  onChange={(e) => setFeeForm({ ...feeForm, otherCost: parseInt(e.target.value) || 0 })}
                                  className="border rounded p-1 text-xs text-center"
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-2 font-bold text-xs text-slate-800">
                            <span>คำนวณราคาสุทธิ:</span>
                            <span className="text-sm text-brand-600">
                              {feeForm.noFee ? 0 : (
                                feeForm.paperPages * (config?.feeRates.paperCopyRate || 1.0) +
                                feeForm.computerPages * (config?.feeRates.computerPrintRate || 3.0) +
                                feeForm.certifications * (config?.feeRates.certificationRate || 5.0) +
                                feeForm.otherCost
                              )} บาท
                            </span>
                          </div>

                          <button
                            type="submit"
                            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 rounded-lg text-xs transition"
                          >
                            บันทึกการประเมินราคา
                          </button>
                        </form>

                        {/* Payment verification action (Section 3.8) */}
                        {activeRequestObj.feeCalculation.totalCalculated > 0 && (
                          <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                            <div className="flex justify-between text-xs text-slate-600">
                              <span>สถานะชำระเงิน:</span>
                              <span className={`font-bold ${activeRequestObj.feeCalculation.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600 animate-pulse'}`}>
                                {activeRequestObj.feeCalculation.paymentStatus === 'paid' ? 'ชำระและออกบิลแล้ว' : 'รอยืนยันการโอน'}
                              </span>
                            </div>
                            
                            {activeRequestObj.feeCalculation.paymentStatus !== 'paid' && (
                              <button
                                type="button"
                                onClick={() => handleMarkAsPaid(activeRequestObj.id)}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded text-xs font-semibold transition"
                              >
                                ✓ ยืนยันสลิปโอนเงิน (Mark Paid)
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Module E: Double-Signed Decision maker (Section 3.7) */}
                    {['dpo', 'approver', 'admin'].includes(activeUser.role) && (
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Scale className="h-4.5 w-4.5 text-brand-600" />
                          <span>การวินิจฉัยและอนุมัติสิทธิ์ (Decision Maker)</span>
                        </span>

                        {/* DPO input form */}
                        {activeUser.role === 'dpo' || activeUser.role === 'admin' ? (
                          <div className="space-y-3 text-xs">
                            <div className="space-y-1">
                              <label className="font-semibold text-slate-700">ผลวินิจฉัยข้อเสนอสิทธิ์:</label>
                              <select
                                value={decisionType}
                                onChange={(e) => setDecisionType(e.target.value as any)}
                                className="w-full border rounded p-1.5 bg-white"
                              >
                                <option value="approved">อนุมัติคำขอทั้งหมด (Approve All)</option>
                                <option value="partially_approved">อนุมัติบางส่วน / ถมดำ (Partial)</option>
                                <option value="denied">ปฏิเสธสิทธิทั้งหมด (Deny Request)</option>
                                <option value="no_data">ไม่พบข้อมูลผู้ขอในระบบ (No Data)</option>
                              </select>
                            </div>

                            {decisionType === 'denied' && (
                              <div className="space-y-1">
                                <label className="font-semibold text-slate-700 text-red-700">ข้อยกเว้นปฏิเสธมาตรา 30:</label>
                                <select
                                  value={denialBasisCode}
                                  onChange={(e) => setDenialBasisCode(e.target.value)}
                                  required
                                  className="w-full border border-red-300 rounded p-1.5 bg-white text-red-900"
                                >
                                  <option value="">-- ระบุข้อยกเว้นกฎหมาย --</option>
                                  {config?.rejectionReasons.map(r => (
                                    <option key={r.code} value={r.code}>{r.labelTh}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <div className="space-y-1">
                              <label className="font-semibold text-slate-700">ฐานอ้างอิงกฎหมาย (Legal Basis):</label>
                              <input
                                type="text"
                                value={legalBasisInput}
                                onChange={(e) => setLegalBasisInput(e.target.value)}
                                className="w-full border rounded p-1.5 bg-white font-semibold"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="font-semibold text-slate-700">บันทึกข้อเสนอของ DPO:</label>
                              <textarea
                                rows={2}
                                value={decisionNotes}
                                onChange={(e) => setDecisionNotes(e.target.value)}
                                placeholder="บันทึกความคิดเห็นตาม พ.ร.บ. คุ้มครองข้อมูลส่งผู้อนุมัติ..."
                                className="w-full border rounded p-1.5 bg-white"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSubmitDecisionProposal(activeRequestObj.id)}
                              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 rounded-lg text-xs transition"
                            >
                              ส่งขออนุมัติข้อวินิจฉัย (Submit Proposal)
                            </button>
                          </div>
                        ) : null}

                        {/* Executive Approver action */}
                        {activeUser.role === 'approver' ? (
                          <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg space-y-3 text-xs text-teal-900">
                            <span className="block font-bold">รอผู้มีอำนาจลงนาม (Four-eyes Approval):</span>
                            
                            {activeRequestObj.decision ? (
                              <div className="space-y-2">
                                <p className="text-[11px] leading-relaxed">
                                  <strong>DPO เสนอวินิจฉัย:</strong> {activeRequestObj.decision.result.toUpperCase()} <br />
                                  <strong>บันทึกความเห็น:</strong> {activeRequestObj.decision.dpoRecommendation}
                                </p>
                                
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleApproverSign(activeRequestObj.id, activeRequestObj.decision?.result === 'approved' ? 'Approved' : activeRequestObj.decision?.result === 'partially_approved' ? 'Partially Approved' : 'Denied')}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-2 rounded transition"
                                  >
                                    อนุมัติตามเสนอ
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => changeRequestStatus(activeRequestObj.id, 'DPO or Legal Review', activeUser, 'ส่งกลับแก้ไขความเห็นพิจารณากฎหมาย')}
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-1.5 px-2 rounded transition"
                                  >
                                    ส่งกลับแก้ไข
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-[11px] text-teal-800">
                                รอยื่นวินิจฉัยทางกฎหมายและข้อเสนอของ DPO / สำนักกฎหมาย ก่อนลงนามอนุมัติสิทธิ์
                              </p>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* Official template notice generator preview (Section 11) */}
                    {['dpo', 'approver', 'intake', 'admin'].includes(activeUser.role) && activeRequestObj.status !== 'Submitted' && (
                      <div className="space-y-4">
                        {templates.map((temp) => {
                          // Match the template matching status
                          const isMatch = 
                            (temp.id === 'temp_approve' && ['Approved', 'Partially Approved', 'Ready for Delivery', 'Delivered', 'Closed'].includes(activeRequestObj.status)) ||
                            (temp.id === 'temp_deny' && activeRequestObj.status === 'Denied') ||
                            (temp.id === 'temp_more_info' && activeRequestObj.status === 'Awaiting Additional Information') ||
                            (temp.id === 'temp_ack' && activeRequestObj.status === 'Received');

                          if (!isMatch) return null;

                          return (
                            <ThaiLetterView
                              key={temp.id}
                              request={activeRequestObj}
                              template={temp}
                              signer={activeUser}
                              onPrintMock={() => alert('จำลองการสั่งพิมพ์เอกสารนำส่งราชการเรียบร้อย')}
                            />
                          );
                        })}
                      </div>
                    )}

                    {/* Close Request and Delivery management */}
                    {['intake', 'admin'].includes(activeUser.role) && activeRequestObj.status === 'Ready for Delivery' && (
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">จัดส่งสำเนาและปิดเรื่อง (Delivery & Archive)</span>
                        <p className="text-xs text-slate-500">ตรวจสอบสถานะชำระค่าธรรมเนียม (ถ้ามี) เรียบร้อยแล้ว กดปุ่มเพื่อบันทึกการส่งมอบข้อมูลปลอดภัย</p>
                        
                        <button
                          type="button"
                          onClick={() => handleMarkAsDelivered(activeRequestObj.id)}
                          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 rounded-lg text-xs transition shadow-sm"
                        >
                          บันทึกส่งมอบเรียบร้อย & ปิดเคส (Deliver & Close)
                        </button>
                      </div>
                    )}

                    {/* Legal Hold status toggler */}
                    {['admin', 'dpo'].includes(activeUser.role) && (
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-xs flex justify-between items-center">
                        <div>
                          <span className="block font-bold text-slate-800">ระงับการทำลายหลักฐาน (Legal Hold)</span>
                          <span className="text-[10px] text-slate-400">ห้ามทำลายไฟล์แม้หมดอายุการเก็บรักษา 2 ปี ในกรณีมีคดีค้างคา</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleLegalHold(activeRequestObj.id)}
                          className={`font-semibold py-1 px-3 rounded text-[11px] transition ${
                            activeRequestObj.legalHold ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {activeRequestObj.legalHold ? 'เปิด Legal Hold' : 'ปิด'}
                        </button>
                      </div>
                    )}

                  </div>

                </div>

              </div>
            ) : (
              // Main Tab Switcher Content
              <div className="space-y-6">
                
                {/* 4.1 Dashboard Hub Tab */}
                {internalTab === 'dashboard' && (
                  <div className="space-y-6">
                    
                    {/* Title Heading */}
                    <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">แผงควบคุมระบบตรวจสอบสิทธิ์ข้อมูลส่วนบุคคล</h2>
                        <p className="text-xs text-slate-500 mt-0.5">ภาพรวมรายการยื่นคำขอตามมาตรา 30 และสถานะ SLA ดำเนินงานขององค์กร</p>
                      </div>
                      <span className="bg-brand-50 text-brand-600 text-xs px-2.5 py-1 rounded font-bold">
                        ปีงบประมาณ พ.ศ. {new Date().getFullYear() + 543}
                      </span>
                    </div>

                    {/* Operational counter grid (Clickable Interactive Cards) */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {[
                        { label: 'คำขอเข้าใหม่ทั้งหมด', count: requests.length, color: 'border-l-brand-500 hover:border-brand-500 hover:shadow-md text-brand-600', statuses: null },
                        { label: 'รอตรวจสอบตัวตน', count: getBadgeCount(['Submitted', 'Received', 'Identity Verification', 'Completeness Review']), color: 'border-l-indigo-500 hover:border-indigo-500 hover:shadow-md text-indigo-600', statuses: ['Submitted', 'Received', 'Identity Verification', 'Completeness Review'] as RequestStatus[] },
                        { label: 'อยู่ระหว่างสืบค้นข้อมูล', count: getBadgeCount(['Complete', 'Assigned', 'Data Collection']), color: 'border-l-amber-500 hover:border-amber-500 hover:shadow-md text-amber-600', statuses: ['Complete', 'Assigned', 'Data Collection'] as RequestStatus[] },
                        { label: 'รอฝ่ายกฎหมาย/DPO ตรวจ', count: getBadgeCount(['Data Owner Review', 'DPO or Legal Review', 'Redaction Required', 'Approval Pending']), color: 'border-l-rose-500 hover:border-rose-500 hover:shadow-md text-rose-600', statuses: ['Data Owner Review', 'DPO or Legal Review', 'Redaction Required', 'Approval Pending'] as RequestStatus[] },
                        { label: 'พร้อมส่งมอบ / ปิดเคส', count: getBadgeCount(['Ready for Delivery', 'Delivered', 'Closed']), color: 'border-l-emerald-500 hover:border-emerald-500 hover:shadow-md text-emerald-600', statuses: ['Ready for Delivery', 'Delivered', 'Closed'] as RequestStatus[] }
                      ].map((card, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            setStatusFilterGroup(card.statuses);
                            setInternalTab('requests');
                            setSelectedRequestId(null);
                          }}
                          className={`bg-white border border-slate-200 border-l-4 rounded-xl p-4 shadow-sm transition cursor-pointer hover:-translate-y-0.5 group ${card.color}`}
                        >
                          <span className="text-[10px] text-slate-400 block font-bold uppercase group-hover:text-slate-600 transition">{card.label}</span>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="text-2xl font-bold text-slate-800 block group-hover:scale-105 transition origin-left">{card.count}</span>
                            <span className="text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition">คลิกดูเรื่อง →</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Dynamic Charts visual component */}
                    <DashboardCharts requests={requests} />

                    {/* Quick overview of latest requests */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                      <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">คำร้องที่ต้องการความช่วยเหลือเร่งด่วน (Urgent SLA Action)</span>
                      
                      <div className="divide-y divide-slate-100">
                        {requests.slice(0, 3).map((req) => (
                          <div
                            key={req.id}
                            onClick={() => setSelectedRequestId(req.id)}
                            className="py-3 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50 transition px-2 rounded-lg"
                          >
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-800 block">{req.trackingNo} - {req.requester.firstName} {req.requester.lastName}</span>
                              <span className="text-slate-400 block">ขอบเขต: {req.requestDetails.description.substring(0, 50)}...</span>
                            </div>
                            <div className="text-right">
                              <span className="inline-block bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                {req.status}
                              </span>
                              <span className="block text-[10px] text-slate-400 mt-1 font-bold">
                                เหลือเวลา SLA: {req.slaRemainingDays} วัน
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

                {/* User & Access Management Tab for Admin */}
                {internalTab === 'users' && (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden space-y-6 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-brand-600" />
                          <span>การจัดการบัญชีผู้ใช้และกำหนดสิทธิ์ (User & Access Control Management)</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          การบริหารจัดการรายชื่อเจ้าหน้าที่ สิทธิ์การเข้าถึง (Multi-Role) และการตรวจสอบความเสี่ยง SOD ตามมาตรฐานความมั่นคงปลอดภัย
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => alert('จำลองการเปิด Modal เพิ่มเจ้าหน้าที่ใหม่ในองค์กร')}
                        className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition shadow-sm flex items-center gap-1.5"
                      >
                        <span>+ เพิ่มผู้ใช้งานใหม่ (Add User)</span>
                      </button>
                    </div>

                    {/* Users Table */}
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                            <th className="p-3">ชื่อ-นามสกุล</th>
                            <th className="p-3">Username / อีเมล</th>
                            <th className="p-3">หน่วยงาน / แผนก</th>
                            <th className="p-3">บทบาทสิทธิ์ถือครอง (Roles)</th>
                            <th className="p-3">สถานะความเสี่ยง SOD</th>
                            <th className="p-3 text-center">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {systemUsers
                            .filter((u: UserType) => u.orgId === activeUser.orgId)
                            .map((user: UserType) => (
                              <tr key={user.id} className="hover:bg-slate-50/80 transition">
                                <td className="p-3 font-bold text-slate-900">
                                  {user.fullNameTh}
                                  <span className="block text-[10px] font-normal text-slate-400">{user.fullNameEn}</span>
                                </td>
                                <td className="p-3">
                                  <span className="font-mono text-brand-600 block">{user.username}</span>
                                  <span className="text-[10px] text-slate-400 block">{user.email}</span>
                                </td>
                                <td className="p-3 text-slate-600 font-medium">{user.department || '-'}</td>
                                <td className="p-3">
                                  <div className="flex flex-wrap gap-1">
                                    {(user.roles || [user.role]).map((r: Role) => (
                                      <span
                                        key={r}
                                        className="bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                                      >
                                        {r}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="p-3">
                                  {user.sodWarnings && user.sodWarnings.length > 0 ? (
                                    <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-fit">
                                      <AlertTriangle className="h-3 w-3 text-amber-600" />
                                      <span>⚠️ SOD Conflict</span>
                                    </span>
                                  ) : (
                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                      ✓ Compliant (Normal)
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => alert(`จำลองแก้ไขสิทธิ์ของ: ${user.fullNameTh}`)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded text-[11px] font-semibold transition"
                                  >
                                    แก้ไขสิทธิ์
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {internalTab === 'requests' && (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden space-y-0">
                    
                    {/* Active Filter Banner when navigated from Dashboard Card */}
                    {statusFilterGroup && (
                      <div className="bg-brand-50 border-b border-brand-100 p-3 px-4 flex items-center justify-between text-xs text-brand-900">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">🎯 กำลังกรองแสดงคำขอตามกลุ่มสถานะ:</span>
                          <span className="bg-brand-200/60 text-brand-900 px-2 py-0.5 rounded font-bold font-mono text-[11px]">
                            [{statusFilterGroup.join(', ')}]
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStatusFilterGroup(null)}
                          className="bg-brand-600 hover:bg-brand-700 text-white font-semibold text-[11px] px-2.5 py-1 rounded transition shadow-sm"
                        >
                          ✕ ล้างตัวกรอง (แสดงทั้งหมด {requests.length} คำขอ)
                        </button>
                      </div>
                    )}

                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
                      <span className="text-xs font-bold text-slate-800">
                        ตารางสืบค้นและดำเนินงานคำร้องขอรับสิทธิ์สิริประวัติ 
                        ({requests.filter((r) => !statusFilterGroup || statusFilterGroup.includes(r.status)).length} รายการ)
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100/50 border-b border-slate-200 text-slate-500 font-bold">
                            <th className="p-3">เลขติดตาม (Tracking)</th>
                            <th className="p-3">ผู้ยื่นคำขอ</th>
                            <th className="p-3">ประเภทสิทธิ์</th>
                            <th className="p-3">วันยื่นเรื่อง</th>
                            <th className="p-3">สถานะขั้นตอน</th>
                            <th className="p-3">SLA เหลือ</th>
                            <th className="p-3 text-center">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {requests
                            .filter((req) => !statusFilterGroup || statusFilterGroup.includes(req.status))
                            .map((req) => (
                            <tr key={req.id} className="hover:bg-slate-50 transition">
                              <td className="p-3 font-mono font-bold text-brand-600">{req.trackingNo}</td>
                              <td className="p-3">
                                <span className="block font-bold">{req.requester.firstName} {req.requester.lastName}</span>
                                <span className="text-[10px] text-slate-400 block">{req.requester.email}</span>
                              </td>
                              <td className="p-3 uppercase font-semibold text-slate-500">{req.requestDetails.requestType}</td>
                              <td className="p-3">{convertToThaiDate(req.submissionDate)}</td>
                              <td className="p-3">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  ['Approved', 'Delivered', 'Closed'].includes(req.status) ? 'bg-emerald-100 text-emerald-800' :
                                  ['Denied', 'Withdrawn'].includes(req.status) ? 'bg-rose-100 text-rose-800' :
                                  'bg-brand-50 text-brand-700 border border-brand-100'
                                }`}>
                                  {req.status}
                                </span>
                              </td>
                              <td className="p-3 font-bold">
                                <span className={req.slaRemainingDays < 0 ? 'text-rose-600' : req.slaRemainingDays <= 7 ? 'text-amber-600' : 'text-slate-700'}>
                                  {req.slaRemainingDays} วัน
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => setSelectedRequestId(req.id)}
                                  className="text-brand-600 hover:text-brand-800 font-bold hover:underline"
                                >
                                  ตรวจสอบเคส
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4.3 Kanban workflow board view (Section 4) */}
                {internalTab === 'kanban' && (
                  <div className="space-y-4">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">บอร์ดลอยงานตามขั้นตอนกฎหมาย (Workflow Kanban board)</span>
                    
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
                      
                      {/* Column 1: Intake */}
                      {[
                        { title: '1. ตรวจรับคำขอ (Intake)', statuses: ['Submitted', 'Received', 'Identity Verification', 'Awaiting Identity Evidence', 'Completeness Review'] },
                        { title: '2. สืบค้นระบบ (Gathering)', statuses: ['Complete', 'Assigned', 'Data Collection'] },
                        { title: '3. กฎหมาย/DPO (Legal Check)', statuses: ['Data Owner Review', 'DPO or Legal Review', 'Redaction Required'] },
                        { title: '4. รออนุมัติ/ชำระเงิน (Approval)', statuses: ['Approval Pending', 'Fee Notification', 'Awaiting Payment'] },
                        { title: '5. เตรียมส่งมอบ/ปิดงาน (Delivery)', statuses: ['Approved', 'Partially Approved', 'Ready for Delivery', 'Delivered', 'Closed'] }
                      ].map((col, idx) => {
                        const colRequests = requests.filter(r => col.statuses.includes(r.status));
                        return (
                          <div key={idx} className="bg-slate-100/70 border border-slate-200 rounded-xl p-3 min-w-[200px] flex flex-col space-y-3 h-[450px]">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-800 text-xs truncate">{col.title}</span>
                              <span className="bg-slate-200 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{colRequests.length}</span>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2">
                              {colRequests.map((req) => (
                                <div
                                  key={req.id}
                                  onClick={() => setSelectedRequestId(req.id)}
                                  className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-sm hover:border-brand-500 transition cursor-pointer text-xs space-y-1.5"
                                >
                                  <div className="flex justify-between items-center font-bold text-[10px] text-slate-400">
                                    <span className="font-mono">{req.trackingNo}</span>
                                    <span className={req.slaRemainingDays <= 7 ? 'text-amber-600' : 'text-slate-400'}>{req.slaRemainingDays}d</span>
                                  </div>
                                  <span className="block font-bold text-slate-800 truncate">{req.requester.firstName} {req.requester.lastName}</span>
                                  <span className="block text-[10px] text-slate-400 truncate">{req.requestDetails.description}</span>
                                  <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                                    <span className="text-[9px] font-semibold text-brand-600 uppercase">{req.requestDetails.requestType}</span>
                                    <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-1 py-0.5 rounded">{req.status.substring(0, 15)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4.4 Compliance Configuration Dashboard (Section 1) */}
                {internalTab === 'compliance' && config && (
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-2xl mx-auto space-y-6">
                    <div>
                      <h3 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
                        <Scale className="h-5 w-5 text-brand-600" />
                        <span>ตั้งค่าการปฏิบัติตามข้อบังคับคุ้มครองข้อมูล (Compliance Configurator)</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">เวอร์ชันใช้งานปัจจุบัน: v{config.version} | แก้ไขโดย: {config.updatedBy} ({convertToThaiDate(config.updatedAt)})</p>
                    </div>

                    <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">ตรวจสอบความครบถ้วนของเอกสาร (วัน):</label>
                          <input
                            type="number"
                            min={1}
                            value={configForm.completenessCheckDays}
                            onChange={(e) => setConfigForm({ ...configForm, completenessCheckDays: parseInt(e.target.value) || 15 })}
                            className="w-full border rounded p-2 bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">ขีดกำหนดให้ผู้ยื่นแก้ไขเอกสารเพิ่มเติม (วัน - ห้ามต่ำกว่า 10 วัน):</label>
                          <input
                            type="number"
                            min={10}
                            value={configForm.deficiencyResponseDays}
                            onChange={(e) => setConfigForm({ ...configForm, deficiencyResponseDays: Math.max(10, parseInt(e.target.value) || 10) })}
                            className="w-full border rounded p-2 bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">ระยะเวลาดำเนินการประมวลผลสิทธิ์หลัก (วัน - ปกติ 30 วัน):</label>
                          <input
                            type="number"
                            min={1}
                            value={configForm.processingDays}
                            onChange={(e) => setConfigForm({ ...configForm, processingDays: parseInt(e.target.value) || 30 })}
                            className="w-full border rounded p-2 bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">ระยะเวลาสูงสุดขยายระยะเวลาออกงานได้อีก (วัน):</label>
                          <input
                            type="number"
                            min={1}
                            value={configForm.extensionDays}
                            onChange={(e) => setConfigForm({ ...configForm, extensionDays: parseInt(e.target.value) || 30 })}
                            className="w-full border rounded p-2 bg-white"
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                        <span className="block font-bold text-slate-700">อัตราจัดเก็บค่าธรรมเนียมสูงสุด (บาท):</span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 block font-bold">สำเนากระดาษ A4 (สูงสุด 1 บ.):</label>
                            <input
                              type="number"
                              step={0.1}
                              max={1.0}
                              value={configForm.feePaper}
                              onChange={(e) => setConfigForm({ ...configForm, feePaper: parseFloat(e.target.value) || 1.0 })}
                              className="w-full border rounded p-1 text-center"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 block font-bold">คอมพิวเตอร์ปริ้นท์ A4 (สูงสุด 3 บ.):</label>
                            <input
                              type="number"
                              step={0.1}
                              max={3.0}
                              value={configForm.feePrint}
                              onChange={(e) => setConfigForm({ ...configForm, feePrint: parseFloat(e.target.value) || 3.0 })}
                              className="w-full border rounded p-1 text-center"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 block font-bold">ค่าเซ็นรับรอง (สูงสุด 5 บ.):</label>
                            <input
                              type="number"
                              step={0.1}
                              max={5.0}
                              value={configForm.feeCert}
                              onChange={(e) => setConfigForm({ ...configForm, feeCert: parseFloat(e.target.value) || 5.0 })}
                              className="w-full border rounded p-1 text-center"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">เหตุผลประกอบการบันทึกแก้ไข (Audit Reason) <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          placeholder="ระบุเหตุผลการออกนโยบายฉบับแก้ไข..."
                          value={configForm.changeReason}
                          onChange={(e) => setConfigForm({ ...configForm, changeReason: e.target.value })}
                          className="w-full border rounded p-2 bg-white font-semibold"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 rounded-lg transition"
                      >
                        ยืนยันการบันทึก และเปลี่ยนเวอร์ชัน config
                      </button>

                    </form>
                  </div>
                )}

                {/* 4.5 Document Templates Tab */}
                {internalTab === 'templates' && (
                  <div className="space-y-4">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">แม่แบบหนังสือราชการคุ้มครองข้อมูลส่วนบุคคล (PDPA Document Templates)</span>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {templates.map((temp) => (
                        <div key={temp.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3 text-xs">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-slate-800 block">{temp.nameTh}</span>
                              <span className="text-[10px] text-slate-400 block">รหัส: {temp.id} | เวอร์ชัน: {temp.version}</span>
                            </div>
                            <span className="bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {temp.confidentialityLevel}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <span className="text-slate-400 block font-semibold">ชื่อเรื่องหนังสือราชการ:</span>
                            <span className="font-bold text-slate-800">{temp.subjectTemplate}</span>
                          </div>

                          <div className="p-2 bg-slate-50 border border-slate-100 rounded text-slate-500 font-mono text-[10px] h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                            {temp.bodyTemplate}
                          </div>

                          <button
                            type="button"
                            onClick={() => alert('จำลองการแก้ไขหนังสือราชการเรียบร้อย')}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-1.5 rounded transition text-center"
                          >
                            แก้ไขข้อความแม่แบบ (Edit Template)
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4.6 Retention & Destruction module (Section 3.11) */}
                {internalTab === 'retention' && (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                      <span className="text-xs font-bold text-slate-800">นโยบายการจัดเก็บและทำลายเอกสารหลักฐาน (Data Retention & Disposal Schedule)</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">ข้อมูลหลักฐานประกอบการขอสิทธิ มีเกณฑ์ทำลายถาวร 2 ปี นับจากเสร็จสิ้นการส่งมอบ</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100/50 border-b border-slate-200 text-slate-500 font-bold">
                            <th className="p-3">เลขติดตาม</th>
                            <th className="p-3">เจ้าของสิทธิ์</th>
                            <th className="p-3">วันปิดเคส</th>
                            <th className="p-3">กำหนดทำลาย</th>
                            <th className="p-3">สถานะจัดเก็บ</th>
                            <th className="p-3 text-center">คำสั่งทำลาย</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {requests.filter(r => ['Closed', 'Delivered', 'Destroyed'].includes(r.status)).map((req) => {
                            const closedAtDate = req.statusHistory.find(h => h.status === 'Closed')?.changedAt || req.submissionDate;
                            const destroyDate = new Date(closedAtDate);
                            destroyDate.setFullYear(destroyDate.getFullYear() + 2); // 2 years

                            return (
                              <tr key={req.id} className="hover:bg-slate-50 transition">
                                <td className="p-3 font-mono font-bold">{req.trackingNo}</td>
                                <td className="p-3">{req.requester.firstName} {req.requester.lastName}</td>
                                <td className="p-3">{convertToThaiDate(closedAtDate)}</td>
                                <td className="p-3 text-red-600 font-bold">{convertToThaiDate(destroyDate.toISOString())}</td>
                                <td className="p-3">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                    req.status === 'Destroyed' ? 'bg-slate-100 text-slate-400 border border-slate-200' :
                                    req.legalHold ? 'bg-red-100 text-red-800 animate-pulse' :
                                    'bg-emerald-100 text-emerald-800'
                                  }`}>
                                    {req.status === 'Destroyed' ? 'ทำลายถาวรแล้ว' : req.legalHold ? 'Legal Hold (ห้ามลบ)' : 'อยู่ในกำหนดรักษา'}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleSimulateDestruction(req.id)}
                                    disabled={req.status === 'Destroyed'}
                                    className={`font-bold flex items-center gap-1 mx-auto px-2.5 py-1 rounded text-[10px] transition ${
                                      req.status === 'Destroyed'
                                        ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                        : 'bg-red-50 text-red-700 hover:bg-red-100'
                                    }`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    <span>ลบทำลายถาวร</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4.7 Audit Trail Log Viewer (Section 3.11) */}
                {internalTab === 'audit' && (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <span className="text-xs font-bold text-slate-800">สมุดบันทึกกิจกรรมระบบ (Append-only System Audit Logs)</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">บันทึกทุกการเปิดดูไฟล์, เปลี่ยนแปลงสถานะ และสิทธิ์เข้าถึงข้อมูลพร้อมลายเซ็นดิจิทัลเช็คซัม</p>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => alert('จำลองการดาวน์โหลดรายงานบันทึกประวัติความปลอดภัยในรูปแบบ CSV เรียบร้อย')}
                        className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold py-1.5 px-3 rounded flex items-center gap-1.5 transition"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        <span>ส่งออก Audit Logs (CSV)</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-slate-100/50 border-b border-slate-200 text-slate-500 font-bold">
                            <th className="p-3">วันและเวลา (Timestamp)</th>
                            <th className="p-3">ผู้ปฏิบัติงาน (User)</th>
                            <th className="p-3">บทบาท</th>
                            <th className="p-3">การกระทำ (Action)</th>
                            <th className="p-3">รายละเอียด (Details)</th>
                            <th className="p-3">เลขไอพี (IP Address)</th>
                            <th className="p-3 text-center">ตรวจสอบความปลอดภัย (Integrity Check)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                          {auditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50 transition">
                              <td className="p-3 whitespace-nowrap text-slate-500">{new Date(log.timestamp).toLocaleString('th-TH')}</td>
                              <td className="p-3 font-sans font-bold text-slate-800">{log.actorName}</td>
                              <td className="p-3 font-sans uppercase font-bold text-[9px] text-slate-400">{log.actorRole}</td>
                              <td className="p-3 text-brand-600 font-bold">{log.action}</td>
                              <td className="p-3 font-sans text-slate-600 max-w-sm truncate" title={log.details}>{log.details}</td>
                              <td className="p-3 text-slate-500">{log.ipAddress}</td>
                              <td className="p-3 text-center">
                                <span className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold font-sans">
                                  ✓ Verified ({log.checksum.substr(0, 6)})
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            )}

          </main>
        </div>
      )}

      {/* Footer disclaimer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 px-6 py-4 text-center text-xs select-none space-y-1">
        <p className="font-semibold text-slate-300">
          © {new Date().getFullYear() + 543} ระบบบริหารคำขอเข้าถึงข้อมูลส่วนบุคคล (PDPA Access Request Management System)
        </p>
        <p className="text-[11px] text-brand-400 font-medium">
          สงวนลิขสิทธิ์ © บริษัท ยูโทเปีย เอ็นแอนด์เอ็น จำกัด (Utopia N&N Co., Ltd.) All Rights Reserved.
        </p>
        <p className="text-[10px] text-slate-500">
          พัฒนาสอดคล้องตามมาตรฐานพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (สิทธิ์ในการเข้าถึงและรับสำเนาตามมาตรา 30)
        </p>
      </footer>

      {/* --- MOCK OTP MODAL --- */}
      {showOtpModal && trackedRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="text-center space-y-1">
              <Mail className="h-10 w-10 text-brand-600 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">การยืนยันรหัส OTP ในระบบ Sandbox</h4>
              <p className="text-xs text-slate-400">
                ระบบได้ส่งรหัส OTP ไปที่ข้อมูลติดต่อเจ้าของสิทธิ ({trackedRequest.requester.email})
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-600 block text-center">กรอกรหัสยืนยัน OTP (สำหรับทดสอบระบุ: <strong>123456</strong>)</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="XXXXXX"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full text-center font-mono font-bold border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 rounded-lg text-xs transition"
              >
                ยืนยันเพื่อติดตามสถานะสิทธิ์
              </button>
              
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="w-full text-slate-500 text-xs py-1 transition"
              >
                ยกเลิก
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
