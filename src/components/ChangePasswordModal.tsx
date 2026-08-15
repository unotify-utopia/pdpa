import React, { useState } from 'react';
import { X, Lock, Key, Eye, EyeOff, Check } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  forceMode?: boolean;
}

export function ChangePasswordModal({ isOpen, onClose, forceMode = false }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Real-time validation
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

    if (newPassword !== confirmPassword) {
      setErrorMsg('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    
    if (!isAllValid) {
      setErrorMsg('กรุณาตั้งรหัสผ่านให้ตรงตามเงื่อนไขที่กำหนด');
      return;
    }

    setLoading(true);
    try {
      const token = sessionStorage.getItem('pdpa_token') || sessionStorage.getItem('pdpa_jwt_token');
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      
      if (!data.success) {
        setErrorMsg(data.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
      } else {
        setSuccessMsg('เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว');
        setTimeout(() => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          onClose();
          setSuccessMsg('');
        }, 2000);
      }
    } catch (err) {
      setErrorMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200">
        <div className="p-4 bg-brand-600 flex justify-between items-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
          <div className="flex items-center gap-2 text-white relative z-10">
            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-md">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide">เปลี่ยนรหัสผ่าน</h2>
              <p className="text-[10px] text-brand-100 font-medium">สำหรับผู้ใช้งานระบบเจ้าหน้าที่</p>
            </div>
          </div>
          {!forceMode && (
            <button onClick={onClose} className="text-brand-100 hover:text-white transition relative z-10 p-1 hover:bg-white/10 rounded">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="p-5 relative">
          {errorMsg && (
            <div className="mb-4 bg-rose-50 border-l-4 border-rose-500 text-rose-700 p-3 rounded text-xs font-semibold shadow-sm flex items-start gap-2">
              <Lock className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}
          
          {successMsg && (
            <div className="mb-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 p-3 rounded text-xs font-semibold shadow-sm flex items-start gap-2">
              <Lock className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">รหัสผ่านปัจจุบัน</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 pr-10 outline-none focus:ring-2 focus:ring-brand-500 text-sm text-slate-900 transition shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">รหัสผ่านใหม่</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 pr-10 outline-none focus:ring-2 focus:ring-brand-500 text-sm text-slate-900 transition shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
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
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">ยืนยันรหัสผ่านใหม่</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 pr-10 outline-none focus:ring-2 focus:ring-brand-500 text-sm text-slate-900 transition shadow-sm"
                />
              </div>
            </div>

              <div className="flex gap-2">
                {!forceMode && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-1/3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                  >
                    ยกเลิก
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading || !isAllValid}
                  className={`${forceMode ? 'w-full' : 'flex-1'} py-2 text-xs font-bold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition shadow-md disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed`}
                >
                  {loading ? 'กำลังเปลี่ยนรหัสผ่าน...' : 'บันทึกรหัสผ่านใหม่'}
                </button>
              </div>
          </form>
        </div>
      </div>
    </div>
  );
}
