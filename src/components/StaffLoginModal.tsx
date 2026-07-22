import React, { useState } from 'react';
import { Lock, Building2, User, KeyRound, ShieldCheck, AlertCircle, Search } from 'lucide-react';
import type { User as UserType } from '../types';
import { initialOrganizations, systemUsers } from '../mockData';

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
  const [orgInput, setOrgInput] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [mfaStep, setMfaStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [pendingUser, setPendingUser] = useState<UserType | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Detect organization by Org Code, Name search, or Email Domain
    const query = orgInput.trim().toLowerCase();
    const matchedOrg = initialOrganizations.find(
      (o) =>
        o.id.toLowerCase() === query ||
        o.nameTh.toLowerCase().includes(query) ||
        o.nameEn.toLowerCase().includes(query) ||
        (query.includes('dopa') && o.id === 'org_dopa') ||
        (query.includes('rd') && o.id === 'org_rd') ||
        (query.includes('tech') && o.id === 'org_tech_th')
    );

    if (!matchedOrg) {
      setErrorMsg('ไม่พบรหัสหรือชื่อหน่วยงานนี้ในระบบ (ลองพิมพ์: dopa, rd, สรรพากร, ปกครอง)');
      return;
    }

    // Search user matching orgId and username
    const matchedUser = systemUsers.find(
      (u) => u.orgId === matchedOrg.id && u.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (!matchedUser) {
      setErrorMsg(`ไม่พบบัญชีผู้ใช้ใน ${matchedOrg.nameTh} หรือชื่อผู้ใช้ไม่ถูกต้อง`);
      return;
    }

    if (password.trim() === '') {
      setErrorMsg('กรุณากรอกรหัสผ่าน');
      return;
    }

    if (matchedUser.mfaEnabled) {
      setPendingUser(matchedUser);
      setMfaStep(true);
    } else {
      onLoginSuccess(matchedUser);
      onClose();
    }
  };

  const handleMfaVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode !== '123456' && otpCode.length < 6) {
      setErrorMsg('รหัส OTP ไม่ถูกต้อง (รหัสทดสอบ: 123456)');
      return;
    }
    if (pendingUser) {
      onLoginSuccess(pendingUser);
      onClose();
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
              {/* Organization Search / Org Code Input (No endless dropdown) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-brand-600" />
                  <span>รหัสหน่วยงาน / ชื่อองค์กร (Org Code)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="พิมพ์รหัสหรือชื่อหน่วยงาน เช่น dopa, rd, ปกครอง"
                    value={orgInput}
                    onChange={(e) => setOrgInput(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 pl-8 outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 font-medium"
                  />
                  <Search className="h-4 w-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
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
                  placeholder="เช่น dpo.pdpa, intake.pdpa, dpo.rd"
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

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 leading-relaxed space-y-1">
                <span className="font-bold block text-slate-700">💡 ข้อมูลทดสอบระบบแบบแยกหน่วยงาน:</span>
                <div>• กรมการปกครอง: รหัส <code className="bg-white px-1 border rounded font-bold text-brand-700">dopa</code> | User = <code className="bg-white px-1 border rounded">dpo.pdpa</code></div>
                <div>• กรมสรรพากร: รหัส <code className="bg-white px-1 border rounded font-bold text-brand-700">rd</code> | User = <code className="bg-white px-1 border rounded">dpo.rd</code></div>
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
              <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-900 leading-relaxed">
                <span className="font-bold block mb-0.5">ยืนยันตัวตน 2 ปัจจัย (MFA Required):</span>
                ระบบส่งรหัส OTP 6 หลัก ไปที่ <span className="font-bold">{pendingUser?.email}</span> แล้ว
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 text-center block">ระบุรหัส OTP (รหัสทดสอบ: 123456)</label>
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
                  onClick={() => setMfaStep(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 rounded-lg transition"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-lg transition shadow-md"
                >
                  ยืนยันรหัส OTP
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
