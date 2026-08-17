# 🔐 Security Report v2 — Full Codebase Audit
> ตรวจสอบ 12 ไฟล์ครบทุก route และ middleware | 16 ส.ค. 2569

## สรุประดับความรุนแรง

| ระดับ | จำนวน |
|-------|-------|
| 🔴 Critical | 4 |
| 🟠 High | 10 |
| 🟡 Medium | 15 |
| 🟢 Low | 8 |
| **รวม** | **37** |

---

## 🔴 Critical — แก้ทันที

### [CRIT-01] Backdoor Passwords ใน `superadmin.routes.js`
**ไฟล์:** [`superadmin.routes.js:75-80`](file:///d:/PDPA%20req/routes/superadmin.routes.js#L75-L80)

```js
if (!valid && (password === 'Num.1970' || password === '12345678' || password === 'utopia123')) {
  valid = true;
  ...
}
```
รหัสเก่า 3 ตัว (รวม `utopia123`) อยู่ใน superadmin.routes.js ด้วย — ต้องลบออกพร้อมกับของใน auth.routes.js

---

### [CRIT-02] Fallback OTP `123456` ใน `public.routes.js`
**ไฟล์:** [`public.routes.js:305-312`](file:///d:/PDPA%20req/routes/public.routes.js#L305-L312)

```js
} catch (error) {
  await dbPool.query(`UPDATE public_otps SET otp = '123456' WHERE key = $1`, [key]);
  return res.json({ success: true, message: '... อนุญาตให้ใช้รหัส 123456 เพื่อทดสอบระบบได้' });
}
```
Pattern เดียวกับที่แก้ใน auth.routes.js แล้ว — แต่ยังมีอยู่ใน public route สำหรับ download OTP

---

### [CRIT-03] Superadmin Login — SMTP ไม่ await (Silent MFA Bypass)
**ไฟล์:** [`superadmin.routes.js:97-128`](file:///d:/PDPA%20req/routes/superadmin.routes.js#L97-L128)

```js
sendMailWithFallback({ ... })   // ← ขาด await!
  .then(() => { ... })
  .catch(mailErr => {
    console.warn(`[SMTP Warning]...`);
    // ← error แค่ log ไว้ login ผ่านต่อเลย
  });
return res.json({ success: true, requires2FA: true, ... });
```
OTP ถูกเขียนลง DB แล้ว แต่อาจไม่ถูกส่ง — ผู้โจมตีที่รู้ OTP (เช่นจาก memory) ใช้ bypass MFA ได้

---

### [CRIT-04] `requireRole([])` บน Superadmin Routes ทุกตัว
**ไฟล์:** [`superadmin.routes.js`](file:///d:/PDPA%20req/routes/superadmin.routes.js) บรรทัด 202, 218, 234, 246, 265, 284, 304

```js
router.post('/tenants', authenticateJWT, requireRole([]), ...)          // สร้าง tenant
router.put('/tenants/:id', authenticateJWT, requireRole([]), ...)       // แก้ tenant
router.delete('/tenants/:id', authenticateJWT, requireRole([]), ...)    // ลบ tenant
router.put('/super-admin/settings/:key', authenticateJWT, requireRole([]), ...)  // แก้ settings
router.post('/super-admin/tenants/:id/offboard-export', authenticateJWT, requireRole([]), ...)  // export ข้อมูลทั้งหมด
```
`requireRole([])` — array ว่าง ทำให้ logic จริงๆ อนุญาตเฉพาะ `superadmin` (ผ่าน `req.user.role !== 'superadmin'` check) แต่เจตนาไม่ชัดเจนและเสี่ยงต่อการ bypass ในอนาคต ควรเปลี่ยนเป็น `requireRole(['superadmin'])` ชัดๆ

---

## 🟠 High

### [HIGH-01] Admin ตั้ง Role `superadmin` ให้ User ได้ (Privilege Escalation)
**ไฟล์:** [`users.routes.js:58-88`](file:///d:/PDPA%20req/routes/users.routes.js#L58-L88)

```js
const { role, roles, ... } = req.body;
await dbPool.query('UPDATE users SET role = $4 ... WHERE id = $7', [..., primaryRole, ...]);
// ไม่มี allowlist — admin ส่ง { "role": "superadmin" } ได้เลย
```

---

### [HIGH-02] Admin แก้/ลบ User ข้ามองค์กรได้ (IDOR — ไม่มี `org_id` filter)
**ไฟล์:** [`users.routes.js:58-103`](file:///d:/PDPA%20req/routes/users.routes.js#L58-L103)

```js
// PUT /:id — ไม่มี AND org_id = $N
await dbPool.query('UPDATE users SET ... WHERE id = $7', [..., id]);
// DELETE /:id
await dbPool.query('DELETE FROM users WHERE id = $1', [id]);
```

---

### [HIGH-03] Generate Download Token — ไม่มี Org Filter และไม่มี `requireRole`
**ไฟล์:** [`requests.routes.js:379-433`](file:///d:/PDPA%20req/routes/requests.routes.js#L379-L433)

```js
router.post('/requests/:id/generate-download-token', authenticateJWT, async (req, res) => {
  // ไม่มี requireRole ไม่มี org_id filter
  const { rows } = await dbPool.query('SELECT * FROM requests WHERE id = $1 LIMIT 1', [id]);
```

---

### [HIGH-04] `/dl/download-package-admin` — ดาวน์โหลด ZIP ของทุก Org โดยไม่ต้อง Role
**ไฟล์:** [`download.routes.js:234-302`](file:///d:/PDPA%20req/routes/download.routes.js#L234-L302)

```js
router.get('/requests/:id/download-package-admin', authenticateJWT, async (req, res) => {
  // ไม่มี requireRole() — user ธรรมดา download ZIP ที่มี PII ได้
```

---

### [HIGH-05] `PUT /api/config` — User ธรรมดาเขียนทับ System Config ได้
**ไฟล์:** [`public.routes.js:40-51`](file:///d:/PDPA%20req/routes/public.routes.js#L40-L51)

```js
router.put('/config', authenticateJWT, async (req, res) => {
  // ไม่มี requireRole — intake/auditor เขียน config ได้
```

---

### [HIGH-06] `PUT /api/templates` — User ธรรมดาแก้ Email Template ได้ (Content Injection)
**ไฟล์:** [`public.routes.js:68-81`](file:///d:/PDPA%20req/routes/public.routes.js#L68-L81)

```js
router.put('/templates', authenticateJWT, async (req, res) => {
  // ไม่มี requireRole — ใครก็ฝัง HTML/phishing link ใน template ส่งให้ประชาชนได้
```

---

### [HIGH-07] `POST /api/notify/workflow` — ไม่มี Authentication เลย (Open Email Relay)
**ไฟล์:** [`public.routes.js:238-248`](file:///d:/PDPA%20req/routes/public.routes.js#L238-L248)

```js
router.post('/notify/workflow', async (req, res) => {
  // ไม่มี authenticateJWT — ใครก็ trigger ส่ง email mass ได้
  await sendWorkflowNotification(request, oldStatus, newStatus, eventType, dbPool);
```

---

### [HIGH-08] `POST /api/public/requests` — เขียน JSONB ได้ทุกฟิลด์ (สถานะ, คำตัดสิน ฯลฯ)
**ไฟล์:** [`public.routes.js:145-226`](file:///d:/PDPA%20req/routes/public.routes.js#L145-L226)

```js
const requestData = req.body;  // เก็บ body ดิบทั้งหมดเป็น JSONB
// ส่ง { "status": "Approved", "decision": { "approvedAt": "..." } } ได้เลย
await dbPool.query('INSERT INTO requests ... ON CONFLICT (id) DO UPDATE SET data = $6, status = $5');
```

---

### [HIGH-09] `/dl/verify-otp` — ไม่มี Rate Limit (Brute Force OTP 6 หลัก)
**ไฟล์:** [`download.routes.js:403-439`](file:///d:/PDPA%20req/routes/download.routes.js#L403-L439)

OTP 6 หลัก = 1,000,000 ค่า ไม่มี rate limit ไม่มี lockout — brute-force ได้ภายในนาที

---

### [HIGH-10] Preview PDF — ไม่มี Org Filter (ดู PDF ของ Org อื่นได้)
**ไฟล์:** [`download.routes.js:170-231`](file:///d:/PDPA%20req/routes/download.routes.js#L170-L231)

```js
router.get('/requests/:id/preview-attachment-pdf', authenticateJWT, async (req, res) => {
  // ไม่มี org_id filter — authenticated user ดู PDF PII ของ org อื่นได้
```

---

## 🟡 Medium (สรุปย่อ)

| ID | จุด | ไฟล์ |
|----|-----|------|
| MED-01 | `Math.random()` สำหรับ OTP (ไม่ใช่ CSPRNG) | auth, superadmin, public, download routes |
| MED-02 | `POST /public/send-otp` — ไม่มี Rate Limit | public.routes.js:253 |
| MED-03 | `POST /audit-logs` — ใครก็เขียน Audit Log ได้ ไม่มี Auth | public.routes.js:102 |
| MED-04 | `GET /public/requests` — ดึง Request ทุก Org แบบ public ไม่มี pagination | public.routes.js:131 |
| MED-05 | `err.message` ใน response ยังเหลือหลายที่ | requests, download, superadmin, public routes |
| MED-06 | Audit log ID ใช้ `log_${Date.now()}` — คาดเดาได้ | requests.routes.js:90,171 |
| MED-07 | `/deliver` ส่ง email โดยไม่ verify จาก DB | requests.routes.js:102 |
| MED-08 | Extend Download Token — ไม่มี Org Filter (IDOR) | requests.routes.js:437 |
| MED-09 | `resolveDownloadToken` สร้าง token อัตโนมัติสำหรับ request ที่ยังไม่ approved | requests, download routes |
| MED-10 | Search requests — Full table scan ทุกครั้ง ไม่มี pagination | public.routes.js:352 |
| MED-11 | `POST /2fa/setup` — ไม่มี `authenticateJWT` ไม่มี lockout | auth.routes.js:453 |
| MED-12 | `GET /public/email-logs` — ดู email log ได้ไม่ต้อง auth | public.routes.js:231 |
| MED-13 | Workflow transitions — ไม่มี Org Filter | workflow.routes.js:227 |
| MED-14 | `GET /tenants` — คืน tenant ทุกองค์กรให้ทุก role | superadmin.routes.js:186 |
| MED-15 | OTP เก็บ plain text ในฐานข้อมูล | auth, superadmin, public, download routes |

---

## 🟢 Low (สรุปย่อ)

| ID | จุด | ไฟล์ |
|----|-----|------|
| LOW-01 | `super-admin/change-password` — ไม่มี requireRole ไม่มี complexity check | superadmin.routes.js:162 |
| LOW-02 | Delete workflow transition — ไม่ check ว่า ID มีอยู่จริง | workflow.routes.js:210 |
| LOW-03 | CORS อนุญาต `localhost:3000` ใน production default | server.js:81 |
| LOW-04 | `.env.example` hardcode production DB hostname | .env.example:2 |
| LOW-05 | Helmet CSP disabled | server.js:88 |
| LOW-06 | Signature validation ตรวจแค่ prefix string ไม่ parse image จริง | auth.routes.js:526 |
| LOW-07 | `/dl/request-otp` — ไม่มี Rate Limit | download.routes.js:328 |
| LOW-08 | HMAC checksum ตัดเหลือแค่ 64 bits | auth.middleware.js:78 |

---

## 🚨 ลำดับการแก้ไขแนะนำ

| ลำดับ | ID | รายละเอียด | ความยาก |
|-------|-----|-----------|---------|
| 1 | CRIT-01 | ลบ backdoor passwords ใน superadmin.routes.js | ⭐ ง่าย |
| 2 | CRIT-02 | Block login เมื่อ SMTP fail ใน public.routes.js | ⭐ ง่าย |
| 3 | CRIT-04 | เปลี่ยน `requireRole([])` → `requireRole(['superadmin'])` | ⭐ ง่าย |
| 4 | CRIT-03 | เพิ่ม `await` บน `sendMailWithFallback` ใน superadmin | ⭐ ง่าย |
| 5 | HIGH-01 | เพิ่ม role allowlist validation ใน users.routes.js | ⭐ ง่าย |
| 6 | HIGH-05,06 | เพิ่ม `requireRole(['admin','superadmin'])` ให้ config/template | ⭐ ง่าย |
| 7 | HIGH-07 | เพิ่ม `authenticateJWT` บน `/notify/workflow` | ⭐ ง่าย |
| 8 | HIGH-02,03,04,10, MED-08 | เพิ่ม `AND org_id = $N` ทุก query ที่เกี่ยวข้อง | ⭐⭐ ปานกลาง |
| 9 | HIGH-09, MED-02, LOW-07 | เพิ่ม rate limit ทุก OTP endpoint | ⭐⭐ ปานกลาง |
| 10 | MED-01 | เปลี่ยน `Math.random()` → `crypto.randomInt()` | ⭐ ง่าย |
| 11 | MED-12 | ลบหรือ authenticate `/public/email-logs` | ⭐ ง่าย |
| 12 | HIGH-08 | Validate field allowlist บน `POST /public/requests` | ⭐⭐⭐ ยาก |
