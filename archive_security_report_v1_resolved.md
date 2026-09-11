# 🔐 รายงานช่องโหว่ความปลอดภัย — PDPA Request System

> รายงานนี้จัดทำขึ้นเพื่อการซ้อมโจมตีระบบตัวเอง (Penetration Testing / Red Team) เพื่อหาจุดอ่อนที่ต้องแก้ไขก่อน Production

> [!IMPORTANT]
> **Backdoor Password (`Num.1970`, `12345678`)** ใน `auth.routes.js:64` — เจตนาเก็บไว้ระหว่างทดสอบ **ต้องลบออกก่อนขึ้น Production ทุกครั้ง**

---

## สรุประดับความรุนแรง

| ระดับ | จำนวน |
|-------|-------|
| 🔴 Critical (วิกฤต) | 2 |
| 🟠 High (สูง) | 4 |
| 🟡 Medium (กลาง) | 3 |
| 🟢 Low (ต่ำ) | 2 |

---

## 🔴 Critical — ต้องแก้ไขก่อนขึ้น Production

### [VULN-01] Fallback OTP "123456" เมื่อ SMTP ล้มเหลว
**ไฟล์:** [`auth.routes.js:143`](file:///d:/PDPA%20req/routes/auth.routes.js#L143-L145)  
**ประเภท:** Authentication Bypass / MFA Bypass

**โค้ดที่มีปัญหา:**
```js
// บรรทัด 143-145
const fallbackOtpData = JSON.stringify({ otp: '123456', expiresAt: Date.now() + 5 * 60 * 1000 });
await dbPool.query('UPDATE users SET two_factor_secret = $1 WHERE id = $2', [fallbackOtpData, user.id]);
fallbackMessage = ' (อีเมลขัดข้องชั่วคราว ให้ใช้รหัส 123456 แทนได้)';
```

**ผลกระทบ:** เมื่อระบบ SMTP ล้มเหลว (เช่น ถูก Spam flood หรือเกิน quota) ระบบจะตั้ง OTP เป็น `123456` สำหรับ**ทุกบัญชีในระบบ** ผู้โจมตีที่จงใจทำให้ SMTP fail สามารถ bypass MFA ได้ทั้งระบบ

**ทดสอบ:**
```bash
# 1. ทำให้ SMTP quota เกิน (หรือปิด SMTP config ชั่วคราว)
# 2. สั่ง login ปกติ — ระบบจะ fallback OTP เป็น 123456
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"anyuser","password":"correct_pass","mfaCode":"123456"}'
```

**วิธีแก้:** เมื่อ SMTP ล้มเหลว ให้ **block การ login ทันที** แทนการใช้ fallback OTP

```js
// แก้เป็น:
} catch (mailErr) {
  console.error(`[SMTP Error] Cannot send OTP: ${mailErr.message}`);
  return res.status(503).json({
    success: false,
    message: 'ระบบส่งรหัส OTP ขัดข้องชั่วคราว กรุณาลองใหม่ในอีกสักครู่'
  });
}
```

---

### [VULN-02] Error Response เปิดเผย Stack Trace
**ไฟล์:** [`auth.routes.js:211`](file:///d:/PDPA%20req/routes/auth.routes.js#L211)  
**ประเภท:** Information Disclosure

**โค้ดที่มีปัญหา:**
```js
// บรรทัด 211
return res.status(500).json({ 
  success: false, 
  message: 'Server error: ' + err.message + ' ' + (err.stack || '') 
});
```

**ผลกระทบ:** Stack trace เปิดเผยโครงสร้างโค้ด, path ของไฟล์, และข้อมูล internal — เป็นข้อมูลที่ใช้วางแผนโจมตีครั้งถัดไปได้

**ทดสอบ:**
```bash
# ส่ง payload ที่ทำให้เกิด DB error
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":{"$where":"1=1"},"password":"x"}'
```

**วิธีแก้:**
```js
// Production: ซ่อน stack trace
console.error('Login Error:', err); // บันทึกไว้ใน server log
return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' });
```

---

## 🟠 High — ควรแก้ไขเร่งด่วน

### [VULN-03] ไม่มี Rate Limiting บน Login Endpoint
**ไฟล์:** [`server.js`](file:///d:/PDPA%20req/server.js)  
**ประเภท:** Brute Force / Credential Stuffing

**ผลกระทบ:** ผู้โจมตีส่ง request ล็อกอินได้ไม่จำกัด สามารถ brute-force รหัสผ่านหรือ OTP ได้

**ทดสอบ:**
```bash
# ส่ง login request ซ้ำๆ 500 ครั้งโดยไม่ถูก block
for i in $(seq 1 500); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"admin\",\"password\":\"guess$i\"}"
done
# ถ้าทุก request ได้ 401 (ไม่มี 429) = ยังไม่มี rate limit
```

**วิธีแก้:**
```bash
npm install express-rate-limit
```
```js
// server.js
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 10, // สูงสุด 10 ครั้งต่อ IP
  message: { success: false, message: 'พยายาม login มากเกินไป กรุณารอ 15 นาที' },
  standardHeaders: true,
});

app.use('/api/auth/login', loginLimiter);
```

---

### [VULN-04] ไม่มี Account Lockout หลัง Login ผิดหลายครั้ง
**ไฟล์:** [`routes/auth.routes.js`](file:///d:/PDPA%20req/routes/auth.routes.js)  
**ประเภท:** Missing Account Lockout

**ผลกระทบ:** ไม่มีการนับครั้งที่ login ผิด — บัญชีไม่เคยถูก lock แม้จะผิดพันครั้ง ใช้ร่วมกับ VULN-03 ทำให้ brute-force ง่ายมาก

**วิธีแก้:** เพิ่ม column `failed_login_attempts` และ `locked_until` ใน users table

```sql
ALTER TABLE users ADD COLUMN failed_login_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TIMESTAMPTZ;
```
```js
// ใน login route หลัง password ผิด
await dbPool.query(
  `UPDATE users SET failed_login_attempts = failed_login_attempts + 1,
   locked_until = CASE WHEN failed_login_attempts + 1 >= 5 
     THEN NOW() + INTERVAL '30 minutes' ELSE locked_until END
   WHERE id = $1`, [user.id]
);
```

---

### [VULN-05] Token ส่งผ่าน URL Query String
**ไฟล์:** [`middleware/auth.middleware.js:14`](file:///d:/PDPA%20req/middleware/auth.middleware.js#L14-L15)  
**ประเภท:** Token Exposure in Logs

**โค้ดที่มีปัญหา:**
```js
} else if (req.query && req.query.token) {
  token = req.query.token;
}
```

**ผลกระทบ:** Token ที่อยู่ใน URL ถูกบันทึกใน server access logs, browser history, CDN/proxy logs และ Referrer headers โดยอัตโนมัติ

**ทดสอบ:**
```bash
# เรียก API ด้วย token ใน URL
curl "http://localhost:3001/api/auth/me?token=eyJhbGc..."
# ตรวจสอบ server access log — จะเห็น token อยู่ใน URL ชัดเจน
```

**วิธีแก้:** ลบส่วนรับ token จาก query string ออกทั้งหมด — รับจาก `Authorization: Bearer` header เท่านั้น

---

### [VULN-06] JWT Token มีอายุ 2 ชั่วโมง / ไม่มีกลไก Logout
**ไฟล์:** [`auth.routes.js:197`](file:///d:/PDPA%20req/routes/auth.routes.js#L197)  
**ประเภท:** Session Management / Missing Token Revocation

**โค้ดที่มีปัญหา:**
```js
const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '2h' });
```

**ผลกระทบ:** หาก token รั่วไหล ผู้โจมตีมีเวลา 2 ชั่วโมงในการใช้งาน และเนื่องจากไม่มี token blacklist การ "logout" จาก frontend ไม่ได้ยกเลิก token จริงๆ

**วิธีแก้:** ลด expiry เป็น 30 นาที และใช้ Refresh Token หรือเก็บ token version ในฐานข้อมูล

---

## 🟡 Medium — ควรแก้ไขในรอบถัดไป

### [VULN-07] OTP ไม่มีการจำกัดจำนวนครั้งที่ลอง
**ไฟล์:** [`auth.routes.js`](file:///d:/PDPA%20req/routes/auth.routes.js)  
**ประเภท:** OTP Brute Force

**ผลกระทบ:** OTP 6 หลักมีความเป็นไปได้ 1,000,000 แบบ ถ้าไม่จำกัดการลอง ผู้โจมตีสามารถ enumerate ได้ใน 5 นาที

**ทดสอบ:**
```bash
# ทดสอบลอง OTP ซ้ำๆ โดยไม่ถูก invalidate
for code in 111111 222222 333333; do
  curl -s -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"user\",\"password\":\"pass\",\"mfaCode\":\"$code\"}"
done
```

**วิธีแก้:** เพิ่มฟิลด์ `otp_attempts` ใน OTP data และ invalidate หลัง 3 ครั้ง

```js
const cached = JSON.parse(user.two_factor_secret);
if (cached.attempts >= 3) {
  await dbPool.query('UPDATE users SET two_factor_secret = NULL WHERE id = $1', [user.id]);
  return res.status(401).json({ success: false, message: 'OTP ถูกยกเลิก กรุณาเข้าสู่ระบบใหม่' });
}
// เพิ่ม attempts
cached.attempts = (cached.attempts || 0) + 1;
await dbPool.query('UPDATE users SET two_factor_secret = $1 WHERE id = $2', [JSON.stringify(cached), user.id]);
```

---

### [VULN-08] Request Body Limit 50MB บนทุก Endpoint
**ไฟล์:** [`server.js:81`](file:///d:/PDPA%20req/server.js#L81)  
**ประเภท:** Denial of Service (DoS)

**โค้ดที่มีปัญหา:**
```js
app.use(express.json({ limit: '50mb' }));
```

**ผลกระทบ:** ผู้โจมตีส่ง JSON payload ขนาด 50MB ซ้ำๆ ได้ทำให้ server memory หมดและ crash

**ทดสอบ:**
```bash
python3 -c "import json; print(json.dumps({'x': 'a'*49000000}))" > big.json
for i in $(seq 1 20); do
  curl -s -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d @big.json &
done
# สังเกต RAM และ response time ของ server
```

**วิธีแก้:** ตั้ง limit แยกตาม route

```js
// server.js — default ขนาดเล็ก
app.use(express.json({ limit: '1mb' }));

// เฉพาะ endpoint ที่รับรูปภาพ จึงเปิด limit ใหญ่
app.use('/api/auth/signature', express.json({ limit: '5mb' }));
```

---

### [VULN-09] Signature Image ไม่ตรวจสอบประเภทข้อมูล
**ไฟล์:** [`auth.routes.js:478`](file:///d:/PDPA%20req/routes/auth.routes.js#L478-L486)  
**ประเภท:** Unrestricted Input / Data Injection

**โค้ดที่มีปัญหา:**
```js
const { signatureImage } = req.body;
// ไม่มีการ validate เลย
await dbPool.query('UPDATE users SET signature_image = $1 WHERE id = $2', [signatureImage, req.user.id]);
```

**วิธีแก้:**
```js
if (!signatureImage || 
    !(/^data:image\/(png|jpeg|jpg);base64,/.test(signatureImage)) ||
    signatureImage.length > 500000) { // ~375KB
  return res.status(400).json({ success: false, message: 'รูปแบบลายเซ็นไม่ถูกต้อง' });
}
```

---

## 🟢 Low — แนะนำให้แก้ไข

### [VULN-10] ไม่มี Security Headers (helmet.js)
**ไฟล์:** [`server.js`](file:///d:/PDPA%20req/server.js)  
**ประเภท:** Missing Security Headers

**Headers ที่ขาดไป:** `X-Frame-Options`, `X-Content-Type-Options`, `Content-Security-Policy`, `Strict-Transport-Security`

**ทดสอบ:**
```bash
curl -I http://localhost:3001/api/auth/me
# ดู response headers — ถ้าไม่เห็น X-Frame-Options และ X-Content-Type-Options = มีช่องโหว่ Clickjacking
```

**วิธีแก้:**
```bash
npm install helmet
```
```js
import helmet from 'helmet';
app.use(helmet()); // เพิ่มบรรทัดเดียวป้องกันได้หลาย headers
```

---

### [VULN-11] Checksum ใน Audit Log ไม่ผูกกับ Data
**ไฟล์:** [`middleware/auth.middleware.js:70`](file:///d:/PDPA%20req/middleware/auth.middleware.js#L70)  
**ประเภท:** Weak Integrity Check

**โค้ดที่มีปัญหา:**
```js
const checksum = Math.abs(Date.now() % 1000000).toString(16);
```

**ผลกระทบ:** Checksum ไม่ได้คำนวณจาก data ของ log entry — log สามารถถูกแก้ไขโดยไม่ตรวจพบ

**วิธีแก้:**
```js
import crypto from 'crypto';
const checksum = crypto.createHmac('sha256', process.env.AUDIT_SECRET || JWT_SECRET)
  .update(`${logId}|${actorId}|${action}|${timestamp}`)
  .digest('hex')
  .substring(0, 16);
```

---

## 📋 แผนซ้อมโจมตี (Attack Simulation Plan)

### Phase 1: Authentication & MFA Bypass
```bash
# [VULN-01] ทดสอบ Fallback OTP — ปิด SMTP แล้ว login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"anyuser","password":"correct_password","mfaCode":"123456"}'

# [VULN-02] ทดสอบ Stack Trace disclosure
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":null,"password":null}'
```

### Phase 2: Rate Limit & Lockout Testing
```bash
# [VULN-03] ทดสอบ Brute Force Login — ต้องได้ 429 หลัง 10 ครั้ง
for i in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"admin\",\"password\":\"wrong$i\"}")
  echo "Attempt $i: HTTP $code"
done

# [VULN-07] ทดสอบ OTP Brute Force
for otp in 100000 200000 300000; do
  curl -s -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"user\",\"password\":\"pass\",\"mfaCode\":\"$otp\"}"
done
```

### Phase 3: Authorization & Exposure Testing
```bash
# [VULN-05] ทดสอบ Token ใน URL — ตรวจ access log ว่ามี token หรือไม่
curl "http://localhost:3001/api/auth/me?token=YOUR_JWT_TOKEN"
cat /var/log/nginx/access.log | grep "token="

# [VULN-10] ทดสอบ Security Headers
curl -I http://localhost:3001/ | grep -E "X-Frame|X-Content|Content-Security"
```

---

## ✅ Priority Fix List

| ลำดับ | VULN | การแก้ไข | ความยาก | ก่อน Prod? |
|-------|------|----------|---------|-----------|
| 1 | VULN-01 | Block login เมื่อ SMTP fail | ⭐ ง่าย | ✅ ต้อง |
| 2 | VULN-02 | ซ่อน Stack Trace ใน production | ⭐ ง่าย | ✅ ต้อง |
| 3 | VULN-10 | ติดตั้ง `helmet.js` | ⭐ ง่าย | ✅ ต้อง |
| 4 | VULN-05 | ลบ token จาก query string | ⭐ ง่าย | ✅ ต้อง |
| 5 | VULN-03 | ติดตั้ง `express-rate-limit` | ⭐⭐ ปานกลาง | ✅ ต้อง |
| 6 | VULN-04 | เพิ่ม Account Lockout | ⭐⭐ ปานกลาง | ✅ ต้อง |
| 7 | VULN-07 | จำกัดครั้งลอง OTP | ⭐⭐ ปานกลาง | ✅ ต้อง |
| 8 | VULN-09 | Validate Signature Image | ⭐ ง่าย | 🟡 แนะนำ |
| 9 | VULN-08 | แยก Body Limit ตาม Route | ⭐ ง่าย | 🟡 แนะนำ |
| 10 | VULN-11 | HMAC Checksum ใน Audit Log | ⭐⭐ ปานกลาง | 🟡 แนะนำ |
| 11 | VULN-06 | Refresh Token Pattern | ⭐⭐⭐ ยาก | 🟢 ระยะยาว |

> [!CAUTION]
> **Backdoor Password (`Num.1970`, `12345678`)** ใน [`auth.routes.js:64`](file:///d:/PDPA%20req/routes/auth.routes.js#L64) — เจตนาไว้ช่วงทดสอบ **ต้องลบออกก่อน deploy Production ทุกครั้งโดยเด็ดขาด**
