# ข้อกำหนดทางเทคนิคและการออกแบบระบบบันทึกรายการประมวลผลข้อมูล (RoPA Online Specification)
### สำหรับหน่วยงานขนาดกลางและเล็ก (SMEs) ภายใต้กฎหมายคุ้มครองข้อมูลส่วนบุคคล (PDPA) ของประเทศไทย
*จัดทำโดย: Gemini Notebook (ระบบอัตโนมัติอ้างอิงตามข้อกำหนดทางกฎหมาย)*

เอกสารฉบับนี้ถูกออกแบบมาเพื่อเป็น **พิมพ์เขียว (Technical Specification)** สำหรับนำไปป้อนให้แก่ AI (เช่น Claude หรือ ChatGPT) ในการเขียนโค้ดสร้างระบบบันทึกรายการกิจกรรมการประมวลผลข้อมูลส่วนบุคคล (Record of Processing Activities หรือ RoPA) บนระบบออนไลน์ โดยมุ่งเน้นความถูกต้องทางกฎหมายสูงสุดและมีความยืดหยุ่นสำหรับ SMEs ที่มีทรัพยากรจำกัด

---

## 1. ตรรกะการประเมินสิทธิ์ข้อยกเว้นสำหรับ SMEs (Compliance Rule Engine)

ตามประกาศคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.) ที่ประกาศในราชกิจจานุเบกษาเมื่อวันที่ 8 มกราคม พ.ศ. 2568 มีการผ่อนปรนหน้าที่การจัดทำ RoPA สำหรับวิสาหกิจขนาดกลางและขนาดย่อม (SMEs) โดยมีผลบังคับใช้ตั้งแต่วันที่ **9 มกราคม พ.ศ. 2568 (สำหรับผู้ประมวลผล)** และ **8 เมษายน พ.ศ. 2568 (สำหรับผู้ควบคุมข้อมูล)**

### 1.1 เกณฑ์การจำแนกขนาดธุรกิจ (SME Classification)
ระบบต้องประเมินว่าผู้ใช้งานเข้าข่ายผู้ควบคุมข้อมูล (Data Controller) หรือผู้ประมวลผลข้อมูล (Data Processor) ที่เป็นวิสาหกิจขนาดย่อมหรือขนาดกลางหรือไม่ โดยใช้เกณฑ์ดังนี้:

| ภาคธุรกิจ | ระดับวิสาหกิจ | จำนวนพนักงาน | รายได้รวมต่อปี (บาท) |
| :--- | :--- | :--- | :--- |
| **ภาคการผลิต (Manufacturing)** | ขนาดย่อม (Small) | $\le$ 50 คน | $\le$ 100,000,000 |
| | ขนาดกลาง (Medium) | 51 - 200 คน | $\le$ 500,000,000 |
| **ภาคบริการ ค้าส่ง ค้าปลีก** | ขนาดย่อม (Small) | $\le$ 30 คน | $\le$ 50,000,000 |
| | ขนาดกลาง (Medium) | 31 - 100 คน | $\le$ 300,000,000 |

*หมายเหตุเชิงเทคนิค:* หากจำนวนพนักงานไม่เกินเกณฑ์ แต่รายได้รวมเกิน ให้ใช้เกณฑ์ **รายได้รวมต่อปี** เป็นหลักในการพิจารณา

### 1.2 เกณฑ์ข้อยกเว้นอื่น ๆ ที่ได้รับสิทธิ์ผ่อนปรน ROPA
นอกจาก SMEs ทั่วไปแล้ว ระบบต้องอนุญาตให้นิติบุคคลกลุ่มเหล่านี้ระบุตัวตนเพื่อรับสิทธิ์ยกเว้นได้เช่นกัน:
1. วิสาหกิจชุมชน หรือเครือข่ายวิสาหกิจชุมชน
2. วิสาหกิจเพื่อสังคม หรือกลุ่มวิสาหกิจเพื่อสังคม
3. สหกรณ์ ชุมนุมสหกรณ์ หรือกลุ่มเกษตรกร
4. มูลนิธิ สมาคม องค์กรทางศาสนา หรือองค์กรไม่แสวงหากำไร (NGOs)
5. นิติบุคคลอาคารชุด (Condominium) หรือนิติบุคคลหมู่บ้านจัดสรร
6. ธุรกิจครอบครัว หรือธุรกิจในลักษณะเดียวกัน
7. ธุรกิจที่ดำเนินการโดยบุคคลธรรมดา (Individual Data Controller)

