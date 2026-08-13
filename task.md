# Task List — Blueprint 2-Week Sprint

## สัปดาห์ที่ 1: Foundation & Backend

### Day 1-2: Workflow Engine
- [x] สร้าง `routes/workflow.routes.js` — CRUD API สำหรับ states/transitions
- [x] สร้าง `middleware/workflow.middleware.js` — validateTransition() Strict Mode
- [x] เพิ่ม DB migration: `workflow_states` และ `workflow_transitions` ใน server.js
- [x] Seed ข้อมูลสถานะทั้ง 25 สถานะลง DB พร้อม transitions

### Day 3: Field-Level Permission
- [x] สร้าง `middleware/fieldPermissions.js`
- [x] ใช้งาน applyFieldPermissions() ใน GET /api/requests และ public endpoints

### Day 4-5: server.js Module Split (Gradual — Services First)
- [x] สร้าง `services/email.service.js` — ย้าย nodemailer/email logic
- [x] สร้าง `services/sla.service.js` — ย้าย SLA calculation logic
- [x] สร้าง `services/pdf.service.js` — ย้าย PDF generation
- [x] สร้าง `routes/auth.routes.js`
- [x] สร้าง `routes/users.routes.js`
- [x] เชื่อมต่อและย้ายการใช้งานใน `server.js` (mount routers + update service calls)

## สัปดาห์ที่ 2: Frontend & Analytics

### Day 6-7: Partial Loading API
- [x] เพิ่ม GET /api/requests/:id/header
- [x] เพิ่ม GET /api/requests/:id/tasks
- [x] เพิ่ม GET /api/requests/:id/timeline
- [x] เพิ่ม GET /api/requests/:id/decision

### Day 8-9: DPO Analytics Dashboard
- [ ] สร้าง `routes/reports.routes.js` — summary + sla-breach endpoints
- [ ] สร้าง `src/components/DPOAnalyticsDashboard.tsx`
- [ ] Dual scope: DPO เห็น org ตัวเอง, SuperAdmin เห็นทุก org

### Day 10-12: Workflow Admin UI
- [ ] สร้าง WorkflowAdminPanel component ใน super-admin-app
- [ ] CRUD สำหรับ workflow_states
- [ ] CRUD สำหรับ workflow_transitions พร้อม role mapping

### Day 13-14: Testing & Deployment
- [ ] Regression test ทุก 46 API endpoints
- [ ] Smoke test workflow: Submitted → Delivered
- [ ] Deploy + DB migration บน production
- [ ] อัปเดต SETUP_NEW_PC.md
