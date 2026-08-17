import React from 'react';
import { Printer } from 'lucide-react';
import type { Request } from '../types';
import { convertToThaiDate } from './ThaiLetterView';

interface CitizenRequestFormProps {
  request: Request;
  orgData?: any;
}

export const CitizenRequestForm: React.FC<CitizenRequestFormProps> = ({ request, orgData }) => {
  const handlePrint = () => {
    const orgName = orgData?.nameTh || 'ชื่อหน่วยงาน';
    const logoHtml = orgData?.logoUrl ? `<img src="${orgData.logoUrl}" style="height:2cm;object-fit:contain;margin-bottom:10pt;" alt="Logo">` : '';
    
    // Format rights
    const reqType = request.requestDetails?.requestType;
    const rightsMap: Record<string, string> = {
      'access': 'สิทธิในการเข้าถึงข้อมูลส่วนบุคคล (Right of Access)',
      'copy': 'สิทธิขอรับสำเนาข้อมูลส่วนบุคคล (Right to Copy)',
      'access_and_copy': 'สิทธิในการเข้าถึงและขอรับสำเนาข้อมูลส่วนบุคคล (Right of Access & Copy)',
    };
    const requestedRights = reqType ? (rightsMap[reqType] || reqType) : 'ไม่ระบุ';

    const submissionDateStr = request.submissionDate 
      ? convertToThaiDate(request.submissionDate, true) 
      : convertToThaiDate(new Date().toISOString(), true);

    const descriptionText = request.requestDetails?.description 
      ? request.requestDetails.description.replace(/\\n/g, '<br/>') 
      : 'ไม่มีรายละเอียดเพิ่มเติม';

    const methodMap: Record<string, string> = {
      'otp_email': 'OTP ผ่านอีเมล',
      'otp_phone': 'OTP ผ่านเบอร์โทรศัพท์',
      'document_check': 'ตรวจสอบเอกสาร',
      'video_verification': 'ยืนยันผ่านวิดีโอ',
      'in_person': 'ยืนยันด้วยตนเอง'
    };
    const identityMethod = request.identityVerification?.method 
      ? methodMap[request.identityVerification.method] || request.identityVerification.method
      : 'ไม่ระบุ';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>แบบคำร้องขอใช้สิทธิ - ${request.trackingNo}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Sarabun', sans-serif;
      font-size: 16pt;
      line-height: 1.3;
      color: #000;
      background: white;
      margin: 0;
      padding: 0;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 2cm;
      position: relative;
    }
    .saraban-box {
      position: absolute;
      top: 2cm;
      right: 2cm;
      width: 6cm;
      border: 1px solid #000;
      padding: 10pt;
      font-size: 14pt;
      line-height: 1.5;
    }
    .header {
      text-align: center;
      margin-bottom: 20pt;
      margin-top: 20pt;
    }
    .title {
      font-size: 20pt;
      font-weight: bold;
      margin-bottom: 10pt;
    }
    .tracking-no {
      text-align: right;
      font-size: 14pt;
      margin-bottom: 10pt;
    }
    .content-section {
      margin-bottom: 20pt;
    }
    .section-title {
      font-weight: bold;
      text-decoration: underline;
      margin-bottom: 10pt;
      font-size: 16pt;
    }
    .field-row {
      margin-bottom: 5pt;
    }
    .field-label {
      font-weight: bold;
      display: inline-block;
      width: 4cm;
    }
    .signature-section {
      margin-top: 30pt;
      display: flex;
      justify-content: space-between;
    }
    .signature-box {
      width: 45%;
      text-align: center;
    }
    .dotted-line {
      border-bottom: 1px dotted #000;
      display: inline-block;
      min-width: 5cm;
    }
    .official-box {
      margin-top: 30pt;
      border: 1px solid #000;
      padding: 15pt;
    }
    @media print { body { -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="page">
  <div class="saraban-box">
    <strong>สำหรับงานสารบรรณ</strong><br/>
    เลขรับ ..........................................<br/>
    วันที่ .............................................<br/>
    เวลา .............................................
  </div>

  <div class="header">
    ${logoHtml}
    <div class="title">แบบคำร้องขอใช้สิทธิของเจ้าของข้อมูลส่วนบุคคล</div>
    <div>(Data Subject Rights Request Form)</div>
  </div>

  <div class="tracking-no">
    รหัสอ้างอิงคำขอ: <strong>${request.trackingNo}</strong>
  </div>

  <div style="margin-bottom: 15pt;">
    <strong>วันที่ยื่นคำร้อง:</strong> ${submissionDateStr}<br/>
    <strong>เรียน:</strong> เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล / หัวหน้าหน่วยงาน (${orgName})
  </div>

  <div class="content-section">
    <div class="section-title">ส่วนที่ 1: ข้อมูลผู้ยื่นคำร้อง (Data Subject Details)</div>
    <div class="field-row"><span class="field-label">ชื่อ - นามสกุล:</span> ${request.requester.firstName} ${request.requester.lastName}</div>
    <div class="field-row"><span class="field-label">เลขประจำตัวประชาชน:</span> ${request.requester.idNumber || '-'}</div>
    <div class="field-row"><span class="field-label">อีเมล:</span> ${request.requester.email || '-'}</div>
    <div class="field-row"><span class="field-label">เบอร์โทรศัพท์:</span> ${request.requester.phone || '-'}</div>
  </div>

  <div class="content-section">
    <div class="section-title">ส่วนที่ 2: รายละเอียดการขอใช้สิทธิ (Request Details)</div>
    <div style="margin-bottom: 10pt;"><strong>สิทธิที่ร้องขอ:</strong></div>
    <div style="padding-left: 20pt; margin-bottom: 10pt;">- ${requestedRights}</div>
    
    <div style="margin-bottom: 5pt;"><strong>รายละเอียดคำร้อง:</strong></div>
    <div style="padding: 10pt; border: 1px dashed #ccc; min-height: 80pt; background-color: #f9f9f9;">
      ${descriptionText}
    </div>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div style="margin-bottom: 40pt;">
        (ยื่นคำร้องผ่านระบบอิเล็กทรอนิกส์)
      </div>
      <div>ลงชื่อ <span class="dotted-line">${request.requester.firstName} ${request.requester.lastName}</span> ผู้ยื่นคำร้อง</div>
      <div style="margin-top: 5pt;">วันที่ <span class="dotted-line">${submissionDateStr.split(' เวลา')[0]}</span></div>
    </div>
  </div>

  <div class="official-box">
    <div class="section-title">ส่วนที่ 3: สำหรับเจ้าหน้าที่รับเรื่อง (Intake Officer)</div>
    <div style="margin-bottom: 10pt;">
      [ &nbsp; ] ตรวจสอบความสมบูรณ์ของคำร้องแล้ว<br/>
      [ &nbsp; ] ตรวจสอบการยืนยันตัวตนแล้ว (รูปแบบ: ${identityMethod})
    </div>
    <div style="text-align: right; margin-top: 20pt;">
      <div>ลงชื่อ <span class="dotted-line"></span> เจ้าหน้าที่รับเรื่อง</div>
      <div style="margin-top: 5pt;">วันที่ <span class="dotted-line"></span></div>
    </div>
  </div>

</div>
<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 500);
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
    <button
      onClick={handlePrint}
      className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold py-1.5 px-3 rounded flex items-center gap-1.5 transition shadow-sm"
      title="พิมพ์แบบคำร้องเป็นกระดาษ A4 เพื่อใช้เป็นเอกสารต้นเรื่องนำส่งสารบรรณ"
    >
      <Printer className="h-3.5 w-3.5" />
      <span>พิมพ์แบบคำร้อง (A4)</span>
    </button>
  );
};
