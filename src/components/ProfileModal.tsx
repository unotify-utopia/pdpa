import React, { useState, useEffect } from 'react';
import { X, Upload, Save, User, CheckCircle, Trash2 } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onProfileUpdate: (updatedUser: any) => void;
  showNotify: (message: string, type?: any, title?: string, onConfirm?: () => void, onCancel?: () => void) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, currentUser, onProfileUpdate, showNotify }) => {
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      setSignatureImage(currentUser.signature_image || null);
    }
  }, [isOpen, currentUser]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024) { // 100KB limit
      showNotify('ขนาดไฟล์ลายเซ็นต้องไม่เกิน 100KB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSignatureImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const saveSignature = async () => {
    await uploadToBackend(signatureImage);
  };

  const uploadToBackend = async (dataUrl: string | null) => {
    setIsUploading(true);
    try {
      const token = sessionStorage.getItem('pdpa_token') || sessionStorage.getItem('pdpa_jwt_token');
      const res = await fetch('/api/auth/signature', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ signatureImage: dataUrl })
      });
      const data = await res.json();
      if (data.success) {
        showNotify('บันทึกลายมือชื่อสำเร็จ', 'success');
        onProfileUpdate({ ...currentUser, signature_image: dataUrl });
        onClose();
      } else {
        showNotify(data.message || 'บันทึกไม่สำเร็จ', 'error');
      }
    } catch (err: any) {
      showNotify(err.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const removeSignature = () => {
    setSignatureImage(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-800 px-4 py-3 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-brand-400" />
            <h2 className="font-bold">ตั้งค่าโปรไฟล์และลายมือชื่อ</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto grow space-y-5">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xl uppercase">
              {currentUser?.username?.charAt(0)}
            </div>
            <div>
              <div className="font-bold text-slate-800">{currentUser?.fullNameTh || currentUser?.username}</div>
              <div className="text-sm text-slate-500">{currentUser?.email} ({currentUser?.role})</div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              อัปโหลดลายมือชื่อ (E-Signature)
            </h3>
            
            <div className="space-y-4 animate-fade-in mt-4">
              {signatureImage ? (
                <div className="border-2 border-slate-200 border-dashed rounded-lg p-6 flex flex-col items-center justify-center bg-white relative">
                  <img src={signatureImage} alt="Signature" className="max-h-24 object-contain" />
                  <button 
                    onClick={removeSignature}
                    className="absolute top-2 right-2 text-rose-500 hover:bg-rose-50 p-1.5 rounded-md transition"
                    title="ลบลายเซ็น"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-brand-200 border-dashed rounded-lg p-8 flex flex-col items-center justify-center bg-brand-50 hover:bg-brand-100 transition cursor-pointer group">
                  <Upload className="h-8 w-8 text-brand-400 group-hover:text-brand-600 mb-2" />
                  <span className="text-sm font-semibold text-brand-700">อัปโหลดภาพลายเซ็น (.png พื้นหลังโปร่งใส)</span>
                  <span className="text-xs text-brand-500 mt-1">ขนาดไฟล์ไม่เกิน 100KB</span>
                  <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleFileUpload} />
                </label>
              )}
            </div>
            
            <p className="text-[11px] text-slate-500 mt-4 leading-relaxed bg-amber-50 p-2 rounded border border-amber-100">
              <strong className="text-amber-800">หมายเหตุ:</strong> ลายเซ็นนี้จะถูกนำไปประทับบน <strong>"รายงานสรุปข้อมูลส่วนบุคคล"</strong> และ <strong>"บันทึกการส่งมอบข้อมูล"</strong> อัตโนมัติเมื่อท่านกดอนุมัติหรือสร้างเอกสาร (เฉพาะผู้มีอำนาจ)
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex justify-end gap-2 shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition"
            disabled={isUploading}
          >
            ยกเลิก
          </button>
          <button 
            onClick={saveSignature}
            disabled={isUploading || (!signatureImage && currentUser?.signature_image === null)}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-lg transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white block"></span>
            ) : (
              <Save className="h-4 w-4" />
            )}
            บันทึกโปรไฟล์
          </button>
        </div>
      </div>
    </div>
  );
};
