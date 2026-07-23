import type { Organization, ComplianceConfig, User, Request, DocumentTemplate } from './types';

// Mock Organizations list (Multi-tenant)
export const initialOrganizations: Organization[] = [
  {
    id: 'org_dopa',
    nameTh: 'กรมการปกครอง (Department of Provincial Administration)',
    nameEn: 'Department of Provincial Administration',
    contactEmail: 'pdpa@dopa.go.th',
    contactPhone: '02-221-8150'
  },
  {
    id: 'org_rd',
    nameTh: 'กรมสรรพากร (Revenue Department)',
    nameEn: 'Revenue Department',
    contactEmail: 'pdpa@rd.go.th',
    contactPhone: '02-272-8000'
  },
  {
    id: 'org_tech_th',
    nameTh: 'บริษัท ไทยเทคโนโลยี อินโนเวชั่น จำกัด (Thai Tech)',
    nameEn: 'Thai Tech Innovation Co., Ltd.',
    contactEmail: 'dpo@thaitech.co.th',
    contactPhone: '02-999-8888'
  }
];

// Initial PDPA Compliance Configuration (Section 1)
export const initialComplianceConfig: ComplianceConfig = {
  id: 'cfg_v1',
  version: 1,
  effectiveDate: '2026-06-01',
  publishedDate: '2026-05-15',
  sla: {
    completenessCheckDays: 15,
    deficiencyResponseDays: 10,
    processingDays: 30,
    extensionDays: 30,
    retentionYears: 2,
  },
  feeRates: {
    paperCopyRate: 1.00, // 1 THB / A4 copy
    computerPrintRate: 3.00, // 3 THB / A4 computer print
    certificationRate: 5.00, // 5 THB / Certification
  },
  disclaimerText: 'ระบบนี้เป็นเครื่องมือสนับสนุนการดำเนินงาน ไม่ใช่ระบบให้คำปรึกษากฎหมายโดยอัตโนมัติ การอนุมัติ ปฏิเสธ หรือเปิดเผยข้อมูลต้องผ่านการพิจารณาของเจ้าหน้าที่ผู้รับผิดชอบ',
  rejectionReasons: [
    { code: 'SEC_30_LAW', labelTh: 'การเปิดเผยขัดต่อกฎหมายหรือคำสั่งศาล', labelEn: 'Disclosure is prohibited by law or court order' },
    { code: 'SEC_30_RIGHTS', labelTh: 'ส่งผลกระทบต่อสิทธิและเสรีภาพของบุคคลอื่น', labelEn: 'Affects the rights and freedoms of other persons' },
    { code: 'SEC_30_IP', labelTh: 'กระทบข้อมูลความลับทางการค้า ลิขสิทธิ์ หรือทรัพย์สินทางปัญญา', labelEn: 'Affects trade secrets, copyright, or intellectual property' },
    { code: 'SEC_30_REPETITIVE', labelTh: 'เป็นคำขอซ้ำซาก ฟุ่มเฟือย หรือไม่มีเหตุผลอันสมควร', labelEn: 'Repetitive, vexatious, or unreasonable request' },
    { code: 'SEC_30_BURDEN', labelTh: 'เป็นภาระแก่ผู้ควบคุมข้อมูลเกินสมควร', labelEn: 'Imposes an excessive burden on the data controller' },
    { code: 'SEC_30_UNSUPPORTED', labelTh: 'ไม่ปรากฏข้อมูลส่วนบุคคลดังกล่าวในระบบขององค์กร', labelEn: 'Data not found in organization systems' }
  ],
  updatedBy: 'สุรพงษ์ ยุติธรรม (DPO)',
  updatedAt: '2026-07-20T08:00:00Z',
  changeReason: 'การตั้งค่าเริ่มต้นระบบตามมาตรา 30 และประกาศคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2569'
};

// Default Workspace Users (Multi-tenant & Multi-role support with SOD conflict check)
export const systemUsers: User[] = [
  { id: 'usr_admin', orgId: 'org_dopa', username: 'admin.pdpa', fullNameTh: 'สมเจตน์ จัดการดี (DOPA Admin)', fullNameEn: 'Somjet Kankardee', email: 'admin@dopa.go.th', role: 'admin', roles: ['admin'], department: 'เทคโนโลยีสารสนเทศ (กรมการปกครอง)', mfaEnabled: true },
  { id: 'usr_intake', orgId: 'org_dopa', username: 'intake.pdpa', fullNameTh: 'กิตติพงษ์ รับเรื่อง (DOPA Intake)', fullNameEn: 'Kittipong Rubruang', email: 'intake@dopa.go.th', role: 'intake', roles: ['intake'], department: 'ศูนย์รับเรื่องร้องเรียน (กรมการปกครอง)', mfaEnabled: true },
  { id: 'usr_intake_demo', orgId: 'org_dopa', username: 'intake.demo', fullNameTh: 'สมชาย รับเรื่องทดสอบ (DOPA Intake Only)', fullNameEn: 'Somchai Intake Demo', email: 'intake.demo@dopa.go.th', role: 'intake', roles: ['intake'], department: 'ศูนย์รับเรื่องและคัดกรองคำขอ PDPA', mfaEnabled: true },
  { id: 'usr_owner_crm', orgId: 'org_dopa', username: 'crm.owner', fullNameTh: 'ธนาธร ทะเบียนราษฎร (DOPA Owner)', fullNameEn: 'Thanatorn CustomerSys', email: 'crm@dopa.go.th', role: 'owner', roles: ['owner'], department: 'สำนักบริหารการทะเบียน', mfaEnabled: false },
  { id: 'usr_owner_hr', orgId: 'org_dopa', username: 'hr.owner', fullNameTh: 'สมรศรี บุคลากร (DOPA HR)', fullNameEn: 'Samornsri HumanResource', email: 'hr@dopa.go.th', role: 'owner', roles: ['owner'], department: 'กองการเจ้าหน้าที่ (กรมการปกครอง)', mfaEnabled: false },
  { id: 'usr_dpo', orgId: 'org_dopa', username: 'dpo.pdpa', fullNameTh: 'สุรพงษ์ ยุติธรรม (DOPA DPO)', fullNameEn: 'Surapong Yutitham', email: 'dpo@dopa.go.th', role: 'dpo', roles: ['dpo'], department: 'กลุ่มงานคุ้มครองข้อมูลส่วนบุคคล', mfaEnabled: true },
  { id: 'usr_approver', orgId: 'org_dopa', username: 'exec.pdpa', fullNameTh: 'ดร. ประภาส อธิบดี (DOPA Exec)', fullNameEn: 'Dr. Prapas Anumatsak', email: 'director@dopa.go.th', role: 'approver', roles: ['approver'], department: 'ผู้บริหารระดับสูง (กรมการปกครอง)', mfaEnabled: true },
  { id: 'usr_auditor', orgId: 'org_dopa', username: 'audit.pdpa', fullNameTh: 'วิลาวัลย์ ตรวจสอบ (Auditor)', fullNameEn: 'Wilawan Truajsob', email: 'auditor@external.or.th', role: 'auditor', roles: ['auditor'], department: 'ผู้ตรวจสอบภายในอิสระ', mfaEnabled: true },

  // Multi-Role Demo User (Normal Combination: Intake + Data Owner)
  { id: 'usr_multi_normal', orgId: 'org_dopa', username: 'staff.multi', fullNameTh: 'อนุชา ควบหน้าที่ (Intake & Owner)', fullNameEn: 'Anucha Multi', email: 'anucha@dopa.go.th', role: 'intake', roles: ['intake', 'owner'], department: 'ศูนย์รับเรื่องและคลังข้อมูล', mfaEnabled: true },

  // Multi-Role Demo User (SOD Risk Warning Combination: DPO + Approver)
  {
    id: 'usr_multi_sod_risk',
    orgId: 'org_dopa',
    username: 'sod.risk',
    fullNameTh: 'สมศักดิ์ รวบสิทธิ์ (DPO & Approver - SOD Risk)',
    fullNameEn: 'Somsak SOD Conflict',
    email: 'somsak@dopa.go.th',
    role: 'dpo',
    roles: ['dpo', 'approver'],
    department: 'ฝ่ายกฎหมายและบริหารจัดการ',
    mfaEnabled: true,
    sodWarnings: ['⚠️ SOD Violation: บัญชีนี้ถือสิทธิ์ DPO (เสนอความเห็น) ควบกับ Approver (ผู้อนุมัติ) สุ่มเสี่ยงต่อการขาดการคานอำนาจตามหลัก Four-Eyes Principle']
  },

  // Users for Revenue Department (org_rd)
  { id: 'usr_dpo_rd', orgId: 'org_rd', username: 'dpo.rd', fullNameTh: 'วิชัย ภาษีเจริญ (RD DPO)', fullNameEn: 'Wichai DPO RD', email: 'dpo@rd.go.th', role: 'dpo', roles: ['dpo'], department: 'สำนักกฎหมาย กรมสรรพากร', mfaEnabled: true },
  { id: 'usr_intake_rd', orgId: 'org_rd', username: 'intake.rd', fullNameTh: 'นภา รับแจ้ง (RD Intake)', fullNameEn: 'Napha Intake RD', email: 'intake@rd.go.th', role: 'intake', roles: ['intake'], department: 'ศูนย์บริการข้อมูลผู้เสียภาษี', mfaEnabled: true },

  // Users for Thai Tech Innovation Co., Ltd. (org_tech_th)
  { id: 'usr_intake_tech', orgId: 'org_tech_th', username: 'intake.tech', fullNameTh: 'พงศธร เทคโนโลยี (Tech Intake)', fullNameEn: 'Pongsatorn Intake Tech', email: 'intake@thaitech.co.th', role: 'intake', roles: ['intake'], department: 'แผนกบริการลูกค้า IT', mfaEnabled: true },
  { id: 'usr_dpo_tech', orgId: 'org_tech_th', username: 'dpo.tech', fullNameTh: 'ณัฐพงษ์ คุ้มครอง (Tech DPO)', fullNameEn: 'Nattapong DPO Tech', email: 'dpo@thaitech.co.th', role: 'dpo', roles: ['dpo'], department: 'สำนักการปฏิบัติตามกฎหมาย PDPA', mfaEnabled: true },
  { id: 'usr_approver_tech', orgId: 'org_tech_th', username: 'approver.tech', fullNameTh: 'เกียรติศักดิ์ บริหาร (Tech Exec)', fullNameEn: 'Kiattisak Exec Tech', email: 'exec@thaitech.co.th', role: 'approver', roles: ['approver'], department: 'คณะกรรมการบริหารด้านความปลอดภัย', mfaEnabled: true }
];

