import React, { useState, useEffect } from 'react';
import { Printer, Shield, QrCode, Mail, FileText } from 'lucide-react';
import QRCode from 'qrcode';
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
  const [org, setOrg] = useState<any>(
    orgData || 
    initialOrganizations.find(o => o.id === request.orgId) || 
    initialOrganizations[0]
  );

  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    const downloadUrl = `${window.location.origin}/dl/${(request as any).downloadToken || request.trackingNo}`;
    QRCode.toDataURL(downloadUrl, { width: 120, margin: 1 }, (err: any, url: string) => {
      if (!err && url) {
        setQrDataUrl(url);
      }
    });
  }, [request]);

  useEffect(() => {
    if (!orgData && request.orgId) {
      fetch('/api/public/tenants')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.tenants) {
            const found = data.tenants.find((t: any) => t.id === request.orgId);
            if (found) {
              setOrg({
                id: found.id,
                nameTh: found.name_th,
                nameEn: found.name_en,
                shortName: found.short_name,
                contactEmail: found.email,
                contactPhone: found.phone
              });
            }
          }
        })
        .catch(err => console.error(err));
    }
  }, [orgData, request.orgId]);
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
    output = output.replace(/{{downloadExpiryDays}}/g, '30');
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

    // Replace generic word "องค์กร" with the actual organization name
    if (org && org.nameTh) {
      output = output.replace(/องค์กร/g, org.nameTh);
    }

    return output;
  };

  const [viewMode, setViewMode] = useState<'letter' | 'email'>('letter');

  const handlePrintLetter = () => {
    if (onPrintMock) { onPrintMock(); return; }

    const subject = renderTemplateText(template.subjectTemplate);
    const body = renderTemplateText(template.bodyTemplate);
    const dateStr = convertToThaiDate(new Date().toISOString());
    const logoHtml = org.logoUrl ? `<img src="${org.logoUrl}" style="width:3cm;height:3cm;object-fit:contain;" alt="Logo">` : '';

    // Build body paragraphs, stopping before "ขอแสดงความนับถือ"
    const lines = body.split('\n');
    const cleanLines: string[] = [];
    for (const line of lines) {
      if (line.trim().includes('ขอแสดงความนับถือ')) break;
      cleanLines.push(line);
    }
    const bodyHtml = cleanLines.map(para => {
      if (!para.trim()) return '<div style="height:6pt;"></div>';
      const isHeading = para.trim().startsWith('เรียน') || para.trim().startsWith('อ้างถึง') || para.trim().startsWith('สิ่งที่ส่งมาด้วย');
      const indent = (!isHeading && !para.trim().startsWith('ลิงก์:') && !para.trim().startsWith('*')) ? 'text-indent:2.5cm;' : '';
      return `<p style="margin:0 0 4pt 0;${indent}">${para}</p>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>หนังสือราชการ - ${request.trackingNo}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Sarabun', 'TH Sarabun New', sans-serif;
      font-size: 16pt;
      line-height: 1.6;
      color: #000;
      background: white;
      margin: 0;
      padding: 0;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 2.5cm 2cm 2cm 3cm;
      position: relative;
    }
    .header { position: relative; height: 3cm; margin-bottom: 0.5cm; }
    .header-left { position: absolute; bottom: 0; left: 0; font-size: 16pt; }
    .header-center { position: absolute; top: 0; left: 50%; transform: translateX(-50%); display: flex; align-items: center; justify-content: center; height: 3cm; }
    .header-right { position: absolute; bottom: 0; right: 0; text-align: right; max-width: 6cm; font-size: 16pt; }
    .date { margin-left: 7.5cm; margin-bottom: 0.5cm; }
    .subject { margin-bottom: 1cm; }
    .signature { margin-left: 7.5cm; margin-top: 1.5cm; text-align: center; }
    .footer { position: absolute; bottom: 2cm; left: 3cm; font-size: 12pt; line-height: 1.4; }
    .qr-area { position: absolute; bottom: 2cm; right: 2cm; text-align: center; font-size: 10pt; }
    .qr-box { width: 2cm; height: 2cm; border: 2px solid #333; margin: 0 auto 4pt; display: flex; align-items: center; justify-content: center; font-size: 8pt; color: #666; }
    @media print { body { -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">ที่ ........................................</div>
    <div class="header-center">${logoHtml}</div>
    <div class="header-right">${org.nameTh || ''}</div>
  </div>
  <div class="date">วันที่ ${dateStr}</div>
  <div class="subject">เรื่อง ${subject}</div>
  <div>${bodyHtml}</div>
  <div class="signature">
    <div style="margin-bottom:2cm;">ขอแสดงความนับถือ</div>
    <div>(${signer.fullNameTh})</div>
    <div>${signer.department || 'ผู้อนุมัติมีอำนาจสั่งการ'}</div>
  </div>
  <div class="footer">
    ${org.nameTh || ''}<br>
    ${org.address ? org.address + '<br>' : ''}
    โทร. ${org.contactPhone || '-'}
  </div>
  <div class="qr-area">
    ${qrDataUrl ? `<img src="${qrDataUrl}" style="width:64px;height:64px;margin-bottom:4px;" />` : '<div class="qr-box">QR</div>'}
    <div style="font-weight:bold;">สแกนเพื่อดาวน์โหลดเอกสาร</div>
    <div style="font-family:monospace;">REF: ${request.trackingNo}</div>
  </div>
</div>
<script>
  window.onload = function() {
    window.print();
    setTimeout(function() { window.close(); }, 1000);
  };
</script>
</body>
</html>`;

    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
    }
  };



  return (
    <div className="w-full space-y-4">
      {/* Action panel above document */}
      <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-brand-600" />
          <div className="text-xs">
            <span className="block font-bold text-slate-800">เครื่องสร้างเอกสารและอีเมล (Document & Email Builder)</span>
            <span className="text-slate-500">ระบบสร้างจดหมายนำส่ง/อีเมลแจ้งผลการพิจารณา</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-200 p-0.5 rounded-md">
            <button
              onClick={() => setViewMode('letter')}
              className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition ${viewMode === 'letter' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <FileText className="w-3.5 h-3.5" />
              จดหมายกระดาษ (Letter)
            </button>
            <button
              onClick={() => setViewMode('email')}
              className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition ${viewMode === 'email' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Mail className="w-3.5 h-3.5" />
              อีเมลแจ้งเตือน (Email)
            </button>
          </div>
          
          {viewMode === 'letter' && (
            <button
              type="button"
              onClick={handlePrintLetter}
              className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold py-1.5 px-3 rounded flex items-center gap-1 transition shadow-sm ml-2"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>พิมพ์รายงาน / PDF</span>
            </button>
          )}
        </div>
      </div>

      {viewMode === 'email' ? (
        <div className="bg-slate-100 p-6 rounded-lg font-sans w-full max-w-3xl mx-auto border border-slate-200 no-print animate-fade-in">
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-brand-700 p-4 flex items-center justify-center">
              {org.logoUrl ? (
                <img src={org.logoUrl} alt="Logo" className="h-10 object-contain bg-white p-1 rounded" />
              ) : (
                <span className="text-white font-bold text-lg">{org.nameTh}</span>
              )}
            </div>
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">แจ้งผลการดำเนินการคำขอเลขที่ {request.trackingNo}</h2>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                เรียน คุณ {request.requester.firstName} {request.requester.lastName},<br/><br/>
                องค์กรได้พิจารณาอนุมัติการเข้าถึงข้อมูลตามสิทธิของท่านเรียบร้อยแล้ว รายละเอียดข้อมูลของท่านได้รับการตรวจสอบและจัดเตรียมไว้เป็นที่เรียบร้อย<br/><br/>
                ท่านสามารถคลิกที่ปุ่มด้านล่างเพื่อดาวน์โหลดไฟล์ข้อมูลส่วนบุคคลของท่าน (รหัสอ้างอิง: {request.trackingNo}) ลิงก์นี้จะ<span className="text-rose-600 font-bold">หมดอายุภายใน 30 วัน</span>
              </p>
              
              <div className="py-4 text-center">
                <a 
                  href={`https://pdpa.numcomputer.com/dl?ref=${request.trackingNo}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-block bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition transform hover:-translate-y-0.5"
                >
                  คลิกที่นี่เพื่อยืนยันและดาวน์โหลดเอกสาร
                </a>
              </div>
              
              <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded text-xs text-amber-800">
                <p className="font-bold mb-1">ความปลอดภัย (Security Note):</p>
                <p>เพื่อความปลอดภัยของข้อมูล ท่านจะต้องกรอกรหัสผ่านแบบใช้ครั้งเดียว (OTP) ที่จะส่งไปยังมือถือหรืออีเมลของท่าน หลังจากคลิกปุ่มด้านบนแล้ว</p>
              </div>
              
              <p className="text-xs text-slate-500 pt-4 border-t border-slate-100">
                หากท่านมีข้อสงสัย หรือต้องการตรวจสอบความถูกต้องของอีเมลฉบับนี้<br/>
                สามารถนำรหัสคำขอ {request.trackingNo} ไปตรวจสอบได้ที่ <a href="#" className="text-brand-600 hover:underline">pdpa.numcomputer.com/verify</a><br/>
                <br/>
                ขอแสดงความนับถือ<br/>
                {org.nameTh}
              </p>
            </div>
          </div>
        </div>
      ) : (
      <div className="print-area block print:block bg-white font-sarabun text-[12pt] leading-normal text-black w-[210mm] min-h-[297mm] mx-auto shadow-md relative pt-[2.5cm] pb-[2cm] pl-[3cm] pr-[2cm] print:shadow-none print:w-[210mm] print:h-[297mm]">
        
        {/* Header Layer */}
        <div className="relative h-[3cm] mb-2">
          <div className="absolute bottom-4 left-0">
            ที่ ........................................
          </div>
          
          {/* Org Logo */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[3cm] w-[3cm] flex items-center justify-center rounded-full bg-transparent overflow-hidden">
            {org.logoUrl ? (
              <img src={org.logoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : null}
          </div>
          
          <div className="absolute bottom-4 right-0 max-w-[6cm] text-right">
            {org.nameTh}
          </div>
        </div>

        {/* Official Letter Body */}
        <div className="space-y-[6pt]">
          <div className="mb-2" style={{ marginLeft: '7.5cm' }}>
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
        <div className="mt-4 flex flex-col items-center" style={{ marginLeft: '7.5cm', width: '8.5cm' }}>
          <div className="mb-6">ขอแสดงความนับถือ</div>
          
          <div className="flex flex-col items-center mt-4">
            <div>({signer.fullNameTh})</div>
            <div>{signer.department || 'ผู้อนุมัติมีอำนาจสั่งการ'}</div>
          </div>
        </div>

        {/* Footer info (Left) */}
        <div className="absolute bottom-[2cm] left-[3cm] text-[12pt] leading-tight">
          {org.nameTh}<br/>
          {org.address && <>{org.address}<br/></>}
          โทร. {org.contactPhone || '-'}
        </div>

        {/* QR Code for download (Right) */}
        <div className="absolute bottom-[2cm] right-[2cm] flex flex-col items-center text-slate-800">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Download QR Code" className="h-16 w-16" />
          ) : (
            <QrCode className="h-16 w-16" strokeWidth={1.5} />
          )}
          <span className="text-[10pt] mt-1 font-bold">สแกนเพื่อดาวน์โหลดเอกสาร</span>
          <span className="text-[9pt] font-mono">REF: {request.trackingNo}</span>
        </div>
      </div>
      )}
    </div>
  );
};
