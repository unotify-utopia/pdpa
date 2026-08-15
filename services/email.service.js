// services/email.service.js
// ERPNext-inspired Email Service Module
// Handles SMTP fallback (Resend API -> Taximail API -> Nodemailer SMTP),
// Workflow email notifications, and in-memory notification logs.

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// --- SMTP TRANSPORTER CONFIGURATION ---
const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '465');

let smtpUsers = [];
let smtpPasses = [];

if (process.env.SMTP_USERS && process.env.SMTP_PASSWORDS) {
  smtpUsers = process.env.SMTP_USERS.split(',').map(s => s.trim());
  smtpPasses = process.env.SMTP_PASSWORDS.split(',').map(s => s.trim());
} else if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  smtpUsers = [process.env.SMTP_USER.trim()];
  smtpPasses = [process.env.SMTP_PASS.trim()];
} else {
  console.warn('⚠️ No SMTP credentials configured. Emails will fail to send.');
}

if (smtpUsers.length !== smtpPasses.length) {
  console.error('❌ Mismatch in number of SMTP_USERS and SMTP_PASSWORDS in .env');
}

const transporters = smtpUsers.map((user, i) => {
  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: user,
      pass: smtpPasses[i],
    },
  });
});

let currentTransporterIndex = 0;
let lastSwitchTime = Date.now();

let taximailSessionId = null;
let taximailSessionExpires = 0;

export async function getTaximailSessionId() {
  if (taximailSessionId && Date.now() < taximailSessionExpires) {
    return taximailSessionId;
  }
  
  const apiKey = process.env.SMTP_USER;
  const secretKey = process.env.SMTP_PASS;
  
  if (!apiKey || !secretKey) {
    throw new Error('Taximail API key or secret key missing in .env');
  }

  const response = await fetch('https://api.taximail.com/v2/user/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `api_key=${encodeURIComponent(apiKey.trim())}&secret_key=${encodeURIComponent(secretKey.trim())}`
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Taximail login failed: ${response.status} ${errText}`);
  }

  const data = await response.json();
  if (data.status === 'success' && data.data && data.data.session_id) {
    taximailSessionId = data.data.session_id;
    taximailSessionExpires = Date.now() + (12 * 60 * 1000); // cache for 12 mins (session expires in 15 mins)
    return taximailSessionId;
  } else {
    throw new Error('Taximail login failed, missing session_id');
  }
}

export async function sendMailWithFallback(mailOptions) {
  // PRIMARY: Use Resend REST API if API key is configured
  if (process.env.RESEND_API_KEY) {
    try {
      const fromEmail = process.env.OTP_SENDER_EMAIL || 'onboarding@resend.dev';
      const fromName = 'PDPA Access Portal';

      const payload = {
        from: `${fromName} <${fromEmail}>`,
        to: [mailOptions.to],
        subject: mailOptions.subject,
        html: mailOptions.html
      };

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(`Resend error: ${res.status} ${JSON.stringify(data)}`);
      }

      console.log(`✉️ Email sent successfully via Resend API to ${mailOptions.to} (id: ${data.id})`);
      return data;
    } catch (error) {
      console.error(`❌ Failed to send email via Resend API: ${error.message}`);
      throw error;
    }
  }

  // SECONDARY: Taximail REST API
  if (process.env.SMTP_HOST === 'smtp.taximail.com') {
    try {
      const sessionId = await getTaximailSessionId();
      
      let fromName = "PDPA Access Portal";
      let fromEmail = process.env.OTP_SENDER_EMAIL || "no-reply@utopia.in.th";
      
      // Parse from string if present e.g., "Name" <email@domain.com>
      if (mailOptions.from) {
        const match = mailOptions.from.match(/(?:"?([^"]*)"?\s)?<?([^>]+)>?/);
        if (match) {
          if (match[1]) fromName = match[1].trim();
          if (match[2]) fromEmail = match[2].trim();
        }
      }

      const payload = {
        subject: mailOptions.subject,
        from: { name: fromName, email: fromEmail },
        to: [{ email: mailOptions.to }],
        html: mailOptions.html
      };

      const res = await fetch('https://api.taximail.com/v2/transactional', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionId}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Taximail send error: ${res.status} ${errText}`);
      }
      
      console.log(`✉️ Email sent successfully via Taximail API to ${mailOptions.to}`);
      return await res.json();
    } catch (error) {
      console.error(`❌ Failed to send email via Taximail API: ${error.message}`);
      throw error;
    }
  }

  // Original fallback logic using nodemailer for Gmail, etc.
  if (transporters.length === 0) {
    throw new Error('No SMTP transporters configured');
  }

  // Reset to primary account if 24 hours have passed since the last fallback switch
  if (currentTransporterIndex !== 0 && (Date.now() - lastSwitchTime) > 24 * 60 * 60 * 1000) {
    console.log('24 hours passed since last SMTP switch. Resetting to primary account (index 0).');
    currentTransporterIndex = 0;
  }

  let attempts = 0;
  let lastError = null;

  while (attempts < transporters.length) {
    const transporter = transporters[currentTransporterIndex];
    try {
      const activeUser = smtpUsers[currentTransporterIndex];
      // Force "from" to match the active user to prevent auth mapping issues
      const finalMailOptions = {
        ...mailOptions,
        from: mailOptions.from || `"PDPA Center" <${process.env.OTP_SENDER_EMAIL || activeUser}>`
      };
      const result = await transporter.sendMail(finalMailOptions);
      console.log(`✉️ Email sent successfully via ${activeUser} to ${mailOptions.to}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to send email via ${smtpUsers[currentTransporterIndex]}: ${error.message}`);
      lastError = error;
      attempts++;
      currentTransporterIndex = (currentTransporterIndex + 1) % transporters.length;
      if (attempts < transporters.length) {
        console.log(`🔄 Switching to next SMTP account: ${smtpUsers[currentTransporterIndex]}`);
      }
    }
  }

  throw new Error(`All ${transporters.length} SMTP accounts failed. Last error: ${lastError.message}`);
}