// Document Templates (Section 11)
export const initialDocumentTemplates: DocumentTemplate[] = [
  {
    id: 'temp_ack',
    nameTh: 'ใบรับคำขอเข้าถึงข้อมูลส่วนบุคคล',
    nameEn: 'PDPA Request Receipt Acknowledgement',
    subjectTemplate: 'ใบรับคำขอใช้สิทธิตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 เลขที่ {{trackingNo}}',
    bodyTemplate: 'เรียน คุณ {{requesterName}}\n\nองค์กรขอแจ้งให้ทราบว่าเราได้รับคำขอใช้สิทธิเข้าถึงและขอรับสำเนาข้อมูลส่วนบุคคลของท่านแล้วในวันที่ {{receivedDate}} ผ่านทางช่องทาง {{channel}} เรียบร้อยแล้ว ขณะนี้คำขอของท่านอยู่ระหว่างขั้นตอนการตรวจสอบความครบถ้วนของเอกสารหลักฐานยื่นยันตัวตน ภายในระยะเวลา 15 วันตามกฎหมายกำหนด\n\nเลขอ้างอิงติดตามคำขอของท่านคือ: {{trackingNo}}\nท่านสามารถติดตามสถานะการดำเนินการได้ที่พอร์ทัลสาธารณะ\n\nขอแสดงความนับถือ\n{{signerName}}\n{{signerPosition}}',
    version: '1.0',
    confidentialityLevel: 'NORMAL'
  },
  {
    id: 'temp_more_info',
    nameTh: 'หนังสือขอเอกสารเพิ่มเติม',
    nameEn: 'Request for Additional Evidence',
    subjectTemplate: 'แจ้งขอส่งเอกสารหลักฐานเพิ่มเติมสำหรับคำขอใช้สิทธิเข้าถึงข้อมูลส่วนบุคคล เลขที่ {{trackingNo}}',
    bodyTemplate: 'เรียน คุณ {{requesterName}}\n\nตามที่ท่านได้ยื่นคำขอใช้สิทธิตามมาตรา 30 เลขที่ {{trackingNo}} ลงวันที่ {{submissionDate}} นั้น จากการตรวจสอบความครบถ้วนเบื้องต้นพบว่า เอกสารและข้อมูลของท่านยังไม่ครบถ้วนตามหลักเกณฑ์ขององค์กร ดังต่อไปนี้:\n\n{{deficiencyDetails}}\n\nองค์กรขอความกรุณาจากท่านในการส่งเอกสารหลักฐานที่ถูกต้องเพิ่มเติมภายใน {{deficiencyDays}} วัน (ไม่เกินวันที่ {{deficiencyDeadline}}) โดยเข้าสู่ระบบและแนบเอกสารผ่านทางเมนูติดตามสถานะ\n\n*หมายเหตุ: ในระหว่างรอเอกสารเพิ่มเติม ระบบจะพักการนับระยะเวลา SLA ดำเนินงานขององค์กรชั่วคราว*\n\nขอแสดงความนับถือ\n{{signerName}}\n{{signerPosition}}',
    version: '1.0',
    confidentialityLevel: 'NORMAL'
  },
  {
    id: 'temp_extend',
    nameTh: 'หนังสือแจ้งขยายระยะเวลาดำเนินการ',
    nameEn: 'PDPA SLA Extension Notice',
    subjectTemplate: 'แจ้งขยายระยะเวลาดำเนินการคำขอเข้าถึงและรับสำเนาข้อมูลส่วนบุคคล เลขที่ {{trackingNo}}',
    bodyTemplate: 'เรียน คุณ {{requesterName}}\n\nตามที่ท่านได้ยื่นคำขอใช้สิทธิเข้าถึงและขอรับสำเนาข้อมูลส่วนบุคคล เลขที่ {{trackingNo}} ซึ่งอยู่ระหว่างดำเนินการนั้น\n\nเนื่องจากข้อมูลที่เกี่ยวข้องมีจำนวนมากและจัดเก็บในหลายระบบงาน ทำให้กระบวนการค้นหา รวบรวม และปกปิดข้อมูลของบุคคลอื่นมีความซับซ้อนอย่างยิ่ง องค์กรมีความจำเป็นต้องขอขยายระยะเวลาดำเนินการออกไปอีกเป็นเวลา {{extensionDays}} วัน นับจากวันครบกำหนดเดิม โดยวันครบกำหนดดำเนินการใหม่คือวันที่ {{newDeadline}}\n\nองค์กรขออภัยในความล่าช้ามา ณ ที่นี้\n\nขอแสดงความนับถือ\n{{signerName}}\n{{signerPosition}}',
    version: '1.0',
    confidentialityLevel: 'NORMAL'
  },
  {
    id: 'temp_fee',
    nameTh: 'หนังสือแจ้งค่าธรรมเนียม',
    nameEn: 'Notification of Fees Charged',
    subjectTemplate: 'แจ้งการอนุมัติสิทธิและเรียกชำระค่าธรรมเนียมการคัดสำเนาข้อมูล เลขที่ {{trackingNo}}',
    bodyTemplate: 'เรียน คุณ {{requesterName}}\n\nองค์กรยินดีที่จะดำเนินการจัดส่งสำเนาข้อมูลส่วนบุคคลตามสิทธิคำขอเลขที่ {{trackingNo}} ของท่าน โดยมีรายการคิดค่าธรรมเนียมตามประกาศผู้ควบคุมข้อมูลดังต่อไปนี้:\n\n{{feeDetails}}\nรวมเป็นเงินทั้งสิ้น: {{feeTotal}} บาท\n\nกรุณาดำเนินการชำระเงินตามช่องทางแนบ และอัปโหลดหลักฐานการโอนเงินเพื่อที่องค์กรจะได้ส่งมอบลิงก์หรือพัสดุบรรจุข้อมูลที่ปลอดภัยแก่ท่านต่อไป\n\nขอแสดงความนับถือ\n{{signerName}}\n{{signerPosition}}',
    version: '1.0',
    confidentialityLevel: 'NORMAL'
  },
  {
    id: 'temp_approve',
    nameTh: 'หนังสือแจ้งผลการอนุมัติและจัดส่งข้อมูล',
    nameEn: 'Notice of Request Approval & Safe Download',
    subjectTemplate: 'แจ้งผลการดำเนินการและส่งมอบข้อมูลส่วนบุคคล คำขอเลขที่ {{trackingNo}}',
    bodyTemplate: 'เรียน คุณ {{requesterName}}\n\nองค์กรได้พิจารณาอนุมัติการเข้าถึงข้อมูลตามสิทธิของท่านเรียบร้อยแล้ว รายละเอียดข้อมูลของท่านได้รับการตรวจสอบและส่งออกผ่านระบบการจัดส่งข้อมูลที่ปลอดภัยเป็นที่เรียบร้อย\n\nช่องทางดาวน์โหลดข้อมูลส่วนบุคคล (ใช้งานได้ {{downloadExpiryDays}} วัน):\nลิงก์: {{downloadLink}}\n\n*ข้อแนะนำในการเข้าถึงข้อมูล: ท่านต้องกรอกรหัสผ่านแบบใช้ครั้งเดียว (OTP) ที่จะส่งเข้ามือถือหรืออีเมลของท่านเมื่อกดลิงก์ก่อนเข้าหน้าดาวน์โหลด*\n\nขอแสดงความนับถือ\n{{signerName}}\n{{signerPosition}}',
    version: '1.0',
    confidentialityLevel: 'CONFIDENTIAL'
  },
  {
    id: 'temp_deny',
    nameTh: 'หนังสือแจ้งผลการปฏิเสธคำขอ',
    nameEn: 'Notice of Request Denial',
    subjectTemplate: 'แจ้งผลการปฏิเสธคำขอใช้สิทธิเข้าถึงข้อมูลส่วนบุคคล เลขที่ {{trackingNo}}',
    bodyTemplate: 'เรียน คุณ {{requesterName}}\n\nองค์กรขอแสดงความเสียใจในการแจ้งปฏิเสธคำขอใช้สิทธิในการเข้าถึงหรือขอรับสำเนาข้อมูลส่วนบุคคลของท่านสำหรับคำขอเลขที่ {{trackingNo}} ลงวันที่ {{submissionDate}} รายละเอียดการปฏิเสธมีดังนี้:\n\nรายละเอียด: {{denialReasonDetails}}\nฐานทางกฎหมายอ้างอิง: {{legalBasis}}\n\nหากท่านไม่เห็นด้วยกับคำสั่งปฏิเสธนี้ ท่านมีสิทธิร้องเรียนต่อคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.) ตามช่องทางที่ระบุไว้ในพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 ต่อไป\n\nขอแสดงความนับถือ\n{{signerName}}\n{{signerPosition}}',
    version: '1.0',
    confidentialityLevel: 'NORMAL'
  }
];

