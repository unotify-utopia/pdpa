import React, { useState, useEffect } from 'react';
import { ShieldCheck, Mail, AlertCircle, CheckCircle2, Clock, Lock, RefreshCw, FileArchive } from 'lucide-react';

interface SecureDownloadPageProps {
  token: string;
}

type Step = 'loading' | 'info' | 'otp' | 'success' | 'error';

export const SecureDownloadPage: React.FC<SecureDownloadPageProps> = ({ token }) => {
  const [step, setStep] = useState<Step>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [info, setInfo] = useState<{
    trackingNo: string;
    requesterName: string;
    requesterEmail: string;
    expiresAt: string;
    downloadedCount: number;
  } | null>(null);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Load token info on mount
  useEffect(() => {
    fetch(`/api/dl/info/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setInfo(data);
          setStep('info');
        } else {
          setErrorMsg(data.message || 'ลิงก์ไม่ถูกต้องหรือหมดอายุ');
          setStep('error');
        }
      })
      .catch(() => {
        setErrorMsg('ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่');
        setStep('error');
      });
  }, [token]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleRequestOtp = async () => {
    setIsSending(true);
    setOtpError('');
    try {
      const res = await fetch('/api/dl/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (data.success) {
        setMaskedEmail(data.maskedEmail);
        setStep('otp');
        setCountdown(60); // 60s before resend
      } else {
        setOtpError(data.message || 'ไม่สามารถส่ง OTP ได้');
      }
    } catch {
      setOtpError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { setOtpError('กรุณากรอกรหัส OTP 6 หลัก'); return; }
    setIsVerifying(true);
    setOtpError('');
    try {
      const res = await fetch('/api/dl/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, otp })
      });
      const data = await res.json();
      if (data.success) {
        setSessionToken(data.sessionToken);
        setStep('success');
      } else {
        setOtpError(data.message || 'OTP ไม่ถูกต้อง');
      }
    } catch {
      setOtpError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDownload = () => {
    window.location.href = `/api/dl/download/${token}?session=${encodeURIComponent(sessionToken)}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('th-TH', {
        year: 'numeric', month: 'long', day: 'numeric',
        timeZone: 'Asia/Bangkok'
      });
    } catch { return dateStr; }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 mb-4 text-white text-center shadow-2xl border border-blue-500/30">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold">ระบบดาวน์โหลดเอกสารปลอดภัย</h1>
          <p className="text-blue-200 text-sm mt-1">PDPA Secure Document Download</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200/50">

          {/* Loading */}
          {step === 'loading' && (
            <div className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500 font-medium">กำลังตรวจสอบลิงก์...</p>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-rose-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">ไม่สามารถเข้าถึงได้</h2>
              <p className="text-rose-600 font-semibold text-sm bg-rose-50 border border-rose-200 rounded-xl p-3">{errorMsg}</p>
              <p className="text-slate-400 text-sm">
                ลิงก์นี้อาจหมดอายุ (เกิน 30 วัน) หรือถูกยกเลิกแล้ว<br/>
                กรุณาติดต่อหน่วยงานผู้ออกเอกสาร
              </p>
            </div>
          )}

          {/* Info Step */}
          {step === 'info' && info && (
            <div className="p-6 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-emerald-800">ลิงก์ถูกต้องและยังใช้งานได้</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">เลขที่คำขอ</span>
                    <span className="font-mono font-bold text-slate-800">{info.trackingNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ผู้ยื่นคำขอ</span>
                    <span className="font-semibold text-slate-800">{info.requesterName || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />หมดอายุ</span>
                    <span className="font-semibold text-amber-700">{formatDate(info.expiresAt)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                <div className="flex items-start gap-2">
                  <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>เพื่อความปลอดภัย ระบบจะส่งรหัส OTP ไปยังอีเมลที่ลงทะเบียนไว้ตอนยื่นคำขอ ก่อนดาวน์โหลด</p>
                </div>
              </div>

              {otpError && <p className="text-sm text-red-600 text-center font-semibold">{otpError}</p>}

              <button
                onClick={handleRequestOtp}
                disabled={isSending}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
              >
                {isSending ? (
                  <><RefreshCw className="w-5 h-5 animate-spin" /> กำลังส่ง OTP...</>
                ) : (
                  <><Mail className="w-5 h-5" /> รับรหัส OTP ทางอีเมล</>
                )}
              </button>
            </div>
          )}

          {/* OTP Step */}
          {step === 'otp' && (
            <div className="p-6 space-y-5 text-center">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">กรอกรหัส OTP</h2>
                <p className="text-slate-500 text-sm">
                  ระบบส่งรหัส 6 หลักไปที่<br/>
                  <span className="font-bold text-slate-700">{maskedEmail}</span><br/>
                  <span className="text-xs text-slate-400">(รหัสมีอายุ 10 นาที)</span>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="block w-full text-center text-4xl tracking-[0.6em] font-mono py-4 border-b-2 border-slate-300 focus:border-blue-600 focus:outline-none bg-transparent transition"
                  placeholder="------"
                  autoFocus
                />
                {otpError && (
                  <p className="text-sm text-red-600 font-semibold flex items-center justify-center gap-1">
                    <AlertCircle className="w-4 h-4" />{otpError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isVerifying || otp.length < 6}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
                >
                  {isVerifying ? (
                    <><RefreshCw className="w-5 h-5 animate-spin" /> กำลังตรวจสอบ...</>
                  ) : (
                    <><CheckCircle2 className="w-5 h-5" /> ยืนยันและดาวน์โหลด</>
                  )}
                </button>
              </form>

              <button
                onClick={handleRequestOtp}
                disabled={countdown > 0 || isSending}
                className="text-sm font-semibold text-blue-600 hover:text-blue-800 disabled:text-slate-400 transition"
              >
                {countdown > 0 ? `ขอรหัสใหม่ได้ใน ${countdown} วินาที` : 'ขอรหัส OTP ใหม่'}
              </button>
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="p-6 text-center space-y-5">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-1">ยืนยันตัวตนสำเร็จ</h2>
                <p className="text-slate-500 text-sm">คุณสามารถดาวน์โหลดเอกสารได้แล้ว<br/>
                  <span className="text-xs text-amber-600 font-semibold">⚠️ ลิงก์นี้ใช้ได้ภายใน 15 นาที</span>
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-left space-y-1">
                <p className="text-slate-500">เลขที่คำขอ: <span className="font-mono font-bold text-slate-800">{info?.trackingNo}</span></p>
                <p className="text-slate-500 text-xs">ไฟล์จะถูกดาวน์โหลดเป็น ZIP ที่มีเอกสารทั้งหมด</p>
              </div>

              <button
                onClick={handleDownload}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 text-lg"
              >
                <FileArchive className="w-6 h-6" />
                ดาวน์โหลดเอกสาร (ZIP)
              </button>

              <button
                onClick={() => { setStep('info'); setOtp(''); setSessionToken(''); }}
                className="text-sm text-slate-400 hover:text-slate-600 transition"
              >
                กลับหน้าหลัก
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 text-center">
            <p className="text-xs text-slate-400">PDPA Secure Document System · Protected by OTP Authentication</p>
          </div>
        </div>
      </div>
    </div>
  );
};
