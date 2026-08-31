// middleware/auth.middleware.js
// ERPNext-inspired Authentication, Authorization & Audit Middleware
// Handles JWT validation, Role-Based Access Control (RBAC), and server audit logging to PostgreSQL.

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export function createAuthMiddleware(dbPool, JWT_SECRET) {
  // ── 1. JWT Authentication Middleware ─────────────────────────────────────
  const authenticateJWT = (req, res, next) => {
    let token = null;
    const authHeader = req.headers.authorization;
    // [SECURITY] Token accepted from Authorization header ONLY.
    // Token-in-query-string was removed (VULN-05): tokens in URLs leak into
    // server logs, browser history, CDN/proxy logs, and Referer headers.
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (token) {
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
      if (!req.user) {
        return res.status(403).json({ success: false, message: 'Forbidden: No user object' });
      }
      
      // Superadmin has all privileges implicitly
      if (req.user.role === 'superadmin') {
        return next();
      }

      // Check against user.roles array if it exists, otherwise fallback to user.role string
      const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];
      const hasAllowedRole = userRoles.some(r => allowedRoles.includes(r));

      if (!hasAllowedRole) {
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
    const logId = `log_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
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
    // [SECURITY] HMAC-SHA256 checksum bound to log content (VULN-11).
    // Allows detection of tampered audit log entries.
    const checksum = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${logId}|${actorId}|${action}|${timestamp}`)
      .digest('hex');

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