// --- WORKFLOW EMAIL LOGGING & HELPERS ---
export const workflowEmailLogs = [];

export const getStatusNameTh = (status) => {
  const statusMap = {
    'Draft': 'แบบร่างคำขอ (Draft)',
    'Submitted': 'ยื่นคำขอใหม่ (Submitted)',
    'Received': 'รับเรื่องและรอตรวจสอบ (Received)',
    'Completeness Review': 'ตรวจสอบความครบถ้วน (Completeness Review)',
    'Identity Verification': 'ตรวจสอบและยืนยันตัวตน (Identity Verification)',
    'Awaiting Additional Information': 'รอข้อมูล/เอกสารเพิ่มเติม (Awaiting Additional Info)',
    'Awaiting Identity Evidence': 'รอเอกสารยืนยันตัวตน (Awaiting Identity Evidence)',
    'Complete': 'เอกสารครบถ้วน/เริ่มนับ SLA (Complete)',
    'Assigned': 'มอบหมายผู้รับผิดชอบ (Assigned)',
    'Data Collection': 'อยู่ระหว่างรวบรวมข้อมูล (Data Collection)',
    'Data Owner Review': 'เจ้าหน้าที่ข้อมูลตรวจสอบ (Data Owner Review)',
    'DPO or Legal Review': 'นิติกร/DPO ตรวจสอบกฎหมาย (DPO/Legal Review)',
    'Redaction Required': 'อยู่ระหว่างถมดำข้อมูล (Redaction Required)',
    'Approval Pending': 'รอการอนุมัติคำสั่ง (Approval Pending)',
    'Fee Notification': 'แจ้งค่าธรรมเนียมการดำเนินการ (Fee Notification)',
    'Awaiting Payment': 'รอชำระค่าธรรมเนียม (Awaiting Payment)',
    'Approved': 'อนุมัติคำขอ (Approved)',
    'Ready for Delivery': 'เตรียมส่งมอบข้อมูล (Ready for Delivery)',
    'Delivered': 'จัดส่งมอบข้อมูลแล้ว (Delivered)',
    'Receipt Confirmed': 'ผู้ยื่นยืนยันรับข้อมูล (Receipt Confirmed)',
    'Denied': 'ปฏิเสธคำขอ (Denied)',
    'No Data Found': 'ไม่พบข้อมูลส่วนบุคคล (No Data Found)',
    'Withdrawn': 'ผู้ยื่นถอนคำขอ (Withdrawn)',
    'Disposed for Incomplete Information': 'จำหน่ายคดีเนื่องจากเอกสารไม่ครบถ้วน',
    'Closed': 'ปิดคำขอเสร็จสมบูรณ์ (Closed)'
  };
  return statusMap[status] || status;
};

