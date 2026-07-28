const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Fix 10: Reorder safeUpdateRequest
const safeReqStr = `  // Helper to handle strict database mode
  const safeUpdateRequest = async (req: Request, actor: UserType, action: string, detail: string) => {
    try {
      await updateRequest(req, actor, action, detail);
      return true;
    } catch (err: any) {
      showNotify(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
      return false;
    }
  };`;

if (code.includes(safeReqStr)) {
  code = code.replace(safeReqStr + '\n\n', '');
  const showNotifyEnd = `    setNotifyState({ open: true, title: title || defaultTitle, message: cleanMessage, type, onConfirm, onCancel });
  };`;
  code = code.replace(showNotifyEnd, showNotifyEnd + '\n\n' + safeReqStr);
}

// Fix 2: handleVerifyIdentityQuick
const verifyQuickTarget = `  const handleVerifyIdentityQuick = (reqId: string, status: 'verified' | 'rejected', assurance: 'low' | 'medium' | 'high') => {`;
const verifyQuickReplace = `  const handleVerifyIdentityQuick = async (reqId: string, status: 'verified' | 'rejected', assurance: 'low' | 'medium' | 'high') => {`;
code = code.replace(verifyQuickTarget, verifyQuickReplace);

const verifyQuickUpdateTarget = `    updateRequest(req, activeUser, 'VERIFY_IDENTITY', \`ยืนยันตัวตนระดับ \${assurance.toUpperCase()} ผลเป็น: \${status === 'verified' ? 'ผ่าน' : 'ปฏิเสธ'}\`);`;
const verifyQuickUpdateReplace = `    await safeUpdateRequest(req, activeUser, 'VERIFY_IDENTITY', \`ยืนยันตัวตนระดับ \${assurance.toUpperCase()} ผลเป็น: \${status === 'verified' ? 'ผ่าน' : 'ปฏิเสธ'}\`);`;
code = code.replace(verifyQuickUpdateTarget, verifyQuickUpdateReplace);


// Fix 3: handleFeeSubmit
// already async
const feeSubmitTarget = `    updateRequest(req, activeUser, 'CALCULATE_FEE', \`คำนวณอัตราค่าธรรมเนียมสำเร็จ ยอดสุทธิ: \${subtotal} บาท (สถานะ: \${subtotal > 0 ? 'รอนัดชำระ' : 'ยกเว้น'})\`);`;
const feeSubmitReplace = `    await safeUpdateRequest(req, activeUser, 'CALCULATE_FEE', \`คำนวณอัตราค่าธรรมเนียมสำเร็จ ยอดสุทธิ: \${subtotal} บาท (สถานะ: \${subtotal > 0 ? 'รอนัดชำระ' : 'ยกเว้น'})\`);`;
code = code.replace(feeSubmitTarget, feeSubmitReplace);

// Fix 4: handleSaveRedactionAll
const saveRedactionTarget = `  const handleSaveRedactionAll = (reqId: string) => {`;
const saveRedactionReplace = `  const handleSaveRedactionAll = async (reqId: string) => {`;
code = code.replace(saveRedactionTarget, saveRedactionReplace);

const saveRedactionUpdateTarget = `    changeRequestStatus(reqId, 'DPO or Legal Review', activeUser, 'บันทึกการถมดำและส่งต่อให้กฎหมาย/DPO พิจารณาฐานสิทธิ์และเอกสารแจ้งผล');`;
const saveRedactionUpdateReplace = `    await changeRequestStatus(reqId, 'DPO or Legal Review', activeUser, 'บันทึกการถมดำและส่งต่อให้กฎหมาย/DPO พิจารณาฐานสิทธิ์และเอกสารแจ้งผล');`;
code = code.replace(saveRedactionUpdateTarget, saveRedactionUpdateReplace);

// Fix 4: markCompletenessDone
// already async
const completenessDoneTarget = `    changeRequestStatus(reqId, 'Complete', activeUser, 'ตรวจสอบเอกสารครบถ้วนเรียบร้อย เริ่มนับระยะเวลาดำเนินการ SLA');`;
const completenessDoneReplace = `    await changeRequestStatus(reqId, 'Complete', activeUser, 'ตรวจสอบเอกสารครบถ้วนเรียบร้อย เริ่มนับระยะเวลาดำเนินการ SLA');`;
code = code.replace(completenessDoneTarget, completenessDoneReplace);

// Fix 4: markCompletenessDeficient
// already async
const completenessDeficientTarget = `    changeRequestStatus(reqId, 'Awaiting Additional Information', activeUser, comment);`;
const completenessDeficientReplace = `    await changeRequestStatus(reqId, 'Awaiting Additional Information', activeUser, comment);`;
code = code.replace(completenessDeficientTarget, completenessDeficientReplace);


// Fix 5: handleMarkAsDelivered
const deliveredTarget = `    updateRequest(req, activeUser, 'TOGGLE_LEGAL_HOLD', 'เจ้าหน้าที่ทำการจัดส่งหนังสือราชการและข้อมูลสำเร็จ');`;
const deliveredReplace = `    await safeUpdateRequest(req, activeUser, 'DELIVER_REQUEST', 'เจ้าหน้าที่ทำการจัดส่งหนังสือราชการและข้อมูลสำเร็จ');`;
code = code.replace(deliveredTarget, deliveredReplace);

// Wait, looking at the previous grep of App.tsx, there are more changeRequestStatus calls:
/*
  changeRequestStatus(reqId, 'Withdrawn', mockUser, `ถอนคำขอเนื่องจาก: ${reason}`);
  changeRequestStatus(trackedRequest.id, 'Completeness Review', mockUser, `ผู้ยื่นอัปโหลดเอกสารแก้ไขเรียบร้อยแล้ว...`);
  changeRequestStatus(downloadRequest.id, 'Delivered', mockSubjectUser, 'ผู้ยื่นดาวน์โหลดข้อมูลผ่านระบบจัดส่งปลอดภัยสำเร็จ');
  changeRequestStatus(reqId, 'Ready for Delivery', activeUser, 'ชำระค่าธรรมเนียมแล้ว...');
  changeRequestStatus(reqId, resultStatus, activeUser, `ผู้อนุมัติมีคำสั่งอย่างเป็นทางการ...`);
  changeRequestStatus(reqId, 'Fee Notification', activeUser, 'แจ้งเรียกเก็บค่าธรรมเนียม...');
  changeRequestStatus(reqId, 'Ready for Delivery', activeUser, 'ไม่มีค่าธรรมเนียม...');
  changeRequestStatus(reqId, 'Ready for Delivery', activeUser, 'พร้อมส่งมอบหนังสือ...');
  changeRequestStatus(reqId, 'Closed', activeUser, 'คำขอสิ้นสุดกระบวนการ...');
  changeRequestStatus(activeRequestObj.id, 'Closed', activeUser, 'จัดส่งมอบลิงก์...');
*/
// It's safer to just replace all `changeRequestStatus(` with `await changeRequestStatus(` and make sure their parent functions are async.
// I will do that cautiously.

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed App.tsx part 1');
