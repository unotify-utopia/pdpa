const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf-8');

// List of exact function signatures to replace with their async counterparts
const replacements = [
  {
    from: 'const handleUploadAdditionalTrack = (fileName: string, dataUrl: string) => {',
    to: 'const handleUploadAdditionalTrack = async (fileName: string, dataUrl: string) => {'
  },
  {
    from: 'const markCompletenessDone = (reqId: string) => {',
    to: 'const markCompletenessDone = async (reqId: string) => {'
  },
  {
    from: 'const markCompletenessDeficient = (reqId: string) => {',
    to: 'const markCompletenessDeficient = async (reqId: string) => {'
  },
  {
    from: 'const handleFeeSubmit = (e: React.FormEvent, reqId: string) => {',
    to: 'const handleFeeSubmit = async (e: React.FormEvent, reqId: string) => {'
  },
  {
    from: 'const handleMarkAsPaid = (reqId: string) => {',
    to: 'const handleMarkAsPaid = async (reqId: string) => {'
  },
  {
    from: "const handleApproverSign = (reqId: string, resultStatus: 'Approved' | 'Partially Approved' | 'Denied' | 'No Data Found') => {",
    to: "const handleApproverSign = async (reqId: string, resultStatus: 'Approved' | 'Partially Approved' | 'Denied' | 'No Data Found') => {"
  },
  {
    from: 'const handleMarkAsDelivered = (reqId: string) => {',
    to: 'const handleMarkAsDelivered = async (reqId: string) => {'
  },
  {
    from: "setTimeout(() => {\r\n      await changeRequestStatus(reqId, 'Closed', activeUser, 'คำขอสิ้นสุดกระบวนการ บันทึกระยะเวลาดำเนินการเฉลี่ยปิดงาน');",
    to: "setTimeout(async () => {\r\n      await changeRequestStatus(reqId, 'Closed', activeUser, 'คำขอสิ้นสุดกระบวนการ บันทึกระยะเวลาดำเนินการเฉลี่ยปิดงาน');"
  },
  {
    from: "setTimeout(() => {\n      await changeRequestStatus(reqId, 'Closed', activeUser, 'คำขอสิ้นสุดกระบวนการ บันทึกระยะเวลาดำเนินการเฉลี่ยปิดงาน');",
    to: "setTimeout(async () => {\n      await changeRequestStatus(reqId, 'Closed', activeUser, 'คำขอสิ้นสุดกระบวนการ บันทึกระยะเวลาดำเนินการเฉลี่ยปิดงาน');"
  },
  {
    from: "onClick={() => {\r\n                            if (window.confirm('ยืนยันการจัดส่งข้อมูลให้เจ้าของข้อมูลและปิดเรื่องคำขอนี้?')) {\r\n                              await changeRequestStatus(activeRequestObj.id, 'Closed', activeUser, 'จัดส่งมอบลิงก์ดาวน์โหลดอย่างปลอดภัยและปิดเรื่องสำเร็จ');",
    to: "onClick={async () => {\r\n                            if (window.confirm('ยืนยันการจัดส่งข้อมูลให้เจ้าของข้อมูลและปิดเรื่องคำขอนี้?')) {\r\n                              await changeRequestStatus(activeRequestObj.id, 'Closed', activeUser, 'จัดส่งมอบลิงก์ดาวน์โหลดอย่างปลอดภัยและปิดเรื่องสำเร็จ');"
  },
  {
    from: "onClick={() => {\n                            if (window.confirm('ยืนยันการจัดส่งข้อมูลให้เจ้าของข้อมูลและปิดเรื่องคำขอนี้?')) {\n                              await changeRequestStatus(activeRequestObj.id, 'Closed', activeUser, 'จัดส่งมอบลิงก์ดาวน์โหลดอย่างปลอดภัยและปิดเรื่องสำเร็จ');",
    to: "onClick={async () => {\n                            if (window.confirm('ยืนยันการจัดส่งข้อมูลให้เจ้าของข้อมูลและปิดเรื่องคำขอนี้?')) {\n                              await changeRequestStatus(activeRequestObj.id, 'Closed', activeUser, 'จัดส่งมอบลิงก์ดาวน์โหลดอย่างปลอดภัยและปิดเรื่องสำเร็จ');"
  }
];

let replaced = 0;
for (const rep of replacements) {
  if (code.includes(rep.from)) {
    code = code.replace(rep.from, rep.to);
    console.log('✅ Replaced:', rep.to.substring(0, 50) + '...');
    replaced++;
  }
}

fs.writeFileSync('src/App.tsx', code);
console.log('Total replacements:', replaced);
