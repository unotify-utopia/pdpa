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
  AlertCircle,
  Lock,
  Plus,
  DollarSign,
  Download,
  Trash2,
  BookOpen,
  ArrowLeft,
  Mail,
  FileCheck2,
  FileBadge,
  Scale,
  Building2,
  MessageSquare,
  CheckCircle2,
  Clock,
  X,
  Activity,
  Eye,
  ShieldCheck
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
  fetchComplianceConfig,
  fetchDocumentTemplates,
  fetchAuditLogs,
  getCurrentUser,
  setCurrentUser,
  changeRequestStatus,
  createRequest,
  updateRequest,
  recalculateAllSLAs,
  addAuditLog,
  saveComplianceConfig,
  saveDocumentTemplates,
  resetDocumentTemplates
} from './db';


import { SignaturePad } from './components/SignaturePad';
import { WatermarkedUpload } from './components/WatermarkedUpload';
import { RedactionCanvas } from './components/RedactionCanvas';
import { ThaiLetterView, convertToThaiDate } from './components/ThaiLetterView';
import { ThaiDatePicker } from './components/ThaiDatePicker';
import { DocumentVerificationPortal } from './components/DocumentVerificationPortal';
import { SecureDownloadPage } from './components/SecureDownloadPage';
import { DashboardCharts } from './components/DashboardCharts';
import { StaffLoginModal } from './components/StaffLoginModal';
import { ProfileModal } from './components/ProfileModal';
import { NotifyModal } from './components/NotifyModal';
import type { NotifyType } from './components/NotifyModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { CitizenRequestForm } from './components/CitizenRequestForm';
import RopaManager from './components/RopaManager';
import { CookieBanner } from './components/CookieBanner';
import { CookieSettingsModal } from './components/CookieSettingsModal';
import { CookiePolicy } from './components/CookiePolicy';

// Helper: Thai Citizen ID Modulus 11 Checksum Validator
export const validateThaiCitizenId = (id: string): boolean => {
  const cleanId = id.replace(/[^0-9]/g, '');
  if (cleanId.length !== 13) return false;
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanId.charAt(i)) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(cleanId.charAt(12));
};

// Helper: Auto-Format Thai Citizen ID Mask (X-XXXX-XXXXX-XX-X)
export const formatThaiCitizenIdMask = (val: string): string => {
  const clean = val.replace(/[^a-zA-Z0-9]/g, '');
  // If numeric and 13 digits, format with Thai Citizen ID hyphen mask
  if (/^\d+$/.test(clean)) {
    if (clean.length <= 1) return clean;
    if (clean.length <= 5) return `${clean.substring(0, 1)}-${clean.substring(1)}`;
    if (clean.length <= 10) return `${clean.substring(0, 1)}-${clean.substring(1, 5)}-${clean.substring(5)}`;
    if (clean.length <= 12) return `${clean.substring(0, 1)}-${clean.substring(1, 5)}-${clean.substring(5, 10)}-${clean.substring(10)}`;
    return `${clean.substring(0, 1)}-${clean.substring(1, 5)}-${clean.substring(5, 10)}-${clean.substring(10, 12)}-${clean.substring(12, 13)}`;
  }
  return val; // Foreign passport format fallback
};

export const formatThaiTimeString = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('th-TH', {
      timeZone: 'Asia/Bangkok',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }) + ' à¸™.';
  } catch {
    return dateStr;
  }
};

export default function App() {

  // Notify Modal State
  const [notifyState, setNotifyState] = useState<{ open: boolean; title: string; message: string; type: NotifyType; onConfirm?: () => void; onCancel?: () => void }>({
    open: false, title: '', message: '', type: 'success'
  });

  const showNotify = (message: string, type: NotifyType = 'success', title?: string, onConfirm?: () => void, onCancel?: () => void) => {
    let defaultTitle = 'à¸à¸²à¸£à¹à¸ˆà¹‰à¸‡à¹€à¸•à¸·à¸­à¸™à¸ˆà¸²à¸à¸£à¸°à¸šà¸š';
    if (type === 'error') defaultTitle = 'à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”';
    if (type === 'warning') defaultTitle = 'à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡à¹à¸ˆà¹‰à¸‡à¹€à¸•à¸·à¸­à¸™';
    if (type === 'confirm') defaultTitle = 'à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£';
    
    // Auto-detect type if it's default
    if (message.includes('âŒ') || message.includes('à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”') || message.includes('à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–')) {
      type = 'error';
      defaultTitle = 'à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”';
    } else if (message.includes('âš ï¸') || message.includes('à¸à¸£à¸¸à¸“à¸²')) {
      type = 'warning';
      defaultTitle = 'à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡à¹à¸ˆà¹‰à¸‡à¹€à¸•à¸·à¸­à¸™';
    } else if (message.includes('âœ…') || message.includes('à¸ªà¸³à¹€à¸£à¹‡à¸ˆ') || message.includes('à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢')) {
      type = 'success';
      defaultTitle = 'à¸à¸²à¸£à¹à¸ˆà¹‰à¸‡à¹€à¸•à¸·à¸­à¸™à¸ˆà¸²à¸à¸£à¸°à¸šà¸š';
    }
    
    // Remove emojis from message for cleaner UI
    const cleanMessage = message.replace(/^[âŒâš ï¸âœ…]\s*/, '');
    
    setNotifyState({ open: true, title: title || defaultTitle, message: cleanMessage, type, onConfirm, onCancel });
  };

  // Helper to mask email for OTP display
  const maskEmail = (email: string | undefined | null) => {
    if (!email || !email.includes('@')) return email || '';
    const [name, domain] = email.split('@');
    if (name.length <= 3) {
      return `${name.charAt(0)}***@${domain}`;
    }
    const first = name.slice(0, 2);
    const last = name.slice(-2);
    return `${first}***${last}@${domain}`;
  };

  // Helper to handle strict database mode â€” declared AFTER showNotify so it can call it on error
  const safeUpdateRequest = async (req: Request, actor: UserType, action: string, detail: string) => {
    try {
      await updateRequest(req, actor, action, detail);
      return true;
    } catch (err: any) {
      showNotify(err.message || 'à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¹ƒà¸™à¸à¸²à¸£à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥', 'error');
      return false;
    }
  };

  // App context navigation states
  const initialUser = getCurrentUser();
  const [view, setView] = useState<'public' | 'internal' | 'tracking' | 'download' | 'superadmin' | 'verify' | 'download_qr'>(
    initialUser ? 'internal' : 'public'
  );
  const [dlToken, setDlToken] = useState<string | null>(null);
  const [publicTab, setPublicTab] = useState<'landing' | 'submit' | 'submitted_success'>('landing');
  const [internalTab, setInternalTab] = useState<'dashboard' | 'requests' | 'kanban' | 'users' | 'compliance' | 'templates' | 'retention' | 'audit' | 'manual_entry' | 'ropa'>('dashboard');

  // DB States
  const [requests, setRequests] = useState<Request[]>([]);
  const [config, setConfig] = useState<ComplianceConfig | null>(null);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditSearchTerm, setAuditSearchTerm] = useState('');
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);
  const [auditPage, setAuditPage] = useState(1);
  const auditLogsPerPage = 50;
  const [activeUser, setActiveUser] = useState<UserType | null>(initialUser);
  const [impersonatedOrgId, setImpersonatedOrgId] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isForcePasswordChange, setIsForcePasswordChange] = useState(false);
  const [resetTokenForModal, setResetTokenForModal] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [manualChannel, setManualChannel] = useState<'office' | 'post' | 'email' | 'e-service'>('office');
  const [manualRefNo, setManualRefNo] = useState('');
  const [manualEntrySuccessTrackingNo, setManualEntrySuccessTrackingNo] = useState<string | null>(null);

  // Cookie Consent States
  const [showCookieBanner, setShowCookieBanner] = useState(false);
  const [showCookieSettings, setShowCookieSettings] = useState(false);
  const [showCookiePolicy, setShowCookiePolicy] = useState(false);
  const [cookiePreferences, setCookiePreferences] = useState({ necessary: true, analytics: false, marketing: false });

  useEffect(() => {
    const consent = localStorage.getItem('pdpa_cookie_consent');
    if (!consent) {
      setShowCookieBanner(true);
    } else {
      try {
        setCookiePreferences(JSON.parse(consent).preferences);
      } catch (e) {}
    }
  }, []);

  const handleSaveCookieConsent = async (action: string, prefs: any) => {
    try {
      let sessionId = localStorage.getItem('pdpa_session_id');
      if (!sessionId) {
        sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('pdpa_session_id', sessionId);
      }
      
      const consentData = { action, preferences: prefs, timestamp: new Date().toISOString() };
      localStorage.setItem('pdpa_cookie_consent', JSON.stringify(consentData));
      
      setCookiePreferences(prefs);
      setShowCookieBanner(false);
      setShowCookieSettings(false);

      // Send to API
      await fetch('/api/cookie-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action, preferences: prefs })
      });
    } catch (err) {
      console.error('Error saving cookie consent:', err);
    }
  };

  // Organizations from DB
  const [organizations, setOrganizations] = useState<any[]>([]);
  
  // Backend Users from DB
  const [backendUsers, setBackendUsers] = useState<UserType[]>([]);

  // Derived state for Super Admin Impersonation
  const currentViewOrgId = (activeUser?.isSuperAdmin && impersonatedOrgId) ? impersonatedOrgId : activeUser?.orgId;
  const baseRequests = (activeUser?.isSuperAdmin && impersonatedOrgId)
    ? requests.filter(r => r.orgId === impersonatedOrgId)
    : requests;

  // We let everyone see the requests in the table, but enforce FLOW on who can "manage" them
  const filteredRequests = baseRequests.filter(r => r && r.requester && r.requestDetails);

  const canManageRequestFlow = (req: Request, user: UserType): boolean => {
    if (user.isSuperAdmin || user.role === 'superadmin' || user.role === 'admin' || user.role === 'auditor') return true;
    
    const roles = user.roles || [user.role];
    return roles.some(role => {
      switch (role) {
        case 'intake':
          return true; // Intake can manage at any stage
        case 'owner':
          const ownerHidden = ['Draft', 'Submitted', 'Received', 'Identity Verification', 'Awaiting Identity Evidence', 'Completeness Review', 'Awaiting Additional Information'];
          return !ownerHidden.includes(req.status);
        case 'dpo':
          const dpoVisible = [
            'DPO or Legal Review', 'Redaction Required', 'Approval Pending', 
            'Fee Notification', 'Awaiting Payment', 'Approved', 'Partially Approved', 
            'Denied', 'No Data Found', 'Ready for Delivery', 'Delivered', 
            'Receipt Confirmed', 'Closed', 'Legal Hold', 'Archived', 'Destroyed'
          ];
          return dpoVisible.includes(req.status);
        case 'approver':
          const approverVisible = [
            'Approval Pending', 'Approved', 'Partially Approved', 'Denied',
            'Ready for Delivery', 'Delivered', 'Receipt Confirmed', 'Closed',
            'Archived', 'Destroyed'
          ];
          return approverVisible.includes(req.status);
        default:
          return false;
      }
    });
  };

  // Idle Timeout System for Main App (10 minutes)
  // Unified Force Logout Helper for Staff Portal
  const handleStaffForceLogout = (reason?: string) => {
    sessionStorage.clear();
    setCurrentUser(null);
    setActiveUser(null);
    setSelectedRequestId(null);
    setView('public');
    setPublicTab('landing');
    if (reason) {
      showNotify(reason);
    }
  };

  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/dl\/([^/]+)$/);
    if (match && match[1]) {
      setDlToken(match[1]);
      setView('download_qr');
    } else if (path === '/dl' || path === '/dl/') {
      setView('download');
    }

    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('reset_token');
    if (resetToken) {
      setResetTokenForModal(resetToken);
      // Remove token from URL after capturing it to avoid accidental resubmissions
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      // Set timeout for 10 minutes (600,000 ms) - Staff Document Review Policy
      timeoutId = setTimeout(() => {
        if (activeUser) {
          handleStaffForceLogout('à¸—à¹ˆà¸²à¸™à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¸£à¸°à¸šà¸šà¹€à¸à¸´à¸™ 10 à¸™à¸²à¸—à¸µ à¸£à¸°à¸šà¸šà¸ˆà¸¶à¸‡à¸—à¸³à¸à¸²à¸£à¸­à¸­à¸à¸ˆà¸²à¸à¸£à¸°à¸šà¸šà¸­à¸±à¸•à¹‚à¸™à¸¡à¸±à¸•à¸´à¹€à¸žà¸·à¹ˆà¸­à¸„à¸§à¸²à¸¡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢');
          window.location.reload();
        }
      }, 10 * 60 * 1000);
    };

    if (activeUser) {
      // Start timer
      resetTimer();
      // Listen for user activity
      const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
      events.forEach(event => window.addEventListener(event, resetTimer));

      // Cleanup
      return () => {
        clearTimeout(timeoutId);
        events.forEach(event => window.removeEventListener(event, resetTimer));
      };
    }
  }, [activeUser]);

  // Listen for workflow email notification events from API / db
  useEffect(() => {
    const handleWorkflowNotify = (e: any) => {
      const { title, message } = e.detail || {};
      showNotify(message || 'à¸ªà¹ˆà¸‡à¸­à¸µà¹€à¸¡à¸¥à¹à¸ˆà¹‰à¸‡à¹€à¸•à¸·à¸­à¸™à¸„à¸§à¸²à¸¡à¸„à¸·à¸šà¸«à¸™à¹‰à¸²à¸•à¸²à¸¡ Workflow à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§', 'success', title || 'à¹à¸ˆà¹‰à¸‡à¹€à¸•à¸·à¸­à¸™à¸•à¸²à¸¡ Flow à¹€à¸­à¸à¸ªà¸²à¸£', () => {
        // Automatically close the active request detail view to prevent further actions on completed steps
        setSelectedRequestId(null);
      });
    };
    window.addEventListener('workflow-notify', handleWorkflowNotify);
    return () => window.removeEventListener('workflow-notify', handleWorkflowNotify);
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem('pdpa_token') || sessionStorage.getItem('pdpa_jwt_token');
    const endpoint = token ? '/api/tenants' : '/api/public/tenants';
    const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    fetch(endpoint, { headers })
      .then(res => {
        if (token && (res.status === 401 || res.status === 403)) {
          handleStaffForceLogout('à¹€à¸‹à¸ªà¸Šà¸±à¸™à¸‚à¸­à¸‡à¸—à¹ˆà¸²à¸™à¸«à¸¡à¸”à¸­à¸²à¸¢à¸¸ à¸à¸£à¸¸à¸“à¸²à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸šà¸­à¸µà¸à¸„à¸£à¸±à¹‰à¸‡à¹€à¸žà¸·à¹ˆà¸­à¸„à¸§à¸²à¸¡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢');
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data && data.success && Array.isArray(data.tenants)) {
           const formatted = data.tenants.map((t: any) => ({ id: t.id, nameTh: t.nameTh || t.name_th, nameEn: t.nameEn || t.name_en, code: t.id.replace('org_', '') }));
           setOrganizations(formatted);
           if (formatted.length === 1) {
             setSelectedTargetOrgId(formatted[0].id);
           }
        }
      })
      .catch(console.error);
  }, [activeUser, publicTab]);

  // Fetch backend users
  const reloadUsers = () => {
    const user = activeUser || getCurrentUser();
    if (user) {
      const token = sessionStorage.getItem('pdpa_token') || sessionStorage.getItem('pdpa_jwt_token');
      if (token) {
        fetch('/api/users', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
          .then(res => {
            if (res.status === 401 || res.status === 403) {
              handleStaffForceLogout('à¹€à¸‹à¸ªà¸Šà¸±à¸™à¸‚à¸­à¸‡à¸—à¹ˆà¸²à¸™à¸«à¸¡à¸”à¸­à¸²à¸¢à¸¸ à¸à¸£à¸¸à¸“à¸²à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸šà¸­à¸µà¸à¸„à¸£à¸±à¹‰à¸‡à¹€à¸žà¸·à¹ˆà¸­à¸„à¸§à¸²à¸¡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢');
              return null;
            }
            return res.json();
          })
          .then(data => {
            if (data && data.success && data.users) {
              const usersWithSod = data.users.map((u: any) => {
                const userRoles = u.roles || [u.role];
                const warnings = [];
                if (userRoles.includes('dpo') && userRoles.includes('approver')) {
                   warnings.push('Conflict of Interest: DPO à¹„à¸¡à¹ˆà¸„à¸§à¸£à¹€à¸›à¹‡à¸™à¸œà¸¹à¹‰à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸„à¸³à¸‚à¸­ (Approver) à¹€à¸žà¸·à¹ˆà¸­à¸£à¸±à¸à¸©à¸²à¸ªà¸–à¸²à¸™à¸°à¸œà¸¹à¹‰à¸›à¸£à¸°à¹€à¸¡à¸´à¸™à¸­à¸´à¸ªà¸£à¸°');
                }
                if (userRoles.includes('intake') && userRoles.includes('owner')) {
                   warnings.push('Data Pipeline Risk: à¸œà¸¹à¹‰à¸£à¸±à¸šà¹€à¸£à¸·à¹ˆà¸­à¸‡ (Intake) à¹„à¸¡à¹ˆà¸„à¸§à¸£à¹€à¸›à¹‡à¸™à¸œà¸¹à¹‰à¸”à¸¶à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥ (Owner) à¹€à¸­à¸‡à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”à¹‚à¸”à¸¢à¹„à¸¡à¹ˆà¸¡à¸µà¸„à¸™à¸ªà¸­à¸šà¸—à¸²à¸™');
                }
                return { ...u, sodWarnings: warnings };
              });
              setBackendUsers(usersWithSod);
            }
          })
          .catch(console.error);
      }
    }
  };

  // Reload local state from DB
  const getRequestClone = (id: string): Request | undefined => {
    const r = requests.find(r => r.id === id);
    return r ? JSON.parse(JSON.stringify(r)) : undefined;
  };

  const reloadData = async () => {
    const currentUser = getCurrentUser();
    
    // Fetch newly async states
    const allLogs = await fetchAuditLogs();
    const serverConfig = await fetchComplianceConfig();
    const serverTemplates = await fetchDocumentTemplates();

    setConfig(serverConfig);
    setTemplates(serverTemplates);

    // Setup Audit Logs from DB
    if (currentUser && currentUser.orgId) {
      setAuditLogs(allLogs.filter((l) => !l.orgId || l.orgId === currentUser.orgId));
    } else {
      setAuditLogs(allLogs);
    }

    if (currentUser) {
      // Authenticated User: Fetch from secure API
      const token = sessionStorage.getItem('pdpa_token') || sessionStorage.getItem('pdpa_jwt_token');
      fetch('/api/requests', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
        .then(res => {
          if (res.status === 401 || res.status === 403) {
            handleStaffForceLogout('à¹€à¸‹à¸ªà¸Šà¸±à¸™à¸‚à¸­à¸‡à¸—à¹ˆà¸²à¸™à¸«à¸¡à¸”à¸­à¸²à¸¢à¸¸ à¸à¸£à¸¸à¸“à¸²à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸šà¸­à¸µà¸à¸„à¸£à¸±à¹‰à¸‡à¹€à¸žà¸·à¹ˆà¸­à¸„à¸§à¸²à¸¡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢');
            return null;
          }
          return res.json();
        })
        .then(data => {
          if (data && data.success && Array.isArray(data.requests)) {
            setRequests(recalculateAllSLAs(data.requests, serverConfig));
          }
        })
        .catch(console.error);
    } else {
      // Public User: Fetch from public API
      fetch('/api/public/requests', { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.requests)) {
            setRequests(recalculateAllSLAs(data.requests, serverConfig));
          }
        })
        .catch(console.error);
    }

    // config and templates will be loaded via reloadData()
    reloadUsers();
  };

  useEffect(() => {
    reloadData();

    const handleSync = () => {
      const latestUser = getCurrentUser();
      // If the user changed from another tab, trigger a state update
      if (latestUser?.id !== activeUser?.id || latestUser?.role !== activeUser?.role) {
        setActiveUser(latestUser);
      }
      reloadData();
    };

    window.addEventListener('focus', handleSync);
    window.addEventListener('storage', handleSync);

    const timer = setInterval(() => {
      reloadData();
    }, 3000);

    return () => {
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('storage', handleSync);
      clearInterval(timer);
    };
  }, [activeUser]);

  // Fetch Backend Users
  useEffect(() => {
    reloadUsers();
  }, [activeUser]);

  // Withdraw OTP Verification Modal States
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState<'reason' | 'otp'>('reason');
  const [withdrawReasonText, setWithdrawReasonText] = useState('');
  const [withdrawOtpCode, setWithdrawOtpCode] = useState('');

  // Submission Email OTP Modal States
  const [showSubmissionOtpModal, setShowSubmissionOtpModal] = useState(false);
  const [submissionOtpCode, setSubmissionOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Attachment Document Preview Modal State
  const [previewAttachment, setPreviewAttachment] = useState<{ name: string; fileUrl?: string; size: number; isMasked?: boolean; watermarkApplied?: boolean } | null>(null);

  // Delivery Package Preview Modal State
  const [showDeliveryPreview, setShowDeliveryPreview] = useState(false);

  // Active Selections
  const [selectedTargetOrgId, setSelectedTargetOrgId] = useState<string>('');
  const [tenantSearchQuery, setTenantSearchQuery] = useState<string>('');
  const [isTenantDropdownOpen, setIsTenantDropdownOpen] = useState<boolean>(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isNewRequestSuccess, setIsNewRequestSuccess] = useState<Request | null>(null);
  
  // User Management Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [userForm, setUserForm] = useState<{
    username: string;
    fullNameTh: string;
    fullNameEn: string;
    email: string;
    department: string;
    role: Role;
    roles: Role[];
  }>({
    username: '',
    fullNameTh: '',
    fullNameEn: '',
    email: '',
    department: 'à¸¨à¸¹à¸™à¸¢à¹Œà¸£à¸±à¸šà¹€à¸£à¸·à¹ˆà¸­à¸‡à¸£à¹‰à¸­à¸‡à¹€à¸£à¸µà¸¢à¸™ (à¸à¸£à¸¡à¸à¸²à¸£à¸›à¸à¸„à¸£à¸­à¸‡)',
    role: 'intake',
    roles: ['intake']
  });

  // SOD helper function
  const calculateSodWarnings = (rolesList: string[]): string[] => {
    const warnings: string[] = [];
    if (rolesList.includes('dpo') && rolesList.includes('approver')) {
      warnings.push('Conflict of Interest: DPO à¹„à¸¡à¹ˆà¸„à¸§à¸£à¹€à¸›à¹‡à¸™à¸œà¸¹à¹‰à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸„à¸³à¸‚à¸­ (Approver) à¹€à¸žà¸·à¹ˆà¸­à¸£à¸±à¸à¸©à¸²à¸ªà¸–à¸²à¸™à¸°à¸œà¸¹à¹‰à¸›à¸£à¸°à¹€à¸¡à¸´à¸™à¸­à¸´à¸ªà¸£à¸°');
    }
    if (rolesList.includes('intake') && rolesList.includes('owner')) {
      warnings.push('Data Pipeline Risk: à¸œà¸¹à¹‰à¸£à¸±à¸šà¹€à¸£à¸·à¹ˆà¸­à¸‡ (Intake) à¹„à¸¡à¹ˆà¸„à¸§à¸£à¹€à¸›à¹‡à¸™à¸œà¸¹à¹‰à¸”à¸¶à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥ (Owner) à¹€à¸­à¸‡à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”à¹‚à¸”à¸¢à¹„à¸¡à¹ˆà¸¡à¸µà¸„à¸™à¸ªà¸­à¸šà¸—à¸²à¸™');
    }
    return warnings;
  };
  
  // --- REAL SMTP OTP LOGIC HELPER ---
  const getContactInfo = (req: Request) => {
    if (req.requesterType === 'representative' && req.representative) {
      return { email: req.representative.email || req.requester.email, phone: req.representative.phone || req.requester.phone };
    }
    return { email: req.requester.email, phone: req.requester.phone };
  };

  const triggerRealOtp = async (email: string, phone: string, trackingNo?: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/public/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone, reference: trackingNo })
      });
      const data = await res.json();
      if (!data.success) {
        showNotify(data.message || 'à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸ªà¹ˆà¸‡à¸£à¸«à¸±à¸ª OTP à¹„à¸”à¹‰', 'error', 'à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”');
        return false;
      }
      return true;
    } catch (err) {
      console.error('Failed to send OTP via SMTP', err);
      showNotify('à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¹ƒà¸™à¸à¸²à¸£à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­à¹€à¸žà¸·à¹ˆà¸­à¸ªà¹ˆà¸‡ OTP', 'error', 'à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”');
      return false;
    }
  };

  const verifyRealOtp = async (email: string, phone: string, otpCodeStr: string, trackingNo?: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/public/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone, otp: otpCodeStr, reference: trackingNo })
      });
      const data = await res.json();
      if (!data.success) {
        showNotify(`âŒ ${data.message}`);
        return false;
      }
      return true;
    } catch (err) {
      showNotify('âŒ à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­à¸à¸±à¸šà¹€à¸‹à¸´à¸£à¹Œà¸Ÿà¹€à¸§à¸­à¸£à¹Œà¹€à¸žà¸·à¹ˆà¸­à¸¢à¸·à¸™à¸¢à¸±à¸™ OTP à¹„à¸”à¹‰');
      return false;
    }
  };
  // Public tracking inputs
  const [trackNo, setTrackNo] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [trackedRequest, setTrackedRequest] = useState<Request | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  // Secure download link simulation
  // downloadToken removed
  const [downloadRequest, setDownloadRequest] = useState<Request | null>(null);
  const [downloadOtpCode, setDownloadOtpCode] = useState('');
  const [showDownloadOtpModal, setShowDownloadOtpModal] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  
  // Dashboard Interactive Navigation Filter State


  // Download file state
  const [downloadConfirm, setDownloadConfirm] = useState<{ reqId: string, taskId: string, fileId: string, filename: string } | null>(null);

  useEffect(() => {
    // SLA calculation is now applied during reloadData() fetches.
    // The previous standalone interval here has been removed to avoid stale state and loops.
  }, []);

  // 10-Minute Inactivity Session Timeout for Staff Security (PDPA Access Control Rule)
  useEffect(() => {
    if (!activeUser || view !== 'internal') return;

    let inactivityTimer: ReturnType<typeof setTimeout>;
    const TIMEOUT_DURATION = 10 * 60 * 1000; // 10 minutes in ms

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        showNotify('à¹€à¸‹à¸ªà¸Šà¸±à¸™à¸«à¸¡à¸”à¸­à¸²à¸¢à¸¸à¹€à¸™à¸·à¹ˆà¸­à¸‡à¸ˆà¸²à¸à¹„à¸¡à¹ˆà¸¡à¸µà¸à¸²à¸£à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¹€à¸à¸´à¸™ 10 à¸™à¸²à¸—à¸µ à¸£à¸°à¸šà¸šà¹„à¸”à¹‰à¸—à¸³à¸à¸²à¸£à¸¥à¹‡à¸­à¸à¹€à¸­à¸²à¸•à¹Œà¸­à¸±à¸•à¹‚à¸™à¸¡à¸±à¸•à¸´à¹€à¸žà¸·à¹ˆà¸­à¸„à¸§à¸²à¸¡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢à¸•à¸²à¸¡à¸¡à¸²à¸•à¸£à¸à¸²à¸™ PDPA');
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
    return filteredRequests.filter(r => statuses.includes(r.status)).length;
  };

  // --- PUBLIC PORTAL FORM STATE WIZARD ---
  const [wizardStep, setWizardStep] = useState(1);
  const [reqType, setReqType] = useState<'self' | 'representative'>('self');

  const [extendSlaModal, setExtendSlaModal] = useState<{ open: boolean; reqId: string | null; reason: string }>({ open: false, reqId: null, reason: '' });

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
    scope: 'à¸à¸²à¸£à¸¢à¸·à¹ˆà¸™à¸‚à¸­à¹ƒà¸Šà¹‰à¸ªà¸´à¸—à¸˜à¸´à¸”à¸¶à¸‡à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸²à¸£à¹€à¸‡à¸´à¸™à¹à¸¥à¸°à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¹à¸—à¸™à¸œà¸¹à¹‰à¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆà¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”',
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

  const submitPublicRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guard: prevent double submission while OTP is being sent
    if (isSendingOtp) return;
    setIsSendingOtp(true);

    // 1. Check mandatory consent checkboxes
    if (!consentAccepted || !accuracyCertified) {
      showNotify('âš ï¸ à¸à¸£à¸¸à¸“à¸²à¸„à¸¥à¸´à¸à¸¢à¸­à¸¡à¸£à¸±à¸šà¸™à¹‚à¸¢à¸šà¸²à¸¢à¸„à¸§à¸²à¸¡à¹€à¸›à¹‡à¸™à¸ªà¹ˆà¸§à¸™à¸•à¸±à¸§à¹à¸¥à¸°à¸„à¸³à¸£à¸±à¸šà¸£à¸­à¸‡à¸„à¸§à¸²à¸¡à¸–à¸¹à¸à¸•à¹‰à¸­à¸‡à¸à¹ˆà¸­à¸™à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­');
      setIsSendingOtp(false);
      return;
    }

    // 2. Mandatory File Upload Verification
    if (reqType === 'self') {
      if (uploadedAttachments.length === 0) {
        showNotify('âš ï¸ à¸à¸£à¸¸à¸“à¸²à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¸ªà¸³à¹€à¸™à¸²à¸šà¸±à¸•à¸£à¸›à¸£à¸°à¸ˆà¸³à¸•à¸±à¸§à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™à¸«à¸£à¸·à¸­à¹€à¸­à¸à¸ªà¸²à¸£à¸¢à¸·à¸™à¸¢à¸±à¸™à¸•à¸±à¸§à¸•à¸™à¹€à¸ˆà¹‰à¸²à¸‚à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¸à¹ˆà¸­à¸™à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­');
        setIsSendingOtp(false);
        return;
      }
    } else if (reqType === 'representative') {
      const hasDelegatorId = uploadedAttachments.some(f => f.name.includes('[à¸œà¸¹à¹‰à¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆ]'));
      const hasRepId = uploadedAttachments.some(f => f.name.includes('[à¸œà¸¹à¹‰à¸£à¸±à¸šà¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆ]'));
      const hasPoa = uploadedAttachments.some(f => f.name.includes('[à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆ]'));

      if (!hasDelegatorId || !hasRepId || !hasPoa) {
        showNotify('âš ï¸ à¸à¸£à¸¸à¸“à¸²à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¹€à¸­à¸à¸ªà¸²à¸£à¸«à¸¥à¸±à¸à¸à¸²à¸™à¹ƒà¸«à¹‰à¸„à¸£à¸šà¸–à¹‰à¸§à¸™à¸—à¸±à¹‰à¸‡ 3 à¸£à¸²à¸¢à¸à¸²à¸£à¸à¹ˆà¸­à¸™à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­:\n1. à¸šà¸±à¸•à¸£à¸›à¸£à¸°à¸ˆà¸³à¸•à¸±à¸§à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™à¸œà¸¹à¹‰à¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆ (à¹€à¸ˆà¹‰à¸²à¸‚à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥)\n2. à¸šà¸±à¸•à¸£à¸›à¸£à¸°à¸ˆà¸³à¸•à¸±à¸§à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™à¸œà¸¹à¹‰à¸£à¸±à¸šà¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆ\n3. à¹€à¸­à¸à¸ªà¸²à¸£à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆ (Power of Attorney)');
        setIsSendingOtp(false);
        return;
      }
    }

    // 2.5 File Size Limit Check (5 MB Total)
    let totalSize = 0;
    for (const f of uploadedAttachments) {
      totalSize += Math.round(f.data.length * 0.75); // Convert base64 length to bytes
    }
    if (signatureData) {
      totalSize += Math.round(signatureData.length * 0.75);
    }
    
    if (totalSize > 5 * 1024 * 1024) {
      const mbSize = (totalSize / (1024 * 1024)).toFixed(2);
      showNotify(`âš ï¸ à¸‚à¸™à¸²à¸”à¹„à¸Ÿà¸¥à¹Œà¹à¸™à¸šà¹à¸¥à¸°à¸¥à¸²à¸¢à¹€à¸‹à¹‡à¸™à¸£à¸§à¸¡à¸à¸±à¸™à¹€à¸à¸´à¸™ 5 MB (à¸›à¸±à¸ˆà¸ˆà¸¸à¸šà¸±à¸™ ${mbSize} MB) à¸à¸£à¸¸à¸“à¸²à¸¥à¸”à¸‚à¸™à¸²à¸”à¹„à¸Ÿà¸¥à¹Œà¸«à¸£à¸·à¸­à¸šà¸µà¸šà¸­à¸±à¸”à¸£à¸¹à¸›à¸ à¸²à¸žà¸à¹ˆà¸­à¸™à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£à¸•à¹ˆà¸­`, 'warning');
      
      // Log to backend
      const targetEmail = reqType === 'self' ? requesterForm.email : repForm.email;
      fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'FRONTEND_PAYLOAD_TOO_LARGE',
          details: `Attempted to upload ${mbSize} MB. Email/Phone: ${targetEmail || requesterForm.phone}`,
          orgId: selectedTargetOrgId
        })
      }).catch(console.error);

      setIsSendingOtp(false);
      return;
    }

    // 3. Trigger Email OTP Verification Modal
    const targetEmail = reqType === 'self' ? requesterForm.email : repForm.email;
    const targetPhone = reqType === 'self' ? requesterForm.phone : repForm.phone;
    
    try {
      const res = await fetch('/api/public/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, phone: targetPhone })
      });
      const data = await res.json();
      // 2-second delay to prevent spam and allow server to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (!res.ok || !data.success) {
        showNotify(`âŒ ${data.message || 'à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸ªà¹ˆà¸‡à¸£à¸«à¸±à¸ª OTP à¹„à¸”à¹‰ à¸à¸£à¸¸à¸“à¸²à¸¥à¸­à¸‡à¹ƒà¸«à¸¡à¹ˆà¸­à¸µà¸à¸„à¸£à¸±à¹‰à¸‡'}`);
        setIsSendingOtp(false);
        return; // Stop and do not show modal
      } else if (data.message && data.message.includes('123456')) {
        showNotify(`âš ï¸ ${data.message}`);
      }
    } catch (err) {
      console.error('Failed to send OTP:', err);
      showNotify('âŒ à¸à¸²à¸£à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­à¸¥à¹‰à¸¡à¹€à¸«à¸¥à¸§ à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸ªà¹ˆà¸‡à¸£à¸«à¸±à¸ª OTP à¹„à¸”à¹‰');
      setIsSendingOtp(false);
      return;
    }
    
    setSubmissionOtpCode('');
    setShowSubmissionOtpModal(true);
    setIsSendingOtp(false);
  };

  const handleFinalizeSubmissionOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = submissionOtpCode.trim();
    const targetEmail = reqType === 'self' ? requesterForm.email : repForm.email;
    const targetPhone = reqType === 'self' ? requesterForm.phone : repForm.phone;
    
    try {
      const res = await fetch('/api/public/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, phone: targetPhone, otp: cleanOtp })
      });
      const data = await res.json();
      
      if (!data.success) {
        showNotify(`âŒ ${data.message}`);
        return;
      }
    } catch (err) {
      showNotify('âŒ à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­à¸à¸±à¸šà¹€à¸‹à¸´à¸£à¹Œà¸Ÿà¹€à¸§à¸­à¸£à¹Œà¹€à¸žà¸·à¹ˆà¸­à¸¢à¸·à¸™à¸¢à¸±à¸™ OTP à¹„à¸”à¹‰');
      return;
    }

    setShowSubmissionOtpModal(false);

    const attachmentsList: Attachment[] = uploadedAttachments.map((f, index) => ({
      id: `att_wizard_${Date.now()}_${index}`,
      name: f.name,
      size: Math.round(f.data.length * 0.75), // base64 estimate
      type: f.data.split(';')[0].split(':')[1] || 'application/pdf',
      isMasked: true,
      watermarkApplied: true,
      uploadedAt: new Date().toISOString(),
      fileUrl: f.data
    }));

    // Add Signature as attachment if present (Optional)
    if (signatureData) {
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
    }

    const newReq = createRequest({
      orgId: selectedTargetOrgId,
      targetOrgId: selectedTargetOrgId,
      targetOrgName: organizations.find((o: any) => o.id === selectedTargetOrgId)?.nameTh || 'à¸«à¸™à¹ˆà¸§à¸¢à¸‡à¸²à¸™à¸œà¸¹à¹‰à¸£à¸±à¸šà¸„à¸³à¸‚à¸­ PDPA',
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

    // Immediately save locally first
    const saveLocal = (req: Request) => {
      setRequests(prev => {
        const allLocal = [...prev];
        const idx = allLocal.findIndex(r => r.id === req.id);
        if (idx !== -1) allLocal[idx] = req;
        else allLocal.unshift(req);
        return allLocal;
      });
    };
    saveLocal(newReq);

    // Fetch single true tracking number from PostgreSQL Master DB API
    fetch('/api/public/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReq)
    })
    .then(res => {
      if (!res.ok) throw new Error('Network error');
      return res.json();
    })
    .then(data => {
      if (data.success && data.request) {
        setIsNewRequestSuccess(data.request);
        // Sync local storage with actual server tracking number
        newReq.trackingNo = data.request.trackingNo;
        saveLocal(newReq);
        showNotify('à¸ªà¹ˆà¸‡à¸­à¸µà¹€à¸¡à¸¥à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¸£à¸±à¸šà¹€à¸£à¸·à¹ˆà¸­à¸‡à¹„à¸›à¸¢à¸±à¸‡à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™ à¹à¸¥à¸°à¹à¸ˆà¹‰à¸‡à¹€à¸•à¸·à¸­à¸™à¹„à¸›à¸¢à¸±à¸‡à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆ Intake à¸•à¸²à¸¡ Workflow à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§', 'success', 'à¸£à¸°à¸šà¸šà¹à¸ˆà¹‰à¸‡à¹€à¸•à¸·à¸­à¸™à¸­à¸±à¸•à¹‚à¸™à¸¡à¸±à¸•à¸´ (Email Workflow)');
      } else {
        setIsNewRequestSuccess(newReq);
      }
    })
    .catch(() => {
      setIsNewRequestSuccess(newReq);
    });

    setPublicTab('submitted_success');
    handleResetWizard();
    reloadData();
  };

  // --- MANUAL ENTRY SUBMISSION FOR INTERNAL STAFF ---
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser) return;
    
    const orgId = currentViewOrgId || '';

    const newReq: Request = {
      id: `REQ-${Date.now()}`,
      orgId,
      uuid: crypto.randomUUID ? crypto.randomUUID() : `uuid-${Date.now()}`,
      trackingNo: '', // Will be assigned by backend API
      requesterType: reqType,
      contactChannel: manualChannel as any,
      refNo: manualChannel !== 'office' ? manualRefNo : undefined,
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
      status: 'Submitted',
      submissionDate: new Date().toISOString(),
      slaExtended: false,
      slaRemainingDays: 30,
      slaDaysUsed: 0,
      slaPaused: false,
      slaEvents: [],
      statusHistory: [{
        status: 'Submitted',
        changedAt: new Date().toISOString(),
        changedBy: activeUser.fullNameTh || 'Internal Staff',
        comment: 'Manual entry via internal dashboard'
      }],
      identityVerification: {
        status: 'verified',
        assuranceLevel: 'high',
        verifiedAt: new Date().toISOString(),
        method: 'in_person',
      },
      requestDetails: {
        requestType: scopeForm.requestType,
        description: scopeForm.description,
        targetSystems: scopeForm.systems,
        timeframeStart: scopeForm.timeframeStart || undefined,
        timeframeEnd: scopeForm.timeframeEnd || undefined,
        deliveryMethod: scopeForm.deliveryMethod
      },
      attachments: uploadedAttachments.map((f, index) => ({
        id: `att_man_${Date.now()}_${index}`,
        name: f.name,
        size: Math.round(f.data.length * 0.75),
        type: f.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
        isMasked: false,
        watermarkApplied: true,
        uploadedAt: new Date().toISOString(),
        fileUrl: f.data
      })),
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
      legalHold: false
    };

    // Immediately save locally first
    const saveLocal = (req: Request) => {
      setRequests(prev => {
        const allLocal = [...prev];
        const idx = allLocal.findIndex(r => r.id === req.id);
        if (idx !== -1) allLocal[idx] = req;
        else allLocal.unshift(req);
        return allLocal;
      });
    };
    saveLocal(newReq);

    // Sync to PostgreSQL DB API
    fetch('/api/public/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReq)
    })
    .then(res => {
      if (!res.ok) throw new Error('Network error');
      return res.json();
    })
    .then(data => {
      if (data.success && data.request) {
        newReq.trackingNo = data.request.trackingNo;
        saveLocal(newReq);
        setManualEntrySuccessTrackingNo(data.request.trackingNo);
        showNotify('à¸ªà¹ˆà¸‡à¸­à¸µà¹€à¸¡à¸¥à¹à¸ˆà¹‰à¸‡à¹€à¸•à¸·à¸­à¸™à¸à¸²à¸£à¹€à¸žà¸´à¹ˆà¸¡à¸„à¸³à¸£à¹‰à¸­à¸‡à¹ƒà¸«à¸¡à¹ˆ (Manual Entry) à¹„à¸›à¸¢à¸±à¸‡à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™ à¹à¸¥à¸°à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¸—à¸µà¹ˆà¹€à¸à¸µà¹ˆà¸¢à¸§à¸‚à¹‰à¸­à¸‡à¸•à¸²à¸¡ Workflow à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§', 'success', 'à¹à¸ˆà¹‰à¸‡à¹€à¸•à¸·à¸­à¸™à¸•à¸²à¸¡ Flow à¹€à¸­à¸à¸ªà¸²à¸£');
      } else {
        setManualEntrySuccessTrackingNo(newReq.trackingNo);
      }
      
      handleResetWizard();
      setManualRefNo('');
      setManualChannel('office');
      setInternalTab('requests');
      reloadData();
    })
    .catch(err => {
      console.error('Failed to sync manual entry:', err);
      setManualEntrySuccessTrackingNo(newReq.trackingNo);
      
      handleResetWizard();
      setManualRefNo('');
      setManualChannel('office');
      setInternalTab('requests');
      reloadData();
    });
  };

  // Enterprise Search Lookup Modal State
  const [showSearchLookupModal, setShowSearchLookupModal] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchLookupResults, setSearchLookupResults] = useState<Request[] | null>(null);

  // --- PUBLIC TRACKING LOGIC (Smart Keyword-Based Search) ---
  const handleTrackSubmit = async (e?: React.FormEvent, customKeyword?: string) => {
    if (e) e.preventDefault();
    setTrackingError(null);
    setSearchLookupResults(null);

    const query = (customKeyword || searchKeyword || trackNo).trim().toUpperCase();
    if (!query) {
      setTrackingError('à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸à¸•à¸±à¸§à¹€à¸¥à¸‚à¸„à¸³à¸‚à¸­ à¸«à¸£à¸·à¸­à¸„à¸³à¸„à¹‰à¸™à¸«à¸² Keyword');
      return;
    }

    try {
      const res = await fetch('/api/public/requests/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: query })
      });
      const data = await res.json();
      
      if (!data.success) {
        setTrackingError(data.message || 'à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¹ƒà¸™à¸à¸²à¸£à¸„à¹‰à¸™à¸«à¸²');
        return;
      }
      
      const matches = data.results;

      if (matches.length === 0) {
        setTrackingError(`à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸„à¸³à¸£à¹‰à¸­à¸‡à¸‚à¸­à¸—à¸µà¹ˆà¸¡à¸µà¸£à¸«à¸±à¸ªà¸«à¸£à¸·à¸­à¸„à¸³à¸„à¹‰à¸™à¸«à¸² "${query}" à¹ƒà¸™à¸£à¸°à¸šà¸š`);
        return;
      }

      // Show lookup modal for user to confirm which request to track
      setSearchLookupResults(matches);
      setShowSearchLookupModal(true);
    } catch (err) {
      setTrackingError('à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­à¸à¸±à¸šà¹€à¸‹à¸´à¸£à¹Œà¸Ÿà¹€à¸§à¸­à¸£à¹Œà¹€à¸žà¸·à¹ˆà¸­à¸„à¹‰à¸™à¸«à¸²à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹„à¸”à¹‰');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackedRequest) return;
    
    const submittedOtp = otpCode;
    setOtpCode('');
    const isValid = await verifyRealOtp(trackedRequest.requester.email, trackedRequest.requester.phone, submittedOtp, trackedRequest.trackingNo);
    if (isValid) {
      setShowOtpModal(false);
      setView('tracking');
    }
  };

  const handleWithdrawRequest = async (reqId: string, reason: string) => {
    const mockUser: UserType = { id: 'user', orgId: 'org_dopa', username: 'data.subject', fullNameTh: 'à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­', fullNameEn: 'Data Subject', email: '', role: 'intake', roles: ['intake'], mfaEnabled: false };
    await changeRequestStatus(getRequestClone(reqId), 'Withdrawn', mockUser, `à¸–à¸­à¸™à¸„à¸³à¸‚à¸­à¹€à¸™à¸·à¹ˆà¸­à¸‡à¸ˆà¸²à¸: ${reason}`, config || undefined);
    // Update active tracked view
    const req = getRequestClone(reqId);
    if (req) setTrackedRequest(req);
    reloadData();
  };

  const handleUploadAdditionalTrack = async (fileName: string, dataUrl: string) => {
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

    const mockUser: UserType = { id: 'user', orgId: 'org_dopa', username: 'data.subject', fullNameTh: 'à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­', fullNameEn: 'Data Subject', email: '', role: 'intake', roles: ['intake'], mfaEnabled: false };
    updateRequest(updated, mockUser, 'UPLOAD_EVIDENCE', `à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¹€à¸­à¸à¸ªà¸²à¸£à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡à¸Šà¸·à¹ˆà¸­: ${fileName}`);
    setTrackedRequest(updated);
    
    // Automatically transition status and resume SLA when citizen uploads additional documents
    if (trackedRequest.status === 'Awaiting Additional Information') {
      await changeRequestStatus(getRequestClone(trackedRequest.id), 'Completeness Review', mockUser, `à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¹€à¸­à¸à¸ªà¸²à¸£à¹à¸à¹‰à¹„à¸‚à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§ (${fileName}, config || undefined) - à¸›à¸¥à¸”à¸¥à¹‡à¸­à¸à¸™à¸±à¸šà¹€à¸§à¸¥à¸² SLA à¸•à¹ˆà¸­à¹„à¸›`);
      const updatedReq = getRequestClone(trackedRequest.id);
      if (updatedReq) setTrackedRequest(updatedReq);
    }
    
    reloadData();
    showNotify('âœ… à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¸£à¸¹à¸›à¸ à¸²à¸žà¸šà¸±à¸•à¸£à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™ / à¹€à¸­à¸à¸ªà¸²à¸£à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§!\n\nà¸£à¸°à¸šà¸šà¸—à¸³à¸à¸²à¸£à¸›à¸¥à¸”à¸¥à¹‡à¸­à¸à¸™à¸±à¸šà¹€à¸§à¸¥à¸² SLA à¹à¸¥à¸°à¸ªà¹ˆà¸‡à¹€à¸£à¸·à¹ˆà¸­à¸‡à¸à¸¥à¸±à¸šà¸«à¸²à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¸„à¸±à¸”à¸à¸£à¸­à¸‡à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§');
  };

  // --- SECURE DOWNLOAD VERIFICATION (Section 3.9) ---
  const handleDownloadCheck = async (identifier: string) => {
    let req = requests.find(r => r.uuid === identifier || r.trackingNo === identifier);
    
    // Always fetch fresh requests to ensure status is up to date (prevents stale status error)
    try {
      const res = await fetch('/api/public/requests', { cache: 'no-store' });
      const data = await res.json();
      if (data && data.success && Array.isArray(data.requests)) {
         if (config) {
           setRequests(recalculateAllSLAs(data.requests, config));
         } else {
           setRequests(data.requests);
         }
         const freshReq = data.requests.find((r: Request) => r.uuid === identifier || r.trackingNo === identifier);
         if (freshReq) req = freshReq;
      }
    } catch (e) {
      console.error('Failed to fetch fresh status for download check', e);
    }

    if (!req && trackedRequest?.trackingNo) {
      req = requests.find(r => r.trackingNo === trackedRequest.trackingNo);
      // Fallback to trackedRequest itself if still not found
      if (!req && trackedRequest && (trackedRequest.uuid === identifier || trackedRequest.trackingNo === identifier)) {
        req = trackedRequest;
      }
    }

    if (!req) {
      setDownloadError('à¸¥à¸´à¸‡à¸à¹Œà¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡à¸«à¸£à¸·à¸­à¸«à¸¡à¸”à¸­à¸²à¸¢à¸¸à¸à¸²à¸£à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¹à¸¥à¹‰à¸§');
      setView('download');
      return;
    }

    if (req.status !== 'Ready for Delivery' && req.status !== 'Delivered' && req.status !== 'Receipt Confirmed' && req.status !== 'Closed') {
      setDownloadError('à¹€à¸­à¸à¸ªà¸²à¸£à¸‚à¸­à¸‡à¸„à¸³à¸‚à¸­à¸™à¸µà¹‰à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸žà¸£à¹‰à¸­à¸¡à¸ªà¹ˆà¸‡à¸¡à¸­à¸š à¸«à¸£à¸·à¸­à¸–à¸¹à¸à¸£à¸°à¸‡à¸±à¸šà¸ªà¸´à¸—à¸˜à¸´à¹Œ');
      setView('download');
      return;
    }

    if (req.downloadExpiresAt) {
      if (new Date(req.downloadExpiresAt) < new Date()) {
        setDownloadError('à¹€à¸­à¸à¸ªà¸²à¸£à¸«à¸¡à¸”à¸­à¸²à¸¢à¸¸à¸à¸²à¸£à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¹à¸¥à¹‰à¸§ (à¹€à¸à¸´à¸™ 30 à¸§à¸±à¸™)');
        setDownloadRequest(req);
        setView('download');
        return;
      }
    }

    setDownloadRequest(req);
    // setDownloadToken removed
    setDownloadError(null);
    const success = await triggerRealOtp(req.requester.email, req.requester.phone, req.trackingNo);
    if (success) {
      setShowDownloadOtpModal(true);
      setView('download');
    }
  };

  const handleVerifyDownloadOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!downloadRequest) return;

    // Real file download via API handles OTP validation
    try {
      const res = await fetch(`/api/public/requests/${downloadRequest.id}/download-package`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: downloadRequest.requester.email,
          phone: downloadRequest.requester.phone,
          otp: downloadOtpCode,
                reference: downloadRequest.trackingNo
        })
      });
      
      if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || 'Download failed');
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PDPA_Package_${downloadRequest.trackingNo}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // If we reach here, OTP was correct and download succeeded
      setShowDownloadOtpModal(false);
      
      const mockSubjectUser: any = {
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
      
      addAuditLog('SECURE_DOWNLOAD_FILE', `à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸¢à¸·à¸™à¸¢à¸±à¸™ OTP à¸ªà¸³à¹€à¸£à¹‡à¸ˆà¹à¸¥à¸°à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¹„à¸Ÿà¸¥à¹Œà¸ªà¹ˆà¸‡à¸¡à¸­à¸š`, mockSubjectUser, downloadRequest.id, downloadRequest.trackingNo);
      
      if (downloadRequest.status === 'Ready for Delivery') {
        await changeRequestStatus(getRequestClone(downloadRequest.id), 'Delivered', mockSubjectUser, 'à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸œà¹ˆà¸²à¸™à¸£à¸°à¸šà¸šà¸ˆà¸±à¸”à¸ªà¹ˆà¸‡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢à¸ªà¸³à¹€à¸£à¹‡à¸ˆ', config || undefined);
      }
      
      reloadData();

      // We must clear the OTP manually since we bypassed verifyRealOtp
      fetch('/api/public/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: downloadRequest.requester.email,
            phone: downloadRequest.requester.phone,
            otp: downloadOtpCode,
                reference: downloadRequest.trackingNo
          })
      }).catch(console.error);
      
    } catch (e) {
      console.error('Download error:', e);
      alert('à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¹„à¸Ÿà¸¥à¹Œà¹„à¸”à¹‰: ' + (e instanceof Error ? e.message : 'à¸£à¸«à¸±à¸ª OTP à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡à¸«à¸£à¸·à¸­à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¸ à¸²à¸¢à¹ƒà¸™à¸£à¸°à¸šà¸š'));
    }
  };

  const handleDownloadAction = async (reqId: string, _otpCodeStr: string) => {
    const downloadReq = requests.find(r => r.id === reqId);
    if (!downloadReq) return;

    // Log downloand access
    const mockSubjectUser: UserType = {
      id: 'subject',
      orgId: downloadReq.orgId || 'org_dopa',
      username: 'data.subject',
      fullNameTh: `${downloadReq.requester.firstName} ${downloadReq.requester.lastName}`,
      fullNameEn: 'Data Subject',
      email: downloadReq.requester.email,
      role: 'intake',
      roles: ['intake'],
      mfaEnabled: false
    };
    
    addAuditLog('SECURE_DOWNLOAD_FILE', `à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸¢à¸·à¸™à¸¢à¸±à¸™ OTP à¸ªà¸³à¹€à¸£à¹‡à¸ˆà¹à¸¥à¸°à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¹„à¸Ÿà¸¥à¹Œà¸œà¹ˆà¸²à¸™à¸£à¸°à¸šà¸šà¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¹€à¸­à¸à¸ªà¸²à¸£`, mockSubjectUser, downloadReq.id, downloadReq.trackingNo);
    
    // Update status if it was not closed
    if (downloadReq.status === 'Ready for Delivery') {
      await changeRequestStatus(getRequestClone(downloadReq.id), 'Delivered', mockSubjectUser, 'à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸œà¹ˆà¸²à¸™à¸£à¸°à¸šà¸šà¸ˆà¸±à¸”à¸ªà¹ˆà¸‡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢à¸ªà¸³à¹€à¸£à¹‡à¸ˆ', config || undefined);
      reloadData();
    }
    
    // Simulate file download by creating mockup file
    const link = document.createElement('a');
    link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(`[CONFIDENTIAL DATA REPORT FOR ${downloadReq.requester.firstName}]\n\nà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸£à¸²à¸¢à¸‡à¸²à¸™à¸à¸²à¸£à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¸‚à¸­à¸‡à¸—à¹ˆà¸²à¸™ à¹„à¸”à¹‰à¸£à¸±à¸šà¸à¸²à¸£à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¹à¸¥à¸°à¸ªà¹ˆà¸‡à¸¡à¸­à¸šà¸•à¸²à¸¡à¸ªà¸´à¸—à¸˜à¸´à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§.`);
    link.download = `PDPA_EXPORT_${downloadReq.trackingNo}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        
        // Initialize Fee Form if already assessed
        setFeeForm({
          noFee: req.feeCalculation?.noFee || false,
          paperPages: req.feeCalculation?.paperPages || 0,
          computerPages: req.feeCalculation?.computerPages || 0,
          certifications: req.feeCalculation?.certificationsCount || 0,
          otherItem: req.feeCalculation?.otherCosts?.[0]?.item || '',
          otherCost: req.feeCalculation?.otherCosts?.[0]?.cost || 0
        });
      }
    }
  }, [selectedRequestId]);

  const handleCheckItemToggle = (key: keyof typeof checkItems) => {
    setCheckItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleVerifyIdentityQuick = async (reqId: string, status: 'verified' | 'rejected', assurance: 'low' | 'medium' | 'high') => {
    if (!activeUser) return;
    const req = getRequestClone(reqId);
    if (!req) return;

    req.identityVerification = {
      status,
      assuranceLevel: assurance,
      method: req.contactChannel === 'web' ? 'otp_email' : 'document_check',
      verifiedBy: activeUser.fullNameTh,
      verifiedAt: new Date().toISOString(),
      notes: 'à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸œà¹ˆà¸²à¸™à¸£à¸°à¸šà¸šà¸§à¸´à¹€à¸„à¸£à¸²à¸°à¸«à¹Œà¹€à¸­à¸à¸ªà¸²à¸£à¸„à¸§à¸²à¸¡à¸–à¸¹à¸à¸•à¹‰à¸­à¸‡à¹à¸šà¸šà¹à¸¡à¸™à¸™à¸§à¸¥à¸ªà¸³à¹€à¸£à¹‡à¸ˆ'
    };

    if (status === 'verified') {
      setCheckItems(prev => ({ ...prev, identity: true }));
    }

    await safeUpdateRequest(req, activeUser, 'VERIFY_IDENTITY', `à¸¢à¸·à¸™à¸¢à¸±à¸™à¸•à¸±à¸§à¸•à¸™à¸£à¸°à¸”à¸±à¸š ${assurance.toUpperCase()} à¸œà¸¥à¹€à¸›à¹‡à¸™: ${status === 'verified' ? 'à¸œà¹ˆà¸²à¸™' : 'à¸›à¸à¸´à¹€à¸ªà¸˜'}`);
    reloadData();
  };

  const markCompletenessDone = async (reqId: string) => {
    if (!activeUser) return;
    const req = getRequestClone(reqId);
    
    // Validate identity verification
    if (req?.identityVerification?.status !== 'verified') {
      showNotify('âš ï¸ à¸à¸£à¸¸à¸“à¸²à¸à¸”à¸¢à¸·à¸™à¸¢à¸±à¸™à¸œà¸¥à¸¢à¸·à¸™à¸¢à¸±à¸™à¸•à¸™à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­à¸à¹ˆà¸­à¸™à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£à¸•à¹ˆà¸­', 'warning');
      return;
    }

    // Validate completeness checklist
    if (!checkItems.name || !checkItems.contact || !checkItems.scope || !checkItems.identity || !checkItems.signature) {
      showNotify('âš ï¸ à¸à¸£à¸¸à¸“à¸²à¸—à¸³à¹€à¸„à¸£à¸·à¹ˆà¸­à¸‡à¸«à¸¡à¸²à¸¢à¹€à¸Šà¹‡à¸„à¸¥à¸´à¸ªà¸•à¹Œà¸•à¸£à¸§à¸ˆà¹€à¸­à¸à¸ªà¸²à¸£à¹ƒà¸«à¹‰à¸„à¸£à¸šà¸–à¹‰à¸§à¸™', 'warning');
      return;
    }

    await changeRequestStatus(req, 'Documents Verified', activeUser, 'à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¹€à¸­à¸à¸ªà¸²à¸£à¸„à¸£à¸šà¸–à¹‰à¸§à¸™à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢ à¹€à¸£à¸´à¹ˆà¸¡à¸™à¸±à¸šà¸£à¸°à¸¢à¸°à¹€à¸§à¸¥à¸²à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£ SLA', config || undefined);
    reloadData();
  };

  const markCompletenessDeficient = async (reqId: string) => {
    if (!activeUser) return;
    
    const missing: string[] = [];
    if (!checkItems.name) missing.push('à¸Šà¸·à¹ˆà¸­à¹à¸¥à¸°à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­');
    if (!checkItems.contact) missing.push('à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸à¸²à¸£à¸•à¸´à¸”à¸•à¹ˆà¸­à¸à¸¥à¸±à¸š');
    if (!checkItems.identity) missing.push('à¹€à¸­à¸à¸ªà¸²à¸£à¸¢à¸·à¸™à¸¢à¸±à¸™à¸•à¸±à¸§à¸•à¸™ / à¸ªà¸³à¹€à¸™à¸²à¸šà¸±à¸•à¸£à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™à¸—à¸µà¹ˆà¸Šà¸±à¸”à¹€à¸ˆà¸™');
    if (!checkItems.signature) missing.push('à¸¥à¸²à¸¢à¸¡à¸·à¸­à¸Šà¸·à¹ˆà¸­à¸­à¸´à¹€à¸¥à¹‡à¸à¸—à¸£à¸­à¸™à¸´à¸à¸ªà¹Œ');
    if (!checkItems.repDocs) missing.push('à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆà¸«à¸£à¸·à¸­à¹€à¸­à¸à¸ªà¸²à¸£à¸›à¸£à¸°à¸ˆà¸³à¸•à¸±à¸§à¸œà¸¹à¹‰à¸£à¸±à¸šà¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆ');

    const comment = `à¹€à¸­à¸à¸ªà¸²à¸£à¸«à¸¥à¸±à¸à¸à¸²à¸™à¸‚à¸²à¸”à¸„à¸§à¸²à¸¡à¸ªà¸¡à¸šà¸¹à¸£à¸“à¹Œ: à¸‚à¸­à¹€à¸­à¸à¸ªà¸²à¸£à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡à¸ªà¸³à¸«à¸£à¸±à¸š ${missing.join(', ')}. ${incompleteComment}`;
    await changeRequestStatus(getRequestClone(reqId), 'Awaiting Additional Information', activeUser, comment, config || undefined);
    
    // Auto-generate notification thread message
    const req = getRequestClone(reqId);
    if (req) {
      req.messageThread.push({
        id: `msg_auto_${Date.now()}`,
        sender: 'staff',
        senderName: activeUser.fullNameTh,
        message: `à¹€à¸£à¸µà¸¢à¸™ à¸„à¸¸à¸“ ${req.requester.firstName} à¸­à¸‡à¸„à¹Œà¸à¸£à¸‚à¸­à¸£à¸±à¸šà¸«à¸¥à¸±à¸à¸à¸²à¸™à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡à¹€à¸™à¸·à¹ˆà¸­à¸‡à¸ˆà¸²à¸à¹€à¸­à¸à¸ªà¸²à¸£à¸«à¸¥à¸±à¸à¸à¸²à¸™à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸„à¸§à¸²à¸¡à¸ªà¸¡à¸šà¸¹à¸£à¸“à¹Œà¹„à¸¡à¹ˆà¸œà¹ˆà¸²à¸™ à¸„à¸·à¸­: ${missing.join(', ')} à¸à¸£à¸¸à¸“à¸²à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¹€à¸­à¸à¸ªà¸²à¸£à¹ƒà¸«à¸¡à¹ˆà¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡à¹€à¸‚à¹‰à¸²à¸£à¸°à¸šà¸šà¹ƒà¸™à¸«à¸™à¹‰à¸²à¸•à¸´à¸”à¸•à¸²à¸¡à¸ªà¸–à¸²à¸™à¸°`,
        timestamp: new Date().toISOString()
      });
      updateRequest(req, activeUser, 'SEND_MESSAGE', 'à¸ªà¹ˆà¸‡à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¹€à¸•à¸·à¸­à¸™à¸‚à¸­à¹€à¸­à¸à¸ªà¸²à¸£à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡à¸­à¹‰à¸²à¸‡à¸­à¸´à¸‡à¸ªà¸–à¸²à¸™à¸°à¸£à¸­à¸à¸²à¸£à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£');
    }

    setShowIncompletePanel(false);
    reloadData();
  };

  // Data Discovery System Owner Assign Task (Section 3.5)
  const [selectedTaskSystem, setSelectedTaskSystem] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('à¸˜à¸™à¸²à¸˜à¸£ à¸£à¸°à¸šà¸šà¸¥à¸¹à¸à¸„à¹‰à¸²');
  const [searchQueryParam, setSearchQueryParam] = useState('');

  const handleCreateSearchTask = (reqId: string) => {
    if (!activeUser || !selectedTaskSystem) return;
    const req = getRequestClone(reqId);
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
    
    // Switch state to data collection unconditionally to support skipping steps during testing
    if (req.status !== 'Data Collection') {
      req.status = 'Data Collection';
      req.statusHistory.push({
        status: 'Data Collection',
        changedAt: new Date().toISOString(),
        changedBy: activeUser.fullNameTh,
        comment: `à¸¡à¸­à¸šà¸«à¸¡à¸²à¸¢à¸ à¸²à¸£à¸à¸´à¸ˆà¸„à¹‰à¸™à¸«à¸²à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹„à¸›à¸¢à¸±à¸‡à¸£à¸°à¸šà¸š: ${selectedTaskSystem}`
      });
    }

    updateRequest(req, activeUser, 'CREATE_DATA_TASK', `à¸ªà¸£à¹‰à¸²à¸‡à¸‡à¸²à¸™à¸„à¹‰à¸™à¸«à¸²à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸£à¸°à¸šà¸š: ${selectedTaskSystem} à¸¡à¸­à¸šà¹ƒà¸«à¹‰: ${taskAssignee}`);
    setSelectedTaskSystem('');
    setSearchQueryParam('');
    reloadData();
  };

  const handleOwnerCompleteFlow = (reqId: string) => {
    if (!activeUser) return;
    const req = getRequestClone(reqId);
    if (!req) return;

    let updated = 0;
    req.dataCollectionTasks.forEach((t: DataCollectionTask) => {
      if (t.status === 'pending') {
        t.status = 'found';
        t.completedAt = new Date().toISOString();
        t.completedBy = activeUser.fullNameTh;
        t.dataLineage = `à¸£à¸°à¸šà¸š ${t.systemName} -> à¸à¸§à¸²à¸”à¸„à¹‰à¸™à¸«à¸²à¸”à¹‰à¸§à¸¢ SQL / Index -> à¸ˆà¸±à¸”à¹€à¸à¹‡à¸šà¹„à¸Ÿà¸¥à¹Œà¹ƒà¸™ Object Private Container`;
        updated++;
      }
    });

    // Auto transition to Data Owner Review if all tasks complete
    const allDone = req.dataCollectionTasks.every((t: DataCollectionTask) => t.status !== 'pending');
    if (allDone && req.status === 'Data Collection') {
      req.status = 'Data Owner Review';
      req.statusHistory.push({
        status: 'Data Owner Review',
        changedAt: new Date().toISOString(),
        changedBy: activeUser.fullNameTh,
        comment: 'à¸‡à¸²à¸™à¸„à¹‰à¸™à¸«à¸²à¸£à¸°à¸šà¸šà¸ à¸²à¸¢à¹ƒà¸™à¹€à¸ªà¸£à¹‡à¸ˆà¸ªà¸´à¹‰à¸™à¸„à¸£à¸šà¸–à¹‰à¸§à¸™ à¸ªà¹ˆà¸‡à¸•à¹ˆà¸­à¸•à¸£à¸§à¸ˆà¹€à¸­à¸à¸ªà¸²à¸£à¹€à¸œà¸¢à¹à¸žà¸£à¹ˆ'
      });
    }

    if (updated > 0 || allDone) {
      updateRequest(req, activeUser, 'COMPLETE_DATA_TASK', `à¸­à¸±à¸›à¹€à¸”à¸•à¸œà¸¥à¸ à¸²à¸£à¸à¸´à¸ˆà¸„à¹‰à¸™à¸«à¸²à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸” à¸ªà¹ˆà¸‡à¹„à¸›à¸¢à¸±à¸‡à¸‚à¸±à¹‰à¸™à¸•à¸­à¸™à¸•à¹ˆà¸­à¹„à¸›`);
      reloadData();
    }
  };

  const handleTaskFileUpload = async (reqId: string, taskId: string, files: FileList | null) => {
    if (!files || files.length === 0 || !activeUser) return;
    const file = files[0];
    
    if (file.size > 3 * 1024 * 1024) {
      alert('à¸‚à¸™à¸²à¸”à¹„à¸Ÿà¸¥à¹Œà¹€à¸à¸´à¸™ 3MB (à¸ˆà¸³à¸à¸±à¸”à¸—à¸µà¹ˆ 3MB à¹€à¸™à¸·à¹ˆà¸­à¸‡à¸ˆà¸²à¸à¸‚à¹‰à¸­à¸ˆà¸³à¸à¸±à¸”à¸‚à¸­à¸‡ Cloud Server)');
      return;
    }
    
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || file.name.toLowerCase().match(/\.(jpg|jpeg|png)$/);
    if (!isPdf && !isImage) {
      alert('à¸à¸£à¸¸à¸“à¸²à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¹„à¸Ÿà¸¥à¹Œ PDF à¸«à¸£à¸·à¸­à¸£à¸¹à¸›à¸ à¸²à¸ž (JPG/PNG) à¹€à¸—à¹ˆà¸²à¸™à¸±à¹‰à¸™');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const fileData = e.target?.result as string;
      try {
        const res = await fetch(`/api/requests/${reqId}/tasks/${taskId}/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('pdpa_jwt_token')}`
          },
          body: JSON.stringify({ filename: file.name, fileData })
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            const req = getRequestClone(reqId);
            if (req) {
              const t = req.dataCollectionTasks.find((t: any) => t.id === taskId);
              if (t) {
                if (!t.uploadedFiles) t.uploadedFiles = [];
                t.uploadedFiles.push({
                  id: data.fileId,
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  isDeleted: false,
                  isMasked: false,
                  watermarkApplied: false,
                  uploadedAt: new Date().toISOString(),
                  fileUrl: data.fileId
                });
                t.status = 'found';
                t.completedAt = new Date().toISOString();
                t.completedBy = activeUser?.fullNameTh;
                t.dataLineage = `à¸£à¸°à¸šà¸š ${t.systemName} -> à¸à¸§à¸²à¸”à¸„à¹‰à¸™à¸«à¸²à¸”à¹‰à¸§à¸¢ SQL / Index -> à¸ˆà¸±à¸”à¹€à¸à¹‡à¸šà¹„à¸Ÿà¸¥à¹Œà¹ƒà¸™ Object Private Container`;
              }
              updateRequest(req, activeUser, 'UPLOAD_FILE', 'à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¹€à¸­à¸à¸ªà¸²à¸£à¹ƒà¸«à¸¡à¹ˆà¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸š à¹à¸¥à¸°à¸­à¸±à¸›à¹€à¸”à¸•à¸ªà¸–à¸²à¸™à¸°à¹€à¸›à¹‡à¸™à¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥');
              reloadData();
            }
          } else {
            alert('à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ: ' + data.message);
          }
        } else {
          let errText = 'Upload failed';
          try {
            const errData = await res.json();
            errText = errData.message || errText;
          } catch(err) {
            errText = res.statusText;
          }
          alert(`à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ (HTTP ${res.status}): ${errText}`);
        }
      } catch (err: any) {
        alert('à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¹ƒà¸™à¸à¸²à¸£à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”: ' + err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleMarkTaskNotFound = (reqId: string, taskId: string) => {
    if (!activeUser) return;
    const req = getRequestClone(reqId);
    if (!req) return;
    const t = req.dataCollectionTasks.find((t: any) => t.id === taskId);
    if (t) {
      if (!confirm(`à¸„à¸¸à¸“à¹à¸™à¹ˆà¹ƒà¸ˆà¸«à¸£à¸·à¸­à¹„à¸¡à¹ˆà¸—à¸µà¹ˆà¸ˆà¸°à¹à¸ˆà¹‰à¸‡à¸§à¹ˆà¸² "à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥" à¸ªà¸³à¸«à¸£à¸±à¸šà¸£à¸°à¸šà¸š ${t.systemName}?`)) return;
      t.status = 'not_found';
      t.completedAt = new Date().toISOString();
      t.completedBy = activeUser.fullNameTh;
      t.dataLineage = `à¸£à¸°à¸šà¸š ${t.systemName} -> à¸à¸§à¸²à¸”à¸„à¹‰à¸™à¸«à¸²à¸”à¹‰à¸§à¸¢ SQL / Index -> à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥`;
      updateRequest(req, activeUser, 'MARK_NOT_FOUND', `à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¹à¸ˆà¹‰à¸‡à¸§à¹ˆà¸²à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹ƒà¸™à¸£à¸°à¸šà¸š ${t.systemName}`);
      reloadData();
    }
  };

  const handleTaskFileDelete = async (reqId: string, taskId: string, fileId: string) => {
    if (!activeUser) return;
    if (!confirm('à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¸¥à¸šà¹„à¸Ÿà¸¥à¹Œà¸™à¸µà¹‰? (à¹„à¸Ÿà¸¥à¹Œà¸ˆà¸°à¸–à¸¹à¸à¸¥à¸šà¸­à¸­à¸à¸ˆà¸²à¸à¸«à¸™à¹‰à¸²à¸ˆà¸­à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰ à¹à¸•à¹ˆà¸¢à¸±à¸‡à¸„à¸‡à¹€à¸à¹‡à¸šà¸›à¸£à¸°à¸§à¸±à¸•à¸´à¹„à¸§à¹‰à¹ƒà¸™à¸£à¸°à¸šà¸š)')) return;
    try {
      const res = await fetch(`/api/requests/${reqId}/tasks/${taskId}/files/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('pdpa_jwt_token')}` }
      });
      if (res.ok) {
        const req = getRequestClone(reqId);
        if (req) {
          const t = req.dataCollectionTasks.find((t: any) => t.id === taskId);
          if (t && t.uploadedFiles) {
            const f = t.uploadedFiles.find((f: any) => f.id === fileId);
            if (f) f.isDeleted = true;
          }
          updateRequest(req, activeUser, 'DELETE_FILE', 'à¸¥à¸šà¹€à¸­à¸à¸ªà¸²à¸£à¸­à¸­à¸à¸ˆà¸²à¸à¸£à¸°à¸šà¸š');
          reloadData();
        }
      } else {
        alert('à¸¥à¸šà¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ');
      }
    } catch (e) {
      alert('à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¹ƒà¸™à¸à¸²à¸£à¸¥à¸šà¹„à¸Ÿà¸¥à¹Œ');
    }
  };

  const handleOwnerEscalateFlow = (reqId: string) => {
    if (!activeUser) return;
    if (!confirm('à¸„à¸¸à¸“à¹à¸™à¹ˆà¹ƒà¸ˆà¸«à¸£à¸·à¸­à¹„à¸¡à¹ˆà¸—à¸µà¹ˆà¸ˆà¸°à¹à¸ˆà¹‰à¸‡à¸§à¹ˆà¸²à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥ à¹à¸¥à¸°à¸ªà¹ˆà¸‡à¹€à¸£à¸·à¹ˆà¸­à¸‡à¸™à¸µà¹‰à¸‚à¹‰à¸²à¸¡à¹„à¸›à¸¢à¸±à¸‡à¸œà¸¹à¹‰à¸šà¸£à¸´à¸«à¸²à¸£à¹‚à¸”à¸¢à¸•à¸£à¸‡?')) return;
    const req = getRequestClone(reqId);
    if (!req) return;

    req.dataCollectionTasks.forEach((t: DataCollectionTask) => {
      if (t.status === 'pending') {
        t.status = 'not_found';
        t.completedAt = new Date().toISOString();
        t.completedBy = activeUser.fullNameTh;
        t.dataLineage = `à¸£à¸°à¸šà¸š ${t.systemName} -> à¸à¸§à¸²à¸”à¸„à¹‰à¸™à¸«à¸²à¸”à¹‰à¸§à¸¢ SQL / Index -> à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥ -> à¸ªà¹ˆà¸‡à¸œà¸¹à¹‰à¸šà¸£à¸´à¸«à¸²à¸£à¸•à¸±à¸”à¸ªà¸´à¸™à¹ƒà¸ˆ`;
      }
    });

    // Escalate the entire request to Executive Approval
    req.status = 'Executive Approval';
    req.statusHistory.push({
      status: 'Executive Approval',
      changedAt: new Date().toISOString(),
      changedBy: activeUser.fullNameTh,
      comment: `à¸ªà¹ˆà¸‡à¹€à¸£à¸·à¹ˆà¸­à¸‡à¹ƒà¸«à¹‰à¸œà¸¹à¹‰à¸šà¸£à¸´à¸«à¸²à¸£à¸•à¸±à¸”à¸ªà¸´à¸™à¹ƒà¸ˆ à¹€à¸™à¸·à¹ˆà¸­à¸‡à¸ˆà¸²à¸à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹ƒà¸™à¸£à¸°à¸šà¸š`
    });

    updateRequest(req, activeUser, 'ESCALATE_DATA_TASK', `à¸ªà¹ˆà¸‡à¹€à¸£à¸·à¹ˆà¸­à¸‡à¹ƒà¸«à¹‰à¸œà¸¹à¹‰à¸šà¸£à¸´à¸«à¸²à¸£à¸•à¸±à¸”à¸ªà¸´à¸™à¹ƒà¸ˆ à¹€à¸™à¸·à¹ˆà¸­à¸‡à¸ˆà¸²à¸à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥`);
    reloadData();
  };

  const executeFileDownload = async () => {
    // Deprecated: User requested to remove download functionality
    setDownloadConfirm(null);
  };

  const handleTaskFileReview = async (reqId: string, taskId: string, file: any) => {
    if (!activeUser) return;
    try {
      const jwtToken = sessionStorage.getItem('pdpa_token') || sessionStorage.getItem('pdpa_jwt_token') || '';
      const res = await fetch(`/api/requests/${reqId}/tasks/${taskId}/files/${file.id}`, {
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setPreviewAttachment({
          name: data.filename || file.name,
          fileUrl: data.fileData,
          size: file.size,
          isMasked: file.isMasked,
          watermarkApplied: file.watermarkApplied
        });
      } else {
        alert('à¸”à¸¶à¸‡à¹„à¸Ÿà¸¥à¹Œà¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ: ' + data.message);
      }
    } catch (err) {
      alert('à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¹ƒà¸™à¸à¸²à¸£à¸”à¸¶à¸‡à¹„à¸Ÿà¸¥à¹Œ');
    }
  };

  const handleUnassignTask = (reqId: string, taskId: string) => {
    if (!activeUser) return;
    if (!confirm('à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¸¢à¸à¹€à¸¥à¸´à¸à¸à¸²à¸£à¸¡à¸­à¸šà¸«à¸¡à¸²à¸¢à¸‡à¸²à¸™à¸ªà¸·à¸šà¸„à¹‰à¸™à¸™à¸µà¹‰? (à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ à¸²à¸£à¸à¸´à¸ˆà¸™à¸µà¹‰à¸ˆà¸°à¸–à¸¹à¸à¸¥à¸šà¸­à¸­à¸à¸ˆà¸²à¸à¸£à¸²à¸¢à¸à¸²à¸£)')) return;
    const req = getRequestClone(reqId);
    if (!req) return;
    const taskIndex = req.dataCollectionTasks.findIndex((t: any) => t.id === taskId);
    if (taskIndex !== -1) {
      const sysName = req.dataCollectionTasks[taskIndex].systemName;
      req.dataCollectionTasks.splice(taskIndex, 1);
      updateRequest(req, activeUser, 'UNASSIGN_TASK', `à¸¢à¸à¹€à¸¥à¸´à¸à¸à¸²à¸£à¸¡à¸­à¸šà¸«à¸¡à¸²à¸¢à¹à¸¥à¸°à¸¥à¸šà¸ à¸²à¸£à¸à¸´à¸ˆà¸„à¹‰à¸™à¸«à¸²à¸£à¸°à¸šà¸š ${sysName}`);
      reloadData();
    }
  };

  // Redaction applied callback (Section 3.6)
  const handleRedactionApplied = (
    reqId: string,
    redactRecord: Omit<RedactionRecord, 'id' | 'timestamp' | 'operator'>
  ) => {
    if (!activeUser) return;
    const req = getRequestClone(reqId);
    if (!req) return;

    const newRecord: RedactionRecord = {
      ...redactRecord,
      id: `red_${Date.now()}`,
      operator: activeUser.fullNameTh,
      timestamp: new Date().toISOString()
    };

    const cleanNewItem = newRecord.itemRedacted.replace(/\s*\([^)]*\)/g, '').trim();
    const existingIdx = req.redactionRecords.findIndex(r => {
      const cleanExisting = r.itemRedacted.replace(/\s*\([^)]*\)/g, '').trim();
      return cleanExisting === cleanNewItem;
    });
    if (existingIdx >= 0) {
      req.redactionRecords[existingIdx] = newRecord;
    } else {
      req.redactionRecords.push(newRecord);
    }
    
    if (req.status !== 'Redaction Required') {
      req.status = 'Redaction Required';
      req.statusHistory.push({
        status: 'Redaction Required',
        changedAt: new Date().toISOString(),
        changedBy: activeUser.fullNameTh,
        comment: 'à¹€à¸£à¸´à¹ˆà¸¡à¹€à¸‹à¹‡à¸™à¹€à¸‹à¸­à¸£à¹Œà¸›à¸à¸›à¸´à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¸šà¸¸à¸„à¸„à¸¥à¸­à¸·à¹ˆà¸™à¹ƒà¸™à¸£à¸²à¸¢à¸‡à¸²à¸™'
      });
    }

    updateRequest(req, activeUser, 'REDACT_DOCUMENT', `à¸›à¸à¸›à¸´à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸—à¸µà¹ˆ: ${newRecord.itemRedacted} à¹ƒà¸™à¹„à¸Ÿà¸¥à¹Œ: ${newRecord.itemId}`);
    reloadData();
  };

  const handleSaveRedactionAll = async (reqId: string) => {
    if (!activeUser) return;
    const req = getRequestClone(reqId);
    if (!req) return;

    try {
      // Transition to DPO or Legal review
      await changeRequestStatus(getRequestClone(reqId), 'DPO or Legal Review', activeUser, 'à¸šà¸±à¸™à¸—à¸¶à¸à¸à¸²à¸£à¸–à¸¡à¸”à¸³à¹à¸¥à¸°à¸ªà¹ˆà¸‡à¸•à¹ˆà¸­à¹ƒà¸«à¹‰à¸à¸Žà¸«à¸¡à¸²à¸¢/DPO à¸žà¸´à¸ˆà¸²à¸£à¸“à¸²à¸à¸²à¸™à¸ªà¸´à¸—à¸˜à¸´à¹Œà¹à¸¥à¸°à¹€à¸­à¸à¸ªà¸²à¸£à¹à¸ˆà¹‰à¸‡à¸œà¸¥', config || undefined);
      showNotify('à¸šà¸±à¸™à¸—à¸¶à¸à¸œà¸¥à¸à¸²à¸£à¸›à¸à¸›à¸´à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹à¸¥à¸°à¸­à¸±à¸›à¹€à¸”à¸•à¸ªà¸–à¸²à¸™à¸°à¹€à¸›à¹‡à¸™ "DPO or Legal Review" à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§', 'success');
      reloadData();
    } catch (error: any) {
      console.error(error);
      showNotify(error.message || 'à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¹ƒà¸™à¸à¸²à¸£à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥ à¸à¸£à¸¸à¸“à¸²à¸¥à¸­à¸‡à¹ƒà¸«à¸¡à¹ˆà¸­à¸µà¸à¸„à¸£à¸±à¹‰à¸‡', 'error');
    }
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

  const handleFeeSubmit = async (e: React.FormEvent, reqId: string) => {
    e.preventDefault();
    if (!activeUser) return;
    const req = getRequestClone(reqId);
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

    await safeUpdateRequest(req, activeUser, 'CALCULATE_FEE', `à¸„à¸³à¸™à¸§à¸“à¸­à¸±à¸•à¸£à¸²à¸„à¹ˆà¸²à¸˜à¸£à¸£à¸¡à¹€à¸™à¸µà¸¢à¸¡à¸ªà¸³à¹€à¸£à¹‡à¸ˆ à¸¢à¸­à¸”à¸ªà¸¸à¸—à¸˜à¸´: ${subtotal} à¸šà¸²à¸— (à¸ªà¸–à¸²à¸™à¸°: ${subtotal > 0 ? 'à¸£à¸­à¸™à¸±à¸”à¸Šà¸³à¸£à¸°' : 'à¸¢à¸à¹€à¸§à¹‰à¸™'})`);
    reloadData();
    showNotify('à¸„à¸³à¸™à¸§à¸“à¹à¸¥à¸°à¸šà¸±à¸™à¸—à¸¶à¸à¸­à¸±à¸•à¸£à¸²à¸„à¹ˆà¸²à¸˜à¸£à¸£à¸¡à¹€à¸™à¸µà¸¢à¸¡à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§');
  };

  // Simulating Payment Upload / Verification
  const handleMarkAsPaid = async (reqId: string) => {
    if (!activeUser) return;
    const req = getRequestClone(reqId);
    if (!req) return;

    req.feeCalculation.paymentStatus = 'paid';
    req.feeCalculation.paymentReceiptNo = `REC-${Date.now().toString().substr(-6)}`;
    req.feeCalculation.paidAt = new Date().toISOString();

    updateRequest(req, activeUser, 'RECEIVE_PAYMENT', `à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¸Šà¸³à¸£à¸°à¹€à¸‡à¸´à¸™à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢ à¹ƒà¸šà¹€à¸ªà¸£à¹‡à¸ˆà¹€à¸¥à¸‚à¸—à¸µà¹ˆ: ${req.feeCalculation.paymentReceiptNo}`);
    
    // Automatically advance state
    if (req.status === 'Awaiting Payment' || req.status === 'Fee Notification') {
      await changeRequestStatus(getRequestClone(reqId), 'Ready for Delivery', activeUser, 'à¸Šà¸³à¸£à¸°à¸„à¹ˆà¸²à¸˜à¸£à¸£à¸¡à¹€à¸™à¸µà¸¢à¸¡à¹à¸¥à¹‰à¸§ à¹€à¸•à¸£à¸µà¸¢à¸¡à¸ªà¹ˆà¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¸´à¸—à¸˜à¸´à¹Œà¸—à¸²à¸‡à¸Šà¹ˆà¸­à¸‡à¸—à¸²à¸‡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢', config || undefined);
    }
    
    reloadData();
  };

  // DPO and Approver Decisions (Section 3.7)
  const [decisionType, setDecisionType] = useState<'approved' | 'partially_approved' | 'denied' | 'no_data'>('approved');
  const [denialBasisCode, setDenialBasisCode] = useState('');
  const [legalBasisInput, setLegalBasisInput] = useState('à¸¡à¸²à¸•à¸£à¸² 30 à¸§à¸£à¸£à¸„à¸«à¸™à¸¶à¹ˆà¸‡ à¹à¸«à¹ˆà¸‡à¸žà¸£à¸°à¸£à¸²à¸Šà¸šà¸±à¸à¸à¸±à¸•à¸´à¸„à¸¸à¹‰à¸¡à¸„à¸£à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥ à¸ž.à¸¨. 2562');
  const [decisionNotes, setDecisionNotes] = useState('');

  const handleSubmitDecisionProposal = async (reqId: string) => {
    if (!activeUser) return;
    
    // Check DPO Signature
    if (!activeUser.signature_image) {
      showNotify('à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£à¹„à¸”à¹‰ à¹€à¸™à¸·à¹ˆà¸­à¸‡à¸ˆà¸²à¸à¸—à¹ˆà¸²à¸™à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¸¥à¸²à¸¢à¸¡à¸·à¸­à¸Šà¸·à¹ˆà¸­ (E-Signature) à¹ƒà¸™à¹‚à¸›à¸£à¹„à¸Ÿà¸¥à¹Œ à¸à¸£à¸¸à¸“à¸²à¹„à¸›à¸—à¸µà¹ˆà¹€à¸¡à¸™à¸¹à¹‚à¸›à¸£à¹„à¸Ÿà¸¥à¹Œà¹€à¸žà¸·à¹ˆà¸­à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¸¥à¸²à¸¢à¸¡à¸·à¸­à¸Šà¸·à¹ˆà¸­à¸à¹ˆà¸­à¸™à¸—à¸³à¸à¸²à¸£à¹€à¸ªà¸™à¸­à¸§à¸´à¸™à¸´à¸ˆà¸‰à¸±à¸¢', 'warning');
      return;
    }

    const req = getRequestClone(reqId);
    if (!req) return;

    const reasons: string[] = [];
    if (decisionType === 'denied') {
      const selectedReason = config?.rejectionReasons.find(r => r.code === denialBasisCode);
      reasons.push(selectedReason ? selectedReason.labelTh : 'à¸à¸²à¸£à¸›à¸à¸´à¹€à¸ªà¸˜à¹€à¸™à¸·à¹ˆà¸­à¸‡à¸ˆà¸²à¸à¸ªà¸´à¸—à¸˜à¸´à¸‚à¸±à¸”à¸à¸±à¸šà¸à¸Žà¸«à¸¡à¸²à¸¢à¸«à¸¥à¸±à¸');
    } else if (decisionType === 'partially_approved') {
      reasons.push('à¸›à¸à¸›à¸´à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¸‚à¸­à¸‡à¸šà¸¸à¸„à¸„à¸¥à¸­à¸·à¹ˆà¸™à¹€à¸žà¸·à¹ˆà¸­à¸£à¸±à¸à¸©à¸²à¸„à¸§à¸²à¸¡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢');
    } else {
      reasons.push('à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¸–à¸¹à¸à¸•à¹‰à¸­à¸‡à¸•à¸£à¸‡à¸•à¸²à¸¡à¸‚à¸­à¸šà¹€à¸‚à¸•à¹à¸¥à¸°à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¢à¸à¹€à¸§à¹‰à¸™à¸›à¸à¸´à¹€à¸ªà¸˜à¸ªà¸´à¸—à¸˜à¸´');
    }

    req.decision = {
      result: decisionType,
      reasons,
      legalBasisText: legalBasisInput,
      dpoRecommendation: decisionNotes,
      dpoCheckedAt: new Date().toISOString(),
      dpoName: activeUser.fullNameTh,
      dpoSignatureImage: activeUser.signature_image || null
    };

    req.status = 'Approval Pending';
    req.statusHistory.push({
      status: 'Approval Pending',
      changedAt: new Date().toISOString(),
      changedBy: activeUser.fullNameTh,
      comment: `DPO à¸¢à¸·à¹ˆà¸™à¸‚à¹‰à¸­à¹€à¸ªà¸™à¸­à¸¡à¸¸à¸¡à¸¡à¸­à¸‡à¸à¸Žà¸«à¸¡à¸²à¸¢à¸ªà¸£à¸¸à¸›à¸œà¸¥: ${decisionType === 'approved' ? 'à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”' : decisionType === 'partially_approved' ? 'à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸šà¸²à¸‡à¸ªà¹ˆà¸§à¸™' : 'à¸›à¸à¸´à¹€à¸ªà¸˜à¸„à¸³à¸‚à¸­'}`
    });

    await safeUpdateRequest(req, activeUser, 'SUBMIT_DPO_DECISION', `à¸šà¸±à¸™à¸—à¸¶à¸à¸„à¸³à¸žà¸´à¸ˆà¸²à¸£à¸“à¸²à¸œà¸¥à¹à¸¥à¸°à¸‚à¸­à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸­à¸¢à¹ˆà¸²à¸‡à¹€à¸›à¹‡à¸™à¸—à¸²à¸‡à¸à¸²à¸£`);
    reloadData();
  };

  const handleApproverSign = async (reqId: string, resultStatus: 'Approved' | 'Partially Approved' | 'Denied' | 'No Data Found') => {
    if (!activeUser) return;
    
    if (!activeUser.signature_image) {
      showNotify('à¸à¸£à¸¸à¸“à¸²à¸•à¸±à¹‰à¸‡à¸„à¹ˆà¸²à¹‚à¸›à¸£à¹„à¸Ÿà¸¥à¹Œà¹à¸¥à¸°à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¸¥à¸²à¸¢à¸¡à¸·à¸­à¸Šà¸·à¹ˆà¸­à¸à¹ˆà¸­à¸™à¸—à¸³à¸à¸²à¸£à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸„à¸³à¸£à¹‰à¸­à¸‡', 'warning');
      return;
    }

    const req = getRequestClone(reqId);
    if (!req) return;

    if (req.decision) {
      req.decision.approvedAt = new Date().toISOString();
      req.decision.approverName = activeUser.fullNameTh;
      req.decision.approverOpinion = 'à¹€à¸«à¹‡à¸™à¸Šà¸­à¸šà¹à¸¥à¸°à¸¢à¸´à¸™à¸¢à¸­à¸¡à¹ƒà¸«à¹‰à¸¥à¸‡à¸™à¸²à¸¡à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸•à¸²à¸¡à¸›à¸£à¸°à¸à¸²à¸¨ DPO';
      req.decision.approverSignatureImage = activeUser.signature_image || null;
      await updateRequest(req, activeUser, 'APPROVER_SIGN', 'à¸œà¸¹à¹‰à¸šà¸£à¸´à¸«à¸²à¸£à¸¥à¸‡à¸™à¸²à¸¡à¹€à¸«à¹‡à¸™à¸Šà¸­à¸š');
    }

    // Change status using the mutated req reference
    await changeRequestStatus(req, resultStatus, activeUser, `à¸œà¸¹à¹‰à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸¡à¸µà¸„à¸³à¸ªà¸±à¹ˆà¸‡à¸­à¸¢à¹ˆà¸²à¸‡à¹€à¸›à¹‡à¸™à¸—à¸²à¸‡à¸à¸²à¸£: ${resultStatus}`, config || undefined);

    // If approved and has fees, go to payment. If not, go to Ready for Delivery (digital)
    if (['Approved', 'Partially Approved'].includes(resultStatus)) {
      if (req.feeCalculation && req.feeCalculation.totalCalculated > 0 && req.feeCalculation.paymentStatus === 'pending') {
        await changeRequestStatus(req, 'Fee Notification', activeUser, 'à¹à¸ˆà¹‰à¸‡à¹€à¸£à¸µà¸¢à¸à¹€à¸à¹‡à¸šà¸„à¹ˆà¸²à¸˜à¸£à¸£à¸¡à¹€à¸™à¸µà¸¢à¸¡à¸•à¸²à¸¡à¹ƒà¸šà¹à¸ˆà¹‰à¸‡à¸«à¸™à¸µà¹‰à¸à¹ˆà¸­à¸™à¸ªà¹ˆà¸‡à¸¡à¸­à¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥', config || undefined);
      } else {
        await changeRequestStatus(req, 'Ready for Delivery', activeUser, 'à¹„à¸¡à¹ˆà¸¡à¸µà¸„à¹ˆà¸²à¸˜à¸£à¸£à¸¡à¹€à¸™à¸µà¸¢à¸¡à¸«à¸£à¸·à¸­à¸¢à¸à¹€à¸§à¹‰à¸™à¹à¸¥à¹‰à¸§ à¹€à¸•à¸£à¸µà¸¢à¸¡à¸ªà¹ˆà¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¸´à¸—à¸˜à¸´à¹Œ', config || undefined);
      }
    } else {
      // Rejections or no data go straight to close or delivery of reject letter
      await changeRequestStatus(req, 'Ready for Delivery', activeUser, 'à¸žà¸£à¹‰à¸­à¸¡à¸ªà¹ˆà¸‡à¸¡à¸­à¸šà¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸Šà¸µà¹‰à¹à¸ˆà¸‡à¸„à¸³à¸›à¸à¸´à¹€à¸ªà¸˜ / à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥', config || undefined);
    }

    reloadData();
  };

  const handleExtendDownloadExpiration = async (reqId: string) => {
    if (!activeUser || activeUser.role !== 'admin') return;
    
    try {
      const res = await fetch(`/api/requests/${reqId}/extend-download-expiration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('pdpa_jwt_token') || sessionStorage.getItem('pdpa_token')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        showNotify('à¸•à¹ˆà¸­à¸­à¸²à¸¢à¸¸à¸à¸²à¸£à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¹€à¸­à¸à¸ªà¸²à¸£à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§ (à¹€à¸žà¸´à¹ˆà¸¡ 30 à¸§à¸±à¸™)');
        reloadData();
      } else {
        showNotify(`âš ï¸ à¸œà¸´à¸”à¸žà¸¥à¸²à¸”: ${data.message}`);
      }
    } catch (e) {
      console.error(e);
      showNotify('âš ï¸ à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¹ƒà¸™à¸à¸²à¸£à¸•à¹ˆà¸­à¸­à¸²à¸¢à¸¸à¸à¸²à¸£à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”');
    }
  };

  const handleRequestExtensionPublic = async () => {
    if (!downloadRequest) return;
    const req = getRequestClone(downloadRequest.id);
    if (!req) return;

    // Optional: Prevent spamming by checking if a request was already made recently
    const alreadyRequested = req.messageThread?.some(m => m.message.includes('à¸‚à¸­à¸•à¹ˆà¸­à¸­à¸²à¸¢à¸¸à¸à¸²à¸£à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¹€à¸­à¸à¸ªà¸²à¸£') && new Date(m.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000);
    if (alreadyRequested) {
      showNotify('à¸—à¹ˆà¸²à¸™à¹„à¸”à¹‰à¸ªà¹ˆà¸‡à¸„à¸³à¸‚à¸­à¸•à¹ˆà¸­à¸­à¸²à¸¢à¸¸à¹„à¸›à¹à¸¥à¹‰à¸§ à¸à¸£à¸¸à¸“à¸²à¸£à¸­à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£', 'warning');
      return;
    }

    const newMsg: MessageThread = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      senderName: `${req.requester.firstName} ${req.requester.lastName}`,
      message: `[à¸£à¸°à¸šà¸šà¸­à¸±à¸•à¹‚à¸™à¸¡à¸±à¸•à¸´] à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸£à¹‰à¸­à¸‡à¸‚à¸­à¸•à¹ˆà¸­à¸­à¸²à¸¢à¸¸à¸à¸²à¸£à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¹€à¸­à¸à¸ªà¸²à¸£ (à¹€à¸™à¸·à¹ˆà¸­à¸‡à¸ˆà¸²à¸à¸«à¸¡à¸”à¸­à¸²à¸¢à¸¸à¹€à¸¡à¸·à¹ˆà¸­: ${req.downloadExpiresAt ? new Date(req.downloadExpiresAt).toLocaleDateString('th-TH') : 'à¹„à¸¡à¹ˆà¸£à¸°à¸šà¸¸'})`,
      timestamp: new Date().toISOString()
    };
    req.messageThread = req.messageThread || [];
    req.messageThread.push(newMsg);

    const mockSubjectUser: UserType = { id: 'user', orgId: 'org_dopa', username: 'data.subject', fullNameTh: 'à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­', fullNameEn: 'Data Subject', email: '', role: 'intake', roles: ['intake'], mfaEnabled: false };
    
    try {
      await updateRequest(req, mockSubjectUser, 'SEND_MESSAGE', `à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸‚à¸­à¸•à¹ˆà¸­à¸­à¸²à¸¢à¸¸à¸à¸²à¸£à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¹€à¸­à¸à¸ªà¸²à¸£ à¹€à¸¥à¸‚à¸„à¸³à¸‚à¸­: ${req.trackingNo}`);
      setDownloadRequest(req); // Update local state so UI can reflect it if needed
      showNotify('à¸ªà¹ˆà¸‡à¸„à¸³à¸‚à¸­à¸•à¹ˆà¸­à¸­à¸²à¸¢à¸¸à¹„à¸›à¸¢à¸±à¸‡à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§ à¸à¸£à¸¸à¸“à¸²à¸£à¸­à¸à¸²à¸£à¸•à¸´à¸”à¸•à¹ˆà¸­à¸à¸¥à¸±à¸š', 'success');
    } catch (e) {
      console.error(e);
      showNotify('à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¹ƒà¸™à¸à¸²à¸£à¸ªà¹ˆà¸‡à¸„à¸³à¸‚à¸­à¸•à¹ˆà¸­à¸­à¸²à¸¢à¸¸', 'error');
    }
  };

  // Delivery package (Section 3.9)
  const handleMarkAsDelivered = async (reqId: string) => {
    if (!activeUser) return;
    const req = getRequestClone(reqId);
    if (!req) return;

    try {
      showNotify('à¸à¸³à¸¥à¸±à¸‡à¸ªà¹ˆà¸‡à¸­à¸µà¹€à¸¡à¸¥à¹à¸ˆà¹‰à¸‡à¸œà¸¥à¸à¸²à¸£à¸žà¸´à¸ˆà¸²à¸£à¸“à¸²...', 'info');
      // Call Backend API to send real email
      const jwtToken = sessionStorage.getItem('pdpa_token') || sessionStorage.getItem('pdpa_jwt_token') || '';
      const res = await fetch(`/api/requests/${reqId}/deliver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({
          trackingNo: req.trackingNo,
          email: req.requester.email,
          requesterName: req.requester.firstName + ' ' + req.requester.lastName
        })
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        showNotify(`à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¹ƒà¸™à¸à¸²à¸£à¸ªà¹ˆà¸‡à¸­à¸µà¹€à¸¡à¸¥: ${errBody.message || 'à¹€à¸‹à¸´à¸£à¹Œà¸Ÿà¹€à¸§à¸­à¸£à¹Œà¸›à¸à¸´à¹€à¸ªà¸˜à¸à¸²à¸£à¸ªà¹ˆà¸‡à¸­à¸µà¹€à¸¡à¸¥ à¸«à¸£à¸·à¸­à¸•à¸±à¹‰à¸‡à¸„à¹ˆà¸² SMTP à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡'}`, 'error');
        return; // Halt execution if email fails, do not change status!
      }

      showNotify('à¸ªà¹ˆà¸‡à¸­à¸µà¹€à¸¡à¸¥à¹à¸ˆà¹‰à¸‡à¸œà¸¥à¸à¸²à¸£à¸žà¸´à¸ˆà¸²à¸£à¸“à¸²à¹à¸¥à¸°à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸žà¸£à¹‰à¸­à¸¡à¸£à¸«à¸±à¸ª QR Code à¹ƒà¸«à¹‰à¸œà¸¹à¹‰à¸£à¹‰à¸­à¸‡à¸‚à¸­à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§!', 'success');

      await changeRequestStatus(getRequestClone(reqId), 'Delivered', activeUser, 'à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¸—à¸³à¸à¸²à¸£à¸ˆà¸±à¸”à¸ªà¹ˆà¸‡à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸£à¸²à¸Šà¸à¸²à¸£à¹à¸¥à¸°à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¸³à¹€à¸£à¹‡à¸ˆ (à¸žà¸£à¹‰à¸­à¸¡à¸­à¸µà¹€à¸¡à¸¥)', config || undefined);
      
      // Automatically close after delivery
      setTimeout(async () => {
        await changeRequestStatus(getRequestClone(reqId), 'Closed', activeUser, 'à¸„à¸³à¸‚à¸­à¸ªà¸´à¹‰à¸™à¸ªà¸¸à¸”à¸à¸£à¸°à¸šà¸§à¸™à¸à¸²à¸£ à¸šà¸±à¸™à¸—à¸¶à¸à¸£à¸°à¸¢à¸°à¹€à¸§à¸¥à¸²à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£à¹€à¸‰à¸¥à¸µà¹ˆà¸¢à¸›à¸´à¸”à¸‡à¸²à¸™', config || undefined);
        reloadData();
      }, 1000);
    } catch (error) {
      console.error(error);
      showNotify('à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¹ƒà¸™à¸à¸²à¸£à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­à¹€à¸‹à¸´à¸£à¹Œà¸Ÿà¹€à¸§à¸­à¸£à¹Œ', 'error');
    }
  };

  // Legal hold toggles (Section 3.11)
  const handleToggleLegalHold = (reqId: string) => {
    if (!activeUser) return;
    const req = getRequestClone(reqId);
    if (!req) return;

    req.legalHold = !req.legalHold;
    updateRequest(req, activeUser, 'TOGGLE_LEGAL_HOLD', `à¸›à¸£à¸±à¸šà¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™à¸ªà¸–à¸²à¸™à¸° Legal Hold à¹€à¸›à¹‡à¸™: ${req.legalHold ? 'à¹€à¸›à¸´à¸”à¹ƒà¸Šà¹‰à¸‡à¸²à¸™ (à¸«à¹‰à¸²à¸¡à¸—à¸³à¸¥à¸²à¸¢)' : 'à¸›à¸´à¸”à¸à¸²à¸£à¹ƒà¸Šà¹‰à¸‡à¸²à¸™'}`);
    reloadData();
  };

  // Retention & Destruction simulator (Section 3.11)
  const handleSimulateDestruction = (reqId: string) => {
    if (!activeUser) return;
    const req = getRequestClone(reqId);
    if (!req) return;

    if (req.legalHold) {
      showNotify('à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸—à¸³à¸¥à¸²à¸¢à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸—à¸µà¹ˆà¸­à¸¢à¸¹à¹ˆà¸ à¸²à¸¢à¹ƒà¸•à¹‰ Legal Hold à¸„à¸”à¸µà¸„à¸§à¸²à¸¡à¹„à¸”à¹‰');
      return;
    }

    req.status = 'Destroyed';
    req.destroyedDate = new Date().toISOString();
    req.destroyedBy = activeUser.fullNameTh;
    req.destroyedWitness = 'à¸§à¸´à¸¥à¸²à¸§à¸±à¸¥à¸¢à¹Œ à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸š (Auditor)';
    
    // Remove attachments payload to simulate clean delete
    req.attachments = [];
    req.dataCollectionTasks.forEach((t: DataCollectionTask) => t.uploadedFiles = []);

    req.statusHistory.push({
      status: 'Destroyed',
      changedAt: new Date().toISOString(),
      changedBy: activeUser.fullNameTh,
      comment: 'à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£à¸—à¸³à¸¥à¸²à¸¢à¸ªà¸³à¹€à¸™à¸²à¸«à¸¥à¸±à¸à¸à¸²à¸™à¸•à¸²à¸¡à¸à¸³à¸«à¸™à¸”à¸­à¸²à¸¢à¸¸à¸ˆà¸±à¸”à¹€à¸à¹‡à¸š 2 à¸›à¸µ à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§'
    });

    updateRequest(req, activeUser, 'DESTROY_EXPIRED_DATA', `à¸¥à¸šà¸—à¸³à¸¥à¸²à¸¢à¹„à¸Ÿà¸¥à¹Œà¹à¸¥à¸°à¹€à¸­à¸à¸ªà¸²à¸£à¸«à¸¥à¸±à¸à¸à¸²à¸™à¸£à¸°à¸šà¸¸à¸•à¸±à¸§à¸•à¸™à¸–à¸²à¸§à¸£à¸•à¸²à¸¡ Retention Policy à¸žà¸¢à¸²à¸™à¸£à¹ˆà¸§à¸¡à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸š: ${req.destroyedWitness}`);
    reloadData();
    showNotify('à¸—à¸³à¸¥à¸²à¸¢à¹€à¸­à¸à¸ªà¸²à¸£à¸«à¸¥à¸±à¸à¸à¸²à¸™à¹à¸¥à¸°à¸›à¸´à¸”à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§');
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

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser || !config) return;

    if (!configForm.changeReason) {
      showNotify('à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸à¹€à¸«à¸•à¸¸à¸œà¸¥à¹ƒà¸™à¸à¸²à¸£à¹à¸à¹‰à¹„à¸‚à¸à¸Žà¹€à¸à¸“à¸‘à¹Œà¸™à¹‚à¸¢à¸šà¸²à¸¢à¸„à¸§à¸²à¸¡à¸ªà¸­à¸”à¸„à¸¥à¹‰à¸­à¸‡');
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

    await saveComplianceConfig(updatedConfig, activeUser, configForm.changeReason);
    reloadData();
    showNotify('à¸šà¸±à¸™à¸—à¸¶à¸à¸„à¹ˆà¸²à¸à¸³à¸«à¸™à¸”à¸„à¸§à¸²à¸¡à¸ªà¸­à¸”à¸„à¸¥à¹‰à¸­à¸‡à¸—à¸²à¸‡à¸à¸Žà¸«à¸¡à¸²à¸¢à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§');
  };

  // SLA extension (Section 5)
  const handleExtendSla = (reqId: string, reason: string) => {
    if (!activeUser) return;
    const req = getRequestClone(reqId);
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
      reason: `à¸‚à¸¢à¸²à¸¢à¹€à¸§à¸¥à¸² SLA: ${reason}`,
      operator: activeUser.fullNameTh
    });

    updateRequest(req, activeUser, 'EXTEND_SLA_TIMELINE', `à¸‚à¸¢à¸²à¸¢à¸£à¸°à¸¢à¸°à¹€à¸§à¸¥à¸²à¸£à¸±à¸šà¸ªà¸´à¸—à¸˜à¸´à¹€à¸žà¸´à¹ˆà¸¡ ${config?.sla.extensionDays || 30} à¸§à¸±à¸™à¸”à¹‰à¸§à¸¢à¹€à¸«à¸•à¸¸à¸ˆà¸³à¹€à¸›à¹‡à¸™`);
    reloadData();
    showNotify('à¸‚à¸¢à¸²à¸¢à¹€à¸§à¸¥à¸² SLA à¸ªà¸³à¹€à¸£à¹‡à¸ˆ');
  };

  // Staff manual message post
  const [chatMessage, setChatMessage] = useState('');
  const handleExportAuditCSV = async () => {
    try {
      const headers = ['à¸§à¸±à¸™à¹à¸¥à¸°à¹€à¸§à¸¥à¸² (Timestamp)', 'à¸œà¸¹à¹‰à¸›à¸à¸´à¸šà¸±à¸•à¸´à¸‡à¸²à¸™ (User)', 'à¸šà¸—à¸šà¸²à¸— (Role)', 'à¸à¸²à¸£à¸à¸£à¸°à¸—à¸³ (Action)', 'à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸” (Details)', 'à¹€à¸¥à¸‚à¹„à¸­à¸žà¸µ (IP Address)', 'à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸„à¸§à¸²à¸¡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢ (Checksum)'];
      const rows = auditLogs.map(log => [
        new Date(log.timestamp).toLocaleString('th-TH'),
        `"${(log.actorName || '').replace(/"/g, '""')}"`,
        log.actorRole || '',
        `"${(log.action || '').replace(/"/g, '""')}"`,
        `"${(log.details || '').replace(/"/g, '""')}"`,
        log.ipAddress || '',
        log.checksum || ''
      ]);
      const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `pdpa_audit_logs_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      const user = getCurrentUser();
      await addAuditLog('EXPORT_AUDIT_CSV', 'à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¸£à¸²à¸¢à¸‡à¸²à¸™ Audit Logs à¹€à¸›à¹‡à¸™à¹„à¸Ÿà¸¥à¹Œ CSV', user);
      showNotify('à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¸£à¸²à¸¢à¸‡à¸²à¸™ Audit Logs (CSV) à¸ªà¸³à¹€à¸£à¹‡à¸ˆ');
      
      // Refresh audit logs to show this action
      const allLogs = await fetchAuditLogs();
      if (user && user.orgId) {
        setAuditLogs(allLogs.filter((l) => !l.orgId || l.orgId === user.orgId));
      } else {
        setAuditLogs(allLogs);
      }
    } catch (error) {
      console.error('Export failed:', error);
      showNotify('à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¹ƒà¸™à¸à¸²à¸£à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸” CSV');
    }
  };

  const handleSendMessage = (e: React.FormEvent, reqId: string, senderRole: 'staff' | 'user') => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const req = getRequestClone(reqId);
    if (!req) return;

    const newMsg: MessageThread = {
      id: `msg_${Date.now()}`,
      sender: senderRole,
      senderName: senderRole === 'staff' ? (activeUser?.fullNameTh || 'à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¸à¸Žà¸«à¸¡à¸²à¸¢') : `${req.requester.firstName} ${req.requester.lastName}`,
      message: chatMessage,
      timestamp: new Date().toISOString()
    };

    req.messageThread.push(newMsg);
    
    if (senderRole === 'staff' && activeUser) {
      updateRequest(req, activeUser, 'SEND_MESSAGE', `à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¸ªà¹ˆà¸‡à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡à¸ªà¸·à¹ˆà¸­à¸ªà¸²à¸£à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡à¹€à¸¥à¸‚à¸„à¸³à¸‚à¸­: ${req.trackingNo}`);
    } else {
      const mockSubjectUser: UserType = { id: 'user', orgId: 'org_dopa', username: 'data.subject', fullNameTh: 'à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­', fullNameEn: 'Data Subject', email: '', role: 'intake', roles: ['intake'], mfaEnabled: false };
      updateRequest(req, mockSubjectUser, 'SEND_MESSAGE', `à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸ªà¹ˆà¸‡à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡à¸•à¸´à¸”à¸•à¹ˆà¸­à¸à¸¥à¸±à¸šà¹€à¸¥à¸‚à¸„à¸³à¸‚à¸­: ${req.trackingNo}`);
    }

    setChatMessage('');
    reloadData();
    
    // Update tracked view if public is using it
    if (senderRole === 'user') {
      setTrackedRequest(req);
    }
  };

  // Clean UI lookup helper for active requests details
  const activeRequestObj = selectedRequestId ? filteredRequests.find(r => r.id === selectedRequestId) : null;

  return (
    <div className="min-h-screen print:min-h-0 print:h-auto print:block flex flex-col font-sans">
      
      {showCookieBanner && (
        <CookieBanner 
          onAcceptAll={() => handleSaveCookieConsent('accept_all', { necessary: true, analytics: true, marketing: true })}
          onRejectAll={() => handleSaveCookieConsent('reject_all', { necessary: true, analytics: false, marketing: false })}
          onCustomize={() => setShowCookieSettings(true)}
          onPolicyClick={() => setShowCookiePolicy(true)}
        />
      )}

      <CookieSettingsModal
        isOpen={showCookieSettings}
        onClose={() => setShowCookieSettings(false)}
        initialPreferences={cookiePreferences}
        onSave={(prefs) => handleSaveCookieConsent('custom', prefs)}
        onPolicyClick={() => {
          setShowCookieSettings(false);
          setShowCookiePolicy(true);
        }}
      />
      
      {showCookiePolicy && (
        <div className="fixed inset-0 z-[120] bg-white overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm z-10">
            <h2 className="text-xl font-bold text-gray-800">à¸™à¹‚à¸¢à¸šà¸²à¸¢à¸„à¸¸à¸à¸à¸µà¹‰ (Cookie Policy)</h2>
            <button onClick={() => setShowCookiePolicy(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X size={24} className="text-gray-600" />
            </button>
          </div>
          <CookiePolicy />
        </div>
      )}

      {/* Header Navigation Bar */}
      <div className="no-print bg-slate-900 text-slate-200 px-4 py-2 flex flex-wrap items-center justify-between text-xs gap-2 select-none border-b border-slate-800 z-10">
        <div className="flex items-center gap-2 font-bold">
          <Shield className="h-4 w-4 text-brand-500" />
          <span>à¸£à¸°à¸šà¸šà¸šà¸£à¸´à¸«à¸²à¸£à¸ˆà¸±à¸”à¸à¸²à¸£à¸à¸²à¸£à¸›à¸à¸´à¸šà¸±à¸•à¸´à¸•à¸²à¸¡à¸à¸Žà¸«à¸¡à¸²à¸¢à¸„à¸¸à¹‰à¸¡à¸„à¸£à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥ (PDPA Compliance Management)</span>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {/* If user is logged in as staff */}
          {activeUser ? (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-brand-400 font-bold bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
                ðŸ¢ {organizations.find((o) => o.id === currentViewOrgId)?.nameTh || 'à¸«à¸™à¹ˆà¸§à¸¢à¸‡à¸²à¸™à¸—à¸±à¹ˆà¸§à¹„à¸›'} ({activeUser.fullNameTh})
              </span>

              <button
                onClick={() => {
                  if (view === 'internal') {
                    setView('public');
                    setPublicTab('landing');
                  } else {
                    setView('internal');
                    setInternalTab('dashboard');
                    setSelectedRequestId(null);
                  }
                }}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold px-3 py-1 rounded transition text-xs shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                {view === 'internal' ? (
                  <><span>ðŸŒ à¸«à¸™à¹‰à¸²à¹€à¸§à¹‡à¸šà¸›à¸£à¸°à¸Šà¸²à¸Šà¸™</span><span className="opacity-50">â†—</span></>
                ) : (
                  <><span>â¬…ï¸ à¸à¸¥à¸±à¸šà¸«à¸™à¹‰à¸² Dashboard</span></>
                )}
              </button>

              {/* Show role switcher dropdown ONLY IF user holds multiple roles */}
              {activeUser.roles && activeUser.roles.length > 1 ? (
                <div className="flex items-center gap-1.5 border-l border-slate-700 pl-3">
                  <span className="text-slate-400 font-semibold text-[11px]">à¸ªà¸¥à¸±à¸šà¸šà¸—à¸šà¸²à¸—à¹ƒà¸™à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆ:</span>
                  <select
                    value={activeUser.role}
                    onChange={(e) => handleRoleChange(e.target.value as Role)}
                    className="bg-slate-800 border border-brand-500/50 text-brand-300 rounded px-2 py-0.5 font-bold text-[11px] focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    {[
                      { value: 'intake', label: 'Intake (à¸£à¸±à¸šà¸„à¸³à¸‚à¸­)' },
                      { value: 'owner', label: 'Data Owner (à¸ªà¸·à¸šà¸„à¹‰à¸™)' },
                      { value: 'dpo', label: 'DPO (à¸à¸Žà¸«à¸¡à¸²à¸¢/à¸–à¸¡à¸”à¸³)' },
                      { value: 'approver', label: 'Approver (à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´)' },
                      { value: 'auditor', label: 'Auditor (à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸š)' },
                      { value: 'admin', label: 'Admin (à¸œà¸¹à¹‰à¸”à¸¹à¹à¸¥à¸£à¸°à¸šà¸š)' }
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
                  <span className="text-slate-400 font-semibold text-[11px]">à¸ªà¸´à¸—à¸˜à¸´à¹Œà¸à¸²à¸£à¸—à¸³à¸‡à¸²à¸™:</span>
                  <span className="bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded font-bold text-[11px] uppercase">
                    {activeUser.role}
                  </span>
                </div>
              )}

              {/* Super Admin Tenant Switcher (Impersonation) */}
              {activeUser.isSuperAdmin && (
                <div className="flex items-center gap-1.5 border-l border-slate-700 pl-3 animate-fade-in">
                  <span className="text-amber-400 font-semibold text-[11px] flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> à¹à¸à¸‡à¸•à¸±à¸§ (Impersonate):
                  </span>
                  <select
                    value={impersonatedOrgId || ''}
                    onChange={(e) => setImpersonatedOrgId(e.target.value || null)}
                    className="bg-amber-900/30 border border-amber-500/50 text-amber-300 rounded px-2 py-0.5 font-bold text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-500 max-w-[150px] truncate"
                  >
                    <option value="">-- à¸”à¸¹à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸” (Global) --</option>
                    {organizations.map((org: any) => (
                      <option key={org.id} value={org.id}>
                        {org.nameTh} ({org.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 font-bold px-2.5 py-1 rounded transition text-xs shadow-sm cursor-pointer"
              >
                à¸•à¸±à¹‰à¸‡à¸„à¹ˆà¸²à¹‚à¸›à¸£à¹„à¸Ÿà¸¥à¹Œ
              </button>

              <button
                onClick={() => setIsChangePasswordModalOpen(true)}
                className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 font-bold px-2.5 py-1 rounded transition text-xs shadow-sm cursor-pointer"
              >
                à¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™
              </button>

              <button
                onClick={() => {
                  sessionStorage.clear();
                  setCurrentUser(null);
                  setActiveUser(null);
                  setSelectedRequestId(null);
                  setView('public');
                  setPublicTab('landing');
                  reloadData();
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-2.5 py-1 rounded transition text-xs shadow-sm cursor-pointer"
              >
                à¸­à¸­à¸à¸ˆà¸²à¸à¸£à¸°à¸šà¸š (Logout)
              </button>
            </div>
          ) : (
            /* If public visitor */
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold px-3 py-1 rounded transition flex items-center gap-1.5 text-xs"
            >
              <Lock className="h-3.5 w-3.5 text-brand-400" />
              <span>à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸š (Staff Login)</span>
            </button>
          )}
        </div>
      </div>

      {/* Staff Login Modal */}
      <StaffLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(user, requiresPasswordChange) => {
          setCurrentUser(user);
          setActiveUser(user);
          reloadData();
          setView('internal');
          setInternalTab('dashboard');
          
          if (requiresPasswordChange) {
            setIsForcePasswordChange(true);
            setIsChangePasswordModalOpen(true);
            showNotify('à¸„à¸¸à¸“à¸ˆà¸³à¹€à¸›à¹‡à¸™à¸•à¹‰à¸­à¸‡à¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™à¹€à¸žà¸·à¹ˆà¸­à¸„à¸§à¸²à¸¡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢', 'warning');
          } else {
            setIsForcePasswordChange(false);
          }
        }}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => {
          setIsChangePasswordModalOpen(false);
          setIsForcePasswordChange(false);
        }}
        forceMode={isForcePasswordChange}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={activeUser}
        onProfileUpdate={(updatedUser) => {
          setActiveUser(updatedUser);
          setCurrentUser(updatedUser);
        }}
        showNotify={showNotify}
      />

      {/* Document Template Edit Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
            <div className="bg-brand-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-brand-300" />
                <h3 className="font-bold text-base">
                  à¹à¸à¹‰à¹„à¸‚à¹à¸¡à¹ˆà¹à¸šà¸šà¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸£à¸²à¸Šà¸à¸²à¸£: {editingTemplate.nameTh}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="text-slate-400 hover:text-white transition"
              >
                âœ•
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
              const updated = templates.map((t) =>
                t.id === editingTemplate.id ? editingTemplate : t
              );
              setTemplates(updated);
              saveDocumentTemplates(updated);
              addAuditLog(
                  'UPDATE_TEMPLATE',
                  `à¹à¸à¹‰à¹„à¸‚à¹à¸¡à¹ˆà¹à¸šà¸šà¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸£à¸²à¸Šà¸à¸²à¸£: ${editingTemplate.nameTh} (${editingTemplate.id})`,
                  (activeUser || initialUser) as any
                );
                reloadData(); // Reload data async to get updated templates and logs
                setEditingTemplate(null);
                showNotify(
                  `à¸šà¸±à¸™à¸—à¸¶à¸à¸à¸²à¸£à¹à¸à¹‰à¹„à¸‚à¹à¸¡à¹ˆà¹à¸šà¸š "${editingTemplate.nameTh}" à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§`,
                  'success',
                  'à¸šà¸±à¸™à¸—à¸¶à¸à¹à¸¡à¹ˆà¹à¸šà¸šà¸ªà¸³à¹€à¸£à¹‡à¸ˆ'
                );
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    à¸£à¸«à¸±à¸ªà¹à¸¡à¹ˆà¹à¸šà¸š (Template ID)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editingTemplate.id}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    à¸£à¸°à¸”à¸±à¸šà¸„à¸§à¸²à¸¡à¸¥à¸±à¸š (Level)
                  </label>
                  <select
                    value={editingTemplate.confidentialityLevel}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        confidentialityLevel: e.target.value as 'SECRET' | 'CONFIDENTIAL' | 'NORMAL',
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white font-semibold focus:outline-none focus:border-brand-500"
                  >
                    <option value="NORMAL">NORMAL (à¸›à¸à¸•à¸´)</option>
                    <option value="CONFIDENTIAL">CONFIDENTIAL (à¸¥à¸±à¸š)</option>
                    <option value="SECRET">SECRET (à¸¥à¸±à¸šà¸¡à¸²à¸)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    à¹€à¸§à¸­à¸£à¹Œà¸Šà¸±à¸™ (Version)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTemplate.version}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        version: e.target.value,
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-semibold focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    à¸Šà¸·à¹ˆà¸­à¹à¸¡à¹ˆà¹à¸šà¸š (à¸ à¸²à¸©à¸²à¹„à¸—à¸¢)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTemplate.nameTh}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        nameTh: e.target.value,
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    à¸Šà¸·à¹ˆà¸­à¹à¸¡à¹ˆà¹à¸šà¸š (English / Reference)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTemplate.nameEn}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        nameEn: e.target.value,
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-500 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  à¸Šà¸·à¹ˆà¸­à¹€à¸£à¸·à¹ˆà¸­à¸‡à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸£à¸²à¸Šà¸à¸²à¸£ (Subject Template)
                </label>
                <input
                  type="text"
                  required
                  value={editingTemplate.subjectTemplate}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      subjectTemplate: e.target.value,
                    })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡à¹à¸¡à¹ˆà¹à¸šà¸šà¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸£à¸²à¸Šà¸à¸²à¸£ (Body Template)
                </label>
                <textarea
                  rows={8}
                  required
                  value={editingTemplate.bodyTemplate}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      bodyTemplate: e.target.value,
                    })
                  }
                  className="w-full border border-slate-300 rounded-lg p-3 font-mono text-[11px] leading-relaxed focus:outline-none focus:border-brand-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  * à¸ªà¸²à¸¡à¸²à¸£à¸–à¹ƒà¸Šà¹‰à¸•à¸±à¸§à¹à¸›à¸£à¸­à¸±à¸•à¹‚à¸™à¸¡à¸±à¸•à¸´à¸‚à¸­à¸‡à¸£à¸°à¸šà¸š à¹€à¸Šà¹ˆà¸™ <code className="bg-slate-100 px-1 rounded font-mono">{'{{trackingNo}}'}</code>, <code className="bg-slate-100 px-1 rounded font-mono">{'{{requesterName}}'}</code>, <code className="bg-slate-100 px-1 rounded font-mono">{'{{receivedDate}}'}</code>, <code className="bg-slate-100 px-1 rounded font-mono">{'{{channel}}'}</code>
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition"
                >
                  à¸¢à¸à¹€à¸¥à¸´à¸ (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg transition shadow-sm"
                >
                  à¸šà¸±à¸™à¸—à¸¶à¸à¸à¸²à¸£à¹à¸à¹‰à¹„à¸‚à¹à¸¡à¹ˆà¹à¸šà¸š (Save Template)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User & Access Management Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-brand-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-brand-300" />
                <h3 className="font-bold text-base">
                  {editingUser ? `à¸ˆà¸±à¸”à¸à¸²à¸£à¸ªà¸´à¸—à¸˜à¸´à¹Œà¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸‡à¸²à¸™: ${editingUser.fullNameTh}` : 'à¹€à¸žà¸´à¹ˆà¸¡à¸šà¸±à¸à¸Šà¸µà¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¹ƒà¸«à¸¡à¹ˆ (Add Staff User)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="text-slate-300 hover:text-white font-bold text-lg leading-none"
              >
                âœ•
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs text-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">à¸£à¸«à¸±à¸ªà¸œà¸¹à¹‰à¹ƒà¸Šà¹‰ (Username) *</label>
                  <input
                    type="text"
                    disabled={!!editingUser}
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    placeholder="à¹€à¸Šà¹ˆà¸™ staff.01"
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-mono text-brand-700 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">à¸­à¸µà¹€à¸¡à¸¥à¸‡à¸²à¸™ (Email) *</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder="à¹€à¸Šà¹ˆà¸™ somchai@dopa.go.th"
                    className="w-full border border-slate-300 rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">à¸Šà¸·à¹ˆà¸­-à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥ (à¸ à¸²à¸©à¸²à¹„à¸—à¸¢) *</label>
                  <input
                    type="text"
                    value={userForm.fullNameTh}
                    onChange={(e) => setUserForm({ ...userForm, fullNameTh: e.target.value })}
                    placeholder="à¹€à¸Šà¹ˆà¸™ à¸ªà¸¡à¸Šà¸²à¸¢ à¸£à¸±à¸šà¹€à¸£à¸·à¹ˆà¸­à¸‡"
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">à¸Šà¸·à¹ˆà¸­-à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥ (à¸ à¸²à¸©à¸²à¸­à¸±à¸‡à¸à¸¤à¸©)</label>
                  <input
                    type="text"
                    value={userForm.fullNameEn}
                    onChange={(e) => setUserForm({ ...userForm, fullNameEn: e.target.value })}
                    placeholder="à¹€à¸Šà¹ˆà¸™ Somchai Intake"
                    className="w-full border border-slate-300 rounded-lg p-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">à¸«à¸™à¹ˆà¸§à¸¢à¸‡à¸²à¸™ / à¹à¸œà¸™à¸ (Department)</label>
                <input
                  type="text"
                  value={userForm.department}
                  onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                  placeholder="à¹€à¸Šà¹ˆà¸™ à¸¨à¸¹à¸™à¸¢à¹Œà¸£à¸±à¸šà¹€à¸£à¸·à¹ˆà¸­à¸‡à¹à¸¥à¸°à¸„à¸±à¸”à¸à¸£à¸­à¸‡à¸„à¸³à¸‚à¸­ PDPA"
                  className="w-full border border-slate-300 rounded-lg p-2.5"
                />
              </div>

              <div className="border-t border-slate-200 pt-4">
                <label className="block font-bold text-slate-800 text-sm mb-2">
                  à¸šà¸—à¸šà¸²à¸—à¹à¸¥à¸°à¸ªà¸´à¸—à¸˜à¸´à¹Œà¸à¸²à¸£à¸—à¸³à¸‡à¸²à¸™ (Multi-Role Access Control)
                </label>
                <p className="text-[11px] text-slate-500 mb-3">
                  à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆ 1 à¸—à¹ˆà¸²à¸™à¸ªà¸²à¸¡à¸²à¸£à¸–à¸£à¸±à¸šà¸œà¸´à¸”à¸Šà¸­à¸šà¹„à¸”à¹‰à¸«à¸¥à¸²à¸¢à¸šà¸—à¸šà¸²à¸—à¸•à¸²à¸¡à¸à¸²à¸£à¸à¸³à¸«à¸™à¸”à¹‚à¸„à¸£à¸‡à¸ªà¸£à¹‰à¸²à¸‡à¸à¸²à¸£à¸›à¸à¸´à¸šà¸±à¸•à¸´à¸‡à¸²à¸™à¹ƒà¸™à¸­à¸‡à¸„à¹Œà¸à¸£
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  {(['admin', 'intake', 'owner', 'dpo', 'approver', 'auditor'] as Role[]).map((roleKey) => {
                    const isChecked = userForm.roles.includes(roleKey);
                    const roleLabels: Record<Role, string> = {
                      superadmin: 'SUPERADMIN - à¸œà¸¹à¹‰à¸”à¸¹à¹à¸¥à¸ªà¸¹à¸‡à¸ªà¸¸à¸”',
                      admin: 'ADMIN - à¸œà¸¹à¹‰à¸”à¸¹à¹à¸¥à¸£à¸°à¸šà¸š',
                      intake: 'INTAKE - à¸£à¸±à¸šà¹€à¸£à¸·à¹ˆà¸­à¸‡/à¸„à¸±à¸”à¸à¸£à¸­à¸‡',
                      owner: 'OWNER - à¸«à¸™à¹ˆà¸§à¸¢à¸‡à¸²à¸™à¸„à¸£à¸­à¸šà¸„à¸£à¸­à¸‡',
                      dpo: 'DPO - à¸„à¸¸à¹‰à¸¡à¸„à¸£à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥/à¸à¸Žà¸«à¸¡à¸²à¸¢',
                      approver: 'APPROVER - à¸œà¸¹à¹‰à¸šà¸£à¸´à¸«à¸²à¸£à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´',
                      auditor: 'AUDITOR - à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸­à¸´à¸ªà¸£à¸°'
                    };
                    return (
                      <label
                        key={roleKey}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition select-none ${
                          isChecked
                            ? 'bg-brand-50/70 border-brand-500 font-bold text-brand-900 shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            let nextRoles = [...userForm.roles];
                            if (e.target.checked) {
                              nextRoles.push(roleKey);
                            } else {
                              nextRoles = nextRoles.filter((r) => r !== roleKey);
                            }
                            if (nextRoles.length === 0) nextRoles = ['intake'];
                            setUserForm({ ...userForm, roles: nextRoles, role: nextRoles[0] });
                          }}
                          className="h-4 w-4 rounded text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-xs uppercase">{roleLabels[roleKey]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Real-time SOD Warning Display */}
              {(() => {
                const warnings = calculateSodWarnings(userForm.roles);
                if (warnings.length > 0) {
                  return (
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl space-y-1">
                      <div className="flex items-center gap-2 text-amber-900 font-bold">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span>âš ï¸ à¹à¸ˆà¹‰à¸‡à¹€à¸•à¸·à¸­à¸™à¸„à¸§à¸²à¸¡à¹€à¸ªà¸µà¹ˆà¸¢à¸‡à¸‚à¸±à¸”à¹à¸¢à¹‰à¸‡à¸—à¸²à¸‡à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆ (SOD Conflict Warning)</span>
                      </div>
                      <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5">
                        {warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                      <p className="text-[10px] text-amber-700 pt-1">
                        * à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹„à¸”à¹‰ à¸à¸£à¸¸à¸“à¸²à¸›à¸£à¸±à¸šà¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™à¸šà¸—à¸šà¸²à¸—à¸ªà¸´à¸—à¸˜à¸´à¹Œà¹ƒà¸«à¹‰à¸–à¸¹à¸à¸•à¹‰à¸­à¸‡à¸•à¸²à¸¡à¸«à¸¥à¸±à¸à¸à¸²à¸£à¸„à¸²à¸™à¸­à¸³à¸™à¸²à¸ˆ
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>âœ“ Compliant: à¸ªà¸´à¸—à¸˜à¸´à¹Œà¸—à¸µà¹ˆà¹€à¸¥à¸·à¸­à¸à¸ªà¸­à¸”à¸„à¸¥à¹‰à¸­à¸‡à¸à¸±à¸šà¸«à¸¥à¸±à¸à¸à¸²à¸£à¸„à¸²à¸™à¸­à¸³à¸™à¸²à¸ˆà¹à¸¥à¸°à¸¡à¸²à¸•à¸£à¸à¸²à¸™à¸„à¸§à¸²à¸¡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢ SOD</span>
                  </div>
                );
              })()}
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {editingUser && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const token = sessionStorage.getItem('pdpa_token') || sessionStorage.getItem('pdpa_jwt_token');
                        if (token) {
                          fetch(`/api/users/${editingUser.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ ...userForm, resetPassword: true })
                          })
                            .then((res) => res.json())
                            .then((data) => {
                              if (data.success) {
                                showNotify('à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™à¸–à¸¹à¸à¸•à¸±à¹‰à¸‡à¸„à¹ˆà¸²à¹ƒà¸«à¸¡à¹ˆà¹€à¸›à¹‡à¸™ 123456 à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§', 'success');
                              }
                            });
                        }
                      }}
                      className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold px-3 py-2 rounded-lg text-xs transition flex items-center gap-1.5"
                    >
                      <Lock className="h-3.5 w-3.5 text-amber-600" />
                      <span>à¸£à¸µà¹€à¸‹à¹‡à¸•à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™à¹€à¸›à¹‡à¸™ 123456</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        showNotify(`à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¸¥à¸šà¸œà¸¹à¹‰à¹ƒà¸Šà¹‰: ${editingUser.fullNameTh} à¸­à¸­à¸à¸ˆà¸²à¸à¸£à¸°à¸šà¸š?`, 'confirm', 'à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¸¥à¸šà¸œà¸¹à¹‰à¹ƒà¸Šà¹‰', () => {
                          const token = sessionStorage.getItem('pdpa_token') || sessionStorage.getItem('pdpa_jwt_token');
                          if (token) {
                            fetch(`/api/users/${editingUser.id}`, {
                              method: 'DELETE',
                              headers: { 'Authorization': `Bearer ${token}` }
                            })
                              .then((res) => res.json())
                              .then((data) => {
                                if (data.success) {
                                  showNotify('à¸¥à¸šà¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¸ªà¸³à¹€à¸£à¹‡à¸ˆ');
                                  reloadUsers();
                                  setIsUserModalOpen(false);
                                }
                              });
                          }
                        });
                      }}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold px-3 py-2 rounded-lg text-xs transition flex items-center gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                      <span>à¸¥à¸šà¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸‡à¸²à¸™</span>
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs transition"
                >
                  à¸¢à¸à¹€à¸¥à¸´à¸
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const token = sessionStorage.getItem('pdpa_token') || sessionStorage.getItem('pdpa_jwt_token');
                    if (!userForm.username || !userForm.fullNameTh) {
                      showNotify('à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸à¸£à¸«à¸±à¸ªà¸œà¸¹à¹‰à¹ƒà¸Šà¹‰ à¹à¸¥à¸°à¸Šà¸·à¹ˆà¸­-à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥à¹ƒà¸«à¹‰à¸„à¸£à¸šà¸–à¹‰à¸§à¸™', 'warning');
                      return;
                    }
                    if (calculateSodWarnings(userForm.roles).length > 0) {
                      showNotify('à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸šà¸±à¸™à¸—à¸¶à¸à¹„à¸”à¹‰ à¹€à¸™à¸·à¹ˆà¸­à¸‡à¸ˆà¸²à¸à¸¡à¸µà¸ªà¸´à¸—à¸˜à¸´à¹Œà¸—à¸µà¹ˆà¸‚à¸±à¸”à¹à¸¢à¹‰à¸‡à¸à¸±à¸™ (SOD Conflict) à¸à¸£à¸¸à¸“à¸²à¸›à¸£à¸±à¸šà¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™à¸šà¸—à¸šà¸²à¸—à¸ªà¸´à¸—à¸˜à¸´à¹Œà¹ƒà¸«à¹‰à¸–à¸¹à¸à¸•à¹‰à¸­à¸‡', 'error');
                      return;
                    }
                    if (!token) {
                      showNotify('à¹€à¸‹à¸ªà¸Šà¸±à¹ˆà¸™à¸«à¸¡à¸”à¸­à¸²à¸¢à¸¸ à¸à¸£à¸¸à¸“à¸²à¸­à¸­à¸à¸ˆà¸²à¸à¸£à¸°à¸šà¸šà¹à¸¥à¸°à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸šà¹ƒà¸«à¸¡à¹ˆ');
                      return;
                    }

                    try {
                      let res: Response;
                      if (editingUser) {
                        res = await fetch(`/api/users/${editingUser.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                          body: JSON.stringify(userForm)
                        });
                      } else {
                        res = await fetch('/api/users', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                          body: JSON.stringify({
                            id: `usr_${Date.now()}`,
                            orgId: activeUser?.orgId || 'org_dopa',
                            username: userForm.username,
                            fullName: userForm.fullNameTh,
                            fullNameEn: userForm.fullNameEn || userForm.fullNameTh,
                            email: userForm.email || `${userForm.username}@dopa.go.th`,
                            role: userForm.role,
                            roles: userForm.roles,
                            department: userForm.department
                          })
                        });
                      }

                      if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        showNotify(`à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸” (${res.status}): ${errData.message || errData.error || 'à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸£à¸±à¸šà¸­à¸™à¸¸à¸à¸²à¸• à¸à¸£à¸¸à¸“à¸²à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸ªà¸´à¸—à¸˜à¸´à¹Œà¸œà¸¹à¹‰à¹ƒà¸Šà¹‰'}`);
                        return;
                      }

                      const data = await res.json();
                      if (data.success) {
                        showNotify(editingUser ? 'à¸šà¸±à¸™à¸—à¸¶à¸à¸à¸²à¸£à¹à¸à¹‰à¹„à¸‚à¸ªà¸´à¸—à¸˜à¸´à¹Œà¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§' : 'à¹€à¸žà¸´à¹ˆà¸¡à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¸ªà¸³à¹€à¸£à¹‡à¸ˆ! à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™à¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™à¸„à¸·à¸­ 123456');
                        setIsUserModalOpen(false);
                        reloadUsers();
                      } else {
                        showNotify('à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”: ' + (data.error || data.message || 'à¹„à¸¡à¹ˆà¸—à¸£à¸²à¸šà¸ªà¸²à¹€à¸«à¸•à¸¸'));
                      }
                    } catch (err) {
                      showNotify('à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸•à¸´à¸”à¸•à¹ˆà¸­ Server à¹„à¸”à¹‰: ' + String(err));
                    }
                  }}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-5 py-2 rounded-lg text-xs transition shadow-sm"
                >
                  à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- RENDER VIEW: VERIFICATION & DOWNLOAD PORTAL --- */}
      {view === 'verify' && (
        <DocumentVerificationPortal
          requests={requests}
          organizations={organizations}
          onTriggerOtp={triggerRealOtp}
          onVerifyOtp={verifyRealOtp}
          onDownload={(reqId, otpCodeStr) => {
            handleDownloadAction(reqId, otpCodeStr);
          }}
        />
      )}

      {/* --- RENDER VIEW: SECURE QR CODE DOWNLOAD PAGE --- */}
      {view === 'download_qr' && dlToken && (
        <SecureDownloadPage token={dlToken} />
      )}

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
                  <h1 className="font-bold text-slate-900 text-base leading-tight">à¸£à¸°à¸šà¸šà¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­à¹€à¸‚à¹‰à¸²à¸–à¸¶à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥ (PDPA Access Portal)</h1>
                  <p className="text-xs text-slate-500">à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­à¹ƒà¸Šà¹‰à¸ªà¸´à¸—à¸˜à¸´à¹à¸¥à¸°à¸£à¸±à¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸„à¸§à¸²à¸¡à¸¡à¸±à¹ˆà¸™à¸„à¸‡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢à¸•à¸²à¸¡ à¸ž.à¸£.à¸š. à¸„à¸¸à¹‰à¸¡à¸„à¸£à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥ à¸ž.à¸¨. 2562</p>
                </div>
              </div>

              <div className="flex gap-4 text-xs font-semibold text-slate-700">
                <button
                  onClick={() => setPublicTab('landing')}
                  className={`hover:text-brand-600 transition ${publicTab === 'landing' ? 'text-brand-600 border-b-2 border-brand-600 pb-1' : ''}`}
                >
                  à¸«à¸™à¹‰à¸²à¸«à¸¥à¸±à¸à¸ªà¸´à¸—à¸˜à¸´à¹Œ
                </button>
                <button
                  onClick={() => setPublicTab('submit')}
                  className={`hover:text-brand-600 transition ${publicTab === 'submit' ? 'text-brand-600 border-b-2 border-brand-600 pb-1' : ''}`}
                >
                  à¸à¸£à¸­à¸à¸„à¸³à¸‚à¸­à¸­à¸­à¸™à¹„à¸¥à¸™à¹Œ
                </button>
                <button
                  onClick={() => {
                    setSearchKeyword('');
                    setTrackingError(null);
                    setShowSearchLookupModal(true);
                  }}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-sm flex items-center gap-1.5"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>à¸•à¸´à¸”à¸•à¸²à¸¡à¸ªà¸–à¸²à¸™à¸°à¸„à¸³à¸‚à¸­</span>
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
                      à¸ž.à¸£.à¸š. à¸„à¸¸à¹‰à¸¡à¸„à¸£à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥ à¸ž.à¸¨. 2562 (à¸¡à¸²à¸•à¸£à¸² 30)
                    </span>
                    <h2 className="text-2xl md:text-3xl font-bold leading-snug pt-1">
                      à¸¡à¸µà¸ªà¸´à¸—à¸˜à¸´à¸‚à¸­à¹€à¸‚à¹‰à¸²à¸–à¸¶à¸‡à¹à¸¥à¸°à¸£à¸±à¸šà¸ªà¸³à¹€à¸™à¸²à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¸‚à¸­à¸‡à¸—à¹ˆà¸²à¸™à¸—à¸µà¹ˆà¸­à¸¢à¸¹à¹ˆà¹ƒà¸™à¸„à¸§à¸²à¸¡à¸”à¸¹à¹à¸¥à¸‚à¸­à¸‡à¸­à¸‡à¸„à¹Œà¸à¸£
                    </h2>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      à¸—à¹ˆà¸²à¸™à¸ªà¸²à¸¡à¸²à¸£à¸–à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸£à¹‰à¸­à¸‡à¸‚à¸­à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸š à¸«à¸£à¸·à¸­à¸„à¸±à¸”à¸¥à¸­à¸à¹„à¸Ÿà¸¥à¹Œà¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸²à¸£à¸ˆà¸­à¸‡ à¸à¸²à¸£à¹€à¸‚à¹‰à¸²à¹ƒà¸Šà¹‰à¸šà¸£à¸´à¸à¸²à¸£ à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸žà¸™à¸±à¸à¸‡à¸²à¸™ à¸«à¸£à¸·à¸­à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸­à¸·à¹ˆà¸™à¸—à¸µà¹ˆà¹€à¸›à¹‡à¸™à¸‚à¸­à¸‡à¸—à¹ˆà¸²à¸™à¹„à¸”à¹‰à¸­à¸¢à¹ˆà¸²à¸‡à¸£à¸§à¸”à¹€à¸£à¹‡à¸§ à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢ à¹à¸¥à¸°à¸–à¸¹à¸à¸•à¹‰à¸­à¸‡à¸•à¸²à¸¡à¸‚à¸±à¹‰à¸™à¸•à¸­à¸™
                    </p>
                    <div className="flex flex-wrap gap-4 pt-3">
                      <button
                        onClick={() => setPublicTab('submit')}
                        className="bg-brand-600 hover:bg-brand-500 text-white text-base md:text-lg font-bold py-4 px-8 rounded-2xl shadow-xl shadow-brand-500/30 border border-brand-400 transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3 relative overflow-hidden group"
                      >
                        <div className="absolute inset-0 bg-white/20 w-full h-full transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                        <FileText className="w-5 h-5 relative z-10" />
                        <span className="relative z-10">à¸¢à¸·à¹ˆà¸™à¹à¸šà¸šà¸„à¸³à¸£à¹‰à¸­à¸‡à¸­à¸­à¸™à¹„à¸¥à¸™à¹Œ</span>
                      </button>
                      <button
                        onClick={() => {
                          setSearchKeyword('');
                          setTrackingError(null);
                          setShowSearchLookupModal(true);
                        }}
                        className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-base md:text-lg font-bold py-4 px-8 rounded-2xl shadow-lg transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3 backdrop-blur-md"
                      >
                        <Search className="w-5 h-5" />
                        à¸•à¸´à¸”à¸•à¸²à¸¡à¸ªà¸–à¸²à¸™à¸°à¸„à¸³à¸£à¹‰à¸­à¸‡à¹€à¸”à¸´à¸¡
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
                    <span className="block font-bold text-slate-800 text-sm">à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­à¹à¸¥à¸°à¸¢à¸·à¸™à¸¢à¸±à¸™à¸•à¸±à¸§</span>
                    <p className="text-xs text-slate-500 leading-relaxed">à¸à¸£à¸­à¸à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”à¸„à¸³à¸‚à¸­ à¹€à¸¥à¸·à¸­à¸à¸‚à¸­à¸šà¹€à¸‚à¸•à¸‚à¹‰à¸­à¸¡à¸¹à¸¥ à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¸ªà¸³à¹€à¸™à¸²à¸šà¸±à¸•à¸£à¸›à¸£à¸°à¸ˆà¸³à¸•à¸±à¸§à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™ (à¸žà¸£à¹‰à¸­à¸¡à¸£à¸±à¸šà¸£à¸­à¸‡à¸ªà¸³à¹€à¸™à¸²à¸–à¸¹à¸à¸•à¹‰à¸­à¸‡) à¹à¸¥à¸°à¸¢à¸·à¸™à¸¢à¸±à¸™à¸•à¸±à¸§à¸•à¸™à¸œà¹ˆà¸²à¸™à¸£à¸«à¸±à¸ª OTP</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
                    <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-600 font-bold flex items-center justify-center text-sm">2</div>
                    <span className="block font-bold text-slate-800 text-sm">à¸„à¸±à¸”à¸à¸£à¸­à¸‡à¸„à¸§à¸²à¸¡à¸ªà¸¡à¸šà¸¹à¸£à¸“à¹Œ</span>
                    <p className="text-xs text-slate-500 leading-relaxed">à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸„à¸§à¸²à¸¡à¸–à¸¹à¸à¸•à¹‰à¸­à¸‡à¹à¸¥à¸°à¸„à¸£à¸šà¸–à¹‰à¸§à¸™à¸‚à¸­à¸‡à¸„à¸³à¸‚à¸­à¸ à¸²à¸¢à¹ƒà¸™ 15 à¸§à¸±à¸™ à¸«à¸²à¸à¹€à¸­à¸à¸ªà¸²à¸£à¹„à¸¡à¹ˆà¸ªà¸¡à¸šà¸¹à¸£à¸“à¹Œà¸ˆà¸°à¹à¸ˆà¹‰à¸‡à¹ƒà¸«à¹‰à¸—à¹ˆà¸²à¸™à¸—à¸£à¸²à¸šà¹€à¸žà¸·à¹ˆà¸­à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£à¹à¸à¹‰à¹„à¸‚à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
                    <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-600 font-bold flex items-center justify-center text-sm">3</div>
                    <span className="block font-bold text-slate-800 text-sm">à¸žà¸´à¸ˆà¸²à¸£à¸“à¸²à¹à¸¥à¸°à¸„à¸±à¸”à¸¥à¸­à¸</span>
                    <p className="text-xs text-slate-500 leading-relaxed">à¸„à¹‰à¸™à¸«à¸² à¸£à¸§à¸šà¸£à¸§à¸¡ à¹à¸¥à¸°à¸›à¸à¸›à¸´à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸‚à¸­à¸‡à¸šà¸¸à¸„à¸„à¸¥à¸­à¸·à¹ˆà¸™ (à¸–à¹‰à¸²à¸¡à¸µ) à¸žà¸£à¹‰à¸­à¸¡à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£à¸•à¸²à¸¡à¸„à¸³à¸‚à¸­à¹ƒà¸«à¹‰à¹à¸¥à¹‰à¸§à¹€à¸ªà¸£à¹‡à¸ˆà¸ à¸²à¸¢à¹ƒà¸™ 30 à¸§à¸±à¸™ à¸™à¸±à¸šà¹à¸•à¹ˆà¸§à¸±à¸™à¸—à¸µà¹ˆà¹„à¸”à¹‰à¸£à¸±à¸šà¸„à¸³à¸‚à¸­à¸—à¸µà¹ˆà¸ªà¸¡à¸šà¸¹à¸£à¸“à¹Œ</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
                    <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-600 font-bold flex items-center justify-center text-sm">4</div>
                    <span className="block font-bold text-slate-800 text-sm">à¸£à¸±à¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢</span>
                    <p className="text-xs text-slate-500 leading-relaxed">à¸£à¸±à¸šà¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™à¸ªà¸³à¸«à¸£à¸±à¸šà¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸—à¸²à¸‡à¸£à¸°à¸šà¸šà¸­à¸´à¹€à¸¥à¹‡à¸à¸—à¸£à¸­à¸™à¸´à¸à¸ªà¹Œ (à¸¥à¸´à¸‡à¸à¹Œà¸¡à¸µà¸­à¸²à¸¢à¸¸à¸à¸²à¸£à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¸ˆà¸³à¸à¸±à¸”) à¸«à¸£à¸·à¸­à¸•à¸´à¸”à¸•à¹ˆà¸­à¸£à¸±à¸šà¹€à¸­à¸à¸ªà¸²à¸£à¸”à¹‰à¸§à¸¢à¸•à¸™à¹€à¸­à¸‡ à¸“ à¸ªà¸–à¸²à¸™à¸—à¸µà¹ˆà¸—à¸³à¸à¸²à¸£</p>
                  </div>
                </div>

                {/* à¸„à¹‰à¸™à¸«à¸²à¹à¸¥à¸°à¸•à¸´à¸”à¸•à¸²à¸¡à¸ªà¸–à¸²à¸™à¸°à¸„à¸³à¸‚à¸­ */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Search className="h-4 w-4 text-brand-600" />
                    <span>à¸„à¹‰à¸™à¸«à¸²à¹à¸¥à¸°à¸•à¸´à¸”à¸•à¸²à¸¡à¸ªà¸–à¸²à¸™à¸°à¸„à¸³à¸£à¹‰à¸­à¸‡à¸‚à¸­à¸‚à¹‰à¸­à¸¡à¸¹à¸¥ (Search & Track Status)</span>
                  </h3>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleTrackSubmit(e, trackNo);
                    }}
                    className="flex gap-2 flex-col sm:flex-row items-stretch"
                  >
                    <input
                      type="text"
                      placeholder="à¸žà¸´à¸¡à¸žà¹Œà¹€à¸¥à¸‚à¸„à¸³à¸‚à¸­ à¸«à¸£à¸·à¸­à¸„à¸³à¸„à¹‰à¸™à¸«à¸² à¹€à¸Šà¹ˆà¸™ 0008, DOPA, REQ-DOPA-2026-0008..."
                      value={trackNo}
                      onChange={(e) => setTrackNo(e.target.value)}
                      className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-brand-500 bg-white text-slate-900 font-medium"
                    />
                    <button
                      type="submit"
                      className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold py-2.5 px-6 rounded-lg transition shrink-0 shadow-sm"
                    >
                      à¸„à¹‰à¸™à¸«à¸²à¸„à¸³à¸£à¹‰à¸­à¸‡
                    </button>
                  </form>
                  {trackingError && (
                    <div className="text-rose-600 text-xs font-semibold mt-1 flex items-center gap-1 bg-rose-50 border border-rose-100 p-2.5 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                      <span>{trackingError}</span>
                    </div>
                  )}
                </div>

                {/* Warning & Disclaimers */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-900 text-xs">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block font-bold mb-1">à¸‚à¹‰à¸­à¸žà¸´à¸ˆà¸²à¸£à¸“à¸²à¸—à¸²à¸‡à¸à¸Žà¸«à¸¡à¸²à¸¢ (Legal Note):</span>
                    <p className="leading-relaxed">
                      {config?.disclaimerText || 'à¸£à¸°à¸šà¸šà¸™à¸µà¹‰à¹€à¸›à¹‡à¸™à¹€à¸„à¸£à¸·à¹ˆà¸­à¸‡à¸¡à¸·à¸­à¸ªà¸™à¸±à¸šà¸ªà¸™à¸¸à¸™à¸à¸²à¸£à¸”à¸³à¹€à¸™à¸´à¸™à¸‡à¸²à¸™ à¹„à¸¡à¹ˆà¹ƒà¸Šà¹ˆà¸£à¸°à¸šà¸šà¹ƒà¸«à¹‰à¸„à¸³à¸›à¸£à¸¶à¸à¸©à¸²à¸à¸Žà¸«à¸¡à¸²à¸¢à¹‚à¸”à¸¢à¸­à¸±à¸•à¹‚à¸™à¸¡à¸±à¸•à¸´ à¸à¸²à¸£à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´ à¸›à¸à¸´à¹€à¸ªà¸˜ à¸«à¸£à¸·à¸­à¹€à¸›à¸´à¸”à¹€à¸œà¸¢à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸•à¹‰à¸­à¸‡à¸œà¹ˆà¸²à¸™à¸à¸²à¸£à¸žà¸´à¸ˆà¸²à¸£à¸“à¸²à¸‚à¸­à¸‡à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¸œà¸¹à¹‰à¸£à¸±à¸šà¸œà¸´à¸”à¸Šà¸­à¸š'}
                    </p>
                  </div>
                </div>

                {/* FAQ details (Progressive disclosures) */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-brand-600" />
                    <span>à¸„à¸³à¸–à¸²à¸¡à¸—à¸µà¹ˆà¸žà¸šà¸šà¹ˆà¸­à¸¢à¹€à¸à¸µà¹ˆà¸¢à¸§à¸à¸±à¸šà¸à¸²à¸£à¸‚à¸­à¸ªà¸´à¸—à¸˜à¸´à¸‚à¹‰à¸­à¸¡à¸¹à¸¥ (FAQs)</span>
                  </h3>
                  
                  <div className="divide-y divide-slate-100 space-y-3 pt-2">
                    <div className="pt-2 space-y-1">
                      <span className="block font-semibold text-slate-700 text-xs">à¸¡à¸µà¸„à¹ˆà¸²à¹ƒà¸Šà¹‰à¸ˆà¹ˆà¸²à¸¢à¹ƒà¸™à¸à¸²à¸£à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸£à¹‰à¸­à¸‡à¸‚à¸­à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸«à¸£à¸·à¸­à¹„à¸¡à¹ˆ?</span>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        à¸à¸²à¸£à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¹€à¸­à¸à¸ªà¸²à¸£à¸­à¸´à¹€à¸¥à¹‡à¸à¸—à¸£à¸­à¸™à¸´à¸à¸ªà¹Œà¸œà¹ˆà¸²à¸™à¸£à¸°à¸šà¸šà¸žà¸­à¸£à¹Œà¸—à¸±à¸¥à¹„à¸¡à¹ˆà¸¡à¸µà¸„à¹ˆà¸²à¹ƒà¸Šà¹‰à¸ˆà¹ˆà¸²à¸¢ à¹à¸•à¹ˆà¸«à¸²à¸à¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¹ƒà¸«à¹‰à¸ˆà¸±à¸”à¸žà¸´à¸¡à¸žà¹Œà¸ªà¸³à¹€à¸™à¸²à¸¥à¸‡à¸à¸£à¸°à¸”à¸²à¸© A4 (à¹„à¸¡à¹ˆà¹€à¸à¸´à¸™à¹à¸œà¹ˆà¸™à¸¥à¸° 1 à¸šà¸²à¸—) à¸«à¸£à¸·à¸­à¸£à¸±à¸šà¸£à¸­à¸‡à¸ªà¸³à¹€à¸™à¸²à¸–à¸¹à¸à¸•à¹‰à¸­à¸‡ (à¹„à¸¡à¹ˆà¹€à¸à¸´à¸™à¸„à¸³à¸£à¸±à¸šà¸£à¸­à¸‡à¸¥à¸° 5 à¸šà¸²à¸—) à¸ˆà¸°à¸¡à¸µà¸„à¹ˆà¸²à¸˜à¸£à¸£à¸¡à¹€à¸™à¸µà¸¢à¸¡à¸•à¸²à¸¡à¸—à¸µà¹ˆà¸­à¸‡à¸„à¹Œà¸à¸£à¸à¸³à¸«à¸™à¸”
                      </p>
                    </div>
                    <div className="pt-3 space-y-1">
                      <span className="block font-semibold text-slate-700 text-xs">à¸«à¸²à¸à¸¢à¸·à¹ˆà¸™à¹€à¸­à¸à¸ªà¸²à¸£à¹„à¸¡à¹ˆà¸„à¸£à¸šà¸–à¹‰à¸§à¸™ à¸•à¹‰à¸­à¸‡à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£à¸ à¸²à¸¢à¹ƒà¸™à¸à¸µà¹ˆà¸§à¸±à¸™?</span>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        à¸«à¸²à¸à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¹à¸ˆà¹‰à¸‡à¸‚à¸­à¹€à¸­à¸à¸ªà¸²à¸£à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡ à¸£à¸°à¸šà¸šà¸ˆà¸°à¸«à¸¢à¸¸à¸”à¸™à¸±à¸šà¹€à¸§à¸¥à¸² SLA à¸Šà¸±à¹ˆà¸§à¸„à¸£à¸²à¸§ à¹à¸¥à¸°à¸—à¹ˆà¸²à¸™à¸•à¹‰à¸­à¸‡à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡à¸ à¸²à¸¢à¹ƒà¸™à¹€à¸§à¸¥à¸²à¹„à¸¡à¹ˆà¸™à¹‰à¸­à¸¢à¸à¸§à¹ˆà¸² 10 à¸§à¸±à¸™à¸™à¸±à¸šà¸ˆà¸²à¸à¸§à¸±à¸™à¸—à¸µà¹ˆà¹„à¸”à¹‰à¸£à¸±à¸šà¹à¸ˆà¹‰à¸‡ à¸¡à¸´à¸‰à¸°à¸™à¸±à¹‰à¸™à¸„à¸³à¸‚à¸­à¸ˆà¸°à¸–à¸¹à¸à¸ˆà¸³à¸«à¸™à¹ˆà¸²à¸¢à¸•à¸²à¸¡à¸£à¸°à¸šà¸š
                      </p>
                    </div>
                    <div className="pt-3 space-y-1">
                      <span className="block font-semibold text-slate-700 text-xs">à¸„à¸§à¸²à¸¡à¸¡à¸±à¹ˆà¸™à¸„à¸‡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢à¸‚à¸­à¸‡à¸à¸²à¸£à¹à¸™à¸šà¸£à¸¹à¸›à¸šà¸±à¸•à¸£à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™à¹€à¸›à¹‡à¸™à¸­à¸¢à¹ˆà¸²à¸‡à¹„à¸£?</span>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        à¸£à¸°à¸šà¸šà¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¸‚à¸­à¸‡à¹€à¸£à¸²à¸•à¸´à¸”à¸•à¸±à¹‰à¸‡à¸•à¸±à¸§à¸Šà¹ˆà¸§à¸¢à¹€à¸‹à¸™à¹€à¸‹à¸­à¸£à¹Œà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸­à¹ˆà¸­à¸™à¹„à¸«à¸§à¸­à¸±à¸•à¹‚à¸™à¸¡à¸±à¸•à¸´à¸šà¸™à¹€à¸šà¸£à¸²à¸§à¹Œà¹€à¸‹à¸­à¸£à¹Œ à¹€à¸žà¸·à¹ˆà¸­à¹ƒà¸«à¹‰à¸—à¹ˆà¸²à¸™à¸›à¸à¸›à¸´à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸¨à¸²à¸ªà¸™à¸² à¹à¸¥à¸°à¹€à¸¥à¸‚à¹€à¸¥à¹€à¸‹à¸­à¸£à¹Œà¸šà¸²à¸£à¹Œà¹‚à¸„à¹‰à¸” à¸žà¸£à¹‰à¸­à¸¡à¸—à¸±à¹‰à¸‡à¸›à¸±à¹Šà¸¡à¸¥à¸²à¸¢à¸™à¹‰à¸³à¸£à¸°à¸šà¸¸à¸§à¸±à¸•à¸–à¸¸à¸›à¸£à¸°à¸ªà¸‡à¸„à¹Œà¹‚à¸”à¸¢à¸•à¸£à¸‡à¸à¹ˆà¸­à¸™à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ˆà¸°à¸ªà¹ˆà¸‡à¸¡à¸²à¸–à¸¶à¸‡à¹€à¸‹à¸´à¸£à¹Œà¸Ÿà¹€à¸§à¸­à¸£à¹Œ
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Submission Form Wizard */}
            {publicTab === 'submit' && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm max-w-3xl mx-auto">
                <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center rounded-t-2xl">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">à¹à¸šà¸šà¸„à¸³à¸‚à¸­à¸£à¸±à¸šà¸ªà¸´à¸—à¸˜à¸´à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¸­à¸­à¸™à¹„à¸¥à¸™à¹Œ</h3>
                    <p className="text-xs text-slate-500">à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸ªà¸³à¸„à¸±à¸à¸•à¸²à¸¡à¸‚à¸±à¹‰à¸™à¸•à¸­à¸™à¸à¸²à¸£à¸‚à¸­à¸ªà¸´à¸—à¸˜à¸´à¹Œ</p>
                  </div>
                  <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
                    à¸‚à¸±à¹‰à¸™à¸•à¸­à¸™à¸—à¸µà¹ˆ {wizardStep} / 3
                  </span>
                </div>

                <form onSubmit={submitPublicRequest} className="p-6 space-y-6">
                  
                  {/* Step 1: Requester Details */}
                  {wizardStep === 1 && (
                    <div className="space-y-4">
                      {/* Smart Searchable Tenant Organization Selector */}
                      {organizations.length !== 1 && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 text-brand-600" />
                            <span>ðŸ¢ à¸„à¹‰à¸™à¸«à¸²à¹à¸¥à¸°à¹€à¸¥à¸·à¸­à¸à¸«à¸™à¹ˆà¸§à¸¢à¸‡à¸²à¸™à¸—à¸µà¹ˆà¸—à¹ˆà¸²à¸™à¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­ (Search Target Organization) *</span>
                          </label>
                          <span className="text-[10px] bg-brand-100 text-brand-700 font-bold px-2 py-0.5 rounded-full">
                            à¸„à¹‰à¸™à¸«à¸²à¸­à¸±à¸ˆà¸‰à¸£à¸´à¸¢à¸° âš¡
                          </span>
                        </div>

                        {/* Search Input Bar */}
                        <div className="relative">
                          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            value={tenantSearchQuery}
                            onChange={(e) => {
                              setTenantSearchQuery(e.target.value);
                              setIsTenantDropdownOpen(true);
                            }}
                            onFocus={() => setIsTenantDropdownOpen(true)}
                            onClick={() => setIsTenantDropdownOpen(true)}
                            placeholder="à¸žà¸´à¸¡à¸žà¹Œà¸Šà¸·à¹ˆà¸­à¸«à¸™à¹ˆà¸§à¸¢à¸‡à¸²à¸™ à¸«à¸£à¸·à¸­à¸„à¸¥à¸´à¸à¸—à¸µà¹ˆà¸™à¸µà¹ˆà¹€à¸žà¸·à¹ˆà¸­à¹€à¸¥à¸·à¸­à¸à¸ˆà¸²à¸à¸£à¸²à¸¢à¸Šà¸·à¹ˆà¸­à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”..."
                            className="w-full text-xs font-medium pl-10 pr-24 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white text-slate-900 shadow-inner cursor-pointer"
                          />
                          <div className="absolute right-2 top-1.5 flex items-center gap-1">
                            {tenantSearchQuery && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTenantSearchQuery('');
                                }}
                                className="text-xs text-slate-400 hover:text-slate-600 font-bold px-1.5 py-1"
                                title="à¸¥à¹‰à¸²à¸‡à¸„à¸³à¸„à¹‰à¸™à¸«à¸²"
                              >
                                âœ•
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setIsTenantDropdownOpen(!isTenantDropdownOpen)}
                              className="text-[10px] font-bold text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-2 py-1 rounded-lg border border-brand-200 transition"
                            >
                              {isTenantDropdownOpen ? 'à¸›à¸´à¸”à¸£à¸²à¸¢à¸Šà¸·à¹ˆà¸­' : 'à¸”à¸¹à¸£à¸²à¸¢à¸Šà¸·à¹ˆà¸­'}
                            </button>
                          </div>
                        </div>

                        {/* Selected Active Tenant Badge */}
                        {selectedTargetOrgId && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between shadow-sm animate-fade-in">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-emerald-600 text-white rounded-lg">
                                <Building2 className="h-5 w-5" />
                              </div>
                              <div>
                                <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">âœ“ à¸«à¸™à¹ˆà¸§à¸¢à¸‡à¸²à¸™à¸—à¸µà¹ˆà¹€à¸¥à¸·à¸­à¸à¸£à¸±à¸šà¹€à¸£à¸·à¹ˆà¸­à¸‡</span>
                                <h4 className="font-bold text-xs text-slate-900">
                                  {organizations.find(o => o.id === selectedTargetOrgId)?.nameTh || 'à¸«à¸™à¹ˆà¸§à¸¢à¸‡à¸²à¸™à¸—à¸µà¹ˆà¹€à¸¥à¸·à¸­à¸'} 
                                  <span className="text-slate-500 font-normal ml-1">({selectedTargetOrgId})</span>
                                </h4>
                              </div>
                            </div>
                            <span className="text-emerald-700 text-xs font-bold bg-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> à¹€à¸¥à¸·à¸­à¸à¹à¸¥à¹‰à¸§
                            </span>
                          </div>
                        )}

                        {/* Filtered Organization List Results */}
                        {(tenantSearchQuery.trim() !== '' || isTenantDropdownOpen) && (
                          <div className="bg-white border border-brand-200 rounded-xl p-2 shadow-lg space-y-1.5 max-h-60 overflow-y-auto animate-fade-in z-10">
                            <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100">
                              <span className="text-[10px] text-slate-400 font-bold">
                                {tenantSearchQuery.trim() !== ''
                                  ? `à¸œà¸¥à¸à¸²à¸£à¸„à¹‰à¸™à¸«à¸²à¸«à¸™à¹ˆà¸§à¸¢à¸‡à¸²à¸™à¹ƒà¸à¸¥à¹‰à¹€à¸„à¸µà¸¢à¸‡ (${organizations.filter((org: any) =>
                                      org.nameTh.toLowerCase().includes(tenantSearchQuery.toLowerCase()) ||
                                      org.nameEn.toLowerCase().includes(tenantSearchQuery.toLowerCase()) ||
                                      org.id.toLowerCase().includes(tenantSearchQuery.toLowerCase())
                                    ).length} à¸£à¸²à¸¢à¸à¸²à¸£):`
                                  : `à¸£à¸²à¸¢à¸Šà¸·à¹ˆà¸­à¸«à¸™à¹ˆà¸§à¸¢à¸‡à¸²à¸™à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”à¸—à¸µà¹ˆà¹€à¸›à¸´à¸”à¸£à¸±à¸šà¸„à¸³à¸‚à¸­à¸šà¸™à¸£à¸°à¸šà¸š (${organizations.length} à¸«à¸™à¹ˆà¸§à¸¢à¸‡à¸²à¸™):`}
                              </span>
                              <button
                                type="button"
                                onClick={() => setIsTenantDropdownOpen(false)}
                                className="text-[10px] text-slate-400 hover:text-slate-700 font-bold"
                              >
                                âœ• à¸›à¸´à¸”
                              </button>
                            </div>
                            {organizations
                              .filter((org: any) => 
                                tenantSearchQuery.trim() === '' ||
                                org.nameTh.toLowerCase().includes(tenantSearchQuery.toLowerCase()) ||
                                org.nameEn.toLowerCase().includes(tenantSearchQuery.toLowerCase()) ||
                                org.id.toLowerCase().includes(tenantSearchQuery.toLowerCase())
                              )
                              .map(org => {
                                const isSelected = selectedTargetOrgId === org.id;
                                return (
                                  <button
                                    key={org.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedTargetOrgId(org.id);
                                      setTenantSearchQuery('');
                                      setIsTenantDropdownOpen(false);
                                    }}
                                    className={`w-full p-2.5 rounded-lg border text-left transition flex items-center justify-between gap-2 ${
                                      isSelected
                                        ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                                        : 'bg-white border-slate-100 hover:border-brand-300 hover:bg-slate-50'
                                    }`}
                                  >
                                    <div className="space-y-0.5">
                                      <h5 className={`font-bold text-xs ${isSelected ? 'text-emerald-900' : 'text-slate-800'}`}>
                                        {org.nameTh}
                                      </h5>
                                      <p className="text-[10px] text-slate-500 font-medium">
                                        {org.nameEn} â€¢ <span className="font-mono text-slate-400">{org.id}</span>
                                      </p>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md shrink-0 ${
                                      isSelected ? 'bg-emerald-600 text-white' : 'bg-brand-50 text-brand-700 hover:bg-brand-600 hover:text-white'
                                    }`}>
                                      {isSelected ? 'âœ“ à¹€à¸¥à¸·à¸­à¸à¹à¸¥à¹‰à¸§' : 'à¸à¸”à¹€à¸¥à¸·à¸­à¸à¸«à¸™à¹ˆà¸§à¸¢à¸‡à¸²à¸™à¸™à¸µà¹‰'}
                                    </span>
                                  </button>
                                );
                              })}

                            {organizations.filter(org => 
                              tenantSearchQuery.trim() === '' ||
                              org.nameTh.toLowerCase().includes(tenantSearchQuery.toLowerCase()) ||
                              org.nameEn.toLowerCase().includes(tenantSearchQuery.toLowerCase()) ||
                              org.id.toLowerCase().includes(tenantSearchQuery.toLowerCase())
                            ).length === 0 && (
                              <div className="p-4 text-center text-xs text-slate-400">
                                âŒ à¹„à¸¡à¹ˆà¸žà¸šà¸«à¸™à¹ˆà¸§à¸¢à¸‡à¸²à¸™à¸—à¸µà¹ˆà¸•à¸£à¸‡à¸à¸±à¸šà¸„à¸³à¸„à¹‰à¸™ "{tenantSearchQuery}" à¸à¸£à¸¸à¸“à¸²à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸„à¸³à¸„à¹‰à¸™à¸«à¸²à¸­à¸µà¸à¸„à¸£à¸±à¹‰à¸‡
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      )}

                      <div className="flex gap-4 border-b border-slate-100 pb-4 mb-4">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                          <input
                            type="radio"
                            name="reqType"
                            checked={reqType === 'self'}
                            onChange={() => setReqType('self')}
                            className="text-brand-600 focus:ring-brand-500"
                          />
                          <span>à¸‚à¸­à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­à¹€à¸›à¹‡à¸™à¹€à¸ˆà¹‰à¸²à¸‚à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸”à¹‰à¸§à¸¢à¸•à¸™à¹€à¸­à¸‡</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                          <input
                            type="radio"
                            name="reqType"
                            checked={reqType === 'representative'}
                            onChange={() => setReqType('representative')}
                            className="text-brand-600 focus:ring-brand-500"
                          />
                          <span>à¸‚à¸­à¸¢à¸·à¹ˆà¸™à¹à¸—à¸™à¹ƒà¸™à¸à¸²à¸™à¸°à¸œà¸¹à¹‰à¸£à¸±à¸šà¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆ</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-700">à¸Šà¸·à¹ˆà¸­à¸ˆà¸£à¸´à¸‡ (First Name) <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required
                            placeholder="à¹€à¸Šà¹ˆà¸™ à¸ªà¸¡à¸Šà¸²à¸¢ à¸«à¸£à¸·à¸­ Somchai"
                            value={requesterForm.firstName}
                            onChange={(e) => setRequesterForm({...requesterForm, firstName: e.target.value})}
                            className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-700">à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥ (Last Name) <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required
                            placeholder="à¹€à¸Šà¹ˆà¸™ à¹ƒà¸ˆà¸”à¸µ à¸«à¸£à¸·à¸­ Jaidee"
                            value={requesterForm.lastName}
                            onChange={(e) => setRequesterForm({...requesterForm, lastName: e.target.value})}
                            className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-medium text-slate-700">
                            à¹€à¸¥à¸‚à¸›à¸£à¸°à¸ˆà¸³à¸•à¸±à¸§à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™ / à¸žà¸²à¸ªà¸›à¸­à¸£à¹Œà¸• (ID / Passport No.) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={17}
                            placeholder="à¸•à¸±à¸§à¸­à¸¢à¹ˆà¸²à¸‡: 1-1002-00300-40-5 à¸«à¸£à¸·à¸­ Passport No."
                            value={requesterForm.idNumber}
                            onChange={(e) => setRequesterForm({ ...requesterForm, idNumber: formatThaiCitizenIdMask(e.target.value) })}
                            className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-500 font-mono tracking-wider font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-700">
                            à¹€à¸šà¸­à¸£à¹Œà¹‚à¸—à¸£à¸¨à¸±à¸žà¸—à¹Œà¸•à¸´à¸”à¸•à¹ˆà¸­ <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            required
                            maxLength={12}
                            placeholder="à¸•à¸±à¸§à¸­à¸¢à¹ˆà¸²à¸‡: 0812345678 à¸«à¸£à¸·à¸­ 022218150"
                            value={requesterForm.phone}
                            onChange={(e) => setRequesterForm({...requesterForm, phone: e.target.value})}
                            className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-500 font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">à¸­à¸µà¹€à¸¡à¸¥à¸•à¸´à¸”à¸•à¹ˆà¸­ (Email Address) <span className="text-red-500">*</span></label>
                        <input
                          type="email"
                          required
                          placeholder="à¸•à¸±à¸§à¸­à¸¢à¹ˆà¸²à¸‡: name@example.com"
                          value={requesterForm.email}
                          onChange={(e) => setRequesterForm({...requesterForm, email: e.target.value})}
                          className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">à¸—à¸µà¹ˆà¸­à¸¢à¸¹à¹ˆà¸ˆà¸±à¸”à¸ªà¹ˆà¸‡à¹€à¸­à¸à¸ªà¸²à¸£à¸—à¸²à¸‡à¹„à¸›à¸£à¸©à¸“à¸µà¸¢à¹Œ (à¸£à¸°à¸šà¸¸à¸«à¸²à¸à¹€à¸¥à¸·à¸­à¸à¸ªà¹ˆà¸‡à¹„à¸›à¸£à¸©à¸“à¸µà¸¢à¹Œ)</label>
                        <textarea
                          placeholder="à¸£à¸°à¸šà¸¸à¸—à¸µà¹ˆà¸­à¸¢à¸¹à¹ˆà¸ˆà¸±à¸”à¸ªà¹ˆà¸‡à¹‚à¸”à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”..."
                          value={requesterForm.address}
                          onChange={(e) => setRequesterForm({...requesterForm, address: e.target.value})}
                          className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-brand-500 h-16"
                        />
                      </div>

                      {/* Rep Details Form */}
                      {reqType === 'representative' && (
                        <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-4 mt-6">
                          <div className="flex items-center justify-between border-b border-teal-200 pb-2">
                            <span className="font-bold text-teal-900 text-xs flex items-center gap-1.5">
                              <Users className="h-4 w-4 text-teal-700" />
                              <span>à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¸³à¸«à¸£à¸±à¸šà¸œà¸¹à¹‰à¸£à¸±à¸šà¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆ (Authorized Representative)</span>
                            </span>
                            <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded border border-teal-300">
                              * à¸šà¸±à¸‡à¸„à¸±à¸šà¸à¸£à¸­à¸à¹€à¸‡à¸·à¹ˆà¸­à¸™à¹„à¸‚à¹à¸šà¸šà¹€à¸”à¸µà¸¢à¸§à¸à¸±à¸šà¹€à¸ˆà¹‰à¸²à¸‚à¸­à¸‡à¸ªà¸´à¸—à¸˜à¸´
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-slate-700">à¸Šà¸·à¹ˆà¸­à¸ˆà¸£à¸´à¸‡à¸œà¸¹à¹‰à¸£à¸±à¸šà¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆ <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                required
                                placeholder="à¹€à¸Šà¹ˆà¸™ à¸™à¸²à¸¢à¸§à¸´à¸Šà¸±à¸¢ à¸«à¸£à¸·à¸­ Wichai"
                                value={repForm.firstName}
                                onChange={(e) => setRepForm({...repForm, firstName: e.target.value})}
                                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-500 bg-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-slate-700">à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥à¸œà¸¹à¹‰à¸£à¸±à¸šà¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆ <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                required
                                placeholder="à¹€à¸Šà¹ˆà¸™ à¸¡à¸µà¸ªà¸¸à¸‚ à¸«à¸£à¸·à¸­ Meesuk"
                                value={repForm.lastName}
                                onChange={(e) => setRepForm({...repForm, lastName: e.target.value})}
                                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-500 bg-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1 md:col-span-2">
                              <label className="text-xs font-medium text-slate-700">
                                à¹€à¸¥à¸‚à¸šà¸±à¸•à¸£à¸œà¸¹à¹‰à¹à¸—à¸™à¸ªà¸´à¸—à¸˜à¸´ / à¸žà¸²à¸ªà¸›à¸­à¸£à¹Œà¸• (ID / Passport No.) <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                maxLength={17}
                                placeholder="à¸•à¸±à¸§à¸­à¸¢à¹ˆà¸²à¸‡: 1-1002-00300-40-5 à¸«à¸£à¸·à¸­ Passport No."
                                value={repForm.idNumber}
                                onChange={(e) => setRepForm({ ...repForm, idNumber: formatThaiCitizenIdMask(e.target.value) })}
                                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-500 font-mono tracking-wider font-bold bg-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-slate-700">
                                à¹€à¸šà¸­à¸£à¹Œà¹‚à¸—à¸£à¸œà¸¹à¹‰à¹à¸—à¸™ <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="tel"
                                required
                                maxLength={12}
                                placeholder="à¸•à¸±à¸§à¸­à¸¢à¹ˆà¸²à¸‡: 0812345678"
                                value={repForm.phone}
                                onChange={(e) => setRepForm({...repForm, phone: e.target.value})}
                                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-500 font-mono bg-white"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">à¸­à¸µà¹€à¸¡à¸¥à¸•à¸´à¸”à¸•à¹ˆà¸­à¸œà¸¹à¹‰à¹à¸—à¸™ (Email Address) <span className="text-red-500">*</span></label>
                            <input
                              type="email"
                              required
                              placeholder="à¸•à¸±à¸§à¸­à¸¢à¹ˆà¸²à¸‡: rep.name@example.com"
                              value={repForm.email}
                              onChange={(e) => setRepForm({...repForm, email: e.target.value})}
                              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-500 bg-white"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">à¸‚à¸­à¸šà¹€à¸‚à¸•à¸­à¸³à¸™à¸²à¸ˆà¸à¸£à¸°à¸—à¸³à¸à¸²à¸£à¹à¸—à¸™à¸•à¸²à¸¡à¹ƒà¸šà¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆ <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              required
                              placeholder="à¹€à¸Šà¹ˆà¸™ à¸à¸²à¸£à¸¢à¸·à¹ˆà¸™à¸‚à¸­à¹ƒà¸Šà¹‰à¸ªà¸´à¸—à¸˜à¸´à¸”à¸¶à¸‡à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸²à¸£à¹€à¸‡à¸´à¸™à¹à¸¥à¸°à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¹à¸—à¸™à¸œà¸¹à¹‰à¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆà¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”"
                              value={repForm.scope}
                              onChange={(e) => setRepForm({...repForm, scope: e.target.value})}
                              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-500 bg-white"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedTargetOrgId) {
                              showNotify('âš ï¸ à¸à¸£à¸¸à¸“à¸²à¸„à¹‰à¸™à¸«à¸²à¹à¸¥à¸°à¸„à¸¥à¸´à¸à¹€à¸¥à¸·à¸­à¸ "à¸«à¸™à¹ˆà¸§à¸¢à¸‡à¸²à¸™à¸£à¸±à¸šà¹€à¸£à¸·à¹ˆà¸­à¸‡" à¸à¹ˆà¸­à¸™à¸à¸”à¸‚à¸±à¹‰à¸™à¸•à¸­à¸™à¸–à¸±à¸”à¹„à¸›');
                              return;
                            }

                            // 1. Validate Requester (Data Subject) First & Last Name
                            if (!requesterForm.firstName.trim() || !requesterForm.lastName.trim()) {
                              showNotify('âš ï¸ à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸ "à¸Šà¸·à¹ˆà¸­à¸ˆà¸£à¸´à¸‡" à¹à¸¥à¸° "à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥" à¸‚à¸­à¸‡à¹€à¸ˆà¹‰à¸²à¸‚à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹ƒà¸«à¹‰à¸„à¸£à¸šà¸–à¹‰à¸§à¸™');
                              return;
                            }

                            // 2. Validate Requester ID / Passport Number
                            const cleanId = requesterForm.idNumber.replace(/[^a-zA-Z0-9]/g, '');
                            if (!cleanId || cleanId.length < 7) {
                              showNotify('âš ï¸ à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸ "à¹€à¸¥à¸‚à¸›à¸£à¸°à¸ˆà¸³à¸•à¸±à¸§à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™ (13 à¸«à¸¥à¸±à¸)" à¸«à¸£à¸·à¸­ "à¹€à¸¥à¸‚à¸žà¸²à¸ªà¸›à¸­à¸£à¹Œà¸•" à¸‚à¸­à¸‡à¹€à¸ˆà¹‰à¸²à¸‚à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹ƒà¸«à¹‰à¸–à¸¹à¸à¸•à¹‰à¸­à¸‡');
                              return;
                            }

                            // Enforce Thai Citizen ID Modulus 11 Checksum Algorithm for Requester
                            if (/^\d{13}$/.test(cleanId)) {
                              if (!validateThaiCitizenId(cleanId)) {
                                showNotify('âŒ à¹€à¸¥à¸‚à¸›à¸£à¸°à¸ˆà¸³à¸•à¸±à¸§à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™ 13 à¸«à¸¥à¸±à¸à¸‚à¸­à¸‡à¹€à¸ˆà¹‰à¸²à¸‚à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡à¸•à¸²à¸¡à¸ªà¸¹à¸•à¸£à¸„à¸³à¸™à¸§à¸“à¸‚à¸­à¸‡à¸à¸£à¸¡à¸à¸²à¸£à¸›à¸à¸„à¸£à¸­à¸‡ (Check Digit Mismatch)\n\nà¸à¸£à¸¸à¸“à¸²à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸•à¸±à¸§à¹€à¸¥à¸‚ 13 à¸«à¸¥à¸±à¸à¸­à¸µà¸à¸„à¸£à¸±à¹‰à¸‡');
                                return;
                              }
                            }

                            // 3. Validate Requester Phone Number
                            const cleanPhone = requesterForm.phone.replace(/[^0-9]/g, '');
                            if (!cleanPhone || cleanPhone.length < 9 || cleanPhone.length > 10) {
                              showNotify('âš ï¸ à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸ "à¹€à¸šà¸­à¸£à¹Œà¹‚à¸—à¸£à¸¨à¸±à¸žà¸—à¹Œà¸•à¸´à¸”à¸•à¹ˆà¸­" à¸‚à¸­à¸‡à¹€à¸ˆà¹‰à¸²à¸‚à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹ƒà¸«à¹‰à¸–à¸¹à¸à¸•à¹‰à¸­à¸‡ (à¹€à¸šà¸­à¸£à¹Œà¸¡à¸·à¸­à¸–à¸·à¸­ 10 à¸«à¸¥à¸±à¸ à¹€à¸Šà¹ˆà¸™ 0812345678 à¸«à¸£à¸·à¸­ à¹€à¸šà¸­à¸£à¹Œà¸ªà¸²à¸¢à¸•à¸£à¸‡ 9 à¸«à¸¥à¸±à¸ à¹€à¸Šà¹ˆà¸™ 022218150)');
                              return;
                            }

                            // 4. Validate Requester Email Address
                            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                            if (!requesterForm.email.trim() || !emailRegex.test(requesterForm.email.trim())) {
                              showNotify('âš ï¸ à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸ "à¸­à¸µà¹€à¸¡à¸¥à¸•à¸´à¸”à¸•à¹ˆà¸­" à¸‚à¸­à¸‡à¹€à¸ˆà¹‰à¸²à¸‚à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹ƒà¸«à¹‰à¸–à¸¹à¸à¸•à¹‰à¸­à¸‡à¹ƒà¸™à¸£à¸¹à¸›à¹à¸šà¸šà¸—à¸µà¹ˆà¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¹„à¸”à¹‰à¸ˆà¸£à¸´à¸‡ (à¹€à¸Šà¹ˆà¸™ name@example.com)');
                              return;
                            }

                            // 5. If Representative option is checked, validate Rep details with SAME STRICT CONDITIONS
                            if (reqType === 'representative') {
                              if (!repForm.firstName.trim() || !repForm.lastName.trim()) {
                                showNotify('âš ï¸ à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸ "à¸Šà¸·à¹ˆà¸­à¸ˆà¸£à¸´à¸‡" à¹à¸¥à¸° "à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥" à¸‚à¸­à¸‡à¸œà¸¹à¹‰à¸£à¸±à¸šà¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆà¹ƒà¸«à¹‰à¸„à¸£à¸šà¸–à¹‰à¸§à¸™');
                                return;
                              }

                              const cleanRepId = repForm.idNumber.replace(/[^a-zA-Z0-9]/g, '');
                              if (!cleanRepId || cleanRepId.length < 7) {
                                showNotify('âš ï¸ à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸ "à¹€à¸¥à¸‚à¸šà¸±à¸•à¸£à¸œà¸¹à¹‰à¹à¸—à¸™à¸ªà¸´à¸—à¸˜à¸´ / à¸žà¸²à¸ªà¸›à¸­à¸£à¹Œà¸• (13 à¸«à¸¥à¸±à¸)" à¸‚à¸­à¸‡à¸œà¸¹à¹‰à¸£à¸±à¸šà¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆà¹ƒà¸«à¹‰à¸–à¸¹à¸à¸•à¹‰à¸­à¸‡');
                                return;
                              }

                              if (/^\d{13}$/.test(cleanRepId)) {
                                if (!validateThaiCitizenId(cleanRepId)) {
                                  showNotify('âŒ à¹€à¸¥à¸‚à¸šà¸±à¸•à¸£à¸›à¸£à¸°à¸ˆà¸³à¸•à¸±à¸§ 13 à¸«à¸¥à¸±à¸à¸‚à¸­à¸‡à¸œà¸¹à¹‰à¸£à¸±à¸šà¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆà¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡à¸•à¸²à¸¡à¸ªà¸¹à¸•à¸£à¸„à¸³à¸™à¸§à¸“à¸‚à¸­à¸‡à¸à¸£à¸¡à¸à¸²à¸£à¸›à¸à¸„à¸£à¸­à¸‡ (Check Digit Mismatch)\n\nà¸à¸£à¸¸à¸“à¸²à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¹€à¸¥à¸‚ 13 à¸«à¸¥à¸±à¸à¸‚à¸­à¸‡à¸œà¸¹à¹‰à¹à¸—à¸™à¸ªà¸´à¸—à¸˜à¸´à¸­à¸µà¸à¸„à¸£à¸±à¹‰à¸‡');
                                  return;
                                }
                              }

                              const cleanRepPhone = repForm.phone.replace(/[^0-9]/g, '');
                              if (!cleanRepPhone || cleanRepPhone.length < 9 || cleanRepPhone.length > 10) {
                                showNotify('âš ï¸ à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸ "à¹€à¸šà¸­à¸£à¹Œà¹‚à¸—à¸£à¸œà¸¹à¹‰à¹à¸—à¸™" à¹ƒà¸«à¹‰à¸–à¸¹à¸à¸•à¹‰à¸­à¸‡ (à¹€à¸šà¸­à¸£à¹Œà¸¡à¸·à¸­à¸–à¸·à¸­ 10 à¸«à¸¥à¸±à¸ à¸«à¸£à¸·à¸­ à¹€à¸šà¸­à¸£à¹Œà¸ªà¸²à¸¢à¸•à¸£à¸‡ 9 à¸«à¸¥à¸±à¸)');
                                return;
                              }

                              if (!repForm.email.trim() || !emailRegex.test(repForm.email.trim())) {
                                showNotify('âš ï¸ à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸ "à¸­à¸µà¹€à¸¡à¸¥à¸•à¸´à¸”à¸•à¹ˆà¸­à¸œà¸¹à¹‰à¹à¸—à¸™" à¹ƒà¸«à¹‰à¸–à¸¹à¸à¸•à¹‰à¸­à¸‡à¹ƒà¸™à¸£à¸¹à¸›à¹à¸šà¸šà¸—à¸µà¹ˆà¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¹„à¸”à¹‰à¸ˆà¸£à¸´à¸‡ (à¹€à¸Šà¹ˆà¸™ rep.name@example.com)');
                                return;
                              }

                              if (!repForm.scope.trim()) {
                                showNotify('âš ï¸ à¸à¸£à¸¸à¸“à¸²à¸£à¸°à¸šà¸¸ "à¸‚à¸­à¸šà¹€à¸‚à¸•à¸­à¸³à¸™à¸²à¸ˆà¸à¸£à¸°à¸—à¸³à¸à¸²à¸£à¹à¸—à¸™à¸•à¸²à¸¡à¹ƒà¸šà¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆ" à¹ƒà¸«à¹‰à¸Šà¸±à¸”à¹€à¸ˆà¸™');
                                return;
                              }
                            }

                            setWizardStep(2);
                          }}
                          className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold py-2.5 px-6 rounded-lg transition shadow-md"
                        >
                          à¸‚à¸±à¹‰à¸™à¸•à¸­à¸™à¸–à¸±à¸”à¹„à¸›
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Scope & Systems */}
                  {wizardStep === 2 && (
                    <div className="space-y-4">
                      
                      {/* 1. Request Type */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-800">1. à¸›à¸£à¸°à¹€à¸ à¸—à¸ªà¸´à¸—à¸˜à¸´à¸—à¸µà¹ˆà¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¸‚à¸­à¹ƒà¸Šà¹‰ (Right Category) <span className="text-red-500">*</span></label>
                        <select
                          value={scopeForm.requestType}
                          onChange={(e) => setScopeForm({...scopeForm, requestType: e.target.value as any})}
                          className="w-full text-xs font-semibold border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-500 bg-white"
                        >
                          <option value="access_and_copy">à¸‚à¸­à¹€à¸‚à¹‰à¸²à¸–à¸¶à¸‡à¸žà¸£à¹‰à¸­à¸¡à¸‚à¸­à¸£à¸±à¸šà¸ªà¸³à¹€à¸™à¸²à¸‚à¹‰à¸­à¸¡à¸¹à¸¥ (Access & Copy)</option>
                          <option value="access">à¸‚à¸­à¹€à¸‚à¹‰à¸²à¸–à¸¶à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥ (Right to Access)</option>
                          <option value="copy">à¸‚à¸­à¸£à¸±à¸šà¸ªà¸³à¹€à¸™à¸²à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥ (Right to obtain a copy)</option>
                          <option value="erasure">à¸‚à¸­à¹ƒà¸«à¹‰à¸¥à¸šà¸«à¸£à¸·à¸­à¸—à¸³à¸¥à¸²à¸¢à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥ (Right to Erasure)</option>
                          <option value="rectification">à¸‚à¸­à¹à¸à¹‰à¹„à¸‚à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¹ƒà¸«à¹‰à¸–à¸¹à¸à¸•à¹‰à¸­à¸‡ (Right to Rectification)</option>
                          <option value="restriction">à¸‚à¸­à¸£à¸°à¸‡à¸±à¸šà¸à¸²à¸£à¹ƒà¸Šà¹‰à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥ (Right to Restriction of Processing)</option>
                          <option value="withdraw">à¸‚à¸­à¸–à¸­à¸™à¸„à¸§à¸²à¸¡à¸¢à¸´à¸™à¸¢à¸­à¸¡ (Right to Withdraw Consent)</option>
                          <option value="object">à¸‚à¸­à¸„à¸±à¸”à¸„à¹‰à¸²à¸™à¸à¸²à¸£à¹€à¸à¹‡à¸šà¸£à¸§à¸šà¸£à¸§à¸¡ à¹ƒà¸Šà¹‰ à¸«à¸£à¸·à¸­à¹€à¸›à¸´à¸”à¹€à¸œà¸¢ (Right to Object)</option>
                          <option value="portability">à¸‚à¸­à¹ƒà¸«à¹‰à¹‚à¸­à¸™à¸¢à¹‰à¸²à¸¢à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥ (Right to Data Portability)</option>
                        </select>
                      </div>

                      {/* 2. Systems selector Checklist (Government-Neutral Target Databases) - Moved to top */}
                      <div className="space-y-2 pt-1">
                        <label className="text-xs font-bold text-slate-800">2. à¸£à¸°à¸šà¸¸à¸£à¸°à¸šà¸šà¸«à¸£à¸·à¸­à¸«à¸¡à¸§à¸”à¸«à¸¡à¸¹à¹ˆà¸à¸²à¸™à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸—à¸µà¹ˆà¹€à¸à¸µà¹ˆà¸¢à¸§à¸‚à¹‰à¸­à¸‡à¹€à¸—à¹ˆà¸²à¸—à¸µà¹ˆà¸—à¸£à¸²à¸š (Target Databases) <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {[
                            'à¸ à¸²à¸žà¸šà¸±à¸™à¸—à¸¶à¸à¸ˆà¸²à¸à¸à¸¥à¹‰à¸­à¸‡à¸§à¸‡à¸ˆà¸£à¸›à¸´à¸”à¸™à¸´à¸£à¸ à¸±à¸¢ (CCTV Footage)',
                            'à¸£à¸°à¸šà¸šà¸—à¸°à¹€à¸šà¸µà¸¢à¸™à¹à¸¥à¸°à¸šà¸£à¸´à¸à¸²à¸£à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™ (Citizen & Registration Services)',
                            'à¸£à¸°à¸šà¸šà¸šà¸£à¸´à¸«à¸²à¸£à¸—à¸£à¸±à¸žà¸¢à¸²à¸à¸£à¸šà¸¸à¸„à¸„à¸¥à¹à¸¥à¸°à¸šà¸¸à¸„à¸¥à¸²à¸à¸£ (HR & Personnel Records)',
                            'à¸£à¸°à¸šà¸šà¸ªà¸¡à¸²à¸Šà¸´à¸ à¸žà¸­à¸£à¹Œà¸—à¸±à¸¥ à¹à¸¥à¸°à¹à¸­à¸›à¸žà¸¥à¸´à¹€à¸„à¸Šà¸±à¸™ (Portal & Digital Services)',
                            'à¸£à¸°à¸šà¸šà¸ªà¸²à¸£à¸šà¸£à¸£à¸“à¹à¸¥à¸°à¸à¸²à¸™à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹€à¸­à¸à¸ªà¸²à¸£à¸—à¸±à¹ˆà¸§à¹„à¸› (General Document & Records)',
                            'à¸­à¸·à¹ˆà¸™ à¹† (à¹‚à¸›à¸£à¸”à¸£à¸°à¸šà¸¸à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡à¹ƒà¸™à¸Šà¹ˆà¸­à¸‡à¸—à¸µà¹ˆ 3) (Others)'
                          ].map((sys) => (
                            <label
                              key={sys}
                              className={`flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer text-xs transition ${
                                scopeForm.systems.includes(sys)
                                  ? 'bg-brand-50 border-brand-500 font-semibold text-brand-900 shadow-sm'
                                  : 'bg-white border-slate-200 hover:border-brand-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={scopeForm.systems.includes(sys)}
                                onChange={() => handleSystemToggle(sys)}
                                className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
                              />
                              <span>{sys}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* 3. Detailed Request Description - Moved to bottom */}
                      <div className="space-y-1 pt-1">
                        <label className="text-xs font-bold text-slate-800">3. à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”à¸£à¸°à¸šà¸¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¸—à¸µà¹ˆà¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¹€à¸‚à¹‰à¸²à¸–à¸¶à¸‡à¹‚à¸”à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸” <span className="text-red-500">*</span></label>
                        <textarea
                          required
                          rows={4}
                          placeholder="à¸•à¸±à¸§à¸­à¸¢à¹ˆà¸²à¸‡: à¸‚à¸­à¹„à¸Ÿà¸¥à¹Œà¸ à¸²à¸žà¸à¸¥à¹‰à¸­à¸‡à¸§à¸‡à¸ˆà¸£à¸›à¸´à¸” CCTV à¸§à¸±à¸™à¸—à¸µà¹ˆ 20 à¸.à¸„. 2569 à¸Šà¹ˆà¸§à¸‡à¹€à¸§à¸¥à¸² 10:00 - 11:00 à¸™. à¸šà¸£à¸´à¹€à¸§à¸“à¸«à¸™à¹‰à¸²à¸›à¸£à¸°à¸•à¸¹à¸—à¸²à¸‡à¹€à¸‚à¹‰à¸²à¸­à¸²à¸„à¸²à¸£ 1 à¸«à¸£à¸·à¸­ à¸‚à¸­à¸ªà¸³à¹€à¸™à¸²à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸²à¸£à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­à¸¢à¹‰à¸­à¸™à¸«à¸¥à¸±à¸‡..."
                          value={scopeForm.description}
                          onChange={(e) => setScopeForm({...scopeForm, description: e.target.value})}
                          className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-500 leading-relaxed"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-700 flex justify-between">
                            <span>à¸‚à¸­à¸šà¹€à¸‚à¸•à¸§à¸±à¸™à¹à¸¥à¸°à¹€à¸§à¸¥à¸²à¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™à¸‚à¹‰à¸­à¸¡à¸¹à¸¥</span>
                            <span className="text-[10px] text-slate-400">
                              {scopeForm.timeframeEnd ? `à¹„à¸¡à¹ˆà¹€à¸à¸´à¸™ ${convertToThaiDate(scopeForm.timeframeEnd)}` : 'à¹„à¸¡à¹ˆà¹€à¸à¸´à¸™à¸§à¸±à¸™à¸›à¸±à¸ˆà¸ˆà¸¸à¸šà¸±à¸™'}
                            </span>
                          </label>
                          <ThaiDatePicker
                            maxDate={scopeForm.timeframeEnd || new Date().toLocaleDateString('sv-SE')}
                            value={scopeForm.timeframeStart}
                            onChange={(selected) => {
                              const today = new Date().toLocaleDateString('sv-SE');
                              if (selected > today) {
                                showNotify('âš ï¸ à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¹€à¸¥à¸·à¸­à¸à¸§à¸±à¸™à¸—à¸µà¹ˆà¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™à¹€à¸à¸´à¸™ "à¸§à¸±à¸™à¸—à¸µà¹ˆà¸›à¸±à¸ˆà¸ˆà¸¸à¸šà¸±à¸™" à¹„à¸”à¹‰');
                                return;
                              }
                              if (scopeForm.timeframeEnd && selected > scopeForm.timeframeEnd) {
                                showNotify('âš ï¸ "à¸§à¸±à¸™à¸—à¸µà¹ˆà¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™" à¸•à¹‰à¸­à¸‡à¹„à¸¡à¹ˆà¸¥à¹ˆà¸§à¸‡à¸«à¸™à¹‰à¸²à¸à¸§à¹ˆà¸² "à¸§à¸±à¸™à¸—à¸µà¹ˆà¸ªà¸´à¹‰à¸™à¸ªà¸¸à¸”" à¸à¸£à¸¸à¸“à¸²à¹€à¸¥à¸·à¸­à¸à¸§à¸±à¸™à¸—à¸µà¹ˆà¹ƒà¸«à¹‰à¸–à¸¹à¸à¸•à¹‰à¸­à¸‡');
                                return;
                              }
                              setScopeForm({...scopeForm, timeframeStart: selected});
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-700 flex justify-between">
                            <span>à¸‚à¸­à¸šà¹€à¸‚à¸•à¸§à¸±à¸™à¹à¸¥à¸°à¹€à¸§à¸¥à¸²à¸ªà¸´à¹‰à¸™à¸ªà¸¸à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥</span>
                            <span className="text-[10px] text-slate-400">
                              {scopeForm.timeframeStart ? `à¸•à¸±à¹‰à¸‡à¹à¸•à¹ˆ ${convertToThaiDate(scopeForm.timeframeStart)} à¸–à¸¶à¸‡à¸›à¸±à¸ˆà¸ˆà¸¸à¸šà¸±à¸™` : 'à¹„à¸¡à¹ˆà¹€à¸à¸´à¸™à¸§à¸±à¸™à¸›à¸±à¸ˆà¸ˆà¸¸à¸šà¸±à¸™'}
                            </span>
                          </label>
                          <ThaiDatePicker
                            minDate={scopeForm.timeframeStart || undefined}
                            maxDate={new Date().toLocaleDateString('sv-SE')}
                            value={scopeForm.timeframeEnd}
                            onChange={(selected) => {
                              const today = new Date().toLocaleDateString('sv-SE');
                              if (selected > today) {
                                showNotify('âš ï¸ à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¹€à¸¥à¸·à¸­à¸à¸§à¸±à¸™à¸—à¸µà¹ˆà¸ªà¸´à¹‰à¸™à¸ªà¸¸à¸”à¹€à¸à¸´à¸™ "à¸§à¸±à¸™à¸—à¸µà¹ˆà¸›à¸±à¸ˆà¸ˆà¸¸à¸šà¸±à¸™" à¹„à¸”à¹‰');
                                return;
                              }
                              if (scopeForm.timeframeStart && selected < scopeForm.timeframeStart) {
                                showNotify('âš ï¸ "à¸§à¸±à¸™à¸—à¸µà¹ˆà¸ªà¸´à¹‰à¸™à¸ªà¸¸à¸”" à¸•à¹‰à¸­à¸‡à¹„à¸¡à¹ˆà¸à¹ˆà¸­à¸™à¸«à¸™à¹‰à¸² "à¸§à¸±à¸™à¸—à¸µà¹ˆà¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™" à¸à¸£à¸¸à¸“à¸²à¹€à¸¥à¸·à¸­à¸à¸§à¸±à¸™à¸—à¸µà¹ˆà¹ƒà¸«à¹‰à¸–à¸¹à¸à¸•à¹‰à¸­à¸‡');
                                return;
                              }
                              setScopeForm({...scopeForm, timeframeEnd: selected});
                            }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">à¸£à¸¹à¸›à¹à¸šà¸šà¸à¸²à¸£à¸£à¸±à¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸—à¸µà¹ˆà¸•à¹‰à¸­à¸‡à¸à¸²à¸£ (Delivery preference) <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
                          {[
                            { code: 'secure_download', label: 'à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¹„à¸Ÿà¸¥à¹Œà¸­à¸­à¸™à¹„à¸¥à¸™à¹Œà¸›à¸¥à¸­à¸”à¸ à¸±à¸¢', desc: 'à¹„à¸¡à¹ˆà¸¡à¸µà¸„à¹ˆà¸²à¸˜à¸£à¸£à¸¡à¹€à¸™à¸µà¸¢à¸¡' },
                            { code: 'pickup', label: 'à¹€à¸‚à¹‰à¸²à¸•à¸£à¸§à¸ˆà¸”à¸¹ à¸“ à¸ªà¸³à¸™à¸±à¸à¸‡à¸²à¸™', desc: 'à¹„à¸¡à¹ˆà¸¡à¸µà¸„à¹ˆà¸²à¸˜à¸£à¸£à¸¡à¹€à¸™à¸µà¸¢à¸¡' },
                            { code: 'registered_mail', label: 'à¸ˆà¸±à¸”à¸ªà¹ˆà¸‡à¸ªà¸³à¹€à¸™à¸²à¸—à¸²à¸‡à¹„à¸›à¸£à¸©à¸“à¸µà¸¢à¹Œ', desc: 'à¸„à¸´à¸”à¸„à¹ˆà¸²à¸˜à¸£à¸£à¸¡à¹€à¸™à¸µà¸¢à¸¡à¸à¸£à¸°à¸”à¸²à¸©/à¸ªà¹ˆà¸‡' }
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
                          à¸¢à¹‰à¸­à¸™à¸à¸¥à¸±à¸š
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            // 1. Mandatory Description Check
                            if (!scopeForm.description.trim()) {
                              showNotify('âš ï¸ à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸ "à¸‚à¹‰à¸­ 3. à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”à¸£à¸°à¸šà¸¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¸—à¸µà¹ˆà¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¹€à¸‚à¹‰à¸²à¸–à¸¶à¸‡à¹‚à¸”à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”"');
                              return;
                            }

                            // 2. Mandatory Target Database Checklist Check
                            if (scopeForm.systems.length === 0) {
                              showNotify('âš ï¸ à¸à¸£à¸¸à¸“à¸²à¸„à¸¥à¸´à¸à¹€à¸¥à¸·à¸­à¸à¸«à¸¡à¸§à¸”à¸«à¸¡à¸¹à¹ˆ "à¸£à¸°à¸šà¸šà¸«à¸£à¸·à¸­à¸à¸²à¸™à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸—à¸µà¹ˆà¹€à¸à¸µà¹ˆà¸¢à¸§à¸‚à¹‰à¸­à¸‡à¹€à¸—à¹ˆà¸²à¸—à¸µà¹ˆà¸—à¸£à¸²à¸š" à¸­à¸¢à¹ˆà¸²à¸‡à¸™à¹‰à¸­à¸¢ 1 à¸£à¸²à¸¢à¸à¸²à¸£');
                              return;
                            }

                            // 3. Date Range Validation Checks
                            const todayStr = new Date().toISOString().split('T')[0];

                            if (scopeForm.timeframeStart && scopeForm.timeframeStart > todayStr) {
                              showNotify('âš ï¸ "à¸‚à¸­à¸šà¹€à¸‚à¸•à¸§à¸±à¸™à¸—à¸µà¹ˆà¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™à¸‚à¹‰à¸­à¸¡à¸¹à¸¥" à¸•à¹‰à¸­à¸‡à¹„à¸¡à¹ˆà¹€à¸à¸´à¸™à¸§à¸±à¸™à¸—à¸µà¹ˆà¸›à¸±à¸ˆà¸ˆà¸¸à¸šà¸±à¸™');
                              return;
                            }

                            if (scopeForm.timeframeEnd && scopeForm.timeframeEnd > todayStr) {
                              showNotify('âš ï¸ "à¸‚à¸­à¸šà¹€à¸‚à¸•à¸§à¸±à¸™à¸—à¸µà¹ˆà¸ªà¸´à¹‰à¸™à¸ªà¸¸à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥" à¸•à¹‰à¸­à¸‡à¹„à¸¡à¹ˆà¹€à¸à¸´à¸™à¸§à¸±à¸™à¸—à¸µà¹ˆà¸›à¸±à¸ˆà¸ˆà¸¸à¸šà¸±à¸™');
                              return;
                            }

                            if (scopeForm.timeframeStart && scopeForm.timeframeEnd && scopeForm.timeframeStart > scopeForm.timeframeEnd) {
                              showNotify('âš ï¸ "à¸‚à¸­à¸šà¹€à¸‚à¸•à¸§à¸±à¸™à¸—à¸µà¹ˆà¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™à¸‚à¹‰à¸­à¸¡à¸¹à¸¥" à¸•à¹‰à¸­à¸‡à¹„à¸¡à¹ˆà¸¡à¸²à¸à¸à¸§à¹ˆà¸² "à¸‚à¸­à¸šà¹€à¸‚à¸•à¸§à¸±à¸™à¸—à¸µà¹ˆà¸ªà¸´à¹‰à¸™à¸ªà¸¸à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥"');
                              return;
                            }

                            setWizardStep(3);
                          }}
                          className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold py-2 px-6 rounded-lg transition shadow-md"
                        >
                          à¸‚à¸±à¹‰à¸™à¸•à¸­à¸™à¸–à¸±à¸”à¹„à¸›
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Identity & Consents */}
                  {wizardStep === 3 && (
                    <div className="space-y-6">
                      
                      {/* Identity Verification & Document Attachment Component */}
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-bold text-slate-800 block">
                            à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¸«à¸¥à¸±à¸à¸à¸²à¸™à¸¢à¸·à¸™à¸¢à¸±à¸™à¸•à¸±à¸§à¸•à¸™ à¹à¸¥à¸°à¸›à¹‰à¸­à¸‡à¸à¸±à¸™à¸„à¸§à¸²à¸¡à¹€à¸›à¹‡à¸™à¸ªà¹ˆà¸§à¸™à¸•à¸±à¸§ (Identity & Document Upload)
                          </label>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            à¸à¸£à¸¸à¸“à¸²à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¹€à¸­à¸à¸ªà¸²à¸£à¸¢à¸·à¸™à¸¢à¸±à¸™à¸•à¸±à¸§à¸•à¸™ (à¸£à¸­à¸‡à¸£à¸±à¸šà¸£à¸¹à¸›à¸ à¸²à¸ž JPEG, PNG à¸«à¸£à¸·à¸­ à¹€à¸­à¸à¸ªà¸²à¸£ PDF à¸ªà¸³à¹€à¸™à¸²à¸—à¸µà¹ˆà¸¡à¸µà¸à¸²à¸£à¸£à¸±à¸šà¸£à¸­à¸‡à¸–à¸¹à¸à¸•à¹‰à¸­à¸‡)
                          </p>
                        </div>

                        {reqType === 'self' ? (
                          <WatermarkedUpload
                            label="à¸ªà¸³à¹€à¸™à¸²à¸šà¸±à¸•à¸£à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™/à¹€à¸­à¸à¸ªà¸²à¸£à¸¢à¸·à¸™à¸¢à¸±à¸™à¸•à¸±à¸§à¸•à¸™à¹€à¸ˆà¹‰à¸²à¸‚à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥ (JPEG, PNG, PDF)"
                            orgName={organizations.find((o: any) => o.id === selectedTargetOrgId)?.nameTh || 'à¸«à¸™à¹ˆà¸§à¸¢à¸‡à¸²à¸™à¸œà¸¹à¹‰à¸£à¸±à¸šà¸„à¸³à¸‚à¸­'}
                            onFileProcessed={handleFileUpload}
                          />
                        ) : (
                          <div className="space-y-4">
                            {/* 1. Data Subject ID Card */}
                            <WatermarkedUpload
                              label="1. à¸ªà¸³à¹€à¸™à¸²à¸šà¸±à¸•à¸£à¸›à¸£à¸°à¸ˆà¸³à¸•à¸±à¸§à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™à¸œà¸¹à¹‰à¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆ (à¹€à¸ˆà¹‰à¸²à¸‚à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥) (JPEG, PNG, PDF)"
                              orgName={organizations.find((o: any) => o.id === selectedTargetOrgId)?.nameTh || 'à¸«à¸™à¹ˆà¸§à¸¢à¸‡à¸²à¸™à¸œà¸¹à¹‰à¸£à¸±à¸šà¸„à¸³à¸‚à¸­'}
                              onFileProcessed={(fileName, dataUrl) => handleFileUpload(`[à¸œà¸¹à¹‰à¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆ] ${fileName}`, dataUrl)}
                            />

                            {/* 2. Authorized Representative ID Card */}
                            <WatermarkedUpload
                              label="2. à¸ªà¸³à¹€à¸™à¸²à¸šà¸±à¸•à¸£à¸›à¸£à¸°à¸ˆà¸³à¸•à¸±à¸§à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™à¸œà¸¹à¹‰à¸£à¸±à¸šà¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆ (Authorized Representative) (JPEG, PNG, PDF)"
                              orgName={organizations.find((o: any) => o.id === selectedTargetOrgId)?.nameTh || 'à¸«à¸™à¹ˆà¸§à¸¢à¸‡à¸²à¸™à¸œà¸¹à¹‰à¸£à¸±à¸šà¸„à¸³à¸‚à¸­'}
                              onFileProcessed={(fileName, dataUrl) => handleFileUpload(`[à¸œà¸¹à¹‰à¸£à¸±à¸šà¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆ] ${fileName}`, dataUrl)}
                            />

                            {/* 3. Power of Attorney Document */}
                            <div className="border border-teal-200 rounded-xl p-4 space-y-2.5 bg-teal-50/60 shadow-sm">
                              <span className="block text-xs font-bold text-teal-950 flex items-center gap-1.5">
                                <FileText className="h-4 w-4 text-teal-700" />
                                <span>3. à¹à¸™à¸šà¹€à¸­à¸à¸ªà¸²à¸£à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆà¸‰à¸šà¸±à¸šà¸ˆà¸£à¸´à¸‡à¸«à¸£à¸·à¸­à¸ªà¸³à¹€à¸™à¸²à¸—à¸µà¹ˆà¸¡à¸µà¸à¸²à¸£à¸£à¸±à¸šà¸£à¸­à¸‡ (Power of Attorney)</span>
                              </span>
                              <p className="text-[10px] text-teal-800">à¸£à¸­à¸‡à¸£à¸±à¸šà¹„à¸Ÿà¸¥à¹Œà¹€à¸­à¸à¸ªà¸²à¸£ PDF à¸«à¸£à¸·à¸­à¸£à¸¹à¸›à¸ à¸²à¸ž (PDF, JPEG, PNG) à¸‚à¸™à¸²à¸”à¹„à¸¡à¹ˆà¹€à¸à¸´à¸™ 5MB</p>
                              <input
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg,application/pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleFileUpload(`[à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆ] ${file.name}`, 'mock_pdf_poa_blob');
                                  }
                                }}
                                className="text-xs block w-full text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-teal-600 file:text-white hover:file:bg-teal-700 cursor-pointer"
                              />
                            </div>
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
                          <span>à¸‚à¸­à¸¢à¸´à¸™à¸¢à¸­à¸¡à¹ƒà¸«à¹‰à¸­à¸‡à¸„à¹Œà¸à¸£à¹€à¸à¹‡à¸š à¸£à¸§à¸šà¸£à¸§à¸¡ à¹à¸¥à¸°à¸›à¸£à¸°à¸¡à¸§à¸¥à¸œà¸¥à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¸‚à¸­à¸‡à¸‚à¹‰à¸²à¸žà¹€à¸ˆà¹‰à¸²à¸—à¸µà¹ˆà¸¢à¸·à¹ˆà¸™à¹ƒà¸™à¸„à¸³à¸‚à¸­à¸™à¸µà¹‰ à¹€à¸žà¸·à¹ˆà¸­à¹ƒà¸Šà¹‰à¸ªà¸³à¸«à¸£à¸±à¸šà¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸ªà¸´à¸—à¸˜à¸´à¹à¸¥à¸°à¸ˆà¸±à¸”à¸ªà¹ˆà¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸•à¸²à¸¡à¸„à¸§à¸²à¸¡à¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¸‚à¸­à¸‡à¸ªà¸´à¸—à¸˜à¸´à¸•à¸²à¸¡ <button type="button" onClick={() => setShowPrivacyModal(true)} className="text-brand-600 hover:underline font-bold bg-transparent border-none p-0 cursor-pointer">à¸™à¹‚à¸¢à¸šà¸²à¸¢à¸„à¸§à¸²à¸¡à¹€à¸›à¹‡à¸™à¸ªà¹ˆà¸§à¸™à¸•à¸±à¸§ (Privacy Notice)</button></span>
                        </label>
                        <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600">
                          <input
                            type="checkbox"
                            required
                            checked={accuracyCertified}
                            onChange={(e) => setAccuracyCertified(e.target.checked)}
                            className="rounded text-brand-600 focus:ring-brand-500 mt-0.5"
                          />
                          <span>à¸‚à¸­à¸£à¸±à¸šà¸£à¸­à¸‡à¸§à¹ˆà¸²à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸‚à¹‰à¸²à¸‡à¸•à¹‰à¸™ à¹€à¸­à¸à¸ªà¸²à¸£à¸›à¸£à¸°à¸ˆà¸³à¸•à¸±à¸§ à¹à¸¥à¸°à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆ (à¸–à¹‰à¸²à¸¡à¸µ) à¹€à¸›à¹‡à¸™à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸—à¸µà¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡à¹à¸¥à¸°à¹à¸—à¹‰à¸ˆà¸£à¸´à¸‡à¸—à¸¸à¸à¸›à¸£à¸°à¸à¸²à¸£</span>
                        </label>
                      </div>

                      <div className="flex justify-between pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setWizardStep(2)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-6 rounded-lg transition"
                        >
                          à¸¢à¹‰à¸­à¸™à¸à¸¥à¸±à¸š
                        </button>
                        <button
                          type="submit"
                          disabled={isSendingOtp}
                          className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold py-2.5 px-8 rounded-lg transition shadow-sm flex items-center gap-2"
                        >
                          {isSendingOtp ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              <span>à¸à¸³à¸¥à¸±à¸‡à¸›à¸£à¸°à¸¡à¸§à¸¥à¸œà¸¥...</span>
                            </>
                          ) : (
                            'à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¸ªà¹ˆà¸‡à¸„à¸³à¸‚à¸­à¸­à¸¢à¹ˆà¸²à¸‡à¹€à¸›à¹‡à¸™à¸—à¸²à¸‡à¸à¸²à¸£'
                          )}
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
                  <h3 className="font-bold text-slate-800 text-lg">à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­à¸£à¸±à¸šà¸ªà¸´à¸—à¸˜à¸´à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¸ªà¸³à¹€à¸£à¹‡à¸ˆ!</h3>
                  <p className="text-xs text-slate-500">
                    à¸„à¸³à¸£à¹‰à¸­à¸‡à¸‚à¸­à¸‡à¸—à¹ˆà¸²à¸™à¹„à¸”à¹‰à¸£à¸±à¸šà¸à¸²à¸£à¸šà¸±à¸™à¸—à¸¶à¸à¹€à¸‚à¹‰à¸²à¸£à¸°à¸šà¸šà¹à¸¥à¹‰à¸§ à¹à¸¥à¸°à¹€à¸£à¸´à¹ˆà¸¡à¸à¸£à¸°à¸šà¸§à¸™à¸à¸²à¸£à¸„à¸±à¸”à¸à¸£à¸­à¸‡à¸•à¸±à¸§à¸•à¸™
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2 max-w-sm mx-auto">
                  <span className="text-xs text-slate-400 block font-bold">à¹€à¸¥à¸‚à¸­à¹‰à¸²à¸‡à¸­à¸´à¸‡à¸•à¸´à¸”à¸•à¸²à¸¡à¸œà¸¥à¸„à¸³à¸‚à¸­ (Tracking Number)</span>
                  <span className="text-xl font-mono font-bold text-slate-800 block select-all">
                    {isNewRequestSuccess.trackingNo}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    *à¸à¸£à¸¸à¸“à¸²à¸ˆà¸”à¸ˆà¸³à¹€à¸¥à¸‚à¸™à¸µà¹‰à¹€à¸žà¸·à¹ˆà¸­à¸•à¸´à¸”à¸•à¸²à¸¡à¸ªà¸–à¸²à¸™à¸°à¸œà¸¥à¹à¸¥à¸°à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¹„à¸Ÿà¸¥à¹Œ*
                  </span>
                </div>

                <div className="p-3 bg-brand-50 border border-brand-100 text-brand-800 rounded-xl text-[11px] leading-relaxed max-w-sm mx-auto">
                  <strong>à¸„à¸³à¹à¸™à¸°à¸™à¸³à¹€à¸žà¸·à¹ˆà¸­à¸„à¸§à¸²à¸¡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢à¹ƒà¸™à¸à¸²à¸£à¸ªà¸·à¸šà¸„à¹‰à¸™à¸ªà¸–à¸²à¸™à¸°:</strong> <br />
                  à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™à¹à¸šà¸šà¹ƒà¸Šà¹‰à¸„à¸£à¸±à¹‰à¸‡à¹€à¸”à¸µà¸¢à¸§ (OTP) à¸ªà¸³à¸«à¸£à¸±à¸šà¸¢à¸·à¸™à¸¢à¸±à¸™à¸•à¸±à¸§à¸•à¸™à¹€à¸žà¸·à¹ˆà¸­à¸ªà¸·à¸šà¸„à¹‰à¸™à¸ªà¸–à¸²à¸™à¸° à¸ˆà¸°à¸ªà¹ˆà¸‡à¹„à¸›à¸¢à¸±à¸‡à¸­à¸µà¹€à¸¡à¸¥à¸‚à¸­à¸‡à¸„à¸¸à¸“
                </div>

                <div className="flex gap-2 justify-center pt-2">
                  <button
                    onClick={() => setPublicTab('landing')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2 px-5 rounded-lg transition"
                  >
                    à¸à¸¥à¸±à¸šà¸ªà¸¹à¹ˆà¸«à¸™à¹‰à¸²à¹à¸£à¸
                  </button>
                  <button
                    onClick={() => {
                      setTrackNo(isNewRequestSuccess.trackingNo);
                      setTrackedRequest(isNewRequestSuccess);
                      setOtpSent(false);
                      setShowOtpModal(true);
                    }}
                    className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold py-2 px-5 rounded-lg transition shadow-sm"
                  >
                    à¹€à¸›à¸´à¸”à¸«à¸™à¹‰à¸²à¸•à¸´à¸”à¸•à¸²à¸¡à¸œà¸¥à¹€à¸¥à¸¢
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
                <span>à¸à¸¥à¸±à¸šà¸žà¸­à¸£à¹Œà¸—à¸±à¸¥à¸ªà¸²à¸˜à¸²à¸£à¸“à¸°</span>
              </button>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">à¸•à¸´à¸”à¸•à¸²à¸¡à¸„à¸³à¸‚à¸­à¹€à¸¥à¸‚à¸—à¸µà¹ˆ</span>
                <span className="text-sm font-bold text-slate-800">{trackedRequest.trackingNo}</span>
              </div>
            </div>
          </header>

          <main className="flex-1 max-w-5xl w-full mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left sidebar: Request summary */}
            <div className="md:col-span-1 space-y-6">
              
              {/* Status card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">à¸ªà¸–à¸²à¸™à¸°à¸„à¸³à¸£à¹‰à¸­à¸‡à¸›à¸±à¸ˆà¸ˆà¸¸à¸šà¸±à¸™</span>
                
                <div>
                  <span className="inline-block bg-brand-50 text-brand-700 border border-brand-100 rounded-full px-3 py-1 text-xs font-bold">
                    {trackedRequest.status}
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­:</span>
                    <span className="font-bold text-slate-900">{trackedRequest.requester?.firstName} {trackedRequest.requester?.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>à¸§à¸±à¸™à¸—à¸µà¹ˆà¸ªà¹ˆà¸‡à¸„à¸³à¸‚à¸­:</span>
                    <span className="font-semibold">{convertToThaiDate(trackedRequest.submissionDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>à¸›à¸£à¸°à¹€à¸ à¸—à¸ªà¸´à¸—à¸˜à¸´:</span>
                    <span className="font-semibold uppercase">{trackedRequest.requestDetails?.requestType || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>à¸Šà¹ˆà¸­à¸‡à¸—à¸²à¸‡à¸£à¸±à¸šà¸¡à¸­à¸š:</span>
                    <span className="font-semibold text-brand-600">
                      {trackedRequest.requestDetails?.deliveryMethod === 'secure_download' ? 'à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¸­à¸­à¸™à¹„à¸¥à¸™à¹Œ' : trackedRequest.requestDetails?.deliveryMethod === 'pickup' ? 'à¸£à¸±à¸š à¸“ à¸ªà¸³à¸™à¸±à¸à¸‡à¸²à¸™' : 'à¸ªà¹ˆà¸‡à¸—à¸²à¸‡à¹„à¸›à¸£à¸©à¸“à¸µà¸¢à¹Œ'}
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
                      <span>à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¸ªà¸³à¹€à¸™à¸²à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸‚à¸­à¸‡à¸—à¹ˆà¸²à¸™</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Upload extra files when requested */}
              {trackedRequest.status === 'Awaiting Additional Information' && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 space-y-3.5 shadow-md animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¹à¸ˆà¹‰à¸‡à¸‚à¸­à¹€à¸­à¸à¸ªà¸²à¸£à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡ (Action Required)</span>
                    </span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                      SLA à¸«à¸¢à¸¸à¸”à¸™à¸±à¸šà¸Šà¸±à¹ˆà¸§à¸„à¸£à¸²à¸§
                    </span>
                  </div>

                  <div className="bg-white border border-amber-200 rounded-xl p-3 text-xs text-amber-900 leading-relaxed font-medium space-y-1">
                    <span className="block font-bold text-amber-800">à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”à¹€à¸­à¸à¸ªà¸²à¸£à¸—à¸µà¹ˆà¸£à¹‰à¸­à¸‡à¸‚à¸­à¹€à¸žà¸´à¹ˆà¸¡:</span>
                    <p className="text-slate-700 bg-amber-50/50 p-2 rounded border border-amber-100 font-mono text-[11px]">
                      {(trackedRequest.statusHistory || []).find(h => h.status === 'Awaiting Additional Information')?.comment || 'à¹‚à¸›à¸£à¸”à¹à¸™à¸šà¸£à¸¹à¸›à¸–à¹ˆà¸²à¸¢à¸ªà¸³à¹€à¸™à¸²à¸šà¸±à¸•à¸£à¸›à¸£à¸°à¸ˆà¸³à¸•à¸±à¸§à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡à¹€à¸žà¸·à¹ˆà¸­à¸¢à¸·à¸™à¸¢à¸±à¸™à¸•à¸±à¸§à¸•à¸™'}
                    </p>
                    <p className="text-[10px] text-amber-700 pt-1 font-semibold">
                      â±ï¸ à¸à¸£à¸¸à¸“à¸²à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡à¸ à¸²à¸¢à¹ƒà¸™à¹€à¸§à¸¥à¸²à¸—à¸µà¹ˆà¸à¸³à¸«à¸™à¸” (10 à¸§à¸±à¸™) à¸¡à¸´à¸‰à¸°à¸™à¸±à¹‰à¸™à¹€à¸£à¸·à¹ˆà¸­à¸‡à¸ˆà¸°à¸–à¸¹à¸à¸¢à¸à¹€à¸¥à¸´à¸à¸„à¸³à¸‚à¸­à¸•à¸²à¸¡à¸£à¸°à¸šà¸šà¸­à¸±à¸•à¹‚à¸™à¸¡à¸±à¸•à¸´
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-800 block">à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¸£à¸¹à¸›à¸ à¸²à¸žà¸šà¸±à¸•à¸£à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™ / à¹€à¸­à¸à¸ªà¸²à¸£à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡à¸—à¸µà¹ˆà¸™à¸µà¹ˆ:</span>
                    <WatermarkedUpload
                      label="à¹à¸™à¸šà¸£à¸¹à¸›à¸–à¹ˆà¸²à¸¢à¸šà¸±à¸•à¸£à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™ à¸«à¸£à¸·à¸­ à¹€à¸­à¸à¸ªà¸²à¸£à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡à¸—à¸µà¹ˆà¸£à¹‰à¸­à¸‡à¸‚à¸­"
                      orgName={organizations.find((o: any) => o.id === trackedRequest.targetOrgId)?.nameTh || trackedRequest.targetOrgName || 'à¸«à¸™à¹ˆà¸§à¸¢à¸‡à¸²à¸™à¸œà¸¹à¹‰à¸£à¸±à¸šà¸„à¸³à¸‚à¸­'}
                      onFileProcessed={handleUploadAdditionalTrack}
                    />
                  </div>
                </div>
              )}

              {/* Withdraw request action */}
              {!['Ready for Delivery', 'Delivered', 'Receipt Confirmed', 'Closed', 'Withdrawn', 'Destroyed'].includes(trackedRequest.status) && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                  <button
                    onClick={() => {
                      setWithdrawReasonText('');
                      setWithdrawOtpCode('');
                      setWithdrawStep('reason');
                      setShowWithdrawModal(true);
                    }}
                    className="text-xs text-rose-600 hover:text-rose-700 font-bold transition flex items-center justify-center gap-1.5 w-full py-1"
                  >
                    <span>âš ï¸ à¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¸–à¸­à¸™à¸„à¸³à¸£à¹‰à¸­à¸‡à¸‚à¸­à¹€à¸‚à¹‰à¸²à¸–à¸¶à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥ (Withdraw Request)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right details: Status timeline and communication */}
            <div className="md:col-span-2 space-y-6">
              
              {/* Timeline list with Thai Time */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¸±à¹‰à¸™à¸•à¸­à¸™à¸à¸²à¸£à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£ (TIMELINE HISTORY)</span>
                
                <div className="relative pl-6 border-l border-slate-200 space-y-6 pt-2">
                  {(trackedRequest.statusHistory || []).slice().reverse().map((h, i) => (
                    <div key={i} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[30px] top-0.5 h-4.5 w-4.5 rounded-full border-2 border-white bg-brand-500 flex items-center justify-center text-[10px] text-white">
                        âœ“
                      </span>
                      <div className="text-xs font-bold text-slate-800">{h.status}</div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {convertToThaiDate(h.changedAt, true)} à¹‚à¸”à¸¢ <span className="font-semibold text-slate-700">{h.changedBy}</span>
                      </div>
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
                  <span className="block font-bold text-slate-800 text-xs">à¸Šà¹ˆà¸­à¸‡à¸—à¸²à¸‡à¸•à¸´à¸”à¸•à¹ˆà¸­à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¹‚à¸”à¸¢à¸•à¸£à¸‡ (Message Board)</span>
                  <span className="text-[10px] text-slate-500">à¸ªà¸­à¸šà¸–à¸²à¸¡à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸” à¸¢à¸·à¹ˆà¸™à¸‚à¹‰à¸­à¸‹à¸±à¸à¸–à¸²à¸¡ à¸«à¸£à¸·à¸­à¸ªà¹ˆà¸‡à¸„à¸³à¸­à¸˜à¸´à¸šà¸²à¸¢à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡</span>
                </div>
                
                {/* Chat items */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {(trackedRequest.messageThread || []).length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸²à¸£à¸ªà¹ˆà¸‡à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡ à¸ªà¸™à¸—à¸™à¸²à¸–à¸²à¸¡à¸•à¸­à¸šà¸”à¹‰à¸²à¸™à¸¥à¹ˆà¸²à¸‡à¹„à¸”à¹‰à¸—à¸±à¸™à¸—à¸µ
                    </div>
                  ) : (
                    (trackedRequest.messageThread || []).map((msg) => (
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
                          {formatThaiTimeString(msg.timestamp)}
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
                    placeholder="à¸žà¸´à¸¡à¸žà¹Œà¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡à¸ªà¸­à¸šà¸–à¸²à¸¡à¸ªà¹ˆà¸‡à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¸—à¸µà¹ˆà¸™à¸µà¹ˆ..."
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
              <h3 className="font-bold text-lg">à¸£à¸°à¸šà¸šà¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹€à¸‚à¹‰à¸²à¸£à¸«à¸±à¸ªà¸›à¸¥à¸­à¸”à¸ à¸±à¸¢</h3>
              <p className="text-xs text-slate-400">
                Secure Data Download Portal (Section 3.9)
              </p>
            </div>

            {downloadError ? (
              <div className="p-4 bg-red-950/50 border border-red-800 text-red-300 rounded-xl text-xs text-center space-y-3">
                <p>{downloadError}</p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setView('public')}
                    className="bg-red-800 hover:bg-red-700 text-white px-4 py-2 rounded text-xs font-semibold w-full sm:w-auto"
                  >
                    à¸à¸¥à¸±à¸šà¸«à¸™à¹‰à¸²à¹à¸£à¸à¸žà¸­à¸£à¹Œà¸—à¸±à¸¥
                  </button>
                  {downloadError.includes('à¸«à¸¡à¸”à¸­à¸²à¸¢à¸¸') && downloadRequest && (
                    <button
                      type="button"
                      onClick={handleRequestExtensionPublic}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded text-xs font-semibold w-full sm:w-auto"
                    >
                      à¸¢à¸·à¹ˆà¸™à¹€à¸£à¸·à¹ˆà¸­à¸‡à¸‚à¸­à¸•à¹ˆà¸­à¸­à¸²à¸¢à¸¸à¸à¸²à¸£à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”
                    </button>
                  )}
                </div>
              </div>
            ) : showDownloadOtpModal && downloadRequest ? (
                <form onSubmit={handleVerifyDownloadOtp} className="space-y-4">
                  <div className="p-3.5 bg-brand-950/40 border border-brand-900 text-brand-300 rounded-xl text-xs leading-relaxed space-y-1">
                    <span className="block font-bold">à¸¢à¸·à¸™à¸¢à¸±à¸™à¸£à¸«à¸±à¸ªà¹€à¸‚à¹‰à¸²à¸–à¸¶à¸‡ (Two-Factor OTP Verification):</span>
                    <span>à¸£à¸°à¸šà¸šà¹„à¸”à¹‰à¸ˆà¸±à¸”à¸ªà¹ˆà¸‡à¸£à¸«à¸±à¸ª OTP 6 à¸«à¸¥à¸±à¸ à¹„à¸›à¸—à¸µà¹ˆà¸­à¸µà¹€à¸¡à¸¥ {maskEmail(downloadRequest.requester.email)} à¸‚à¸­à¸‡à¸—à¹ˆà¸²à¸™à¹à¸¥à¹‰à¸§</span>
                    {downloadRequest.downloadExpiresAt && (
                      <span className="block text-amber-400 mt-2">
                        * à¹€à¸­à¸à¸ªà¸²à¸£à¸™à¸µà¹‰à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¹„à¸”à¹‰à¸–à¸¶à¸‡à¸§à¸±à¸™à¸—à¸µà¹ˆ {new Date(downloadRequest.downloadExpiresAt).toLocaleDateString('th-TH')}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-slate-300">
                    <label className="text-xs font-medium">à¸£à¸°à¸šà¸¸à¸£à¸«à¸±à¸ª OTP 6 à¸«à¸¥à¸±à¸</label>
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
                    à¸–à¸­à¸”à¸£à¸«à¸±à¸ªà¸¥à¸±à¸šà¹à¸¥à¸°à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¸£à¸²à¸¢à¸‡à¸²à¸™à¸‚à¹‰à¸­à¸¡à¸¹à¸¥
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setView('public')}
                    className="w-full text-slate-400 hover:text-slate-300 text-xs py-1.5 transition"
                  >
                    à¸¢à¸à¹€à¸¥à¸´à¸à¸à¸£à¸°à¸šà¸§à¸™à¸à¸²à¸£
                  </button>
                </form>
            ) : (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const target = e.target as typeof e.target & {
                    trackingNo: { value: string };
                  };
                  const trackingNo = target.trackingNo.value.trim();
                  window.location.href = `/dl/${trackingNo}`;
                }} className="space-y-4">
                  <div className="space-y-1 text-slate-300">
                    <label className="text-xs font-medium">à¸£à¸°à¸šà¸¸à¸£à¸«à¸±à¸ªà¸­à¹‰à¸²à¸‡à¸­à¸´à¸‡ (Tracking Number)</label>
                    <input
                      type="text"
                      name="trackingNo"
                      required
                      placeholder="REQ-XXXXXX-XXXX-XXXX"
                      className="w-full text-center font-mono text-base font-bold bg-slate-800 border border-slate-700 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-brand-500 text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition shadow-md"
                  >
                    à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£à¸•à¹ˆà¸­ (Continue)
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('public')}
                    className="w-full text-slate-400 hover:text-slate-300 text-xs py-1.5 transition"
                  >
                    à¸à¸¥à¸±à¸šà¸«à¸™à¹‰à¸²à¹à¸£à¸ (Back to Home)
                  </button>
                </form>
            )}

            <div className="text-[10px] text-slate-600 text-center">
              à¸ªà¸´à¸—à¸˜à¸´à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¸‚à¸­à¸‡à¸«à¸™à¹ˆà¸§à¸¢à¸‡à¸²à¸™ à¸ž.à¸£.à¸š. à¸„à¸¸à¹‰à¸¡à¸„à¸£à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥ à¸ž.à¸¨. 2562
            </div>
          </div>
        </div>
      )}

      {/* --- RENDER VIEW 4: INTERNAL WORKSPACE STAFF PORTAL --- */}
      {view === 'internal' && activeUser && (
        <div className="flex-1 flex flex-col md:flex-row">
          
          {/* Internal Sidebar Menu */}
          <aside className="no-print w-full md:w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col justify-between shrink-0">
            <div className="p-4 space-y-6">
              
              <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
                <div className="h-8 w-8 rounded bg-brand-500 flex items-center justify-center text-white font-bold text-xs">
                  PDPA
                </div>
                <div>
                  <span className="block font-bold text-white text-xs">à¸«à¸™à¹ˆà¸§à¸¢à¸‡à¸²à¸™à¸„à¸§à¸šà¸„à¸¸à¸¡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥</span>
                  <span className="block text-[9px] text-slate-500">à¸£à¸°à¸šà¸šà¸šà¸£à¸´à¸«à¸²à¸£à¸ªà¸´à¸—à¸˜à¸´à¸¡à¸²à¸•à¸£à¸² 30</span>
                </div>
              </div>

              {/* Navigation Items */}
              <nav className="space-y-1">
                {[
                  { id: 'dashboard', label: 'à¸«à¸™à¹‰à¸²à¹à¸œà¸‡à¸„à¸§à¸šà¸„à¸¸à¸¡à¸«à¸¥à¸±à¸', icon: Layers, roles: ['admin', 'intake', 'dpo', 'approver', 'auditor'] },
                  { id: 'requests', label: 'à¸£à¸²à¸¢à¸à¸²à¸£à¸„à¸³à¸‚à¸­à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”', icon: List, roles: ['admin', 'intake', 'dpo', 'approver', 'auditor', 'owner'] },
                  { id: 'kanban', label: 'Kanban à¸šà¸­à¸£à¹Œà¸”à¸ªà¸´à¸—à¸˜à¸´à¹Œ', icon: Layers, roles: ['admin', 'intake', 'dpo', 'approver', 'owner'] },
                  { id: 'users', label: 'à¸ˆà¸±à¸”à¸à¸²à¸£à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¹à¸¥à¸°à¸ªà¸´à¸—à¸˜à¸´à¹Œ', icon: UserCheck, roles: ['admin'] },
                  { id: 'compliance', label: 'Compliance à¸•à¸±à¹‰à¸‡à¸„à¹ˆà¸²à¸à¸Žà¸«à¸¡à¸²à¸¢', icon: Scale, roles: ['admin'] },
                  { id: 'templates', label: 'Template à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸£à¸²à¸Šà¸à¸²à¸£', icon: FileCheck2, roles: ['admin'] },
                  { id: 'retention', label: 'à¸—à¸³à¸¥à¸²à¸¢à¹à¸¥à¸°à¸ˆà¸±à¸”à¹€à¸à¹‡à¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥', icon: Trash2, roles: ['admin'] },
                  { id: 'audit', label: 'à¸£à¸²à¸¢à¸‡à¸²à¸™à¸šà¸±à¸™à¸—à¸¶à¸à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸ªà¸´à¸—à¸˜à¸´à¹Œ', icon: Lock, roles: ['admin', 'auditor', 'dpo'] }
                ].map((item) => {
                  const hasAccess = activeUser.role === 'superadmin' || item.roles.includes(activeUser.role);
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
                      {item.id === 'requests' && filteredRequests.length > 0 && (
                        <span className="bg-slate-800 text-slate-300 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                          {filteredRequests.length}
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
          <main className="flex-1 p-6 print:p-0 space-y-6 overflow-y-auto print:overflow-visible">
            
            {/* SOD Compliance Risk Warning Banner */}
            {activeUser.sodWarnings && activeUser.sodWarnings.length > 0 && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex gap-3 text-amber-900 text-xs shadow-sm">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-sm mb-1 text-amber-900">à¹à¸ˆà¹‰à¸‡à¹€à¸•à¸·à¸­à¸™à¸„à¸§à¸²à¸¡à¹€à¸ªà¸µà¹ˆà¸¢à¸‡à¸«à¸¥à¸±à¸à¸à¸²à¸£à¸„à¸²à¸™à¸­à¸³à¸™à¸²à¸ˆ (Segregation of Duties - SOD Warning):</span>
                  {activeUser.sodWarnings.map((warn, idx) => (
                    <p key={idx} className="leading-relaxed font-medium">{warn}</p>
                  ))}
                  <span className="block text-[10px] text-amber-700 mt-1 font-mono">à¸‚à¹‰à¸­à¹à¸™à¸°à¸™à¸³: à¸šà¸±à¸à¸Šà¸µà¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸™à¸µà¹‰à¸–à¸·à¸­à¸ªà¸´à¸—à¸˜à¸´à¹Œà¸‹à¹‰à¸³à¸‹à¹‰à¸­à¸™ à¸„à¸§à¸£à¹à¸¢à¸à¸ªà¸´à¸—à¸˜à¸´à¹Œà¹ƒà¸«à¹‰à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¸­à¸·à¹ˆà¸™à¸¥à¸‡à¸™à¸²à¸¡à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¹€à¸žà¸·à¹ˆà¸­à¸„à¸§à¸²à¸¡à¸ªà¸­à¸”à¸„à¸¥à¹‰à¸­à¸‡à¸•à¸²à¸¡à¸¡à¸²à¸•à¸£à¸à¸²à¸™ Audit</span>
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
                        <span className="bg-brand-50 text-brand-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-brand-200">
                          {activeRequestObj.status}
                        </span>
                        {activeRequestObj.slaPaused && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            SLA Paused (à¸£à¸­à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1 font-medium">
                        <User className="h-3.5 w-3.5 text-brand-600 shrink-0" />
                        <span>à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­: <strong className="text-slate-900 font-bold">{activeRequestObj.requester.firstName} {activeRequestObj.requester.lastName}</strong></span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                          ({activeRequestObj.requesterType === 'self' ? 'à¹€à¸ˆà¹‰à¸²à¸‚à¸­à¸‡à¸ªà¸´à¸—à¸˜à¸´à¸¢à¸·à¹ˆà¸™à¹€à¸­à¸‡' : 'à¸œà¸¹à¹‰à¹à¸—à¸™à¸•à¸²à¸¡à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆ'})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* SLA Countdowns (Section 5) */}
                  <div className="flex gap-4 text-xs font-bold text-slate-700">
                    <div className="text-center p-2 bg-slate-50 rounded border border-slate-200 min-w-[100px]">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">SLA à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£</span>
                      <span className={`text-sm block ${activeRequestObj.slaRemainingDays < 0 ? 'text-rose-600 animate-pulse' : activeRequestObj.slaRemainingDays <= 7 ? 'text-amber-600' : 'text-slate-800'}`}>
                        {activeRequestObj.slaRemainingDays} à¸§à¸±à¸™
                      </span>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded border border-slate-200 min-w-[100px] flex flex-col justify-between items-center">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">à¸‚à¸¢à¸²à¸¢à¸£à¸°à¸¢à¸°à¹€à¸§à¸¥à¸²</span>
                      <span className="text-xs block text-slate-800 font-bold">
                        {activeRequestObj.slaExtended ? 'à¸‚à¸¢à¸²à¸¢à¹à¸¥à¹‰à¸§ (+30 à¸§à¸±à¸™)' : 'à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¹€à¸„à¸¢à¸‚à¸¢à¸²à¸¢'}
                      </span>
                      {!activeRequestObj.slaExtended && ['admin', 'dpo'].includes(activeUser.role) && !['Closed', 'Delivered', 'Withdrawn', 'Destroyed'].includes(activeRequestObj.status) && (
                        <button
                          type="button"
                          onClick={() => {
                            setExtendSlaModal({ open: true, reqId: activeRequestObj.id, reason: '' });
                          }}
                          className="mt-1 bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded transition"
                        >
                          à¸‚à¸¢à¸²à¸¢à¹€à¸§à¸¥à¸² +30 à¸§à¸±à¸™
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Main Action Modules for Request Details */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Intake details, identity, completeness checks */}
                  <div className="lg:col-span-2 space-y-6 flex flex-col">
                    
                    {/* Module 0: Data Subject & Requester Profile Card */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 order-1">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <User className="h-4 w-4 text-brand-600" />
                          <span>à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­à¹à¸¥à¸°à¹€à¸ˆà¹‰à¸²à¸‚à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥ (Data Subject Profile)</span>
                        </span>
                        <span className="text-[10px] bg-brand-50 text-brand-700 font-bold px-2.5 py-1 rounded-full border border-brand-200">
                          {activeRequestObj.requesterType === 'self' ? 'ðŸ‘¤ à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­à¸”à¹‰à¸§à¸¢à¸•à¸™à¹€à¸­à¸‡ (Self)' : 'ðŸ‘¥ à¸¢à¸·à¹ˆà¸™à¹à¸—à¸™à¹‚à¸”à¸¢à¸œà¸¹à¹‰à¸£à¸±à¸šà¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆ (Representative)'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <span className="text-slate-400 block font-semibold text-[11px]">à¸Šà¸·à¹ˆà¸­-à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥ à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­:</span>
                          <span className="font-bold text-slate-900 text-sm block">
                            {activeRequestObj.requester.firstName} {activeRequestObj.requester.lastName}
                          </span>
                        </div>

                        <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <span className="text-slate-400 block font-semibold text-[11px]">à¹€à¸¥à¸‚à¸šà¸±à¸•à¸£à¸›à¸£à¸°à¸ˆà¸³à¸•à¸±à¸§à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™:</span>
                          <span className="font-bold text-slate-800 font-mono text-xs block">
                            {activeRequestObj.requester.idNumber || 'à¹„à¸¡à¹ˆà¸£à¸°à¸šà¸¸'}
                          </span>
                        </div>

                        <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <span className="text-slate-400 block font-semibold text-[11px]">à¸­à¸µà¹€à¸¡à¸¥à¸•à¸´à¸”à¸•à¹ˆà¸­ (Email Address):</span>
                          <span className="font-bold text-brand-700 font-mono text-xs block truncate">
                            {activeRequestObj.requester.email || 'à¹„à¸¡à¹ˆà¸£à¸°à¸šà¸¸'}
                          </span>
                        </div>

                        <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <span className="text-slate-400 block font-semibold text-[11px]">à¹€à¸šà¸­à¸£à¹Œà¹‚à¸—à¸£à¸¨à¸±à¸žà¸—à¹Œà¸•à¸´à¸”à¸•à¹ˆà¸­:</span>
                          <span className="font-bold text-slate-800 font-mono text-xs block">
                            {activeRequestObj.requester.phone || 'à¹„à¸¡à¹ˆà¸£à¸°à¸šà¸¸'}
                          </span>
                        </div>

                        <div className="md:col-span-2 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <span className="text-slate-400 block font-semibold text-[11px]">à¸—à¸µà¹ˆà¸­à¸¢à¸¹à¹ˆà¸•à¸´à¸”à¸•à¹ˆà¸­/à¸ˆà¸±à¸”à¸ªà¹ˆà¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥:</span>
                          <span className="font-semibold text-slate-800 text-xs block">
                            {activeRequestObj.requester.address || 'à¹„à¸¡à¹ˆà¸£à¸°à¸šà¸¸à¸—à¸µà¹ˆà¸­à¸¢à¸¹à¹ˆ'}
                          </span>
                        </div>
                      </div>

                      {/* If Representative */}
                      {activeRequestObj.requesterType === 'representative' && activeRequestObj.representative && (
                        <div className="mt-3 p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-2">
                          <span className="font-bold text-amber-900 block flex items-center gap-1.5 text-xs">
                            <UserCheck className="h-4 w-4 text-amber-700 shrink-0" />
                            <span>à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸œà¸¹à¹‰à¸£à¸±à¸šà¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆà¸à¸£à¸°à¸—à¸³à¸à¸²à¸£à¹à¸—à¸™ (Authorized Representative):</span>
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-amber-950 pt-1">
                            <div><span className="text-amber-800 font-semibold">à¸œà¸¹à¹‰à¹à¸—à¸™:</span> <strong>{activeRequestObj.representative.firstName} {activeRequestObj.representative.lastName}</strong></div>
                            <div><span className="text-amber-800 font-semibold">à¹€à¸¥à¸‚à¸šà¸±à¸•à¸£à¸œà¸¹à¹‰à¹à¸—à¸™:</span> <span className="font-mono font-bold">{activeRequestObj.representative.idNumber}</span></div>
                            <div><span className="text-amber-800 font-semibold">à¸•à¸´à¸”à¸•à¹ˆà¸­:</span> {activeRequestObj.representative.email} ({activeRequestObj.representative.phone})</div>
                            <div className="md:col-span-3 bg-white/80 p-2 rounded border border-amber-200">
                              <span className="text-amber-800 font-semibold block">à¸‚à¸­à¸šà¹€à¸‚à¸•à¸­à¸³à¸™à¸²à¸ˆà¸à¸£à¸°à¸—à¸³à¸à¸²à¸£à¹à¸—à¸™:</span>
                              <p className="text-slate-800 font-medium">{activeRequestObj.representative.scopeOfAuthority}</p>
                              <span className="text-[10px] text-slate-400 block mt-0.5">à¸£à¸°à¸¢à¸°à¹€à¸§à¸¥à¸²à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆ: {activeRequestObj.representative.validFrom} à¸–à¸¶à¸‡ {activeRequestObj.representative.validTo}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* General Request Metadata */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 order-2">
                      <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">à¸‚à¸­à¸šà¹€à¸‚à¸•à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸—à¸µà¹ˆà¸£à¹‰à¸­à¸‡à¸‚à¸­ (Request Scope)</span>
                      
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-800">
                        {activeRequestObj.requestDetails.description}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <span className="text-slate-400 block font-semibold">à¹€à¸›à¹‰à¸²à¸«à¸¡à¸²à¸¢à¸£à¸°à¸šà¸šà¸‡à¸²à¸™à¸ªà¸·à¸šà¸„à¹‰à¸™:</span>
                          <span className="font-bold text-slate-800">
                            {activeRequestObj.requestDetails.targetSystems.join(', ') || 'à¸ªà¸·à¸šà¸„à¹‰à¸™à¸—à¸¸à¸à¸£à¸°à¸šà¸šà¸—à¸µà¹ˆà¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸šà¸¸à¸„à¸„à¸¥'}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-400 block font-semibold">à¸Šà¹ˆà¸§à¸‡à¹€à¸§à¸¥à¸²à¸‚à¹‰à¸­à¸¡à¸¹à¸¥:</span>
                          <span className="font-bold text-slate-800">
                            {activeRequestObj.requestDetails.timeframeStart ? `${convertToThaiDate(activeRequestObj.requestDetails.timeframeStart)} à¸–à¸¶à¸‡ ${convertToThaiDate(activeRequestObj.requestDetails.timeframeEnd)}` : 'à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”à¸—à¸µà¹ˆà¸¡à¸µà¸›à¸£à¸°à¸§à¸±à¸•à¸´'}
                          </span>
                        </div>
                      </div>

                      {/* Attachments Section */}
                      <div className="space-y-2">
                        <span className="text-slate-400 text-xs font-semibold block">à¹€à¸­à¸à¸ªà¸²à¸£à¸›à¸£à¸°à¸à¸­à¸šà¸à¸²à¸£à¸¢à¸·à¹ˆà¸™à¸ªà¸´à¸—à¸˜à¸´à¹Œ:</span>
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
                                    addAuditLog('VIEW_FILE', `à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¹€à¸›à¸´à¸”à¸”à¸¹à¹€à¸­à¸à¸ªà¸²à¸£à¸›à¸£à¸°à¸à¸­à¸š: ${att.name}`, activeUser, activeRequestObj.id, activeRequestObj.trackingNo);
                                    setPreviewAttachment(att);
                                  }}
                                  className="bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold px-2.5 py-1 rounded transition text-[11px] flex items-center gap-1 border border-brand-200"
                                >
                                  <Search className="h-3 w-3" />
                                  <span>à¸”à¸¹à¹„à¸Ÿà¸¥à¹Œà¹€à¸­à¸à¸ªà¸²à¸£</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Module A: Identity & Completeness verification (INTAKE ROLE) */}
                    {['intake', 'admin'].includes(activeUser.role) && (() => {
                      const isIntakeActive = ['Submitted', 'Received', 'Identity Verification', 'Awaiting Identity Evidence', 'Completeness Review', 'Awaiting Additional Information'].includes(activeRequestObj.status);
                      return (
                        <div className={`bg-white border ${isIntakeActive ? 'border-slate-200' : 'border-slate-100 opacity-80'} rounded-xl p-5 shadow-sm space-y-4 order-3`}>
                          <div className="flex flex-wrap justify-between items-center gap-2">
                            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <UserCheck className="h-4 w-4 text-brand-600" />
                              <span>à¸à¸²à¸£à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹à¸¥à¸°à¸ªà¸´à¸—à¸˜à¸´à¸¢à¸·à¹ˆà¸™à¹€à¸£à¸·à¹ˆà¸­à¸‡ (Intake Verification & Completeness)</span>
                            </span>
                            <CitizenRequestForm request={activeRequestObj} orgData={organizations?.find((o: any) => o.id === activeRequestObj.orgId) || { nameTh: 'à¸«à¸™à¹ˆà¸§à¸¢à¸‡à¸²à¸™à¸œà¸¹à¹‰à¸£à¸±à¸šà¸„à¸³à¸‚à¸­' }} />
                          </div>

                        {/* Assurance select */}
                        <div className="flex gap-4 items-center flex-wrap pb-2 border-b border-slate-100">
                          <div className="text-xs">
                            <span className="block font-semibold text-slate-500">à¸œà¸¥à¸¢à¸·à¸™à¸¢à¸±à¸™à¸•à¸™:</span>
                            <span className={`font-bold ${activeRequestObj.identityVerification.status === 'verified' ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {activeRequestObj.identityVerification.status === 'verified' ? 'à¸œà¹ˆà¸²à¸™à¸à¸²à¸£à¸¢à¸·à¸™à¸¢à¸±à¸™à¹à¸¥à¹‰à¸§' : 'à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸œà¹ˆà¸²à¸™/à¸£à¸­à¸à¸²à¸£à¸•à¸£à¸§à¸ˆ'}
                            </span>
                          </div>
                          
                          {isIntakeActive && activeRequestObj.identityVerification.status !== 'verified' && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleVerifyIdentityQuick(activeRequestObj.id, 'verified', 'medium')}
                                className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold py-1 px-3 rounded transition"
                              >
                                à¸¢à¸·à¸™à¸¢à¸±à¸™à¸œà¹ˆà¸²à¸™ (Medium Assurance)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleVerifyIdentityQuick(activeRequestObj.id, 'verified', 'high')}
                                className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold py-1 px-3 rounded transition"
                              >
                                à¸œà¹ˆà¸²à¸™ (High Assurance)
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Checklist tools */}
                        <div className="space-y-3">
                          <span className="block text-xs font-semibold text-slate-600">à¹€à¸Šà¹‡à¸„à¸¥à¸´à¸ªà¸•à¹Œà¸•à¸£à¸§à¸ˆà¹€à¸­à¸à¸ªà¸²à¸£à¸ªà¸´à¸—à¸˜à¸´à¸•à¸²à¸¡à¸›à¸£à¸°à¸à¸²à¸¨ à¸ž.à¸£.à¸š. (Section 3.4)</span>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            {[
                              { key: 'name', label: 'à¸Šà¸·à¹ˆà¸­-à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥à¸„à¸£à¸šà¸–à¹‰à¸§à¸™à¸Šà¸±à¸”à¹€à¸ˆà¸™' },
                              { key: 'contact', label: 'à¸—à¸µà¹ˆà¸­à¸¢à¸¹à¹ˆ/à¹€à¸šà¸­à¸£à¹Œà¸•à¸´à¸”à¸•à¹ˆà¸­à¸„à¸£à¸šà¸–à¹‰à¸§à¸™' },
                              { key: 'scope', label: 'à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”à¸£à¸°à¸šà¸¸à¸•à¸±à¸§à¸•à¸™à¸„à¸£à¸šà¸–à¹‰à¸§à¸™' },
                              { key: 'identity', label: 'à¸«à¸¥à¸±à¸à¸à¸²à¸™à¹à¸ªà¸”à¸‡à¸•à¸±à¸§à¸•à¸™à¸œà¹ˆà¸²à¸™à¹€à¸à¸“à¸‘à¹Œ' },
                              { key: 'signature', label: 'à¸¥à¸‡à¸™à¸²à¸¡à¸¥à¸²à¸¢à¸¡à¸·à¸­à¸Šà¸·à¹ˆà¸­à¸­à¸´à¹€à¸¥à¹‡à¸à¸—à¸£à¸­à¸™à¸´à¸à¸ªà¹Œ' },
                              { key: 'repDocs', label: 'à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆà¹à¸¥à¸°à¹€à¸­à¸à¸ªà¸²à¸£à¸›à¸£à¸°à¸à¸­à¸š (à¸–à¹‰à¸²à¸¡à¸µ)' },
                              { key: 'noticeConsent', label: 'à¸à¸²à¸£à¸£à¸±à¸šà¸—à¸£à¸²à¸šà¹€à¸‡à¸·à¹ˆà¸­à¸™à¹„à¸‚ Privacy Notice' }
                            ].map((item) => (
                              <label
                                key={item.key}
                                className={`flex items-center gap-2 p-1.5 rounded ${isIntakeActive ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={(checkItems as any)[item.key]}
                                  onChange={() => {
                                    if (isIntakeActive) handleCheckItemToggle(item.key as any);
                                  }}
                                  disabled={!isIntakeActive}
                                  className={`rounded text-brand-600 focus:ring-brand-500 ${!isIntakeActive && 'cursor-not-allowed grayscale'}`}
                                />
                                <span>{item.label}</span>
                              </label>
                            ))}
                          </div>

                          {/* Completeness submission bar */}
                          {['intake', 'admin', 'dpo'].includes(activeUser.role) && isIntakeActive && (
                            <div className="pt-4 border-t border-slate-100 flex gap-2">
                              
                              {showIncompletePanel ? (
                                <div className="w-full space-y-3 p-4 bg-amber-50 rounded-xl border border-amber-300 shadow-sm">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                                      <span>à¸£à¸°à¸šà¸¸à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”à¹€à¸­à¸à¸ªà¸²à¸£à¸«à¸¥à¸±à¸à¸à¸²à¸™à¸—à¸µà¹ˆà¸•à¹‰à¸­à¸‡à¹à¸™à¸šà¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡ (Deficiency Notice)</span>
                                    </span>
                                    <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                                      à¸«à¸¢à¸¸à¸”à¸™à¸±à¸šà¹€à¸§à¸¥à¸² SLA à¸­à¸±à¸•à¹‚à¸™à¸¡à¸±à¸•à¸´ (Pause SLA)
                                    </span>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="block text-[11px] font-semibold text-slate-700">à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”à¹€à¸­à¸à¸ªà¸²à¸£à¸—à¸µà¹ˆà¸‚à¸²à¸” / à¸‚à¹‰à¸­à¸šà¸à¸žà¸£à¹ˆà¸­à¸‡à¸—à¸µà¹ˆà¸•à¹‰à¸­à¸‡à¹à¸à¹‰à¹„à¸‚:</label>
                                    <textarea
                                      required
                                      rows={2}
                                      value={incompleteComment}
                                      onChange={(e) => setIncompleteComment(e.target.value)}
                                      placeholder="à¸•à¸±à¸§à¸­à¸¢à¹ˆà¸²à¸‡: à¹„à¸¡à¹ˆà¸žà¸šà¸à¸²à¸£à¹à¸™à¸šà¸ªà¸³à¹€à¸™à¸²à¸šà¸±à¸•à¸£à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™ à¸à¸£à¸¸à¸“à¸²à¸–à¹ˆà¸²à¸¢à¸£à¸¹à¸›à¸ à¸²à¸žà¸šà¸±à¸•à¸£à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™à¸—à¸µà¹ˆà¸›à¸´à¸”à¸šà¸±à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸¨à¸²à¸ªà¸™à¸²à¹à¸¥à¸°à¹à¸™à¸šà¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡..."
                                      className="w-full text-xs border border-amber-300 rounded-lg p-2.5 bg-white focus:ring-1 focus:ring-amber-500"
                                    />
                                  </div>

                                  <div className="flex items-center justify-between gap-4 flex-wrap pt-1">
                                    <div className="text-[11px] text-amber-800 font-medium">
                                      â±ï¸ à¹ƒà¸«à¹‰à¸£à¸°à¸¢à¸°à¹€à¸§à¸¥à¸²à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™à¹à¸à¹‰à¹„à¸‚: <strong>10 à¸§à¸±à¸™</strong> (à¸«à¸²à¸à¹€à¸à¸´à¸™à¸à¸³à¸«à¸™à¸” à¸„à¸³à¸‚à¸­à¸ˆà¸°à¸–à¸¹à¸à¸¢à¸à¹€à¸¥à¸´à¸à¸­à¸±à¸•à¹‚à¸™à¸¡à¸±à¸•à¸´)
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setShowIncompletePanel(false)}
                                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg transition"
                                      >
                                        à¸¢à¸à¹€à¸¥à¸´à¸
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => markCompletenessDeficient(activeRequestObj.id)}
                                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-1.5 px-4 rounded-lg transition shadow-sm flex items-center gap-1.5"
                                      >
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        <span>à¸ªà¹ˆà¸‡à¹à¸ˆà¹‰à¸‡à¸•à¸µà¸à¸¥à¸±à¸šà¹€à¸­à¸à¸ªà¸²à¸£ (Pause SLA)</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => markCompletenessDone(activeRequestObj.id)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition shadow-sm flex items-center gap-1.5"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>à¹€à¸­à¸à¸ªà¸²à¸£à¸„à¸£à¸šà¸–à¹‰à¸§à¸™à¹à¸¥à¹‰à¸§ (Mark Complete)</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setShowIncompletePanel(true)}
                                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition shadow-sm flex items-center gap-1.5"
                                  >
                                    <AlertTriangle className="h-4 w-4" />
                                    <span>à¸•à¸µà¸à¸¥à¸±à¸šà¸‚à¸­à¹€à¸­à¸à¸ªà¸²à¸£à¹€à¸žà¸´à¹ˆà¸¡ (Pause SLA)</span>
                                  </button>
                                </>
                              )}

                            </div>
                          )}
                        </div>
                      </div>
                      );
                    })()}

                    {/* Staff Direct Message Board with Citizen */}
                    {['intake', 'admin', 'dpo', 'owner'].includes(activeUser.role) && (
                      <div className={"bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[400px] " + (activeUser.role === 'dpo' ? 'order-5' : 'order-6')}>
                        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
                          <div>
                            <span className="block font-bold text-sm text-white flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-brand-400" />
                              <span>à¸Šà¹ˆà¸­à¸‡à¸—à¸²à¸‡à¸•à¸´à¸”à¸•à¹ˆà¸­à¹à¸¥à¸°à¸ªà¹ˆà¸‡à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡à¸«à¸²à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™à¹‚à¸”à¸¢à¸•à¸£à¸‡ (Direct Message Board)</span>
                            </span>
                            <span className="text-[10px] text-slate-300">
                              à¸à¸£à¸°à¸”à¸²à¸™à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡à¸ªà¸™à¸—à¸™à¸²à¹‚à¸•à¹‰à¸•à¸­à¸šà¹à¸šà¸šà¸šà¸±à¸™à¸—à¸¶à¸à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸±à¸šà¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­ ({activeRequestObj.requester.firstName} {activeRequestObj.requester.lastName})
                            </span>
                          </div>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">
                            â— à¸ªà¸·à¹ˆà¸­à¸ªà¸²à¸£à¸•à¸£à¸‡
                          </span>
                        </div>
                        
                        {/* Chat items */}
                        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
                          {activeRequestObj.messageThread.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-xs font-medium">
                              à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸²à¸£à¸ªà¹ˆà¸‡à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡ à¸ªà¸²à¸¡à¸²à¸£à¸–à¸žà¸´à¸¡à¸žà¹Œà¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡à¹à¸™à¸°à¸™à¸³à¸ªà¹ˆà¸‡à¸–à¸¶à¸‡à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™à¹„à¸”à¹‰à¸ˆà¸²à¸à¸Šà¹ˆà¸­à¸‡à¸”à¹‰à¸²à¸™à¸¥à¹ˆà¸²à¸‡
                            </div>
                          ) : (
                            activeRequestObj.messageThread.map((msg) => (
                              <div
                                key={msg.id}
                                className={`flex flex-col max-w-[80%] rounded-xl p-3 text-xs shadow-sm ${
                                  msg.sender === 'staff'
                                    ? 'bg-brand-600 text-white ml-auto'
                                    : 'bg-white text-slate-900 border border-slate-200 mr-auto'
                                }`}
                              >
                                <span className={`font-bold text-[10px] mb-1 ${msg.sender === 'staff' ? 'text-brand-100' : 'text-brand-700'}`}>
                                  {msg.senderName} {msg.sender === 'staff' ? '(à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆ)' : '(à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­)'}
                                </span>
                                <p className="leading-relaxed font-medium">{msg.message}</p>
                                <span className={`text-[9px] text-right mt-1.5 ${msg.sender === 'staff' ? 'text-brand-200' : 'text-slate-400'}`}>
                                  {formatThaiTimeString(msg.timestamp)}
                                </span>
                              </div>
                            ))
                          )}
                        </div>

                        <form
                          onSubmit={(e) => handleSendMessage(e, activeRequestObj.id, 'staff')}
                          className="border-t border-slate-200 p-2.5 flex gap-2 bg-white"
                        >
                          <input
                            type="text"
                            required
                            placeholder="à¸žà¸´à¸¡à¸žà¹Œà¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡à¸ªà¸·à¹ˆà¸­à¸ªà¸²à¸£à¸•à¸­à¸šà¸à¸¥à¸±à¸šà¸ªà¹ˆà¸‡à¸–à¸¶à¸‡à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­à¸—à¸µà¹ˆà¸™à¸µà¹ˆ..."
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            className="flex-1 text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                          <button
                            type="submit"
                            className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 text-xs shadow-sm"
                          >
                            <Send className="h-4 w-4" />
                            <span>à¸ªà¹ˆà¸‡à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡</span>
                          </button>
                        </form>
                      </div>
                    )}

                    {/* Close Request and Delivery management */}
                    {['intake', 'admin'].includes(activeUser.role) && activeRequestObj.status === 'Ready for Delivery' && (
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 order-last">
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">à¸ˆà¸±à¸”à¸ªà¹ˆà¸‡à¸ªà¸³à¹€à¸™à¸²à¹à¸¥à¸°à¸›à¸´à¸”à¹€à¸£à¸·à¹ˆà¸­à¸‡ (Delivery & Archive)</span>
                        <p className="text-xs text-slate-500">à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸ªà¸–à¸²à¸™à¸°à¸Šà¸³à¸£à¸°à¸„à¹ˆà¸²à¸˜à¸£à¸£à¸¡à¹€à¸™à¸µà¸¢à¸¡ (à¸–à¹‰à¸²à¸¡à¸µ) à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§ à¸à¸”à¸›à¸¸à¹ˆà¸¡à¹€à¸žà¸·à¹ˆà¸­à¸šà¸±à¸™à¸—à¸¶à¸à¸à¸²à¸£à¸ªà¹ˆà¸‡à¸¡à¸­à¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢</p>
                        
                        <button
                          onClick={() => {
                            showNotify('à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¸ˆà¸±à¸”à¸ªà¹ˆà¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹ƒà¸«à¹‰à¹€à¸ˆà¹‰à¸²à¸‚à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹à¸¥à¸°à¸›à¸´à¸”à¹€à¸£à¸·à¹ˆà¸­à¸‡à¸„à¸³à¸‚à¸­à¸™à¸µà¹‰?', 'confirm', 'à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¸ˆà¸±à¸”à¸ªà¹ˆà¸‡à¹à¸¥à¸°à¸›à¸´à¸”à¹€à¸£à¸·à¹ˆà¸­à¸‡', async () => {
                              await changeRequestStatus(getRequestClone(activeRequestObj.id), 'Closed', activeUser, 'à¸ˆà¸±à¸”à¸ªà¹ˆà¸‡à¸¡à¸­à¸šà¸¥à¸´à¸‡à¸à¹Œà¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¸­à¸¢à¹ˆà¸²à¸‡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢à¹à¸¥à¸°à¸›à¸´à¸”à¹€à¸£à¸·à¹ˆà¸­à¸‡à¸ªà¸³à¹€à¸£à¹‡à¸ˆ', config || undefined);
                              reloadData();
                              setSelectedRequestId(null);
                            });
                          }}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-3 rounded-xl transition flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="h-5 w-5" />
                          <span>à¸šà¸±à¸™à¸—à¸¶à¸à¸à¸²à¸£à¸ˆà¸±à¸”à¸ªà¹ˆà¸‡à¹à¸¥à¸°à¸›à¸´à¸”à¹€à¸£à¸·à¹ˆà¸­à¸‡à¸„à¸³à¸‚à¸­ (Close Request)</span>
                        </button>
                      </div>
                    )}

                    {/* Module B: Data Gathering Tasking (Section 3.5) */}
                    {['owner', 'admin', 'intake', 'dpo'].includes(activeUser.role) && (
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 order-4">
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Search className="h-4 w-4 text-brand-600" />
                          <span>à¸‡à¸²à¸™à¸„à¹‰à¸™à¸«à¸²à¹à¸¥à¸°à¸ªà¸·à¸šà¸„à¹‰à¸™à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸£à¸°à¸šà¸šà¸ à¸²à¸¢à¹ƒà¸™ (Data Discovery & Gathering)</span>
                        </span>

                        {/* Task assigner form for admin/DPO/owner */}
                        {['admin', 'intake', 'dpo', 'owner'].includes(activeUser.role) && ['Documents Verified', 'Assigned', 'Data Collection'].includes(activeRequestObj.status) && (
                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                            <span className="block font-bold text-slate-700 text-xs">à¸ªà¸£à¹‰à¸²à¸‡à¸‡à¸²à¸™à¸„à¹‰à¸™à¸«à¸²à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸£à¸°à¸šà¸šà¹ƒà¸«à¸¡à¹ˆ</span>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold block">à¹€à¸¥à¸·à¸­à¸à¸à¸²à¸™à¸‚à¹‰à¸­à¸¡à¸¹à¸¥:</label>
                                <select
                                  value={selectedTaskSystem}
                                  onChange={(e) => setSelectedTaskSystem(e.target.value)}
                                  className="w-full text-xs border border-slate-300 rounded p-1.5 bg-white"
                                >
                                  <option value="">-- à¹‚à¸›à¸£à¸”à¹€à¸¥à¸·à¸­à¸à¸£à¸°à¸šà¸š --</option>
                                  {activeRequestObj.requestDetails.targetSystems && activeRequestObj.requestDetails.targetSystems.length > 0 ? (
                                    activeRequestObj.requestDetails.targetSystems.map((sys, idx) => (
                                      <option key={idx} value={sys}>{sys}</option>
                                    ))
                                  ) : (
                                    <option value="à¸ªà¸·à¸šà¸„à¹‰à¸™à¸—à¸¸à¸à¸£à¸°à¸šà¸šà¸—à¸µà¹ˆà¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸šà¸¸à¸„à¸„à¸¥">à¸ªà¸·à¸šà¸„à¹‰à¸™à¸—à¸¸à¸à¸£à¸°à¸šà¸šà¸—à¸µà¹ˆà¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸šà¸¸à¸„à¸„à¸¥</option>
                                  )}
                                </select>
                              </div>
                              
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold block">à¸œà¸¹à¹‰à¸£à¸±à¸šà¸œà¸´à¸”à¸Šà¸­à¸šà¸‡à¸²à¸™:</label>
                                <select
                                  value={taskAssignee}
                                  onChange={(e) => setTaskAssignee(e.target.value)}
                                  className="w-full text-xs border border-slate-300 rounded p-1.5 bg-white"
                                >
                                  <option value="">-- à¹€à¸¥à¸·à¸­à¸à¸œà¸¹à¹‰à¸£à¸±à¸šà¸œà¸´à¸”à¸Šà¸­à¸š --</option>
                                  {backendUsers
                                    .filter(u => u.orgId === currentViewOrgId)
                                    .map(u => (
                                      <option key={u.id} value={u.fullNameTh}>{u.fullNameTh} ({(u.roles && u.roles.length > 0 ? u.roles : [u.role]).join(', ')})</option>
                                    ))}
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
                                <span>à¸¡à¸­à¸šà¸«à¸¡à¸²à¸¢à¸ªà¸·à¸šà¸„à¹‰à¸™</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Discovery Tasks list */}
                        <div className="space-y-3 pt-2">
                          <span className="block text-xs font-semibold text-slate-600">à¸£à¸²à¸¢à¸à¸²à¸£à¸ à¸²à¸£à¸à¸´à¸ˆà¸—à¸µà¹ˆà¸à¸³à¸¥à¸±à¸‡à¸„à¹‰à¸™à¸«à¸²:</span>
                          {activeRequestObj.dataCollectionTasks.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                              à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸¡à¸­à¸šà¸«à¸¡à¸²à¸¢à¸ à¸²à¸£à¸à¸´à¸ˆà¸£à¸°à¸šà¸šà¸ªà¸·à¸šà¸„à¹‰à¸™à¹ƒà¸™à¸„à¸³à¸£à¹‰à¸­à¸‡à¸™à¸µà¹‰
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {activeRequestObj.dataCollectionTasks.map((t) => (
                                <div key={t.id} className="border border-slate-200 rounded-lg p-3 space-y-2 text-xs bg-white">
                                  <div className="flex justify-between items-center flex-wrap gap-2">
                                    <div className="flex flex-col gap-0.5 max-w-[200px]">
                                      <span className="font-bold text-slate-800">{t.systemName}</span>
                                      <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                                        à¸œà¸¹à¹‰à¸£à¸±à¸šà¸œà¸´à¸”à¸Šà¸­à¸š: {t.assignee}
                                        {['admin', 'dpo', 'owner'].includes(activeUser.role) && activeRequestObj.status === 'Data Collection' && (
                                          <button
                                            type="button"
                                            onClick={() => handleUnassignTask(activeRequestObj.id, t.id)}
                                            className="text-rose-500 hover:text-rose-700 underline text-[9px]"
                                          >
                                            (à¸¢à¸à¹€à¸¥à¸´à¸à¸à¸²à¸£à¸¡à¸­à¸šà¸«à¸¡à¸²à¸¢)
                                          </button>
                                        )}
                                      </span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      t.status === 'found' ? 'bg-emerald-100 text-emerald-800' :
                                      t.status === 'not_found' ? 'bg-rose-100 text-rose-800' :
                                      t.status === 'in_progress' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                                      'bg-slate-100 text-slate-500'
                                    }`}>
                                      {t.status === 'found' ? 'à¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥' : t.status === 'not_found' ? 'à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥' : t.status === 'in_progress' ? 'à¸à¸³à¸¥à¸±à¸‡à¸ªà¸·à¸šà¸„à¹‰à¸™' : 'à¸£à¸­à¸à¸²à¸£à¸”à¸³à¹€à¸™à¸´à¸™à¸‡à¸²à¸™'}
                                    </span>
                                  </div>

                                  <div className="text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded font-mono break-all">
                                    à¸„à¸³à¸ªà¸·à¸šà¸„à¹‰à¸™: {t.queryUsed}
                                  </div>

                                  {/* Lineage documentation (Section 3.5) */}
                                  {t.dataLineage && (
                                    <div className="text-[9px] text-slate-400 font-bold block">
                                      Lineage: {t.dataLineage}
                                    </div>
                                  )}

                                  {/* Upload Section (Always visible for owner/admin in Data Collection state) */}
                                  {(activeUser.role === 'owner' || activeUser.role === 'admin') && activeRequestObj.status === 'Data Collection' && (
                                    <div className="mt-2 mb-2 flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-200">
                                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                        <Plus className="h-3 w-3 text-emerald-600" />
                                        <span>à¹à¸™à¸šà¹„à¸Ÿà¸¥à¹Œà¹€à¸­à¸à¸ªà¸²à¸£à¸ªà¸³à¸«à¸£à¸±à¸šà¸‡à¸²à¸™à¸ªà¸·à¸šà¸„à¹‰à¸™à¸™à¸µà¹‰ (PDF)</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {t.status === 'pending' && (
                                          <button
                                            type="button"
                                            onClick={() => handleMarkTaskNotFound(activeRequestObj.id, t.id)}
                                            className="bg-rose-100 hover:bg-rose-200 text-rose-700 text-[10px] font-bold py-1 px-3 rounded shadow-sm transition cursor-pointer"
                                          >
                                            à¹à¸ˆà¹‰à¸‡à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => document.getElementById(`upload-task-${t.id}`)?.click()}
                                          className="bg-slate-700 hover:bg-slate-800 text-white text-[10px] font-bold py-1 px-3 rounded shadow-sm transition cursor-pointer"
                                        >
                                          à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¹€à¸­à¸à¸ªà¸²à¸£
                                        </button>
                                      </div>
                                      <input 
                                        type="file" 
                                        id={`upload-task-${t.id}`}
                                        style={{ display: 'none' }} 
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => handleTaskFileUpload(activeRequestObj.id, t.id, e.target.files)}
                                      />
                                    </div>
                                  )}

                                  {/* Uploaded Files List */}
                                  {(t.uploadedFiles && t.uploadedFiles.length > 0) && (
                                    <div className="flex flex-col gap-1.5 mt-1">
                                      {t.uploadedFiles
                                        .filter((f: any) => !f.isDeleted || activeUser.role === 'superadmin')
                                        .map((f: any, idx: number) => (
                                        <div key={idx} className={`flex justify-between items-center p-1.5 rounded border ${f.isDeleted ? 'bg-rose-50 border-rose-100 opacity-70' : 'bg-emerald-50 border-emerald-100'}`}>
                                          <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 font-bold">
                                            <FileBadge className={`h-3.5 w-3.5 ${f.isDeleted ? 'text-rose-600' : 'text-emerald-600'}`} />
                                            <span className={`truncate max-w-[120px] ${f.isDeleted ? 'line-through text-rose-700' : ''}`} title={f.name}>
                                              {f.name} {f.isDeleted && '(Deleted)'}
                                            </span>
                                          </div>
                                          <div className="flex gap-1">
                                            {(!f.isDeleted && ['admin', 'dpo', 'owner'].includes(activeUser?.role || '')) && (
                                              <button
                                                type="button"
                                                onClick={() => handleTaskFileReview(activeRequestObj.id, t.id, f)}
                                                className="bg-white border border-blue-300 text-blue-700 text-[9px] font-bold py-0.5 px-2 rounded hover:bg-blue-100 transition"
                                              >
                                                à¸”à¸¹à¹€à¸­à¸à¸ªà¸²à¸£
                                              </button>
                                            )}
                                            {(!f.isDeleted && (activeUser.role === 'owner' || activeUser.role === 'admin') && activeRequestObj.status === 'Data Collection') && (
                                              <button
                                                type="button"
                                                onClick={() => handleTaskFileDelete(activeRequestObj.id, t.id, f.id)}
                                                className="bg-white border border-rose-300 text-rose-600 p-0.5 rounded hover:bg-rose-50 transition"
                                                title="à¸¥à¸šà¹„à¸Ÿà¸¥à¹Œà¸™à¸µà¹‰"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  </div>
                                ))}
                              
                              {/* System Owner action buttons - Moved to bottom */}
                              {['Submitted', 'Assigned', 'Documents Verified', 'Data Collection'].includes(activeRequestObj.status) && activeRequestObj.dataCollectionTasks.length > 0 && activeRequestObj.dataCollectionTasks.every((t: any) => t.status !== 'pending') && (activeUser.role === 'owner' || activeUser.role === 'admin') && (
                                <div className="flex flex-col gap-2 mt-6">
                                  {!activeRequestObj.dataCollectionTasks.some((t: any) => t.status === 'not_found') ? (
                                    <button
                                      type="button"
                                      onClick={() => handleOwnerCompleteFlow(activeRequestObj.id)}
                                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 px-4 rounded-lg shadow-sm transition"
                                    >
                                      à¸ªà¹ˆà¸‡à¹€à¸£à¸·à¹ˆà¸­à¸‡à¹„à¸›à¸¢à¸±à¸‡ Flow à¸•à¹ˆà¸­à¹„à¸›
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOwnerEscalateFlow(activeRequestObj.id)}
                                      className="w-full bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold py-2.5 px-4 rounded-lg shadow-sm transition"
                                    >
                                      à¹à¸ˆà¹‰à¸‡à¸§à¹ˆà¸²à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹à¸¥à¸°à¸ªà¹ˆà¸‡à¹€à¸£à¸·à¹ˆà¸­à¸‡à¹„à¸›à¸¢à¸±à¸‡à¸œà¸¹à¹‰à¸šà¸£à¸´à¸«à¸²à¸£
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Module C: Document Redaction Panel (DPO/LEGAL ROLE) */}
                    {['dpo', 'admin'].includes(activeUser.role) && (
                      <div className={"space-y-4 " + (activeUser.role === 'dpo' ? 'order-3' : 'order-5')}>
                        <RedactionCanvas
                          request={activeRequestObj}
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
                          <span>à¸à¸²à¸£à¸ˆà¸±à¸”à¸à¸²à¸£à¸„à¹ˆà¸²à¸˜à¸£à¸£à¸¡à¹€à¸™à¸µà¸¢à¸¡à¸ªà¸´à¸—à¸˜à¸´ (Fee Management)</span>
                        </span>

                        <form onSubmit={(e) => handleFeeSubmit(e, activeRequestObj.id)} className="space-y-3">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                            <input
                              type="checkbox"
                              checked={feeForm.noFee}
                              onChange={(e) => setFeeForm({ ...feeForm, noFee: e.target.checked })}
                              className="rounded text-brand-600 focus:ring-brand-500"
                            />
                            <span>à¸‚à¸­à¸¢à¸à¹€à¸§à¹‰à¸™à¸„à¹ˆà¸²à¸˜à¸£à¸£à¸¡à¹€à¸™à¸µà¸¢à¸¡à¹ƒà¸«à¹‰à¸„à¸³à¸‚à¸­à¸£à¹‰à¸­à¸‡à¸™à¸µà¹‰</span>
                          </label>

                          {!feeForm.noFee && (
                            <div className="space-y-2.5 pt-1 border-t border-slate-100 text-xs">
                              <div className="flex justify-between items-center">
                                <span>à¸„à¸±à¸”à¸ªà¸³à¹€à¸™à¸²à¸à¸£à¸°à¸”à¸²à¸© A4 (à¹à¸œà¹ˆà¸™à¸¥à¸° {config?.feeRates.paperCopyRate} à¸š.):</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={feeForm.paperPages}
                                  onChange={(e) => setFeeForm({ ...feeForm, paperPages: parseInt(e.target.value) || 0 })}
                                  className="w-16 border rounded p-1 text-center"
                                />
                              </div>
                              
                              <div className="flex justify-between items-center">
                                <span>à¸ªà¸±à¹ˆà¸‡à¸žà¸´à¸¡à¸žà¹Œà¸„à¸­à¸¡à¸žà¸´à¸§à¹€à¸•à¸­à¸£à¹Œ A4 (à¹à¸œà¹ˆà¸™à¸¥à¸° {config?.feeRates.computerPrintRate} à¸š.):</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={feeForm.computerPages}
                                  onChange={(e) => setFeeForm({ ...feeForm, computerPages: parseInt(e.target.value) || 0 })}
                                  className="w-16 border rounded p-1 text-center"
                                />
                              </div>

                              <div className="flex justify-between items-center">
                                <span>à¸£à¸±à¸šà¸£à¸­à¸‡à¸ªà¸³à¹€à¸™à¸²à¸–à¸¹à¸à¸•à¹‰à¸­à¸‡ (à¸Šà¸¸à¸”à¸¥à¸° {config?.feeRates.certificationRate} à¸š.):</span>
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
                                  placeholder="à¸„à¹ˆà¸²à¸ªà¹ˆà¸‡ / à¸„à¹ˆà¸²à¹à¸£à¸‡à¸žà¸´à¹€à¸¨à¸©"
                                  value={feeForm.otherItem}
                                  onChange={(e) => setFeeForm({ ...feeForm, otherItem: e.target.value })}
                                  className="border rounded p-1 text-xs"
                                />
                                <input
                                  type="number"
                                  placeholder="à¸šà¸²à¸—"
                                  value={feeForm.otherCost || ''}
                                  onChange={(e) => setFeeForm({ ...feeForm, otherCost: parseInt(e.target.value) || 0 })}
                                  className="border rounded p-1 text-xs text-center"
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-2 font-bold text-xs text-slate-800">
                            <span>à¸„à¸³à¸™à¸§à¸“à¸£à¸²à¸„à¸²à¸ªà¸¸à¸—à¸˜à¸´:</span>
                            <span className="text-sm text-brand-600">
                              {feeForm.noFee ? 0 : (
                                feeForm.paperPages * (config?.feeRates.paperCopyRate || 1.0) +
                                feeForm.computerPages * (config?.feeRates.computerPrintRate || 3.0) +
                                feeForm.certifications * (config?.feeRates.certificationRate || 5.0) +
                                feeForm.otherCost
                              )} à¸šà¸²à¸—
                            </span>
                          </div>

                          <button
                            type="submit"
                            className={`w-full font-bold py-2 rounded-lg text-xs transition ${
                              activeRequestObj.feeCalculation?.isApproved
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                : 'bg-brand-600 hover:bg-brand-700 text-white'
                            }`}
                          >
                            {activeRequestObj.feeCalculation?.isApproved ? 'âœ“ à¸›à¸£à¸°à¹€à¸¡à¸´à¸™à¸£à¸²à¸„à¸²à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢ (à¸šà¸±à¸™à¸—à¸¶à¸à¹ƒà¸«à¸¡à¹ˆ)' : 'à¸šà¸±à¸™à¸—à¸¶à¸à¸à¸²à¸£à¸›à¸£à¸°à¹€à¸¡à¸´à¸™à¸£à¸²à¸„à¸²'}
                          </button>
                        </form>

                        {/* Payment verification action (Section 3.8) */}
                        {activeRequestObj.feeCalculation.totalCalculated > 0 && (
                          <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                            <div className="flex justify-between text-xs text-slate-600">
                              <span>à¸ªà¸–à¸²à¸™à¸°à¸Šà¸³à¸£à¸°à¹€à¸‡à¸´à¸™:</span>
                              <span className={`font-bold ${activeRequestObj.feeCalculation.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600 animate-pulse'}`}>
                                {activeRequestObj.feeCalculation.paymentStatus === 'paid' ? 'à¸Šà¸³à¸£à¸°à¹à¸¥à¸°à¸­à¸­à¸à¸šà¸´à¸¥à¹à¸¥à¹‰à¸§' : 'à¸£à¸­à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¹‚à¸­à¸™'}
                              </span>
                            </div>
                            
                            {activeRequestObj.feeCalculation.paymentStatus !== 'paid' && (
                              <button
                                type="button"
                                onClick={() => handleMarkAsPaid(activeRequestObj.id)}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded text-xs font-semibold transition"
                              >
                                âœ“ à¸¢à¸·à¸™à¸¢à¸±à¸™à¸ªà¸¥à¸´à¸›à¹‚à¸­à¸™à¹€à¸‡à¸´à¸™ (Mark Paid)
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Module D.5: à¸•à¸±à¸§à¸­à¸¢à¹ˆà¸²à¸‡à¹€à¸­à¸à¸ªà¸²à¸£à¸ªà¹ˆà¸‡à¸­à¸­à¸ (Final Delivery Preview) */}
                    {['dpo', 'admin', 'approver'].includes(activeUser.role) && (
                      <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="h-12 w-12 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center mb-2">
                            <FileCheck2 className="h-6 w-6" />
                          </div>
                          <span className="block text-sm font-bold text-slate-700">
                            {['Ready for Delivery', 'Delivered', 'Closed'].includes(activeRequestObj.status) ? 'à¹€à¸­à¸à¸ªà¸²à¸£à¸ªà¹ˆà¸‡à¸¡à¸­à¸š (Delivery Package)' : 'à¸ˆà¸³à¸¥à¸­à¸‡à¹€à¸­à¸à¸ªà¸²à¸£à¸ªà¹ˆà¸‡à¸­à¸­à¸à¸‰à¸šà¸±à¸šà¸£à¹ˆà¸²à¸‡ (Draft Preview)'}
                          </span>
                          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                            {['Ready for Delivery', 'Delivered', 'Closed'].includes(activeRequestObj.status) 
                              ? 'à¹€à¸›à¸´à¸”à¸”à¸¹à¹à¸¥à¸°à¸žà¸´à¸¡à¸žà¹Œà¹€à¸­à¸à¸ªà¸²à¸£à¸‰à¸šà¸±à¸šà¸ªà¸¡à¸šà¸¹à¸£à¸“à¹Œà¸—à¸µà¹ˆà¸žà¸£à¹‰à¸­à¸¡à¸ªà¹ˆà¸‡à¸¡à¸­à¸šà¹ƒà¸«à¹‰à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸£à¹‰à¸­à¸‡'
                              : activeUser.role === 'approver' 
                                ? 'à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¹€à¸™à¸·à¹‰à¸­à¸«à¸²à¸ˆà¸”à¸«à¸¡à¸²à¸¢à¸‰à¸šà¸±à¸šà¸£à¹ˆà¸²à¸‡à¸—à¸µà¹ˆà¸œà¹ˆà¸²à¸™à¸à¸²à¸£à¸£à¹ˆà¸²à¸‡à¹‚à¸”à¸¢ DPO à¸à¹ˆà¸­à¸™à¸à¸”à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´'
                                : 'à¸žà¸£à¸µà¸§à¸´à¸§à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸„à¸§à¸²à¸¡à¸–à¸¹à¸à¸•à¹‰à¸­à¸‡à¸‚à¸­à¸‡à¹€à¸™à¸·à¹‰à¸­à¸«à¸²à¹ƒà¸™à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸£à¸²à¸Šà¸à¸²à¸£à¸—à¸µà¹ˆà¸ˆà¸°à¸–à¸¹à¸à¸ªà¸£à¹‰à¸²à¸‡à¸‚à¸¶à¹‰à¸™ (à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡à¸ˆà¸°à¸ªà¸­à¸”à¸„à¸¥à¹‰à¸­à¸‡à¸à¸±à¸šà¸œà¸¥à¸§à¸´à¸™à¸´à¸ˆà¸‰à¸±à¸¢à¸—à¸µà¹ˆà¸„à¸¸à¸“à¸à¸³à¸¥à¸±à¸‡à¹€à¸¥à¸·à¸­à¸à¸­à¸¢à¸¹à¹ˆ)'}
                          </p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
                          <button
                            type="button"
                            onClick={() => setShowDeliveryPreview(true)}
                            className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 px-6 rounded-lg text-xs transition shadow-md w-full sm:w-auto inline-flex items-center justify-center gap-2"
                          >
                            <FileCheck2 className="h-4 w-4" />
                            {['Ready for Delivery', 'Delivered', 'Closed'].includes(activeRequestObj.status) ? 'à¹€à¸›à¸´à¸”à¹€à¸­à¸à¸ªà¸²à¸£à¸ªà¹ˆà¸‡à¸¡à¸­à¸š' : 'à¸ˆà¸³à¸¥à¸­à¸‡à¸«à¸™à¹‰à¸²à¸•à¸²à¹€à¸­à¸à¸ªà¸²à¸£à¸ªà¹ˆà¸‡à¸¡à¸­à¸š'}
                          </button>
                          
                          {['Ready for Delivery', 'Delivered', 'Closed'].includes(activeRequestObj.status) && activeRequestObj.downloadExpiresAt && activeUser.role === 'admin' && (
                            <button
                              type="button"
                              onClick={() => {
                                showNotify('à¸„à¸¸à¸“à¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¸•à¹ˆà¸­à¸­à¸²à¸¢à¸¸à¸à¸²à¸£à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¹€à¸­à¸à¸ªà¸²à¸£à¸­à¸µà¸ 30 à¸§à¸±à¸™à¸«à¸£à¸·à¸­à¹„à¸¡à¹ˆ? (à¸ªà¸¹à¸‡à¸ªà¸¸à¸”à¹„à¸¡à¹ˆà¹€à¸à¸´à¸™ 1 à¸›à¸µà¸ˆà¸²à¸à¸§à¸±à¸™à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´)', 'confirm', 'à¸¢à¸·à¸™à¸¢à¸±à¸™à¸•à¹ˆà¸­à¸­à¸²à¸¢à¸¸à¸à¸²à¸£à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”', () => {
                                  handleExtendDownloadExpiration(activeRequestObj.id);
                                });
                              }}
                              className="bg-white hover:bg-slate-50 text-brand-600 border border-brand-200 font-bold py-2.5 px-4 rounded-lg text-xs transition shadow-sm w-full sm:w-auto inline-flex items-center justify-center gap-2"
                            >
                              <Clock className="h-4 w-4" />
                              à¸•à¹ˆà¸­à¸­à¸²à¸¢à¸¸ (à¸«à¸¡à¸”à¸­à¸²à¸¢à¸¸ {new Date(activeRequestObj.downloadExpiresAt).toLocaleDateString('th-TH')})
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Module E: Double-Signed Decision maker (Section 3.7) */}
                    {['dpo', 'approver', 'admin'].includes(activeUser.role) && (
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Scale className="h-4.5 w-4.5 text-brand-600" />
                          <span>à¸à¸²à¸£à¸§à¸´à¸™à¸´à¸ˆà¸‰à¸±à¸¢à¹à¸¥à¸°à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸ªà¸´à¸—à¸˜à¸´à¹Œ (Decision Maker)</span>
                        </span>

                        {/* DPO input form */}
                        {(activeUser.role === 'dpo' || activeUser.role === 'admin') && !(activeRequestObj.decision?.approvedAt || ['Approval Pending', 'Ready for Delivery', 'Fee Notification', 'Delivered', 'Closed'].includes(activeRequestObj.status)) ? (
                          <div className="space-y-3 text-xs">
                            <div className="space-y-1">
                              <label className="font-semibold text-slate-700">à¸œà¸¥à¸§à¸´à¸™à¸´à¸ˆà¸‰à¸±à¸¢à¸‚à¹‰à¸­à¹€à¸ªà¸™à¸­à¸ªà¸´à¸—à¸˜à¸´à¹Œ:</label>
                              <select
                                value={decisionType}
                                onChange={(e) => setDecisionType(e.target.value as any)}
                                className="w-full border rounded p-1.5 bg-white"
                              >
                                <option value="approved">à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸„à¸³à¸‚à¸­à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸” (Approve All)</option>
                                <option value="partially_approved">à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸šà¸²à¸‡à¸ªà¹ˆà¸§à¸™ / à¸–à¸¡à¸”à¸³ (Partial)</option>
                                <option value="denied">à¸›à¸à¸´à¹€à¸ªà¸˜à¸ªà¸´à¸—à¸˜à¸´à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸” (Deny Request)</option>
                                <option value="no_data">à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸œà¸¹à¹‰à¸‚à¸­à¹ƒà¸™à¸£à¸°à¸šà¸š (No Data)</option>
                              </select>
                            </div>

                            {decisionType === 'denied' && (
                              <div className="space-y-1">
                                <label className="font-semibold text-slate-700 text-red-700">à¸‚à¹‰à¸­à¸¢à¸à¹€à¸§à¹‰à¸™à¸›à¸à¸´à¹€à¸ªà¸˜à¸¡à¸²à¸•à¸£à¸² 30:</label>
                                <select
                                  value={denialBasisCode}
                                  onChange={(e) => setDenialBasisCode(e.target.value)}
                                  required
                                  className="w-full border border-red-300 rounded p-1.5 bg-white text-red-900"
                                >
                                  <option value="">-- à¸£à¸°à¸šà¸¸à¸‚à¹‰à¸­à¸¢à¸à¹€à¸§à¹‰à¸™à¸à¸Žà¸«à¸¡à¸²à¸¢ --</option>
                                  {config?.rejectionReasons.map(r => (
                                    <option key={r.code} value={r.code}>{r.labelTh}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <div className="space-y-1">
                              <label className="font-semibold text-slate-700">à¸à¸²à¸™à¸­à¹‰à¸²à¸‡à¸­à¸´à¸‡à¸à¸Žà¸«à¸¡à¸²à¸¢ (Legal Basis):</label>
                              <input
                                type="text"
                                value={legalBasisInput}
                                onChange={(e) => setLegalBasisInput(e.target.value)}
                                className="w-full border rounded p-1.5 bg-white font-semibold"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="font-semibold text-slate-700">à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¹€à¸ªà¸™à¸­à¸‚à¸­à¸‡ DPO:</label>
                              <textarea
                                rows={2}
                                value={decisionNotes}
                                onChange={(e) => setDecisionNotes(e.target.value)}
                                placeholder="à¸šà¸±à¸™à¸—à¸¶à¸à¸„à¸§à¸²à¸¡à¸„à¸´à¸”à¹€à¸«à¹‡à¸™à¸•à¸²à¸¡ à¸ž.à¸£.à¸š. à¸„à¸¸à¹‰à¸¡à¸„à¸£à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸‡à¸œà¸¹à¹‰à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´..."
                                className="w-full border rounded p-1.5 bg-white"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSubmitDecisionProposal(activeRequestObj.id)}
                              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 rounded-lg text-xs transition"
                            >
                              à¸ªà¹ˆà¸‡à¸‚à¸­à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸‚à¹‰à¸­à¸§à¸´à¸™à¸´à¸ˆà¸‰à¸±à¸¢ (Submit Proposal)
                            </button>
                          </div>
                        ) : null}

                        {/* Executive Approver action & DPO Read-only view */}
                        {(activeUser.role === 'approver' || ((activeUser.role === 'dpo' || activeUser.role === 'admin') && ['Approval Pending', 'Ready for Delivery', 'Fee Notification', 'Delivered', 'Closed'].includes(activeRequestObj.status))) ? (
                          <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg space-y-3 text-xs text-teal-900">
                            <span className="block font-bold">à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸à¸²à¸£à¸§à¸´à¸™à¸´à¸ˆà¸‰à¸±à¸¢à¹à¸¥à¸°à¸žà¸´à¸ˆà¸²à¸£à¸“à¸²à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´:</span>
                            
                            {activeRequestObj.decision ? (
                              <div className="space-y-2">
                                <p className="text-[11px] leading-relaxed">
                                  <strong>DPO à¹€à¸ªà¸™à¸­à¸§à¸´à¸™à¸´à¸ˆà¸‰à¸±à¸¢:</strong> {activeRequestObj.decision.result.toUpperCase()} <br />
                                  <strong>à¸šà¸±à¸™à¸—à¸¶à¸à¸„à¸§à¸²à¸¡à¹€à¸«à¹‡à¸™:</strong> {activeRequestObj.decision.dpoRecommendation || '-'}
                                </p>
                                
                                {activeRequestObj.decision.approvedAt || ['Ready for Delivery', 'Fee Notification', 'Delivered', 'Closed'].includes(activeRequestObj.status) ? (
                                  <div className="p-2 bg-emerald-100 text-emerald-800 text-xs rounded border border-emerald-200 mt-2">
                                    <span className="font-bold flex items-center gap-1">âœ… à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¹à¸¥à¹‰à¸§</span>
                                    à¹‚à¸”à¸¢ {activeRequestObj.decision.approverName || 'à¸œà¸¹à¹‰à¸¡à¸µà¸­à¸³à¸™à¸²à¸ˆà¸¥à¸‡à¸™à¸²à¸¡'} à¹€à¸¡à¸·à¹ˆà¸­ {activeRequestObj.decision.approvedAt ? new Date(activeRequestObj.decision.approvedAt).toLocaleDateString('th-TH') : new Date().toLocaleDateString('th-TH')}
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 gap-2 pt-1">
                                    {activeUser.role === 'approver' ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleApproverSign(activeRequestObj.id, activeRequestObj.decision?.result === 'approved' ? 'Approved' : activeRequestObj.decision?.result === 'partially_approved' ? 'Partially Approved' : 'Denied')}
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-2 rounded transition"
                                        >
                                          à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸•à¸²à¸¡à¹€à¸ªà¸™à¸­
                                        </button>
                                        <button
                                          type="button"
                                          onClick={async () => await changeRequestStatus(getRequestClone(activeRequestObj.id), 'DPO or Legal Review', activeUser, 'à¸ªà¹ˆà¸‡à¸à¸¥à¸±à¸šà¹à¸à¹‰à¹„à¸‚à¸„à¸§à¸²à¸¡à¹€à¸«à¹‡à¸™à¸žà¸´à¸ˆà¸²à¸£à¸“à¸²à¸à¸Žà¸«à¸¡à¸²à¸¢', config || undefined)}
                                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-1.5 px-2 rounded transition"
                                        >
                                          à¸ªà¹ˆà¸‡à¸à¸¥à¸±à¸šà¹à¸à¹‰à¹„à¸‚
                                        </button>
                                      </>
                                    ) : (
                                      <div className="col-span-2 text-center text-amber-700 font-semibold p-2 bg-amber-50 rounded border border-amber-200">
                                        â³ à¸£à¸­à¸œà¸¹à¹‰à¸¡à¸µà¸­à¸³à¸™à¸²à¸ˆà¸¥à¸‡à¸™à¸²à¸¡ (Four-eyes Approval)
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-[11px] text-teal-800">
                                à¸£à¸­à¸¢à¸·à¹ˆà¸™à¸§à¸´à¸™à¸´à¸ˆà¸‰à¸±à¸¢à¸—à¸²à¸‡à¸à¸Žà¸«à¸¡à¸²à¸¢à¹à¸¥à¸°à¸‚à¹‰à¸­à¹€à¸ªà¸™à¸­à¸‚à¸­à¸‡ DPO / à¸ªà¸³à¸™à¸±à¸à¸à¸Žà¸«à¸¡à¸²à¸¢ à¸à¹ˆà¸­à¸™à¸¥à¸‡à¸™à¸²à¸¡à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸ªà¸´à¸—à¸˜à¸´à¹Œ
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
                            (temp.id === 'temp_more_info' && activeRequestObj.status === 'Awaiting Additional Information') ||
                            (temp.id === 'temp_ack' && activeRequestObj.status === 'Received');

                          if (!isMatch) return null;

                          return (
                            <ThaiLetterView
                              key={temp.id}
                              request={activeRequestObj}
                              template={temp}
                              signer={activeUser}
                              orgData={organizations.find((o: any) => o.id === activeRequestObj.orgId) || null}
                            />
                          );
                        })}
                      </div>
                    )}

                    {/* Close Request and Delivery management */}
                    {['intake', 'admin'].includes(activeUser.role) && activeRequestObj.status === 'Ready for Delivery' && (
                      <div className="no-print bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">à¸ˆà¸±à¸”à¸ªà¹ˆà¸‡à¸ªà¸³à¹€à¸™à¸²à¹à¸¥à¸°à¸›à¸´à¸”à¹€à¸£à¸·à¹ˆà¸­à¸‡ (Delivery & Archive)</span>
                        <p className="text-xs text-slate-500">à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸ªà¸–à¸²à¸™à¸°à¸Šà¸³à¸£à¸°à¸„à¹ˆà¸²à¸˜à¸£à¸£à¸¡à¹€à¸™à¸µà¸¢à¸¡ (à¸–à¹‰à¸²à¸¡à¸µ) à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§ à¸à¸”à¸›à¸¸à¹ˆà¸¡à¹€à¸žà¸·à¹ˆà¸­à¸šà¸±à¸™à¸—à¸¶à¸à¸à¸²à¸£à¸ªà¹ˆà¸‡à¸¡à¸­à¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢</p>
                        
                        <button
                          type="button"
                          onClick={() => handleMarkAsDelivered(activeRequestObj.id)}
                          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 rounded-lg text-xs transition shadow-sm"
                        >
                          à¸šà¸±à¸™à¸—à¸¶à¸à¸ªà¹ˆà¸‡à¸¡à¸­à¸šà¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢ & à¸›à¸´à¸”à¹€à¸„à¸ª (Deliver & Close)
                        </button>
                      </div>
                    )}

                    {/* Closed Status & Resend Delivery Email */}
                    {['intake', 'admin'].includes(activeUser.role) && ['Closed', 'Delivered'].includes(activeRequestObj.status) && (
                      <div className="no-print bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                        <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¸›à¸´à¸”à¹€à¸£à¸·à¹ˆà¸­à¸‡à¹€à¸ªà¸£à¹‡à¸ˆà¸ªà¸¡à¸šà¸¹à¸£à¸“à¹Œ</span>
                        <p className="text-xs text-slate-600">à¸à¸²à¸£à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£à¸•à¸²à¸¡à¸„à¸³à¸£à¹‰à¸­à¸‡à¸ªà¸´à¹‰à¸™à¸ªà¸¸à¸”à¹à¸¥à¹‰à¸§ à¸«à¸²à¸à¸œà¸¹à¹‰à¸£à¹‰à¸­à¸‡à¸‚à¸­à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸£à¸±à¸šà¸­à¸µà¹€à¸¡à¸¥à¹à¸ˆà¹‰à¸‡à¸œà¸¥à¹à¸¥à¸°à¸¥à¸´à¸‡à¸à¹Œà¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸” à¸„à¸¸à¸“à¸ªà¸²à¸¡à¸²à¸£à¸–à¸à¸”à¸ªà¹ˆà¸‡à¸‹à¹‰à¸³à¸­à¸µà¸à¸„à¸£à¸±à¹‰à¸‡à¹„à¸”à¹‰</p>
                        
                        <button
                          type="button"
                          onClick={() => {
                            showNotify('à¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¸ªà¹ˆà¸‡à¸­à¸µà¹€à¸¡à¸¥à¹à¸ˆà¹‰à¸‡à¸œà¸¥à¸à¸²à¸£à¸žà¸´à¸ˆà¸²à¸£à¸“à¸²à¹à¸¥à¸°à¸¥à¸´à¸‡à¸à¹Œà¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¹„à¸›à¹ƒà¸«à¹‰à¸œà¸¹à¹‰à¸£à¹‰à¸­à¸‡à¸‚à¸­à¸­à¸µà¸à¸„à¸£à¸±à¹‰à¸‡à¸«à¸£à¸·à¸­à¹„à¸¡à¹ˆ?', 'confirm', 'à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¸ªà¹ˆà¸‡à¸­à¸µà¹€à¸¡à¸¥à¸‹à¹‰à¸³', async () => {
                              const jwtToken = sessionStorage.getItem('pdpa_token') || sessionStorage.getItem('pdpa_jwt_token') || '';
                              const req = getRequestClone(activeRequestObj.id);
                              if (!req) return;
                              try {
                                showNotify('à¸à¸³à¸¥à¸±à¸‡à¸ªà¹ˆà¸‡à¸­à¸µà¹€à¸¡à¸¥à¸­à¸µà¸à¸„à¸£à¸±à¹‰à¸‡...', 'info');
                                const res = await fetch(`/api/requests/${activeRequestObj.id}/deliver`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${jwtToken}`
                                  },
                                  body: JSON.stringify({
                                    trackingNo: req.trackingNo,
                                    email: req.requester.email,
                                    requesterName: req.requester.firstName + ' ' + req.requester.lastName
                                  })
                                });
                                if (!res.ok) {
                                  const errBody = await res.json().catch(() => ({}));
                                  showNotify(`à¸ªà¹ˆà¸‡à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ: ${errBody.message || 'à¹€à¸‹à¸´à¸£à¹Œà¸Ÿà¹€à¸§à¸­à¸£à¹Œà¸›à¸à¸´à¹€à¸ªà¸˜à¸à¸²à¸£à¸ªà¹ˆà¸‡à¸­à¸µà¹€à¸¡à¸¥'}`, 'error');
                                  return;
                                }
                                showNotify('à¸ªà¹ˆà¸‡à¸­à¸µà¹€à¸¡à¸¥à¹à¸ˆà¹‰à¸‡à¸œà¸¥à¹ƒà¸«à¹‰à¸œà¸¹à¹‰à¸£à¹‰à¸­à¸‡à¸‚à¸­à¸­à¸µà¸à¸„à¸£à¸±à¹‰à¸‡à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§!', 'success');
                              } catch(e) {
                                showNotify('à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¹ƒà¸™à¸à¸²à¸£à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­à¹€à¸‹à¸´à¸£à¹Œà¸Ÿà¹€à¸§à¸­à¸£à¹Œ', 'error');
                              }
                            });
                          }}
                          className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-lg text-xs transition shadow-sm flex items-center justify-center gap-2"
                        >
                          <Mail className="w-4 h-4" /> à¸ªà¹ˆà¸‡à¹€à¸­à¸à¸ªà¸²à¸£à¸—à¸²à¸‡à¸­à¸µà¹€à¸¡à¸¥à¸­à¸µà¸à¸„à¸£à¸±à¹‰à¸‡ (Resend Email)
                        </button>
                      </div>
                    )}

                    {/* Legal Hold status toggler */}
                    {['admin', 'dpo'].includes(activeUser.role) && (
                      <div className="no-print bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-xs flex justify-between items-center">
                        <div>
                          <span className="block font-bold text-slate-800">à¸£à¸°à¸‡à¸±à¸šà¸à¸²à¸£à¸—à¸³à¸¥à¸²à¸¢à¸«à¸¥à¸±à¸à¸à¸²à¸™ (Legal Hold)</span>
                          <span className="text-[10px] text-slate-400">à¸«à¹‰à¸²à¸¡à¸—à¸³à¸¥à¸²à¸¢à¹„à¸Ÿà¸¥à¹Œà¹à¸¡à¹‰à¸«à¸¡à¸”à¸­à¸²à¸¢à¸¸à¸à¸²à¸£à¹€à¸à¹‡à¸šà¸£à¸±à¸à¸©à¸² 2 à¸›à¸µ à¹ƒà¸™à¸à¸£à¸“à¸µà¸¡à¸µà¸„à¸”à¸µà¸„à¹‰à¸²à¸‡à¸„à¸²</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleLegalHold(activeRequestObj.id)}
                          className={`font-semibold py-1 px-3 rounded text-[11px] transition ${
                            activeRequestObj.legalHold ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {activeRequestObj.legalHold ? 'à¹€à¸›à¸´à¸” Legal Hold' : 'à¸›à¸´à¸”'}
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
                        <h2 className="text-xl font-bold text-slate-800">à¹à¸œà¸‡à¸„à¸§à¸šà¸„à¸¸à¸¡à¸£à¸°à¸šà¸šà¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸ªà¸´à¸—à¸˜à¸´à¹Œà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥</h2>
                        <p className="text-xs text-slate-500 mt-0.5">à¸ à¸²à¸žà¸£à¸§à¸¡à¸£à¸²à¸¢à¸à¸²à¸£à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­à¸•à¸²à¸¡à¸¡à¸²à¸•à¸£à¸² 30 à¹à¸¥à¸°à¸ªà¸–à¸²à¸™à¸° SLA à¸”à¸³à¹€à¸™à¸´à¸™à¸‡à¸²à¸™à¸‚à¸­à¸‡à¸­à¸‡à¸„à¹Œà¸à¸£</p>
                      </div>
                      <span className="bg-brand-50 text-brand-600 text-xs px-2.5 py-1 rounded font-bold">
                        à¸›à¸µà¸‡à¸šà¸›à¸£à¸°à¸¡à¸²à¸“ à¸ž.à¸¨. {new Date().getFullYear() + 543}
                      </span>
                    </div>

                    {/* Operational counter grid (Clickable Interactive Cards) */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {[
                        { label: 'à¸„à¸³à¸‚à¸­à¹€à¸‚à¹‰à¸²à¹ƒà¸«à¸¡à¹ˆà¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”', count: filteredRequests.length, color: 'border-l-brand-500 hover:border-brand-500 hover:shadow-md text-brand-600', statuses: null },
                        { label: 'à¸£à¸­à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸•à¸±à¸§à¸•à¸™', count: getBadgeCount(['Submitted', 'Received', 'Identity Verification', 'Completeness Review']), color: 'border-l-indigo-500 hover:border-indigo-500 hover:shadow-md text-indigo-600', statuses: ['Submitted', 'Received', 'Identity Verification', 'Completeness Review'] as RequestStatus[] },
                        { label: 'à¸­à¸¢à¸¹à¹ˆà¸£à¸°à¸«à¸§à¹ˆà¸²à¸‡à¸ªà¸·à¸šà¸„à¹‰à¸™à¸‚à¹‰à¸­à¸¡à¸¹à¸¥', count: getBadgeCount(['Documents Verified', 'Assigned', 'Data Collection']), color: 'border-l-amber-500 hover:border-amber-500 hover:shadow-md text-amber-600', statuses: ['Documents Verified', 'Assigned', 'Data Collection'] as RequestStatus[] },
                        { label: 'à¸£à¸­à¸à¹ˆà¸²à¸¢à¸à¸Žà¸«à¸¡à¸²à¸¢/DPO à¸•à¸£à¸§à¸ˆ', count: getBadgeCount(['Data Owner Review', 'DPO or Legal Review', 'Redaction Required', 'Approval Pending']), color: 'border-l-rose-500 hover:border-rose-500 hover:shadow-md text-rose-600', statuses: ['Data Owner Review', 'DPO or Legal Review', 'Redaction Required', 'Approval Pending'] as RequestStatus[] },
                        { label: 'à¸žà¸£à¹‰à¸­à¸¡à¸ªà¹ˆà¸‡à¸¡à¸­à¸š / à¸›à¸´à¸”à¹€à¸„à¸ª', count: getBadgeCount(['Ready for Delivery', 'Delivered', 'Closed']), color: 'border-l-emerald-500 hover:border-emerald-500 hover:shadow-md text-emerald-600', statuses: ['Ready for Delivery', 'Delivered', 'Closed'] as RequestStatus[] }
                      ].map((card, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            setInternalTab('requests');
                            setSelectedRequestId(null);
                          }}
                          className={`bg-white border border-slate-200 border-l-4 rounded-xl p-4 shadow-sm transition cursor-pointer hover:-translate-y-0.5 group ${card.color}`}
                        >
                          <span className="text-[10px] text-slate-400 block font-bold uppercase group-hover:text-slate-600 transition">{card.label}</span>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="text-2xl font-bold text-slate-800 block group-hover:scale-105 transition origin-left">{card.count}</span>
                            <span className="text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition">à¸„à¸¥à¸´à¸à¸”à¸¹à¹€à¸£à¸·à¹ˆà¸­à¸‡ â†’</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Dynamic Charts visual component */}
                    <DashboardCharts requests={filteredRequests} />

                    {/* Quick overview of latest requests */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                      <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">à¸„à¸³à¸£à¹‰à¸­à¸‡à¸—à¸µà¹ˆà¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¸„à¸§à¸²à¸¡à¸Šà¹ˆà¸§à¸¢à¹€à¸«à¸¥à¸·à¸­à¹€à¸£à¹ˆà¸‡à¸”à¹ˆà¸§à¸™ (Urgent SLA Action)</span>
                      
                      <div className="divide-y divide-slate-100">
                        {filteredRequests.slice(0, 3).map((req) => (
                          <div
                            key={req.id}
                            onClick={() => {
                              if (activeUser && !canManageRequestFlow(req, activeUser)) {
                                showNotify('à¸„à¸³à¸£à¹‰à¸­à¸‡à¸™à¸µà¹‰à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸­à¸¢à¸¹à¹ˆà¹ƒà¸™à¸‚à¸±à¹‰à¸™à¸•à¸­à¸™à¸—à¸µà¹ˆà¸—à¹ˆà¸²à¸™à¸ªà¸²à¸¡à¸²à¸£à¸–à¸ˆà¸±à¸”à¸à¸²à¸£à¹„à¸”à¹‰ (à¸£à¸­à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£à¸•à¸²à¸¡ FLOW)', 'warning');
                                return;
                              }
                              setSelectedRequestId(req.id);
                            }}
                            className="py-3 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50 transition px-2 rounded-lg"
                          >
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-800 block">{req.trackingNo} - {req.requester.firstName} {req.requester.lastName}</span>
                              <span className="text-slate-400 block">à¸‚à¸­à¸šà¹€à¸‚à¸•: {req.requestDetails.description.substring(0, 50)}...</span>
                            </div>
                            <div className="text-right">
                              <span className="inline-block bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                {req.status}
                              </span>
                              <span className="block text-[10px] text-slate-400 mt-1 font-bold">
                                à¹€à¸«à¸¥à¸·à¸­à¹€à¸§à¸¥à¸² SLA: {req.slaRemainingDays} à¸§à¸±à¸™
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

                {/* RoPA (Record of Processing Activities) Tab */}
                {internalTab === 'ropa' && (
                  <div className="h-full w-full">
                    <RopaManager activeUser={activeUser} />
                  </div>
                )}

                {/* Manual Entry Tab for Internal Staff */}
                {internalTab === 'manual_entry' && (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden p-6 max-w-4xl mx-auto space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="font-bold text-lg text-slate-800">à¸šà¸±à¸™à¸—à¸¶à¸à¸„à¸³à¸£à¹‰à¸­à¸‡à¹ƒà¸«à¸¡à¹ˆ (Manual Entry)</h3>
                        <p className="text-xs text-slate-500">à¸ªà¸³à¸«à¸£à¸±à¸šà¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¸šà¸±à¸™à¸—à¸¶à¸à¸„à¸³à¸£à¹‰à¸­à¸‡à¸—à¸µà¹ˆà¹„à¸”à¹‰à¸£à¸±à¸šà¸ˆà¸²à¸à¸Šà¹ˆà¸­à¸‡à¸—à¸²à¸‡à¸­à¸·à¹ˆà¸™ (à¹„à¸›à¸£à¸©à¸“à¸µà¸¢à¹Œ, à¸ªà¸³à¸™à¸±à¸à¸‡à¸²à¸™, à¸­à¸µà¹€à¸¡à¸¥, e-Service)</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInternalTab('requests')}
                        className="text-slate-500 hover:text-slate-700 text-xs font-bold underline"
                      >
                        à¸¢à¸à¹€à¸¥à¸´à¸à¹à¸¥à¸°à¸à¸¥à¸±à¸šà¹„à¸›à¸«à¸™à¹‰à¸²à¸£à¸²à¸¢à¸à¸²à¸£
                      </button>
                    </div>

                    <form onSubmit={handleManualSubmit} className="space-y-6">
                      {/* Section 1: Channel & Reference */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                        <h4 className="font-bold text-slate-700 text-sm border-b border-slate-200 pb-2">1. à¸Šà¹ˆà¸­à¸‡à¸—à¸²à¸‡à¸£à¸±à¸šà¹€à¸£à¸·à¹ˆà¸­à¸‡</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">à¸£à¸±à¸šà¹€à¸£à¸·à¹ˆà¸­à¸‡à¸ˆà¸²à¸à¸Šà¹ˆà¸­à¸‡à¸—à¸²à¸‡ <span className="text-red-500">*</span></label>
                            <select
                              required
                              value={manualChannel}
                              onChange={(e) => setManualChannel(e.target.value as any)}
                              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-500 bg-white"
                            >
                              <option value="office">Walk-in (à¸ªà¸³à¸™à¸±à¸à¸‡à¸²à¸™)</option>
                              <option value="email">à¸­à¸µà¹€à¸¡à¸¥ (Email)</option>
                              <option value="post">à¹„à¸›à¸£à¸©à¸“à¸µà¸¢à¹Œ (Post)</option>
                              <option value="e-service">à¸£à¸°à¸šà¸š E-Service (à¸­à¸·à¹ˆà¸™à¹†)</option>
                            </select>
                          </div>
                          
                          {manualChannel !== 'office' && (
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-slate-700">à¹€à¸¥à¸‚à¸—à¸µà¹ˆà¸­à¹‰à¸²à¸‡à¸­à¸´à¸‡ (à¸–à¹‰à¸²à¸¡à¸µ)</label>
                              <input
                                type="text"
                                placeholder="à¹€à¸Šà¹ˆà¸™ à¹€à¸¥à¸‚à¸—à¸µà¹ˆà¹€à¸­à¸à¸ªà¸²à¸£à¸£à¸±à¸šà¹€à¸‚à¹‰à¸² à¸«à¸£à¸·à¸­à¸£à¸«à¸±à¸ªà¸—à¸´à¸à¹€à¸à¹‡à¸•"
                                value={manualRefNo}
                                onChange={(e) => setManualRefNo(e.target.value)}
                                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-500"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section 2: Requester Type */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                        <h4 className="font-bold text-slate-700 text-sm border-b border-slate-200 pb-2">2. à¸›à¸£à¸°à¹€à¸ à¸—à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸£à¹‰à¸­à¸‡</h4>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                            <input
                              type="radio"
                              name="manualReqType"
                              checked={reqType === 'self'}
                              onChange={() => setReqType('self')}
                              className="text-brand-600 focus:ring-brand-500"
                            />
                            <span>à¹€à¸ˆà¹‰à¸²à¸‚à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸¢à¸·à¹ˆà¸™à¸”à¹‰à¸§à¸¢à¸•à¸™à¹€à¸­à¸‡</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                            <input
                              type="radio"
                              name="manualReqType"
                              checked={reqType === 'representative'}
                              onChange={() => setReqType('representative')}
                              className="text-brand-600 focus:ring-brand-500"
                            />
                            <span>à¸£à¸±à¸šà¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆ</span>
                          </label>
                        </div>
                      </div>

                      {/* Section 3: Requester Details */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                        <h4 className="font-bold text-slate-700 text-sm border-b border-slate-200 pb-2">3. à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸£à¹‰à¸­à¸‡ (à¸œà¸¹à¹‰à¸•à¸´à¸”à¸•à¹ˆà¸­à¸«à¸¥à¸±à¸)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">à¸Šà¸·à¹ˆà¸­à¸ˆà¸£à¸´à¸‡ <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              required
                              value={requesterForm.firstName}
                              onChange={(e) => setRequesterForm({...requesterForm, firstName: e.target.value})}
                              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥ <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              required
                              value={requesterForm.lastName}
                              onChange={(e) => setRequesterForm({...requesterForm, lastName: e.target.value})}
                              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-500"
                            />
                          </div>
                          <div className="space-y-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-slate-700">à¹€à¸šà¸­à¸£à¹Œà¹‚à¸—à¸£à¸¨à¸±à¸žà¸—à¹Œ <span className="text-red-500">*</span></label>
                              <input
                                type="tel"
                                required
                                maxLength={12}
                                value={requesterForm.phone}
                                onChange={(e) => setRequesterForm({...requesterForm, phone: e.target.value})}
                                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-1 focus:ring-brand-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-slate-700">
                                à¸­à¸µà¹€à¸¡à¸¥ {manualChannel === 'email' ? <span className="text-red-500">*</span> : '(à¸–à¹‰à¸²à¸¡à¸µ)'}
                              </label>
                              <input
                                type="email"
                                required={manualChannel === 'email'}
                                value={requesterForm.email}
                                onChange={(e) => setRequesterForm({...requesterForm, email: e.target.value})}
                                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-500"
                              />
                            </div>
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-xs font-medium text-slate-700">à¹€à¸¥à¸‚à¸šà¸±à¸•à¸£à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™ / Passport ID <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              required
                              maxLength={17}
                              value={requesterForm.idNumber}
                              onChange={(e) => setRequesterForm({...requesterForm, idNumber: formatThaiCitizenIdMask(e.target.value)})}
                              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 font-mono tracking-wider font-bold focus:ring-1 focus:ring-brand-500"
                            />
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-xs font-medium text-slate-700">à¸—à¸µà¹ˆà¸­à¸¢à¸¹à¹ˆà¸•à¸´à¸”à¸•à¹ˆà¸­à¹„à¸”à¹‰</label>
                            <textarea
                              rows={2}
                              value={requesterForm.address}
                              onChange={(e) => setRequesterForm({...requesterForm, address: e.target.value})}
                              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Rep Details Form */}
                      {reqType === 'representative' && (
                        <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-4">
                          <div className="flex items-center justify-between border-b border-teal-200 pb-2">
                            <span className="font-bold text-teal-900 text-sm flex items-center gap-1.5">
                              <Users className="h-4 w-4 text-teal-700" />
                              <span>à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¸³à¸«à¸£à¸±à¸šà¸œà¸¹à¹‰à¸£à¸±à¸šà¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆ (Authorized Representative)</span>
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-slate-700">à¸Šà¸·à¹ˆà¸­à¸ˆà¸£à¸´à¸‡ <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                required
                                value={repForm.firstName}
                                onChange={(e) => setRepForm({...repForm, firstName: e.target.value})}
                                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-slate-700">à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥ <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                required
                                value={repForm.lastName}
                                onChange={(e) => setRepForm({...repForm, lastName: e.target.value})}
                                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-500"
                              />
                            </div>
                            <div className="space-y-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-700">à¹€à¸šà¸­à¸£à¹Œà¹‚à¸—à¸£à¸¨à¸±à¸žà¸—à¹Œ <span className="text-red-500">*</span></label>
                                <input
                                  type="tel"
                                  required
                                  maxLength={12}
                                  value={repForm.phone}
                                  onChange={(e) => setRepForm({...repForm, phone: e.target.value})}
                                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-1 focus:ring-brand-500"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-700">
                                  à¸­à¸µà¹€à¸¡à¸¥ {manualChannel === 'email' ? <span className="text-red-500">*</span> : '(à¸–à¹‰à¸²à¸¡à¸µ)'}
                                </label>
                                <input
                                  type="email"
                                  required={manualChannel === 'email'}
                                  value={repForm.email}
                                  onChange={(e) => setRepForm({...repForm, email: e.target.value})}
                                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-500"
                                />
                              </div>
                            </div>
                            <div className="space-y-1 md:col-span-2">
                              <label className="text-xs font-medium text-slate-700">à¹€à¸¥à¸‚à¸šà¸±à¸•à¸£à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™ / Passport ID <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                required
                                maxLength={17}
                                value={repForm.idNumber}
                                onChange={(e) => setRepForm({...repForm, idNumber: formatThaiCitizenIdMask(e.target.value)})}
                                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 font-mono tracking-wider font-bold focus:ring-1 focus:ring-brand-500"
                              />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                              <label className="text-xs font-medium text-slate-700">à¸—à¸µà¹ˆà¸­à¸¢à¸¹à¹ˆà¸•à¸´à¸”à¸•à¹ˆà¸­à¹„à¸”à¹‰</label>
                              <textarea
                                rows={2}
                                value={repForm.address}
                                onChange={(e) => setRepForm({...repForm, address: e.target.value})}
                                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-500"
                              />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                              <label className="text-xs font-medium text-slate-700">à¸‚à¸­à¸šà¹€à¸‚à¸•à¸à¸²à¸£à¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆ <span className="text-red-500">*</span></label>
                              <textarea
                                required
                                rows={2}
                                placeholder="à¹€à¸Šà¹ˆà¸™ à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­à¹à¸¥à¸°à¸£à¸±à¸šà¹€à¸­à¸à¸ªà¸²à¸£à¹à¸—à¸™"
                                value={repForm.scope}
                                onChange={(e) => setRepForm({...repForm, scope: e.target.value})}
                                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Section 4: Request Details */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                        <h4 className="font-bold text-slate-700 text-sm border-b border-slate-200 pb-2">4. à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”à¸„à¸³à¸‚à¸­</h4>
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">à¸›à¸£à¸°à¹€à¸ à¸—à¸„à¸³à¸‚à¸­ <span className="text-red-500">*</span></label>
                            <select
                              required
                              value={scopeForm.requestType}
                              onChange={(e) => setScopeForm({...scopeForm, requestType: e.target.value as any})}
                              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
                            >
                              <option value="access_and_copy">à¸‚à¸­à¹€à¸‚à¹‰à¸²à¸–à¸¶à¸‡à¸žà¸£à¹‰à¸­à¸¡à¸‚à¸­à¸£à¸±à¸šà¸ªà¸³à¹€à¸™à¸²à¸‚à¹‰à¸­à¸¡à¸¹à¸¥ (Access & Copy)</option>
                              <option value="access">à¸‚à¸­à¹€à¸‚à¹‰à¸²à¸–à¸¶à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥ (Right to Access)</option>
                              <option value="copy">à¸‚à¸­à¸£à¸±à¸šà¸ªà¸³à¹€à¸™à¸²à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥ (Right to obtain a copy)</option>
                              <option value="erasure">à¸‚à¸­à¹ƒà¸«à¹‰à¸¥à¸šà¸«à¸£à¸·à¸­à¸—à¸³à¸¥à¸²à¸¢à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥ (Right to Erasure)</option>
                              <option value="rectification">à¸‚à¸­à¹à¸à¹‰à¹„à¸‚à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¹ƒà¸«à¹‰à¸–à¸¹à¸à¸•à¹‰à¸­à¸‡ (Right to Rectification)</option>
                              <option value="restriction">à¸‚à¸­à¸£à¸°à¸‡à¸±à¸šà¸à¸²à¸£à¹ƒà¸Šà¹‰à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥ (Right to Restriction of Processing)</option>
                              <option value="withdraw">à¸‚à¸­à¸–à¸­à¸™à¸„à¸§à¸²à¸¡à¸¢à¸´à¸™à¸¢à¸­à¸¡ (Right to Withdraw Consent)</option>
                              <option value="object">à¸‚à¸­à¸„à¸±à¸”à¸„à¹‰à¸²à¸™à¸à¸²à¸£à¹€à¸à¹‡à¸šà¸£à¸§à¸šà¸£à¸§à¸¡ à¹ƒà¸Šà¹‰ à¸«à¸£à¸·à¸­à¹€à¸›à¸´à¸”à¹€à¸œà¸¢ (Right to Object)</option>
                              <option value="portability">à¸‚à¸­à¹ƒà¸«à¹‰à¹‚à¸­à¸™à¸¢à¹‰à¸²à¸¢à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥ (Right to Data Portability)</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸—à¸µà¹ˆà¸•à¹‰à¸­à¸‡à¸à¸²à¸£ <span className="text-red-500">*</span></label>
                            <textarea
                              required
                              rows={3}
                              value={scopeForm.description}
                              onChange={(e) => setScopeForm({...scopeForm, description: e.target.value})}
                              className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">à¸£à¸°à¸šà¸š / à¸à¸²à¸™à¸‚à¹‰à¸­à¸¡à¸¹à¸¥ / à¸à¹ˆà¸²à¸¢à¸—à¸µà¹ˆà¹€à¸à¸µà¹ˆà¸¢à¸§à¸‚à¹‰à¸­à¸‡</label>
                            <input
                              type="text"
                              value={scopeForm.systems.join(', ')}
                              onChange={(e) => setScopeForm({...scopeForm, systems: e.target.value.split(',').map(s => s.trim())})}
                              placeholder="à¹€à¸Šà¹ˆà¸™ à¸£à¸°à¸šà¸š CRM, à¹à¸œà¸™à¸à¸šà¸¸à¸„à¸„à¸¥ (à¸„à¸±à¹ˆà¸™à¸”à¹‰à¸§à¸¢à¸¥à¸¹à¸à¸™à¹‰à¸³)"
                              className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setInternalTab('requests')}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-lg text-xs transition"
                        >
                          à¸¢à¸à¹€à¸¥à¸´à¸
                        </button>
                        <button
                          type="submit"
                          className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 px-8 rounded-lg text-xs transition shadow-sm"
                        >
                          à¸šà¸±à¸™à¸—à¸¶à¸à¸„à¸³à¸£à¹‰à¸­à¸‡à¹€à¸‚à¹‰à¸²à¸£à¸°à¸šà¸š
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* User & Access Management Tab for Admin */}
                {internalTab === 'users' && (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden space-y-6 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-brand-600" />
                          <span>à¸à¸²à¸£à¸ˆà¸±à¸”à¸à¸²à¸£à¸šà¸±à¸à¸Šà¸µà¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¹à¸¥à¸°à¸à¸³à¸«à¸™à¸”à¸ªà¸´à¸—à¸˜à¸´à¹Œ (User & Access Control Management)</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          à¸à¸²à¸£à¸šà¸£à¸´à¸«à¸²à¸£à¸ˆà¸±à¸”à¸à¸²à¸£à¸£à¸²à¸¢à¸Šà¸·à¹ˆà¸­à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆ à¸ªà¸´à¸—à¸˜à¸´à¹Œà¸à¸²à¸£à¹€à¸‚à¹‰à¸²à¸–à¸¶à¸‡ (Multi-Role) à¹à¸¥à¸°à¸à¸²à¸£à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸„à¸§à¸²à¸¡à¹€à¸ªà¸µà¹ˆà¸¢à¸‡ SOD à¸•à¸²à¸¡à¸¡à¸²à¸•à¸£à¸à¸²à¸™à¸„à¸§à¸²à¸¡à¸¡à¸±à¹ˆà¸™à¸„à¸‡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingUser(null);
                          setUserForm({
                            username: '',
                            fullNameTh: '',
                            fullNameEn: '',
                            email: '',
                            department: 'à¸¨à¸¹à¸™à¸¢à¹Œà¸£à¸±à¸šà¹€à¸£à¸·à¹ˆà¸­à¸‡à¸£à¹‰à¸­à¸‡à¹€à¸£à¸µà¸¢à¸™ (à¸à¸£à¸¡à¸à¸²à¸£à¸›à¸à¸„à¸£à¸­à¸‡)',
                            role: 'intake',
                            roles: ['intake']
                          });
                          setIsUserModalOpen(true);
                        }}
                        className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition shadow-sm flex items-center gap-1.5"
                      >
                        <Plus className="h-4 w-4" />
                        <span>+ à¹€à¸žà¸´à¹ˆà¸¡à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¹ƒà¸«à¸¡à¹ˆ (Add User)</span>
                      </button>
                    </div>

                    {/* Users Table */}
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                            <th className="p-3">à¸Šà¸·à¹ˆà¸­-à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥</th>
                            <th className="p-3">Username / à¸­à¸µà¹€à¸¡à¸¥</th>
                            <th className="p-3">à¸«à¸™à¹ˆà¸§à¸¢à¸‡à¸²à¸™ / à¹à¸œà¸™à¸</th>
                            <th className="p-3">à¸šà¸—à¸šà¸²à¸—à¸ªà¸´à¸—à¸˜à¸´à¹Œà¸–à¸·à¸­à¸„à¸£à¸­à¸‡ (Roles)</th>
                            <th className="p-3">à¸ªà¸–à¸²à¸™à¸°à¸„à¸§à¸²à¸¡à¹€à¸ªà¸µà¹ˆà¸¢à¸‡ SOD</th>
                            <th className="p-3 text-center">à¸ˆà¸±à¸”à¸à¸²à¸£</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {backendUsers
                            .filter((u: UserType) => u.orgId === currentViewOrgId || (activeUser.role === 'superadmin' && !impersonatedOrgId))
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
                                      <span>âš ï¸ SOD Conflict</span>
                                    </span>
                                  ) : (
                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                      âœ“ Compliant (Normal)
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingUser(user);
                                      setUserForm({
                                        username: user.username,
                                        fullNameTh: user.fullNameTh || '',
                                        fullNameEn: user.fullNameEn || '',
                                        email: user.email || '',
                                        department: user.department || '',
                                        role: user.role,
                                        roles: (user.roles && user.roles.length > 0) ? user.roles : [user.role]
                                      });
                                      setIsUserModalOpen(true);
                                    }}
                                    className="bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-700 border border-slate-200 hover:border-brand-300 px-2.5 py-1 rounded text-[11px] font-semibold transition"
                                  >
                                    à¹à¸à¹‰à¹„à¸‚à¸ªà¸´à¸—à¸˜à¸´à¹Œ
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
                    
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
                      <span className="text-xs font-bold text-slate-800">
                        à¸•à¸²à¸£à¸²à¸‡à¸ªà¸·à¸šà¸„à¹‰à¸™à¹à¸¥à¸°à¸”à¸³à¹€à¸™à¸´à¸™à¸‡à¸²à¸™à¸„à¸³à¸£à¹‰à¸­à¸‡à¸‚à¸­à¹ƒà¸Šà¹‰à¸ªà¸´à¸—à¸˜à¸´à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥ (Data Subject Access Requests) 
                        ({filteredRequests.length} à¸£à¸²à¸¢à¸à¸²à¸£)
                      </span>
                      {['intake', 'admin'].includes(activeUser.role) && (
                        <button
                          type="button"
                          onClick={() => {
                            handleResetWizard();
                            setInternalTab('manual_entry');
                          }}
                          className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-[11px] px-3 py-1.5 rounded transition shadow-sm flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          à¸šà¸±à¸™à¸—à¸¶à¸à¸„à¸³à¸£à¹‰à¸­à¸‡à¹ƒà¸«à¸¡à¹ˆ (Manual Entry)
                        </button>
                      )}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100/50 border-b border-slate-200 text-slate-500 font-bold">
                            <th className="p-3">à¹€à¸¥à¸‚à¸•à¸´à¸”à¸•à¸²à¸¡ (Tracking)</th>
                            <th className="p-3">à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­</th>
                            <th className="p-3">à¸›à¸£à¸°à¹€à¸ à¸—à¸ªà¸´à¸—à¸˜à¸´à¹Œ</th>
                            <th className="p-3">à¸§à¸±à¸™à¸¢à¸·à¹ˆà¸™à¹€à¸£à¸·à¹ˆà¸­à¸‡</th>
                            <th className="p-3">à¸ªà¸–à¸²à¸™à¸°à¸‚à¸±à¹‰à¸™à¸•à¸­à¸™</th>
                            <th className="p-3">SLA à¹€à¸«à¸¥à¸·à¸­</th>
                            <th className="p-3 text-center">à¸ˆà¸±à¸”à¸à¸²à¸£</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {filteredRequests
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
                                  ['Approved', 'Ready for Delivery', 'Delivered', 'Closed'].includes(req.status) ? 'bg-emerald-100 text-emerald-800' :
                                  ['Denied', 'Withdrawn'].includes(req.status) ? 'bg-rose-100 text-rose-800' :
                                  'bg-brand-50 text-brand-700 border border-brand-100'
                                }`}>
                                  {req.status}
                                </span>
                              </td>
                              <td className="p-3 font-bold">
                                <span className={req.slaRemainingDays < 0 ? 'text-rose-600' : req.slaRemainingDays <= 7 ? 'text-amber-600' : 'text-slate-700'}>
                                  {req.slaRemainingDays} à¸§à¸±à¸™
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (activeUser && !canManageRequestFlow(req, activeUser)) {
                                      showNotify('à¸„à¸³à¸£à¹‰à¸­à¸‡à¸™à¸µà¹‰à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸­à¸¢à¸¹à¹ˆà¹ƒà¸™à¸‚à¸±à¹‰à¸™à¸•à¸­à¸™à¸—à¸µà¹ˆà¸—à¹ˆà¸²à¸™à¸ªà¸²à¸¡à¸²à¸£à¸–à¸ˆà¸±à¸”à¸à¸²à¸£à¹„à¸”à¹‰ (à¸£à¸­à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£à¸•à¸²à¸¡ FLOW)', 'warning');
                                      return;
                                    }
                                    setSelectedRequestId(req.id);
                                  }}
                                  className="text-brand-600 hover:text-brand-800 font-bold hover:underline"
                                >
                                  à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¹€à¸„à¸ª
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
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">à¸šà¸­à¸£à¹Œà¸”à¸¥à¸­à¸¢à¸‡à¸²à¸™à¸•à¸²à¸¡à¸‚à¸±à¹‰à¸™à¸•à¸­à¸™à¸à¸Žà¸«à¸¡à¸²à¸¢ (Workflow Kanban board)</span>
                    
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
                      
                      {/* Column 1: Intake */}
                      {[
                        { title: '1. à¸•à¸£à¸§à¸ˆà¸£à¸±à¸šà¸„à¸³à¸‚à¸­ (Intake)', statuses: ['Submitted', 'Received', 'Identity Verification', 'Awaiting Identity Evidence', 'Completeness Review'] },
                        { title: '2. à¸ªà¸·à¸šà¸„à¹‰à¸™à¸£à¸°à¸šà¸š (Gathering)', statuses: ['Documents Verified', 'Assigned', 'Data Collection'] },
                        { title: '3. à¸à¸Žà¸«à¸¡à¸²à¸¢/DPO (Legal Check)', statuses: ['Data Owner Review', 'DPO or Legal Review', 'Redaction Required'] },
                        { title: '4. à¸£à¸­à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´/à¸Šà¸³à¸£à¸°à¹€à¸‡à¸´à¸™ (Approval)', statuses: ['Approval Pending', 'Fee Notification', 'Awaiting Payment'] },
                        { title: '5. à¹€à¸•à¸£à¸µà¸¢à¸¡à¸ªà¹ˆà¸‡à¸¡à¸­à¸š/à¸›à¸´à¸”à¸‡à¸²à¸™ (Delivery)', statuses: ['Approved', 'Partially Approved', 'Ready for Delivery', 'Delivered', 'Closed'] }
                      ].map((col, idx) => {
                        const colRequests = filteredRequests.filter(r => col.statuses.includes(r.status));
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
                                  onClick={() => {
                                    if (activeUser && !canManageRequestFlow(req, activeUser)) {
                                      showNotify('à¸„à¸³à¸£à¹‰à¸­à¸‡à¸™à¸µà¹‰à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸­à¸¢à¸¹à¹ˆà¹ƒà¸™à¸‚à¸±à¹‰à¸™à¸•à¸­à¸™à¸—à¸µà¹ˆà¸—à¹ˆà¸²à¸™à¸ªà¸²à¸¡à¸²à¸£à¸–à¸ˆà¸±à¸”à¸à¸²à¸£à¹„à¸”à¹‰ (à¸£à¸­à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£à¸•à¸²à¸¡ FLOW)', 'warning');
                                      return;
                                    }
                                    setSelectedRequestId(req.id);
                                  }}
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
                        <span>à¸•à¸±à¹‰à¸‡à¸„à¹ˆà¸²à¸à¸²à¸£à¸›à¸à¸´à¸šà¸±à¸•à¸´à¸•à¸²à¸¡à¸‚à¹‰à¸­à¸šà¸±à¸‡à¸„à¸±à¸šà¸„à¸¸à¹‰à¸¡à¸„à¸£à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥ (Compliance Configurator)</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">à¹€à¸§à¸­à¸£à¹Œà¸Šà¸±à¸™à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¸›à¸±à¸ˆà¸ˆà¸¸à¸šà¸±à¸™: v{config.version} | à¹à¸à¹‰à¹„à¸‚à¹‚à¸”à¸¢: {config.updatedBy} ({convertToThaiDate(config.updatedAt)})</p>
                    </div>

                    <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸„à¸§à¸²à¸¡à¸„à¸£à¸šà¸–à¹‰à¸§à¸™à¸‚à¸­à¸‡à¹€à¸­à¸à¸ªà¸²à¸£ (à¸§à¸±à¸™):</label>
                          <input
                            type="number"
                            min={1}
                            value={configForm.completenessCheckDays}
                            onChange={(e) => setConfigForm({ ...configForm, completenessCheckDays: parseInt(e.target.value) || 15 })}
                            className="w-full border rounded p-2 bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">à¸‚à¸µà¸”à¸à¸³à¸«à¸™à¸”à¹ƒà¸«à¹‰à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¹à¸à¹‰à¹„à¸‚à¹€à¸­à¸à¸ªà¸²à¸£à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡ (à¸§à¸±à¸™ - à¸«à¹‰à¸²à¸¡à¸•à¹ˆà¸³à¸à¸§à¹ˆà¸² 10 à¸§à¸±à¸™):</label>
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
                          <label className="font-semibold text-slate-700">à¸£à¸°à¸¢à¸°à¹€à¸§à¸¥à¸²à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£à¸›à¸£à¸°à¸¡à¸§à¸¥à¸œà¸¥à¸ªà¸´à¸—à¸˜à¸´à¹Œà¸«à¸¥à¸±à¸ (à¸§à¸±à¸™ - à¸›à¸à¸•à¸´ 30 à¸§à¸±à¸™):</label>
                          <input
                            type="number"
                            min={1}
                            value={configForm.processingDays}
                            onChange={(e) => setConfigForm({ ...configForm, processingDays: parseInt(e.target.value) || 30 })}
                            className="w-full border rounded p-2 bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">à¸£à¸°à¸¢à¸°à¹€à¸§à¸¥à¸²à¸ªà¸¹à¸‡à¸ªà¸¸à¸”à¸‚à¸¢à¸²à¸¢à¸£à¸°à¸¢à¸°à¹€à¸§à¸¥à¸²à¸­à¸­à¸à¸‡à¸²à¸™à¹„à¸”à¹‰à¸­à¸µà¸ (à¸§à¸±à¸™):</label>
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
                        <span className="block font-bold text-slate-700">à¸­à¸±à¸•à¸£à¸²à¸ˆà¸±à¸”à¹€à¸à¹‡à¸šà¸„à¹ˆà¸²à¸˜à¸£à¸£à¸¡à¹€à¸™à¸µà¸¢à¸¡à¸ªà¸¹à¸‡à¸ªà¸¸à¸” (à¸šà¸²à¸—):</span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 block font-bold">à¸ªà¸³à¹€à¸™à¸²à¸à¸£à¸°à¸”à¸²à¸© A4 (à¸ªà¸¹à¸‡à¸ªà¸¸à¸” 1 à¸š.):</label>
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
                            <label className="text-[10px] text-slate-400 block font-bold">à¸„à¸­à¸¡à¸žà¸´à¸§à¹€à¸•à¸­à¸£à¹Œà¸›à¸£à¸´à¹‰à¸™à¸—à¹Œ A4 (à¸ªà¸¹à¸‡à¸ªà¸¸à¸” 3 à¸š.):</label>
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
                            <label className="text-[10px] text-slate-400 block font-bold">à¸„à¹ˆà¸²à¹€à¸‹à¹‡à¸™à¸£à¸±à¸šà¸£à¸­à¸‡ (à¸ªà¸¹à¸‡à¸ªà¸¸à¸” 5 à¸š.):</label>
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
                        <label className="font-semibold text-slate-700">à¹€à¸«à¸•à¸¸à¸œà¸¥à¸›à¸£à¸°à¸à¸­à¸šà¸à¸²à¸£à¸šà¸±à¸™à¸—à¸¶à¸à¹à¸à¹‰à¹„à¸‚ (Audit Reason) <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          placeholder="à¸£à¸°à¸šà¸¸à¹€à¸«à¸•à¸¸à¸œà¸¥à¸à¸²à¸£à¸­à¸­à¸à¸™à¹‚à¸¢à¸šà¸²à¸¢à¸‰à¸šà¸±à¸šà¹à¸à¹‰à¹„à¸‚..."
                          value={configForm.changeReason}
                          onChange={(e) => setConfigForm({ ...configForm, changeReason: e.target.value })}
                          className="w-full border rounded p-2 bg-white font-semibold"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 rounded-lg transition"
                      >
                        à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¸šà¸±à¸™à¸—à¸¶à¸ à¹à¸¥à¸°à¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™à¹€à¸§à¸­à¸£à¹Œà¸Šà¸±à¸™ config
                      </button>

                    </form>
                  </div>
                )}

                {/* 4.5 Document Templates Tab */}
                {internalTab === 'templates' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">à¹à¸¡à¹ˆà¹à¸šà¸šà¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸£à¸²à¸Šà¸à¸²à¸£à¸„à¸¸à¹‰à¸¡à¸„à¸£à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥ (PDPA Document Templates)</span>
                      <button
                        type="button"
                        onClick={() => {
                          showNotify('à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¸£à¸µà¹€à¸‹à¹‡à¸•à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡à¹à¸¡à¹ˆà¹à¸šà¸šà¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”à¸à¸¥à¸±à¸šà¹€à¸›à¹‡à¸™à¸„à¹ˆà¸²à¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™à¸¡à¸²à¸•à¸£à¸à¸²à¸™à¸‚à¸­à¸‡à¸£à¸°à¸šà¸šà¸«à¸£à¸·à¸­à¹„à¸¡à¹ˆ?', 'confirm', 'à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¸£à¸µà¹€à¸‹à¹‡à¸•à¹à¸¡à¹ˆà¹à¸šà¸š', async () => {
                            const defaults = await resetDocumentTemplates();
                            setTemplates(defaults);
                            showNotify('à¸£à¸µà¹€à¸‹à¹‡à¸•à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡à¹à¸¡à¹ˆà¹à¸šà¸šà¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸£à¸²à¸Šà¸à¸²à¸£à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”à¸à¸¥à¸±à¸šà¹€à¸›à¹‡à¸™à¸„à¹ˆà¸²à¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§', 'success', 'à¸£à¸µà¹€à¸‹à¹‡à¸•à¸ªà¸³à¹€à¸£à¹‡à¸ˆ');
                          });
                        }}
                        className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded font-semibold transition"
                      >
                        ðŸ”„ à¸£à¸µà¹€à¸‹à¹‡à¸•à¹à¸¡à¹ˆà¹à¸šà¸šà¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™ (Reset Defaults)
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {templates.map((temp) => (
                        <div key={temp.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3 text-xs">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-slate-800 block">{temp.nameTh}</span>
                              <span className="text-[10px] text-slate-400 block">à¸£à¸«à¸±à¸ª: {temp.id} | à¹€à¸§à¸­à¸£à¹Œà¸Šà¸±à¸™: {temp.version}</span>
                            </div>
                            <span className="bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {temp.confidentialityLevel}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <span className="text-slate-400 block font-semibold">à¸Šà¸·à¹ˆà¸­à¹€à¸£à¸·à¹ˆà¸­à¸‡à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸£à¸²à¸Šà¸à¸²à¸£:</span>
                            <span className="font-bold text-slate-800">{temp.subjectTemplate}</span>
                          </div>

                          <div className="p-2 bg-slate-50 border border-slate-100 rounded text-slate-500 font-mono text-[10px] h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                            {temp.bodyTemplate}
                          </div>

                          <button
                            type="button"
                            onClick={() => setEditingTemplate({ ...temp })}
                            className="w-full bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold py-1.5 rounded transition text-center"
                          >
                            à¹à¸à¹‰à¹„à¸‚à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡à¹à¸¡à¹ˆà¹à¸šà¸š (Edit Template)
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
                      <span className="text-xs font-bold text-slate-800">à¸™à¹‚à¸¢à¸šà¸²à¸¢à¸à¸²à¸£à¸ˆà¸±à¸”à¹€à¸à¹‡à¸šà¹à¸¥à¸°à¸—à¸³à¸¥à¸²à¸¢à¹€à¸­à¸à¸ªà¸²à¸£à¸«à¸¥à¸±à¸à¸à¸²à¸™ (Data Retention & Disposal Schedule)</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸«à¸¥à¸±à¸à¸à¸²à¸™à¸›à¸£à¸°à¸à¸­à¸šà¸à¸²à¸£à¸‚à¸­à¸ªà¸´à¸—à¸˜à¸´ à¸¡à¸µà¹€à¸à¸“à¸‘à¹Œà¸—à¸³à¸¥à¸²à¸¢à¸–à¸²à¸§à¸£ 2 à¸›à¸µ à¸™à¸±à¸šà¸ˆà¸²à¸à¹€à¸ªà¸£à¹‡à¸ˆà¸ªà¸´à¹‰à¸™à¸à¸²à¸£à¸ªà¹ˆà¸‡à¸¡à¸­à¸š</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100/50 border-b border-slate-200 text-slate-500 font-bold">
                            <th className="p-3">à¹€à¸¥à¸‚à¸•à¸´à¸”à¸•à¸²à¸¡</th>
                            <th className="p-3">à¹€à¸ˆà¹‰à¸²à¸‚à¸­à¸‡à¸ªà¸´à¸—à¸˜à¸´à¹Œ</th>
                            <th className="p-3">à¸§à¸±à¸™à¸›à¸´à¸”à¹€à¸„à¸ª</th>
                            <th className="p-3">à¸à¸³à¸«à¸™à¸”à¸—à¸³à¸¥à¸²à¸¢</th>
                            <th className="p-3">à¸ªà¸–à¸²à¸™à¸°à¸ˆà¸±à¸”à¹€à¸à¹‡à¸š</th>
                            <th className="p-3 text-center">à¸„à¸³à¸ªà¸±à¹ˆà¸‡à¸—à¸³à¸¥à¸²à¸¢</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {filteredRequests.filter(r => ['Closed', 'Delivered', 'Destroyed'].includes(r.status)).map((req) => {
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
                                    {req.status === 'Destroyed' ? 'à¸—à¸³à¸¥à¸²à¸¢à¸–à¸²à¸§à¸£à¹à¸¥à¹‰à¸§' : req.legalHold ? 'Legal Hold (à¸«à¹‰à¸²à¸¡à¸¥à¸š)' : 'à¸­à¸¢à¸¹à¹ˆà¹ƒà¸™à¸à¸³à¸«à¸™à¸”à¸£à¸±à¸à¸©à¸²'}
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
                                    <span>à¸¥à¸šà¸—à¸³à¸¥à¸²à¸¢à¸–à¸²à¸§à¸£</span>
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
                        <span className="text-xs font-bold text-slate-800">à¸ªà¸¡à¸¸à¸”à¸šà¸±à¸™à¸—à¸¶à¸à¸à¸´à¸ˆà¸à¸£à¸£à¸¡à¸£à¸°à¸šà¸š (Append-only System Audit Logs)</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">à¸šà¸±à¸™à¸—à¸¶à¸à¸—à¸¸à¸à¸à¸²à¸£à¹€à¸›à¸´à¸”à¸”à¸¹à¹„à¸Ÿà¸¥à¹Œ, à¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™à¹à¸›à¸¥à¸‡à¸ªà¸–à¸²à¸™à¸° à¹à¸¥à¸°à¸ªà¸´à¸—à¸˜à¸´à¹Œà¹€à¸‚à¹‰à¸²à¸–à¸¶à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸žà¸£à¹‰à¸­à¸¡à¸¥à¸²à¸¢à¹€à¸‹à¹‡à¸™à¸”à¸´à¸ˆà¸´à¸—à¸±à¸¥à¹€à¸Šà¹‡à¸„à¸‹à¸±à¸¡</p>
                      </div>
                      
                      <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                        <div className="relative flex-1 sm:w-64">
                          <input
                            type="text"
                            placeholder="à¸„à¹‰à¸™à¸«à¸²à¸Šà¸·à¹ˆà¸­, à¸à¸²à¸£à¸à¸£à¸°à¸—à¸³, à¸«à¸£à¸·à¸­à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”..."
                            value={auditSearchTerm}
                            onChange={(e) => {
                              setAuditSearchTerm(e.target.value);
                              setAuditPage(1);
                            }}
                            className="w-full text-[11px] border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleExportAuditCSV}
                          className="bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-semibold py-1.5 px-3 rounded flex items-center gap-1.5 transition whitespace-nowrap"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                          <span>à¸ªà¹ˆà¸‡à¸­à¸­à¸ CSV</span>
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-slate-100/50 border-b border-slate-200 text-slate-500 font-bold">
                            <th className="p-3">à¸§à¸±à¸™à¹à¸¥à¸°à¹€à¸§à¸¥à¸² (Timestamp)</th>
                            <th className="p-3">à¸œà¸¹à¹‰à¸›à¸à¸´à¸šà¸±à¸•à¸´à¸‡à¸²à¸™ (User)</th>
                            <th className="p-3">à¸Šà¸·à¹ˆà¸­à¹€à¸ˆà¹‰à¸²à¸‚à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥ (Data Subject Name)</th>
                            <th className="p-3">à¸šà¸—à¸šà¸²à¸—</th>
                            <th className="p-3 text-center">à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                          {(() => {
                            const filtered = auditLogs.filter(log => 
                              log.actorName.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
                              log.action.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
                              log.details.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
                              log.ipAddress.toLowerCase().includes(auditSearchTerm.toLowerCase())
                            );
                            const totalPages = Math.ceil(filtered.length / auditLogsPerPage);
                            const startIndex = (auditPage - 1) * auditLogsPerPage;
                            const paginated = filtered.slice(startIndex, startIndex + auditLogsPerPage);

                            return (
                              <>
                                {paginated.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400 font-sans">
                                      à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸—à¸µà¹ˆà¸„à¹‰à¸™à¸«à¸²
                                    </td>
                                  </tr>
                                ) : (
                                  paginated.map((log) => {
                                    // Lookup Request to find the Data Subject Name
                                    const matchedReq = requests.find(r => r.id === log.requestId || (log.requestTrackingNo && r.trackingNo === log.requestTrackingNo));
                                    const dataSubjectName = matchedReq ? `${matchedReq.requester.firstName} ${matchedReq.requester.lastName}` : '-';

                                    return (
                                      <tr key={log.id} className="hover:bg-slate-50 transition">
                                        <td className="p-3 whitespace-nowrap text-slate-500">{new Date(log.timestamp).toLocaleString('th-TH')}</td>
                                        <td className="p-3 font-sans font-bold text-slate-800">{log.actorName}</td>
                                        <td className="p-3 font-sans text-slate-700">{dataSubjectName}</td>
                                        <td className="p-3 font-sans uppercase font-bold text-[9px] text-slate-400">{log.actorRole}</td>
                                        <td className="p-3 text-center">
                                          <button
                                            onClick={() => setSelectedAuditLog(log)}
                                            className="text-brand-600 hover:text-brand-700 underline text-[11px] font-sans font-semibold"
                                          >
                                            à¸”à¸¹à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”
                                          </button>
                                        </td>

                                      </tr>
                                    );
                                  })
                                )}
                                
                                {totalPages > 1 && (
                                  <tr>
                                    <td colSpan={7} className="p-3 bg-slate-50 border-t border-slate-200 font-sans">
                                      <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-slate-500">
                                          à¹à¸ªà¸”à¸‡ {startIndex + 1} à¸–à¸¶à¸‡ {Math.min(startIndex + auditLogsPerPage, filtered.length)} à¸ˆà¸²à¸à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸” {filtered.length} à¸£à¸²à¸¢à¸à¸²à¸£
                                        </span>
                                        <div className="flex gap-1">
                                          <button 
                                            onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                                            disabled={auditPage === 1}
                                            className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50"
                                          >
                                            à¸à¹ˆà¸­à¸™à¸«à¸™à¹‰à¸²
                                          </button>
                                          <span className="px-3 py-1 font-bold text-slate-700">
                                            à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆ {auditPage} / {totalPages}
                                          </span>
                                          <button 
                                            onClick={() => setAuditPage(p => Math.min(totalPages, p + 1))}
                                            disabled={auditPage === totalPages}
                                            className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50"
                                          >
                                            à¸–à¸±à¸”à¹„à¸›
                                          </button>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>

                  {/* Audit Log Modal */}
                  {selectedAuditLog && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
                          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <Activity className="h-4 w-4 text-brand-600" />
                            à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”à¸à¸²à¸£à¸—à¸³à¸‡à¸²à¸™à¸‚à¸­à¸‡à¸£à¸°à¸šà¸š (Audit Log)
                          </h2>
                          <button
                            onClick={() => setSelectedAuditLog(null)}
                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="p-6 overflow-y-auto font-mono text-[11px] text-slate-700 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-slate-400 font-sans block mb-1">à¸§à¸±à¸™à¹à¸¥à¸°à¹€à¸§à¸¥à¸² (Timestamp)</span>
                              <span className="font-bold text-slate-800">{new Date(selectedAuditLog.timestamp).toLocaleString('th-TH')}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-sans block mb-1">à¸œà¸¹à¹‰à¸›à¸à¸´à¸šà¸±à¸•à¸´à¸‡à¸²à¸™ (User)</span>
                              <span className="font-bold text-slate-800">{selectedAuditLog.actorName}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-sans block mb-1">à¸šà¸—à¸šà¸²à¸— (Role)</span>
                              <span className="uppercase text-brand-600 font-bold">{selectedAuditLog.actorRole}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-sans block mb-1">à¹€à¸¥à¸‚à¹„à¸­à¸žà¸µ (IP Address)</span>
                              <span>{selectedAuditLog.ipAddress}</span>
                            </div>
                          </div>
                          
                          <div className="border-t border-slate-100 pt-4">
                            <span className="text-slate-400 font-sans block mb-1">à¸à¸²à¸£à¸à¸£à¸°à¸—à¸³ (Action)</span>
                            <span className="text-brand-700 font-bold text-[12px]">{selectedAuditLog.action}</span>
                          </div>
                          
                          <div className="border-t border-slate-100 pt-4">
                            <span className="text-slate-400 font-sans block mb-1">à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸” (Details)</span>
                            <div className="bg-slate-50 p-3 rounded border border-slate-200 whitespace-pre-wrap font-sans text-slate-700 text-sm">
                              {selectedAuditLog.details}
                            </div>
                          </div>

                          <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-slate-400 font-sans block mb-1">à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸„à¸§à¸²à¸¡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢ (Integrity Check)</span>
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-[10px] font-bold">
                                <CheckCircle className="h-3 w-3" />
                                Verified ({selectedAuditLog.checksum})
                              </div>
                            </div>
                            {selectedAuditLog.requestId && (
                              <div>
                                <span className="text-slate-400 font-sans block mb-1">à¸£à¸«à¸±à¸ªà¸­à¹‰à¸²à¸‡à¸­à¸´à¸‡à¸„à¸³à¸‚à¸­ (Request ID)</span>
                                <span>{selectedAuditLog.requestTrackingNo || selectedAuditLog.requestId}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
                          <button
                            onClick={() => setSelectedAuditLog(null)}
                            className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-1.5 rounded font-semibold text-xs transition"
                          >
                            à¸›à¸´à¸”à¸«à¸™à¹‰à¸²à¸•à¹ˆà¸²à¸‡
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

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
          Â© {new Date().getFullYear() + 543} à¸£à¸°à¸šà¸šà¸šà¸£à¸´à¸«à¸²à¸£à¸ˆà¸±à¸”à¸à¸²à¸£à¸à¸²à¸£à¸›à¸à¸´à¸šà¸±à¸•à¸´à¸•à¸²à¸¡à¸à¸Žà¸«à¸¡à¸²à¸¢à¸„à¸¸à¹‰à¸¡à¸„à¸£à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥ (PDPA Compliance Management)
        </p>
        <p className="text-[11px] text-brand-400 font-medium">
          à¸ªà¸‡à¸§à¸™à¸¥à¸´à¸‚à¸ªà¸´à¸—à¸˜à¸´à¹Œ Â© à¸šà¸£à¸´à¸©à¸±à¸— à¸¢à¸¹à¹‚à¸—à¹€à¸›à¸µà¸¢ à¹€à¸­à¹‡à¸™à¹à¸­à¸™à¸”à¹Œà¹€à¸­à¹‡à¸™ à¸ˆà¸³à¸à¸±à¸” (Utopia N&N Co., Ltd.) All Rights Reserved.
        </p>
        <div className="relative flex flex-col md:flex-row justify-center items-center w-full">
          <p className="text-[10px] text-slate-500">
            à¸žà¸±à¸’à¸™à¸²à¸ªà¸­à¸”à¸„à¸¥à¹‰à¸­à¸‡à¸•à¸²à¸¡à¸¡à¸²à¸•à¸£à¸à¸²à¸™à¸žà¸£à¸°à¸£à¸²à¸Šà¸šà¸±à¸à¸à¸±à¸•à¸´à¸„à¸¸à¹‰à¸¡à¸„à¸£à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥ à¸ž.à¸¨. 2562 (à¸ªà¸´à¸—à¸˜à¸´à¹Œà¹ƒà¸™à¸à¸²à¸£à¹€à¸‚à¹‰à¸²à¸–à¸¶à¸‡à¹à¸¥à¸°à¸£à¸±à¸šà¸ªà¸³à¹€à¸™à¸²à¸•à¸²à¸¡à¸¡à¸²à¸•à¸£à¸² 30)
          </p>
          {typeof __APP_VERSION__ !== 'undefined' && (
            <span className="md:absolute md:right-0 text-[9px] text-slate-400/60 hover:text-slate-300 transition-colors font-mono mt-2 md:mt-0">
              v1.0.0-beta â€¢ rev: {__APP_VERSION__} ({__BUILD_DATE__})
            </span>
          )}
        </div>
      </footer>

      {/* --- MOCK OTP MODAL --- */}
      {showOtpModal && trackedRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="text-center space-y-1">
              <Mail className="h-10 w-10 text-brand-600 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">à¸à¸²à¸£à¸¢à¸·à¸™à¸¢à¸±à¸™à¸£à¸«à¸±à¸ª OTP à¹€à¸žà¸·à¹ˆà¸­à¸„à¸§à¸²à¸¡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢</h4>
              <p className="text-xs text-slate-400">
                à¸£à¸°à¸šà¸šà¸ˆà¸°à¸ªà¹ˆà¸‡à¸£à¸«à¸±à¸ª OTP à¹„à¸›à¸—à¸µà¹ˆà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸•à¸´à¸”à¸•à¹ˆà¸­ ({maskEmail(getContactInfo(trackedRequest).email)})
              </p>
            </div>

            {!otpSent ? (
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    const contact = getContactInfo(trackedRequest);
                    const success = await triggerRealOtp(contact.email, contact.phone, trackedRequest.trackingNo);
                    if (success) {
                      setOtpSent(true);
                    }
                  }}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 rounded-lg text-sm transition"
                >
                  à¸„à¸¥à¸´à¸à¹€à¸žà¸·à¹ˆà¸­à¸ªà¹ˆà¸‡ OTP à¹„à¸›à¸¢à¸±à¸‡à¸­à¸µà¹€à¸¡à¸¥
                </button>
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="w-full text-slate-500 hover:text-slate-700 text-xs py-1"
                >
                  à¸¢à¸à¹€à¸¥à¸´à¸
                </button>
              </div>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs text-emerald-600 font-bold block text-center">
                    âœ“ à¸ªà¹ˆà¸‡ OTP à¸ªà¸³à¹€à¸£à¹‡à¸ˆà¹à¸¥à¹‰à¸§ à¸à¸£à¸¸à¸“à¸²à¹€à¸Šà¹‡à¸„à¸­à¸µà¹€à¸¡à¸¥ ({maskEmail(getContactInfo(trackedRequest).email)})
                  </label>
                  <label className="text-xs text-slate-600 block text-center mt-2">à¸à¸£à¸­à¸à¸£à¸«à¸±à¸ªà¸¢à¸·à¸™à¸¢à¸±à¸™ OTP 6 à¸«à¸¥à¸±à¸</label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    autoComplete="off"
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
                  à¸¢à¸·à¸™à¸¢à¸±à¸™à¹€à¸žà¸·à¹ˆà¸­à¸•à¸´à¸”à¸•à¸²à¸¡à¸ªà¸–à¸²à¸™à¸°à¸ªà¸´à¸—à¸˜à¸´à¹Œ
                </button>
                <button
                  type="button"
                  onClick={() => { setShowOtpModal(false); setOtpSent(false); }}
                  className="w-full text-slate-500 hover:text-slate-700 text-xs py-1 transition"
                >
                  à¸¢à¸à¹€à¸¥à¸´à¸
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- MOCK WITHDRAW REQUEST OTP MODAL --- */}
      {showWithdrawModal && trackedRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="text-center space-y-1">
              <AlertTriangle className="h-10 w-10 text-rose-600 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">à¸‚à¸­à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¸–à¸­à¸™à¸„à¸³à¸£à¹‰à¸­à¸‡à¸‚à¸­à¹€à¸‚à¹‰à¸²à¸–à¸¶à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥ (Withdraw Request)</h4>
              <p className="text-xs text-slate-500">
                à¹€à¸¥à¸‚à¸„à¸³à¸‚à¸­: <strong className="text-slate-800">{trackedRequest.trackingNo}</strong>
              </p>
            </div>

            {withdrawStep === 'reason' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!withdrawReasonText.trim()) {
                    showNotify('âš ï¸ à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸à¹€à¸«à¸•à¸¸à¸œà¸¥à¸„à¸§à¸²à¸¡à¸ˆà¸³à¹€à¸›à¹‡à¸™à¹ƒà¸™à¸à¸²à¸£à¸‚à¸­à¸–à¸­à¸™à¸ªà¸´à¸—à¸˜à¸´à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸‚à¸­à¸™à¸µà¹‰');
                    return;
                  }
                  const contact = getContactInfo(trackedRequest);
                  triggerRealOtp(contact.email, contact.phone, trackedRequest.trackingNo);
                  setWithdrawStep('otp');
                }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    à¹€à¸«à¸•à¸¸à¸œà¸¥à¸„à¸§à¸²à¸¡à¸ˆà¸³à¹€à¸›à¹‡à¸™à¹ƒà¸™à¸à¸²à¸£à¸‚à¸­à¸–à¸­à¸™à¸„à¸³à¸£à¹‰à¸­à¸‡à¸‚à¸­ <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="à¸à¸£à¸¸à¸“à¸²à¸£à¸°à¸šà¸¸à¹€à¸«à¸•à¸¸à¸œà¸¥à¸à¸²à¸£à¸¢à¸à¹€à¸¥à¸´à¸à¸„à¸³à¸‚à¸­..."
                    value={withdrawReasonText}
                    onChange={(e) => setWithdrawReasonText(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawModal(false)}
                    className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg text-xs transition"
                  >
                    à¸¢à¸à¹€à¸¥à¸´à¸
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-lg text-xs transition shadow-sm"
                  >
                    à¸–à¸±à¸”à¹„à¸› (à¸£à¸±à¸šà¸£à¸«à¸±à¸ª OTP)
                  </button>
                </div>
              </form>
            )}

            {withdrawStep === 'otp' && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  
                  const contact = getContactInfo(trackedRequest);
                  const isValid = await verifyRealOtp(contact.email, contact.phone, withdrawOtpCode, trackedRequest.trackingNo);
                  if (!isValid) return;
                  
                  handleWithdrawRequest(trackedRequest.id, withdrawReasonText);
                  setShowWithdrawModal(false);
                  showNotify('âœ… à¸£à¸°à¸šà¸šà¸—à¸³à¸à¸²à¸£à¸–à¸­à¸™à¸„à¸³à¸£à¹‰à¸­à¸‡à¸‚à¸­à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§');
                }}
                className="space-y-4"
              >
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-center space-y-1">
                  <span className="text-xs font-bold text-rose-900 block">à¸£à¸°à¸šà¸šà¸ªà¹ˆà¸‡à¸£à¸«à¸±à¸ª OTP 6 à¸«à¸¥à¸±à¸à¹„à¸›à¸¢à¸±à¸‡à¸­à¸µà¹€à¸¡à¸¥à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§</span>
                  <span className="text-[11px] text-rose-700 block">à¸ªà¹ˆà¸‡à¸–à¸¶à¸‡: {maskEmail(getContactInfo(trackedRequest).email)}</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-600 block text-center">à¸à¸£à¸­à¸à¸£à¸«à¸±à¸ªà¸¢à¸·à¸™à¸¢à¸±à¸™ OTP 6 à¸«à¸¥à¸±à¸</label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="XXXXXX"
                    value={withdrawOtpCode}
                    onChange={(e) => setWithdrawOtpCode(e.target.value)}
                    className="w-full text-center font-mono font-bold text-base tracking-widest border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setWithdrawStep('reason')}
                    className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg text-xs transition"
                  >
                    à¸¢à¹‰à¸­à¸™à¸à¸¥à¸±à¸š
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-lg text-xs transition shadow-sm"
                  >
                    à¸¢à¸·à¸™à¸¢à¸±à¸™à¸–à¸­à¸™à¸„à¸³à¸£à¹‰à¸­à¸‡à¸‚à¸­
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- ENTERPRISE SEARCH LOOKUP MODAL --- */}
      {showSearchLookupModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="text-center space-y-1">
              <div className="h-12 w-12 rounded-2xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center mx-auto mb-2">
                <Search className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">à¸„à¹‰à¸™à¸«à¸²à¹à¸¥à¸°à¸•à¸´à¸”à¸•à¸²à¸¡à¸ªà¸–à¸²à¸™à¸°à¸„à¸³à¸£à¹‰à¸­à¸‡à¸‚à¸­</h4>
              <p className="text-xs text-slate-500">
                à¸£à¸°à¸šà¸šà¸„à¹‰à¸™à¸«à¸²à¸­à¸±à¸ˆà¸‰à¸£à¸´à¸¢à¸° (à¸ªà¸²à¸¡à¸²à¸£à¸–à¸£à¸°à¸šà¸¸à¹€à¸¥à¸‚à¸„à¸³à¸‚à¸­à¹€à¸•à¹‡à¸¡ à¸«à¸£à¸·à¸­à¸žà¸´à¸¡à¸žà¹Œà¹€à¸‰à¸žà¸²à¸°à¸•à¸±à¸§à¹€à¸¥à¸‚/à¸£à¸«à¸±à¸ªà¸¢à¹ˆà¸­à¹„à¸”à¹‰)
              </p>
            </div>

            {searchLookupResults && searchLookupResults.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-brand-50 border border-brand-100 p-3 rounded-xl">
                  <span className="text-xs text-brand-800 font-medium">
                    à¸žà¸šà¸„à¸³à¸‚à¸­à¸—à¸µà¹ˆà¸•à¸£à¸‡à¸à¸±à¸šà¹€à¸‡à¸·à¹ˆà¸­à¸™à¹„à¸‚à¸ˆà¸³à¸™à¸§à¸™ {searchLookupResults.length} à¸£à¸²à¸¢à¸à¸²à¸£ à¹‚à¸›à¸£à¸”à¸„à¸¥à¸´à¸à¹€à¸¥à¸·à¸­à¸à¸£à¸²à¸¢à¸à¸²à¸£à¸—à¸µà¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡:
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {searchLookupResults.map(req => (
                    <button
                      key={req.id}
                      onClick={() => {
                        setTrackNo(req.trackingNo);
                        setTrackedRequest(req);
                        setShowSearchLookupModal(false);
                        setOtpSent(false);
                        setShowOtpModal(true);
                      }}
                      className="w-full text-left bg-slate-50 hover:bg-brand-50 border border-slate-200 hover:border-brand-300 p-3 rounded-xl transition flex flex-col gap-1"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800 text-sm">{req.trackingNo}</span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                          {req.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex justify-between mt-1">
                        <span>à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™: {req.requester?.firstName?.substring(0, 1) || '*'}***** {req.requester?.lastName?.substring(0, 1) || '*'}*****</span>
                        <span>à¸§à¸±à¸™à¸—à¸µà¹ˆ: {req.submissionDate ? new Date(req.submissionDate).toLocaleDateString('th-TH') : '-'}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setSearchLookupResults(null)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition"
                  >
                    à¸à¸¥à¸±à¸šà¹„à¸›à¸„à¹‰à¸™à¸«à¸²à¹ƒà¸«à¸¡à¹ˆ
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleTrackSubmit(e, searchKeyword);
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    à¸žà¸´à¸¡à¸žà¹Œà¸„à¸³à¸„à¹‰à¸™à¸«à¸² à¸«à¸£à¸·à¸­ à¹€à¸¥à¸‚à¸—à¸µà¹ˆà¸„à¸³à¸‚à¸­ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="à¸•à¸±à¸§à¸­à¸¢à¹ˆà¸²à¸‡: 0008, DOPA, REQ-DOPA-2026-0008..."
                    value={searchKeyword}
                    onChange={(e) => {
                      setSearchKeyword(e.target.value);
                      setTrackingError(null);
                    }}
                    className="w-full text-xs font-semibold border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900 shadow-inner"
                  />
                </div>

                {trackingError && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-rose-600 text-xs font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                    <span>{trackingError}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSearchLookupModal(false);
                      setSearchLookupResults(null);
                    }}
                    className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition"
                  >
                    à¸¢à¸à¹€à¸¥à¸´à¸
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Search className="h-4 w-4" />
                    <span>à¸„à¹‰à¸™à¸«à¸²à¸‚à¹‰à¸­à¸¡à¸¹à¸¥</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* --- ENTERPRISE ATTACHMENT DOCUMENT PREVIEW MODAL --- */}
      {previewAttachment && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[80] animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header Toolbar */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-600 text-white rounded-xl">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">{previewAttachment.name}</h3>
                  <p className="text-[10px] text-slate-400">
                    à¸‚à¸™à¸²à¸”à¹„à¸Ÿà¸¥à¹Œ: {Math.round(previewAttachment.size / 1024)} KB 
                    {previewAttachment.isMasked && <span className="ml-2 text-emerald-400 font-bold">â€¢ à¸œà¹ˆà¸²à¸™à¸à¸²à¸£ Masked à¸›à¸´à¸”à¸šà¸±à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥</span>}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold h-8 w-8 rounded-full flex items-center justify-center transition"
              >
                âœ•
              </button>
            </div>

            {/* Viewer Content Area */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-100 flex items-center justify-center min-h-[350px]">
              {previewAttachment.fileUrl?.startsWith('data:application/pdf') || previewAttachment.name.toLowerCase().endsWith('.pdf') ? (
                <div className="w-full h-[70vh] bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col">
                  <iframe 
                    src={previewAttachment.fileUrl || ''} 
                    className="w-full flex-1 border-0"
                    title={previewAttachment.name}
                  />
                  <div className="bg-slate-50 border-t border-slate-200 p-2 text-center">
                    <span className="text-[10px] text-slate-400 font-mono">âœ“ à¹à¸ªà¸”à¸‡à¸œà¸¥à¹€à¸­à¸à¸ªà¸²à¸£ PDF (à¹„à¸¡à¹ˆà¸­à¸™à¸¸à¸à¸²à¸•à¹ƒà¸«à¹‰à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”)</span>
                  </div>
                </div>
              ) : (previewAttachment.fileUrl?.startsWith('data:image') || previewAttachment.fileUrl?.startsWith('blob:') || previewAttachment.name.toLowerCase().endsWith('.png') || previewAttachment.name.toLowerCase().endsWith('.jpg')) ? (
                <div className="bg-white p-3 rounded-xl shadow-md border border-slate-200 max-w-full text-center space-y-2">
                  <img
                    src={previewAttachment.fileUrl || ''}
                    alt={previewAttachment.name}
                    className="max-h-[60vh] mx-auto object-contain rounded-lg border border-slate-100"
                  />
                  <span className="text-[10px] text-slate-400 block font-mono">
                    âœ“ à¹à¸ªà¸”à¸‡à¸œà¸¥à¹„à¸Ÿà¸¥à¹Œà¸ à¸²à¸žà¹€à¸­à¸à¸ªà¸²à¸£à¸ªà¸´à¸—à¸˜à¸´à¹Œà¸„à¸§à¸²à¸¡à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”à¸ªà¸¹à¸‡
                  </span>
                </div>
              ) : (
                <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 text-center max-w-md space-y-3">
                  <FileText className="h-16 w-16 text-brand-600 mx-auto" />
                  <h4 className="font-bold text-slate-800 text-sm">{previewAttachment.name}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¹à¸ªà¸”à¸‡à¸•à¸±à¸§à¸­à¸¢à¹ˆà¸²à¸‡à¹„à¸Ÿà¸¥à¹Œà¸™à¸µà¹‰à¹„à¸”à¹‰ (à¸£à¸­à¸‡à¸£à¸±à¸šà¹€à¸‰à¸žà¸²à¸° PDF à¹à¸¥à¸°à¸£à¸¹à¸›à¸ à¸²à¸ž)
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="bg-white border-t border-slate-200 px-6 py-3.5 flex justify-between items-center">
              <span className="text-[11px] text-slate-400 font-medium">
                ðŸ”’ à¸šà¸±à¸™à¸—à¸¶à¸à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸²à¸£à¹€à¸›à¸´à¸”à¸”à¸¹à¹€à¸­à¸à¸ªà¸²à¸£à¹€à¸‚à¹‰à¸²à¸•à¸²à¸£à¸²à¸‡ Audit Log à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢
              </span>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 px-6 rounded-xl text-xs transition shadow-sm"
              >
                à¹€à¸ªà¸£à¹‡à¸ˆà¸ªà¸´à¹‰à¸™à¸à¸²à¸£à¸•à¸£à¸§à¸ˆà¸”à¸¹
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SUBMISSION EMAIL OTP VERIFICATION MODAL --- */}
      {showSubmissionOtpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto border border-brand-200">
                <Mail className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-base">à¸¢à¸·à¸™à¸¢à¸±à¸™à¸•à¸±à¸§à¸•à¸™à¸ªà¹ˆà¸‡à¸„à¸³à¸‚à¸­à¸”à¹‰à¸§à¸¢à¸£à¸«à¸±à¸ª OTP à¸—à¸²à¸‡à¸­à¸µà¹€à¸¡à¸¥</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                à¸£à¸°à¸šà¸šà¹„à¸”à¹‰à¸ªà¹ˆà¸‡à¸£à¸«à¸±à¸ªà¸¢à¸·à¸™à¸¢à¸±à¸™à¸•à¸±à¸§à¸•à¸™ OTP (6 à¸«à¸¥à¸±à¸) à¹„à¸›à¸¢à¸±à¸‡à¸­à¸µà¹€à¸¡à¸¥à¸‚à¸­à¸‡
                <strong className="text-brand-700 block text-xs mt-0.5">
                  {reqType === 'self' ? `à¹€à¸ˆà¹‰à¸²à¸‚à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥ (${maskEmail(requesterForm.email)})` : `à¸œà¸¹à¹‰à¸£à¸±à¸šà¸¡à¸­à¸šà¸­à¸³à¸™à¸²à¸ˆ (${maskEmail(repForm.email)})`}
                </strong>
              </p>
            </div>



            <form onSubmit={handleFinalizeSubmissionOtp} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block text-center">
                  à¸à¸£à¸­à¸à¸£à¸«à¸±à¸ª OTP 6 à¸«à¸¥à¸±à¸à¸—à¸µà¹ˆà¹„à¸”à¹‰à¸£à¸±à¸šà¸—à¸²à¸‡à¸­à¸µà¹€à¸¡à¸¥ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="XXXXXX"
                  value={submissionOtpCode}
                  onChange={(e) => setSubmissionOtpCode(e.target.value)}
                  className="w-full text-center font-mono font-bold text-lg border border-slate-300 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 tracking-widest bg-slate-50"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmissionOtpModal(false)}
                  className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition"
                >
                  à¸¢à¸à¹€à¸¥à¸´à¸
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>à¸¢à¸·à¸™à¸¢à¸±à¸™ OTP à¹à¸¥à¸°à¸ªà¹ˆà¸‡à¸„à¸³à¸‚à¸­</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MANUAL ENTRY SUCCESS MODAL --- */}
      {manualEntrySuccessTrackingNo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full space-y-6 shadow-2xl text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200 shadow-inner">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 text-xl">à¸šà¸±à¸™à¸—à¸¶à¸à¸„à¸³à¸£à¹‰à¸­à¸‡à¸ªà¸³à¹€à¸£à¹‡à¸ˆ!</h4>
              <p className="text-sm text-slate-600">
                à¸„à¸¸à¸“à¸ªà¸²à¸¡à¸²à¸£à¸–à¸™à¸³à¹€à¸¥à¸‚à¸•à¸´à¸”à¸•à¸²à¸¡à¸™à¸µà¹‰à¹à¸ˆà¹‰à¸‡à¹ƒà¸«à¹‰à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸£à¹‰à¸­à¸‡à¸—à¸£à¸²à¸š à¹€à¸žà¸·à¹ˆà¸­à¹ƒà¸Šà¹‰à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸ªà¸–à¸²à¸™à¸°à¹„à¸”à¹‰à¸—à¸¸à¸à¸Šà¹ˆà¸­à¸‡à¸—à¸²à¸‡
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-inner">
              <div className="text-xs text-slate-500 font-bold mb-2">à¹€à¸¥à¸‚à¸•à¸´à¸”à¸•à¸²à¸¡à¸„à¸³à¸‚à¸­ (Tracking Number)</div>
              <div className="font-mono text-3xl font-black text-brand-700 tracking-wider">
                {manualEntrySuccessTrackingNo}
              </div>
            </div>

            <button
              onClick={() => setManualEntrySuccessTrackingNo(null)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-sm transition shadow-md"
            >
              à¸›à¸´à¸”à¸«à¸™à¹‰à¸²à¸•à¹ˆà¸²à¸‡ (Close)
            </button>
          </div>
        </div>
      )}
      
      {/* --- EXTEND SLA MODAL --- */}
      {extendSlaModal.open && extendSlaModal.reqId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                à¸‚à¸¢à¸²à¸¢à¸£à¸°à¸¢à¸°à¹€à¸§à¸¥à¸²à¸ªà¸·à¸šà¸„à¹‰à¸™à¸‚à¹‰à¸­à¸¡à¸¹à¸¥ (+30 à¸§à¸±à¸™)
              </h3>
              <button
                onClick={() => setExtendSlaModal({ open: false, reqId: null, reason: '' })}
                className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 flex-1">
              <p className="text-sm text-slate-600">
                à¸£à¸°à¸šà¸¸à¹€à¸«à¸•à¸¸à¸ˆà¸³à¹€à¸›à¹‡à¸™à¸«à¸£à¸·à¸­à¹€à¸«à¸•à¸¸à¸‚à¸±à¸”à¸‚à¹‰à¸­à¸‡à¹ƒà¸™à¸à¸²à¸£à¸‚à¸¢à¸²à¸¢à¸£à¸°à¸¢à¸°à¹€à¸§à¸¥à¸²à¸ªà¸·à¸šà¸„à¹‰à¸™à¸‚à¹‰à¸­à¸¡à¸¹à¸¥:
              </p>
              <textarea
                autoFocus
                placeholder="à¸­à¸˜à¸´à¸šà¸²à¸¢à¹€à¸«à¸•à¸¸à¸œà¸¥..."
                value={extendSlaModal.reason}
                onChange={(e) => setExtendSlaModal({ ...extendSlaModal, reason: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-amber-500 min-h-[100px] resize-none"
              ></textarea>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 mt-auto">
              <button
                type="button"
                onClick={() => setExtendSlaModal({ open: false, reqId: null, reason: '' })}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                à¸¢à¸à¹€à¸¥à¸´à¸
              </button>
              <button
                type="button"
                disabled={!extendSlaModal.reason.trim()}
                onClick={() => {
                  handleExtendSla(extendSlaModal.reqId!, extendSlaModal.reason);
                  setExtendSlaModal({ open: false, reqId: null, reason: '' });
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-md"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¸‚à¸¢à¸²à¸¢à¹€à¸§à¸¥à¸²</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EXPORT CONFIRMATION MODAL --- */}
      {downloadConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full space-y-4 shadow-2xl flex flex-col">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-base">à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¸™à¸³à¸­à¸­à¸à¹€à¸­à¸à¸ªà¸²à¸£à¸„à¸§à¸²à¸¡à¸¥à¸±à¸š?</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                à¸„à¸¸à¸“à¸à¸³à¸¥à¸±à¸‡à¸ˆà¸°à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¹„à¸Ÿà¸¥à¹Œ <strong className="text-slate-800">{downloadConfirm.filename}</strong> à¸­à¸­à¸à¸ˆà¸²à¸à¸£à¸°à¸šà¸š<br/>
                <span className="text-rose-600 font-bold">à¸à¸²à¸£à¸à¸£à¸°à¸—à¸³à¸™à¸µà¹‰à¸ˆà¸°à¸–à¸¹à¸à¸šà¸±à¸™à¸—à¸¶à¸à¹ƒà¸™ Audit Log à¹€à¸žà¸·à¹ˆà¸­à¸à¸²à¸£à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸š</span>
              </p>
            </div>
            <div className="flex gap-3 pt-4 mt-auto">
              <button
                type="button"
                onClick={() => setDownloadConfirm(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition"
              >
                à¸¢à¸à¹€à¸¥à¸´à¸
              </button>
              <button
                type="button"
                onClick={executeFileDownload}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg shadow-emerald-500/30 flex justify-center items-center gap-2"
              >
                <Download className="h-4 w-4" />
                à¸¢à¸·à¸™à¸¢à¸±à¸™à¹à¸¥à¸°à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Delivery Preview Modal */}
      {showDeliveryPreview && activeRequestObj && (() => {
        const previewResult = activeUser!.role === 'approver' && activeRequestObj.decision ? activeRequestObj.decision.result : decisionType;
        const previewReasons = activeUser!.role === 'approver' && activeRequestObj.decision ? activeRequestObj.decision.reasons : [config?.rejectionReasons.find(r => r.code === denialBasisCode)?.labelTh || '...à¹€à¸«à¸•à¸¸à¸œà¸¥à¸ˆà¸³à¸¥à¸­à¸‡...'];
        const previewLegalBasis = activeUser!.role === 'approver' && activeRequestObj.decision ? activeRequestObj.decision.legalBasisText : (config?.rejectionReasons.find(r => r.code === denialBasisCode)?.labelTh || '...à¸¡à¸²à¸•à¸£à¸²à¸à¸Žà¸«à¸¡à¸²à¸¢à¸ˆà¸³à¸¥à¸­à¸‡...');
        const previewDpoName = activeUser!.role === 'approver' && activeRequestObj.decision?.dpoName ? activeRequestObj.decision.dpoName : (activeUser?.fullNameTh || 'DPO Name');
        const previewDpoCheckedAt = activeUser!.role === 'approver' && activeRequestObj.decision?.dpoCheckedAt ? activeRequestObj.decision.dpoCheckedAt : new Date().toISOString();
        const templateId = previewResult === 'denied' || previewResult === 'no_data' ? 'temp_deny' : 'temp_approve';
        
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
            <div className="bg-slate-100 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-300 relative">
              <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <FileCheck2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">
                      {['Ready for Delivery', 'Delivered', 'Closed'].includes(activeRequestObj.status) ? 'à¹€à¸­à¸à¸ªà¸²à¸£à¸ªà¹ˆà¸‡à¸¡à¸­à¸š (Delivery Package)' : 'à¸•à¸±à¸§à¸­à¸¢à¹ˆà¸²à¸‡à¹€à¸­à¸à¸ªà¸²à¸£à¸ªà¹ˆà¸‡à¸¡à¸­à¸šà¸‰à¸šà¸±à¸šà¸£à¹ˆà¸²à¸‡ (Delivery Draft Preview)'}
                    </h2>
                    <p className="text-[11px] text-slate-300">
                      {['Ready for Delivery', 'Delivered', 'Closed'].includes(activeRequestObj.status) ? 'à¹€à¸­à¸à¸ªà¸²à¸£à¸‰à¸šà¸±à¸šà¸ªà¸¡à¸šà¸¹à¸£à¸“à¹Œà¸ªà¸³à¸«à¸£à¸±à¸šà¸ªà¹ˆà¸‡à¸¡à¸­à¸šà¹ƒà¸«à¹‰à¸œà¸¹à¹‰à¸¢à¸·à¹ˆà¸™à¸„à¸³à¸£à¹‰à¸­à¸‡' : 'à¸™à¸µà¹ˆà¸„à¸·à¸­à¹à¸šà¸šà¸ˆà¸³à¸¥à¸­à¸‡à¹€à¸­à¸à¸ªà¸²à¸£à¸—à¸µà¹ˆà¸ˆà¸°à¸–à¸¹à¸à¸ªà¹ˆà¸‡à¸­à¸­à¸à¸ˆà¸£à¸´à¸‡à¸«à¸¥à¸±à¸‡à¹„à¸”à¹‰à¸£à¸±à¸šà¸à¸²à¸£à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeliveryPreview(false)}
                  className="text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 p-2 rounded-full transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto bg-slate-100 flex flex-col items-center gap-6">
                <div className="w-full max-w-3xl flex justify-between items-center mb-[-10px]">
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                    à¸ªà¸–à¸²à¸™à¸°à¸ˆà¸³à¸¥à¸­à¸‡: {previewResult === 'approved' ? 'à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸„à¸³à¸‚à¸­' : previewResult === 'partially_approved' ? 'à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸šà¸²à¸‡à¸ªà¹ˆà¸§à¸™' : previewResult === 'no_data' ? 'à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥' : 'à¸›à¸à¸´à¹€à¸ªà¸˜à¸„à¸³à¸‚à¸­'}
                  </span>
                </div>
                
                <div className="w-full max-w-3xl bg-white shadow-lg shadow-slate-300/50 border border-slate-200 rounded-sm relative">
                  {/* Document header badge */}
                  {!['Ready for Delivery', 'Delivered', 'Closed'].includes(activeRequestObj.status) && (
                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-widest shadow-sm z-10">
                      DRAFT / à¸‰à¸šà¸±à¸šà¸£à¹ˆà¸²à¸‡
                    </div>
                  )}
                  <div className="scale-[0.95] origin-top">
                    <ThaiLetterView
                      request={{
                        ...activeRequestObj,
                        decision: {
                          result: previewResult as any,
                          reasons: previewReasons,
                          legalBasisText: previewLegalBasis,
                          dpoCheckedAt: previewDpoCheckedAt,
                          dpoName: previewDpoName,
                        }
                      }}
                      template={templates.find(t => t.id === templateId) || templates[0]}
                      signer={activeUser!}
                      orgData={organizations.find((o: any) => o.id === activeRequestObj.orgId) || null}
                    />
                  </div>
                </div>

                {/* Attachment summary */}
                {(previewResult === 'approved' || previewResult === 'partially_approved') && (
                  <div className="w-full max-w-3xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">à¹„à¸Ÿà¸¥à¹Œà¹€à¸­à¸à¸ªà¸²à¸£à¹à¸™à¸šà¹ƒà¸™à¸Šà¸¸à¸”à¸ªà¹ˆà¸‡à¸¡à¸­à¸š (Attachments in Package):</span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const jwtToken = sessionStorage.getItem('pdpa_token') || sessionStorage.getItem('pdpa_jwt_token') || '';
                            const response = await fetch(`/api/requests/${activeRequestObj.id}/download-package-admin`, {
                              headers: { 'Authorization': `Bearer ${jwtToken}` }
                            });
                            if (!response.ok) throw new Error('Download failed');
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `package_${activeRequestObj.trackingNo}.zip`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            window.URL.revokeObjectURL(url);
                          } catch (err) {
                            alert('à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¹„à¸Ÿà¸¥à¹Œà¹„à¸”à¹‰');
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
                      >
                        <Download className="h-3.5 w-3.5" />
                        à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¸Šà¸¸à¸”à¹„à¸Ÿà¸¥à¹Œà¸—à¸±à¹‰à¸‡à¸«à¸¡à¸” (ZIP Package)
                      </button>
                    </div>

                    {/* Auto-Generated Summary Report PDF */}
                    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center shrink-0">
                          <FileBadge className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800">à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¸—à¸µà¹ˆà¸œà¹ˆà¸²à¸™à¸à¸²à¸£à¸„à¹‰à¸™à¸«à¸²à¹à¸¥à¸°à¸£à¸§à¸šà¸£à¸§à¸¡à¹à¸¥à¹‰à¸§.pdf</div>
                          <div className="text-[11px] text-slate-500">
                            à¸£à¸²à¸¢à¸‡à¸²à¸™à¸ªà¸£à¸¸à¸›à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥ à¸žà¸£à¹‰à¸­à¸¡à¸£à¸²à¸¢à¸à¸²à¸£à¹„à¸Ÿà¸¥à¹Œà¹à¸™à¸šà¸ˆà¸²à¸à¸£à¸°à¸šà¸š {activeRequestObj.dataCollectionTasks?.length || 0} à¸£à¸°à¸šà¸š (à¸¡à¸µà¸¥à¸²à¸¢à¸™à¹‰à¸³à¸à¸³à¸à¸±à¸š DRAFT)
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded uppercase">
                          Auto-Generated
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const jwtToken = sessionStorage.getItem('pdpa_token') || sessionStorage.getItem('pdpa_jwt_token') || '';
                              const response = await fetch(`/api/requests/${activeRequestObj.id}/preview-attachment-pdf`, {
                                headers: { 'Authorization': `Bearer ${jwtToken}` }
                              });
                              if (!response.ok) throw new Error('Preview failed');
                              const blob = await response.blob();
                              const fileUrl = window.URL.createObjectURL(blob);
                              setPreviewAttachment({
                                name: 'à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¸—à¸µà¹ˆà¸œà¹ˆà¸²à¸™à¸à¸²à¸£à¸„à¹‰à¸™à¸«à¸²à¹à¸¥à¸°à¸£à¸§à¸šà¸£à¸§à¸¡à¹à¸¥à¹‰à¸§.pdf',
                                fileUrl: fileUrl,
                                size: blob.size || 24576,
                                isMasked: true,
                                watermarkApplied: previewResult !== 'approved'
                              });
                            } catch (err) {
                              alert('à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¹€à¸›à¸´à¸”à¹€à¸­à¸à¸ªà¸²à¸£à¹„à¸”à¹‰');
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition shadow-sm"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          à¹€à¸›à¸´à¸”à¸”à¸¹à¹€à¸­à¸à¸ªà¸²à¸£ (In-App)
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const jwtToken = sessionStorage.getItem('pdpa_token') || sessionStorage.getItem('pdpa_jwt_token') || '';
                              const response = await fetch(`/api/requests/${activeRequestObj.id}/preview-attachment-pdf`, {
                                headers: { 'Authorization': `Bearer ${jwtToken}` }
                              });
                              if (!response.ok) throw new Error('Preview failed');
                              const blob = await response.blob();
                              const fileUrl = window.URL.createObjectURL(blob);
                              window.open(fileUrl, '_blank');
                            } catch (err) {
                              alert('à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¹€à¸›à¸´à¸”à¹€à¸­à¸à¸ªà¸²à¸£à¹„à¸”à¹‰');
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                          title="à¹€à¸›à¸´à¸”à¹ƒà¸™à¹à¸—à¹‡à¸šà¹ƒà¸«à¸¡à¹ˆ"
                        >
                          â†— à¹à¸—à¹‡à¸šà¹ƒà¸«à¸¡à¹ˆ
                        </button>
                      </div>
                    </div>

                    {/* List of uploaded files from Data Collection Tasks */}
                    {activeRequestObj.dataCollectionTasks && activeRequestObj.dataCollectionTasks.some((t: any) => t.uploadedFiles && t.uploadedFiles.length > 0) && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                        <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                          à¹„à¸Ÿà¸¥à¹Œà¹€à¸­à¸à¸ªà¸²à¸£à¹à¸™à¸šà¸ˆà¸²à¸à¸«à¸™à¹ˆà¸§à¸¢à¸‡à¸²à¸™ ({activeRequestObj.dataCollectionTasks.reduce((acc: number, t: any) => acc + (t.uploadedFiles?.length || 0), 0)} à¹„à¸Ÿà¸¥à¹Œ):
                        </div>
                        <div className="space-y-1.5">
                          {activeRequestObj.dataCollectionTasks.map((t: any) =>
                            t.uploadedFiles?.map((f: any, idx: number) => (
                              <div key={`${t.id}-${idx}`} className="bg-white border border-slate-200 rounded-md p-2.5 flex items-center justify-between gap-3 shadow-xs">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <FileBadge className="h-5 w-5 text-emerald-600 shrink-0" />
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-800 truncate" title={f.name}>{f.name}</div>
                                    <div className="text-[10px] text-slate-500">
                                      à¸£à¸°à¸šà¸š: <span className="font-semibold text-slate-700">{t.systemName}</span>
                                      {f.isMasked && <span className="ml-2 text-emerald-600 font-bold">â€¢ à¸œà¹ˆà¸²à¸™à¸à¸²à¸£ Masked à¸›à¸´à¸”à¸šà¸±à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥</span>}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleTaskFileReview(activeRequestObj.id, t.id, f)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md text-xs font-bold transition"
                                  >
                                    <Eye className="h-3 w-3" />
                                    à¹€à¸›à¸´à¸”à¸”à¸¹à¹€à¸­à¸à¸ªà¸²à¸£
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white p-4 border-t border-slate-200 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setShowDeliveryPreview(false)}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-6 rounded-lg text-xs transition shadow-sm"
                >
                  à¸›à¸´à¸”à¸«à¸™à¹‰à¸²à¸•à¹ˆà¸²à¸‡ (Close)
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Added NotifyModal to replace alerts */}
      <NotifyModal 
        {...notifyState} 
        onClose={() => setNotifyState(prev => ({ ...prev, open: false }))} 
      />

      {/* --- PRIVACY POLICY MODAL --- */}
      {showPrivacyModal && (() => {
        const activeOrg = organizations.find(o => o.id === selectedTargetOrgId) || {
          nameTh: 'à¸šà¸£à¸´à¸©à¸±à¸— à¸¢à¸¹à¹‚à¸—à¹€à¸›à¸µà¸¢ à¹€à¸­à¹‡à¸™à¹à¸­à¸™à¸”à¹Œà¹€à¸­à¹‡à¸™ à¸ˆà¸³à¸à¸±à¸”',
          email: 'dpo@utopia.in.th',
          phone: '097-9731574'
        };
        const orgName = activeOrg.nameTh;
        const orgEmail = activeOrg.email || 'dpo@utopia.in.th';
        const orgPhone = activeOrg.phone || '097-9731574';

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">à¸™à¹‚à¸¢à¸šà¸²à¸¢à¸„à¸§à¸²à¸¡à¹€à¸›à¹‡à¸™à¸ªà¹ˆà¸§à¸™à¸•à¸±à¸§ (Privacy Notice)</h2>
                    <p className="text-xs text-slate-500">à¸ªà¸³à¸«à¸£à¸±à¸šà¸à¸²à¸£à¸ˆà¸±à¸”à¸à¸²à¸£à¸„à¸³à¸£à¹‰à¸­à¸‡à¸‚à¸­à¹ƒà¸Šà¹‰à¸ªà¸´à¸—à¸˜à¸´à¸‚à¸­à¸‡à¹€à¸ˆà¹‰à¸²à¸‚à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 p-2 rounded-lg transition-colors border border-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto font-sans text-sm text-slate-700 space-y-6">
                <p className="font-semibold text-slate-900">{orgName} ("à¸«à¸™à¹ˆà¸§à¸¢à¸‡à¸²à¸™" à¸«à¸£à¸·à¸­ "à¹€à¸£à¸²") à¸•à¸£à¸°à¸«à¸™à¸±à¸à¸–à¸¶à¸‡à¸„à¸§à¸²à¸¡à¸ªà¸³à¸„à¸±à¸à¸‚à¸­à¸‡à¸à¸²à¸£à¸„à¸¸à¹‰à¸¡à¸„à¸£à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¸‚à¸­à¸‡à¸—à¹ˆà¸²à¸™ à¹€à¸žà¸·à¹ˆà¸­à¹ƒà¸«à¹‰à¹€à¸›à¹‡à¸™à¹„à¸›à¸•à¸²à¸¡à¸žà¸£à¸°à¸£à¸²à¸Šà¸šà¸±à¸à¸à¸±à¸•à¸´à¸„à¸¸à¹‰à¸¡à¸„à¸£à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥ à¸ž.à¸¨. 2562 (PDPA) à¸—à¸²à¸‡à¸«à¸™à¹ˆà¸§à¸¢à¸‡à¸²à¸™à¸ˆà¸¶à¸‡à¹„à¸”à¹‰à¸ˆà¸±à¸”à¸—à¸³à¸›à¸£à¸°à¸à¸²à¸¨à¸„à¸§à¸²à¸¡à¹€à¸›à¹‡à¸™à¸ªà¹ˆà¸§à¸™à¸•à¸±à¸§à¸‰à¸šà¸±à¸šà¸™à¸µà¹‰à¸‚à¸¶à¹‰à¸™ à¹€à¸žà¸·à¹ˆà¸­à¹à¸ˆà¹‰à¸‡à¹ƒà¸«à¹‰à¸—à¹ˆà¸²à¸™à¸—à¸£à¸²à¸šà¸–à¸¶à¸‡à¸§à¸´à¸˜à¸µà¸à¸²à¸£à¸—à¸µà¹ˆà¹€à¸£à¸²à¹€à¸à¹‡à¸šà¸£à¸§à¸šà¸£à¸§à¸¡ à¹ƒà¸Šà¹‰ à¹à¸¥à¸°à¹€à¸›à¸´à¸”à¹€à¸œà¸¢à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¸‚à¸­à¸‡à¸—à¹ˆà¸²à¸™ à¹ƒà¸™à¸à¸£à¸°à¸šà¸§à¸™à¸à¸²à¸£à¸ˆà¸±à¸”à¸à¸²à¸£à¸„à¸³à¸£à¹‰à¸­à¸‡à¸‚à¸­à¹ƒà¸Šà¹‰à¸ªà¸´à¸—à¸˜à¸´à¸‚à¸­à¸‡à¹€à¸ˆà¹‰à¸²à¸‚à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥</p>
                
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-base">1. à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¸—à¸µà¹ˆà¸­à¸‡à¸„à¹Œà¸à¸£à¹€à¸à¹‡à¸šà¸£à¸§à¸šà¸£à¸§à¸¡</h3>
                  <p>à¹ƒà¸™à¸à¸²à¸£à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£à¸•à¸²à¸¡à¸„à¸³à¸£à¹‰à¸­à¸‡à¸‚à¸­à¹ƒà¸Šà¹‰à¸ªà¸´à¸—à¸˜à¸´à¸‚à¸­à¸‡à¸—à¹ˆà¸²à¸™ à¹€à¸£à¸²à¸¡à¸µà¸„à¸§à¸²à¸¡à¸ˆà¸³à¹€à¸›à¹‡à¸™à¸•à¹‰à¸­à¸‡à¹€à¸à¹‡à¸šà¸£à¸§à¸šà¸£à¸§à¸¡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¸‚à¸­à¸‡à¸—à¹ˆà¸²à¸™ à¸”à¸±à¸‡à¸•à¹ˆà¸­à¹„à¸›à¸™à¸µà¹‰:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸£à¸°à¸šà¸¸à¸•à¸±à¸§à¸•à¸™:</strong> à¹€à¸Šà¹ˆà¸™ à¸Šà¸·à¹ˆà¸­-à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥, à¸ªà¸³à¹€à¸™à¸²à¸šà¸±à¸•à¸£à¸›à¸£à¸°à¸ˆà¸³à¸•à¸±à¸§à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™, à¸£à¸¹à¸›à¸–à¹ˆà¸²à¸¢, à¸¥à¸²à¸¢à¸¡à¸·à¸­à¸Šà¸·à¹ˆà¸­</li>
                  <li><strong>à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸à¸²à¸£à¸•à¸´à¸”à¸•à¹ˆà¸­:</strong> à¹€à¸Šà¹ˆà¸™ à¸—à¸µà¹ˆà¸­à¸¢à¸¹à¹ˆ, à¸«à¸¡à¸²à¸¢à¹€à¸¥à¸‚à¹‚à¸—à¸£à¸¨à¸±à¸žà¸—à¹Œ, à¸­à¸µà¹€à¸¡à¸¥</li>
                  <li><strong>à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”à¸„à¸³à¸£à¹‰à¸­à¸‡:</strong> à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸­à¸·à¹ˆà¸™ à¹† à¸—à¸µà¹ˆà¸—à¹ˆà¸²à¸™à¸£à¸°à¸šà¸¸à¹ƒà¸™à¹à¸šà¸šà¸Ÿà¸­à¸£à¹Œà¸¡à¸„à¸³à¸£à¹‰à¸­à¸‡ à¸«à¸£à¸·à¸­à¸«à¸¥à¸±à¸à¸à¸²à¸™à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡à¸—à¸µà¹ˆà¸—à¹ˆà¸²à¸™à¸™à¸³à¸ªà¹ˆà¸‡à¹€à¸žà¸·à¹ˆà¸­à¸›à¸£à¸°à¸à¸­à¸šà¸à¸²à¸£à¸žà¸´à¸ˆà¸²à¸£à¸“à¸²à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸ªà¸´à¸—à¸˜à¸´</li>
                  <li><strong>à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸£à¸°à¸šà¸š:</strong> à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸à¸²à¸£à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¸£à¸°à¸šà¸š (Log), IP Address, à¸§à¸±à¸™à¹€à¸§à¸¥à¸²à¸—à¸µà¹ˆà¸—à¸³à¸£à¸²à¸¢à¸à¸²à¸£ à¹€à¸žà¸·à¹ˆà¸­à¸›à¸£à¸°à¹‚à¸¢à¸Šà¸™à¹Œà¸”à¹‰à¸²à¸™à¸„à¸§à¸²à¸¡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢à¹à¸¥à¸°à¸à¸²à¸£à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸š (Audit)</li>
                </ul>
              </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-base">2. à¸§à¸±à¸•à¸–à¸¸à¸›à¸£à¸°à¸ªà¸‡à¸„à¹Œà¹à¸¥à¸°à¸à¸²à¸™à¸—à¸²à¸‡à¸à¸Žà¸«à¸¡à¸²à¸¢à¹ƒà¸™à¸à¸²à¸£à¸›à¸£à¸°à¸¡à¸§à¸¥à¸œà¸¥à¸‚à¹‰à¸­à¸¡à¸¹à¸¥</h3>
                  <p>à¹€à¸£à¸²à¸ˆà¸°à¹€à¸à¹‡à¸šà¸£à¸§à¸šà¸£à¸§à¸¡ à¹ƒà¸Šà¹‰ à¹à¸¥à¸°à¸›à¸£à¸°à¸¡à¸§à¸¥à¸œà¸¥à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¸‚à¸­à¸‡à¸—à¹ˆà¸²à¸™ à¸ à¸²à¸¢à¹ƒà¸•à¹‰à¸à¸²à¸™à¸—à¸²à¸‡à¸à¸Žà¸«à¸¡à¸²à¸¢à¸”à¸±à¸‡à¸™à¸µà¹‰:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>à¸à¸²à¸™à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¸•à¸²à¸¡à¸à¸Žà¸«à¸¡à¸²à¸¢ (Legal Obligation):</strong> à¹€à¸žà¸·à¹ˆà¸­à¹ƒà¸Šà¹‰à¹ƒà¸™à¸à¸²à¸£à¸¢à¸·à¸™à¸¢à¸±à¸™à¸•à¸±à¸§à¸•à¸™ à¸žà¸´à¸ªà¸¹à¸ˆà¸™à¹Œà¸ªà¸´à¸—à¸˜à¸´ à¹à¸¥à¸°à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£à¸•à¸­à¸šà¸ªà¸™à¸­à¸‡à¸•à¹ˆà¸­à¸„à¸³à¸£à¹‰à¸­à¸‡à¸‚à¸­à¹ƒà¸Šà¹‰à¸ªà¸´à¸—à¸˜à¸´à¸‚à¸­à¸‡à¸—à¹ˆà¸²à¸™à¸•à¸²à¸¡à¸—à¸µà¹ˆà¸à¸Žà¸«à¸¡à¸²à¸¢ PDPA à¸à¸³à¸«à¸™à¸” à¸£à¸§à¸¡à¸–à¸¶à¸‡à¸à¸²à¸£à¹€à¸à¹‡à¸šà¸šà¸±à¸™à¸—à¸¶à¸à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸²à¸£à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£ (Log/Record of Processing Activities)</li>
                  <li><strong>à¸à¸²à¸™à¸›à¸£à¸°à¹‚à¸¢à¸Šà¸™à¹Œà¹‚à¸”à¸¢à¸Šà¸­à¸šà¸”à¹‰à¸§à¸¢à¸à¸Žà¸«à¸¡à¸²à¸¢ (Legitimate Interest):</strong> à¹€à¸žà¸·à¹ˆà¸­à¸à¸²à¸£à¸£à¸±à¸à¸©à¸²à¸„à¸§à¸²à¸¡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢à¸‚à¸­à¸‡à¸£à¸°à¸šà¸š à¸›à¹‰à¸­à¸‡à¸à¸±à¸™à¸à¸²à¸£à¹ƒà¸Šà¹‰à¸ªà¸´à¸—à¸˜à¸´à¹‚à¸”à¸¢à¸—à¸¸à¸ˆà¸£à¸´à¸• à¹à¸¥à¸°à¹€à¸žà¸·à¹ˆà¸­à¹ƒà¸Šà¹‰à¹€à¸›à¹‡à¸™à¸žà¸¢à¸²à¸™à¸«à¸¥à¸±à¸à¸à¸²à¸™à¹ƒà¸™à¸à¸£à¸“à¸µà¸—à¸µà¹ˆà¸¡à¸µà¸à¸²à¸£à¹‚à¸•à¹‰à¹à¸¢à¹‰à¸‡à¸«à¸£à¸·à¸­à¸”à¸³à¹€à¸™à¸´à¸™à¸„à¸”à¸µà¸—à¸²à¸‡à¸à¸Žà¸«à¸¡à¸²à¸¢à¸—à¸µà¹ˆà¹€à¸à¸µà¹ˆà¸¢à¸§à¸‚à¹‰à¸­à¸‡à¸à¸±à¸šà¸„à¸³à¸£à¹‰à¸­à¸‡à¸‚à¸­à¸‡à¸—à¹ˆà¸²à¸™</li>
                </ul>
              </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-base">3. à¸à¸²à¸£à¹€à¸›à¸´à¸”à¹€à¸œà¸¢à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥</h3>
                  <p>à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¸‚à¸­à¸‡à¸—à¹ˆà¸²à¸™à¹ƒà¸™à¸ªà¹ˆà¸§à¸™à¸™à¸µà¹‰ à¸ˆà¸°à¸–à¸¹à¸à¹€à¸‚à¹‰à¸²à¸–à¸¶à¸‡à¹à¸¥à¸°à¸›à¸£à¸°à¸¡à¸§à¸¥à¸œà¸¥à¹‚à¸”à¸¢à¸žà¸™à¸±à¸à¸‡à¸²à¸™à¸‚à¸­à¸‡ {orgName} à¸—à¸µà¹ˆà¹„à¸”à¹‰à¸£à¸±à¸šà¸¡à¸­à¸šà¸«à¸¡à¸²à¸¢à¹€à¸—à¹ˆà¸²à¸™à¸±à¹‰à¸™ à¹€à¸Šà¹ˆà¸™ à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¸£à¸±à¸šà¹€à¸£à¸·à¹ˆà¸­à¸‡ (Intake), à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¸„à¸¸à¹‰à¸¡à¸„à¸£à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥ (DPO), à¸œà¸¹à¹‰à¸šà¸£à¸´à¸«à¸²à¸£ à¸«à¸£à¸·à¸­à¸à¹ˆà¸²à¸¢à¸à¸Žà¸«à¸¡à¸²à¸¢à¸—à¸µà¹ˆà¹€à¸à¸µà¹ˆà¸¢à¸§à¸‚à¹‰à¸­à¸‡ à¹‚à¸”à¸¢à¸­à¸‡à¸„à¹Œà¸à¸£à¸ˆà¸°à¹„à¸¡à¹ˆà¹€à¸›à¸´à¸”à¹€à¸œà¸¢à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸‚à¸­à¸‡à¸—à¹ˆà¸²à¸™à¹à¸à¹ˆà¸šà¸¸à¸„à¸„à¸¥à¸ à¸²à¸¢à¸™à¸­à¸ à¹€à¸§à¹‰à¸™à¹à¸•à¹ˆà¹€à¸›à¹‡à¸™à¹„à¸›à¸•à¸²à¸¡à¸‚à¹‰à¸­à¸à¸³à¸«à¸™à¸”à¸—à¸²à¸‡à¸à¸Žà¸«à¸¡à¸²à¸¢ à¸«à¸£à¸·à¸­à¸¡à¸µà¸„à¸³à¸ªà¸±à¹ˆà¸‡à¸ˆà¸²à¸à¸«à¸™à¹ˆà¸§à¸¢à¸‡à¸²à¸™à¸£à¸²à¸Šà¸à¸²à¸£à¸—à¸µà¹ˆà¸¡à¸µà¸­à¸³à¸™à¸²à¸ˆ</p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-base">4. à¸£à¸°à¸¢à¸°à¹€à¸§à¸¥à¸²à¹ƒà¸™à¸à¸²à¸£à¹€à¸à¹‡à¸šà¸£à¸±à¸à¸©à¸²à¸‚à¹‰à¸­à¸¡à¸¹à¸¥</h3>
                  <p>à¹€à¸£à¸²à¸ˆà¸°à¹€à¸à¹‡à¸šà¸£à¸±à¸à¸©à¸²à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¸‚à¸­à¸‡à¸—à¹ˆà¸²à¸™ à¸£à¸§à¸¡à¸—à¸±à¹‰à¸‡à¹€à¸­à¸à¸ªà¸²à¸£à¸«à¸¥à¸±à¸à¸à¸²à¸™à¸—à¸µà¹ˆà¹€à¸à¸µà¹ˆà¸¢à¸§à¸‚à¹‰à¸­à¸‡à¸à¸±à¸šà¸„à¸³à¸£à¹‰à¸­à¸‡à¸‚à¸­à¹ƒà¸Šà¹‰à¸ªà¸´à¸—à¸˜à¸´ à¹€à¸›à¹‡à¸™à¸£à¸°à¸¢à¸°à¹€à¸§à¸¥à¸² <strong>3 à¸›à¸µ</strong> à¸™à¸±à¸šà¸ˆà¸²à¸à¸§à¸±à¸™à¸—à¸µà¹ˆà¸à¸£à¸°à¸šà¸§à¸™à¸à¸²à¸£à¸ˆà¸±à¸”à¸à¸²à¸£à¸„à¸³à¸£à¹‰à¸­à¸‡à¸‚à¸­à¸‡à¸—à¹ˆà¸²à¸™à¹€à¸ªà¸£à¹‡à¸ˆà¸ªà¸´à¹‰à¸™à¸ªà¸¡à¸šà¸¹à¸£à¸“à¹Œ à¹€à¸žà¸·à¹ˆà¸­à¸›à¸£à¸°à¹‚à¸¢à¸Šà¸™à¹Œà¹ƒà¸™à¸à¸²à¸£à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¹à¸¥à¸°à¹€à¸›à¹‡à¸™à¸žà¸¢à¸²à¸™à¸«à¸¥à¸±à¸à¸à¸²à¸™à¸«à¸²à¸à¸¡à¸µà¸‚à¹‰à¸­à¸žà¸´à¸žà¸²à¸—à¸—à¸²à¸‡à¸à¸Žà¸«à¸¡à¸²à¸¢ à¸«à¸¥à¸±à¸‡à¸ˆà¸²à¸à¸žà¹‰à¸™à¸£à¸°à¸¢à¸°à¹€à¸§à¸¥à¸²à¸”à¸±à¸‡à¸à¸¥à¹ˆà¸²à¸§ à¸ˆà¸°à¸¡à¸µà¸à¸²à¸£à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£à¸¥à¸š à¸—à¸³à¸¥à¸²à¸¢ à¸«à¸£à¸·à¸­à¸—à¸³à¹ƒà¸«à¹‰à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸‚à¸­à¸‡à¸—à¹ˆà¸²à¸™à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸£à¸°à¸šà¸¸à¸•à¸±à¸§à¸•à¸™à¹„à¸”à¹‰</p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-base">5. à¸à¸²à¸£à¸£à¸±à¸à¸©à¸²à¸„à¸§à¸²à¸¡à¸¡à¸±à¹ˆà¸™à¸„à¸‡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢</h3>
                  <p>à¸­à¸‡à¸„à¹Œà¸à¸£à¹„à¸”à¹‰à¸ˆà¸±à¸”à¹ƒà¸«à¹‰à¸¡à¸µà¸¡à¸²à¸•à¸£à¸à¸²à¸£à¸£à¸±à¸à¸©à¸²à¸„à¸§à¸²à¸¡à¸¡à¸±à¹ˆà¸™à¸„à¸‡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢à¸‚à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¸­à¸¢à¹ˆà¸²à¸‡à¹€à¸«à¸¡à¸²à¸°à¸ªà¸¡ à¸—à¸±à¹‰à¸‡à¹ƒà¸™à¸”à¹‰à¸²à¸™à¸­à¸‡à¸„à¹Œà¸à¸£à¹à¸¥à¸°à¸”à¹‰à¸²à¸™à¹€à¸—à¸„à¸™à¸´à¸„ (Technical and Organizational Measures) à¹€à¸Šà¹ˆà¸™ à¸à¸²à¸£à¸ˆà¸³à¸à¸±à¸”à¸ªà¸´à¸—à¸˜à¸´à¸à¸²à¸£à¹€à¸‚à¹‰à¸²à¸–à¸¶à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥ (Role-based Access Control), à¸à¸²à¸£à¹€à¸‚à¹‰à¸²à¸£à¸«à¸±à¸ªà¸‚à¹‰à¸­à¸¡à¸¹à¸¥ (Encryption) à¹à¸¥à¸°à¸à¸²à¸£à¸šà¸±à¸™à¸—à¸¶à¸à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸²à¸£à¹€à¸‚à¹‰à¸²à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¸£à¸°à¸šà¸š (Audit Trail) à¹€à¸žà¸·à¹ˆà¸­à¸›à¹‰à¸­à¸‡à¸à¸±à¸™à¸à¸²à¸£à¸ªà¸¹à¸à¸«à¸²à¸¢ à¹€à¸‚à¹‰à¸²à¸–à¸¶à¸‡ à¹ƒà¸Šà¹‰ à¸”à¸±à¸”à¹à¸›à¸¥à¸‡ à¸«à¸£à¸·à¸­à¹€à¸›à¸´à¸”à¹€à¸œà¸¢à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¹‚à¸”à¸¢à¸¡à¸´à¸Šà¸­à¸š</p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-base">6. à¸ªà¸´à¸—à¸˜à¸´à¸‚à¸­à¸‡à¸—à¹ˆà¸²à¸™à¹€à¸à¸µà¹ˆà¸¢à¸§à¸à¸±à¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥</h3>
                  <p>à¸—à¹ˆà¸²à¸™à¸¢à¸±à¸‡à¸„à¸‡à¸¡à¸µà¸ªà¸´à¸—à¸˜à¸´à¹ƒà¸™à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥à¸—à¸µà¹ˆà¸—à¹ˆà¸²à¸™à¹„à¸”à¹‰à¹ƒà¸«à¹‰à¹„à¸§à¹‰à¹ƒà¸™à¸„à¸³à¸£à¹‰à¸­à¸‡à¸™à¸µà¹‰ à¸•à¸²à¸¡à¸—à¸µà¹ˆà¸à¸Žà¸«à¸¡à¸²à¸¢ PDPA à¸à¸³à¸«à¸™à¸” (à¹€à¸Šà¹ˆà¸™ à¸ªà¸´à¸—à¸˜à¸´à¸‚à¸­à¹€à¸‚à¹‰à¸²à¸–à¸¶à¸‡ à¸ªà¸´à¸—à¸˜à¸´à¸‚à¸­à¹à¸à¹‰à¹„à¸‚ à¸ªà¸´à¸—à¸˜à¸´à¸‚à¸­à¹ƒà¸«à¹‰à¸¥à¸š à¸¯à¸¥à¸¯) à¸­à¸¢à¹ˆà¸²à¸‡à¹„à¸£à¸à¹‡à¸•à¸²à¸¡ à¸à¸²à¸£à¹ƒà¸Šà¹‰à¸ªà¸´à¸—à¸˜à¸´à¸šà¸²à¸‡à¸›à¸£à¸°à¸à¸²à¸£à¸­à¸²à¸ˆà¸ªà¹ˆà¸‡à¸œà¸¥à¸à¸£à¸°à¸—à¸šà¸•à¹ˆà¸­à¸„à¸§à¸²à¸¡à¸ªà¸²à¸¡à¸²à¸£à¸–à¹ƒà¸™à¸à¸²à¸£à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£à¸•à¸²à¸¡à¸„à¸³à¸£à¹‰à¸­à¸‡à¸‚à¸­à¹ƒà¸Šà¹‰à¸ªà¸´à¸—à¸˜à¸´à¹€à¸”à¸´à¸¡à¸—à¸µà¹ˆà¸—à¹ˆà¸²à¸™à¹„à¸”à¹‰à¸¢à¸·à¹ˆà¸™à¹„à¸§à¹‰</p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-base">7. à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸à¸²à¸£à¸•à¸´à¸”à¸•à¹ˆà¸­</h3>
                  <p>à¸«à¸²à¸à¸—à¹ˆà¸²à¸™à¸¡à¸µà¸‚à¹‰à¸­à¸ªà¸‡à¸ªà¸±à¸¢à¹€à¸à¸µà¹ˆà¸¢à¸§à¸à¸±à¸šà¸›à¸£à¸°à¸à¸²à¸¨à¸„à¸§à¸²à¸¡à¹€à¸›à¹‡à¸™à¸ªà¹ˆà¸§à¸™à¸•à¸±à¸§à¸‰à¸šà¸±à¸šà¸™à¸µà¹‰ à¸«à¸£à¸·à¸­à¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¸ªà¸­à¸šà¸–à¸²à¸¡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡ à¸ªà¸²à¸¡à¸²à¸£à¸–à¸•à¸´à¸”à¸•à¹ˆà¸­à¹„à¸”à¹‰à¸—à¸µà¹ˆ:</p>
                  <ul className="list-disc pl-5 space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <li><strong>à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¸„à¸¸à¹‰à¸¡à¸„à¸£à¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸šà¸¸à¸„à¸„à¸¥ (Data Protection Officer - DPO)</strong></li>
                    <li><strong>{orgName}</strong></li>
                    <li><strong>à¸­à¸µà¹€à¸¡à¸¥:</strong> {orgEmail}</li>
                    <li><strong>à¹‚à¸—à¸£à¸¨à¸±à¸žà¸—à¹Œ:</strong> {orgPhone}</li>
                  </ul>
                </div>
                
                <div className="pt-4 border-t border-slate-100 text-xs text-slate-400 text-right">
                  à¸›à¸£à¸°à¸à¸²à¸¨à¸‰à¸šà¸±à¸šà¸™à¸µà¹‰ à¸›à¸£à¸±à¸šà¸›à¸£à¸¸à¸‡à¸¥à¹ˆà¸²à¸ªà¸¸à¸”à¹€à¸¡à¸·à¹ˆà¸­: 14 à¸ªà¸´à¸‡à¸«à¸²à¸„à¸¡ 2569
                </div>
              </div>
              
              <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end">
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition shadow-sm"
                >
                  à¸£à¸±à¸šà¸—à¸£à¸²à¸šà¹à¸¥à¸°à¸›à¸´à¸”à¸«à¸™à¹‰à¸²à¸•à¹ˆà¸²à¸‡
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <ResetPasswordModal
        isOpen={!!resetTokenForModal}
        token={resetTokenForModal || ''}
        onClose={() => setResetTokenForModal(null)}
        onSuccess={() => {
          setResetTokenForModal(null);
          showNotify('à¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™à¸ªà¸³à¹€à¸£à¹‡à¸ˆ à¸à¸£à¸¸à¸“à¸²à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸šà¸”à¹‰à¸§à¸¢à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™à¹ƒà¸«à¸¡à¹ˆ');
          setTimeout(() => setIsLoginModalOpen(true), 500);
        }}
      />
    </div>
  );
}
