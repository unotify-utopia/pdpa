import React, { useState } from 'react';
import { KeyRound, CheckCircle2, AlertCircle, X, ShieldCheck, Check } from 'lucide-react';

interface ResetPasswordModalProps {
  isOpen: boolean;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, token, onClose, onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isLengthValid = newPassword.length >= 8;
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSpecialChar = /[@$!%*?&]/.test(newPassword);
  const isAllValid = isLengthValid && hasLowerCase && hasUpperCase && hasNumber && hasSpecialChar;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!isAllValid) {
      setErrorMsg('กรุณาตั้งรหัสผ่านให้ตรงตามเงื่อนไขที่กำหนด (8 ตัวอักษร, พิมพ์เล็ก, พิมพ์ใหญ่, ตัวเลข, อักขระพิเศษ)');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.message || 'ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว');
      } else {
        setSuccessMsg(data.message || 'ตั้งรหัสผ่านใหม่สำเร็จ');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 3000);
      }
    } catch (err) {
      setErrorMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="bg-slate-50 text-slate-800 p-6 relative border-b border-slate-100">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">ตั้งรหัสผ่านใหม่</h3>
              <p className="text-xs text-slate-500 mt-1">
                กรุณากำหนดรหัสผ่านใหม่สำหรับบัญชีของคุณ
              </p>
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

          {successMsg ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex flex-col items-center gap-2 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                <span className="font-semibold">เปลี่ยนรหัสผ่านสำเร็จ</span>
                <span className="text-xs text-emerald-600">{successMsg}</span>
                <span className="text-xs text-slate-500 mt-2">กำลังพากลับไปหน้าเข้าสู่ระบบ...</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-brand-600" />
                  <span>รหัสผ่านใหม่ (New Password)</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand-500 text-slate-900"
                />
              </div>

              {/* Validation Checklist */}
              {newPassword && (
                <div className="mt-2 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-600 mb-1.5">รหัสผ่านต้องประกอบด้วย:</p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    <div className={`flex items-center gap-1.5 text-[10px] ${isLengthValid ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                      <Check className={`h-3 w-3 ${isLengthValid ? 'opacity-100' : 'opacity-0'}`} />
                      ความยาว 8+ ตัว
                    </div>
                    <div className={`flex items-center gap-1.5 text-[10px] ${hasLowerCase ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                      <Check className={`h-3 w-3 ${hasLowerCase ? 'opacity-100' : 'opacity-0'}`} />
                      พิมพ์เล็ก (a-z)
                    </div>
                    <div className={`flex items-center gap-1.5 text-[10px] ${hasUpperCase ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                      <Check className={`h-3 w-3 ${hasUpperCase ? 'opacity-100' : 'opacity-0'}`} />
                      พิมพ์ใหญ่ (A-Z)
                    </div>
                    <div className={`flex items-center gap-1.5 text-[10px] ${hasNumber ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                      <Check className={`h-3 w-3 ${hasNumber ? 'opacity-100' : 'opacity-0'}`} />
                      ตัวเลข (0-9)
                    </div>
                    <div className={`flex items-center gap-1.5 text-[10px] ${hasSpecialChar ? 'text-emerald-600 font-semibold' : 'text-slate-400'} col-span-2`}>
                      <Check className={`h-3 w-3 ${hasSpecialChar ? 'opacity-100' : 'opacity-0'}`} />
                      อักขระพิเศษ (เช่น @, $, !, %)
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-brand-600" />
                  <span>ยืนยันรหัสผ่านใหม่ (Confirm Password)</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand-500 text-slate-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 rounded-lg transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading || !isAllValid}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold py-2.5 rounded-lg transition shadow-md flex items-center justify-center gap-1.5"
                >
                  {loading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
