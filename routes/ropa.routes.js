import express from 'express';

export function createRopaRouter(dbPool, authenticateJWT, requireRole, addServerAuditLog) {
  const router = express.Router();

  // 1. GET Master Data
  router.get('/ropa/master-data', authenticateJWT, async (req, res) => {
    try {
      // const departmentsQuery = dbPool.query('SELECT * FROM ropa_departments WHERE org_id = $1', [req.user.orgId]);
      const subjectsQuery = dbPool.query('SELECT * FROM ropa_data_subject_types');
      const categoriesQuery = dbPool.query('SELECT * FROM ropa_data_categories');
      const basesQuery = dbPool.query('SELECT * FROM ropa_legal_bases');
      const recipientsQuery = dbPool.query('SELECT * FROM ropa_data_recipients');

      const [subjects, categories, bases, recipients] = await Promise.all([
        subjectsQuery, categoriesQuery, basesQuery, recipientsQuery
      ]);

      res.json({
        success: true,
        data: {
          departments: [], // Not used currently, derived from user strings
          subjects: subjects.rows,
          categories: categories.rows,
          bases: bases.rows,
          recipients: recipients.rows
        }
      });
    } catch (error) {
      console.error('Error fetching ROPA master data:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // 2. GET Core Activities
  router.get('/ropa/activities', authenticateJWT, async (req, res) => {
    try {
      // Basic fetch, ideally with pagination and filtering
      const { rows } = await dbPool.query(`
        SELECT r.*, lb.name as legal_basis_name,
        COALESCE(
          (SELECT json_agg(c.name) FROM ropa_activity_data_categories ac JOIN ropa_data_categories c ON ac.category_id = c.id WHERE ac.activity_id = r.id),
          '[]'::json
        ) as category_names
        FROM ropa_processing_activities r
        LEFT JOIN ropa_legal_bases lb ON r.legal_basis_id = lb.id
        WHERE r.org_id = $1
        ORDER BY r.created_at DESC
      `, [req.user.org_id]);

      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching ROPA activities:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // 3. GET Activity By ID
  router.get('/ropa/activities/:id', authenticateJWT, async (req, res) => {
    try {
      const { id } = req.params;
      const { rows } = await dbPool.query(`SELECT * FROM ropa_processing_activities WHERE id = $1 AND org_id = $2`, [id, req.user.org_id]);
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'Activity not found' });
      
      const activity = rows[0];

      // Fetch joins
      const subjects = await dbPool.query('SELECT subject_type_id FROM ropa_activity_data_subjects WHERE activity_id = $1', [id]);
      const categories = await dbPool.query('SELECT category_id FROM ropa_activity_data_categories WHERE activity_id = $1', [id]);
      const recipients = await dbPool.query('SELECT recipient_id FROM ropa_activity_recipients WHERE activity_id = $1', [id]);

      activity.subject_type_ids = subjects.rows.map(r => r.subject_type_id);
      activity.category_ids = categories.rows.map(r => r.category_id);
      activity.recipient_ids = recipients.rows.map(r => r.recipient_id);

      res.json({ success: true, data: activity });
    } catch (error) {
      console.error('Error fetching ROPA activity details:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // 4. POST Create new Activity
  router.post('/ropa/activities', authenticateJWT, async (req, res) => {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');
      
      const {
        activity_name, purpose, department_name, legal_basis_id,
        retention_days, retention_trigger,
        subject_type_ids = [], category_ids = [], recipient_ids = []
      } = req.body;

      const id = 'ropa_' + Date.now() + Math.random().toString(36).substring(2, 7);

      await client.query(`
        INSERT INTO ropa_processing_activities (
          id, org_id, activity_name, purpose, department_name, created_by_id, legal_basis_id,
          retention_days, retention_trigger, status, current_version
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'DRAFT', 1)
      `, [id, req.user.org_id, activity_name, purpose, department_name, req.user.id, legal_basis_id || null, retention_days || null, retention_trigger]);

      // Insert Many-to-Many
      for (const s_id of subject_type_ids) {
        await client.query('INSERT INTO ropa_activity_data_subjects (activity_id, subject_type_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, s_id]);
      }
      for (const c_id of category_ids) {
        await client.query('INSERT INTO ropa_activity_data_categories (activity_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, c_id]);
      }
      for (const r_id of recipient_ids) {
        await client.query('INSERT INTO ropa_activity_recipients (activity_id, recipient_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, r_id]);
      }

      // Audit Log
      const auditId = 'al_' + Date.now();
      await client.query(`
        INSERT INTO ropa_audit_logs (id, org_id, action, entity_type, entity_id, user_id, ip_address, details)
        VALUES ($1, $2, 'CREATE_ROPA', 'ProcessingActivity', $3, $4, $5, $6)
      `, [auditId, req.user.org_id, id, req.user.id, req.ip, JSON.stringify({ activity_name })]);

      await client.query('COMMIT');
      res.json({ success: true, data: { id }, message: 'ROPA Draft created successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating ROPA activity:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    } finally {
      client.release();
    }
  });

  // 5. POST Submit for Approval
  router.post('/ropa/activities/:id/submit', authenticateJWT, async (req, res) => {
    try {
      const { id } = req.params;
      
      const { rowCount } = await dbPool.query(`
        UPDATE ropa_processing_activities 
        SET status = 'PENDING_REVIEW', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND org_id = $2 AND status = 'DRAFT'
      `, [id, req.user.org_id]);
      
      if (rowCount === 0) return res.status(400).json({ success: false, message: 'Activity not found or not in DRAFT state' });

      // Audit Log
      const auditId = 'al_' + Date.now();
      await dbPool.query(`
        INSERT INTO ropa_audit_logs (id, org_id, action, entity_type, entity_id, user_id, ip_address, details)
        VALUES ($1, $2, 'SUBMIT_ROPA', 'ProcessingActivity', $3, $4, $5, '{}'::jsonb)
      `, [auditId, req.user.org_id, id, req.user.id, req.ip]);

      res.json({ success: true, message: 'ROPA submitted for review' });
    } catch (error) {
      console.error('Error submitting ROPA:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // 6. POST Approve
  router.post('/ropa/activities/:id/approve', authenticateJWT, requireRole(['dpo', 'superadmin']), async (req, res) => {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');
      const { id } = req.params;
      
      const { rows } = await client.query(`SELECT * FROM ropa_processing_activities WHERE id = $1 AND org_id = $2 AND status = 'PENDING_REVIEW'`, [id, req.user.org_id]);
      if (rows.length === 0) throw new Error('Activity not found or not in PENDING_REVIEW state');
      
      const activity = rows[0];

      // Fetch all relations to create snapshot
      const subjects = await client.query('SELECT subject_type_id FROM ropa_activity_data_subjects WHERE activity_id = $1', [id]);
      const categories = await client.query('SELECT category_id FROM ropa_activity_data_categories WHERE activity_id = $1', [id]);
      const recipients = await client.query('SELECT recipient_id FROM ropa_activity_recipients WHERE activity_id = $1', [id]);
      
      const snapshot = {
        ...activity,
        subject_type_ids: subjects.rows.map(r => r.subject_type_id),
        category_ids: categories.rows.map(r => r.category_id),
        recipient_ids: recipients.rows.map(r => r.recipient_id)
      };

      const versionId = 'rv_' + Date.now();
      await client.query(`
        INSERT INTO ropa_versions (id, activity_id, version_number, snapshot_data, approved_by_id)
        VALUES ($1, $2, $3, $4, $5)
      `, [versionId, id, activity.current_version, JSON.stringify(snapshot), req.user.id]);

      await client.query(`
        UPDATE ropa_processing_activities 
        SET status = 'APPROVED', current_version = current_version + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [id]);

      // Audit Log
      const auditId = 'al_' + Date.now();
      await client.query(`
        INSERT INTO ropa_audit_logs (id, org_id, action, entity_type, entity_id, user_id, ip_address, details)
        VALUES ($1, $2, 'APPROVE_ROPA', 'ProcessingActivity', $3, $4, $5, $6)
      `, [auditId, req.user.org_id, id, req.user.id, req.ip, JSON.stringify({ version: activity.current_version })]);

      await client.query('COMMIT');
      res.json({ success: true, message: 'ROPA approved successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error approving ROPA:', error);
      res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    } finally {
      client.release();
    }
  });

  // 7. POST Upload File
  router.post('/ropa/activities/:id/files', authenticateJWT, express.json({limit: '20mb'}), async (req, res) => {
    try {
      const { id } = req.params;
      const { filename, file_data } = req.body;
      
      if (!filename || !file_data) {
        return res.status(400).json({ success: false, message: 'filename and file_data are required' });
      }

      // Verify activity exists and belongs to org
      const { rows } = await dbPool.query(`SELECT status FROM ropa_processing_activities WHERE id = $1 AND org_id = $2`, [id, req.user.org_id]);
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'Activity not found' });
      if (rows[0].status === 'APPROVED') return res.status(400).json({ success: false, message: 'Cannot attach files to an approved activity' });

      const fileId = 'rf_' + Date.now();
      await dbPool.query(`
        INSERT INTO ropa_files (id, activity_id, filename, file_data, uploaded_by)
        VALUES ($1, $2, $3, $4, $5)
      `, [fileId, id, filename, file_data, req.user.id]);

      // Audit Log
      const auditId = 'al_' + Date.now();
      await dbPool.query(`
        INSERT INTO ropa_audit_logs (id, org_id, action, entity_type, entity_id, user_id, ip_address, details)
        VALUES ($1, $2, 'UPLOAD_FILE', 'ProcessingActivity', $3, $4, $5, $6)
      `, [auditId, req.user.org_id, id, req.user.id, req.ip, JSON.stringify({ filename, file_id: fileId })]);

      res.json({ success: true, message: 'File uploaded successfully', data: { file_id: fileId } });
    } catch (error) {
      console.error('Error uploading ROPA file:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // 8. GET Files
  router.get('/ropa/activities/:id/files', authenticateJWT, async (req, res) => {
    try {
      const { id } = req.params;
      // Note: We don't fetch the massive base64 file_data here to save bandwidth, just metadata
      const { rows } = await dbPool.query(`
        SELECT f.id, f.filename, f.uploaded_at, u.full_name_th as uploaded_by_name 
        FROM ropa_files f
        LEFT JOIN users u ON f.uploaded_by = u.id
        JOIN ropa_processing_activities a ON f.activity_id = a.id
        WHERE f.activity_id = $1 AND a.org_id = $2
      `, [id, req.user.org_id]);

      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching ROPA files:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  return router;
}
