// routes/users.routes.js
// ERPNext-inspired User Management Module
// Handles user CRUD operations, role assignments, and department mapping.

import express from 'express';
import bcrypt from 'bcryptjs';

export function createUsersRouter(dbPool, authenticateJWT, requireRole) {
  const router = express.Router();

  // ─────────────────────────────────────────────
  // GET /api/users
  // List all users except superadmin
  // ─────────────────────────────────────────────
  router.get('/', authenticateJWT, async (req, res) => {
    try {
      let query = 'SELECT id, org_id, username, full_name_th as "fullName", full_name_th as "fullNameTh", full_name_en as "fullNameEn", email, role, roles, department FROM users WHERE role != $1';
      let params = ['superadmin'];
      if (process.env.SYSTEM_MODE === 'SINGLE_NODE') {
        query += ' AND org_id = $2';
        params.push('default-tenant');
      } else if (req.user.role !== 'superadmin') {
        query += ' AND org_id = $2';
        params.push(req.user.orgId);
      }
      query += ' ORDER BY created_at ASC';
      const { rows } = await dbPool.query(query, params);
      res.json({
        success: true,
        users: rows.map(r => ({
          ...r,
          orgId: r.org_id,
          roles: (r.roles && Array.isArray(r.roles) && r.roles.length > 0) ? r.roles : [r.role]
        }))
      });
    } catch (err) {
      console.error('Error fetching users:', err);
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/users
  // Create a new staff user (Admin only)
  // ─────────────────────────────────────────────
  router.post('/', authenticateJWT, requireRole(['admin']), async (req, res) => {
    const { id, orgId, username, fullName, fullNameEn, email, role, roles, department, password } = req.body;
    try {
      if (role === 'superadmin' || (roles && roles.includes('superadmin'))) {
        return res.status(403).json({ success: false, message: 'ไม่อนุญาตให้กำหนดสิทธิ์ superadmin' });
      }
      let targetOrgId = req.user.role === 'superadmin' ? orgId : req.user.orgId;
      if (process.env.SYSTEM_MODE === 'SINGLE_NODE') {
        targetOrgId = 'default-tenant';
      }
      const pwdHash = await bcrypt.hash(password || '123456', 10);
      const assignedRoles = (roles && Array.isArray(roles) && roles.length > 0) ? roles : [role || 'intake'];
      const primaryRole = role || assignedRoles[0] || 'intake';
      await dbPool.query(
        'INSERT INTO users (id, org_id, username, full_name_th, full_name_en, email, role, roles, department, password_hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [id, targetOrgId, username, fullName, fullNameEn || fullName, email, primaryRole, JSON.stringify(assignedRoles), department, pwdHash]
      );
      res.json({ success: true });
    } catch (err) {
      console.error('Error creating user:', err);
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // ─────────────────────────────────────────────
  // PUT /api/users/:id
  // Update user profile or password (Admin only)
  // ─────────────────────────────────────────────
  router.put('/:id', authenticateJWT, requireRole(['admin']), async (req, res) => {
    const { id } = req.params;
    const { fullNameTh, fullNameEn, email, role, roles, department, resetPassword, newPassword } = req.body;
    try {
      if (role === 'superadmin' || (roles && roles.includes('superadmin'))) {
        return res.status(403).json({ success: false, message: 'ไม่อนุญาตให้กำหนดสิทธิ์ superadmin' });
      }
      const assignedRoles = (roles && Array.isArray(roles) && roles.length > 0) ? roles : [role || 'intake'];
      const primaryRole = role || assignedRoles[0] || 'intake';

      let baseQuery = '';
      let params = [fullNameTh, fullNameEn || fullNameTh, email, primaryRole, JSON.stringify(assignedRoles), department];

      if (newPassword) {
        const pwdHash = await bcrypt.hash(newPassword, 10);
        baseQuery = 'UPDATE users SET full_name_th = $1, full_name_en = $2, email = $3, role = $4, roles = $5, department = $6, password_hash = $7, force_password_change = true WHERE id = $8';
        params.push(pwdHash, id);
      } else if (resetPassword) {
        const pwdHash = await bcrypt.hash('123456', 10);
        baseQuery = 'UPDATE users SET full_name_th = $1, full_name_en = $2, email = $3, role = $4, roles = $5, department = $6, password_hash = $7, force_password_change = true WHERE id = $8';
        params.push(pwdHash, id);
      } else {
        baseQuery = 'UPDATE users SET full_name_th = $1, full_name_en = $2, email = $3, role = $4, roles = $5, department = $6 WHERE id = $7';
        params.push(id);
      }

      if (req.user.role !== 'superadmin') {
        baseQuery += ` AND org_id = $${params.length + 1}`;
        params.push(req.user.orgId);
      }

      const result = await dbPool.query(baseQuery, params);
      if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้ หรือไม่มีสิทธิ์แก้ไขข้อมูลข้ามองค์กร' });

      res.json({ success: true });
    } catch (err) {
      console.error('Error updating user:', err);
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // ─────────────────────────────────────────────
  // DELETE /api/users/:id
  // Delete a staff user (Admin only)
  // ─────────────────────────────────────────────
  router.delete('/:id', authenticateJWT, requireRole(['admin']), async (req, res) => {
    const { id } = req.params;
    try {
      let query = 'DELETE FROM users WHERE id = $1';
      let params = [id];
      if (req.user.role !== 'superadmin') {
        query += ' AND org_id = $2';
        params.push(req.user.orgId);
      }
      const result = await dbPool.query(query, params);
      if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้ หรือไม่มีสิทธิ์ลบข้อมูลข้ามองค์กร' });
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting user:', err);
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  return router;
}
