// services/workflow.seed.js
// Seeds all 25 PDPA workflow states and their allowed transitions into PostgreSQL
// Run once during initDatabase() — uses INSERT ... ON CONFLICT DO NOTHING for idempotency

/**
 * All 25 PDPA request statuses with Thai/English labels, colors, and terminal flags
 */
const WORKFLOW_STATES = [
  { name: 'Draft',                              label_th: 'ร่าง',                                    label_en: 'Draft',                              color: 'gray',   is_terminal: false, sort_order: 1  },
  { name: 'Submitted',                          label_th: 'ยื่นคำขอแล้ว',                            label_en: 'Submitted',                          color: 'blue',   is_terminal: false, sort_order: 2  },
  { name: 'Received',                           label_th: 'รับเรื่องแล้ว',                           label_en: 'Received',                           color: 'blue',   is_terminal: false, sort_order: 3  },
  { name: 'Identity Verification',              label_th: 'ตรวจสอบตัวตน',                            label_en: 'Identity Verification',              color: 'yellow', is_terminal: false, sort_order: 4  },
  { name: 'Awaiting Identity Evidence',         label_th: 'รอหลักฐานยืนยันตัวตน',                   label_en: 'Awaiting Identity Evidence',         color: 'orange', is_terminal: false, sort_order: 5  },
  { name: 'Completeness Review',                label_th: 'ตรวจสอบความสมบูรณ์',                    label_en: 'Completeness Review',                color: 'yellow', is_terminal: false, sort_order: 6  },
  { name: 'Awaiting Additional Information',    label_th: 'รอข้อมูลเพิ่มเติม',                      label_en: 'Awaiting Additional Information',    color: 'orange', is_terminal: false, sort_order: 7  },
  { name: 'Documents Verified',                 label_th: 'เอกสารครบถ้วน',                          label_en: 'Documents Verified',                 color: 'teal',   is_terminal: false, sort_order: 8  },
  { name: 'Assigned',                           label_th: 'มอบหมายงานแล้ว',                         label_en: 'Assigned',                           color: 'teal',   is_terminal: false, sort_order: 9  },
  { name: 'Data Collection',                    label_th: 'รวบรวมข้อมูล',                            label_en: 'Data Collection',                    color: 'indigo', is_terminal: false, sort_order: 10 },
  { name: 'Data Owner Review',                  label_th: 'เจ้าของข้อมูลพิจารณา',                   label_en: 'Data Owner Review',                  color: 'indigo', is_terminal: false, sort_order: 11 },
  { name: 'DPO or Legal Review',                label_th: 'DPO/กฎหมายพิจารณา',                      label_en: 'DPO or Legal Review',                color: 'purple', is_terminal: false, sort_order: 12 },
  { name: 'Redaction Required',                 label_th: 'ต้องปิดบังข้อมูล',                       label_en: 'Redaction Required',                 color: 'purple', is_terminal: false, sort_order: 13 },
  { name: 'Executive Approval',                 label_th: 'รออนุมัติผู้บริหาร',                     label_en: 'Executive Approval',                 color: 'violet', is_terminal: false, sort_order: 14 },
  { name: 'Approval Pending',                   label_th: 'รอการอนุมัติ',                            label_en: 'Approval Pending',                   color: 'violet', is_terminal: false, sort_order: 15 },
  { name: 'Fee Notification',                   label_th: 'แจ้งค่าใช้จ่าย',                         label_en: 'Fee Notification',                   color: 'amber',  is_terminal: false, sort_order: 16 },
  { name: 'Awaiting Payment',                   label_th: 'รอชำระเงิน',                              label_en: 'Awaiting Payment',                   color: 'amber',  is_terminal: false, sort_order: 17 },
  { name: 'Approved',                           label_th: 'อนุมัติแล้ว',                             label_en: 'Approved',                           color: 'green',  is_terminal: false, sort_order: 18 },
  { name: 'Partially Approved',                 label_th: 'อนุมัติบางส่วน',                         label_en: 'Partially Approved',                 color: 'green',  is_terminal: false, sort_order: 19 },
  { name: 'Denied',                             label_th: 'ปฏิเสธ',                                  label_en: 'Denied',                             color: 'red',    is_terminal: false, sort_order: 20 },
  { name: 'No Data Found',                      label_th: 'ไม่พบข้อมูล',                             label_en: 'No Data Found',                      color: 'red',    is_terminal: false, sort_order: 21 },
  { name: 'Ready for Delivery',                 label_th: 'พร้อมส่งมอบ',                             label_en: 'Ready for Delivery',                 color: 'cyan',   is_terminal: false, sort_order: 22 },
  { name: 'Delivered',                          label_th: 'ส่งมอบแล้ว',                              label_en: 'Delivered',                          color: 'cyan',   is_terminal: false, sort_order: 23 },
  { name: 'Receipt Confirmed',                  label_th: 'ยืนยันรับแล้ว',                          label_en: 'Receipt Confirmed',                  color: 'green',  is_terminal: true,  sort_order: 24 },
  { name: 'Withdrawn',                          label_th: 'ถอนคำขอ',                                 label_en: 'Withdrawn',                          color: 'gray',   is_terminal: true,  sort_order: 25 },
  { name: 'Disposed for Incomplete Information',label_th: 'ยุติเหตุข้อมูลไม่ครบ',                  label_en: 'Disposed for Incomplete Information',color: 'gray',   is_terminal: true,  sort_order: 26 },
  { name: 'Closed',                             label_th: 'ปิดคำขอ',                                 label_en: 'Closed',                             color: 'gray',   is_terminal: true,  sort_order: 27 },
  { name: 'Legal Hold',                         label_th: 'ระงับทางกฎหมาย',                         label_en: 'Legal Hold',                         color: 'red',    is_terminal: false, sort_order: 28 },
  { name: 'Archived',                           label_th: 'จัดเก็บ',                                 label_en: 'Archived',                           color: 'gray',   is_terminal: true,  sort_order: 29 },
  { name: 'Destroyed',                          label_th: 'ทำลายแล้ว',                               label_en: 'Destroyed',                          color: 'gray',   is_terminal: true,  sort_order: 30 },
];