### 1.3 เงื่อนไขข้อยกเว้นของข้อยกเว้น (Carve-outs - บังคับต้องทำ ROPA)
ระบบต้องแจ้งเตือนผู้ใช้และ **บังคับให้ลงบันทึกรายการกิจกรรมประมวลผลข้อมูล (Full RoPA)** ทันที หากกิจกรรมประมวลผลนั้นเข้าข่ายกรณีใดกรณีหนึ่งดังต่อไปนี้:
1. **ไม่ใช่กิจกรรมที่เป็นครั้งคราว (Not Occasional):** เป็นกิจกรรมหลักที่ทำเป็นประจำ เช่น ระบบจ่ายเงินเดือนพนักงาน (Payroll), การส่งอีเมลโฆษณา/การตลาด (Newsletter) แก่ลูกค้าประจำ
2. **ประมวลผลข้อมูลอ่อนไหว (Sensitive Personal Data):** มีการเก็บข้อมูลตามมาตรา 26 เช่น ข้อมูลสุขภาพ (ใบรับรองแพทย์ยื่นลาป่วย), ข้อมูลศาสนา (ที่ปรากฏบนหน้าบัตรประชาชนที่สแกนเก็บไว้), ข้อมูลชีวมาตร (สแกนลายนิ้วมือหรือใบหน้าเพื่อบันทึกเวลาเข้างาน)
3. **มีความเสี่ยงต่อสิทธิและเสรีภาพของเจ้าของข้อมูล:** มีการติดตาม ตรวจสอบ วิเคราะห์พฤติกรรม (Profiling/Monitoring) หรือประมวลผลข้อมูลขนาดใหญ่
4. **เข้าข่ายต้องแต่งตั้ง DPO:** เป็นหน่วยงานรัฐ หรือมีกิจกรรมหลักที่เข้าข่ายมาตรา 41 (ตรวจสอบหรือประมวลผลข้อมูลอ่อนไหวจำนวนมากอย่างเป็นระบบ)

---

## 2. โครงสร้างฐานข้อมูล (Database Schema)

เพื่อสอดรับกับข้อกำหนดตามมาตรา 39 (สำหรับผู้ควบคุมข้อมูล) และมาตรา 40 (สำหรับผู้ประมวลผลข้อมูล) รวมถึงประกาศ สคส. เรื่องหลักเกณฑ์การขอใช้สิทธิ์เข้าถึงข้อมูลส่วนบุคคล พ.ศ. 2569 ที่กำหนดให้เก็บบันทึกประวัติการขอใช้สิทธิ์/ปฏิเสธสิทธิ์ (DSAR) อย่างน้อย **2 ปี** ฐานข้อมูลควรแยกตารางออกเป็น 3 ตารางหลัก:

