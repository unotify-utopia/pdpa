import React, { useState, useEffect } from 'react';
import { Lock, User, KeyRound, ShieldCheck, AlertCircle } from 'lucide-react';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import type { User as UserType } from '../types';

interface StaffLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserType, requiresPasswordChange?: boolean) => void;
}

export const StaffLoginModal: React.FC<StaffLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [mfaStep, setMfaStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [pendingUser, setPendingUser] = useState<any | null>(null);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setOtpCode('');
      setErrorMsg('');
      setUsername('');
      setPassword('');
      setMfaStep(false);
      setPendingUser(null);
      setIsForgotOpen(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.trim() === '') {
      setErrorMsg('กรุณากรอกรหัสผ่าน');
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      

      if (data.requires2FA) {
        setPendingUser({ username, password });
        setMfaStep(true);
        return;
      }

      if (!data.success) {
        setErrorMsg(data.message || 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
        return;
      }

      // Login success
      if (data.token) {
        sessionStorage.setItem('pdpa_token', data.token);
        sessionStorage.setItem('pdpa_jwt_token', data.token);
      }
      const user: UserType = {
        id: data.user.id,
        orgId: data.user.orgId,
        username: data.user.username,
        fullNameTh: data.user.fullNameTh || data.user.username,
        fullNameEn: '',
        email: data.user.email,
        role: data.user.role as any,
        roles: data.user.roles || [data.user.role],
        isSuperAdmin: data.user.isSuperAdmin,
        department: data.user.department,
        mfaEnabled: true
      };
      const requiresChange = data.requiresPasswordChange || false;
      onLoginSuccess(user, requiresChange);
      onClose();
    } catch (err) {
      setErrorMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setErrorMsg('รหัส OTP ไม่ถูกต้อง กรุณากรอกรหัส 6 หลัก');
      return;
    }
    
    const submittedOtp = otpCode;
    setOtpCode('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: pendingUser.username, 
          password: pendingUser.password,
          mfaCode: submittedOtp 
        })
      });
      const data = await res.json();
      
      if (!data.success) {
        setErrorMsg(data.message || 'รหัส 2FA ไม่ถูกต้อง');
        return;
      }

      if (data.token) {
        sessionStorage.setItem('pdpa_token', data.token);
        sessionStorage.setItem('pdpa_jwt_token', data.token);
      }

      const user: UserType = {
        id: data.user.id,
        orgId: data.user.orgId,
        username: data.user.username,
        fullNameTh: data.user.fullNameTh || data.user.username,
        fullNameEn: '',
        email: data.user.email,
        role: data.user.role as any,
        roles: data.user.roles || [data.user.role],
        isSuperAdmin: data.user.isSuperAdmin,
        department: data.user.department,
        mfaEnabled: true
      };
      
      const requiresChange = data.requiresPasswordChange || false;
      onLoginSuccess(user, requiresChange);
      onClose();
    } catch (err) {
      setErrorMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 relative">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-500 flex items-center justify-center text-white font-bold">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">เข้าสู่ระบบสำหรับเจ้าหน้าที่</h3>
              <p className="text-xs text-slate-400">Enterprise Multi-Tenant Authentication</p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!mfaStep ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4" autoComplete="off">
              {/* Form Body */}
              <div className="space-y-1 text-center mb-4 text-xs text-slate-500">
                เข้าสู่ระบบด้วยอีเมลหรือชื่อผู้ใช้งานของคุณ
              </div>

              {/* Username */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-brand-600" />
                  <span>ชื่อผู้ใช้งาน (Username)</span>
                </label>
                <input
                  type="text"
                  required
                  autoComplete="new-password"
                  placeholder="อีเมล หรือ Username (เช่น staff@example.com)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand-500 text-slate-900"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-brand-600" />
                  <span>รหัสผ่าน (Password)</span>
                </label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand-500 text-slate-900"
                />
              </div>

              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  onClick={() => setIsForgotOpen(true)}
                  className="text-xs text-brand-600 hover:text-brand-800 font-semibold transition"
                >
                  ลืมรหัสผ่าน?
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 rounded-lg transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold py-2.5 rounded-lg transition shadow-md flex items-center justify-center gap-1.5"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>เข้าสู่ระบบ</span>
                </button>
              </div>
            </form>
          ) : (
            /* MFA Step */
            <form onSubmit={handleMfaVerify} className="space-y-4">
              <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-900 leading-relaxed text-center">
                <span className="font-bold block mb-1 text-sm">ยืนยันตัวตน 2 ปัจจัย (MFA Required)</span>
                <span>ระบบได้ส่งรหัส OTP ไปยัง <span className="font-bold">อีเมลของท่าน</span> แล้ว กรุณาตรวจสอบอีเมลและนำรหัส 6 หลักมากรอกที่นี่</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 text-center block">ระบุรหัส OTP (6 หลัก)</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoComplete="off"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full font-mono text-center text-lg font-bold border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 tracking-widest"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMfaStep(false);
                    setOtpCode('');
                    setErrorMsg('');
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 rounded-lg transition"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="submit"
                  disabled={otpCode.length !== 6}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white text-xs font-bold py-2.5 rounded-lg transition shadow-md"
                >
                  ยืนยันรหัส OTP
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <ForgotPasswordModal 
        isOpen={isForgotOpen} 
        onClose={() => setIsForgotOpen(false)} 
      />
    </div>
  );
};