/**
 * Workflow transition rules:
 * from_state → to_state | allowed_roles | requires_comment | auto_notify
 *
 * Role keys: 'superadmin', 'admin', 'intake', 'dpo', 'owner', 'approver', 'auditor'
 * Empty allowed_roles array = any authenticated user can transition
 */
const WORKFLOW_TRANSITIONS = [
  // ── Intake Flow ──────────────────────────────────────────────────
  { from: 'Submitted',                          to: 'Received',                           roles: ['intake','admin','superadmin'],          comment: false, notify: true  },
  { from: 'Received',                           to: 'Identity Verification',              roles: ['intake','admin','superadmin'],          comment: false, notify: true  },
  { from: 'Identity Verification',              to: 'Awaiting Identity Evidence',         roles: ['intake','admin','superadmin'],          comment: true,  notify: true  },
  { from: 'Identity Verification',              to: 'Completeness Review',                roles: ['intake','admin','superadmin'],          comment: false, notify: false },
  { from: 'Awaiting Identity Evidence',         to: 'Identity Verification',              roles: ['intake','admin','superadmin'],          comment: false, notify: false },
  { from: 'Awaiting Identity Evidence',         to: 'Disposed for Incomplete Information',roles: ['intake','admin','superadmin'],          comment: true,  notify: true  },
  { from: 'Completeness Review',                to: 'Awaiting Additional Information',    roles: ['intake','admin','superadmin'],          comment: true,  notify: true  },
  { from: 'Completeness Review',                to: 'Documents Verified',                 roles: ['intake','admin','superadmin'],          comment: false, notify: true  },
  { from: 'Awaiting Additional Information',    to: 'Completeness Review',                roles: ['intake','admin','superadmin'],          comment: false, notify: false },
  { from: 'Awaiting Additional Information',    to: 'Disposed for Incomplete Information',roles: ['intake','admin','superadmin'],          comment: true,  notify: true  },

  // ── Assignment & Collection ──────────────────────────────────────
  { from: 'Documents Verified',                 to: 'Assigned',                           roles: ['admin','superadmin'],                  comment: false, notify: true  },
  { from: 'Assigned',                           to: 'Data Collection',                    roles: ['admin','owner','superadmin'],          comment: false, notify: false },
  { from: 'Data Collection',                    to: 'Data Owner Review',                  roles: ['owner','admin','superadmin'],          comment: false, notify: false },

  // ── Review Flow ──────────────────────────────────────────────────
  { from: 'Data Owner Review',                  to: 'DPO or Legal Review',                roles: ['owner','admin','superadmin'],          comment: false, notify: true  },
  { from: 'Data Owner Review',                  to: 'Redaction Required',                 roles: ['owner','admin','superadmin'],          comment: true,  notify: false },
  { from: 'DPO or Legal Review',                to: 'Redaction Required',                 roles: ['dpo','admin','superadmin'],            comment: true,  notify: false },
  { from: 'DPO or Legal Review',                to: 'Executive Approval',                 roles: ['dpo','admin','superadmin'],            comment: false, notify: true  },
  { from: 'DPO or Legal Review',                to: 'Approval Pending',                   roles: ['dpo','admin','superadmin'],            comment: false, notify: false },
  { from: 'DPO or Legal Review',                to: 'Denied',                             roles: ['dpo','admin','superadmin'],            comment: true,  notify: true  },
  { from: 'DPO or Legal Review',                to: 'No Data Found',                      roles: ['dpo','admin','superadmin'],            comment: true,  notify: true  },
  { from: 'Redaction Required',                 to: 'DPO or Legal Review',                roles: ['dpo','admin','superadmin'],            comment: false, notify: false },
  { from: 'Redaction Required',                 to: 'Approval Pending',                   roles: ['dpo','admin','superadmin'],            comment: false, notify: false },

  // ── Approval Flow ────────────────────────────────────────────────
  { from: 'Executive Approval',                 to: 'Approved',                           roles: ['approver','superadmin'],               comment: false, notify: true  },
  { from: 'Executive Approval',                 to: 'Partially Approved',                 roles: ['approver','superadmin'],               comment: true,  notify: true  },
  { from: 'Executive Approval',                 to: 'Denied',                             roles: ['approver','superadmin'],               comment: true,  notify: true  },
  { from: 'Approval Pending',                   to: 'Approved',                           roles: ['approver','dpo','admin','superadmin'], comment: false, notify: true  },
  { from: 'Approval Pending',                   to: 'Partially Approved',                 roles: ['approver','dpo','admin','superadmin'], comment: true,  notify: true  },
  { from: 'Approval Pending',                   to: 'Denied',                             roles: ['approver','dpo','admin','superadmin'], comment: true,  notify: true  },

  // ── Fee Flow (Optional) ──────────────────────────────────────────
  { from: 'Approved',                           to: 'Fee Notification',                   roles: ['intake','admin','superadmin'],          comment: false, notify: true  },
  { from: 'Approved',                           to: 'Ready for Delivery',                 roles: ['intake','admin','superadmin'],          comment: false, notify: true  },
  { from: 'Partially Approved',                 to: 'Fee Notification',                   roles: ['intake','admin','superadmin'],          comment: false, notify: true  },
  { from: 'Partially Approved',                 to: 'Ready for Delivery',                 roles: ['intake','admin','superadmin'],          comment: false, notify: true  },
  { from: 'Fee Notification',                   to: 'Awaiting Payment',                   roles: ['intake','admin','superadmin'],          comment: false, notify: true  },
  { from: 'Awaiting Payment',                   to: 'Ready for Delivery',                 roles: ['intake','admin','superadmin'],          comment: false, notify: true  },

  // ── Delivery Flow ────────────────────────────────────────────────
  { from: 'Ready for Delivery',                 to: 'Delivered',                          roles: ['intake','admin','superadmin'],          comment: false, notify: true  },
  { from: 'Delivered',                          to: 'Receipt Confirmed',                  roles: ['intake','admin','superadmin'],          comment: false, notify: false },
  { from: 'Receipt Confirmed',                  to: 'Closed',                             roles: ['admin','superadmin'],                  comment: false, notify: false },

  // ── Terminal Outcomes ────────────────────────────────────────────
  { from: 'Denied',                             to: 'Closed',                             roles: ['admin','superadmin'],                  comment: false, notify: true  },
  { from: 'No Data Found',                      to: 'Closed',                             roles: ['admin','superadmin'],                  comment: false, notify: true  },

  // ── Special: Withdraw (any stage) ───────────────────────────────
  { from: 'Submitted',                          to: 'Withdrawn',                          roles: ['intake','admin','superadmin'],          comment: true,  notify: true  },
  { from: 'Received',                           to: 'Withdrawn',                          roles: ['intake','admin','superadmin'],          comment: true,  notify: true  },
  { from: 'Identity Verification',              to: 'Withdrawn',                          roles: ['intake','admin','superadmin'],          comment: true,  notify: true  },
  { from: 'Completeness Review',                to: 'Withdrawn',                          roles: ['intake','admin','superadmin'],          comment: true,  notify: true  },
  { from: 'Documents Verified',                 to: 'Withdrawn',                          roles: ['intake','admin','superadmin'],          comment: true,  notify: true  },
  { from: 'Data Collection',                    to: 'Withdrawn',                          roles: ['admin','superadmin'],                  comment: true,  notify: true  },

  // ── Archive & Destroy ────────────────────────────────────────────
  { from: 'Closed',                             to: 'Archived',                           roles: ['admin','superadmin'],                  comment: false, notify: false },
  { from: 'Archived',                           to: 'Destroyed',                          roles: ['superadmin'],                          comment: true,  notify: false },

  // ── Legal Hold (can be applied from many states) ─────────────────
  { from: 'Data Collection',                    to: 'Legal Hold',                         roles: ['dpo','admin','superadmin'],            comment: true,  notify: false },
  { from: 'Data Owner Review',                  to: 'Legal Hold',                         roles: ['dpo','admin','superadmin'],            comment: true,  notify: false },
  { from: 'DPO or Legal Review',                to: 'Legal Hold',                         roles: ['dpo','admin','superadmin'],            comment: true,  notify: false },
  { from: 'Approved',                           to: 'Legal Hold',                         roles: ['dpo','admin','superadmin'],            comment: true,  notify: false },
  { from: 'Legal Hold',                         to: 'DPO or Legal Review',                roles: ['dpo','admin','superadmin'],            comment: true,  notify: false },
  { from: 'Legal Hold',                         to: 'Closed',                             roles: ['superadmin'],                          comment: true,  notify: false },
];

