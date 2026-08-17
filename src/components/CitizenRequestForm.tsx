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

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>แบบคำร้องขอใช้สิทธิ - ${request.trackingNo}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Sarabun', sans-serif;
      font-size: 12pt;
      line-height: 1.4;
      color: #000;
      background: white;
      margin: 0;
      padding: 0;
    }
    .page {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      position: relative;
    }
    .tracking-no {
      text-align: right;
      font-size: 11pt;
      margin-bottom: 10pt;
      border-bottom: 1px solid #000;
      padding-bottom: 5pt;
    }
    .content-section {
      margin-bottom: 10pt;
    }
    .section-title {
      font-weight: bold;
      text-decoration: underline;
      margin-bottom: 5pt;
      font-size: 13pt;
    }
    .field-row {
      margin-bottom: 3pt;
      display: flex;
    }
    .field-label {
      font-weight: bold;
      width: 4.5cm;
      flex-shrink: 0;
    }
    .signature-section {
      margin-top: 30pt;
      display: flex;
      justify-content: center;
    }
    .signature-box {
      width: 60%;
      text-align: center;
    }
    .dotted-line {
      border-bottom: 1px dotted #000;
      display: inline-block;
      min-width: 5cm;
    }
    @media print { body { -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="page">
  <div class="tracking-no">
    รหัสอ้างอิงคำขอ: <strong>${request.trackingNo}</strong>
  </div>

  <div style="margin-bottom: 15pt; line-height: 1.6;">
    <strong>วันที่ยื่นคำร้อง:</strong> ${submissionDateStr}<br/>
    <strong>เรียน:</strong> เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (${orgName})
  </div>

  <div class="content-section">
    <div class="section-title">ส่วนที่ 1: ข้อมูลผู้ยื่นคำร้อง (Data Subject Details)</div>
    <div class="field-row"><span class="field-label">ชื่อ - นามสกุล:</span> <span>${request.requester.firstName} ${request.requester.lastName}</span></div>
    <div class="field-row"><span class="field-label">เลขประจำตัวประชาชน:</span> <span>${request.requester.idNumber ? request.requester.idNumber.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, "$1-$2-$3-$4-$5") : '-'}</span></div>
    <div class="field-row"><span class="field-label">อีเมล:</span> <span>${request.requester.email || '-'}</span></div>
    <div class="field-row"><span class="field-label">เบอร์โทรศัพท์:</span> <span>${request.requester.phone || '-'}</span></div>
  </div>

  <div class="content-section">
    <div class="section-title">ส่วนที่ 2: รายละเอียดการขอใช้สิทธิ (Request Details)</div>
    <div style="margin-bottom: 5pt;"><strong>สิทธิที่ร้องขอ:</strong></div>
    <div style="padding-left: 15pt; margin-bottom: 10pt;">- ${requestedRights}</div>
    
    <div style="margin-bottom: 5pt;"><strong>รายละเอียดคำร้อง:</strong></div>
    <div style="padding: 10pt; border: 1px dashed #ccc; min-height: 80pt; background-color: #fafafa;">
      ${descriptionText}
    </div>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div style="margin-bottom: 30pt; font-size: 12pt; color: #555;">
        (ยื่นคำร้องผ่านระบบอิเล็กทรอนิกส์)
      </div>
      <div style="margin-bottom: 10pt;">ลงชื่อ <span class="dotted-line">${request.requester.firstName} ${request.requester.lastName}</span> ผู้ยื่นคำร้อง</div>
      <div>วันที่ <span class="dotted-line">${submissionDateStr.split(' เวลา')[0]}</span></div>
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