// Initial Data Sources in an Organization (Section 3.5)
export const initialDataSources = [
  { id: 'src_crm', name: 'ระบบบริหารความสัมพันธ์ลูกค้า (CRM)', description: 'ข้อมูลชื่อ-สกุล, ประวัติการซื้อสินค้า, ที่อยู่จัดส่ง, ประวัติคะแนนสะสม', owner: 'ฝ่ายการตลาดและลูกค้าสัมพันธ์' },
  { id: 'src_hr', name: 'ระบบทรัพยากรบุคคล (HRIS)', description: 'ข้อมูลพนักงาน, ประวัติการทำงาน, เงินเดือน, ประวัติสุขภาพ, สวัสดิการ', owner: 'ฝ่ายทรัพยากรบุคคล' },
  { id: 'src_cctv', name: 'กล้องวงจรปิดนิรภัย (CCTV)', description: 'ภาพบันทึกวิดีโอภายในอาคารสำนักงานและบริเวณโดยรอบ', owner: 'ฝ่ายดูแลอาคารและรักษาความปลอดภัย' },
  { id: 'src_call', name: 'ระบบบันทึกเสียง Call Center', description: 'ไฟล์เสียงและบันทึกประวัติการติดต่อทางโทรศัพท์ของลูกค้า', owner: 'ฝ่ายบริการลูกค้า' },
  { id: 'src_web', name: 'ระบบสมาชิกเว็บไซต์และ Mobile App', description: 'ล็อกการเข้าใช้ระบบ (Access Log), คุกกี้, การตั้งค่าความยินยอม (Consent Setting)', owner: 'ฝ่ายดิจิทัลเทคโนโลยี' }
];

