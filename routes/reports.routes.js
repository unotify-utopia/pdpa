// routes/reports.routes.js
// ERPNext-inspired Analytics & Reporting Module
// Handles Dashboard Summaries and SLA Breach analytics for DPOs and SuperAdmin

import express from 'express';
import { calculateOrgSLAReport } from '../services/sla.service.js';

export function createReportsRouter(dbPool, authenticateJWT, requireRole) {
  const router = express.Router();

  // ─────────────────────────────────────────────
  // Helper to determine org scope based on user role
  // ─────────────────────────────────────────────
  const getScope = (req) => {
    // If superadmin, allow viewing all or a specific requested org
    if (req.user.isSuperAdmin) {
      return req.query.orgId || null;
    }
    // DPO/Admin/Intake is restricted to their own org
    return req.user.orgId;
  };

  // ─────────────────────────────────────────────
  // GET /api/reports/summary
  // Get aggregated stats for DPO Dashboard
  // ─────────────────────────────────────────────
  router.get('/summary', authenticateJWT, requireRole(['dpo', 'admin', 'superadmin', 'owner', 'approver']), async (req, res) => {
    try {
      const scopeOrgId = getScope(req);
      
      let query = 'SELECT data FROM requests';
      let params = [];
      if (scopeOrgId) {
        query += ' WHERE org_id = $1';
        params.push(scopeOrgId);
      }
      
      const { rows } = await dbPool.query(query, params);
      
      // Parse JSONB data
      const requests = rows.map(r => {
        return typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {});
      });

      // Delegate calculation to SLA Service
      const report = calculateOrgSLAReport(requests);

      res.json({ success: true, report });
    } catch (err) {
      console.error('Report Summary Error:', err);
      res.status(500).json({ success: false, message: 'Failed to generate report' });
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/reports/sla-breach
  // Get list of requests currently breaching SLA
  // ─────────────────────────────────────────────
  router.get('/sla-breach', authenticateJWT, requireRole(['dpo', 'admin', 'superadmin']), async (req, res) => {
    try {
      const scopeOrgId = getScope(req);
      
      let query = 'SELECT id, tracking_no, org_id, data FROM requests';
      let params = [];
      if (scopeOrgId) {
        query += ' WHERE org_id = $1';
        params.push(scopeOrgId);
      }
      
      const { rows } = await dbPool.query(query, params);
      
      const breaches = [];
      
      rows.forEach(r => {
        const data = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {});
        // Only consider active requests that have breached SLA
        if (data.isBreached || (typeof data.slaRemainingDays === 'number' && data.slaRemainingDays < 0)) {
          // Exclude closed/terminated states (double-check via status)
          const closedStates = ['Approved', 'Delivered', 'Receipt Confirmed', 'Denied', 'No Data Found', 'Withdrawn', 'Closed'];
          if (!closedStates.includes(data.status)) {
            breaches.push({
              id: r.id,
              trackingNo: r.tracking_no,
              orgId: r.org_id,
              status: data.status,
              requesterName: `${data.requester?.firstName || ''} ${data.requester?.lastName || ''}`.trim(),
              slaRemainingDays: data.slaRemainingDays,
              slaDaysUsed: data.slaDaysUsed,
              slaDeadlineDate: data.slaDeadlineDate
            });
          }
        }
      });

      // Sort breaches by most overdue (lowest negative remaining days)
      breaches.sort((a, b) => a.slaRemainingDays - b.slaRemainingDays);

      res.json({ success: true, breaches });
    } catch (err) {
      console.error('SLA Breach Report Error:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch SLA breach report' });
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/reports/sla-warning
  // Get list of requests with SLA remaining < 3 days
  // ─────────────────────────────────────────────
  router.get('/sla-warning', authenticateJWT, requireRole(['dpo', 'admin', 'superadmin']), async (req, res) => {
    try {
      const scopeOrgId = getScope(req);
      let query = 'SELECT id, tracking_no, org_id, data FROM requests';
      let params = [];
      if (scopeOrgId) {
        query += ' WHERE org_id = $1';
        params.push(scopeOrgId);
      }
      
      const { rows } = await dbPool.query(query, params);
      const warnings = [];
      
      rows.forEach(r => {
        const data = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {});
        // Check for remaining days < 3 but not breached yet (>= 0)
        if (typeof data.slaRemainingDays === 'number' && data.slaRemainingDays >= 0 && data.slaRemainingDays <= 3) {
          const closedStates = ['Approved', 'Delivered', 'Receipt Confirmed', 'Denied', 'No Data Found', 'Withdrawn', 'Closed'];
          if (!closedStates.includes(data.status)) {
            warnings.push({
              id: r.id,
              trackingNo: r.tracking_no,
              orgId: r.org_id,
              status: data.status,
              requesterName: `${data.requester?.firstName || ''} ${data.requester?.lastName || ''}`.trim(),
              slaRemainingDays: data.slaRemainingDays,
              slaDeadlineDate: data.slaDeadlineDate
            });
          }
        }
      });

      warnings.sort((a, b) => a.slaRemainingDays - b.slaRemainingDays);
      res.json({ success: true, warnings });
    } catch (err) {
      console.error('SLA Warning Report Error:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch SLA warning report' });
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/reports/by-month
  // Request counts per month for the last 12 months
  // ─────────────────────────────────────────────
  router.get('/by-month', authenticateJWT, requireRole(['dpo', 'admin', 'superadmin', 'owner']), async (req, res) => {
    try {
      const scopeOrgId = getScope(req);
      let query = 'SELECT created_at FROM requests WHERE created_at >= NOW() - INTERVAL \'12 months\'';
      let params = [];
      if (scopeOrgId) {
        query += ' AND org_id = $1';
        params.push(scopeOrgId);
      }
      
      const { rows } = await dbPool.query(query, params);
      
      // Initialize 12 months
      const months = {};
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthKey = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
        months[monthKey] = 0;
      }
      
      rows.forEach(r => {
        const monthKey = new Date(r.created_at).toLocaleString('en-US', { month: 'short', year: '2-digit' });
        if (months[monthKey] !== undefined) {
          months[monthKey]++;
        }
      });
      
      const trend = Object.keys(months).map(month => ({ month, count: months[month] }));
      res.json({ success: true, trend });
    } catch (err) {
      console.error('By Month Report Error:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch by-month report' });
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/reports/by-status
  // Proportion of request statuses
  // ─────────────────────────────────────────────
  router.get('/by-status', authenticateJWT, requireRole(['dpo', 'admin', 'superadmin', 'owner']), async (req, res) => {
    try {
      const scopeOrgId = getScope(req);
      let query = 'SELECT data->>\'status\' as status, COUNT(*) as count FROM requests';
      let params = [];
      if (scopeOrgId) {
        query += ' WHERE org_id = $1';
        params.push(scopeOrgId);
      }
      query += ' GROUP BY data->>\'status\'';
      
      const { rows } = await dbPool.query(query, params);
      
      const statusCounts = rows.map(r => ({
        status: r.status || 'Draft',
        count: parseInt(r.count, 10)
      }));
      
      res.json({ success: true, statusCounts });
    } catch (err) {
      console.error('By Status Report Error:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch by-status report' });
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/reports/top-orgs
  // Top 5 organizations with most requests (SuperAdmin only)
  // ─────────────────────────────────────────────
  router.get('/top-orgs', authenticateJWT, requireRole(['superadmin']), async (req, res) => {
    try {
      const query = `
        SELECT org_id, COUNT(*) as count 
        FROM requests 
        GROUP BY org_id 
        ORDER BY count DESC 
        LIMIT 5
      `;
      const { rows } = await dbPool.query(query);
      
      // Get org names
      const topOrgs = await Promise.all(rows.map(async (r) => {
        const { rows: orgRows } = await dbPool.query('SELECT name_th, name_en FROM tenants WHERE id = $1', [r.org_id]);
        const orgName = orgRows.length > 0 ? (orgRows[0].name_th || orgRows[0].name_en) : r.org_id;
        return {
          orgId: r.org_id,
          orgName,
          count: parseInt(r.count, 10)
        };
      }));
      
      res.json({ success: true, topOrgs });
    } catch (err) {
      console.error('Top Orgs Report Error:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch top organizations' });
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/reports/alerts
  // Specific warnings like Legal Hold + DPO Review > 5 days
  // ─────────────────────────────────────────────
  router.get('/alerts', authenticateJWT, requireRole(['dpo', 'admin', 'superadmin']), async (req, res) => {
    try {
      const scopeOrgId = getScope(req);
      let query = 'SELECT id, tracking_no, org_id, data FROM requests';
      let params = [];
      if (scopeOrgId) {
        query += ' WHERE org_id = $1';
        params.push(scopeOrgId);
      }
      
      const { rows } = await dbPool.query(query, params);
      const alerts = [];
      
      rows.forEach(r => {
        const data = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {});
        
        // 1. Legal Hold Alert
        if (data.legalHold) {
          alerts.push({
            id: r.id,
            trackingNo: r.tracking_no,
            orgId: r.org_id,
            type: 'LEGAL_HOLD',
            message: `คำขอนี้ถูกระงับชั่วคราว (Legal Hold) เนื่องจากคดีความหรือคำสั่งศาล`,
            date: data.legalHoldDate
          });
        }
        
        // 2. DPO Review > 5 days
        if (data.status === 'DPO Review' && data.dpoReviewStartDate) {
          const start = new Date(data.dpoReviewStartDate);
          const now = new Date();
          const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
          if (diffDays > 5) {
            alerts.push({
              id: r.id,
              trackingNo: r.tracking_no,
              orgId: r.org_id,
              type: 'DPO_REVIEW_DELAY',
              message: `คำขอนี้ค้างอยู่ที่ขั้นตอน DPO Review มานานกว่า 5 วัน (${diffDays} วัน)`,
              date: data.dpoReviewStartDate
            });
          }
        }
      });

      res.json({ success: true, alerts });
    } catch (err) {
      console.error('Alerts Report Error:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch alerts' });
    }
  });

  return router;
}
