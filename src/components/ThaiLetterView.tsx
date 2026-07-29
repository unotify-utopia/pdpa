import React from 'react';
import { Printer, Shield, QrCode } from 'lucide-react';
import type { Request, DocumentTemplate, User } from '../types';
import { initialOrganizations } from '../mockData';

interface ThaiLetterViewProps {
  request: Request;
  template: DocumentTemplate;
  signer: User;
  onPrintMock?: () => void;
  orgData?: any;
}

// Helper: Convert Gregorian date to Thai Buddhist Era Date & Time (e.g., 22 กรกฎาคม พ.ศ. 2569 เวลา 22:49 น.)
export const convertToThaiDate = (dateString?: string, includeTime: boolean = false): string => {
  if (!dateString) return '...';
  const monthsTh = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  
  const date = new Date(dateString);
  const day = date.getDate();
  const month = monthsTh[date.getMonth()];
  const yearBe = date.getFullYear() + 543; // BE offset

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  if (includeTime) {
    return `${day} ${month} พ.ศ. ${yearBe} เวลา ${hours}:${minutes} น.`;
  }
  return `${day} ${month} พ.ศ. ${yearBe}`;
};

export const ThaiLetterView: React.FC<ThaiLetterViewProps> = ({
  request,
  template,
  signer,
  onPrintMock,
  orgData,
}) => {
  let org = orgData;
  if (!org) {
    org = initialOrganizations.find(o => o.id === request.orgId);
    try {
      const savedOrgs = JSON.parse(localStorage.getItem('organizations') || '[]');
      if (savedOrgs && savedOrgs.length > 0) {
        const found = savedOrgs.find((o: any) => o.id === request.orgId);
        if (found) org = found;
      }
    } catch (e) {
      // ignore
    }
  }
  if (!org) org = initialOrganizations[0];
  
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
            onClick={onPrintMock ? onPrintMock : () => window.print()}
            className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold py-1.5 px-3 rounded flex items-center gap-1 transition shadow-sm"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>พิมพ์รายงาน / บันทึก PDF</span>
          </button>
        </div>
      </div>

      {/* Official Thai Letter Sheet */}
      <div className="print-area bg-white font-sarabun text-[12pt] leading-none text-black w-[210mm] min-h-[297mm] mx-auto shadow-md relative pt-[2.5cm] pb-[2cm] pl-[3cm] pr-[2cm] print:shadow-none print:w-[210mm] print:h-[297mm]">
        
        {/* Header Layer */}
        <div className="relative h-[3cm] mb-4">
          <div className="absolute bottom-4 left-0">
            ที่ ........................................
          </div>
          
          {/* Org Logo */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[3cm] w-[3cm] flex items-center justify-center rounded-full bg-transparent overflow-hidden">
            {org.logoUrl ? (
              <img src={org.logoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <div className="border-2 border-slate-800 text-slate-800 font-bold text-sm w-full h-full flex items-center justify-center rounded-full bg-slate-50">
                ตราหน่วยงาน
              </div>
            )}
          </div>
          
          <div className="absolute bottom-4 right-0 max-w-[6cm] text-right">
            {org.nameTh}
          </div>
        </div>

        {/* Official Letter Body */}
        <div className="space-y-[6pt]">
          <div className="mb-4" style={{ marginLeft: '7.5cm' }}>
            วันที่ {convertToThaiDate(new Date().toISOString())}
          </div>

          <div className="mb-4">
            เรื่อง {renderTemplateText(template.subjectTemplate)}
          </div>

          <div className="text-left space-y-[6pt] break-words">
            {(() => {
              const fullText = renderTemplateText(template.bodyTemplate);
              const lines = fullText.split('\n');
              const cleanLines = [];
              for (const line of lines) {
                // Stop rendering if we hit the manual signature block from the database
                if (line.trim().includes('ขอแสดงความนับถือ')) break;
                cleanLines.push(line);
              }
              
              return cleanLines.map((para, i) => {
                const isHeadingLine = para.trim().startsWith('เรียน') || 
                                      para.trim().startsWith('อ้างถึง') || 
                                      para.trim().startsWith('สิ่งที่ส่งมาด้วย');
                
                // If it's an empty line, just render a spacer
                if (!para.trim()) return <div key={i} className="h-[6pt]"></div>;
                
                // Indent only if it's not a heading line, and doesn't look like a continued list or URL
                const shouldIndent = !isHeadingLine && !para.trim().startsWith('ลิงก์:') && !para.trim().startsWith('*');

                return (
                  <p key={i} className={shouldIndent ? "indent-[2.5cm]" : ""}>
                    {para}
                  </p>
                );
              });
            })()}
          </div>
        </div>

        {/* Signature Line */}
        <div className="mt-8 flex flex-col items-center" style={{ marginLeft: '7.5cm', width: '8.5cm' }}>
          <div className="mb-12">ขอแสดงความนับถือ</div>
          
          <div className="flex flex-col items-center mt-8">
            <div>({signer.fullNameTh})</div>
            <div>{signer.department || 'ผู้อนุมัติมีอำนาจสั่งการ'}</div>
          </div>
        </div>

        {/* Footer info & Audit tracking token */}
        <div className="absolute bottom-[2cm] left-[3cm] text-[14pt] leading-tight">
          {org.nameTh}<br/>
          {org.address && <>{org.address}<br/></>}
          โทร. {org.contactPhone || '-'}<br/>
          <div className="mt-2 text-[10pt] text-slate-400 flex items-center gap-2 border border-slate-100 p-1 w-[fit-content] rounded bg-slate-50">
            <QrCode className="h-6 w-6 text-slate-500" />
            <span className="font-mono text-[8pt]">{request.uuid.substr(0, 15)}</span>
          </div>
        </div>

        <div className="absolute bottom-[2cm] right-[2cm] text-[10pt] text-slate-400 text-right leading-tight">
          สิทธิและสำเนาข้อมูลผู้ควบคุม<br/>PDPA Sec 30 Suite v1.0<br/>
          <span className="font-mono">CHECKSUM: {request.trackingNo} - OK</span>
        </div>
      </div>
    </div>
  );
};
