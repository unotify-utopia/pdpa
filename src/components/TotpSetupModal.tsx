import React from 'react';
import { ShieldAlert, X } from 'lucide-react';

interface TotpSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCodeUrl: string;
  secret: string;
  loading: boolean;
  codeInput: string;
  setCodeInput: (code: string) => void;
  onVerify: (e: React.FormEvent) => void;
}

export const TotpSetupModal: React.FC<TotpSetupModalProps> = ({
  isOpen,
  onClose,
  qrCodeUrl,
  secret,
  loading,
  codeInput,
  setCodeInput,
  onVerify,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 bg-white border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl">
              <ShieldAlert className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">ตั้งค่า Authenticator App</h3>
              <p className="text-[11px] text-slate-500">เพิ่มความปลอดภัยด้วยรหัสยืนยัน 2FA</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs font-medium">กำลังโหลด QR Code...</div>
        ) : (
          <div className="space-y-4">
            <div className="text-center bg-white p-4 rounded-xl mx-auto w-fit border border-slate-100 shadow-sm">
              {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code for TOTP" className="mx-auto" />}
            </div>
            <div className="text-center">
              <p className="text-[11px] text-slate-500 mb-1">หรือกรอกรหัสตั้งค่าด้วยตนเอง:</p>
              <code className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg font-bold tracking-wider select-all">
                {secret}
              </code>
            </div>
            <form onSubmit={onVerify} className="space-y-3 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold mb-1 text-center text-slate-700">กรอกรหัส 6 หลักจากแอป</label>
                <input
                  type="text"
                  maxLength={6}
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full text-center tracking-[0.5em] font-mono text-xl py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 font-bold"
                  required
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={codeInput.length !== 6}
                  className="w-2/3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-md"
                >
                  ยืนยันและเปิดใช้งาน
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