// Helper: Send Workflow Email Notification based on PDPA Document Flow
export const sendWorkflowNotification = async (request, oldStatus, newStatus, eventType, dbPool = null) => {
  if (!request) return;
  
  // If dbPool wasn't passed as argument, try importing from server.js dynamically
  let pool = dbPool;
  if (!pool) {
    try {
      const serverModule = await import('../server.js');
      pool = serverModule.dbPool;
    } catch (e) {
      // Ignore if cannot import
    }
  }

  const trackingNo = request.trackingNo || 'REQ-UNKNOWN';
  const citizenEmail = request.requester?.email || '';
  const citizenName = `${request.requester?.firstName || ''} ${request.requester?.lastName || ''}`.trim() || 'ผู้ยื่นคำขอ';
  const isOnlineWeb = request.contactChannel === 'web';
  const statusNameTh = getStatusNameTh(newStatus);
  
  // Define default fallback officer email addresses per role
  let intakeEmails = [process.env.INTAKE_EMAIL || 'youtub6.numcom@gmail.com'];
  let ownerEmails = [process.env.OWNER_EMAIL || 'youtub6.numcom@gmail.com'];
  let dpoEmails = [process.env.DPO_EMAIL || 'youtub6.numcom@gmail.com'];
  let approverEmails = [process.env.APPROVER_EMAIL || 'youtub6.numcom@gmail.com'];
  let adminEmails = [process.env.ADMIN_EMAIL || 'youtub6.numcom@gmail.com'];

  // Dynamically fetch actual emails from database based on orgId and role
  if (request.orgId && pool) {
    try {
      const { rows: officers } = await pool.query(
        "SELECT role, email FROM users WHERE org_id = $1 AND email IS NOT NULL AND email != ''",
        [request.orgId]
      );
      
      const intakes = officers.filter(o => o.role === 'intake').map(o => o.email);
      if (intakes.length > 0) intakeEmails = intakes;
      
      const owners = officers.filter(o => o.role === 'owner').map(o => o.email);
      if (owners.length > 0) ownerEmails = owners;
      
      const dpos = officers.filter(o => o.role === 'dpo').map(o => o.email);
      if (dpos.length > 0) dpoEmails = dpos;
      
      const approvers = officers.filter(o => o.role === 'approver').map(o => o.email);
      if (approvers.length > 0) approverEmails = approvers;
      
      const admins = officers.filter(o => o.role === 'admin').map(o => o.email);
      if (admins.length > 0) adminEmails = admins;
    } catch (err) {
      console.error('Error fetching officer emails for notification:', err.message);
    }
  }

  const recipients = [];
  
  // Helper to add multiple officers of the same role, filtering out mock emails
  const addRecipients = (emails, roleName, actionRequired) => {
    emails.forEach(email => {
      // Basic check for common mock/dummy domains to prevent SMTP bounce limits
      const isMockEmail = email.endsWith('@example.com') || email.endsWith('@organization.or.th');
      if (email && !isMockEmail && !recipients.find(r => r.email === email)) {
        recipients.push({ email, roleName, actionRequired });
      } else if (isMockEmail) {
        console.log(`[SMTP] Skipping notification for mock email: ${email}`);
      }
    });
  };

  let subject = '';
  let flowMessageTh = '';
  let nextActionTh = '';

  if (eventType === 'CREATE') {
    if (isOnlineWeb) {
      if (citizenEmail) addRecipients([citizenEmail], 'ผู้ยื่นคำขอ', 'ยืนยันการรับเรื่องคำร้อง');
      addRecipients(intakeEmails, 'เจ้าหน้าที่ Intake', 'ตรวจสอบความครบถ้วนของเอกสารเบื้องต้น (Completeness Review)');
      subject = `[PDPA Portal] ยืนยันการรับคำขอใช้สิทธิ์ใหม่ ${trackingNo}`;
      flowMessageTh = `คำขอใช้สิทธิ์ตาม PDPA เลขที่ ${trackingNo} ได้รับการยื่นออนไลน์เข้าสู่ระบบเรียบร้อยแล้ว`;
      nextActionTh = `เจ้าหน้าที่รับเรื่อง (Intake Officer) จะดำเนินการตรวจสอบความครบถ้วนของข้อมูลภายในระยะเวลาที่กฎหมายกำหนด`;
    } else {
      addRecipients(intakeEmails, 'เจ้าหน้าที่ Intake', 'บันทึกคำขอและเตรียมประสานงานเจ้าหน้าที่ข้อมูล');
      subject = `[PDPA Portal] บันทึกคำขอใช้สิทธิ์ใหม่ (Intake Entry) ${trackingNo}`;
      flowMessageTh = `คำขอใช้สิทธิ์ตาม PDPA เลขที่ ${trackingNo} ถูกบันทึกเข้าระบบโดยเจ้าหน้าที่รับเรื่องเรียบร้อยแล้ว`;
      nextActionTh = `ตรวจสอบและมอบหมายคำขอไปยังหน่วยงานผู้เป็นเจ้าของข้อมูล (Data Owner)`;
    }
  } else if (eventType === 'NEW_MESSAGE') {
    subject = `[PDPA Portal] มีข้อความใหม่จากประชาชน - คำขอเลขที่ ${trackingNo}`;
    flowMessageTh = `ประชาชนได้ส่งข้อความสอบถามหรือแจ้งข้อมูลเพิ่มเติมผ่านระบบ Message Board สำหรับคำขอใช้สิทธิ์ PDPA เลขที่ ${trackingNo}`;
    nextActionTh = `เจ้าหน้าที่ตรวจสอบข้อความและตอบกลับประชาชนผ่านช่องทาง Message Board ในระบบ`;
    addRecipients(intakeEmails, 'เจ้าหน้าที่ Intake', 'ตรวจสอบข้อความจากประชาชน');
    addRecipients(adminEmails, 'ผู้ดูแลระบบ (Admin)', 'รับทราบการติดต่อจากประชาชน');
  } else if (eventType === 'STAFF_REPLY') {
    subject = `[PDPA Portal] เจ้าหน้าที่ได้ตอบกลับข้อความของท่าน - คำขอเลขที่ ${trackingNo}`;
    flowMessageTh = `เจ้าหน้าที่ได้ตอบกลับข้อความหรือชี้แจงข้อมูลเพิ่มเติมผ่านระบบ Message Board สำหรับคำขอใช้สิทธิ์ PDPA เลขที่ ${trackingNo} เรียบร้อยแล้ว`;
    nextActionTh = `ท่านสามารถเข้าสู่ระบบเพื่อตรวจสอบข้อความตอบกลับและสนทนากับเจ้าหน้าที่ได้โดยตรง`;
    if (citizenEmail) addRecipients([citizenEmail], 'ผู้ยื่นคำขอ', 'ตรวจสอบข้อความตอบกลับจากเจ้าหน้าที่');
  } else {
    subject = `[PDPA Portal] แจ้งอัปเดตสถานะคำขอ ${trackingNo} -> ${statusNameTh}`;
    flowMessageTh = `คำขอใช้สิทธิ์ PDPA เลขที่ ${trackingNo} มีการเปลี่ยนสถานะจาก "${oldStatus ? getStatusNameTh(oldStatus) : 'ไม่ระบุ'}" เป็น "${statusNameTh}"`;

    if (['Completeness Review', 'Identity Verification', 'Awaiting Additional Information', 'Awaiting Identity Evidence'].includes(newStatus)) {
      if (citizenEmail) addRecipients([citizenEmail], 'ผู้ยื่นคำขอ', 'ติดตาม/นำส่งเอกสารเพิ่มเติม (หากมี)');
      addRecipients(intakeEmails, 'เจ้าหน้าที่ Intake', 'ตรวจสอบเอกสารให้ครบถ้วนก่อนรับเป็นทางการ');
      nextActionTh = `ตรวจสอบความถูกต้องของตัวตนและเอกสารประกอบ เพื่อเริ่มนับ SLA ทางกฎหมาย (30 วัน)`;
    } else if (['Complete', 'Assigned', 'Data Collection'].includes(newStatus)) {
      if (citizenEmail) addRecipients([citizenEmail], 'ผู้ยื่นคำขอ', 'รับทราบการเริ่มดำเนินการและนับ SLA');
      addRecipients(intakeEmails, 'เจ้าหน้าที่ Intake', 'ประสานงานรวบรวมข้อมูล');
      addRecipients(ownerEmails, 'เจ้าหน้าที่ข้อมูล (Data Owner)', 'รวบรวมข้อมูลส่วนบุคคลที่เกี่ยวข้องตามคำร้อง');
      nextActionTh = `เจ้าหน้าที่ผู้ครอบครองข้อมูล (Data Owner) ดำเนินการสืบค้นและรวบรวมข้อมูลตามฐานสิทธิ์`;
    } else if (['Data Owner Review', 'DPO or Legal Review', 'Redaction Required'].includes(newStatus)) {
      addRecipients(ownerEmails, 'เจ้าหน้าที่ข้อมูล (Data Owner)', 'ตรวจสอบความถูกต้องของข้อมูลที่รวบรวม');
      addRecipients(dpoEmails, 'เจ้าหน้าที่ DPO / นิติกร', 'ตรวจสอบข้อกฎหมาย ข้อยกเว้น และถมดำข้อมูลบุคคลที่สาม');
      nextActionTh = `เจ้าหน้าที่ DPO / นิติกร ตรวจสอบความถูกต้องทางกฎหมายและคุ้มครองสิทธิ์บุคคลที่สามก่อนเสนออนุมัติ`;
    } else if (['Approval Pending', 'Fee Notification', 'Awaiting Payment'].includes(newStatus)) {
      addRecipients(approverEmails, 'ผู้มีอำนาจลงนาม / คณะกรรมการ', 'พิจารณาอนุมัติคำสั่งทางปกครอง / สิทธิ์ PDPA');
      if (['Fee Notification', 'Awaiting Payment'].includes(newStatus)) {
        if (citizenEmail) {
          addRecipients([citizenEmail], 'ผู้ยื่นคำขอ', 'ชำระค่าธรรมเนียมการดำเนินการ (หากมีค่าใช้จ่ายตามจริง)');
        }
      }
      nextActionTh = `อยู่ระหว่างการพิจารณาอนุมัติคำสั่งอย่างเป็นทางการโดยผู้บริหาร/ผู้มีอำนาจลงนาม`;
    } else if (['Approved', 'Ready for Delivery', 'Delivered', 'Receipt Confirmed'].includes(newStatus)) {
      if (citizenEmail) addRecipients([citizenEmail], 'ผู้ยื่นคำขอ', 'ดาวน์โหลดข้อมูล/รับหนังสือแจ้งผลผ่านระบบปลอดภัย');
      addRecipients(intakeEmails, 'เจ้าหน้าที่ Intake', 'จัดส่งมอบข้อมูลและบันทึกปิดงาน');
      addRecipients(dpoEmails, 'เจ้าหน้าที่ DPO', 'ตรวจสอบการปิดรายงานตาม SLA');
      nextActionTh = `พิจารณาอนุมัติเรียบร้อยแล้ว พร้อมส่งมอบข้อมูลสิทธิ์และหนังสือราชการแจ้งผลอย่างปลอดภัยผ่านช่องทางที่ผู้ยื่นระบุ`;
    } else if (['Denied', 'No Data Found', 'Withdrawn', 'Disposed for Incomplete Information', 'Closed'].includes(newStatus)) {
      if (citizenEmail) addRecipients([citizenEmail], 'ผู้ยื่นคำขอ', 'รับทราบผลการตัดสิน/การสิ้นสุดคำขอ');
      addRecipients(intakeEmails, 'เจ้าหน้าที่ Intake', 'จัดเก็บสถิติและปิดคำร้อง');
      addRecipients(dpoEmails, 'เจ้าหน้าที่ DPO', 'บันทึกประวัติข้อกฎหมาย');
      nextActionTh = `คำขอเสร็จสมบูรณ์และยุติกระบวนการตามกฎหมายคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 เรียบร้อยแล้ว`;
    } else {
      if (citizenEmail) addRecipients([citizenEmail], 'ผู้ยื่นคำขอ', 'รับทราบสถานะการดำเนินการของคำขอ');
      addRecipients(intakeEmails, 'เจ้าหน้าที่ Intake', 'ตรวจสอบความคืบหน้า');
      nextActionTh = `ดำเนินการตามขั้นตอนมาตรฐาน PDPA Request Workflow`;
    }
  }

  // Generate Email HTML Content
  const htmlContent = `
    <div style="font-family: 'Sarabun', sans-serif, Tahoma; max-width: 640px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
      <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px; text-align: center;">
        <h2 style="color: #ffffff; margin: 0; font-size: 20px;">ระบบบริหารจัดการสิทธิ์ PDPA (PDPA Access Portal)</h2>
        <p style="color: #e0f2fe; margin: 6px 0 0; font-size: 14px;">การแจ้งเตือนความคืบหน้าคำขอตาม Flow เอกสาร</p>
      </div>
      <div style="padding: 28px 24px; background-color: #ffffff;">
        <p style="color: #334155; font-size: 16px; margin-top: 0;">เรียน ผู้เกี่ยวข้องตาม Workflow,</p>
        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
          ${flowMessageTh}
        </p>
        <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 18px; margin: 20px 0; border-radius: 6px;">
          <p style="margin: 0 0 10px; color: #1e293b; font-weight: bold; font-size: 16px;">
            เลขที่คำขอ (Tracking No.): <span style="color: #0284c7;">${trackingNo}</span>
          </p>
          <p style="margin: 0 0 8px; color: #475569; font-size: 14px;">
            <strong>สถานะปัจจุบัน:</strong> <span style="background-color: #e0f2fe; color: #0369a1; padding: 3px 10px; border-radius: 12px; font-weight: bold;">${statusNameTh}</span>
          </p>
          <p style="margin: 0 0 8px; color: #475569; font-size: 14px;">
            <strong>ช่องทางการยื่น:</strong> ${isOnlineWeb ? 'ออนไลน์ผ่านเว็บไซต์ (Online E-Service)' : 'บันทึกคำขอโดยเจ้าหน้าที่ (Manual Intake Entry)'}
          </p>
          <p style="margin: 0 0 8px; color: #475569; font-size: 14px;">
            <strong>ผู้ยื่นคำขอ:</strong> ${citizenName}
          </p>
          <p style="margin: 0; color: #475569; font-size: 14px;">
            <strong>วันที่บันทึก:</strong> ${new Date().toLocaleString('th-TH')}
          </p>
        </div>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; margin: 24px 0;">
          <p style="margin: 0 0 6px; color: #166534; font-weight: bold; font-size: 14px;">🎯 ขั้นตอนถัดไปใน Workflow:</p>
          <p style="margin: 0; color: #15803d; font-size: 14px;">${nextActionTh}</p>
        </div>
        <div style="text-align: center; margin-top: 28px;">
          <a href="${process.env.FRONTEND_URL || 'https://pdpa.numcomputer.com'}" style="background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
            เข้าสู่ระบบเพื่อตรวจสอบคำขอ (PDPA Portal)
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 28px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          อีเมลนี้เป็นข้อความแจ้งเตือนอัตโนมัติตามข้อกำหนดกรอบเวลาการปฏิบัติงาน (SLA) และกระบวนการของพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
        </p>
      </div>
    </div>
  `;

  // Send Emails & Record to Log
  for (const rcpt of recipients) {
    if (!rcpt.email) continue;
    const logItem = {
      id: `elog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      trackingNo,
      eventType,
      recipientEmail: rcpt.email,
      recipientRole: rcpt.roleName,
      subject,
      status: newStatus,
      sentSuccess: true,
      errorMsg: null
    };
    try {
      await sendMailWithFallback({
        from: `"PDPA Access Portal" <${process.env.OTP_SENDER_EMAIL || process.env.SMTP_USER || 'pdpa.utopia@gmail.com'}>`,
        to: rcpt.email,
        subject,
        html: htmlContent
      });
      console.log(`📧 [Workflow Email Sent] To: ${rcpt.email} (${rcpt.roleName}) | Subject: ${subject}`);
    } catch (mailErr) {
      logItem.sentSuccess = false;
      logItem.errorMsg = mailErr.message;
      console.log(`📧 [Workflow Email Queued/Demo] To: ${rcpt.email} (${rcpt.roleName}) | Subject: ${subject} | Notice: ${mailErr.message}`);
    }
    workflowEmailLogs.unshift(logItem);
    if (workflowEmailLogs.length > 500) workflowEmailLogs.pop();
  }
};
