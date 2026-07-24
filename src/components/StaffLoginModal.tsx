import React, { useState } from 'react';
import { Lock, User, KeyRound, ShieldCheck, AlertCircle } from 'lucide-react';
import type { User as UserType } from '../types';

interface StaffLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserType) => void;
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
  const [setup2FAUrl, setSetup2FAUrl] = useState<string | null>(null);
  
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
      
      if (data.requires2FASetup) {
        // Call setup 2fa
        const setupRes = await fetch('/api/auth/2fa/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const setupData = await setupRes.json();
        if (setupData.success) {
          setSetup2FAUrl(setupData.qrCodeUrl);
          setPendingUser({ username, password });
          setMfaStep(true);
        } else {
          setErrorMsg(setupData.message || 'Error setting up 2FA');
        }
        return;
      }

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
      const user: UserType = {
        id: data.user.id,
        orgId: data.user.orgId,
        username: data.user.username,
        fullNameTh: data.user.fullNameTh || data.user.username,
        fullNameEn: '',
        email: data.user.email,
        role: data.user.role as any,
        roles: data.user.roles || [data.user.role],
        department: data.user.department,
        mfaEnabled: true
      };
      onLoginSuccess(user);
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
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: pendingUser.username, 
          password: pendingUser.password,
          mfaCode: otpCode 
        })
      });
      const data = await res.json();
      
      if (!data.success) {
        setErrorMsg(data.message || 'รหัส 2FA ไม่ถูกต้อง');
        return;
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
        department: data.user.department,
        mfaEnabled: true
      };
      onLoginSuccess(user);
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
            <form onSubmit={handleLoginSubmit} className="space-y-4">
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
                  placeholder="อีเมล หรือ Username (เช่น apichat.utopia@gmail.com)"
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand-500 text-slate-900"
                />
              </div>

              {/* Removed mockup hint block */}

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
                {setup2FAUrl ? (
                  <div className="flex flex-col items-center justify-center space-y-2 mt-2">
                    <span className="font-semibold text-rose-600">สแกน QR Code เพื่อตั้งค่า Google Authenticator</span>
                    <img src={setup2FAUrl} alt="2FA QR Code" className="w-32 h-32 border-2 border-brand-300 rounded" />
                  </div>
                ) : (
                  <span>กรุณาเปิดแอป <span className="font-bold">Google Authenticator</span> เพื่อดูรหัส 6 หลัก</span>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 text-center block">ระบุรหัส 2FA (6 หลัก)</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="123456"
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
                    setSetup2FAUrl(null);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 rounded-lg transition"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-lg transition shadow-md"
                >
                  ยืนยันรหัส 2FA
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