/**
 * Run the workflow seed — idempotent via ON CONFLICT DO NOTHING
 * @param {import('pg').Pool} dbPool
 */
export async function seedWorkflowData(dbPool) {
  try {
    // Seed states
    for (const state of WORKFLOW_STATES) {
      await dbPool.query(
        `INSERT INTO workflow_states (name, label_th, label_en, color, is_terminal, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (name) DO NOTHING`,
        [state.name, state.label_th, state.label_en, state.color, state.is_terminal, state.sort_order]
      );
    }

    // Seed transitions — insert only if not already present
    for (const t of WORKFLOW_TRANSITIONS) {
      await dbPool.query(
        `INSERT INTO workflow_transitions (from_state, to_state, allowed_roles, requires_comment, auto_notify)
         SELECT $1::VARCHAR(50), $2::VARCHAR(50), $3::JSONB, $4::BOOLEAN, $5::BOOLEAN
         WHERE NOT EXISTS (
           SELECT 1 FROM workflow_transitions WHERE from_state = $1 AND to_state = $2
         )`,
        [t.from, t.to, JSON.stringify(t.roles), t.comment, t.notify]
      );
    }

    console.log(`✅ Workflow seeded: ${WORKFLOW_STATES.length} states, ${WORKFLOW_TRANSITIONS.length} transitions`);
  } catch (err) {
    console.error('❌ Workflow seed error:', err.message);
  }
}
