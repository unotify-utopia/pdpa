import React from 'react';
import { Printer, Shield, QrCode } from 'lucide-react';
import type { Request, DocumentTemplate, User } from '../types';


interface ThaiLetterViewProps {
  request: Request;
  template: DocumentTemplate;
  signer: User;
  onPrintMock?: () => void;
}

// Helper: Convert Gregorian date to Thai Buddhist Era Date (e.g., 21 กรกฎาคม 2569)
export const convertToThaiDate = (dateString?: string): string => {
  if (!dateString) return '...';
  const monthsTh = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  
  const date = new Date(dateString);
  const day = date.getDate();
  const month = monthsTh[date.getMonth()];
  const yearBe = date.getFullYear() + 543; // BE offset

  return `${day} ${month} พ.ศ. ${yearBe}`;
};

export const ThaiLetterView: React.FC<ThaiLetterViewProps> = ({
  request,
  template,
  signer,
  onPrintMock,
}) => {
  
  // Replace template values dynamically (Section 11)
  const renderTemplateText = (text: string) => {
    let output = text;
    const reqName = `${request.requester.firstName} ${request.requester.lastName}`;
    const receivedDateTh = convertToThaiDate(request.receivedDate || request.submissionDate);
    const submissionDateTh = convertToThaiDate(request.submissionDate);
    
    // Fee details string if applicable
    let feeDetails = '';
    if (!request.feeCalculation.noFee) {
      if (request.feeCalculation.paperPages > 0) {
        feeDetails += `- ค่าธรรมเนียมคัดสำเนา A4 จำนวน ${request.feeCalculation.paperPages} แผ่น (แผ่นละ 1 บาท): ${request.feeCalculation.paperPages} บาท\n`;
      }
      if (request.feeCalculation.computerPages > 0) {
        feeDetails += `- ค่าพิมพ์เอกสารจากคอมพิวเตอร์ จำนวน ${request.feeCalculation.computerPages} แผ่น (แผ่นละ 3 บาท): ${request.feeCalculation.computerPages * 3} บาท\n`;
      }
      if (request.feeCalculation.certificationsCount > 0) {
        feeDetails += `- ค่ารับรองความถูกต้องสำเนา จำนวน ${request.feeCalculation.certificationsCount} ชุด (ชุดละ 5 บาท): ${request.feeCalculation.certificationsCount * 5} บาท\n`;
      }
      request.feeCalculation.otherCosts.forEach((oc) => {
        feeDetails += `- ${oc.item}: ${oc.cost} บาท\n`;
      });
    } else {
      feeDetails = 'ไม่มีค่าธรรมเนียมการประมวลผล (การดาวน์โหลดอิเล็กทรอนิกส์)';
    }

    const downloadLink = `https://pdpa-request.org/secure-download/${request.uuid}`;
    
    // SLA new deadline for extensions
    const newDeadlineTh = request.slaDeadlineDate ? convertToThaiDate(request.slaDeadlineDate) : '...';

    // Deficiency explanation
    const deficiency = request.slaEvents.find(e => e.type === 'pause')?.reason || 'เอกสารบัตรประจำตัวประชาชนไม่ชัดเจน';

    output = output.replace(/{{trackingNo}}/g, request.trackingNo);
    output = output.replace(/{{requesterName}}/g, reqName);
    output = output.replace(/{{receivedDate}}/g, receivedDateTh);
    output = output.replace(/{{submissionDate}}/g, submissionDateTh);
    output = output.replace(/{{channel}}/g, request.contactChannel === 'web' ? 'เว็บไซต์ออนไลน์' : request.contactChannel === 'email' ? 'อีเมลสำนักงาน' : 'ยื่น ณ สำนักงาน');
    output = output.replace(/{{feeDetails}}/g, feeDetails);
    output = output.replace(/{{feeTotal}}/g, String(request.feeCalculation.totalCalculated));
    output = output.replace(/{{downloadExpiryDays}}/g, '7');
    output = output.replace(/{{downloadLink}}/g, downloadLink);
    output = output.replace(/{{extensionDays}}/g, '30');
    output = output.replace(/{{newDeadline}}/g, newDeadlineTh);
    output = output.replace(/{{deficiencyDetails}}/g, deficiency);
    output = output.replace(/{{deficiencyDays}}/g, '10');
    const defDeadline = new Date();
    defDeadline.setDate(defDeadline.getDate() + 10);
    output = output.replace(/{{deficiencyDeadline}}/g, convertToThaiDate(defDeadline.toISOString()));
    
    if (request.decision && request.decision.result === 'denied') {
      output = output.replace(/{{denialReasonDetails}}/g, request.decision.reasons.join(', '));
      output = output.replace(/{{legalBasis}}/g, request.decision.legalBasisText || 'มาตรา 30 วรรคสาม แห่งพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562');
    }

    output = output.replace(/{{signerName}}/g, signer.fullNameTh);
    output = output.replace(/{{signerPosition}}/g, signer.role === 'dpo' ? 'เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO)' : signer.role === 'approver' ? 'กรรมการผู้จัดการใหญ่ / ผู้มีอำนาจลงนาม' : 'เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล');

    return output;
  };

  const getConfidentialityBadgeColor = (level: string) => {
    switch (level) {
      case 'SECRET': return 'bg-red-100 text-red-800 border-red-200';
      case 'CONFIDENTIAL': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getConfidentialityLabel = (level: string) => {
    switch (level) {
      case 'SECRET': return 'ลับ (Secret)';
      case 'CONFIDENTIAL': return 'ลับเฉพาะ (Confidential)';
      default: return 'ปกติ (Unclassified)';
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Action panel above document */}
      <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between no-print">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-brand-600" />
          <div className="text-xs">
            <span className="block font-bold text-slate-800">เครื่องสร้างเอกสารราชการไทย (Thai Document Builder)</span>
            <span className="text-slate-500">ระบบสร้างจดหมายนำส่งแบบฟอร์ม PDF/Print สิทธิการเข้าถึงข้อมูล</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onPrintMock}
            className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold py-1.5 px-3 rounded flex items-center gap-1 transition shadow-sm"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>พิมพ์รายงาน / บันทึก PDF</span>
          </button>
        </div>
      </div>

      {/* Official Thai Letter Sheet */}
      <div className="bg-white border border-slate-300 shadow-md p-10 md:p-14 max-w-2xl mx-auto rounded-md font-sans text-slate-800 leading-relaxed text-sm relative overflow-hidden print:border-0 print:shadow-none print:p-0">
        
        {/* Top Header Grid */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-6">
          <div className="flex items-center gap-3">
            {/* Mock Organization Emblem/Logo */}
            <div className="h-12 w-12 rounded border-2 border-slate-800 bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
              LOGO
            </div>
            <div>
              <span className="block font-bold text-xs uppercase tracking-wide">สถาบันคุ้มครองข้อมูลองค์กร</span>
              <span className="block text-[11px] text-slate-500">PDPA Access Request Management System</span>
            </div>
          </div>
          
          <div className="text-right text-[11px]">
            <span className="block font-bold">ชั้นความลับ:</span>
            <span className={`inline-block border px-2 py-0.5 rounded text-[10px] font-bold ${getConfidentialityBadgeColor(template.confidentialityLevel)}`}>
              {getConfidentialityLabel(template.confidentialityLevel)}
            </span>
          </div>
        </div>

        {/* Official Letter Body */}
        <div className="space-y-4">
          <div className="flex justify-between text-xs text-slate-600">
            <span>ที่ สก. ๐๐๑ / {new Date().getFullYear() + 543}</span>
            <span>สำนักงานคุ้มครองข้อมูลส่วนบุคคล</span>
          </div>

          <div className="text-center font-bold text-base my-2">
            {template.nameTh}
          </div>

          <div className="text-right my-2">
            <span className="font-medium">วันที่:</span> {convertToThaiDate(new Date().toISOString())}
          </div>

          <div className="font-semibold text-slate-700">
            เรื่อง: <span className="font-normal text-slate-900">{renderTemplateText(template.subjectTemplate)}</span>
          </div>

          <div className="whitespace-pre-line text-slate-800 text-xs text-justify leading-relaxed font-sans mt-4">
            {renderTemplateText(template.bodyTemplate)}
          </div>
        </div>

        {/* Signature Line */}
        <div className="mt-12 flex justify-between items-end">
          <div className="text-center text-[10px] text-slate-400 max-w-[200px] flex flex-col items-center border border-slate-100 p-2 rounded bg-slate-50">
            <QrCode className="h-10 w-10 text-slate-500 mb-1" />
            <span className="font-bold">สแกนตรวจสอบเอกสาร</span>
            <span className="font-mono text-[8px] break-all">{request.uuid.substr(0, 15)}</span>
          </div>

          <div className="text-center space-y-1">
            <div className="h-10 flex items-center justify-center relative">
              {/* Simulated Signature Line */}
              <div className="font-mono text-xs italic text-brand-600 select-none">
                / {signer.username} /
              </div>
              <div className="absolute inset-x-0 bottom-0 border-b border-dashed border-slate-300 w-40 mx-auto"></div>
            </div>
            <div className="text-xs font-semibold mt-1">({signer.fullNameTh})</div>
            <div className="text-[11px] text-slate-500">
              {signer.role === 'dpo' ? 'เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO)' : 'ผู้อนุมัติมีอำนาจสั่งการ'}
            </div>
          </div>
        </div>

        {/* Footer info (Audit tracking token) */}
        <div className="mt-12 pt-4 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between">
          <span>สิทธิและสำเนาข้อมูลผู้ควบคุม | PDPA Sec 30 Suite v1.0</span>
          <span className="font-mono">CHECKSUM: {request.trackingNo} - OK</span>
        </div>
      </div>
    </div>
  );
};