```sql
-- 1. ตารางข้อมูลโปรไฟล์องค์กร (SME Profiles)
CREATE TABLE organizations (
    org_id INT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(255) NOT NULL,
    business_type ENUM('manufacturing', 'service_retail_wholesale', 'non_profit', 'other') NOT NULL,
    employee_count INT NOT NULL,
    annual_revenue DECIMAL(15, 2) NOT NULL,
    has_sensitive_data BOOLEAN DEFAULT FALSE,
    requires_dpo BOOLEAN DEFAULT FALSE,
    is_exempt_from_ropa BOOLEAN DEFAULT FALSE, -- ประเมินจากข้อมูลข้างต้น
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. ตารางประมวลผลข้อมูลหลัก (Master RoPA Records)
-- สำหรับบันทึกรายการกิจกรรมทั่วไปที่ต้องทำประวัติ (กรณีไม่เข้าข่ายได้รับยกเว้น หรือเป็นรายการประจำ)
CREATE TABLE ropa_records (
    record_id INT PRIMARY KEY AUTO_INCREMENT,
    org_id INT,
    activity_name VARCHAR(255) NOT NULL, -- เช่น ระบบจ่ายเงินเดือน, สมัครสมาชิกลูกค้า
    purpose_of_processing TEXT NOT NULL, -- วัตถุประสงค์
    data_subject_category VARCHAR(255) NOT NULL, -- เช่น พนักงาน, ลูกค้า
    personal_data_types TEXT NOT NULL, -- เช่น ชื่อ, เบอร์โทร, เลขบัตรประชาชน
    lawful_basis VARCHAR(100) NOT NULL, -- ฐานกฎหมาย เช่น สัญญา, ผลประโยชน์อันชอบธรรม
    retention_period VARCHAR(100) NOT NULL, -- ระยะเวลาการเก็บรักษา เช่น 5 ปีหลังสิ้นสุดสัญญา
    erasure_method VARCHAR(255) NOT NULL, -- วิธีทำลายข้อมูล เช่น ลบไฟล์ถาวร, ทำลายกระดาษ
    recipients_internal TEXT, -- ผู้เข้าถึงข้อมูลในองค์กร เช่น ฝ่ายบุคคล, ฝ่ายการเงิน
    recipients_external TEXT, -- ผู้รับข้อมูลภายนอก เช่น ธนาคาร, สรรพากร
    cross_border_transfer_safeguards TEXT, -- มาตรการโอนข้อมูลต่างประเทศ (ถ้ามี)
    security_measures TEXT NOT NULL, -- มาตรการรักษาความปลอดภัยทางเทคนิคและองค์กร
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES organizations(org_id)
);

-- 3. ตารางบันทึกประวัติการปฏิเสธคำขอใช้สิทธิ์ของเจ้าของข้อมูล (DSAR Rejection & Objection Log)
-- **สำคัญมาก: กฎหมายระบุว่า แม้เป็น SMEs ที่ได้รับยกเว้น ROPA ทั่วไป แต่ตารางนี้ "ห้ามยกเว้น" ต้องจัดทำและเก็บไว้อย่างน้อย 2 ปี**
CREATE TABLE dsar_rejection_logs (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    org_id INT,
    request_date DATE NOT NULL,
    requester_name VARCHAR(255) NOT NULL,
    right_type ENUM('access', 'rectification', 'erasure', 'restriction', 'portability', 'object') NOT NULL, -- ประเภทสิทธิ์ที่ขอ
    rejection_reason TEXT NOT NULL, -- เหตุผลในการปฏิเสธคำขอ (อ้างอิงตามข้อยกเว้นกฎหมาย)
    action_taken TEXT NOT NULL, -- วิธีการตอบกลับผู้ร้องขอ
    retention_deadline DATE NOT NULL, -- คำนวณวันหมดอายุบันทึก (วันที่ดำเนินการเสร็จสิ้น + 2 ปี)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES organizations(org_id)
);
```

---

## 3. ขั้นตอนการทำงานและส่วนติดต่อผู้ใช้ (Workflows & UX Wireframe Concepts)

ระบบออนไลน์สำหรับผู้ประกอบการขนาดเล็กต้องออกแบบให้ **เรียบง่าย ไม่ซับซ้อน (Zero-Barrier UX)**

### ขั้นตอนที่ 1: หน้าคัดกรองสถานะ (Onboarding Exemption Checker)
*   **คำถามในหน้าจอ:**
    *   ระบุภาคธุรกิจของคุณ? [การผลิต / บริการ ค้าส่ง ค้าปลีก / องค์กรไม่แสวงหาผลกำไร]
    *   จำนวนพนักงานของคุณ? (ช่องกรอกตัวเลข)
    *   รายได้รวมปีล่าสุด? (ช่องกรอกตัวเลข)
    *   คุณมีการสแกนลายนิ้วมือ/ใบหน้าพนักงาน หรือเก็บประวัติสุขภาพพนักงานใช่หรือไม่? [ใช่ / ไม่ใช่]
