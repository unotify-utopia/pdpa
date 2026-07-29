import React, { useState } from 'react';
import { Search, ShieldCheck, Download, AlertCircle, FileText, CheckCircle2, QrCode } from 'lucide-react';
import type { Request, Organization } from '../types';

interface DocumentVerificationPortalProps {
  requests: Request[];
  organizations: Organization[];
  onTriggerOtp: (email: string, phone: string, trackingNo?: string) => Promise<boolean>;
  onVerifyOtp: (email: string, phone: string, otp: string, trackingNo?: string) => Promise<boolean>;
  onDownload: (reqId: string, otp: string) => void;
}

export const DocumentVerificationPortal: React.FC<DocumentVerificationPortalProps> = ({
  requests,
  organizations,
  onTriggerOtp,
  onVerifyOtp,
  onDownload
}) => {
  const [trackingNo, setTrackingNo] = useState('');
  const [searchResult, setSearchResult] = useState<Request | null>(null);
  const [searchError, setSearchError] = useState('');
  const [step, setStep] = useState<'search' | 'result' | 'otp' | 'success'>('search');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    
    if (!trackingNo.trim()) {
      setSearchError('กรุณาระบุเลขที่คำขอ / รหัสอ้างอิง');
      return;
    }

    const found = requests.find(r => 
      r.trackingNo.toLowerCase() === trackingNo.trim().toLowerCase() ||
      r.id.toLowerCase() === trackingNo.trim().toLowerCase()
    );

    if (found && (found.status === 'Ready for Delivery' || found.status === 'Delivered' || found.status === 'Closed')) {
      setSearchResult(found);
      setStep('result');
    } else {
      setSearchError('ไม่พบเอกสารที่ระบุ หรือเอกสารยังไม่อยู่ในสถานะพร้อมส่งมอบ/ดาวน์โหลด');
    }
  };

  const handleRequestOtp = async () => {
    if (!searchResult) return;
    setIsRequestingOtp(true);
    try {
      const email = searchResult.contactChannel === 'email' ? searchResult.requester.email : searchResult.requester.email;
      const phone = searchResult.requester.phone;
      const success = await onTriggerOtp(email, phone, searchResult.trackingNo);
      if (success) {
        setStep('otp');
      } else {
        setSearchError('ไม่สามารถส่ง OTP ได้ กรุณาลองใหม่อีกครั้ง');
      }
    } catch (e) {
      setSearchError('เกิดข้อผิดพลาดในการส่ง OTP');
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchResult) return;
    
    setOtpError('');
    if (!otpCode.trim() || otpCode.length < 6) {
      setOtpError('กรุณากรอกรหัส OTP 6 หลัก');
      return;
    }

    const email = searchResult.requester.email;
    const phone = searchResult.requester.phone;
    
    const isValid = await onVerifyOtp(email, phone, otpCode, searchResult.trackingNo);
    if (isValid) {
      setStep('success');
      onDownload(searchResult.id, otpCode);
    } else {
      setOtpError('รหัส OTP ไม่ถูกต้อง หรือหมดอายุแล้ว');
    }
  };

  const renderStatusBadge = (status: string) => {
    if (status === 'Ready for Delivery' || status === 'Delivered' || status === 'Closed') {
      return <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">อนุมัติเรียบร้อย (Approved)</span>;
    }
    return <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-full text-xs font-bold">{status}</span>;
  };

  const getOrgLogo = (orgId: string) => {
    return organizations.find(o => o.id === orgId)?.logoUrl;
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-brand-700 p-8 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-brand-800 opacity-50 transform -skew-y-3 origin-top-left"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm mb-4 border border-white/30 shadow-lg">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">ระบบตรวจสอบและดาวน์โหลดเอกสาร</h1>
            <p className="text-brand-100 text-sm max-w-md mx-auto">
              (Document Verification & Secure Download Portal)
            </p>
          </div>
        </div>

        <div className="p-8">
          {step === 'search' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2 mb-8">
                <h2 className="text-xl font-bold text-slate-800">ตรวจสอบความถูกต้อง / รับเอกสาร</h2>
                <p className="text-slate-500 text-sm">กรุณากรอกรหัสอ้างอิง (Tracking Number) ที่ปรากฏบนจดหมาย หรือสแกน QR Code จากเอกสาร</p>
              </div>

              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">รหัสอ้างอิงคำขอ (Reference No.)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-4 border border-slate-300 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-lg transition uppercase font-mono"
                      placeholder="เช่น REQ-123456-7890"
                      value={trackingNo}
                      onChange={(e) => setTrackingNo(e.target.value)}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button type="button" className="text-slate-400 hover:text-brand-600 transition">
                        <QrCode className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  {searchError && <p className="mt-2 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {searchError}</p>}
                </div>

                <button
                  type="submit"
                  className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-lg font-bold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition"
                >
                  ค้นหาเอกสาร (Search)
                </button>
              </form>
            </div>
          )}

          {step === 'result' && searchResult && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <button 
                  onClick={() => setStep('search')}
                  className="text-slate-500 hover:text-slate-700 text-sm font-semibold flex items-center gap-1"
                >
                  &larr; กลับไปค้นหาใหม่
                </button>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute -right-6 -top-6 text-emerald-100 opacity-50">
                  <ShieldCheck className="w-32 h-32" />
                </div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-emerald-500 text-white rounded-full p-1">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-emerald-900">เอกสารฉบับนี้เป็นของแท้ (Verified)</h3>
                      <p className="text-emerald-700 text-sm">ออกโดยระบบสารบรรณอิเล็กทรอนิกส์เมื่อ {new Date(searchResult.submissionDate).toLocaleDateString('th-TH')}</p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-5 shadow-sm border border-emerald-100 space-y-4">
                    <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">รหัสอ้างอิง</p>
                        <p className="font-mono font-bold text-slate-800">{searchResult.trackingNo}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">สถานะ</p>
                        {renderStatusBadge(searchResult.status)}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">เรื่อง</p>
                      <p className="font-semibold text-slate-800">แจ้งผลการพิจารณาคำขอใช้สิทธิฯ (PDPA Request)</p>
                    </div>
                    
                    <div className="flex items-center gap-3 pt-2">
                      {getOrgLogo(searchResult.orgId) ? (
                         <img src={getOrgLogo(searchResult.orgId) as string} alt="Logo" className="w-8 h-8 object-contain" />
                      ) : (
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                          <ShieldCheck className="w-4 h-4 text-slate-500" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">หน่วยงานผู้ออกเอกสาร</p>
                        <p className="font-semibold text-slate-800">{organizations.find(o => o.id === searchResult.orgId)?.nameTh || 'Unknown'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 text-center space-y-4">
                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto text-slate-600 mb-2">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800">ดาวน์โหลดเอกสารอิเล็กทรอนิกส์</h4>
                <p className="text-sm text-slate-500">สำหรับเจ้าของข้อมูล หรือผู้รับมอบอำนาจ<br/>คุณสามารถดาวน์โหลดเอกสารต้นฉบับและข้อมูลส่วนบุคคลได้</p>
                
                <button
                  onClick={handleRequestOtp}
                  disabled={isRequestingOtp}
                  className="w-full mt-4 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2"
                >
                  {isRequestingOtp ? 'กำลังส่งรหัส OTP...' : (
                    <>
                      <Download className="w-5 h-5" />
                      เข้าสู่ระบบเพื่อดาวน์โหลด
                    </>
                  )}
                </button>
                <p className="text-xs text-slate-400 mt-2">ระบบจะส่งรหัส OTP ไปยังอีเมล/เบอร์โทรศัพท์ที่ลงทะเบียนไว้</p>
              </div>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-6 animate-fade-in text-center">
              <button 
                  onClick={() => setStep('result')}
                  className="text-slate-500 hover:text-slate-700 text-sm font-semibold flex items-center gap-1 mb-4"
                >
                  &larr; ย้อนกลับ
              </button>
              
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600 mb-4">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">ยืนยันตัวตน (OTP)</h2>
              <p className="text-slate-500 text-sm mb-6">
                กรุณากรอกรหัส 6 หลักที่ถูกส่งไปยัง<br/>
                <span className="font-bold text-slate-700">{searchResult?.requester.email}</span> หรือ <span className="font-bold text-slate-700">{searchResult?.requester.phone}</span>
              </p>

              <form onSubmit={handleVerifyOtp} className="space-y-6 max-w-sm mx-auto">
                <div>
                  <input
                    type="text"
                    maxLength={6}
                    className="block w-full text-center text-3xl tracking-[0.5em] font-mono py-4 border-b-2 border-slate-300 focus:outline-none focus:border-brand-600 bg-transparent transition"
                    placeholder="------"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                  />
                  {otpError && <p className="mt-3 text-sm text-red-600 font-semibold">{otpError}</p>}
                </div>

                <button
                  type="submit"
                  className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-lg font-bold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition"
                >
                  ยืนยันและดาวน์โหลด
                </button>
                
                <button type="button" onClick={handleRequestOtp} className="text-sm font-bold text-brand-600 hover:text-brand-800 transition">
                  ขอรหัส OTP อีกครั้ง
                </button>
              </form>
            </div>
          )}
          
          {step === 'success' && (
            <div className="space-y-6 animate-fade-in text-center py-8">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">ดาวน์โหลดสำเร็จ</h2>
              <p className="text-slate-500 mb-8">
                ระบบได้เริ่มการดาวน์โหลดไฟล์ข้อมูลส่วนบุคคลของท่านแล้ว<br/>
                ไฟล์ที่ได้รับเป็นไฟล์ ZIP ที่มีการเข้ารหัสความปลอดภัย
              </p>
              
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl inline-block text-left">
                <p className="text-sm text-amber-800 font-semibold mb-1">รหัสผ่านสำหรับเปิดไฟล์ (ZIP Password):</p>
                <p className="text-lg font-mono font-bold text-slate-800 bg-white px-3 py-1 rounded inline-block border border-amber-100">{otpCode}</p>
                <p className="text-xs text-amber-700 mt-2">กรุณาจดจำรหัสนี้ไว้เพื่อเปิดไฟล์ที่ดาวน์โหลดไป</p>
              </div>
              
              <div className="pt-8">
                <button
                  onClick={() => {
                    setStep('search');
                    setTrackingNo('');
                    setOtpCode('');
                  }}
                  className="text-slate-500 hover:text-slate-800 font-bold transition"
                >
                  กลับไปหน้าแรก
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 text-center text-xs text-slate-500">
          Utopia Secure Document Delivery System &copy; 2026
        </div>
      </div>
    </div>
  );
};