// Seed Requests to showcase all workflows
export const seedRequests: Request[] = [
  {
    id: 'req_001',
    orgId: 'org_dopa',
    uuid: 'a8b3-e5d9-482a-ba5c-199f187a5522',
    trackingNo: 'REQ-2026-0001',
    requesterType: 'self',
    requester: {
      firstName: 'สมเกียรติ',
      lastName: 'รักไทย',
      idNumber: '1-1234-56789-01-2',
      email: 'somkiat.rakthai@example.com',
      phone: '081-234-5678',
      address: '99/9 ถ.พหลโยธิน แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900'
    },
    contactChannel: 'web',
    status: 'Ready for Delivery',
    submissionDate: '2026-07-02T10:00:00Z',
    receivedDate: '2026-07-02T11:00:00Z',
    completenessCheckedDate: '2026-07-03T09:00:00Z',
    slaStartDate: '2026-07-03T09:00:00Z',
    slaDeadlineDate: '2026-08-02T09:00:00Z',
    slaExtended: false,
    slaRemainingDays: 12, // assuming current date is around July 21
    slaDaysUsed: 18,
    slaPaused: false,
    slaEvents: [],
    statusHistory: [
      { status: 'Submitted', changedAt: '2026-07-02T10:00:00Z', changedBy: 'System (Public Form)' },
      { status: 'Received', changedAt: '2026-07-02T11:00:00Z', changedBy: 'intake.pdpa' },
      { status: 'Identity Verification', changedAt: '2026-07-02T11:15:00Z', changedBy: 'intake.pdpa' },
      { status: 'Completeness Review', changedAt: '2026-07-03T08:00:00Z', changedBy: 'intake.pdpa' },
      { status: 'Complete', changedAt: '2026-07-03T09:00:00Z', changedBy: 'intake.pdpa' },
      { status: 'Assigned', changedAt: '2026-07-03T10:00:00Z', changedBy: 'intake.pdpa' },
      { status: 'Data Collection', changedAt: '2026-07-03T10:10:00Z', changedBy: 'crm.owner' },
      { status: 'DPO or Legal Review', changedAt: '2026-07-15T14:00:00Z', changedBy: 'dpo.pdpa' },
      { status: 'Redaction Required', changedAt: '2026-07-16T10:00:00Z', changedBy: 'dpo.pdpa' },
      { status: 'Approval Pending', changedAt: '2026-07-18T11:00:00Z', changedBy: 'dpo.pdpa' },
      { status: 'Approved', changedAt: '2026-07-19T15:00:00Z', changedBy: 'exec.pdpa' },
      { status: 'Ready for Delivery', changedAt: '2026-07-20T09:00:00Z', changedBy: 'intake.pdpa' }
    ],
    identityVerification: {
      status: 'verified',
      assuranceLevel: 'medium',
      method: 'otp_email',
      verifiedBy: 'intake.pdpa',
      verifiedAt: '2026-07-02T11:15:00Z',
      notes: 'สอดคล้องกับอีเมลและเบอร์โทรที่บันทึกในระบบสมาชิก'
    },
    requestDetails: {
      requestType: 'copy',
      description: 'ต้องการขอรับสำเนาประวัติการใช้บริการและการให้ความยินยอมคุกกี้ที่บันทึกในบัญชีสมาชิกของผมทั้งหมดครับ',
      targetSystems: ['ระบบสมาชิกเว็บไซต์และ Mobile App', 'ระบบบริหารความสัมพันธ์ลูกค้า (CRM)'],
      timeframeStart: '2025-01-01',
      timeframeEnd: '2026-06-30',
      deliveryMethod: 'secure_download'
    },
    attachments: [
      { id: 'att_001_id', name: 'citizen_card_somkiat.jpg', size: 145000, type: 'image/jpeg', isMasked: true, watermarkApplied: true, uploadedAt: '2026-07-02T10:00:00Z', fileUrl: 'mock_card_somkiat_watermarked' }
    ],
    dataCollectionTasks: [
      {
        id: 'task_001_crm',
        systemName: 'ระบบบริหารความสัมพันธ์ลูกค้า (CRM)',
        assignee: 'ธนาธร ระบบลูกค้า',
        status: 'found',
        completedAt: '2026-07-10T09:00:00Z',
        completedBy: 'crm.owner',
        resultsDescription: 'ส่งออกรายงานข้อมูลลูกค้าและการสั่งซื้อของ นายสมเกียรติ รักไทย ในช่วงปี 2025 - 2026 เรียบร้อยแล้ว',
        uploadedFiles: [
          { id: 'att_crm_data', name: 'CRM_Customer_Report_Somkiat.xlsx', size: 48000, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', isMasked: false, watermarkApplied: false, uploadedAt: '2026-07-10T09:00:00Z', fileUrl: 'mock_crm_report_somkiat' }
        ],
        queryUsed: 'SELECT * FROM customers WHERE email = "somkiat.rakthai@example.com"',
        dataLineage: 'Database CRM -> Table: customers -> Export Utility'
      }
    ],
    redactionRecords: [
      {
        id: 'red_001',
        itemId: 'att_crm_data',
        itemRedacted: 'คอลัมน์ชื่อและเบอร์โทรศัพท์ของผู้แนะนำสินค้า (บุคคลอื่น)',
        reason: 'ปกปิดข้อมูลบุคคลที่สามที่ไม่มีส่วนได้รับสิทธิ',
        operator: 'dpo.pdpa',
        timestamp: '2026-07-16T10:30:00Z',
        previewUrlBefore: 'crm_original_view',
        previewUrlAfter: 'crm_redacted_view'
      }
    ],
    decision: {
      result: 'approved',
      reasons: ['เป็นข้อมูลส่วนบุคคลของเจ้าของสิทธิโดยแท้จริง', 'ไม่มีผลกระทบต่อสิทธิเสรีภาพผู้อื่น'],
      legalBasisText: 'มาตรา 30 วรรคหนึ่ง แห่งพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562',
      dpoRecommendation: 'เสนออนุมัติเปิดเผยข้อมูลตามคำขอ โดยปกปิดคอลัมน์ผู้ติดต่อบุคคลอื่นเรียบร้อยแล้ว',
      dpoCheckedAt: '2026-07-18T11:00:00Z',
      dpoName: 'สุรพงษ์ ยุติธรรม',
      approverOpinion: 'อนุมัติให้ส่งมอบข้อมูลที่ผ่านการปกปิดตามคำแนะนำของ DPO ได้',
      approvedAt: '2026-07-19T15:00:00Z',
      approverName: 'ดร. ประภาส อนุมัติศักดิ์'
    },
    feeCalculation: {
      noFee: true, // Secure digital download has no extra costs
      paperPages: 0,
      computerPages: 0,
      certificationsCount: 0,
      otherCosts: [],
      totalCalculated: 0,
      isApproved: true,
      paymentStatus: 'waived'
    },
    messageThread: [
      { id: 'msg_1', sender: 'staff', senderName: 'กิตติพงษ์ รับเรื่อง', message: 'สวัสดีครับคำขอรับข้อมูลได้รับการอนุมัติแล้ว อยู่ระหว่างการเข้ารหัสไฟล์เพื่อส่งมอบครับ', timestamp: '2026-07-20T09:00:00Z' }
    ],
    legalHold: false,
    retentionExpiryDate: '2028-07-20T09:00:00Z'
  },
  {
    id: 'req_002',
    orgId: 'org_dopa',
    uuid: 'f2d8-9c12-32b0-90fe-87f54c12bb9a',
    trackingNo: 'REQ-2026-0002',
    requesterType: 'self',
    requester: {
      firstName: 'วันดี',
      lastName: 'มีสุข',
      idNumber: '3-9999-00123-45-6',
      email: 'wandee.meesook@example.com',
      phone: '089-999-8888',
      address: '123 ซอยอ่อนนุช 44 แขวงสวนหลวง เขตสวนหลวง กรุงเทพฯ 10250'
    },
    contactChannel: 'web',
    status: 'Awaiting Additional Information',
    submissionDate: '2026-07-15T14:30:00Z',
    receivedDate: '2026-07-15T15:00:00Z',
    completenessCheckedDate: '2026-07-16T11:00:00Z',
    slaStartDate: '2026-07-15T15:00:00Z',
    slaDeadlineDate: '2026-08-14T15:00:00Z',
    slaExtended: false,
    slaRemainingDays: 24,
    slaDaysUsed: 1, // Only counted 1 day before pause
    slaPaused: true,
    slaPausedAt: '2026-07-16T11:00:00Z',
    slaEvents: [
      { id: 'sla_evt_p1', type: 'pause', timestamp: '2026-07-16T11:00:00Z', reason: 'เอกสารแสดงตัวตนไม่ชัดเจน (รูปถ่ายบัตรประชาชนขาดความคมชัด อ่านรายละเอียดวันหมดอายุไม่ได้)', operator: 'intake.pdpa' }
    ],
    statusHistory: [
      { status: 'Submitted', changedAt: '2026-07-15T14:30:00Z', changedBy: 'System (Public Form)' },
      { status: 'Received', changedAt: '2026-07-15T15:00:00Z', changedBy: 'intake.pdpa' },
      { status: 'Completeness Review', changedAt: '2026-07-16T10:00:00Z', changedBy: 'intake.pdpa' },
      { status: 'Awaiting Additional Information', changedAt: '2026-07-16T11:00:00Z', changedBy: 'intake.pdpa', comment: 'ขอส่งภาพถ่ายบัตรประชาชนใหม่ที่ชัดเจน เนื่องจากบัตรเก่าอัปโหลดมีเงาสะท้อนทับตัวหนังสือ' }
    ],
    identityVerification: {
      status: 'pending',
      assuranceLevel: 'low',
      method: 'document_check'
    },
    requestDetails: {
      requestType: 'access',
      description: 'ขอตรวจค้นข้อมูลบันทึกประวัติการขอลางานและการประเมินผลงานย้อนหลังของฉันที่อยู่ในฐานข้อมูลฝ่ายบุคคลค่ะ',
      targetSystems: ['ระบบทรัพยากรบุคคล (HRIS)'],
      deliveryMethod: 'pickup'
    },
    attachments: [
      { id: 'att_002_id', name: 'bad_card_wandee.png', size: 230000, type: 'image/png', isMasked: false, watermarkApplied: false, uploadedAt: '2026-07-15T14:30:00Z', fileUrl: 'bad_card_wandee_preview' }
    ],
    dataCollectionTasks: [],
    redactionRecords: [],
    feeCalculation: {
      noFee: true,
      paperPages: 0,
      computerPages: 0,
      certificationsCount: 0,
      otherCosts: [],
      totalCalculated: 0,
      isApproved: false,
      paymentStatus: 'pending'
    },
    messageThread: [
      { id: 'msg_2_1', sender: 'staff', senderName: 'กิตติพงษ์ รับเรื่อง', message: 'คุณวันดีครับ รบกวนอัปโหลดภาพถ่ายบัตรประชาชนใหม่อีกครั้งนะครับ เนื่องจากไฟล์แรกที่อัปโหลดมามีส่วนที่สะท้อนแสงจนทำให้อ่านรหัสหลังบัตรและข้อมูลที่อยู่ไม่ได้ครับ ขอบพระคุณครับ', timestamp: '2026-07-16T11:05:00Z' }
    ],
    legalHold: false
  },
  {
    id: 'req_003',
    orgId: 'org_dopa',
    uuid: 'd7a1-8b43-221d-cc4f-5612f00a98b4',
    trackingNo: 'REQ-2026-0003',
    requesterType: 'representative',
    requester: {
      firstName: 'ประหยัด',
      lastName: 'ซื่อสัตย์',
      idNumber: '3-1002-00445-66-7',
      email: 'prayad.su@example.com',
      phone: '085-555-4433',
      address: '77/1 ถ.งามวงศ์วาน แขวงลาดยาว เขตจตุจักร กรุงเทพฯ 10900'
    },
    representative: {
      firstName: 'วีระ',
      lastName: 'ภักดี',
      idNumber: '3-1205-00332-11-2',
      email: 'weera.rep@example.com',
      phone: '082-111-2222',
      address: '90 ถ.ติวานนท์ อ.เมือง จ.นนทบุรี 11000',
      scopeOfAuthority: 'การยื่นขอใช้สิทธิดึงประวัติการจองและชำระค่าบริการแทนในกรณีขอย้ายถิ่นฐาน',
      validFrom: '2026-07-01',
      validTo: '2026-08-31'
    },
    contactChannel: 'web',
    status: 'Submitted',
    submissionDate: '2026-07-21T07:20:00Z',
    slaRemainingDays: 30,
    slaDaysUsed: 0,
    slaPaused: false,
    slaExtended: false,
    slaEvents: [],
    statusHistory: [
      { status: 'Submitted', changedAt: '2026-07-21T07:20:00Z', changedBy: 'System (Public Form)' }
    ],
    identityVerification: {
      status: 'pending',
      assuranceLevel: 'low',
      method: 'document_check'
    },
    requestDetails: {
      requestType: 'access_and_copy',
      description: 'ยื่นคำขอแทนคุณประหยัด ซื่อสัตย์ เพื่อขอรับรายงานบันทึกประวัติทางการเงินและการใช้บริการตลอดเวลาที่เป็นสมาชิก',
      targetSystems: ['ระบบลูกค้าสัมพันธ์ (CRM)', 'ระบบการเงิน'],
      deliveryMethod: 'secure_download'
    },
    attachments: [
      { id: 'att_003_id_owner', name: 'owner_id_card.png', size: 198000, type: 'image/png', isMasked: true, watermarkApplied: true, uploadedAt: '2026-07-21T07:20:00Z', fileUrl: 'owner_card_url' },
      { id: 'att_003_id_rep', name: 'rep_id_card.png', size: 182000, type: 'image/png', isMasked: true, watermarkApplied: true, uploadedAt: '2026-07-21T07:20:00Z', fileUrl: 'rep_card_url' },
      { id: 'att_003_power', name: 'power_of_attorney.pdf', size: 1200000, type: 'application/pdf', isMasked: false, watermarkApplied: false, uploadedAt: '2026-07-21T07:20:00Z', fileUrl: 'poa_file_url' }
    ],
    dataCollectionTasks: [],
    redactionRecords: [],
    feeCalculation: {
      noFee: true,
      paperPages: 0,
      computerPages: 0,
      certificationsCount: 0,
      otherCosts: [],
      totalCalculated: 0,
      isApproved: false,
      paymentStatus: 'pending'
    },
    messageThread: [],
    legalHold: false
  },
  {
    id: 'req_004',
    orgId: 'org_rd',
    uuid: 'b9e3-28ad-11cf-da43-bc0032fd98ba',
    trackingNo: 'REQ-2026-0004',
    requesterType: 'self',
    requester: {
      firstName: 'นารี',
      lastName: 'อ่อนหวาน',
      idNumber: '3-1102-00998-21-2',
      email: 'naree.o@example.com',
      phone: '084-332-1100',
      address: '254 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110'
    },
    contactChannel: 'web',
    status: 'Data Collection',
    submissionDate: '2026-07-10T09:00:00Z',
    receivedDate: '2026-07-10T10:00:00Z',
    completenessCheckedDate: '2026-07-11T13:00:00Z',
    slaStartDate: '2026-07-11T13:00:00Z',
    slaDeadlineDate: '2026-08-10T13:00:00Z',
    slaRemainingDays: 20,
    slaDaysUsed: 10,
    slaPaused: false,
    slaExtended: false,
    slaEvents: [],
    statusHistory: [
      { status: 'Submitted', changedAt: '2026-07-10T09:00:00Z', changedBy: 'System (Public Form)' },
      { status: 'Received', changedAt: '2026-07-10T10:00:00Z', changedBy: 'intake.pdpa' },
      { status: 'Identity Verification', changedAt: '2026-07-10T11:00:00Z', changedBy: 'intake.pdpa' },
      { status: 'Completeness Review', changedAt: '2026-07-11T12:00:00Z', changedBy: 'intake.pdpa' },
      { status: 'Complete', changedAt: '2026-07-11T13:00:00Z', changedBy: 'intake.pdpa' },
      { status: 'Assigned', changedAt: '2026-07-12T09:00:00Z', changedBy: 'intake.pdpa' },
      { status: 'Data Collection', changedAt: '2026-07-12T10:00:00Z', changedBy: 'intake.pdpa' }
    ],
    identityVerification: {
      status: 'verified',
      assuranceLevel: 'medium',
      method: 'document_check',
      verifiedBy: 'intake.pdpa',
      verifiedAt: '2026-07-10T11:00:00Z'
    },
    requestDetails: {
      requestType: 'access_and_copy',
      description: 'ต้องการขอหลักฐานการบันทึกภาพของกล้องวงจรปิด CCTV บริเวณประตูด้านหน้าของตึก A ในวันที่ 8 กรกฎาคม 2026 ระหว่างเวลา 17.30 - 18.00 น. เนื่องจากมีของมีค่าหล่นหายและต้องการสืบหาข้อมูลค่ะ',
      targetSystems: ['กล้องวงจรปิดนิรภัย (CCTV)'],
      deliveryMethod: 'secure_download'
    },
    attachments: [
      { id: 'att_004_id', name: 'naree_card.jpg', size: 167000, type: 'image/jpeg', isMasked: true, watermarkApplied: true, uploadedAt: '2026-07-10T09:00:00Z', fileUrl: 'naree_card_url' }
    ],
    dataCollectionTasks: [
      {
        id: 'task_004_cctv',
        systemName: 'กล้องวงจรปิดนิรภัย (CCTV)',
        assignee: 'ฝ่ายดูแลอาคารและรักษาความปลอดภัย',
        status: 'in_progress',
        uploadedFiles: [],
        queryUsed: 'CCTV Gate A, 2026-07-08 [17:30 - 18:00]'
      }
    ],
    redactionRecords: [],
    feeCalculation: {
      noFee: true,
      paperPages: 0,
      computerPages: 0,
      certificationsCount: 0,
      otherCosts: [],
      totalCalculated: 0,
      isApproved: false,
      paymentStatus: 'pending'
    },
    messageThread: [],
    legalHold: false
  },
  {
    id: 'req_008',
    orgId: 'org_tech_th',
    uuid: 'c008-2026-tech-9988-776655443322',
    trackingNo: 'REQ-2026-0008',
    requesterType: 'self',
    requester: {
      firstName: 'ฟกดฟกด',
      lastName: 'ฟกดฟกดอฟ',
      idNumber: '1-1005-00123-45-6',
      email: 'unotify.utopia@gmail.com',
      phone: '089-888-7766',
      address: '123/45 ถ.วิภาวดีรังสิต แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900'
    },
    contactChannel: 'web',
    status: 'Awaiting Additional Information',
    submissionDate: '2026-07-22T22:39:00Z',
    receivedDate: '2026-07-23T09:37:00Z',
    completenessCheckedDate: '2026-07-23T09:37:00Z',
    slaStartDate: '2026-07-23T09:37:00Z',
    slaDeadlineDate: '2026-08-22T09:37:00Z',
    slaRemainingDays: 30,
    slaDaysUsed: 0,
    slaPaused: true,
    slaPausedAt: '2026-07-23T10:29:00Z',
    slaExtended: false,
    slaEvents: [
      { id: 'sla_evt_008_p1', type: 'pause', timestamp: '2026-07-23T10:29:00Z', reason: 'เอกสารหลักฐานขาดความสมบูรณ์: ขอเอกสารเพิ่มเติมสำหรับ เอกสารยืนยันตัวตน / สำเนาบัตรประชาชนที่ชัดเจน. ไม่พบเอกสารบัตรประจำตัวประชาชน', operator: 'intake.tech' }
    ],
    statusHistory: [
      { status: 'Submitted', changedAt: '2026-07-22T22:39:00Z', changedBy: 'System (Public Portal)' },
      { status: 'Received', changedAt: '2026-07-23T09:37:00Z', changedBy: 'พงศธร เทคโนโลยี (Tech Intake)', comment: 'ตรวจสอบเอกสารครบถ้วนเรียบร้อย เริ่มนับระยะเวลาดำเนินการ SLA' },
      { status: 'Awaiting Additional Information', changedAt: '2026-07-23T10:29:00Z', changedBy: 'พงศธร เทคโนโลยี (Tech Intake)', comment: 'เอกสารหลักฐานขาดความสมบูรณ์: ขอเอกสารเพิ่มเติมสำหรับ เอกสารยืนยันตัวตน / สำเนาบัตรประชาชนที่ชัดเจน. ไม่พบเอกสารบัตรประจำตัวประชาชน' }
    ],
    identityVerification: {
      status: 'pending',
      assuranceLevel: 'low',
      method: 'document_check'
    },
    requestDetails: {
      requestType: 'access_and_copy',
      description: 'ขอสืบค้นและคัดสำเนาภาพบันทึกวิดีโอกล้องวงจรปิด CCTV',
      targetSystems: ['ภาพบันทึกจากกล้องวงจรปิดนิรภัย (CCTV Footage)'],
      timeframeStart: '2026-07-01',
      timeframeEnd: '2026-07-22',
      deliveryMethod: 'secure_download'
    },
    attachments: [
      { id: 'att_008_sig', name: 'signature_e_sign.png', size: 8192, type: 'image/png', isMasked: false, watermarkApplied: false, uploadedAt: '2026-07-22T22:39:00Z', fileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' }
    ],
    dataCollectionTasks: [],
    redactionRecords: [],
    feeCalculation: {
      noFee: true,
      paperPages: 0,
      computerPages: 0,
      certificationsCount: 0,
      otherCosts: [],
      totalCalculated: 0,
      isApproved: false,
      paymentStatus: 'pending'
    },
    messageThread: [
      { id: 'msg_008_1', sender: 'user', senderName: 'ฟกดฟกด ฟกดฟกดอฟ', message: 'ทดสอบการส่งข้อความ', timestamp: '2026-07-23T09:06:14Z' },
      { id: 'msg_008_2', sender: 'staff', senderName: 'พงศธร เทคโนโลยี (Tech Intake)', message: 'เรียน คุณ ฟกดฟกด องค์กรขอรับหลักฐานเพิ่มเติมเนื่องจากเอกสารหลักฐานตรวจสอบความสมบูรณ์ไม่ผ่าน คือ: เอกสารยืนยันตัวตน / สำเนาบัตรประชาชนที่ชัดเจน กรุณาอัปโหลดเอกสารใหม่เพิ่มเติมเข้าระบบในหน้าติดตามสถานะ', timestamp: '2026-07-23T10:29:08Z' }
    ],
    legalHold: false
  },
  {
    id: 'req_tech_008',
    orgId: 'org_tech_th',
    uuid: 'c008-2026-tech-9988-776655443323',
    trackingNo: 'REQ-TECH-2026-0008',
    requesterType: 'self',
    requester: {
      firstName: 'ฟกดฟกด',
      lastName: 'ฟกดฟกดอฟ',
      idNumber: '1-1005-00123-45-6',
      email: 'unotify.utopia@gmail.com',
      phone: '089-888-7766',
      address: '123/45 ถ.วิภาวดีรังสิต แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900'
    },
    contactChannel: 'web',
    status: 'Awaiting Additional Information',
    submissionDate: '2026-07-22T22:39:00Z',
    receivedDate: '2026-07-23T09:37:00Z',
    completenessCheckedDate: '2026-07-23T09:37:00Z',
    slaStartDate: '2026-07-23T09:37:00Z',
    slaDeadlineDate: '2026-08-22T09:37:00Z',
    slaRemainingDays: 30,
    slaDaysUsed: 0,
    slaPaused: true,
    slaPausedAt: '2026-07-23T10:29:00Z',
    slaExtended: false,
    slaEvents: [
      { id: 'sla_evt_t008_p1', type: 'pause', timestamp: '2026-07-23T10:29:00Z', reason: 'เอกสารหลักฐานขาดความสมบูรณ์: ขอเอกสารเพิ่มเติมสำหรับ เอกสารยืนยันตัวตน / สำเนาบัตรประชาชนที่ชัดเจน. ไม่พบเอกสารบัตรประจำตัวประชาชน', operator: 'intake.tech' }
    ],
    statusHistory: [
      { status: 'Submitted', changedAt: '2026-07-22T22:39:00Z', changedBy: 'System (Public Portal)' },
      { status: 'Received', changedAt: '2026-07-23T09:37:00Z', changedBy: 'พงศธร เทคโนโลยี (Tech Intake)', comment: 'ตรวจสอบเอกสารครบถ้วนเรียบร้อย เริ่มนับระยะเวลาดำเนินการ SLA' },
      { status: 'Awaiting Additional Information', changedAt: '2026-07-23T10:29:00Z', changedBy: 'พงศธร เทคโนโลยี (Tech Intake)', comment: 'เอกสารหลักฐานขาดความสมบูรณ์: ขอเอกสารเพิ่มเติมสำหรับ เอกสารยืนยันตัวตน / สำเนาบัตรประชาชนที่ชัดเจน. ไม่พบเอกสารบัตรประจำตัวประชาชน' }
    ],
    identityVerification: {
      status: 'pending',
      assuranceLevel: 'low',
      method: 'document_check'
    },
    requestDetails: {
      requestType: 'access_and_copy',
      description: 'ขอสืบค้นและคัดสำเนาภาพบันทึกวิดีโอกล้องวงจรปิด CCTV',
      targetSystems: ['ภาพบันทึกจากกล้องวงจรปิดนิรภัย (CCTV Footage)'],
      timeframeStart: '2026-07-01',
      timeframeEnd: '2026-07-22',
      deliveryMethod: 'secure_download'
    },
    attachments: [
      { id: 'att_t008_sig', name: 'signature_e_sign.png', size: 8192, type: 'image/png', isMasked: false, watermarkApplied: false, uploadedAt: '2026-07-22T22:39:00Z', fileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' }
    ],
    dataCollectionTasks: [],
    redactionRecords: [],
    feeCalculation: {
      noFee: true,
      paperPages: 0,
      computerPages: 0,
      certificationsCount: 0,
      otherCosts: [],
      totalCalculated: 0,
      isApproved: false,
      paymentStatus: 'pending'
    },
    messageThread: [
      { id: 'msg_t008_1', sender: 'user', senderName: 'ฟกดฟกด ฟกดฟกดอฟ', message: 'ทดสอบการส่งข้อความ', timestamp: '2026-07-23T09:06:14Z' },
      { id: 'msg_t008_2', sender: 'staff', senderName: 'พงศธร เทคโนโลยี (Tech Intake)', message: 'เรียน คุณ ฟกดฟกด องค์กรขอรับหลักฐานเพิ่มเติมเนื่องจากเอกสารหลักฐานตรวจสอบความสมบูรณ์ไม่ผ่าน คือ: เอกสารยืนยันตัวตน / สำเนาบัตรประชาชนที่ชัดเจน กรุณาอัปโหลดเอกสารใหม่เพิ่มเติมเข้าระบบในหน้าติดตามสถานะ', timestamp: '2026-07-23T10:29:08Z' }
    ],
    legalHold: false
  },
  {
    id: 'req_dopa_008',
    orgId: 'org_dopa',
    uuid: 'c008-2026-dopa-9988-776655443324',
    trackingNo: 'REQ-DOPA-2026-0008',
    requesterType: 'self',
    requester: {
      firstName: 'ฟกดฟกด',
      lastName: 'ฟกดฟกดอฟ',
      idNumber: '1-1005-00123-45-6',
      email: 'unotify.utopia@gmail.com',
      phone: '089-888-7766',
      address: '123/45 ถ.วิภาวดีรังสิต แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900'
    },
    contactChannel: 'web',
    status: 'Awaiting Additional Information',
    submissionDate: '2026-07-22T22:39:00Z',
    receivedDate: '2026-07-23T09:37:00Z',
    completenessCheckedDate: '2026-07-23T09:37:00Z',
    slaStartDate: '2026-07-23T09:37:00Z',
    slaDeadlineDate: '2026-08-22T09:37:00Z',
    slaRemainingDays: 30,
    slaDaysUsed: 0,
    slaPaused: true,
    slaPausedAt: '2026-07-23T10:29:00Z',
    slaExtended: false,
    slaEvents: [
      { id: 'sla_evt_d008_p1', type: 'pause', timestamp: '2026-07-23T10:29:00Z', reason: 'เอกสารหลักฐานขาดความสมบูรณ์: ขอเอกสารเพิ่มเติมสำหรับ เอกสารยืนยันตัวตน / สำเนาบัตรประชาชนที่ชัดเจน. ไม่พบเอกสารบัตรประจำตัวประชาชน', operator: 'intake.pdpa' }
    ],
    statusHistory: [
      { status: 'Submitted', changedAt: '2026-07-22T22:39:00Z', changedBy: 'System (Public Portal)' },
      { status: 'Received', changedAt: '2026-07-23T09:37:00Z', changedBy: 'กิตติพงษ์ รับเรื่อง (DOPA Intake)', comment: 'ตรวจสอบเอกสารครบถ้วนเรียบร้อย เริ่มนับระยะเวลาดำเนินการ SLA' },
      { status: 'Awaiting Additional Information', changedAt: '2026-07-23T10:29:00Z', changedBy: 'กิตติพงษ์ รับเรื่อง (DOPA Intake)', comment: 'เอกสารหลักฐานขาดความสมบูรณ์: ขอเอกสารเพิ่มเติมสำหรับ เอกสารยืนยันตัวตน / สำเนาบัตรประชาชนที่ชัดเจน. ไม่พบเอกสารบัตรประจำตัวประชาชน' }
    ],
    identityVerification: {
      status: 'pending',
      assuranceLevel: 'low',
      method: 'document_check'
    },
    requestDetails: {
      requestType: 'access_and_copy',
      description: 'ขอสืบค้นและคัดสำเนาภาพบันทึกวิดีโอกล้องวงจรปิด CCTV',
      targetSystems: ['ภาพบันทึกจากกล้องวงจรปิดนิรภัย (CCTV Footage)'],
      timeframeStart: '2026-07-01',
      timeframeEnd: '2026-07-22',
      deliveryMethod: 'secure_download'
    },
    attachments: [
      { id: 'att_d008_sig', name: 'signature_e_sign.png', size: 8192, type: 'image/png', isMasked: false, watermarkApplied: false, uploadedAt: '2026-07-22T22:39:00Z', fileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' }
    ],
    dataCollectionTasks: [],
    redactionRecords: [],
    feeCalculation: {
      noFee: true,
      paperPages: 0,
      computerPages: 0,
      certificationsCount: 0,
      otherCosts: [],
      totalCalculated: 0,
      isApproved: false,
      paymentStatus: 'pending'
    },
    messageThread: [
      { id: 'msg_d008_1', sender: 'user', senderName: 'ฟกดฟกด ฟกดฟกดอฟ', message: 'ทดสอบการส่งข้อความ', timestamp: '2026-07-23T09:06:14Z' },
      { id: 'msg_d008_2', sender: 'staff', senderName: 'กิตติพงษ์ รับเรื่อง (DOPA Intake)', message: 'เรียน คุณ ฟกดฟกด องค์กรขอรับหลักฐานเพิ่มเติมเนื่องจากเอกสารหลักฐานตรวจสอบความสมบูรณ์ไม่ผ่าน คือ: เอกสารยืนยันตัวตน / สำเนาบัตรประชาชนที่ชัดเจน กรุณาอัปโหลดเอกสารใหม่เพิ่มเติมเข้าระบบในหน้าติดตามสถานะ', timestamp: '2026-07-23T10:29:08Z' }
    ],
    legalHold: false
  }
];

export const initialAuditLogs = [
  { id: 'log_001', orgId: 'org_dopa', timestamp: '2026-07-02T10:00:00Z', actorId: 'system', actorName: 'ระบบพอร์ทัลสาธารณะ', actorRole: 'system', action: 'SUBMIT_REQUEST', requestId: 'req_001', requestTrackingNo: 'REQ-2026-0001', ipAddress: '171.96.220.45', userAgent: 'Mozilla/5.0 Chrome/120.0', details: 'ผู้ยื่นส่งคำขอสิทธิประเภทเจ้าของข้อมูลยื่นเอง ทางพอร์ทัลออนไลน์', checksum: 'a1b2c3d4e5f6' },
  { id: 'log_002', orgId: 'org_dopa', timestamp: '2026-07-02T11:00:00Z', actorId: 'usr_intake', actorName: 'กิตติพงษ์ รับเรื่อง', actorRole: 'intake', action: 'UPDATE_STATUS', requestId: 'req_001', requestTrackingNo: 'REQ-2026-0001', ipAddress: '192.168.10.22', userAgent: 'Mozilla/5.0 Edge/120.0', details: 'เปลี่ยนสถานะจาก Submitted เป็น Received', checksum: 'b2c3d4e5f6g7' },
  { id: 'log_003', orgId: 'org_dopa', timestamp: '2026-07-02T11:15:00Z', actorId: 'usr_intake', actorName: 'กิตติพงษ์ รับเรื่อง', actorRole: 'intake', action: 'VERIFY_IDENTITY', requestId: 'req_001', requestTrackingNo: 'REQ-2026-0001', ipAddress: '192.168.10.22', userAgent: 'Mozilla/5.0 Edge/120.0', details: 'ยืนยันตัวตนระดับ Medium Assurance ด้วยวิธีตรวจสอบเอกสารบัตรประจำตัว', checksum: 'c3d4e5f6g7h8' },
  { id: 'log_004', orgId: 'org_dopa', timestamp: '2026-07-03T09:00:00Z', actorId: 'usr_intake', actorName: 'กิตติพงษ์ รับเรื่อง', actorRole: 'intake', action: 'REVIEW_COMPLETENESS', requestId: 'req_001', requestTrackingNo: 'REQ-2026-0001', ipAddress: '192.168.10.22', userAgent: 'Mozilla/5.0 Edge/120.0', details: 'ทำเช็คลิสต์ตรวจเอกสารผ่านสมบูรณ์, เริ่มวันดำเนินการ SLA', checksum: 'd4e5f6g7h8i9' },
  { id: 'log_005', orgId: 'org_dopa', timestamp: '2026-07-03T10:10:00Z', actorId: 'usr_intake', actorName: 'กิตติพงษ์ รับเรื่อง', actorRole: 'intake', action: 'CREATE_DATA_TASK', requestId: 'req_001', requestTrackingNo: 'REQ-2026-0001', ipAddress: '192.168.10.22', userAgent: 'Mozilla/5.0 Edge/120.0', details: 'มอบหมายภารกิจค้นหาข้อมูลไปที่ ระบบบริหารความสัมพันธ์ลูกค้า (CRM) ผู้รับผิดชอบ ธนาธร ระบบลูกค้า', checksum: 'e5f6g7h8i9j0' },
  { id: 'log_006', orgId: 'org_dopa', timestamp: '2026-07-10T09:02:00Z', actorId: 'usr_owner_crm', actorName: 'ธนาธร ระบบลูกค้า', actorRole: 'owner', action: 'UPLOAD_SEARCH_RESULT', requestId: 'req_001', requestTrackingNo: 'REQ-2026-0001', ipAddress: '192.168.12.140', userAgent: 'Mozilla/5.0 Chrome/120.0', details: 'อัปโหลดรายงานผลการสืบค้น CRM_Customer_Report_Somkiat.xlsx พร้อมระบุสืบค้นด้วยคำค้น email = somkiat.rakthai@example.com', checksum: 'f6g7h8i9j0k1' },
  { id: 'log_007', orgId: 'org_dopa', timestamp: '2026-07-15T14:02:00Z', actorId: 'usr_dpo', actorName: 'สุรพงษ์ ยุติธรรม', actorRole: 'dpo', action: 'VIEW_FILE', requestId: 'req_001', requestTrackingNo: 'REQ-2026-0001', ipAddress: '192.168.10.5', userAgent: 'Mozilla/5.0 Firefox/121.0', details: 'เปิดเข้าดูไฟล์ข้อมูลสืบค้น CRM_Customer_Report_Somkiat.xlsx เพื่อทำการประเมินทางกฎหมาย', checksum: 'g7h8i9j0k1l2' },
  { id: 'log_008', orgId: 'org_dopa', timestamp: '2026-07-16T10:35:00Z', actorId: 'usr_dpo', actorName: 'สุรพงษ์ ยุติธรรม', actorRole: 'dpo', action: 'REDACT_DOCUMENT', requestId: 'req_001', requestTrackingNo: 'REQ-2026-0001', ipAddress: '192.168.10.5', userAgent: 'Mozilla/5.0 Firefox/121.0', details: 'บันทึกการเซนเซอร์ (Redaction) คอลัมน์ชื่อและเบอร์โทรบุคคลอื่น ด้วยเหตุผล ปกปิดข้อมูลบุคคลที่สามที่ไม่มีส่วนได้รับสิทธิ', checksum: 'h7h8i9j0k1l3' },
  { id: 'log_009', orgId: 'org_dopa', timestamp: '2026-07-18T11:05:00Z', actorId: 'usr_dpo', actorName: 'สุรพงษ์ ยุติธรรม', actorRole: 'dpo', action: 'SUBMIT_DECISION_PROPOSAL', requestId: 'req_001', requestTrackingNo: 'REQ-2026-0001', ipAddress: '192.168.10.5', userAgent: 'Mozilla/5.0 Firefox/121.0', details: 'ส่งความเห็นทางกฎหมายเสนอผู้อนุมัติ อนุมัติการเผยข้อมูลแบบเปิดเผยบางส่วน (ปกปิดข้อมูลบุคคลที่สาม)', checksum: 'i7h8i9j0k1l4' },
  { id: 'log_010', orgId: 'org_dopa', timestamp: '2026-07-19T15:00:00Z', actorId: 'usr_approver', actorName: 'ดร. ประภาส อนุมัติศักดิ์', actorRole: 'approver', action: 'APPROVE_DECISION', requestId: 'req_001', requestTrackingNo: 'REQ-2026-0001', ipAddress: '192.168.10.2', userAgent: 'Mozilla/5.0 Safari/120.0', details: 'อนุมัติการเปิดเผยข้อมูลตามสิทธิ โดยลงนามอิเล็กทรอนิกส์กำกับใบอนุญาต', checksum: 'j7h8i9j0k1l5' },
  { id: 'log_011', orgId: 'org_dopa', timestamp: '2026-07-20T09:05:00Z', actorId: 'usr_intake', actorName: 'กิตติพงษ์ รับเรื่อง', actorRole: 'intake', action: 'GENERATE_DOCUMENT', requestId: 'req_001', requestTrackingNo: 'REQ-2026-0001', ipAddress: '192.168.10.22', userAgent: 'Mozilla/5.0 Edge/120.0', details: 'สร้างหนังสือทางการไทยใบแจ้งสิทธิและจัดส่งข้อมูล (Template: temp_approve)', checksum: 'k7h8i9j0k1l6' }
];