*   **การประมวลผล:** ระบบประเมินสถานะทันที หากเข้าเกณฑ์ยกเว้น ระบบจะขึ้นข้อความชัดเจน:
    > *"องค์กรของคุณได้รับการคุ้มครองสิทธิ์ผ่อนปรนการจัดทำ ROPA ทั่วไปตามมาตรา 39 และ 40 (ประกาศปี 2568) แต่คุณยังคงมีหน้าที่ต้องเก็บ **บันทึกการขอใช้สิทธิ์และการปฏิเสธสิทธิ์ (DSAR Log)** และ **มาตรการความปลอดภัยทางเทคนิคพื้นฐาน**"*

### ขั้นตอนที่ 2: หน้ารายการกิจกรรมอัจฉริยะ (Smart Activity Inventory)
*   ระบบจะมีเทมเพลตกิจกรรมที่พบบ่อยใน SMEs ให้เลือก (เช่น "ระบบงานบุคคลและประกันสังคม", "ระบบจดทะเบียนลูกค้าและออกใบกำกับภาษี", "ระบบส่งพัสดุและจัดส่งสินค้า") เพื่อให้ระบบเติมข้อมูล ROPA พื้นฐานให้อัตโนมัติ (วัตถุประสงค์, ประเภทข้อมูล, ระยะเวลาจัดเก็บมาตรฐาน) ผู้ใช้งานเพียงแค่แก้ไขข้อมูลบางส่วนให้ตรงกับความจริงของร้านค้า

### ขั้นตอนที่ 3: หน้าบันทึก DSAR ปฏิเสธสิทธิ์ (DSAR Rejection Tool)
*   กรณีที่ลูกค้าขอใช้สิทธิ์ แต่ธุรกิจจำเป็นต้องปฏิเสธ (เช่น ขอลบข้อมูลซื้อขายที่ยังต้องเก็บไว้เพื่อยื่นภาษีสรรพากร) ระบบจะมีปุ่ม **"บันทึกประวัติการปฏิเสธคำขอ"** ซึ่งจะสร้างฟอร์มให้กรอกข้อมูลสั้น ๆ เพื่อบันทึกเข้าตาราง `dsar_rejection_logs` ทันที และระบบจะช่วยคำนวณวันทำลายประวัตินี้ให้เมื่อครบ 2 ปีโดยอัตโนมัติ

---

## 4. พรอมต์คำสั่งสำหรับ AI เพื่อใช้สร้างระบบ (System Prompts for AI Development)

สามารถคัดลอกพรอมต์ (Prompt) ด้านล่างนี้ไปสั่งให้ AI (เช่น Claude 3.5 Sonnet) เขียนโค้ดระบบออกมาได้ทันที:

```text
You are an expert full-stack developer and a legal-tech specialist in Thailand's Personal Data Protection Act (PDPA).
Build a simple, beautiful, and secure online ROPA (Record of Processing Activities) tool tailored for Thai SMEs using Streamlit (Python).

The application must include the following features:
1. SME Exemption Assessment:
   - Ask user for their business sector (Manufacturing / Services, Retail, Wholesale), number of employees, annual revenue, and whether they collect sensitive personal data (biometrics, health certificates, religion on ID cards).
   - Dynamically calculate and display if the business is eligible for ROPA exemption under the Personal Data Protection Committee (PDPC) Notifications 2025.
   - Clearly state that even if they are exempt from standard ROPA, they MUST maintain a DSAR Rejection and Objection Log under Section 39(1)(7) and enforce minimum security measures.

2. Master RoPA Builder (For non-exempt operations or core activities):
   - Provide standard templates for common SME activities (e.g., HR & Payroll, E-commerce Customer management, Cookie & Web Analytics).
   - Display a clean data mapping interface representing standard fields (Purpose, Data Subjects, Data Types, Lawful Basis, Retention Period, Security Measures).

3. Mandatory DSAR Rejection & Objection Log (Section 39(1)(7)):
   - A dedicated form allowing the SME to log rejected data subject requests.
   - Automatically calculate the statutory 2-year retention period for this log based on the latest Baker McKenzie DSAR guidelines (2026).
   - Provide a clean dashboard showing active logs and deletion alert deadlines.

4. Design & Security:
   - Make it ultra-clean, minimal, and secure (no feeding of raw PII to third-party APIs).
   - Implement role-based least privilege principles (represented in the UI).
   - Write clean, commented Python Streamlit code that can run out-of-the-box. Use SQLite in-memory database as a mocked database.
```