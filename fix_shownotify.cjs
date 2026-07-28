const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1) Restore the full showNotify body (it got corrupted)
const brokenShowNotify = `  const showNotify = (message: string, type: NotifyType = 'success', title?: string, onConfirm?: () => void, onCancel?: () => void) => {
    let defaultTitle = 'การแจ้งเตือนจากระบบ';
    if (type === 'error') defaultTitle = 'เกิดข้อผิดพลาด';
    if (type === 'warning') defaultTitle = 'ข้อความแจ้งเตือน';
    if (type === 'confirm') defaultTitle = 'ยืนยันการดำเนินการ';
    
    // Auto-detect type if it's default
    setNotifyState({ open: true, title: title || defaultTitle, message: cleanMessage, type, onConfirm, onCancel });
  };`;

const fullShowNotify = `  const showNotify = (message: string, type: NotifyType = 'success', title?: string, onConfirm?: () => void, onCancel?: () => void) => {
    let defaultTitle = 'การแจ้งเตือนจากระบบ';
    if (type === 'error') defaultTitle = 'เกิดข้อผิดพลาด';
    if (type === 'warning') defaultTitle = 'ข้อความแจ้งเตือน';
    if (type === 'confirm') defaultTitle = 'ยืนยันการดำเนินการ';
    
    // Auto-detect type if it's default
    if (message.includes('❌') || message.includes('เกิดข้อผิดพลาด') || message.includes('ไม่สามารถ')) {
      type = 'error';
      defaultTitle = 'เกิดข้อผิดพลาด';
    } else if (message.includes('⚠️') || message.includes('กรุณา')) {
      type = 'warning';
      defaultTitle = 'ข้อความแจ้งเตือน';
    } else if (message.includes('✅') || message.includes('สำเร็จ') || message.includes('เรียบร้อย')) {
      type = 'success';
      defaultTitle = 'การแจ้งเตือนจากระบบ';
    }
    
    // Remove emojis from message for cleaner UI
    const cleanMessage = message.replace(/^[❌⚠️✅]\\s*/, '');
    
    setNotifyState({ open: true, title: title || defaultTitle, message: cleanMessage, type, onConfirm, onCancel });
  };

  // Helper to handle strict database mode — declared after showNotify so it can call it on error
  const safeUpdateRequest = async (req: Request, actor: UserType, action: string, detail: string) => {
    try {
      await updateRequest(req, actor, action, detail);
      return true;
    } catch (err: any) {
      showNotify(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
      return false;
    }
  };`;

if (code.includes(brokenShowNotify)) {
  code = code.replace(brokenShowNotify, fullShowNotify);
  console.log('✅ showNotify body restored + safeUpdateRequest added after it');
} else {
  console.log('⚠️ Could not find brokenShowNotify. Showing current state around showNotify...');
  const idx = code.indexOf('const showNotify = ');
  console.log(code.substring(idx, idx + 600));
}

fs.writeFileSync('src/App.tsx', code);
console.log('Done.');
