// services/pdf.service.js
// ERPNext-inspired PDF Generation Service Module
// Handles PDFMake engine initialization, Thai Sarabun font loading,
// PII Redaction notice formatting, Cover Letter PDFs, and Discovery Report PDFs.

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let pdfmakeInstance = null;

/**
 * Initialize and return configured PDFMake instance with Thai Sarabun fonts
 */
export async function getPdfEngine() {
  if (pdfmakeInstance) return pdfmakeInstance;

  const { default: pdfmake } = await import('pdfmake');
  const projectRoot = path.resolve(__dirname, '..');
  
  const fonts = {
    Sarabun: {
      normal: path.join(projectRoot, 'fonts', 'Sarabun-Regular.ttf'),
      bold: path.join(projectRoot, 'fonts', 'Sarabun-Bold.ttf'),
      italics: path.join(projectRoot, 'fonts', 'Sarabun-Regular.ttf'),
      bolditalics: path.join(projectRoot, 'fonts', 'Sarabun-Bold.ttf')
    }
  };

  pdfmake.setFonts(fonts);
  pdfmakeInstance = pdfmake;
  return pdfmakeInstance;
}

/**
 * Generate PDF buffer from a docDefinition object
 * @param {Object} docDefinition - PDFMake document definition
 * @returns {Promise<Buffer>} - Generated PDF Buffer
 */
export async function generatePdfBuffer(docDefinition) {
  const pdfmake = await getPdfEngine();
  const pdfDoc = pdfmake.createPdf(docDefinition);
  return await pdfDoc.getBuffer();
}

/**
 * Helper to deduplicate redaction records and format masked format table in PDF reports
 * @param {Array<Object>} records - Redaction records array
 * @returns {Object|null} - PDFMake table object or null
 */
export function formatRedactionNoticeTable(records) {
  if (!Array.isArray(records) || records.length === 0) return null;

  const uniqueMap = new Map();
  records.forEach(r => {
    if (!r || !r.itemRedacted) return;
    let cleanLabel = r.itemRedacted.replace(/\s*\([^)]*\)/g, '').trim() || 'ข้อมูลส่วนบุคคล';
    if (!uniqueMap.has(cleanLabel)) {
      let maskedExample = r.previewUrlAfter;
      if (!maskedExample || maskedExample === 'crm_redacted_view' || maskedExample === 'crm_original_view') {
        if (cleanLabel.includes('บัตรประชาชน') || cleanLabel.includes('ID')) {
          maskedExample = '1-xxxx-xxxxx-12-4 (Masked กลางและท้าย)';
        } else if (cleanLabel.includes('โทรศัพท์') || cleanLabel.includes('Phone')) {
          maskedExample = '097-xxx-1584 (Masked ตัวเลขกลาง)';
        } else if (cleanLabel.includes('อีเมล') || cleanLabel.includes('Email')) {
          maskedExample = '42j****@gmail.com (Masked ตัวอักษรผู้ใช้)';
        } else if (cleanLabel.includes('ชื่อ') || cleanLabel.includes('Name')) {
          maskedExample = 'จิดาภา ศ*** (Masked นามสกุลบางส่วน)';
        } else if (cleanLabel.includes('ที่อยู่') || cleanLabel.includes('Address')) {
          maskedExample = 'xxx ม.x ต.xxxx (Masked บ้านเลขที่/รายละเอียด)';
        } else {
          maskedExample = '[ Partial Masking / ซ่อนข้อมูลส่วนบุคคล ]';
        }
      }

      uniqueMap.set(cleanLabel, {
        cleanLabel,
        maskedExample,
        reason: r.reason || 'มาตรการรักษาความปลอดภัยและจำกัดข้อมูลให้เท่าที่จำเป็น (Data Minimization - PDPA มาตรา 37)'
      });
    }
  });

  const rows = Array.from(uniqueMap.values());
  if (rows.length === 0) return null;

  return {
    table: {
      headerRows: 1,
      widths: ['25%', '35%', '40%'],
      body: [
        [
          { text: 'ประเภทข้อมูลที่ถูกจำกัด', bold: true, fillColor: '#f1f5f9', fontSize: 10 },
          { text: 'ตัวอย่างการพราง (Masking Format)', bold: true, fillColor: '#f1f5f9', fontSize: 10 },
          { text: 'เหตุผลทางกฎหมาย (Legal Basis)', bold: true, fillColor: '#f1f5f9', fontSize: 10 }
        ],
        ...rows.map(row => [
          { text: row.cleanLabel, fontSize: 10 },
          { text: row.maskedExample, fontSize: 10, color: '#0369a1', bold: true },
          { text: row.reason, fontSize: 9, color: '#64748b' }
        ])
      ]
    },
    layout: 'lightHorizontalLines',
    margin: [0, 10, 0, 15]
  };
}

