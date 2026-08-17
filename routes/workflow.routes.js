// routes/workflow.routes.js
// ERPNext-inspired Workflow Engine API
// Manages workflow_states and workflow_transitions tables
// Provides endpoints for Admin UI and frontend hints

import express from 'express';
import { refreshTransitionCache, getAvailableTransitions, checkTransitionAllowed } from '../middleware/workflow.middleware.js';

export function createWorkflowRouter(dbPool, authenticateJWT, requireRole) {
  const router = express.Router();

  // ─────────────────────────────────────────────
  // GET /api/workflow/states
  // List all workflow states (all authenticated users)
  // ─────────────────────────────────────────────
  router.get('/states', authenticateJWT, async (req, res) => {
    try {
      const { rows } = await dbPool.query(
        'SELECT * FROM workflow_states ORDER BY sort_order, id'
      );
      res.json({ success: true, states: rows });
    } catch (err) {
      console.error('GET /api/workflow/states error:', err);
      res.status(500).json({ success: false, message: 'ไม่สามารถโหลดสถานะ Workflow ได้' });
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/workflow/states
  // Create a new workflow state (admin/superadmin only)
  // ─────────────────────────────────────────────
  router.post('/states', authenticateJWT, requireRole(['admin', 'superadmin']), async (req, res) => {
    try {
      const { name, label_th, label_en, color, is_terminal, sort_order } = req.body;

      if (!name || !label_th || !label_en) {
        return res.status(400).json({
          success: false,
          message: 'กรุณากรอก name, label_th, label_en'
        });
      }

      const { rows } = await dbPool.query(
        `INSERT INTO workflow_states (name, label_th, label_en, color, is_terminal, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name, label_th, label_en, color || 'gray', is_terminal || false, sort_order || 0]
      );

      res.json({ success: true, state: rows[0] });
    } catch (err) {
      if (err.code === '23505') { // Unique violation
        return res.status(409).json({ success: false, message: `สถานะ "${req.body.name}" มีอยู่แล้วในระบบ` });
      }
      console.error('POST /api/workflow/states error:', err);
      res.status(500).json({ success: false, message: 'ไม่สามารถเพิ่มสถานะใหม่ได้' });
    }
  });

  // ─────────────────────────────────────────────
  // PUT /api/workflow/states/:name
  // Update an existing workflow state
  // ─────────────────────────────────────────────
  router.put('/states/:name', authenticateJWT, requireRole(['admin', 'superadmin']), async (req, res) => {
    try {
      const { name } = req.params;
      const { label_th, label_en, color, is_terminal, sort_order } = req.body;

      const { rows } = await dbPool.query(
        `UPDATE workflow_states
         SET label_th = COALESCE($1, label_th),
             label_en = COALESCE($2, label_en),
             color    = COALESCE($3, color),
             is_terminal = COALESCE($4, is_terminal),
             sort_order  = COALESCE($5, sort_order)
         WHERE name = $6
         RETURNING *`,
        [label_th, label_en, color, is_terminal, sort_order, name]
      );

      if (!rows.length) {
        return res.status(404).json({ success: false, message: `ไม่พบสถานะ "${name}"` });
      }

      res.json({ success: true, state: rows[0] });
    } catch (err) {
      console.error('PUT /api/workflow/states/:name error:', err);
      res.status(500).json({ success: false, message: 'ไม่สามารถแก้ไขสถานะได้' });
    }
  });

  // ─────────────────────────────────────────────
  // DELETE /api/workflow/states/:name
  // Delete a state (only if no transitions reference it)
  // ─────────────────────────────────────────────
  router.delete('/states/:name', authenticateJWT, requireRole(['superadmin']), async (req, res) => {
    try {
      const { name } = req.params;

      // Safety check: ensure no transitions reference this state
      const { rows: deps } = await dbPool.query(
        'SELECT COUNT(*) as count FROM workflow_transitions WHERE from_state = $1 OR to_state = $1',
        [name]
      );

      if (parseInt(deps[0].count) > 0) {
        return res.status(409).json({
          success: false,
          message: `ไม่สามารถลบสถานะ "${name}" ได้ เนื่องจากยังมี Transition ที่อ้างอิงอยู่ ${deps[0].count} รายการ`
        });
      }

      await dbPool.query('DELETE FROM workflow_states WHERE name = $1', [name]);
      res.json({ success: true, message: `ลบสถานะ "${name}" เรียบร้อยแล้ว` });
    } catch (err) {
      console.error('DELETE /api/workflow/states/:name error:', err);
      res.status(500).json({ success: false, message: 'ไม่สามารถลบสถานะได้' });
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/workflow/transitions
  // List all transitions (admin/superadmin)
  // ─────────────────────────────────────────────
  router.get('/transitions', authenticateJWT, requireRole(['admin', 'superadmin', 'dpo', 'auditor']), async (req, res) => {
    try {
      const { rows } = await dbPool.query(
        'SELECT * FROM workflow_transitions ORDER BY id'
      );
      res.json({ success: true, transitions: rows });
    } catch (err) {
      console.error('GET /api/workflow/transitions error:', err);
      res.status(500).json({ success: false, message: 'ไม่สามารถโหลด Transitions ได้' });
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/workflow/transitions
  // Create a new transition rule
  // ─────────────────────────────────────────────
  router.post('/transitions', authenticateJWT, requireRole(['admin', 'superadmin']), async (req, res) => {
    try {
      const { from_state, to_state, allowed_roles, requires_comment, auto_notify } = req.body;

      if (!from_state || !to_state) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาระบุ from_state และ to_state'
        });
      }

      const { rows } = await dbPool.query(
        `INSERT INTO workflow_transitions (from_state, to_state, allowed_roles, requires_comment, auto_notify)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          from_state,
          to_state,
          allowed_roles || [],
          requires_comment ?? false,
          auto_notify ?? true
        ]
      );

      // Invalidate cache so next request picks up new rule
      await refreshTransitionCache(dbPool);

      res.json({ success: true, transition: rows[0] });
    } catch (err) {
      console.error('POST /api/workflow/transitions error:', err);
      res.status(500).json({ success: false, message: 'ไม่สามารถเพิ่ม Transition ได้' });
    }
  });

  // ─────────────────────────────────────────────
  // PUT /api/workflow/transitions/:id
  // Update a transition rule
  // ─────────────────────────────────────────────
  router.put('/transitions/:id', authenticateJWT, requireRole(['admin', 'superadmin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { allowed_roles, requires_comment, auto_notify } = req.body;

      const { rows } = await dbPool.query(
        `UPDATE workflow_transitions
         SET allowed_roles    = COALESCE($1, allowed_roles),
             requires_comment = COALESCE($2, requires_comment),
             auto_notify      = COALESCE($3, auto_notify)
         WHERE id = $4
         RETURNING *`,
        [allowed_roles, requires_comment, auto_notify, id]
      );

      if (!rows.length) {
        return res.status(404).json({ success: false, message: 'ไม่พบ Transition ที่ต้องการแก้ไข' });
      }

      await refreshTransitionCache(dbPool);
      res.json({ success: true, transition: rows[0] });
    } catch (err) {
      console.error('PUT /api/workflow/transitions/:id error:', err);
      res.status(500).json({ success: false, message: 'ไม่สามารถแก้ไข Transition ได้' });
    }
  });

  // ─────────────────────────────────────────────
  // DELETE /api/workflow/transitions/:id
  // Delete a transition rule
  // ─────────────────────────────────────────────
  router.delete('/transitions/:id', authenticateJWT, requireRole(['admin', 'superadmin']), async (req, res) => {
    try {
      const { id } = req.params;
      const result = await dbPool.query('DELETE FROM workflow_transitions WHERE id = $1', [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'ไม่พบ Transition ที่ต้องการลบ' });
      }
      await refreshTransitionCache(dbPool);
      res.json({ success: true, message: 'ลบ Transition เรียบร้อยแล้ว' });
    } catch (err) {
      console.error('DELETE /api/workflow/transitions/:id error:', err);
      res.status(500).json({ success: false, message: 'ไม่สามารถลบ Transition ได้' });
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/workflow/available-transitions/:requestId
  // Get all transitions available FROM the current request status
  // for the current user's role — used by frontend to render buttons
  // ─────────────────────────────────────────────
  router.get('/available-transitions/:requestId', authenticateJWT, async (req, res) => {
    try {
      const { requestId } = req.params;
      const userRole = req.user?.role;

      let query = "SELECT status FROM requests WHERE id = $1";
      let params = [requestId];

      if (req.user.role !== 'superadmin') {
        query += " AND org_id = $2";
        params.push(req.user.orgId);
      }

      const { rows } = await dbPool.query(query, params);

      if (!rows.length) {
        return res.status(404).json({ success: false, message: 'ไม่พบคำขอ' });
      }

      const currentStatus = rows[0].status;
      const available = getAvailableTransitions(currentStatus, userRole);

      res.json({
        success: true,
        currentStatus,
        available
      });
    } catch (err) {
      console.error('GET /api/workflow/available-transitions error:', err);
      res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูล Transitions ได้' });
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/workflow/refresh-cache
  // Force refresh the transition cache (admin tool)
  // ─────────────────────────────────────────────
  router.post('/refresh-cache', authenticateJWT, requireRole(['admin', 'superadmin']), async (req, res) => {
    try {
      await refreshTransitionCache(dbPool);
      res.json({ success: true, message: 'Workflow cache refreshed successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Cache refresh failed' });
    }
  });

  return router;
}
