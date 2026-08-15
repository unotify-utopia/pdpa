# 🚀 บทสรุปสถาปัตยกรรมและฟีเจอร์ของระบบ PDPA Portal (Baseline Version)

เอกสารฉบับนี้จัดทำขึ้นเพื่อใช้เป็น **จุดอ้างอิง (Baseline)** สำหรับการพัฒนาต่อยอดในอนาคต เพื่อให้ทีมงานและ AI ทราบถึงบริบท โครงสร้าง และมาตรฐานความปลอดภัยที่ได้ถูกกำหนดไว้ในเวอร์ชันปัจจุบัน โดยไม่ต้องเริ่มต้นอธิบายใหม่

---

## 🏗️ 1. สถาปัตยกรรมหลักของระบบ (Tech Stack & Architecture)
- **Frontend:** React (TypeScript) + Tailwind CSS + Vite
- **Backend:** Node.js + Express.js 
- **Database:** PostgreSQL (`pg` pool)
- **Code Structure (Backend):**
  - มีการจัดทำโครงสร้างแบบ **Modular Architecture** เพื่อไม่ให้ `server.js` รุงรัง (ปัจจุบันมีเพียง ~150 บรรทัด)
  - **Routes (`routes/`):** แยกการทำงานตาม Domain เช่น `auth`, `public`, `superadmin`, `workflow`, `requests`, `users`
  - **Services (`services/`):** แยก Business logic ที่สำคัญ เช่น การส่งอีเมล (`email.service.js`), การคำนวณ SLA (`sla.service.js`), การสร้าง PDF (`pdf.service.js`), การตั้งค่า DB (`database.init.js`)
  - **Middleware (`middleware/`):** จัดการสิทธิ์การเข้าถึง (`auth.middleware.js`) และการซ่อนฟิลด์ข้อมูลอ่อนไหว (`fieldPermissions.js`)

---

## 🛡️ 2. ระบบรักษาความปลอดภัยและการยืนยันตัวตน (Security & Auth)
- **JWT Authentication:** ใช้ JSON Web Token (อายุ 2 ชั่วโมง) ในการตรวจสอบสิทธิ์
- **ระบบ 2FA / OTP:** ส่งรหัส OTP 6 หลักผ่านอีเมลทุกครั้งที่เข้าสู่ระบบ
- **ความปลอดภัยของรหัสผ่านขั้นสูงสุด (Advanced Password Policy):**
  - ความยาวขั้นต่ำ 8 ตัวอักษร (ประกอบด้วย พิมพ์เล็ก, พิมพ์ใหญ่, ตัวเลข, อักขระพิเศษ)
  - **Password History Check:** ห้ามใช้รหัสผ่านซ้ำกับรหัสเดิม (เปรียบเทียบกับ Hash ใน DB)
  - **Levenshtein Distance:** ตรวจสอบไม่ให้รหัสผ่านใหม่คล้ายคลึงกับรหัสผ่านเดิมมากเกินไป (ต้องแตกต่างอย่างน้อย 3 จุด)
  - **Force Password Change (180 Days):** บังคับให้ผู้ใช้งานต้องเปลี่ยนรหัสผ่านทุกๆ 180 วัน
- **Data Privacy & Masking:** 
  - ระบบแจ้งเตือนทางอีเมล (OTP, Reset Password) จะถูกแนบข้อมูล **IP Address** และ **Timestamp** ของผู้ทำรายการ
  - มีการทำ **Data Masking (เซ็นเซอร์ข้อมูล)** บัญชีผู้ใช้งานและ IP Address (เช่น `in****.uto`, `103.***.***.173`) เพื่อป้องกันข้อมูลรั่วไหลหากอีเมลถูกดักจับ
- **Audit Logs:** บันทึกทุกความเคลื่อนไหว (เช่น Login สำเร็จ/ล้มเหลว) พร้อม IP และ User Agent ลงในตาราง `audit_logs`
- **Forgot Password Flow:** ทำงานผ่าน Token แบบใช้ครั้งเดียว (อายุ 15 นาที) และตรวจสอบความปลอดภัยของรหัสใหม่ทันที

---

## 📧 3. ระบบส่งอีเมล (Email Service)
- **Failover Mechanism (ระบบสำรอง):** รองรับการส่งอีเมลผ่าน Resend API หากไม่สำเร็จระบบจะสลับไปใช้ SMTP มาตรฐาน (Nodemailer) โดยอัตโนมัติ 
- **Centralized Email Formatting:** เทมเพลตอีเมลทั้งหมด (OTP Staff, OTP SuperAdmin, OTP Public, ลืมรหัสผ่าน) ถูกออกแบบให้ดูเป็นมืออาชีพ เป็นทางการ และมีการแจ้งเตือนด้านความปลอดภัยที่ชัดเจน

---

## ⚙️ 4. ฟีเจอร์แกนหลักของธุรกิจ (Core Business Features)
- **Super Admin & Multi-Tenant:** รองรับการดูแลหลายองค์กร (Org ID) ผ่าน Super Admin (การจัดการ Tenant, ข้อมูล Offboarding)
- **Dynamic Workflow & SLA:** 
  - คำนวณ SLA วันครบกำหนดอัตโนมัติตามประเภทของคำร้อง
  - แจ้งเตือน Workflow อัตโนมัติ (Trigger emails) ตามสถานะของตั๋ว
- **Field Permissions:** ควบคุมการมองเห็นข้อมูล (เช่น เบอร์โทรศัพท์, อีเมลผู้ร้องขอ) ตามระดับสิทธิ์ (Role) ของพนักงาน
- **Data Export & Reporting:** การออกเอกสาร PDF (Cover Letter, Discovery Report) สำหรับตอบกลับคำร้อง

---

## 🗄️ 5. โครงสร้างฐานข้อมูล (Database Management)
- **Auto Migration:** ควบคุมการสร้างตารางและอัปเดต Schema ฐานข้อมูลอัตโนมัติผ่าน `services/database.init.js`
- **Error Isolation:** ใช้ `try-catch` บล็อกการทำงานรายคอลัมน์/ตาราง ทำให้เมื่อการ `ALTER TABLE` บางจุดมีข้อผิดพลาด (เช่น มีคอลัมน์อยู่แล้ว) จะไม่ทำให้โครงสร้างส่วนอื่นหยุดทำงาน (Robust Migration)

---
> [!NOTE] 
> **สำหรับ AI ในอนาคต:** เมื่อมีการรับ Requirement ใหม่ ให้ยึดถือมาตรฐานความปลอดภัย (เช่น 2FA, Audit Log) และโครงสร้างการเขียนโค้ดแบบ Modular นี้เป็น **บรรทัดฐาน** ในการพัฒนาโมดูลใหม่ๆ เสมอ
