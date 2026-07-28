import React, { useState, useEffect } from 'react';
import { ShieldCheck, Building2, UserCheck, Key, Lock, LogOut, Plus, Sun, Moon, CheckCircle2, Trash2, Mail, AlertCircle, Eye, EyeOff, Check, Archive, Download, FileText, CheckCircle, ShieldAlert, RefreshCw, X, Activity, Server, ArrowRight, Sparkles, Shield } from 'lucide-react';

interface Tenant {
  id: string;
  nameTh: string;
  nameEn: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'expired' | 'suspended' | 'archived';
}

interface User {
  id: string;
  orgId: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  department: string;
}

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [loginStep, setLoginStep] = useState<'credentials' | 'mfa' | 'authenticated'>('credentials');
  
  // Credentials
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  const [activeTab, setActiveTab] = useState<'tenants' | 'users' | 'export'>('tenants');
  const [selectedTenantForUsers, setSelectedTenantForUsers] = useState<string>('');
  const [exportTenantModal, setExportTenantModal] = useState<Tenant | null>(null);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [masterConfirmText, setMasterConfirmText] = useState('');
  const [exportingLoading, setExportingLoading] = useState(false);
  const [offboardCertModal, setOffboardCertModal] = useState<{ open: boolean; tenant: Tenant; checksum: string; exportedAt: string; stats: { totalUsers: number; totalRequests: number; totalAuditLogs: number; packageSizeBytes: number }; payload: any; handoverMemoText?: string; exportFormat?: 'json' | 'csv' } | null>(null);
  const [memoTemplateModalOpen, setMemoTemplateModalOpen] = useState(false);
  const [memoTemplateText, setMemoTemplateText] = useState('');
  const [memoTemplateLoading, setMemoTemplateLoading] = useState(false);
  const [memoTemplateSaving, setMemoTemplateSaving] = useState(false);

  // Token and OTP email state
  const [token, setToken] = useState<string | null>(null);
  const [otpEmail, setOtpEmail] = useState<string>('');

  // Custom Professional Notification Dialog Modal State
  const [notifyModal, setNotifyModal] = useState<{ open: boolean; title: string; message: string; type: 'success' | 'warning' | 'error'; onConfirm?: () => void } | null>(null);

  const [resetPasswordModal, setResetPasswordModal] = useState<{ open: boolean; user: User | null; newPassword: string }>({ open: false, user: null, newPassword: '' });
  const [editRoleModal, setEditRoleModal] = useState<{ open: boolean; user: User | null; newRole: string }>({ open: false, user: null, newRole: '' });


  // Force Logout Helper (Cleans both sessionStorage & localStorage)
  const handleForceLogout = (reason?: string) => {
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('pdpa_super_token');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('pdpa_super_token');
    setToken(null);
    setLoginStep('credentials');
    setPassword('');
    setMfaCode('');
    if (reason) {
      showNotify(reason, 'warning', 'ออกจากระบบความปลอดภัย');
    }
  };

  // Idle Timeout System
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      // Set timeout for 5 minutes (300,000 ms)
      timeoutId = setTimeout(() => {
        if (loginStep === 'authenticated') {
          handleForceLogout('ท่านไม่ได้ใช้งานระบบเกิน 5 นาที ระบบจึงทำการออกจากระบบอัตโนมัติเพื่อความปลอดภัย');
        }
      }, 5 * 60 * 1000);
    };

    if (loginStep === 'authenticated') {
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
  }, [loginStep]);

  const showNotify = (message: string, type: 'success' | 'warning' | 'error' = 'success', title?: string, onConfirm?: () => void) => {
    const defaultTitle = type === 'success' ? 'การแจ้งเตือนจากระบบ' : type === 'warning' ? 'ข้อความแจ้งเตือน' : 'เกิดข้อผิดพลาด';
    setNotifyModal({ open: true, title: title || defaultTitle, message, type, onConfirm });
  };

  // Change Password Modal State
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState<string>('');
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Real-time validation
  const isLengthValid = newPasswordInput.length >= 8;
  const hasLowerCase = /[a-z]/.test(newPasswordInput);
  const hasUpperCase = /[A-Z]/.test(newPasswordInput);
  const hasNumber = /\d/.test(newPasswordInput);
  const hasSpecialChar = /[@$!%*?&]/.test(newPasswordInput);
  const isAllValid = isLengthValid && hasLowerCase && hasUpperCase && hasNumber && hasSpecialChar;

  // Master Tenants List State
  const [tenants, setTenants] = useState<Tenant[]>([]);

  // Master Users List State
  const [users, setUsers] = useState<User[]>([]);

  // Fetch Data from Backend
  const fetchData = async (authToken: string) => {
    try {
      const headers = { 'Authorization': `Bearer ${authToken}` };
      const [tenantsRes, usersRes] = await Promise.all([
        fetch('/api/tenants', { headers }),
        fetch('/api/users', { headers })
      ]);
      if (tenantsRes.status === 401 || tenantsRes.status === 403 || usersRes.status === 401 || usersRes.status === 403) {
        handleForceLogout('เซสชันของท่านหมดอายุหรือไม่มีสิทธิ์เข้าถึง กรุณาเข้าสู่ระบบอีกครั้งเพื่อความปลอดภัย');
        return;
      }
      const tenantsData = await tenantsRes.json();
      const usersData = await usersRes.json();
      if (!tenantsData.success || !usersData.success) {
        handleForceLogout('เซสชันของท่านหมดอายุ กรุณาเข้าสู่ระบบอีกครั้งเพื่อความปลอดภัย');
        return;
      }
      if (tenantsData.success) setTenants(tenantsData.tenants);
      if (usersData.success) setUsers(usersData.users);
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
  };

  useEffect(() => {
    // Purge any legacy localStorage token from older versions!
    localStorage.removeItem('adminToken');
    localStorage.removeItem('pdpa_super_token');

    const savedToken = sessionStorage.getItem('adminToken');
    if (savedToken) {
      fetch('/api/tenants', { headers: { 'Authorization': `Bearer ${savedToken}` } })
        .then(res => {
          if (res.status === 401 || res.status === 403) {
            handleForceLogout();
          } else {
            setToken(savedToken);
            setLoginStep('authenticated');
            fetchData(savedToken);
          }
        })
        .catch(() => {
          handleForceLogout();
        });
    }
  }, []);

  // Step 1: Check Credentials
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/super-admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        if (data.requires2FA || data.requires2FASetup) {
          setOtpEmail(data.email || 'apichat.utopia@gmail.com');
          setMfaCode('');
          setLoginStep('mfa');
        } else if (data.token) {
          setToken(data.token);
          sessionStorage.setItem('adminToken', data.token);
          setLoginStep('authenticated');
          fetchData(data.token);
        }
      } else {
        showNotify(data.message || 'Username หรือ Password ไม่ถูกต้อง', 'error', 'ไม่สามารถเข้าสู่ระบบได้');
      }
    } catch (err) {
      showNotify('ไม่สามารถเชื่อมต่อระบบหลังบ้านได้ (Server Offline)', 'error', 'การเชื่อมต่อขัดข้อง');
    }
  };

  // Step 2: Verify Gmail OTP Code (REAL SYSTEM)
  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode.trim() || mfaCode.trim().length !== 6) {
      showNotify('กรุณากรอกรหัส OTP 6 หลักที่ได้รับทางอีเมล Gmail', 'warning', 'ข้อมูลไม่ครบถ้วน');
      return;
    }
    const submittedCode = mfaCode.trim();
    setMfaCode('');
    try {
      const res = await fetch('/api/super-admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, mfaCode: submittedCode })
      });
      const data = await res.json();
      if (data.success && data.token) {
        setToken(data.token);
        sessionStorage.setItem('adminToken', data.token);
        setLoginStep('authenticated');
        fetchData(data.token);
      } else {
        showNotify(data.message || 'รหัส OTP ไม่ถูกต้อง กรุณาตรวจสอบอีเมล Gmail ของท่านอีกครั้ง', 'error', 'ตรวจสอบ OTP ไม่ผ่าน');
      }
    } catch (err) {
      showNotify('ไม่สามารถเชื่อมต่อระบบหลังบ้านเพื่อตรวจสอบรหัส OTP ได้', 'error', 'การเชื่อมต่อขัดข้อง');
    }
  };

  // Change Password Handler
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPasswordInput || !newPasswordInput) {
      showNotify('กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่', 'warning', 'ข้อมูลไม่ครบถ้วน');
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      showNotify('รหัสผ่านใหม่กับยืนยันรหัสผ่านไม่ตรงกัน', 'warning', 'รหัสผ่านไม่ตรงกัน');
      return;
    }

    if (!isAllValid) {
      showNotify('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร, ประกอบด้วยพิมพ์เล็ก พิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ', 'warning', 'รหัสผ่านไม่ผ่านเกณฑ์มาตรฐาน');
      return;
    }
    if (!token) return;

    try {
      const res = await fetch('/api/super-admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: currentPasswordInput,
          newPassword: newPasswordInput
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotify('เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว ท่านสามารถใช้รหัสผ่านใหม่ได้ทันที', 'success', 'เปลี่ยนรหัสผ่านสำเร็จ');
        setIsChangePasswordOpen(false);
        setCurrentPasswordInput('');
        setNewPasswordInput('');
        setConfirmPasswordInput('');
      } else {
        showNotify(data.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้', 'error', 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
      }
    } catch (err) {
      showNotify('เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อเปลี่ยนรหัสผ่าน', 'error', 'การเชื่อมต่อขัดข้อง');
    }
  };

  // Tenant Modal States
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [tenantFormData, setTenantFormData] = useState<Tenant>({
    id: '',
    nameTh: '',
    nameEn: '',
    email: '',
    phone: '',
    status: 'active'
  });

  // Email OTP Verification States
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [showOtpVerificationModal, setShowOtpVerificationModal] = useState(false);
  const [tenantOtpInput, setTenantOtpInput] = useState('');

  // Open Modal for New Tenant
  const handleOpenAddTenantModal = () => {
    setEditingTenantId(null);
    setIsEmailVerified(false);
    setTenantFormData({
      id: `org_${Date.now().toString().slice(-6)}`,
      nameTh: '',
      nameEn: '',
      email: '',
      phone: '',
      status: 'active'
    });
    setShowTenantModal(true);
  };

  // Open Modal for Edit Existing Tenant
  const handleOpenEditTenantModal = (tenant: Tenant) => {
    setEditingTenantId(tenant.id);
    setIsEmailVerified(true); // Existing tenants bypass OTP by default
    setTenantFormData({ ...tenant });
    setShowTenantModal(true);
  };

  // Send OTP Email Trigger (REAL API)
  const handleSendEmailOtp = async () => {
    if (!tenantFormData.email.trim() || !tenantFormData.email.includes('@')) {
      showNotify('กรุณากรอกอีเมลติดต่อทางการให้ถูกต้องก่อนส่งรหัส OTP', 'warning', 'อีเมลไม่ถูกต้อง');
      return;
    }
    try {
      const res = await fetch('/api/public/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: tenantFormData.email.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setTenantOtpInput('');
        showNotify(
          `ส่งรหัส OTP ยืนยันไปยังอีเมล ${tenantFormData.email.trim()} เรียบร้อยแล้ว (มีอายุ 5 นาที)`,
          'success',
          'ส่ง OTP เรียบร้อย',
          () => {
            setShowOtpVerificationModal(true);
          }
        );
      } else {
        showNotify(data.message || 'ไม่สามารถส่งรหัส OTP ได้ กรุณาลองใหม่อีกครั้ง', 'error', 'ส่ง OTP ไม่สำเร็จ');
      }
    } catch (err) {
      showNotify('เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อส่งรหัส OTP', 'error', 'การเชื่อมต่อขัดข้อง');
    }
  };

  // Verify OTP Trigger (REAL API)
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantOtpInput.trim() || tenantOtpInput.trim().length !== 6) {
      showNotify('กรุณากรอกรหัส OTP 6 หลัก', 'warning', 'ข้อมูลไม่ครบถ้วน');
      return;
    }
    const submittedOtp = tenantOtpInput.trim();
    setTenantOtpInput('');
    try {
      const res = await fetch('/api/public/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: tenantFormData.email.trim(),
          otp: submittedOtp
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsEmailVerified(true);
        setShowOtpVerificationModal(false);
        showNotify(`ยืนยันอีเมล ${tenantFormData.email} ด้วยรหัส OTP สำเร็จเรียบร้อยแล้ว`, 'success', 'ยืนยันอีเมลสำเร็จ');
      } else {
        showNotify(data.message || 'รหัส OTP ไม่ถูกต้องหรือหมดอายุแล้ว กรุณาตรวจสอบอีกครั้ง', 'error', 'ตรวจสอบ OTP ไม่ผ่าน');
      }
    } catch (err) {
      showNotify('เกิดข้อผิดพลาดในการตรวจสอบรหัส OTP', 'error', 'การเชื่อมต่อขัดข้อง');
    }
  };

  // Submit Tenant Form (Strict Validation)
  const handleTenantFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Strict Mandatory Validation
    if (!tenantFormData.nameTh.trim()) return showNotify('กรุณากรอก "ชื่อหน่วยงาน (ภาษาไทย)"', 'warning', 'ข้อมูลไม่ครบถ้วน');
    if (!tenantFormData.nameEn.trim()) return showNotify('กรุณากรอก "ชื่อหน่วยงาน (ภาษาอังกฤษ / ชื่อย่อ)"', 'warning', 'ข้อมูลไม่ครบถ้วน');
    if (!tenantFormData.id.trim()) return showNotify('กรุณากรอก "รหัสประจำหน่วยงานในระบบ"', 'warning', 'ข้อมูลไม่ครบถ้วน');
    if (!tenantFormData.email.trim()) return showNotify('กรุณากรอก "อีเมลติดต่อทางการ"', 'warning', 'ข้อมูลไม่ครบถ้วน');
    if (!tenantFormData.phone.trim()) return showNotify('กรุณากรอก "เบอร์โทรศัพท์ติดต่อ" สำหรับช่องทางติดต่อผู้ให้บริการ', 'warning', 'ข้อมูลไม่ครบถ้วน');

    // Require Email OTP Verification for new tenants
    if (!editingTenantId && !isEmailVerified) {
      return showNotify('กรุณากดปุ่ม "ส่งรหัส OTP ยืนยันอีเมล" และยืนยันตัวตนอีเมลก่อนบันทึก', 'warning', 'ยังไม่ได้ยืนยันอีเมล');
    }

    try {
      const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
      if (editingTenantId) {
        // Update existing
        await fetch(`/api/tenants/${editingTenantId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(tenantFormData)
        });
        showNotify(`อัปเดตข้อมูลหน่วยงาน "${tenantFormData.nameTh}" เรียบร้อยแล้ว`, 'success', 'อัปเดตข้อมูลสำเร็จ');
      } else {
        // Create new
        const checkRes = await fetch('/api/tenants', { headers });
        const checkData = await checkRes.json();
        if (checkData.success && checkData.tenants.some((t: Tenant) => t.id === tenantFormData.id.trim())) {
          return showNotify('รหัสหน่วยงาน (Tenant ID) นี้มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น', 'error', 'รหัสหน่วยงานซ้ำ');
        }
        await fetch('/api/tenants', {
          method: 'POST',
          headers,
          body: JSON.stringify(tenantFormData)
        });
        showNotify(`สร้างหน่วยงานใหม่ "${tenantFormData.nameTh}" พร้อมยืนยันอีเมลสำเร็จเรียบร้อยแล้ว`, 'success', 'สร้างหน่วยงานสำเร็จ');
      }
      if (token) fetchData(token);
      setShowTenantModal(false);
    } catch (err) {
      showNotify('เกิดข้อผิดพลาดในการบันทึกข้อมูลหน่วยงาน', 'error', 'บันทึกไม่สำเร็จ');
    }
  };

  // Delete Tenant Confirmation Modal State
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Handle Delete Tenant Confirmation
  const handleConfirmDeleteTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingTenant) return;
    
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      showNotify('กรุณาพิมพ์คำว่า "DELETE" ให้ถูกต้องเพื่อยืนยันการลบหน่วยงาน', 'warning', 'ยืนยันไม่ถูกต้อง');
      return;
    }

    try {
      await fetch(`/api/tenants/${deletingTenant.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      showNotify(`ลบหน่วยงาน "${deletingTenant.nameTh}" และยูสเซอร์ในสังกัดออกจากระบบเรียบร้อยแล้ว`, 'success', 'ลบหน่วยงานสำเร็จ');
      if (token) fetchData(token);
      setDeletingTenant(null);
      setDeleteConfirmText('');
    } catch (err) {
      showNotify('เกิดข้อผิดพลาดในการลบหน่วยงาน', 'error', 'ลบหน่วยงานไม่สำเร็จ');
    }
  };

  // Modal States
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: '',
    fullName: '',
    email: '',
    orgId: '',
    role: 'intake',
    department: ''
  });

  // Open Add User Modal
  const handleOpenAddUserModal = () => {
    setNewUserData({
      username: '',
      fullName: '',
      email: '',
      orgId: selectedTenantForUsers || tenants[0]?.id || 'org_dopa',
      role: 'intake',
      department: ''
    });
    setShowAddUserModal(true);
  };

  // Submit New User Form
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.username || !newUserData.fullName) {
      showNotify('กรุณากรอกข้อมูล Username และชื่อ-นามสกุลให้ครบถ้วน', 'warning', 'ข้อมูลไม่ครบถ้วน');
      return;
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      orgId: newUserData.orgId,
      username: newUserData.username.trim(),
      fullName: newUserData.fullName.trim(),
      email: newUserData.email.trim() || `${newUserData.username.trim()}@pdpa-system.or.th`,
      role: newUserData.role,
      department: newUserData.department.trim() || 'หน่วยงานผู้ปฏิบัติงาน'
    };

    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newUser)
      });
      if (token) fetchData(token);
      setShowAddUserModal(false);
      showNotify(`สร้างบัญชีเจ้าหน้าที่ "${newUser.fullName}" เรียบร้อยแล้ว (รหัสผ่านเริ่มต้น: 123456)`, 'success', 'สร้างบัญชีสำเร็จ');
    } catch (err) {
      showNotify('เกิดข้อผิดพลาดในการสร้างบัญชีผู้ใช้', 'error', 'สร้างบัญชีไม่สำเร็จ');
    }
  };

  // Reset User Password
  
  // Reset User Password (now opens modal)
  const handleResetPassword = (u: User) => {
    setResetPasswordModal({ open: true, user: u, newPassword: '' });
  };
  
  const submitResetPassword = async () => {
    if (!resetPasswordModal.user || !resetPasswordModal.newPassword) return;
    try {
      const res = await fetch(`/api/users/${resetPasswordModal.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          ...resetPasswordModal.user,
          fullNameTh: resetPasswordModal.user.fullName,
          newPassword: resetPasswordModal.newPassword
        })
      });
      if (res.ok) {
        showNotify(`รีเซ็ตรหัสผ่านสำหรับ "${resetPasswordModal.user.username}" สำเร็จเรียบร้อยแล้ว`, 'success', 'รีเซ็ตรหัสผ่านสำเร็จ');
        setResetPasswordModal({ open: false, user: null, newPassword: '' });
      } else {
        showNotify('เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน', 'error', 'ผิดพลาด');
      }
    } catch (err) {
      showNotify('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error', 'ผิดพลาด');
    }
  };

  const handleEditRole = (u: User) => {
    setEditRoleModal({ open: true, user: u, newRole: u.role });
  };

  const submitEditRole = async () => {
    if (!editRoleModal.user || !editRoleModal.newRole) return;
    try {
      const res = await fetch(`/api/users/${editRoleModal.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          ...editRoleModal.user,
          fullNameTh: editRoleModal.user.fullName,
          role: editRoleModal.newRole,
          roles: [editRoleModal.newRole]
        })
      });
      if (res.ok) {
        showNotify(`อัปเดตสิทธิ์สำหรับ "${editRoleModal.user.username}" สำเร็จเรียบร้อยแล้ว`, 'success', 'อัปเดตสิทธิ์สำเร็จ');
        setEditRoleModal({ open: false, user: null, newRole: '' });
        if (token) fetchData(token); // refresh
      } else {
        showNotify('เกิดข้อผิดพลาดในการเปลี่ยนสิทธิ์', 'error', 'ผิดพลาด');
      }
    } catch (err) {
      showNotify('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error', 'ผิดพลาด');
    }
  };


  const handleUpdateTenantContractStatus = async (tenantId: string, newStatus: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/super-admin/tenants/${tenantId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, status: newStatus as any } : t));
        showNotify(`เปลี่ยนสถานะสัญญาเป็น "${newStatus.toUpperCase()}" เรียบร้อยแล้ว (ระบบจะระงับ/อนุญาตการเข้าใช้ระบบของเจ้าหน้าที่สังกัดหน่วยงานนี้ทันที)`, 'success', 'อัปเดตสถานะสัญญาสำเร็จ');
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      showNotify(err.message || 'เปลี่ยนสถานะสัญญาไม่สำเร็จ', 'error', 'เกิดข้อผิดพลาด');
    }
  };

  const handleDownloadArchive = (modal: any) => {
    if (!modal || !modal.payload) return;
    if (modal.exportFormat === 'csv') {
      let csvContent = `PDPA OFFBOARDING SUMMARY MANIFEST\n`;
      csvContent += `Tenant ID,${modal.payload.meta.tenantId}\n`;
      csvContent += `Tenant Name (TH),${modal.payload.meta.tenantNameTh}\n`;
      csvContent += `Export Timestamp,${modal.payload.meta.generatedAt}\n`;
      csvContent += `SHA-256 Checksum,${modal.checksum}\n\n`;
      csvContent += `SUMMARY STATS\n`;
      csvContent += `Total Staff Accounts,${modal.stats.totalUsers}\n`;
      csvContent += `Total PDPA Requests,${modal.stats.totalRequests}\n`;
      csvContent += `Total Audit Logs,${modal.stats.totalAuditLogs}\n`;

      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${modal.tenant.id}_PDPA_OFFBOARDING_MANIFEST_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      const jsonStr = JSON.stringify(modal.payload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${modal.tenant.id}_PDPA_OFFBOARDING_ARCHIVE_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    showNotify('ดาวน์โหลดไฟล์ชุดข้อมูลส่งมอบเรียบร้อยแล้ว', 'success', 'ดาวน์โหลดข้อมูลสำเร็จ');
  };

  const handleOpenHandoverPDF = (modal: any) => {
    if (!modal) return;
    const { tenant, checksum, exportedAt, stats, handoverMemoText } = modal;
    const refNo = `OFFBOARD-${tenant.id.toUpperCase()}-${new Date(exportedAt).toISOString().split('T')[0]}`;
    const dateFormatted = new Date(exportedAt).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const pdfWindow = window.open('', '_blank', 'width=950,height=1150');
    if (!pdfWindow) {
      showNotify('กรุณาอนุญาต Pop-up สำหรับสร้างเอกสาร PDF', 'error', 'เปิดหน้าต่างไม่สำเร็จ');
      return;
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>หนังสือบันทึกข้อตกลงการส่งมอบข้อมูลและสิ้นสุดสัญญา - ${tenant.id}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap');
    @page {
      size: A4;
      margin: 20mm;
    }
    body {
      font-family: 'Sarabun', sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 24px;
      line-height: 1.6;
      background: #ffffff;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .subtitle {
      font-size: 15px;
      color: #475569;
      font-weight: 500;
    }
    .ref-box {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      color: #475569;
      margin-bottom: 24px;
      padding: 10px 14px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 24px;
      margin-bottom: 12px;
      border-left: 4px solid #10b981;
      padding-left: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 14px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 10px 14px;
      text-align: left;
    }
    th {
      background-color: #f1f5f9;
      font-weight: 600;
      color: #334155;
      width: 38%;
    }
    .hash-box {
      font-family: 'Courier New', monospace;
      font-size: 13px;
      font-weight: 700;
      background: #0f172a;
      color: #34d399;
      padding: 16px;
      border-radius: 8px;
      word-break: break-all;
      border: 1px solid #334155;
      margin-bottom: 24px;
    }
    .memo-content {
      font-size: 15px;
      color: #334155;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 18px;
      border-radius: 8px;
      white-space: pre-wrap;
      margin-bottom: 36px;
      line-height: 1.8;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 50px;
      page-break-inside: avoid;
    }
    .sig-block {
      width: 45%;
      text-align: center;
      font-size: 14px;
    }
    .sig-line {
      margin-top: 65px;
      border-bottom: 1px dotted #475569;
      margin-bottom: 8px;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
    .print-btn-bar {
      text-align: right;
      margin-bottom: 20px;
    }
    .btn {
      background: #10b981;
      color: white;
      border: none;
      padding: 12px 24px;
      font-size: 15px;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
      font-family: 'Sarabun', sans-serif;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
  </style>
</head>
<body>
  <div class="print-btn-bar no-print">
    <button class="btn" onclick="window.print()">🖨️ พิมพ์ / บันทึกเป็นไฟล์ PDF (Print to PDF)</button>
  </div>

  <div class="header">
    <div class="title">หนังสือบันทึกข้อตกลงการส่งมอบข้อมูลและสิ้นสุดสัญญาการใช้บริการ</div>
    <div class="subtitle">PDPA DATA OFFBOARDING &amp; HANDOVER MEMORANDUM</div>
  </div>

  <div class="ref-box">
    <div><b>รหัสอ้างอิงเอกสาร:</b> ${refNo}</div>
    <div><b>วันที่ส่งมอบ:</b> ${dateFormatted}</div>
  </div>

  <div class="section-title">1. รายละเอียดหน่วยงานผู้ควบคุมข้อมูล (Data Controller)</div>
  <table>
    <tr>
      <th>รหัสผู้เช่าระบบ (Tenant ID)</th>
      <td><b>${tenant.id}</b></td>
    </tr>
    <tr>
      <th>ชื่อหน่วยงาน / องค์กร</th>
      <td><b>${tenant.nameTh} (${tenant.name})</b></td>
    </tr>
    <tr>
      <th>วันที่สร้างแพ็กเกจส่งมอบ</th>
      <td>${new Date(exportedAt).toLocaleString('th-TH')}</td>
    </tr>
  </table>

  <div class="section-title">2. รายการส่งมอบชุดข้อมูลระบบ PDPA (Handover Manifest)</div>
  <table>
    <tr>
      <th>จำนวนบัญชีผู้ใช้งาน (Staff Accounts)</th>
      <td>${stats.totalUsers} บัญชี</td>
    </tr>
    <tr>
      <th>จำนวนคำขอใช้สิทธิ์ตามกฎหมาย (PDPA Requests)</th>
      <td>${stats.totalRequests} รายการ</td>
    </tr>
    <tr>
      <th>จำนวนบันทึกความปลอดภัย (Security Audit Logs)</th>
      <td>${stats.totalAuditLogs} รายการ</td>
    </tr>
    <tr>
      <th>ขนาดชุดข้อมูลรวม (Archive Package Size)</th>
      <td>${(stats.packageSizeBytes / 1024).toFixed(2)} KB</td>
    </tr>
  </table>

  <div class="section-title">3. รหัสรับรองความถูกต้องแท้จริงทางอิเล็กทรอนิกส์ (SHA-256 Checksum)</div>
  <div class="hash-box">${checksum}</div>

  <div class="section-title">4. ข้อความบันทึกข้อตกลงตามกฎหมาย PDPA พ.ศ. 2562</div>
  <div class="memo-content">${
    handoverMemoText ||
    `หนังสือบันทึกข้อตกลงฉบับนี้จัดทำขึ้นเพื่อเป็นหลักฐานยืนยันว่า หน่วยงานผู้ให้บริการระบบบริหารจัดการ PDPA (Service Provider / Data Processor) ได้ดำเนินการส่งมอบชุดข้อมูลทั้งหมดของหน่วยงาน ${tenant.nameTh} (${tenant.id}) รวมถึงข้อมูลคำขอสิทธิ์ของเจ้าของข้อมูลส่วนบุคคล (Data Subjects) และประวัติความปลอดภัย (Audit Logs) ครบถ้วนถูกต้อง

โดยมีรหัสรับรองความถูกต้อง (SHA-256 Checksum) ที่ระบุข้างต้นเป็นเครื่องมือตรวจสอบยืนยันว่าข้อมูลมิได้ถูกแก้ไขเปลี่ยนแปลง และผู้ให้บริการจะดำเนินการทำลายชุดข้อมูลสำรองออกจากเซิร์ฟเวอร์ตามระยะเวลาที่กำหนดตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562`
  }</div>

  <div class="signatures">
    <div class="sig-block">
      <div class="sig-line"></div>
      <div>(......................................................)</div>
      <div style="margin-top:4px; font-weight:600;">ผู้ส่งมอบข้อมูล (Super Administrator)</div>
      <div style="font-size:13px; color:#64748b; margin-top:2px;">ผู้ดูแลระบบกลาง / Service Provider</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div>(......................................................)</div>
      <div style="margin-top:4px; font-weight:600;">ผู้รับมอบข้อมูล (Data Controller)</div>
      <div style="font-size:13px; color:#64748b; margin-top:2px;">ตัวแทนผู้มีอำนาจของหน่วยงาน ${tenant.nameTh}</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>
    `;

    pdfWindow.document.open();
    pdfWindow.document.write(htmlContent);
    pdfWindow.document.close();
    showNotify('เปิดหน้าต่างบันทึกหนังสือข้อตกลง (PDF A4) เรียบร้อยแล้ว', 'success', 'สร้างเอกสารสำเร็จ');
  };

  const handleConfirmOffboardExport = async () => {
    const cleanConfirm = masterConfirmText.trim().toUpperCase();
    const expectedFull = 'EXPORT-' + exportTenantModal?.id.toUpperCase();
    if (cleanConfirm !== expectedFull && cleanConfirm !== 'EXPORT') {
      showNotify(`กรุณาพิมพ์ "${expectedFull}" หรือ "EXPORT" เพื่อยืนยันความปลอดภัยระดับสูงก่อนนำออกข้อมูล`, 'error', 'ยืนยันไม่ถูกต้อง');
      return;
    }
    if (!token || !exportTenantModal) {
      showNotify('เซสชันหรือโทเคนของท่านหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง', 'error', 'ไม่พบสิทธิ์การเข้าใช้งาน');
      return;
    }

    setExportingLoading(true);
    try {
      const res = await fetch(`/api/super-admin/tenants/${exportTenantModal.id}/offboard-export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'สร้างแพ็กเกจส่งมอบไม่สำเร็จ');
      }

      const certPayload = {
        open: true,
        tenant: exportTenantModal,
        checksum: data.checksum,
        exportedAt: data.exportedAt,
        stats: data.stats,
        payload: data.packageData,
        handoverMemoText: data.handoverMemoText,
        exportFormat: exportFormat
      };

      setExportTenantModal(null);
      setMasterConfirmText('');
      setOffboardCertModal(certPayload);
      showNotify(`สร้างชุดข้อมูลส่งมอบสำหรับ "${exportTenantModal.nameTh}" พร้อม SHA-256 สำเร็จ กรุณายืนยันดาวน์โหลดเอกสารในหน้าต่างรับรอง`, 'success', 'พร้อมดาวน์โหลดเอกสาร');

    } catch (err: any) {
      showNotify(err.message || 'เกิดข้อผิดพลาดในการนำออกข้อมูลหน่วยงาน', 'error', 'การส่งมอบข้อมูลล้มเหลว');
    } finally {
      setExportingLoading(false);
    }
  };

  // Handover Memorandum Template Management
  const handleOpenMemoTemplateModal = async () => {
    setMemoTemplateModalOpen(true);
    setMemoTemplateLoading(true);
    try {
      const res = await fetch('/api/super-admin/settings/handover_memo_template', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.value) {
        setMemoTemplateText(data.value);
      } else {
        showNotify('ไม่สามารถโหลดแม่แบบได้: ' + (data.message || ''), 'error');
      }
    } catch (err: any) {
      showNotify('ข้อผิดพลาดการเชื่อมต่อ: ' + err.message, 'error');
    } finally {
      setMemoTemplateLoading(false);
    }
  };

  const handleSaveMemoTemplate = async () => {
    if (!memoTemplateText.trim()) {
      showNotify('กรุณาระบุข้อความในแม่แบบ', 'error');
      return;
    }
    setMemoTemplateSaving(true);
    try {
      const res = await fetch('/api/super-admin/settings/handover_memo_template', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ value: memoTemplateText })
      });
      const data = await res.json();
      if (data.success) {
        showNotify('บันทึกแม่แบบบันทึกข้อตกลงส่งมอบข้อมูลเรียบร้อยแล้ว', 'success', 'บันทึกสำเร็จ');
        setMemoTemplateModalOpen(false);
      } else {
        showNotify('ไม่สามารถบันทึกแม่แบบได้: ' + (data.message || ''), 'error');
      }
    } catch (err: any) {
      showNotify('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message, 'error');
    } finally {
      setMemoTemplateSaving(false);
    }
  };

  const handleResetDefaultMemoTemplate = () => {
    setMemoTemplateText(`================================================================================
          หนังสือบันทึกข้อตกลงการส่งมอบข้อมูลและสิ้นสุดสัญญาการใช้บริการ
          (PDPA DATA OFFBOARDING & HANDOVER MEMORANDUM)
================================================================================

วันที่ส่งมอบ: {{EXPORT_DATE}}
รหัสอ้างอิงส่งมอบ: OFFBOARD-{{TENANT_ID}}-{{EXPORT_DATE_SHORT}}

1. ข้อมูลหน่วยงานผู้ใช้บริการ (Data Controller)
   - ชื่อหน่วยงาน: {{TENANT_NAME_TH}} ({{TENANT_NAME_EN}})
   - รหัสหน่วยงานในระบบ (Tenant ID): {{TENANT_ID}}
   - สถานะสัญญา ณ วันส่งมอบ: สิ้นสุดสัญญาการใช้บริการ / ไม่ต่ออายุสัญญา (EXPIRED)

2. รายละเอียดชุดข้อมูลที่ส่งมอบ (Export Package Manifest)
   - ชื่อไฟล์ที่ส่งมอบ: {{FILENAME}}
   - ขนาดไฟล์: {{FILE_SIZE_KB}} KB
   - จำนวนบัญชีผู้ใช้ในสังกัด: {{TOTAL_USERS}} บัญชี
   - จำนวนคำขอสิทธิ์ PDPA ทั้งหมด: {{TOTAL_REQUESTS}} รายการ
   - จำนวนบันทึกความปลอดภัย (Audit Logs): {{TOTAL_LOGS}} รายการ

3. รหัสรับรองความถูกต้องแท้จริงทางอิเล็กทรอนิกส์ (Cryptographic Integrity Hash)
   - อัลกอริทึมที่ใช้: Secure Hash Algorithm 256-bit (SHA-256)
   - รหัส SHA-256 Checksum:
     [ {{SHA256_CHECKSUM}} ]

4. คำรับรองคู่สัญญา
   ผู้ให้บริการระบบ (Service Provider) ได้ทำการส่งมอบไฟล์ข้อมูลตามรายละเอียดข้างต้น
   คืนให้แก่ผู้แทนหน่วยงานเรียบร้อยแล้ว โดยผู้แทนหน่วยงานได้ตรวจสอบรหัส SHA-256
   และยืนยันว่าข้อมูลถูกต้องครบถ้วน สมบูรณ์ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562

   ทั้งนี้ ผู้ให้บริการระบบยืนยันว่าได้ระงับการเข้าถึงระบบของบัญชีผู้ใช้สังกัดหน่วยงานดังกล่าว
   และดำเนินการจัดการข้อมูลบนเซิร์ฟเวอร์กลางตามมาตรฐานความปลอดภัยเรียบร้อยแล้ว


     ลงชื่อ ..............................................         ลงชื่อ ..............................................
          ( .......................................... )               ( .......................................... )
           ผู้แทนผู้ให้บริการระบบ (Super Admin)                  ผู้แทนหน่วยงานผู้ใช้บริการ (Data Controller)
           วันที่: ........ / ........ / ............           วันที่: ........ / ........ / ............
================================================================================`);
    showNotify('คืนค่าแม่แบบมาตรฐานเรียบร้อยแล้ว อย่าลืมกดบันทึกการเปลี่ยนแปลง', 'success', 'รีเซ็ตแม่แบบ');
  };

  // Theme Styling Helper
  const isDark = theme === 'dark';
  const bgClass = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const cardBgClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const headerBgClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const tableHeaderBg = isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200';
  const inputBgClass = isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900';

  // LOGIN SCREEN (Step 1 & Step 2 MFA)
  if (loginStep !== 'authenticated') {
    const isDarkTheme = isDark;
    const pageBg = isDarkTheme 
      ? 'bg-slate-950 text-slate-100' 
      : 'bg-slate-100 text-slate-900';
    const leftTextSubtitle = isDarkTheme ? 'text-slate-400' : 'text-slate-600';
    const badgeCardBg = isDarkTheme 
      ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' 
      : 'bg-white/90 border-slate-200 hover:border-slate-300 shadow-sm';
    const loginCardBg = isDarkTheme
      ? 'bg-slate-900/90 border-slate-800 text-white shadow-2xl'
      : 'bg-white border-slate-200 text-slate-900 shadow-xl';
    const inputCustomBg = isDarkTheme
      ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-emerald-500'
      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600';

    return (
      <div className={`min-h-screen ${pageBg} flex items-center justify-center p-4 lg:p-8 relative overflow-hidden transition-colors duration-300 font-sans`}>
        {/* Ambient Decorative Background Glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Widescreen Hero & Login Container */}
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10 my-auto">
          
          {/* LEFT SIDE: Enterprise Platform Overview & Watchdog Panel (7 Columns) */}
          <div className="lg:col-span-7 space-y-6 lg:pr-4">
            
            {/* Top Status Badge */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-amber-500/20 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10 animate-fade-in">
              <Sparkles className="h-4 w-4 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>THAILAND PDPA ENTERPRISE CORE • V2.5 STANDALONE</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
            </div>

            {/* Main Headline */}
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
                <span>Super Admin </span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300">
                  Enterprise Control
                </span>
              </h1>
              <p className={`text-sm sm:text-base ${leftTextSubtitle} leading-relaxed max-w-xl`}>
                ศูนย์บริหารจัดการระบบกำกับดูแลคำขอสิทธิ์ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) ระดับความมั่นคงปลอดภัยสูง สำหรับผู้บริการกลางและผู้กำกับดูแลสัญญา
              </p>
            </div>

            {/* Security Engine Badges Row */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className={`p-3 rounded-2xl border transition ${badgeCardBg} flex flex-col gap-1`}>
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span>2FA MFA Zero-Trust</span>
                </div>
                <p className="text-[11px] text-slate-400">ยืนยันตัวตน 2 ชั้นผ่านรหัส OTP Gmail</p>
              </div>
              <div className={`p-3 rounded-2xl border transition ${badgeCardBg} flex flex-col gap-1`}>
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                  <FileText className="h-4 w-4 shrink-0" />
                  <span>SHA-256 Checksum</span>
                </div>
                <p className="text-[11px] text-slate-400">รับรองความถูกต้องข้อมูลส่งมอบทางกฎหมาย</p>
              </div>
              <div className={`p-3 rounded-2xl border transition ${badgeCardBg} flex flex-col gap-1`}>
                <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-xs">
                  <Server className="h-4 w-4 shrink-0" />
                  <span>Standalone Node</span>
                </div>
                <p className="text-[11px] text-slate-400">แยกพอร์ตอิสระ /super-admin ปลอดภัยสูง</p>
              </div>
            </div>

            {/* Key Capabilities Overview Cards */}
            <div className="space-y-3 pt-2">
              <div className={`p-4 rounded-2xl border transition ${badgeCardBg} flex items-start gap-3`}>
                <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 shrink-0 mt-0.5">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">ระบบกำกับดูแลสัญญาและส่งมอบข้อมูล (Tenant Lifecycle & Takeout)</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    ควบคุมสถานะสัญญาทั้งระบบ Active, Expired, Suspended พร้อมเครื่องมือส่งมอบชุดข้อมูล JSON/CSV และหนังสือบันทึกข้อตกลง (Handover Memorandum) รับรองด้วย Digital Signature
                  </p>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border transition ${badgeCardBg} flex items-start gap-3`}>
                <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400 shrink-0 mt-0.5">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">บันทึกประวัติความปลอดภัยระดับสูง (Master Security Audit Trail)</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    บันทึกทุกเหตุการณ์และคำสั่งของ Super Admin อย่างโปร่งใส (Non-Repudiation) พร้อมตรวจสอบสถิติคำขอสิทธิ์และสถานะระบบแบบ Real-time
                  </p>
                </div>
              </div>
            </div>

            {/* Footer indicator */}
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono pt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>TLS 1.3 Encryption Active • Compliance Watchdog Engine Running</span>
            </div>
          </div>

          {/* RIGHT SIDE: Sophisticated Glass Login Box (5 Columns) */}
          <div className="lg:col-span-5">
            <div className={`border rounded-3xl p-7 sm:p-8 w-full transition-all relative overflow-hidden ${loginCardBg}`}>
              {/* Glowing accent bar at top */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400" />

              {/* Top Bar with Security label and Theme Switcher */}
              <div className="flex items-center justify-between pb-5 mb-5 border-b border-slate-800/80">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <Shield className="h-4 w-4" />
                  <span>SECURE EXECUTIVE LOGIN</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTheme(isDarkTheme ? 'light' : 'dark')}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  {isDarkTheme ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-indigo-400" />}
                  <span>{isDarkTheme ? 'สว่าง' : 'มืด'}</span>
                </button>
              </div>

              {/* Header Title inside Card */}
              <div className="space-y-1 mb-6">
                <h2 className="text-xl font-bold tracking-tight">เข้าสู่ระบบพอร์ทัลผู้ดูแลระบบกลาง</h2>
                <p className="text-xs text-slate-400">ยืนยันสิทธิ์เพื่อเข้าถึงเครื่องมือบริหารจัดการระดับสูง</p>
              </div>

              {/* STEP 1: Username & Password */}
              {loginStep === 'credentials' && (
                <form onSubmit={handleStep1Submit} className="space-y-5" autoComplete="off">
                  <div>
                    <label className="block text-sm font-bold mb-2 text-slate-200">
                      Username ผู้ดูแลระบบกลาง
                    </label>
                    <div className="relative">
                      <UserCheck className="absolute left-4 top-4 h-5 w-5 text-emerald-400" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="super.admin"
                        autoComplete="new-password"
                        className={`w-full pl-12 pr-4 py-3.5 border rounded-2xl text-base sm:text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all ${inputCustomBg}`}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 text-slate-200">
                      Master Security Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-4 h-5 w-5 text-emerald-400" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="กรอกรหัสผ่านปลอดภัย"
                        autoComplete="new-password"
                        className={`w-full pl-12 pr-4 py-3.5 border rounded-2xl text-base sm:text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all ${inputCustomBg}`}
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-4 rounded-2xl text-base transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 group"
                    >
                      <span>ถัดไป: ยืนยันรหัส MFA Authenticator</span>
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>

                  <div className="p-3.5 bg-slate-800/40 border border-slate-800 rounded-2xl text-xs text-slate-400 text-center leading-relaxed mt-4">
                    💡 ระบบเปิดใช้งาน <b>MFA Protection</b> ทุกครั้งที่เข้าสู่ระบบ รหัส OTP จะถูกส่งไปยังอีเมลที่ลงทะเบียน
                  </div>
                </form>
              )}

              {/* STEP 2: MFA TOTP Code Verification */}
              {loginStep === 'mfa' && (
                <form onSubmit={handleMfaSubmit} className="space-y-5 animate-fade-in">
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs sm:text-sm text-emerald-400 flex items-center gap-2 font-medium">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <span>ยืนยันตัวตนขั้นแรกสำเร็จ กรุณากรอกรหัส OTP 6 หลักที่ส่งไปยังอีเมล</span>
                  </div>

                  <div className="text-center py-3 space-y-2">
                    <div className="inline-block p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner">
                      <Mail className="h-12 w-12 text-emerald-400 mx-auto" />
                    </div>
                    <p className="text-sm font-bold">
                      ตรวจสอบรหัส OTP ที่อีเมล: <span className="text-emerald-400">{otpEmail || 'apichat.utopia@gmail.com'}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      นำรหัสตัวเลข 6 หลักที่ได้รับในกล่องจดหมายมากรอกเพื่อยืนยันเข้าสู่ระบบ
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-center mb-2.5 text-slate-200">
                      รหัสผ่าน OTP 6 หลัก จาก Gmail
                    </label>
                    <div className="relative max-w-[280px] mx-auto">
                      <input
                        type="text"
                        maxLength={6}
                        autoComplete="off"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="• • • • • •"
                        autoFocus
                        className="w-full text-center tracking-[0.55em] font-mono text-3xl font-extrabold py-3.5 px-4 bg-slate-900/90 border-2 border-emerald-500/50 hover:border-emerald-500 rounded-2xl text-emerald-400 placeholder:text-slate-600 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/20 transition shadow-inner"
                        required
                      />
                    </div>
                    <span className="block text-xs text-emerald-400/90 text-center mt-2.5 font-medium">
                      ✓ กรุณากรอกรหัสตัวเลข 6 หลักที่ได้รับทางอีเมล (อายุ 5 นาที)
                    </span>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setLoginStep('credentials'); setMfaCode(''); }}
                      className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold py-3.5 rounded-2xl transition"
                    >
                      ย้อนกลับ
                    </button>
                    <button
                      type="submit"
                      className="w-2/3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 rounded-2xl text-sm transition shadow-lg"
                    >
                      เข้าสู่ระบบหลังบ้าน
                    </button>
                  </div>
                </form>
              )}

              {/* Card Footer */}
              <div className="text-[11px] text-slate-500 text-center border-t border-slate-800/80 pt-4 mt-6 font-mono">
                🔒 Isolated Super Admin Console v2.5 • High Security MFA
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MAIN DASHBOARD (AUTHENTICATED)
  return (
    <div className={`min-h-screen ${bgClass} flex flex-col font-sans transition-colors duration-200`}>
      {/* Header */}
      <header className={`p-4 border-b sticky top-0 z-50 ${headerBgClass}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-500">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-base flex items-center gap-2">
                <span>Super Admin Enterprise Console</span>
                <span className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                  2FA MFA VERIFIED
                </span>
              </h1>
              <p className="text-xs text-slate-400">ระบบบริหารจัดการภาพรวมระดับภาพรวมประเทศ (Standalone)</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`p-2 rounded-lg border transition ${cardBgClass} flex items-center gap-1.5 text-xs font-semibold`}
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-600" />}
              <span className="hidden md:inline">{isDark ? 'ธีมสว่าง' : 'ธีมมืด'}</span>
            </button>

            <button
              onClick={() => setIsChangePasswordOpen(true)}
              className="bg-emerald-500/10 hover:bg-emerald-600 text-emerald-500 hover:text-white text-xs font-semibold px-4 py-2 rounded-lg transition border border-emerald-500/30 flex items-center gap-1.5"
            >
              <Key className="h-4 w-4" />
              <span>เปลี่ยนรหัสผ่าน</span>
            </button>

            <button
              onClick={() => handleForceLogout('ท่านออกจากระบบ Super Administrator เรียบร้อยแล้ว')}
              className="bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white text-xs font-semibold px-4 py-2 rounded-lg transition border border-red-500/30 flex items-center gap-1.5"
            >
              <LogOut className="h-4 w-4" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* Tabs & Top Actions */}
        <div className="flex items-center justify-between border-b border-slate-800/40 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('tenants')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'tenants' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>1. จัดการหน่วยงาน (Tenants - {tenants.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'users' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <UserCheck className="h-4 w-4" />
              <span>2. จัดการผู้ใช้ & รหัสผ่าน (Users - {users.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('export')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'export' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Archive className="h-4 w-4" />
              <span>3. ส่งมอบข้อมูลหมดสัญญา (Offboarding - {tenants.length})</span>
            </button>
          </div>

          {activeTab === 'tenants' ? (
            <button
              onClick={handleOpenAddTenantModal}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-sm flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>+ เพิ่มหน่วยงานใหม่ (Add Tenant)</span>
            </button>
          ) : activeTab === 'users' ? (
            <button
              onClick={handleOpenAddUserModal}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-sm flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>+ สร้างผู้ใช้ใหม่ (Add User)</span>
            </button>
          ) : null}
        </div>

        {/* TAB 1: Tenants */}
        {activeTab === 'tenants' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tenants.map((t) => (
              <div key={t.id} className={`border rounded-xl p-5 space-y-3 ${cardBgClass}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-sm block">{t.nameTh}</span>
                    <span className="text-[10px] font-mono text-emerald-500 block mt-0.5">ID: {t.id}</span>
                  </div>
                  <span className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                    ACTIVE
                  </span>
                </div>

                <div className={`text-xs space-y-1 p-3 rounded-lg border ${isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                  <p>อีเมลติดต่อ: <span className="font-medium">{t.email}</span></p>
                  <p>เบอร์โทรศัพท์: <span className="font-medium">{t.phone}</span></p>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      setSelectedTenantForUsers(t.id);
                      setActiveTab('users');
                    }}
                    className={`flex-1 text-xs py-1.5 rounded-lg font-semibold transition border ${isDark ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20' : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'}`}
                  >
                    👥 จัดการผู้ใช้
                  </button>
                  <button
                    onClick={() => handleOpenEditTenantModal(t)}
                    className={`flex-1 text-xs py-1.5 rounded-lg font-semibold transition border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'}`}
                  >
                    แก้ไขข้อมูล
                  </button>
                  <button
                    onClick={() => {
                      setDeletingTenant(t);
                      setDeleteConfirmText('');
                    }}
                    className="bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/30 text-xs px-3 py-1.5 rounded-lg transition font-semibold flex items-center justify-center gap-1"
                    title="ลบหน่วยงานออกจากระบบ"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>ลบ</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: Users & Password Management */}
        {activeTab === 'users' && (
          <div className={`border rounded-xl overflow-hidden p-6 space-y-4 ${cardBgClass}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-500" />
                <span>จัดการผู้ใช้งานประจำหน่วยงาน</span>
              </h2>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-semibold whitespace-nowrap text-slate-400">เลือกหน่วยงาน:</span>
                <select
                  value={selectedTenantForUsers}
                  onChange={(e) => setSelectedTenantForUsers(e.target.value)}
                  className={`text-xs py-1.5 px-3 rounded-lg border focus:outline-none focus:border-emerald-500 w-full sm:w-64 font-mono ${isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'}`}
                >
                  <option value="">-- กรุณาเลือกหน่วยงาน --</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.nameTh} ({t.id})</option>
                  ))}
                </select>
              </div>
            </div>

            {!selectedTenantForUsers ? (
              <div className={`p-10 text-center rounded-xl border border-dashed ${isDark ? 'border-slate-800 bg-slate-900/30 text-slate-500' : 'border-slate-300 bg-slate-50 text-slate-500'}`}>
                <Building2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="font-semibold text-sm">กรุณาเลือกหน่วยงาน</p>
                <p className="text-xs mt-1">โปรดเลือกหน่วยงานจากเมนูด้านบนเพื่อจัดการผู้ใช้งานในสังกัด</p>
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-xl border-slate-800/40">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`border-b font-bold ${tableHeaderBg}`}>
                      <th className="p-3">ชื่อ-นามสกุล</th>
                      <th className="p-3">Username / อีเมล</th>
                      <th className="p-3">หน่วยงาน</th>
                      <th className="p-3">บทบาทสิทธิ์ (Role)</th>
                      <th className="p-3 text-center">จัดการบัญชี</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {users.filter(u => u.orgId === selectedTenantForUsers).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          ไม่มีผู้ใช้งานในหน่วยงานนี้
                        </td>
                      </tr>
                    ) : (
                      users.filter(u => u.orgId === selectedTenantForUsers).map((u) => (
                        <tr key={u.id} className="hover:bg-slate-800/20 transition">
                          <td className="p-3 font-bold">
                            {u.fullName}
                        <span className="block text-[10px] font-normal text-slate-400">{u.department}</span>
                      </td>
                      <td className="p-3 font-mono">
                        <span className="text-emerald-500 font-bold block">{u.username}</span>
                        <span className="text-[10px] font-sans text-slate-400 block">{u.email}</span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-400">{u.orgId}</td>
                      <td className="p-3">
                        <span className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 text-center flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditRole(u)}
                          className="bg-blue-500/20 text-blue-500 border border-blue-500/30 hover:bg-blue-500/30 text-[11px] font-semibold py-1.5 px-3 rounded-lg transition inline-flex items-center gap-1"
                        >
                          <Shield className="h-3.5 w-3.5" />
                          <span>🛡️ แก้ไขสิทธิ์</span>
                        </button>
                        <button
                          onClick={() => handleResetPassword(u)}
                          className="bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:bg-amber-500/30 text-[11px] font-semibold py-1.5 px-3 rounded-lg transition inline-flex items-center gap-1"
                        >
                          <Key className="h-3.5 w-3.5" />
                          <span>🔑 รีเซ็ตรหัสผ่าน</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}

        {/* TAB 3: DATA EXPORT / OFFBOARDING (NON-RENEWING TENANTS) */}
        {activeTab === 'export' && (
          <div className="space-y-6 animate-fade-in">
            {/* Security Banner */}
            <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-emerald-950/30 border border-amber-500/30 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
                  <ShieldAlert className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-sm text-white">ระบบนำออกข้อมูลกรณีไม่ต่ออายุสัญญา/สิ้นสุดสัญญา (Contract Offboarding & Data Takeout)</h2>
                    <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                      SUPER ADMIN EXCLUSIVE
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                      SHA-256 CHECKED
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    เครื่องมือสำหรับ Super Admin ในการส่งมอบและสกัดข้อมูล PDPA ของหน่วยงาน (คำขอสิทธิ์, บัญชีเจ้าหน้าที่, ทะเบียน, Audit Trail) พร้อมสร้าง <b>SHA-256 Digital Signature</b> เพื่อรับรองความถูกต้องของข้อมูลตามกฎหมาย และเปลี่ยนสถานะสัญญาเพื่อระงับการเข้าสู่ระบบ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenMemoTemplateModal}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 rounded-xl font-bold text-xs flex items-center gap-2 shadow transition-all hover:scale-105 shrink-0"
              >
                <FileText className="h-4 w-4 text-amber-400" />
                <span>✏️ ตั้งค่าแม่แบบบันทึกส่งมอบ (Handover Memo)</span>
              </button>
            </div>

            {/* Tenants Table with Offboarding Controls */}
            <div className={`border rounded-2xl overflow-hidden shadow-lg ${cardBgClass}`}>
              <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Archive className="h-4 w-4 text-amber-400" />
                  <span className="font-bold text-xs">รายการหน่วยงานทั้งหมดและการจัดการสถานะสัญญา (Tenant Contract Lifecycle)</span>
                </div>
                <span className="text-[11px] text-slate-400">หน่วยงานทั้งหมด {tenants.length} แห่ง</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-semibold">
                      <th className="py-3 px-4">รหัส (ID)</th>
                      <th className="py-3 px-4">ชื่อหน่วยงาน (Tenant Name)</th>
                      <th className="py-3 px-4">อีเมล/โทรศัพท์</th>
                      <th className="py-3 px-4">สถานะสัญญา (Contract Status)</th>
                      <th className="py-3 px-4 text-right">การจัดการและนำออกข้อมูล (Offboarding Action)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {tenants.map((t) => {
                      const userCount = users.filter(u => u.orgId === t.id).length;
                      const statusColor =
                        t.status === 'expired' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        t.status === 'suspended' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                        t.status === 'archived' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                        'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';

                      return (
                        <tr key={t.id} className="hover:bg-slate-800/30 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">{t.id}</td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-200">{t.nameTh}</div>
                            <div className="text-[11px] text-slate-400">{t.nameEn} ({userCount} บัญชีเจ้าหน้าที่)</div>
                          </td>
                          <td className="py-3.5 px-4 text-[11px] text-slate-300">
                            <div>{t.email || '-'}</div>
                            <div className="text-slate-500">{t.phone || '-'}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <select
                              value={t.status || 'active'}
                              onChange={(e) => handleUpdateTenantContractStatus(t.id, e.target.value)}
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer ${statusColor} bg-slate-900`}
                            >
                              <option value="active" className="bg-slate-900 text-emerald-400">ACTIVE (ใช้งานปกติ)</option>
                              <option value="expired" className="bg-slate-900 text-red-400">EXPIRED (ไม่ต่ออายุสัญญา)</option>
                              <option value="suspended" className="bg-slate-900 text-amber-400">SUSPENDED (ระงับชั่วคราว)</option>
                              <option value="archived" className="bg-slate-900 text-purple-400">ARCHIVED (ส่งมอบข้อมูลแล้ว)</option>
                            </select>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => {
                                setExportTenantModal(t);
                                setMasterConfirmText('');
                              }}
                              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 text-[11px] font-bold px-3 py-1.5 rounded-lg transition inline-flex items-center gap-1.5 shadow-sm"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>📦 นำออกข้อมูลส่งมอบ (SHA-256 Takeout)</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Add User Modal Dialog (Form + Dropdown Selection) */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`border rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5 ${cardBgClass} animate-fade-in`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">สร้างบัญชีผู้ใช้ใหม่ (Create New User)</h3>
                  <p className="text-xs text-slate-400">เลือกหน่วยงานและกำหนดสิทธิ์เจ้าหน้าที่ในฟอร์มเดียว</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              {/* 1. เลือกหน่วยงาน (Dropdown) */}
              <div>
                <label className="block text-xs font-bold mb-1.5 flex items-center justify-between">
                  <span>🏢 เลือกหน่วยงานต้นสังกัด (Select Tenant Organization)</span>
                  <span className="text-emerald-500 text-[10px]">✓ ป้องกันการพิมพ์รหัสผิด</span>
                </label>
                <select
                  value={newUserData.orgId}
                  onChange={(e) => setNewUserData({ ...newUserData, orgId: e.target.value })}
                  className={`w-full px-3 py-2.5 border rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 ${inputBgClass}`}
                  required
                >
                  {tenants.map((org) => (
                    <option key={org.id} value={org.id} className="bg-slate-900 text-white">
                      {org.nameTh} ({org.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Username & Full Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Username เข้าใช้งาน *</label>
                  <input
                    type="text"
                    value={newUserData.username}
                    onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                    placeholder="เช่น intake.dopa"
                    className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 ${inputBgClass}`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">ชื่อ - นามสกุล *</label>
                  <input
                    type="text"
                    value={newUserData.fullName}
                    onChange={(e) => setNewUserData({ ...newUserData, fullName: e.target.value })}
                    placeholder="เช่น สมชาย ใจดี"
                    className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 ${inputBgClass}`}
                    required
                  />
                </div>
              </div>

              {/* 3. Role & Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">บทบาทสิทธิ์ (Role) *</label>
                  <select
                    value={newUserData.role}
                    onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 ${inputBgClass}`}
                    required
                  >
                    <option value="intake" className="bg-slate-900 text-white">INTAKE - เจ้าหน้าที่รับเรื่อง</option>
                    <option value="owner" className="bg-slate-900 text-white">OWNER - เจ้าของข้อมูล/ระบบงาน</option>
                    <option value="dpo" className="bg-slate-900 text-white">DPO - เจ้าหน้าที่คุ้มครองข้อมูล</option>
                    <option value="approver" className="bg-slate-900 text-white">APPROVER - ผู้อนุมัติคำขอ</option>
                    <option value="admin" className="bg-slate-900 text-white">ADMIN - ผู้ดูแลประจำหน่วยงาน</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">อีเมลติดต่อ</label>
                  <input
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    placeholder="officer@dopa.go.th"
                    className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 ${inputBgClass}`}
                  />
                </div>
              </div>

              {/* 4. Department */}
              <div>
                <label className="block text-xs font-semibold mb-1">แผนก / สำนัก / กองงาน</label>
                <input
                  type="text"
                  value={newUserData.department}
                  onChange={(e) => setNewUserData({ ...newUserData, department: e.target.value })}
                  placeholder="เช่น ศูนย์รับเรื่องร้องเรียน PDPA"
                  className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 ${inputBgClass}`}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg"
                >
                  บันทึกสร้างบัญชีผู้ใช้ใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enterprise Tenant Modal Dialog (Create & Edit Tenant Form) */}
      {showTenantModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`border rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5 ${cardBgClass} animate-fade-in`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {editingTenantId ? 'แก้ไขข้อมูลหน่วยงาน (Edit Tenant)' : 'เพิ่มหน่วยงานใหม่เข้าระบบ (Add New Tenant)'}
                  </h3>
                  <p className="text-xs text-slate-400">กำหนดโครงสร้าง รหัสย่อ และข้อมูลติดต่อประจำหน่วยงาน</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTenantModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTenantFormSubmit} className="space-y-4">
              {/* 1. ชื่อหน่วยงานภาษาไทย & อังกฤษ */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-emerald-400">ชื่อหน่วยงาน (ภาษาไทย) *</label>
                  <input
                    type="text"
                    value={tenantFormData.nameTh}
                    onChange={(e) => setTenantFormData({ ...tenantFormData, nameTh: e.target.value })}
                    placeholder="เช่น กรมการปกครอง, บริษัท ไทยเทคโนโลยี จำกัด"
                    className={`w-full px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500 ${inputBgClass}`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-emerald-400">ชื่อหน่วยงาน (ภาษาอังกฤษ / ชื่อย่อ) *</label>
                  <input
                    type="text"
                    value={tenantFormData.nameEn}
                    onChange={(e) => setTenantFormData({ ...tenantFormData, nameEn: e.target.value })}
                    placeholder="เช่น Department of Provincial Administration (DOPA)"
                    className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 ${inputBgClass}`}
                    required
                  />
                </div>
              </div>

              {/* 2. รหัสประจำหน่วยงาน (Tenant ID) */}
              <div>
                <label className="block text-xs font-bold mb-1 flex items-center justify-between text-emerald-400">
                  <span>รหัสประจำหน่วยงานในระบบ (Tenant ID Code) *</span>
                  <span className="text-emerald-500 text-[10px]">✓ ใช้สำหรับอ้างอิงแยกข้อมูล</span>
                </label>
                <input
                  type="text"
                  value={tenantFormData.id}
                  onChange={(e) => setTenantFormData({ ...tenantFormData, id: e.target.value })}
                  placeholder="เช่น org_dopa, org_rd, org_excise"
                  disabled={!!editingTenantId}
                  className={`w-full px-3 py-2 border rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-emerald-500 ${inputBgClass} ${editingTenantId ? 'opacity-60 cursor-not-allowed' : ''}`}
                  required
                />
              </div>

              {/* 3. อีเมล & OTP & เบอร์โทรศัพท์ */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-emerald-400">อีเมลติดต่อทางการประจำหน่วยงาน *</label>
                    {isEmailVerified ? (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                        ✓ ยืนยันอีเมลด้วย OTP แล้ว
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendEmailOtp}
                        className="text-[10px] bg-brand-600 hover:bg-brand-500 text-white font-bold px-2 py-0.5 rounded shadow-sm transition"
                      >
                        📩 ส่งรหัส OTP ยืนยันอีเมล
                      </button>
                    )}
                  </div>
                  <input
                    type="email"
                    value={tenantFormData.email}
                    onChange={(e) => {
                      setTenantFormData({ ...tenantFormData, email: e.target.value });
                      if (!editingTenantId) setIsEmailVerified(false);
                    }}
                    placeholder="pdpa@organization.go.th"
                    className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 ${inputBgClass}`}
                    required
                  />
                  {!editingTenantId && !isEmailVerified && (
                    <span className="block text-[10px] text-amber-400 mt-1 font-medium">
                      ⚠️ ต้องกดส่งรหัส OTP และกรอกรหัสยืนยันอีเมลก่อนสร้างหน่วยงานใหม่
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-emerald-400">เบอร์โทรศัพท์ติดต่อผู้ให้บริการ (สายด่วน) *</label>
                  <input
                    type="text"
                    value={tenantFormData.phone}
                    onChange={(e) => setTenantFormData({ ...tenantFormData, phone: e.target.value })}
                    placeholder="เช่น 02-221-8150 หรือ 081-XXX-XXXX"
                    className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 ${inputBgClass}`}
                    required
                  />
                  <span className="block text-[10px] text-slate-400 mt-0.5">ใช้เป็นช่องทางหลักสำหรับผู้ให้บริการระบบกลางติดต่อผู้ดูแลประจำหน่วยงาน</span>
                </div>
              </div>

              {/* 4. สถานะหน่วยงาน */}
              <div>
                <label className="block text-xs font-bold mb-1 text-emerald-400">สถานะการเปิดใช้งานในระบบ *</label>
                <select
                  value={tenantFormData.status}
                  onChange={(e) => setTenantFormData({ ...tenantFormData, status: e.target.value as any })}
                  className={`w-full px-3 py-2 border rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 ${inputBgClass}`}
                  required
                >
                  <option value="active" className="bg-slate-900 text-emerald-400">ACTIVE - เปิดใช้งานรับคำขอปกติ</option>
                  <option value="inactive" className="bg-slate-900 text-red-400">INACTIVE - ปิดการใช้งานชั่วคราว</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTenantModal(false)}
                  className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg"
                >
                  {editingTenantId ? 'บันทึกการแก้ไขข้อมูล' : 'บันทึกสร้างหน่วยงานใหม่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email OTP Verification Modal Dialog */}
      {showOtpVerificationModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`border rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 ${cardBgClass} animate-fade-in text-center`}>
            <div className="inline-flex p-3 bg-brand-500/20 border border-brand-500/30 rounded-2xl text-brand-400 mb-1">
              <Mail className="h-8 w-8 text-emerald-400" />
            </div>
            
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-white">ยืนยันอีเมลประจำหน่วยงานด้วย OTP</h4>
              <p className="text-xs text-slate-400">
                ระบบได้ส่งรหัส OTP 6 หลัก ไปยังอีเมล <br />
                <span className="font-mono text-emerald-400 font-bold">{tenantFormData.email}</span>
              </p>
            </div>

            <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={tenantOtpInput}
                  onChange={(e) => setTenantOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full text-center tracking-[0.6em] font-mono text-2xl font-extrabold py-3 px-4 bg-slate-900/90 border-2 border-emerald-500/50 hover:border-emerald-500 rounded-2xl text-emerald-400 placeholder:text-slate-600 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/20 transition shadow-inner"
                  required
                  autoFocus
                />
                <span className="block text-[10px] text-emerald-400 mt-1">* กรุณานำรหัส 6 หลักที่ได้รับทางอีเมลมากรอก (รหัสมีอายุ 5 นาที)</span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowOtpVerificationModal(false)}
                  className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2 rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs transition shadow-lg"
                >
                  ยืนยันรหัส OTP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Tenant Confirmation Modal Dialog */}
      {deletingTenant && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 ${cardBgClass} animate-fade-in`}>
            <div className="flex items-center gap-3 border-b border-red-500/20 pb-3">
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-2xl text-red-500">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-red-500">ยืนยันลบหน่วยงานออกจากระบบ</h3>
                <p className="text-xs text-slate-400">การลบนี้จะมีผลถาวรและไม่สามารถย้อนคืนได้</p>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${isDark ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-red-50 border-red-100 text-slate-700'}`}>
              <p>หน่วยงานที่จะลบ: <span className="font-bold text-red-400">{deletingTenant.nameTh}</span></p>
              <p>รหัสหน่วยงาน: <span className="font-mono text-slate-400">{deletingTenant.id}</span></p>
              <p className="text-[11px] text-amber-400 pt-1 border-t border-slate-800/60 font-semibold">
                ⚠️ คำเตือน: ยูสเซอร์เจ้าหน้าที่ทั้งหมดในสังกัดหน่วยงานนี้จะถูกลบออกจากระบบด้วยเช่นกัน
              </p>
            </div>

            <form onSubmit={handleConfirmDeleteTenant} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-300">
                  พิมพ์คำว่า <span className="text-red-500 font-mono font-bold">DELETE</span> เพื่อยืนยันการลบถาวร:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="พิมพ์ DELETE ที่นี่"
                  className={`w-full font-mono text-center text-sm font-bold uppercase py-2 border rounded-xl focus:outline-none focus:border-red-500 ${inputBgClass}`}
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingTenant(null)}
                  className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2.5 rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                  className={`w-2/3 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg ${
                    deleteConfirmText.trim().toUpperCase() === 'DELETE'
                      ? 'bg-red-600 hover:bg-red-500 opacity-100 cursor-pointer'
                      : 'bg-red-900/50 opacity-40 cursor-not-allowed'
                  }`}
                >
                  🗑️ ยืนยันลบหน่วยงานถาวร
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 ${cardBgClass}`}>
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <Key className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">เปลี่ยนรหัสผ่าน Super Admin</h3>
                  <p className="text-[11px] text-slate-400">กำหนดรหัสผ่านใหม่เพื่อความปลอดภัยของระบบกลาง</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">รหัสผ่านปัจจุบัน</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    placeholder="รหัสผ่านปัจจุบัน"
                    className={`w-full text-xs py-2 px-3 pr-10 border rounded-xl focus:outline-none focus:border-emerald-500 ${inputBgClass}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">รหัสผ่านใหม่</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="รหัสผ่านใหม่"
                    className={`w-full text-xs py-2 px-3 pr-10 border rounded-xl focus:outline-none focus:border-emerald-500 ${inputBgClass}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {/* Validation Checklist */}
                {newPasswordInput && (
                  <div className={`mt-2 space-y-1 p-2.5 rounded-lg border bg-slate-50 border-slate-100`}>
                    <p className={`text-[10px] font-semibold mb-1.5 text-slate-600`}>รหัสผ่านต้องประกอบด้วย:</p>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                      <div className={`flex items-center gap-1.5 text-[10px] ${isLengthValid ? 'text-emerald-500 font-semibold' : 'text-slate-400'}`}>
                        <Check className={`h-3 w-3 ${isLengthValid ? 'opacity-100' : 'opacity-0'}`} />
                        ความยาว 8+ ตัว
                      </div>
                      <div className={`flex items-center gap-1.5 text-[10px] ${hasLowerCase ? 'text-emerald-500 font-semibold' : 'text-slate-400'}`}>
                        <Check className={`h-3 w-3 ${hasLowerCase ? 'opacity-100' : 'opacity-0'}`} />
                        พิมพ์เล็ก (a-z)
                      </div>
                      <div className={`flex items-center gap-1.5 text-[10px] ${hasUpperCase ? 'text-emerald-500 font-semibold' : 'text-slate-400'}`}>
                        <Check className={`h-3 w-3 ${hasUpperCase ? 'opacity-100' : 'opacity-0'}`} />
                        พิมพ์ใหญ่ (A-Z)
                      </div>
                      <div className={`flex items-center gap-1.5 text-[10px] ${hasNumber ? 'text-emerald-500 font-semibold' : 'text-slate-400'}`}>
                        <Check className={`h-3 w-3 ${hasNumber ? 'opacity-100' : 'opacity-0'}`} />
                        ตัวเลข (0-9)
                      </div>
                      <div className={`flex items-center gap-1.5 text-[10px] ${hasSpecialChar ? 'text-emerald-500 font-semibold' : 'text-slate-400'} col-span-2`}>
                        <Check className={`h-3 w-3 ${hasSpecialChar ? 'opacity-100' : 'opacity-0'}`} />
                        อักขระพิเศษ (เช่น @, $, !, %)
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">ยืนยันรหัสผ่านใหม่</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
                    className={`w-full text-xs py-2 px-3 pr-10 border rounded-xl focus:outline-none focus:border-emerald-500 ${inputBgClass}`}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(false)}
                  className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2.5 rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg"
                >
                  ✓ บันทึกรหัสผ่านใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Professional Notification Modal */}
      {notifyModal && notifyModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900/95 border border-slate-700/80 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl relative overflow-hidden transform transition-all scale-100">
            {/* Top Glow Accent */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${
              notifyModal.type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
              notifyModal.type === 'warning' ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
              'bg-gradient-to-r from-rose-500 to-red-400'
            }`} />

            {/* Icon */}
            <div className="flex justify-center mb-4 mt-2">
              <div className={`p-4 rounded-2xl ${
                notifyModal.type === 'success' ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' :
                notifyModal.type === 'warning' ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400' :
                'bg-rose-500/15 border border-rose-500/30 text-rose-400'
              }`}>
                {notifyModal.type === 'success' ? (
                  <CheckCircle2 className="h-10 w-10 animate-bounce-short" />
                ) : (
                  <AlertCircle className="h-10 w-10" />
                )}
              </div>
            </div>

            {/* Content */}
            <h3 className="text-lg font-extrabold text-white mb-2">
              {notifyModal.title}
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-6 font-normal">
              {notifyModal.message}
            </p>

            {/* Action Button */}
            <button
              type="button"
              onClick={() => {
                const cb = notifyModal.onConfirm;
                setNotifyModal(null);
                if (cb) cb();
              }}
              className={`w-full py-3 px-6 rounded-xl font-bold text-sm text-white shadow-lg transition duration-200 transform hover:-translate-y-0.5 ${
                notifyModal.type === 'success' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-900/40' :
                notifyModal.type === 'warning' ? 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 shadow-amber-900/40' :
                'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-900/40'
              }`}
            >
              รับทราบ / ตกลง
            </button>
          </div>
        </div>
      )}

      {/* Master Security Confirmation Modal for Offboarding Takeout */}
      {exportTenantModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 ${cardBgClass} animate-fade-in`}>
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">ยืนยันการนำออกข้อมูลส่งมอบ (Data Offboarding Takeout)</h3>
                <p className="text-xs text-slate-400">สร้างชุดข้อมูลพร้อม SHA-256 Checksum สำหรับสิ้นสุดสัญญา</p>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs space-y-2 text-amber-200">
              <div className="font-bold">⚠️ รายละเอียดหน่วยงานที่จะนำออกข้อมูล:</div>
              <div>• ชื่อหน่วยงาน: <b>{exportTenantModal.nameTh}</b> ({exportTenantModal.nameEn})</div>
              <div>• รหัสหน่วยงาน (ID): <b>{exportTenantModal.id}</b></div>
              <div className="text-[11px] text-amber-300/80 mt-1">
                การดำเนินการนี้จะรวมข้อมูลคำขอสิทธิ์ PDPA ทั้งหมด, บัญชีผู้ใช้, และ Audit Trail พร้อมลงนามด้วยรหัสแฮช SHA-256
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-300">เลือกรูปแบบไฟล์ส่งมอบ (Export Format)</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportFormat('json')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    exportFormat === 'json' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span>JSON Snapshot Archive (แนะนำ)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat('csv')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    exportFormat === 'csv' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span>CSV Summary Manifest</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-slate-300">
                พิมพ์คำว่า <span className="text-amber-400 font-mono font-bold">EXPORT-{exportTenantModal.id.toUpperCase()}</span> หรือ <span className="text-amber-400 font-mono font-bold">EXPORT</span> เพื่อยืนยัน
              </label>
              <input
                type="text"
                value={masterConfirmText}
                onChange={(e) => setMasterConfirmText(e.target.value)}
                placeholder={`EXPORT-${exportTenantModal.id.toUpperCase()}`}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-amber-500 ${inputBgClass}`}
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setExportTenantModal(null);
                  setMasterConfirmText('');
                }}
                className="w-1/3 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmOffboardExport}
                disabled={exportingLoading}
                className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {exportingLoading ? (
                  <span>⏳ กำลังสร้างไฟล์แพ็กเกจ SHA-256...</span>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>ยืนยันดาวน์โหลดชุดข้อมูลส่งมอบ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate of Data Offboarding Modal */}
      {offboardCertModal && offboardCertModal.open && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className={`border border-emerald-500/40 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-5 ${cardBgClass} animate-fade-in`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                  <CheckCircle className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-emerald-400">ใบรับรองการส่งมอบข้อมูล PDPA (Data Offboarding Certificate)</h3>
                  <p className="text-xs text-slate-400">ระบบตรวจสอบและลงนามรับรองความถูกต้องด้วย SHA-256 Checksum</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOffboardCertModal(null)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between border-b border-slate-800/60 pb-2">
                  <span className="text-slate-400">หน่วยงาน (Tenant Name):</span>
                  <span className="font-bold text-white">{offboardCertModal.tenant.nameTh} ({offboardCertModal.tenant.id})</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-2">
                  <span className="text-slate-400">วันที่สร้างและนำออกข้อมูล:</span>
                  <span className="font-mono text-emerald-400 font-bold">{new Date(offboardCertModal.exportedAt).toLocaleString('th-TH')}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-2">
                  <span className="text-slate-400">สถิติข้อมูลที่นำออก:</span>
                  <span className="text-slate-200">
                    {offboardCertModal.stats.totalUsers} บัญชี | {offboardCertModal.stats.totalRequests} คำขอ PDPA | {offboardCertModal.stats.totalAuditLogs} Audit Logs
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ขนาดไฟล์แพ็กเกจ (Size):</span>
                  <span className="font-mono text-slate-300 font-semibold">{(offboardCertModal.stats.packageSizeBytes / 1024).toFixed(2)} KB</span>
                </div>
              </div>

              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" />
                    <span>SHA-256 Cryptographic Checksum (Digital Hash):</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(offboardCertModal.checksum);
                      showNotify('คัดลอกค่า SHA-256 Checksum ไปยังคลิปบอร์ดแล้ว', 'success', 'คัดลอกสำเร็จ');
                    }}
                    className="text-[11px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-semibold"
                  >
                    📋 คัดลอก Hash
                  </button>
                </div>
                <div className="font-mono text-[11px] bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-emerald-300 break-all select-all font-bold">
                  {offboardCertModal.checksum}
                </div>
                <div className="text-[11px] text-slate-300 pt-1">
                  💡 ใช้รหัสแฮชนี้ในบันทึกข้อตกลงสิ้นสุดสัญญา (Contract Expiry & Data Offboarding Memo) เพื่อยืนยันว่าชุดข้อมูลไม่ได้ถูกแก้ไข
                </div>
              </div>

              {/* Executive Download Center */}
              <div className="p-4 bg-slate-900/90 border border-slate-700/80 rounded-2xl space-y-3 shadow-inner">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Download className="h-4 w-4 shrink-0" />
                    <span>📦 ดำเนินการดาวน์โหลดเอกสาร (กรุณาดาวน์โหลดทั้ง 2 รายการด้วยตนเอง)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    ยืนยันด้วยตนเอง
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Button 1: Download Archive (.json or .csv) */}
                  <button
                    type="button"
                    onClick={() => handleDownloadArchive(offboardCertModal)}
                    className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-900/20 group"
                  >
                    <Archive className="h-4 w-4 text-emerald-200 group-hover:scale-110 transition-transform" />
                    <span>1. ดาวน์โหลดชุดข้อมูล ({offboardCertModal.exportFormat === 'csv' ? '.CSV Manifest' : '.JSON Archive'})</span>
                  </button>

                  {/* Button 2: Generate PDF Handover Memo */}
                  <button
                    type="button"
                    onClick={() => handleOpenHandoverPDF(offboardCertModal)}
                    className="p-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-amber-900/20 group"
                  >
                    <FileText className="h-4 w-4 text-amber-200 group-hover:scale-110 transition-transform" />
                    <span>2. พิมพ์/บันทึก หนังสือส่งมอบ (.PDF Formal A4)</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 text-center">
                  💡 ระบบเปลี่ยนรูปแบบเอกสารบันทึกข้อตกลงเป็น <b>.PDF ทางการ (A4 Formal Layout)</b> เพื่อให้พร้อมพิมพ์หรือบันทึกเป็นไฟล์ PDF ลงนามร่วมกันได้อย่างสะดวก
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center gap-3 pt-3 border-t border-slate-800 flex-wrap">
              <button
                type="button"
                onClick={() => handleOpenHandoverPDF(offboardCertModal)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 text-xs font-bold transition flex items-center gap-2 shadow"
              >
                <FileText className="h-4 w-4 text-amber-400" />
                <span>🖨️ พิมพ์หนังสือข้อตกลง (.PDF A4)</span>
              </button>
              <button
                type="button"
                onClick={() => setOffboardCertModal(null)}
                className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg"
              >
                เสร็จสิ้น / ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handover Memo Template Editing Modal */}
      {memoTemplateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`border rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative overflow-hidden ${cardBgClass}`}>
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-yellow-400" />
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-400 border border-amber-500/30">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">ตั้งค่าข้อความต้นแบบบันทึกข้อตกลงส่งมอบข้อมูล</h3>
                  <p className="text-xs text-slate-400">Handover Memorandum Template Editor สำหรับ Super Admin</p>
                </div>
              </div>
              <button
                onClick={() => setMemoTemplateModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl text-xs space-y-1">
                <span className="font-bold text-amber-400 block">💡 คำแนะนำตัวแปรอัตโนมัติ (Dynamic Placeholders):</span>
                <p className="text-slate-300 leading-relaxed">
                  สามารถใช้ตัวแปรด้านล่างเพื่อให้ระบบเติมข้อมูลจริงและรหัส SHA-256 อัตโนมัติในวันส่งมอบ:
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1 font-mono text-[10px]">
                  <span className="bg-slate-800 text-amber-300 px-2 py-0.5 rounded border border-slate-700">{'{{TENANT_ID}}'}</span>
                  <span className="bg-slate-800 text-amber-300 px-2 py-0.5 rounded border border-slate-700">{'{{TENANT_NAME_TH}}'}</span>
                  <span className="bg-slate-800 text-amber-300 px-2 py-0.5 rounded border border-slate-700">{'{{TENANT_NAME_EN}}'}</span>
                  <span className="bg-slate-800 text-amber-300 px-2 py-0.5 rounded border border-slate-700">{'{{EXPORT_DATE}}'}</span>
                  <span className="bg-slate-800 text-amber-300 px-2 py-0.5 rounded border border-slate-700">{'{{EXPORT_DATE_SHORT}}'}</span>
                  <span className="bg-slate-800 text-amber-300 px-2 py-0.5 rounded border border-slate-700">{'{{FILENAME}}'}</span>
                  <span className="bg-slate-800 text-amber-300 px-2 py-0.5 rounded border border-slate-700">{'{{FILE_SIZE_KB}}'}</span>
                  <span className="bg-slate-800 text-amber-300 px-2 py-0.5 rounded border border-slate-700">{'{{TOTAL_USERS}}'}</span>
                  <span className="bg-slate-800 text-amber-300 px-2 py-0.5 rounded border border-slate-700">{'{{TOTAL_REQUESTS}}'}</span>
                  <span className="bg-slate-800 text-amber-300 px-2 py-0.5 rounded border border-slate-700">{'{{TOTAL_LOGS}}'}</span>
                  <span className="bg-slate-800 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40 font-bold">{'{{SHA256_CHECKSUM}}'}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  เนื้อหาหนังสือบันทึกข้อตกลงส่งมอบข้อมูล (Handover Memorandum Template):
                </label>
                {memoTemplateLoading ? (
                  <div className="h-64 flex items-center justify-center border border-slate-800 rounded-xl bg-slate-950 text-slate-400 text-xs">
                    <RefreshCw className="h-5 w-5 animate-spin mr-2" /> กำลังโหลดแม่แบบ...
                  </div>
                ) : (
                  <textarea
                    value={memoTemplateText}
                    onChange={(e) => setMemoTemplateText(e.target.value)}
                    rows={15}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500/50 leading-relaxed"
                    placeholder="ระบุข้อความบันทึกข้อตกลง..."
                  />
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleResetDefaultMemoTemplate}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                🔄 คืนค่าแม่แบบเริ่มต้น (Reset Default)
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMemoTemplateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveMemoTemplate}
                  disabled={memoTemplateSaving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {memoTemplateSaving && <RefreshCw className="h-4 w-4 animate-spin" />}
                  <span>บันทึกแม่แบบ (Save Template)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className={`border-t p-4 text-center text-xs text-slate-500 ${headerBgClass}`}>
        Standalone Super Admin Web App | High Security MFA Portal
      </footer>
    
      {/* Edit Role Modal */}
      {editRoleModal.open && editRoleModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl shadow-xl overflow-hidden border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <h3 className="font-bold flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                <span>แก้ไขบทบาทสิทธิ์ (Edit Role)</span>
              </h3>
              <button onClick={() => setEditRoleModal({ open: false, user: null, newRole: '' })} className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-400">ผู้ใช้งาน</label>
                <div className="text-sm font-bold text-emerald-500">{editRoleModal.user.username} <span className="text-slate-400 font-normal">({editRoleModal.user.fullName})</span></div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-400">เลือกบทบาทใหม่</label>
                <select
                  value={editRoleModal.newRole}
                  onChange={(e) => setEditRoleModal({ ...editRoleModal, newRole: e.target.value })}
                  className={`w-full text-sm px-3 py-2 rounded-lg border outline-none focus:border-blue-500 transition ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-white border-slate-300'}`}
                >
                  <option value="intake">INTAKE (เจ้าหน้าที่รับเรื่อง)</option>
                  <option value="owner">OWNER (ผู้ดูแลระบบข้อมูล)</option>
                  <option value="dpo">DPO (เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล)</option>
                  <option value="approver">APPROVER (ผู้อนุมัติ/ผู้บริหาร)</option>
                  <option value="admin">ADMIN (ผู้ดูแลระบบหน่วยงาน)</option>
                </select>
              </div>
            </div>
            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
              <button
                onClick={() => setEditRoleModal({ open: false, user: null, newRole: '' })}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'}`}
              >
                ยกเลิก
              </button>
              <button
                onClick={submitEditRole}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-blue-500 hover:bg-blue-600 text-white transition flex items-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <Check className="h-4 w-4" />
                <span>บันทึกสิทธิ์</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordModal.open && resetPasswordModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl shadow-xl overflow-hidden border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <h3 className="font-bold flex items-center gap-2">
                <Key className="h-5 w-5 text-amber-500" />
                <span>เปลี่ยนรหัสผ่าน (Reset Password)</span>
              </h3>
              <button onClick={() => setResetPasswordModal({ open: false, user: null, newPassword: '' })} className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-400">
                กรุณาระบุรหัสผ่านใหม่ สำหรับยูสเซอร์ <span className="font-bold text-emerald-500">{resetPasswordModal.user.username}</span>
              </p>
              <div>
                <input
                  type="text"
                  placeholder="รหัสผ่านใหม่ (เช่น 123456)"
                  value={resetPasswordModal.newPassword}
                  onChange={(e) => setResetPasswordModal({ ...resetPasswordModal, newPassword: e.target.value })}
                  className={`w-full text-sm px-3 py-2 rounded-lg border outline-none focus:border-amber-500 transition ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-white border-slate-300'}`}
                />
              </div>
            </div>
            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
              <button
                onClick={() => setResetPasswordModal({ open: false, user: null, newPassword: '' })}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'}`}
              >
                ยกเลิก
              </button>
              <button
                onClick={submitResetPassword}
                disabled={!resetPasswordModal.newPassword}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
              >
                <Check className="h-4 w-4" />
                <span>ยืนยันการเปลี่ยน</span>
              </button>
            </div>
          </div>
        </div>
      )}
</div>
  );
}