/**
 * Generate PDPA Data Handover Cover Letter PDF
 * @param {Object} data - Request metadata
 * @param {Array} filesList - List of files included
 * @param {string} sha256Hash - SHA256 Checksum string
 * @param {string} signerName - Name of the person signing
 * @param {string} signerSignatureImage - Base64 image of the signature
 * @returns {Promise<Buffer>} - PDF Buffer
 */
export async function generateCoverLetterPdf(data, filesList = [], sha256Hash = '', signerName = '', signerSignatureImage = null) {
  const requesterName = `${data.requester?.firstName || ''} ${data.requester?.lastName || ''}`.trim() || 'ผู้ขอใช้สิทธิ';
  const trackingNo = data.trackingNo || data.id || '-';
  
  const docDefinition = {
    defaultStyle: { font: 'Sarabun', fontSize: 16 },
    content: [
      { text: 'บันทึกการส่งมอบข้อมูลส่วนบุคคล (PDPA Data Handover)', style: 'header', alignment: 'center', margin: [0, 0, 0, 20] },
      { text: `เลขที่คำร้อง: ${trackingNo}`, margin: [0, 0, 0, 10] },
      { text: `ชื่อผู้ขอใช้สิทธิ: ${requesterName}`, margin: [0, 0, 0, 10] },
      { text: `วันที่ส่งมอบ: ${new Date().toLocaleDateString('th-TH')}`, margin: [0, 0, 0, 20] },
      { text: 'รายการไฟล์ที่ส่งมอบ:', bold: true, margin: [0, 0, 0, 10] },
      ...filesList.map((f, i) => ({ text: `${i + 1}. ${f.filename || f.name || 'document.pdf'}`, margin: [10, 0, 0, 5] })),
      ...(formatRedactionNoticeTable(data.redactionRecords) ? [
        { text: '\nบันทึกการจำกัดและพรางข้อมูลตามมาตรการความปลอดภัย (Data Masking & Redaction Notice):', bold: true, fontSize: 15, margin: [0, 15, 0, 5] },
        { text: 'ข้อมูลบางรายการในรายงานฉบับนี้ถูกพรางบางส่วน (Marking/Masking) ตามมาตรการรักษาความปลอดภัยและจำกัดข้อมูลให้เท่าที่จำเป็น (PDPA มาตรา 37) เพื่อป้องกันความเสี่ยงข้อมูลส่วนบุคคลรั่วไหล', fontSize: 11, color: '#475569', margin: [0, 0, 0, 8] },
        formatRedactionNoticeTable(data.redactionRecords)
      ] : []),
      { text: '\nการรับรองความถูกต้องของข้อมูล (Data Integrity Check):', bold: true, margin: [0, 20, 0, 5] },
      { text: 'เอกสารและชุดข้อมูลนี้ถูกเข้ารหัสเพื่อตรวจสอบความถูกต้อง (SHA-256) เพื่อป้องกันการเปลี่ยนแปลงเนื้อหา', fontSize: 12, margin: [0, 0, 0, 5] },
      { text: `SHA-256 Checksum: ${sha256Hash}`, fontSize: 10, margin: [0, 0, 0, 20] },
      
      {
        columns: [
          { width: '*', text: '' },
          {
            width: '45%',
            alignment: 'center',
            stack: [
              signerSignatureImage 
                ? { image: signerSignatureImage, width: 100, alignment: 'center', margin: [0, 5, 0, 5] }
                : { text: 'ลงชื่อ _________________________', margin: [0, 10, 0, 5] },
              { text: signerName ? `(${signerName})` : '', bold: true },
              { text: 'ผู้ควบคุมข้อมูลส่วนบุคคล', fontSize: 14 }
            ]
          }
        ]
      }
    ],
    styles: { header: { fontSize: 22, bold: true } }
  };

  return await generatePdfBuffer(docDefinition);
}

/**
 * Generate PDPA Personal Data Discovery & Compilation Report PDF
 * @param {Object} data - Request metadata
 * @param {Array} allFilesList - List of discovery files
 * @param {string} sha256Hash - SHA256 Checksum string
 * @param {boolean} isCompleted - Whether request is in completed/delivered state
 * @param {string} signerName - Name/title of the person signing the report
 * @param {string} signerSignatureImage - Base64 image string of the signature
 * @returns {Promise<Buffer>} - PDF Buffer
 */
