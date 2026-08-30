// @ts-nocheck
import { useState, useEffect } from 'react';
import type { User, RopaMasterData, RopaActivity } from '../types';
import { ArrowLeft, Check, ChevronRight, Save, Send, AlertTriangle, Info, FileUp, Paperclip } from 'lucide-react';

interface RopaBuilderProps {
  activeUser: User;
  masterData: RopaMasterData;
  activityId: string | null;
  onBack: () => void;
}

const steps = [
  { id: 1, title: 'ข้อมูลทั่วไป', description: 'General Info' },
  { id: 2, title: 'ข้อมูลที่ประมวลผล', description: 'Data Mapping' },
  { id: 3, title: 'การใช้และส่งต่อ', description: 'Processing & Sharing' },
  { id: 4, title: 'การจัดเก็บและยืนยัน', description: 'Retention & Review' },
];

export default function RopaBuilder({ activeUser, masterData, activityId, onBack }: RopaBuilderProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<Partial<RopaActivity>>({
    activity_name: '',
    purpose: '',
    department_name: activeUser.department || '',
    legal_basis_id: '',
    retention_days: null,
    retention_trigger: '',
    subject_type_ids: [],
    category_ids: [],
    recipient_ids: [],
  });

  const [files, setFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<any[]>([]);
  
  useEffect(() => {
    if (activityId) {
      loadActivity(activityId);
      loadFiles(activityId);
    }
  }, [activityId]);

  const loadActivity = async (id: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3001/api/ropa/activities/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFormData(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3001/api/ropa/activities/${id}/files`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setExistingFiles(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInputChange = (field: keyof RopaActivity, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: 'subject_type_ids' | 'category_ids' | 'recipient_ids', id: string) => {
    setFormData(prev => {
      const arr = prev[field] || [];
      if (arr.includes(id)) {
        return { ...prev, [field]: arr.filter(i => i !== id) };
      } else {
        return { ...prev, [field]: [...arr, id] };
      }
    });
  };

  const handleSaveDraft = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const method = formData.id ? 'PUT' : 'POST';
      const url = formData.id 
        ? `http://localhost:3001/api/ropa/activities/${formData.id}`
        : `http://localhost:3001/api/ropa/activities`;

      const res = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (data.success) {
        if (!formData.id && data.data.id) {
          setFormData(prev => ({ ...prev, id: data.data.id }));
        }
        
        // Handle file uploads if any and if we have an ID now
        const actId = formData.id || data.data.id;
        if (actId && files.length > 0) {
          await uploadFiles(actId);
        }
        
        if (showNotify) showNotify('บันทึกแบบร่างสำเร็จ', 'success'); else alert('บันทึกแบบร่างสำเร็จ');
      } else {
        if (showNotify) showNotify('เกิดข้อผิดพลาด: ' + data.message, 'error'); else alert('เกิดข้อผิดพลาด: ' + data.message);
      }
    } catch (err) {
      console.error(err);
      if (showNotify) showNotify('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error'); else alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSubmitting(false);
    }
  };

  const uploadFiles = async (actId: string) => {
    const token = localStorage.getItem('token');
    
    // Very simplified base64 upload for demo
    for (const file of files) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result;
        try {
          await fetch(`http://localhost:3001/api/ropa/activities/${actId}/files`, {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              filename: file.name,
              file_data: base64
            })
          });
        } catch (e) {
          console.error('File upload error', e);
        }
      };
    }
    setFiles([]); // clear after upload
    loadFiles(actId);
  };

  const handleSubmitReview = async () => {
    if (!formData.id) {
      if (showNotify) showNotify('กรุณาบันทึกข้อมูลก่อนส่งตรวจสอบ', 'warning'); else alert('กรุณาบันทึกข้อมูลก่อนส่งตรวจสอบ');
      return;
    }
    if (!confirm('ยืนยันส่งข้อมูลให้ DPO ตรวจสอบ? (เอกสารจะถูกเปลี่ยนเป็นสถานะรอตรวจสอบ)')) return;
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3001/api/ropa/activities/${formData.id}/submit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      if (data.success) {
        if (showNotify) showNotify('ส่งตรวจสอบสำเร็จ', 'success'); else alert('ส่งตรวจสอบสำเร็จ');
        onBack();
      } else {
        if (showNotify) showNotify('เกิดข้อผิดพลาด: ' + data.message, 'error'); else alert('เกิดข้อผิดพลาด: ' + data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const hasSensitiveData = formData.category_ids?.some(id => 
    masterData.categories.find(c => c.id === id)?.is_sensitive_data
  );

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top Navigation Bar */}
      <div className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {activityId ? 'แก้ไขบันทึกกิจกรรม (RoPA)' : 'สร้างบันทึกกิจกรรมใหม่'}
            </h1>
            <p className="text-sm text-slate-500">
              {formData.status === 'APPROVED' ? 'เอกสารอนุมัติแล้ว (Read-only)' : 'กรอกข้อมูลตามขั้นตอนให้ครบถ้วน'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          {formData.status !== 'APPROVED' && (
            <button
              onClick={handleSaveDraft}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 bg-white rounded-lg hover:bg-slate-50 transition font-medium"
            >
              <Save className="h-4 w-4" />
              {submitting ? 'กำลังบันทึก...' : 'บันทึกแบบร่าง'}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Stepper */}
        <div className="w-64 border-r border-slate-200 bg-slate-50 p-6 hidden md:block overflow-y-auto">
          <nav className="space-y-8 relative">
            {/* Connecting line */}
            <div className="absolute left-[15px] top-4 bottom-8 w-0.5 bg-slate-200 -z-10"></div>
            
            {steps.map((step, idx) => {
              const isActive = currentStep === step.id;
              const isPast = currentStep > step.id;
              return (
                <div 
                  key={step.id} 
                  className={`relative flex gap-4 cursor-pointer group ${isActive ? 'opacity-100' : 'opacity-70'}`}
                  onClick={() => setCurrentStep(step.id)}
                >
                  <div className={`
                    h-8 w-8 rounded-full flex items-center justify-center shrink-0 border-2 bg-white transition-colors
                    ${isActive ? 'border-brand-600 text-brand-600' : isPast ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 text-slate-400'}
                  `}>
                    {isPast ? <Check className="h-4 w-4" /> : <span className="text-sm font-bold">{step.id}</span>}
                  </div>
                  <div className="pt-1">
                    <p className={`text-sm font-bold ${isActive ? 'text-brand-700' : 'text-slate-700'}`}>{step.title}</p>
                    <p className="text-xs text-slate-500">{step.description}</p>
                  </div>
                </div>
              )
            })}
          </nav>
        </div>

        {/* Form Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-white">
          <div className="max-w-3xl mx-auto pb-20">
            
            {/* Step 1: General Info */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">1. ข้อมูลทั่วไปของกิจกรรม</h2>
                  <p className="text-slate-500 mb-8">ระบุชื่อกิจกรรม วัตถุประสงค์ และผู้รับผิดชอบหลัก</p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      ชื่อกิจกรรม (Activity Name) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={formData.activity_name}
                      onChange={e => handleInputChange('activity_name', e.target.value)}
                      placeholder="เช่น ระบบรับสมัครพนักงาน, กล้องวงจรปิด CCTV"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      วัตถุประสงค์ในการประมวลผล (Purpose) <span className="text-red-500">*</span>
                    </label>
                    <textarea 
                      value={formData.purpose}
                      onChange={e => handleInputChange('purpose', e.target.value)}
                      rows={4}
                      placeholder="อธิบายสั้นๆ ว่าเก็บข้อมูลไปเพื่อทำอะไร..."
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      แผนกที่รับผิดชอบ (Department)
                    </label>
                    <input 
                      type="text" 
                      value={formData.department_name}
                      onChange={e => handleInputChange('department_name', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-slate-50"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Data Mapping */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">2. ข้อมูลที่จัดเก็บ (Data Mapping)</h2>
                  <p className="text-slate-500 mb-8">ระบุว่าเก็บข้อมูลของใคร และเก็บข้อมูลประเภทใดบ้าง</p>
                </div>

                <div className="space-y-8">
                  {/* Data Subjects */}
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">ประเภทเจ้าของข้อมูล (Data Subjects)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {masterData.subjects.map(sub => (
                        <label key={sub.id} className={`
                          flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition
                          ${(formData.subject_type_ids || []).includes(sub.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-blue-300'}
                        `}>
                          <input 
                            type="checkbox" 
                            className="mt-1 h-4 w-4 text-brand-600 rounded border-slate-300"
                            checked={(formData.subject_type_ids || []).includes(sub.id)}
                            onChange={() => toggleArrayItem('subject_type_ids', sub.id)}
                          />
                          <div>
                            <p className="font-medium text-slate-900 text-sm">{sub.name}</p>
                            {sub.description && <p className="text-xs text-slate-500 mt-0.5">{sub.description}</p>}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Data Categories */}
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-slate-800">ประเภทข้อมูลส่วนบุคคล (Data Categories)</h3>
                      {hasSensitiveData && (
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full animate-pulse">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          มีข้อมูลความอ่อนไหว (Sensitive Data)
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {masterData.categories.map(cat => (
                        <label key={cat.id} className={`
                          flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition
                          ${(formData.category_ids || []).includes(cat.id) 
                            ? (cat.is_sensitive_data ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200') 
                            : 'bg-white border-slate-200'}
                        `}>
                          <input 
                            type="checkbox" 
                            className={`mt-1 h-4 w-4 rounded ${cat.is_sensitive_data ? 'text-red-600 focus:ring-red-500' : 'text-brand-600'}`}
                            checked={(formData.category_ids || []).includes(cat.id)}
                            onChange={() => toggleArrayItem('category_ids', cat.id)}
                          />
                          <div>
                            <p className="font-medium text-slate-900 text-sm flex items-center gap-2">
                              {cat.name}
                              {cat.is_sensitive_data && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] rounded uppercase font-bold">Sensitive</span>}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Processing */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">3. ฐานกฎหมายและการส่งต่อ</h2>
                  <p className="text-slate-500 mb-8">อ้างอิงฐานความชอบด้วยกฎหมาย และระบุผู้รับข้อมูลปลายทาง</p>
                </div>

                <div className="space-y-8">
                  {/* Legal Basis */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-3">
                      ฐานความชอบด้วยกฎหมาย (Legal Basis)
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {masterData.bases.map(basis => (
                        <label key={basis.id} className={`
                          flex items-center gap-3 p-3 rounded-lg border cursor-pointer
                          ${formData.legal_basis_id === basis.id ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-white border-slate-200'}
                        `}>
                          <input 
                            type="radio" 
                            name="legal_basis"
                            className="h-4 w-4 text-brand-600 focus:ring-brand-500"
                            checked={formData.legal_basis_id === basis.id}
                            onChange={() => handleInputChange('legal_basis_id', basis.id)}
                          />
                          <div>
                            <p className="font-medium text-slate-900 text-sm">{basis.name}</p>
                            <p className="text-xs text-slate-500">{basis.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Recipients */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-3">
                      ผู้รับข้อมูลภายนอก (Data Recipients / 3rd Party)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {masterData.recipients.map(rec => (
                        <button
                          key={rec.id}
                          onClick={() => toggleArrayItem('recipient_ids', rec.id)}
                          className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                            (formData.recipient_ids || []).includes(rec.id)
                              ? 'bg-slate-800 text-white border-slate-800'
                              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {rec.name} ({rec.type})
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* File Uploads */}
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 border-dashed">
                    <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                      <FileUp className="h-4 w-4" />
                      เอกสารแนบ (ถ้ามี)
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">เช่น นโยบายความเป็นส่วนตัว, สัญญาประมวลผลข้อมูล (DPA)</p>
                    
                    <input 
                      type="file" 
                      multiple 
                      onChange={(e) => setFiles(Array.from(e.target.files || []))}
                      className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    
                    {files.length > 0 && (
                      <div className="mt-3 text-sm text-slate-700">
                        เลือกไว้ {files.length} ไฟล์ (จะถูกอัปโหลดเมื่อกดบันทึก)
                      </div>
                    )}
                    
                    {existingFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase">ไฟล์ที่แนบแล้ว</p>
                        {existingFiles.map(f => (
                          <div key={f.id} className="flex items-center gap-2 text-sm bg-white p-2 border rounded shadow-sm">
                            <Paperclip className="h-4 w-4 text-slate-400" />
                            <span className="text-brand-600 font-medium">{f.filename}</span>
                            <span className="text-xs text-slate-400 ml-auto">อัปโหลดเมื่อ: {new Date(f.uploaded_at).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Retention */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">4. ระยะเวลาจัดเก็บและส่งตรวจ</h2>
                  <p className="text-slate-500 mb-8">กำหนดระยะเวลาในการเก็บรักษาข้อมูล และตรวจสอบความถูกต้อง</p>
                </div>

                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        ระยะเวลาจัดเก็บ (วัน)
                      </label>
                      <input 
                        type="number" 
                        value={formData.retention_days || ''}
                        onChange={e => handleInputChange('retention_days', parseInt(e.target.value))}
                        placeholder="เช่น 365, 3650"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        จุดเริ่มต้นการนับ (Trigger)
                      </label>
                      <input 
                        type="text" 
                        value={formData.retention_trigger || ''}
                        onChange={e => handleInputChange('retention_trigger', e.target.value)}
                        placeholder="เช่น นับจากวันที่พ้นสภาพพนักงาน"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Review Section */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="bg-slate-800 p-4 text-white">
                    <h3 className="font-bold flex items-center gap-2">
                      <Info className="h-5 w-5" /> สรุปข้อมูล (Review)
                    </h3>
                  </div>
                  <div className="p-6 space-y-4 text-sm">
                    <div className="grid grid-cols-3 border-b border-slate-100 pb-2">
                      <div className="text-slate-500">ชื่อกิจกรรม:</div>
                      <div className="col-span-2 font-medium text-slate-900">{formData.activity_name || '-'}</div>
                    </div>
                    <div className="grid grid-cols-3 border-b border-slate-100 pb-2">
                      <div className="text-slate-500">แผนก:</div>
                      <div className="col-span-2 font-medium text-slate-900">{formData.department_name || '-'}</div>
                    </div>
                    <div className="grid grid-cols-3 border-b border-slate-100 pb-2">
                      <div className="text-slate-500">ฐานกฎหมาย:</div>
                      <div className="col-span-2 font-medium text-brand-600">
                        {masterData.bases.find(b => b.id === formData.legal_basis_id)?.name || '-'}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 border-b border-slate-100 pb-2">
                      <div className="text-slate-500">ข้อมูลที่เก็บ:</div>
                      <div className="col-span-2 font-medium text-slate-900 flex flex-wrap gap-1">
                        {formData.category_ids?.map(id => {
                          const cat = masterData.categories.find(c => c.id === id);
                          return cat ? (
                            <span key={id} className={`px-2 py-0.5 rounded text-xs ${cat.is_sensitive_data ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                              {cat.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                  
                  {formData.status !== 'APPROVED' && (
                    <div className="bg-slate-50 p-6 border-t border-slate-200">
                      <button 
                        onClick={handleSubmitReview}
                        disabled={submitting || !formData.id}
                        className={`w-full flex justify-center items-center gap-2 py-3 rounded-lg font-bold transition
                          ${!formData.id ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-brand-600 text-white hover:bg-brand-700 shadow-md'}
                        `}
                      >
                        <Send className="h-5 w-5" />
                        ส่งเอกสารให้ DPO ตรวจสอบ
                      </button>
                      {!formData.id && (
                        <p className="text-center text-xs text-slate-500 mt-2 text-red-500">
                          * คุณต้องบันทึกแบบร่างก่อนทำการส่งตรวจสอบ
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>

      {/* Bottom Floating Navigation */}
      <div className="bg-white border-t border-slate-200 p-4 flex justify-between items-center fixed md:absolute bottom-0 left-0 right-0 md:left-64 z-20">
        <button 
          onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
          className={`px-6 py-2 rounded-lg font-medium transition ${currentStep === 1 ? 'opacity-0' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        >
          ย้อนกลับ
        </button>
        
        <div className="flex gap-2">
          {currentStep < 4 ? (
            <button 
              onClick={() => setCurrentStep(prev => Math.min(4, prev + 1))}
              className="flex items-center gap-2 px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium transition shadow-sm"
            >
              ถัดไป <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <div className="px-6 py-2"></div>
          )}
        </div>
      </div>

    </div>
  );
}
