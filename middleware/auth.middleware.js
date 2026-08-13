// middleware/auth.middleware.js
// ERPNext-inspired Authentication, Authorization & Audit Middleware
// Handles JWT validation, Role-Based Access Control (RBAC), and server audit logging to PostgreSQL.

import jwt from 'jsonwebtoken';

export function createAuthMiddleware(dbPool, JWT_SECRET) {
  // ── 1. JWT Authentication Middleware ─────────────────────────────────────
  const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
          return res.status(403).json({ success: false, message: 'Token is invalid or expired' });
        }
        req.user = user;
        next();
      });
    } else {
      res.status(401).json({ success: false, message: 'Authorization header missing' });
    }
  };

  // ── 2. Role-Based Access Control (RBAC) Middleware ───────────────────────
  const requireRole = (allowedRoles) => {
    return (req, res, next) => {
      // Superadmin has all privileges implicitly
      if (!req.user || (!allowedRoles.includes(req.user.role) && req.user.role !== 'superadmin')) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: Access restricted to roles [${allowedRoles.join(', ')}]`
        });
      }
      next();
    };
  };

  // ── 3. Helper: Add Server Audit Log to PostgreSQL ────────────────────────
  // Supports both signatures:
  //   - (action, details, actor, reqObj)
  //   - (action, details, actor, requestId, trackingNo, reqObj)
  const addServerAuditLog = async (action, details, actor, arg4 = null, arg5 = null, arg6 = null) => {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const timestamp = new Date().toISOString();
    const actorId = actor?.id || 'system';
    const actorName = actor?.fullNameTh || 'System Server';
    const actorRole = actor?.role || 'system';

    let requestId = null;
    let trackingNo = null;
    let reqObj = null;

    if (arg4 && (arg4.headers || arg4.socket)) {
      reqObj = arg4;
    } else {
      requestId = arg4;
      trackingNo = arg5;
      reqObj = arg6;
    }

    const ipAddress = reqObj ? (reqObj.headers['x-forwarded-for'] || reqObj.socket?.remoteAddress) : '127.0.0.1';
    const userAgent = reqObj ? reqObj.headers['user-agent'] : 'Express Backend API';
    const checksum = Math.abs(Date.now() % 1000000).toString(16);

    try {
      await dbPool.query(
        `INSERT INTO audit_logs (id, org_id, timestamp, actor_id, actor_name, actor_role, action, request_id, request_tracking_no, ip_address, user_agent, details, checksum) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [logId, actor?.orgId || 'system', timestamp, actorId, actorName, actorRole, action, requestId, trackingNo, ipAddress, userAgent, details, checksum]
      );
    } catch (err) {
      console.error('Failed to insert audit log to DB:', err);
    }
  };

  return {
    authenticateJWT,
    requireRole,
    addServerAuditLog
  };
}