export async function generateDiscoveryReportPdf(data, allFilesList = [], sha256Hash = '', isCompleted = false, signerName = 'เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO)', signerSignatureImage = null) {
  const requesterName = `${data.requester?.firstName || ''} ${data.requester?.lastName || ''}`.trim() || '-';
  const trackingNo = data.trackingNo || data.id || '-';

  const docDefinition = {
    defaultStyle: { font: 'Sarabun', fontSize: 14 },
    watermark: isCompleted ? null : { text: 'DRAFT', color: 'gray', opacity: 0.15, bold: true, italics: false, angle: 45, fontSize: 72 },
    content: [
      { text: 'รายงานสรุปและรวบรวมข้อมูลส่วนบุคคลที่ผ่านการค้นหาแล้ว', style: 'header', alignment: 'center', margin: [0, 0, 0, 15] },
      { text: '(PDPA Personal Data Discovery & Compilation Report)', fontSize: 12, alignment: 'center', color: '#64748b', margin: [0, 0, 0, 25] },
      {
        table: {
          widths: ['35%', '65%'],
          body: [
            [{ text: 'เลขที่คำขอ (Tracking No):', bold: true }, trackingNo],
            [{ text: 'ชื่อผู้ยื่นคำขอ:', bold: true }, requesterName],
            [{ text: 'อีเมลผู้ยื่นคำขอ:', bold: true }, data.requester?.email || '-'],
            [{ text: 'วันที่รวบรวมข้อมูล:', bold: true }, new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })],
            [{ text: 'สถานะการตรวจสอบ:', bold: true }, isCompleted ? 'ตรวจสอบและอนุมัติแล้ว (Approved)' : 'ฉบับร่างระหว่างการตรวจสอบ (DRAFT)']
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 25]
      },
      { text: 'รายการระบบงานที่ทำการค้นหาและรวบรวมข้อมูล:', bold: true, fontSize: 16, margin: [0, 10, 0, 10] },
      ...(data.dataCollectionTasks && data.dataCollectionTasks.length > 0 ? [
        {
          table: {
            widths: ['40%', '35%', '25%'],
            body: [
              [{ text: 'ชื่อระบบงาน (System)', bold: true, fillColor: '#f1f5f9' }, { text: 'ผู้รับผิดชอบ (Assignee)', bold: true, fillColor: '#f1f5f9' }, { text: 'สถานะ (Status)', bold: true, fillColor: '#f1f5f9' }],
              ...data.dataCollectionTasks.map(t => [
                t.systemName || '-',
                t.assigneeName || '-',
                t.status === 'completed' ? 'เสร็จสิ้น (Completed)' : (t.status || 'in_progress')
              ])
            ]
          },
          margin: [0, 0, 0, 20]
        }
      ] : [{ text: 'ไม่มีรายการระบบงาน', color: '#94a3b8', margin: [0, 0, 0, 20] }]),
      { text: 'รายการไฟล์เอกสารแนบในชุดส่งมอบ (Attachment Files):', bold: true, fontSize: 16, margin: [0, 10, 0, 10] },
      ...(allFilesList.length > 0 ? allFilesList.map((f, i) => ({
        text: `${i + 1}. ${f.filename || f.name || 'document.pdf'} (ระบบ/ผู้แนบ: ${f.uploaded_by || 'ระบบ'})`,
        margin: [10, 0, 0, 6]
      })) : [{ text: 'ยังไม่มีไฟล์เอกสารแนบในชุดข้อมูล', color: '#94a3b8', margin: [10, 0, 0, 10] }]),
      ...(formatRedactionNoticeTable(data.redactionRecords) ? [
        { text: '\nบันทึกการจำกัดและพรางข้อมูลตามมาตรการความปลอดภัย (Data Masking & Redaction Notice):', bold: true, fontSize: 15, margin: [0, 15, 0, 5] },
        { text: 'ข้อมูลบางรายการในรายงานฉบับนี้ถูกพรางบางส่วน (Marking/Masking) ตามมาตรการรักษาความปลอดภัยและจำกัดข้อมูลให้เท่าที่จำเป็น (PDPA มาตรา 37) เพื่อป้องกันความเสี่ยงข้อมูลส่วนบุคคลรั่วไหล', fontSize: 11, color: '#475569', margin: [0, 0, 0, 8] },
        formatRedactionNoticeTable(data.redactionRecords)
      ] : []),
      { text: '\nการรับรองความถูกต้องและความสมบูรณ์ของข้อมูล (Data Integrity Check):', bold: true, fontSize: 15, margin: [0, 25, 0, 5] },
      { text: 'เอกสารและชุดข้อมูลนี้ถูกเข้ารหัสและคำนวณค่าแฮช (SHA-256 Checksum) เพื่อรับรองความถูกต้องและป้องกันการแก้ไขเปลี่ยนแปลงเนื้อหา', fontSize: 12, color: '#475569', margin: [0, 0, 0, 5] },
      { text: `SHA-256: ${sha256Hash}`, fontSize: 10, font: 'Sarabun', color: '#0284c7', margin: [0, 0, 0, 30] },
      {
        columns: [
          { width: '*', text: '' },
          {
            width: '45%',
            alignment: 'center',
            stack: [
              signerSignatureImage 
                ? { image: signerSignatureImage, width: 100, alignment: 'center', margin: [0, 5, 0, 5] }
                : { text: 'ลงชื่อ .......................................................', margin: [0, 10, 0, 5] },
              { text: `(${signerName})`, bold: true },
              { text: 'ผู้ตรวจสอบและรับรองข้อมูลส่วนบุคคล', fontSize: 12, color: '#64748b' }
            ]
          }
        ]
      }
    ],
    styles: { header: { fontSize: 22, bold: true } }
  };

  return await generatePdfBuffer(docDefinition);
}

