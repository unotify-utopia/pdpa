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
      // Hide superadmin from the list so normal admins cannot see or manage them
      const { rows } = await dbPool.query('SELECT id, org_id, username, full_name_th as "fullName", full_name_th as "fullNameTh", full_name_en as "fullNameEn", email, role, roles, department FROM users WHERE role != $1 ORDER BY created_at ASC', ['superadmin']);
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
      const pwdHash = await bcrypt.hash(password || '123456', 10);
      const assignedRoles = (roles && Array.isArray(roles) && roles.length > 0) ? roles : [role || 'intake'];
      const primaryRole = role || assignedRoles[0] || 'intake';
      await dbPool.query(
        'INSERT INTO users (id, org_id, username, full_name_th, full_name_en, email, role, roles, department, password_hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [id, orgId, username, fullName, fullNameEn || fullName, email, primaryRole, JSON.stringify(assignedRoles), department, pwdHash]
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
      const assignedRoles = (roles && Array.isArray(roles) && roles.length > 0) ? roles : [role || 'intake'];
      const primaryRole = role || assignedRoles[0] || 'intake';

      if (newPassword) {
        const pwdHash = await bcrypt.hash(newPassword, 10);
        await dbPool.query(
          'UPDATE users SET full_name_th = $1, full_name_en = $2, email = $3, role = $4, roles = $5, department = $6, password_hash = $7 WHERE id = $8',
          [fullNameTh, fullNameEn || fullNameTh, email, primaryRole, JSON.stringify(assignedRoles), department, pwdHash, id]
        );
      } else if (resetPassword) {
        const pwdHash = await bcrypt.hash('123456', 10);
        await dbPool.query(
          'UPDATE users SET full_name_th = $1, full_name_en = $2, email = $3, role = $4, roles = $5, department = $6, password_hash = $7 WHERE id = $8',
          [fullNameTh, fullNameEn || fullNameTh, email, primaryRole, JSON.stringify(assignedRoles), department, pwdHash, id]
        );
      } else {
        await dbPool.query(
          'UPDATE users SET full_name_th = $1, full_name_en = $2, email = $3, role = $4, roles = $5, department = $6 WHERE id = $7',
          [fullNameTh, fullNameEn || fullNameTh, email, primaryRole, JSON.stringify(assignedRoles), department, id]
        );
      }
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
      await dbPool.query('DELETE FROM users WHERE id = $1', [id]);
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting user:', err);
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  return router;
}
