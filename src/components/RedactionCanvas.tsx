import React, { useState } from 'react';
import { EyeOff, ShieldAlert, Check, RefreshCw } from 'lucide-react';
import type { RedactionRecord } from '../types';

interface RedactionCanvasProps {
  onRedactApplied: (redactRecord: Omit<RedactionRecord, 'id' | 'timestamp' | 'operator'>) => void;
  onSaveAll: () => void;
}

interface DocumentField {
  id: string;
  label: string;
  value: string;
  isSensitive: boolean;
  isRedacted: boolean;
  redactMode?: 'blackout' | 'masking';
  redactReason?: string;
}

export const RedactionCanvas: React.FC<RedactionCanvasProps> = ({
  onRedactApplied,
  onSaveAll,
}) => {
  const [fields, setFields] = useState<DocumentField[]>([
    { id: 'f1', label: 'ชื่อผู้รับสิทธิ', value: 'นายสมเกียรติ รักไทย (เจ้าของสิทธิ)', isSensitive: false, isRedacted: false },
    { id: 'f2', label: 'เลขบัตรประชาชน', value: '1-1234-56789-01-2', isSensitive: true, isRedacted: false },
    { id: 'f3', label: 'อีเมลหลัก', value: 'somkiat.rakthai@example.com', isSensitive: false, isRedacted: false },
    { id: 'f4', label: 'เบอร์โทรศัพท์', value: '081-234-5678', isSensitive: false, isRedacted: false },
    { id: 'f5', label: 'ชื่อผู้แนะนำการขาย (บุคคลอื่น)', value: 'นางสาววิภา ตระกูลดี (พนักงานขาย)', isSensitive: true, isRedacted: false },
    { id: 'f6', label: 'เบอร์ติดต่อผู้แนะนำ (บุคคลอื่น)', value: '085-999-1234', isSensitive: true, isRedacted: false },
    { id: 'f7', label: 'ที่อยู่ปัจจุบัน', value: '99/9 ถ.พหลโยธิน แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900', isSensitive: false, isRedacted: false },
    { id: 'f8', label: 'ลายมือชื่อเจ้าหน้าที่อนุมัติบัญชี', value: 'ประภาส (สแกนลายเซ็นดิจิทัล)', isSensitive: true, isRedacted: false },
  ]);

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [redactMode, setRedactMode] = useState<'blackout' | 'masking'>('blackout');
  const [customReason, setCustomReason] = useState('ปกปิดข้อมูลบุคคลที่สามที่ไม่มีส่วนได้รับสิทธิ');
  const [savedCount, setSavedCount] = useState(0);

  // Helper to generate masked string (Masks both first and last names individually)
  const maskText = (str: string): string => {
    // 1. Email Masking (e.g., somkiat@example.com -> so***@example.com)
    if (str.includes('@')) {
      const parts = str.split('@');
      return `${parts[0].substring(0, 2)}***@${parts[1]}`;
    }

    // 2. Phone Number Masking (e.g., 085-999-1234 -> 085-***-1234)
    if (/^\d{3}-\d{3}-\d{4}$/.test(str)) {
      return `${str.substring(0, 3)}-***-${str.substring(8)}`;
    }

    // 3. Citizen ID Masking (e.g., 1-1234-56789-01-2 -> 1-1234-XXXXX-XX-X)
    if (/^\d{1}-\d{4}-\d{5}-\d{2}-\d{1}$/.test(str)) {
      return `${str.substring(0, 6)}-XXXXX-XX-X`;
    }

    // 4. Full Name & Text Masking (Splits words like 'นางสาววิภา ตระกูลดี' -> 'นางสาววิ*** ตระ***')
    const words = str.trim().split(/\s+/);
    if (words.length > 1) {
      return words
        .map((w) => {
          // If word has parentheses like (เจ้าของสิทธิ), keep clean or mask inside
          if (w.startsWith('(') && w.endsWith(')')) return w;
          
          // Handle Thai prefixes (นาย, นาง, นางสาว, ดร., ฯลฯ)
          let prefix = '';
          let core = w;
          const prefixes = ['นางสาว', 'นาย', 'นาง', 'ดร.', 'ศ.', 'พ.ต.อ.', 'พลเอก'];
          for (const p of prefixes) {
            if (w.startsWith(p)) {
              prefix = p;
              core = w.substring(p.length);
              break;
            }
          }

          if (core.length <= 2) return `${prefix}${core.substring(0, 1)}*`;
          return `${prefix}${core.substring(0, 2)}***`;
        })
        .join(' ');
    }

    // Default single word masking
    if (str.length > 4) {
      return `${str.substring(0, 2)}***${str.substring(str.length - 1)}`;
    }
    return `${str.substring(0, 1)}***`;
  };

  const handleFieldClick = (field: DocumentField) => {
    if (field.isRedacted) return;
    setSelectedFieldId(field.id);
  };

  const applyRedaction = () => {
    if (!selectedFieldId) return;

    const targetField = fields.find((f) => f.id === selectedFieldId);
    if (!targetField) return;

    // Apply redaction in state
    setFields((prev) =>
      prev.map((f) =>
        f.id === selectedFieldId
          ? { ...f, isRedacted: true, redactMode, redactReason: customReason }
          : f
      )
    );

    const maskedResult = redactMode === 'masking' ? maskText(targetField.value) : '[REDACTED / ปกปิดข้อมูล]';

    // Call callback to record event
    onRedactApplied({
      itemId: 'doc_customer_crm_report',
      itemRedacted: `${targetField.label} (${targetField.value})`,
      reason: `${redactMode === 'masking' ? '[Partial Masking]' : '[Full Blackout]'} ${customReason}`,
      previewUrlBefore: targetField.value,
      previewUrlAfter: maskedResult,
    });

    setSelectedFieldId(null);
    setSavedCount((c) => c + 1);
  };

  const handleReset = () => {
    setFields((prev) => prev.map((f) => ({ ...f, isRedacted: false, redactReason: undefined, redactMode: undefined })));
    setSavedCount(0);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <div>
          <h4 className="font-semibold text-slate-800 flex items-center gap-1.5 text-sm">
            <EyeOff className="h-4 w-4 text-brand-600" />
            <span>ระบบปกปิดข้อมูลส่วนบุคคลออนไลน์ (Redaction & Data Masking Suite)</span>
          </h4>
          <p className="text-xs text-slate-500">คลิกที่ช่องที่มีข้อมูลของบุคคลอื่นเพื่อเลือก ถมดำทึบ (Blackout) หรือ ทำ Marking ซ่อนบางส่วน (Data Masking)</p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition"
        >
          <RefreshCw className="h-3 w-3" />
          <span>รีเซ็ต (Reset)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        {/* Document Panel View */}
        <div className="p-4 md:col-span-2 space-y-3 bg-slate-50/50">
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">เค้าโครงรายงานส่งออก (CRM_Customer_Report.xlsx)</span>
          
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-inner space-y-3 max-h-96 overflow-y-auto">
            {fields.map((f) => (
              <div
                key={f.id}
                onClick={() => handleFieldClick(f)}
                className={`p-2.5 rounded-lg border transition cursor-pointer text-xs ${
                  f.isRedacted
                    ? f.redactMode === 'masking'
                      ? 'bg-amber-950/20 border-amber-500/50 text-amber-900 select-none'
                      : 'bg-slate-900 border-slate-900 text-slate-400 select-none'
                    : f.id === selectedFieldId
                    ? 'bg-brand-50 border-brand-500 ring-2 ring-brand-200'
                    : f.isSensitive
                    ? 'bg-red-50/70 border-red-200 hover:bg-red-100 hover:border-red-300'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-500">{f.label}</span>
                  {f.isSensitive && !f.isRedacted && (
                    <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                      <ShieldAlert className="h-3 w-3" />
                      เสี่ยงละเมิดสิทธิผู้อื่น
                    </span>
                  )}
                  {f.isRedacted && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${f.redactMode === 'masking' ? 'bg-amber-100 text-amber-800' : 'bg-slate-800 text-slate-400'}`}>
                      {f.redactMode === 'masking' ? 'PARTIAL MASKED' : 'FULL REDACTED'} (เหตุผล: {f.redactReason})
                    </span>
                  )}
                </div>
                
                {f.isRedacted ? (
                  f.redactMode === 'masking' ? (
                    <div className="font-mono text-amber-900 font-bold bg-amber-50 border border-amber-200 rounded px-2 py-1 text-xs tracking-wider flex items-center justify-between">
                      <span>{maskText(f.value)}</span>
                      <span className="text-[9px] text-amber-600 bg-amber-100 px-1 rounded font-normal">อ่านได้บางส่วน (Context Only)</span>
                    </div>
                  ) : (
                    <div className="h-5 bg-slate-950 rounded flex items-center px-2 text-[10px] text-slate-600 font-mono tracking-widest">
                      ████████████████████████
                    </div>
                  )
                ) : (
                  <div className="font-medium text-slate-800 break-all">{f.value}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Controller Panel */}
        <div className="p-4 bg-white flex flex-col justify-between">
          <div className="space-y-4">
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">แผงควบคุมการเซนเซอร์</span>
            
            {selectedFieldId ? (
              <div className="space-y-3">
                <div className="p-2.5 bg-brand-50 border border-brand-100 rounded-lg text-xs text-brand-800">
                  กำลังเลือกฟิลด์: <span className="font-bold">{fields.find((f) => f.id === selectedFieldId)?.label}</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">รูปแบบการปกปิดข้อมูล</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRedactMode('blackout')}
                      className={`p-2 rounded border text-xs font-semibold text-center transition ${
                        redactMode === 'blackout'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ⬛ ถมดำทึบ 100%
                    </button>
                    <button
                      type="button"
                      onClick={() => setRedactMode('masking')}
                      className={`p-2 rounded border text-xs font-semibold text-center transition ${
                        redactMode === 'masking'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      👁️ Marking บางส่วน
                    </button>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">ระบุเหตุผลในการปกปิด (Redaction Reason)</label>
                  <select
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded p-2 focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="ปกปิดข้อมูลบุคคลที่สามที่ไม่มีส่วนได้รับสิทธิ">ปกปิดข้อมูลบุคคลที่สาม (Third-party PII)</option>
                    <option value="ปกปิดข้อมูลความลับทางการค้าขององค์กร">ความลับทางการค้า (Trade Secret)</option>
                    <option value="ปกปิดลายมือชื่ออิเล็กทรอนิกส์และผู้บันทึกระบบ">ปกปิดลายเซ็นเจ้าหน้าที่ (Signature)</option>
                    <option value="ปกปิดข้อมูลด้านความมั่นคงปลอดภัยไอที">ข้อมูลความมั่นคงระบบ (System Security)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={applyRedaction}
                  className={`w-full font-semibold py-2 px-3 rounded text-xs flex items-center justify-center gap-1.5 transition ${
                    redactMode === 'masking'
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  <span>{redactMode === 'masking' ? 'ทำ Marking ซ่อนบางส่วน' : 'ถมดำปกปิดข้อมูล (Apply Blackout)'}</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg text-slate-400">
                <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs">โปรดคลิกเลือกข้อมูลที่มีความเสี่ยงในตารางซ้ายมือเพื่อตั้งค่าการปกปิด</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-600">
              <span>จำนวนการถมดำในเซสชัน:</span>
              <span className="font-bold text-slate-900">{savedCount} รายการ</span>
            </div>
            
            <button
              type="button"
              onClick={onSaveAll}
              disabled={savedCount === 0}
              className={`w-full font-semibold py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-1.5 transition ${
                savedCount > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Check className="h-4 w-4" />
              <span>บันทึกผลการปกปิดทั้งหมด</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
