// middleware/workflow.middleware.js
// ERPNext-inspired Workflow State Machine — Strict Mode
// Validates that a status transition is allowed for the current user's role
// Decision: STRICT — illegal transitions are BLOCKED (not just warned)

/**
 * Cache for workflow transitions loaded from DB.
 * Refreshed every 5 minutes to avoid DB hits on every request.
 */
let transitionCache = [];
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch transitions from DB into in-memory cache
 * @param {import('pg').Pool} dbPool
 */
export async function refreshTransitionCache(dbPool) {
  try {
    const { rows } = await dbPool.query(
      'SELECT from_state, to_state, allowed_roles, requires_comment, auto_notify FROM workflow_transitions ORDER BY id'
    );
    transitionCache = rows;
    cacheLoadedAt = Date.now();
    console.log(`✅ Workflow transition cache refreshed: ${rows.length} transitions loaded`);
  } catch (err) {
    console.error('❌ Failed to refresh workflow transition cache:', err.message);
  }
}

/**
 * Ensure cache is fresh, reload if expired
 * @param {import('pg').Pool} dbPool
 */
async function ensureCacheFresh(dbPool) {
  if (Date.now() - cacheLoadedAt > CACHE_TTL_MS) {
    await refreshTransitionCache(dbPool);
  }
}

/**
 * Factory function — returns Express middleware that validates a workflow transition.
 * Usage in route: router.post('/change-status', validateTransition(dbPool), handler)
 *
 * Expects req.body to contain: { newStatus: string }
 * Expects req.user to contain: { role: string }
 * Expects the current request status to be fetchable from DB by :id param
 *
 * @param {import('pg').Pool} dbPool
 */
export function validateTransition(dbPool) {
  return async (req, res, next) => {
    try {
      await ensureCacheFresh(dbPool);

      const { id } = req.params;
      const { newStatus, comment } = req.body;
      const userRole = req.user?.role;

      if (!newStatus) {
        return res.status(400).json({
          success: false,
          message: 'Workflow validation failed: newStatus is required'
        });
      }

      // Fetch current status from DB
      const { rows } = await dbPool.query(
        "SELECT status, data->>'status' as json_status FROM requests WHERE id = $1",
        [id]
      );

      if (!rows.length) {
        return res.status(404).json({ success: false, message: 'Request not found' });
      }

      const currentStatus = rows[0].status || rows[0].json_status;

      // Find matching transition rule
      const rule = transitionCache.find(
        t => t.from_state === currentStatus && t.to_state === newStatus
      );

      // STRICT MODE: no matching rule = blocked
      if (!rule) {
        return res.status(422).json({
          success: false,
          code: 'INVALID_TRANSITION',
          message: `ไม่อนุญาตให้เปลี่ยนสถานะจาก "${currentStatus}" ไปยัง "${newStatus}"`,
          detail: `ไม่พบกฎ Workflow ที่รองรับการเปลี่ยนแปลงนี้ กรุณาติดต่อ Admin เพื่อกำหนดค่า`
        });
      }

      // Check role permission (superadmin bypasses all)
      const allowedRoles = rule.allowed_roles || [];
      if (userRole !== 'superadmin' && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          code: 'ROLE_NOT_PERMITTED',
          message: `บทบาท "${userRole}" ไม่มีสิทธิ์เปลี่ยนสถานะจาก "${currentStatus}" ไปยัง "${newStatus}"`,
          detail: `บทบาทที่อนุญาต: ${allowedRoles.join(', ')}`
        });
      }

      // Check comment requirement
      if (rule.requires_comment && (!comment || comment.trim() === '')) {
        return res.status(400).json({
          success: false,
          code: 'COMMENT_REQUIRED',
          message: `การเปลี่ยนสถานะ "${currentStatus}" → "${newStatus}" ต้องระบุเหตุผล/ความเห็นประกอบ`
        });
      }

      // Attach transition rule metadata to request for downstream use
      req.workflowTransition = {
        fromStatus: currentStatus,
        toStatus: newStatus,
        autoNotify: rule.auto_notify,
        requiresComment: rule.requires_comment
      };

      next();
    } catch (err) {
      console.error('❌ Workflow validation error:', err);
      res.status(500).json({
        success: false,
        message: 'ระบบตรวจสอบ Workflow เกิดข้อผิดพลาด กรุณาลองใหม่'
      });
    }
  };
}

/**
 * Check if a transition is valid without blocking (used for frontend hint generation)
 * Returns { allowed: boolean, reason?: string }
 */
export function checkTransitionAllowed(fromStatus, toStatus, userRole) {
  const rule = transitionCache.find(
    t => t.from_state === fromStatus && t.to_state === toStatus
  );

  if (!rule) {
    return { allowed: false, reason: 'ไม่พบกฎ Workflow สำหรับการเปลี่ยนแปลงนี้' };
  }

  const allowedRoles = rule.allowed_roles || [];
  if (userRole !== 'superadmin' && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return { allowed: false, reason: `ต้องการบทบาท: ${allowedRoles.join(', ')}` };
  }

  return { allowed: true, requiresComment: rule.requires_comment, autoNotify: rule.auto_notify };
}

/**
 * Get all transitions available from a specific state for a given role
 * Used by frontend to show only valid "next status" buttons
 */
export function getAvailableTransitions(fromStatus, userRole) {
  return transitionCache
    .filter(t => {
      if (t.from_state !== fromStatus) return false;
      const allowedRoles = t.allowed_roles || [];
      if (userRole === 'superadmin') return true;
      return allowedRoles.length === 0 || allowedRoles.includes(userRole);
    })
    .map(t => ({
      toStatus: t.to_state,
      requiresComment: t.requires_comment,
      autoNotify: t.auto_notify
    }));
}
