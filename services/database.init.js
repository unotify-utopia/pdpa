import bcrypt from 'bcryptjs';
import { seedWorkflowData } from './workflow.seed.js';
import { seedRopaMasterData } from './ropa.seed.js';
import { refreshTransitionCache } from '../middleware/workflow.middleware.js';

export const initDatabase = async (dbPool) => {
  try {
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id VARCHAR(50) PRIMARY KEY,
        name_th VARCHAR(255) NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        org_id VARCHAR(50) REFERENCES tenants(id) ON DELETE CASCADE,
        username VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name_th VARCHAR(255),
        full_name_en VARCHAR(255),
        email VARCHAR(255),
        role VARCHAR(50) NOT NULL,
        department VARCHAR(255),
        mfa_enabled BOOLEAN DEFAULT false,
        two_factor_secret VARCHAR(255),
        signature_image TEXT,
        reset_token VARCHAR(255),
        reset_token_expires_at TIMESTAMP,
        force_password_change BOOLEAN DEFAULT true,
        password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        password_history JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (org_id, username)
      );

      CREATE TABLE IF NOT EXISTS requests (
        id VARCHAR(100) PRIMARY KEY,
        org_id VARCHAR(50) REFERENCES tenants(id) ON DELETE CASCADE,
        tracking_no VARCHAR(100) UNIQUE,
        requester_type VARCHAR(50),
        status VARCHAR(50),
        data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS public_otps (
        key VARCHAR(255) PRIMARY KEY,
        otp VARCHAR(10) NOT NULL,
        expires_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(100) PRIMARY KEY,
        org_id VARCHAR(50),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        actor_id VARCHAR(50),
        actor_name VARCHAR(255),
        actor_role VARCHAR(50),
        action VARCHAR(100),
        request_id VARCHAR(100),
        request_tracking_no VARCHAR(100),
        ip_address VARCHAR(50),
        user_agent TEXT,
        details TEXT,
        checksum VARCHAR(100)
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS task_files (
        id VARCHAR(100) PRIMARY KEY,
        request_id VARCHAR(100),
        task_id VARCHAR(100),
        filename VARCHAR(255),
        file_data TEXT,
        uploaded_by VARCHAR(255),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS document_templates (
        id VARCHAR(100) PRIMARY KEY,
        type VARCHAR(100),
        name VARCHAR(255),
        subject VARCHAR(255),
        body TEXT,
        is_active BOOLEAN DEFAULT true,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(255)
      );

      CREATE TABLE IF NOT EXISTS download_tokens (
        token VARCHAR(128) PRIMARY KEY,
        request_id VARCHAR(100) NOT NULL,
        org_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        downloaded_count INTEGER DEFAULT 0,
        is_revoked BOOLEAN DEFAULT false
      );

      -- ── Workflow Engine Tables (ERPNext-inspired) ────────────────────────
      CREATE TABLE IF NOT EXISTS workflow_states (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(100) UNIQUE NOT NULL,
        label_th    VARCHAR(200) NOT NULL,
        label_en    VARCHAR(200) NOT NULL,
        color       VARCHAR(30)  DEFAULT 'gray',
        is_terminal BOOLEAN      DEFAULT FALSE,
        sort_order  INT          DEFAULT 0,
        created_at  TIMESTAMP    DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS workflow_transitions (
        id               SERIAL PRIMARY KEY,
        from_state       VARCHAR(100) REFERENCES workflow_states(name) ON DELETE CASCADE,
        to_state         VARCHAR(100) REFERENCES workflow_states(name) ON DELETE CASCADE,
        allowed_roles    TEXT[]       DEFAULT '{}',
        requires_comment BOOLEAN      DEFAULT FALSE,
        auto_notify      BOOLEAN      DEFAULT TRUE,
        created_at       TIMESTAMP    DEFAULT NOW()
      );

      -- ── RoPA Tables (Record of Processing Activities) ──────────────────────
      -- 1. Master Data
      CREATE TABLE IF NOT EXISTS ropa_data_subject_types (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS ropa_data_categories (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        is_sensitive_data BOOLEAN DEFAULT false,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS ropa_legal_bases (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS ropa_data_recipients (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100),
        country VARCHAR(100) DEFAULT 'Thailand'
      );

      -- 2. Core Transaction
      CREATE TABLE IF NOT EXISTS ropa_processing_activities (
        id VARCHAR(100) PRIMARY KEY,
        org_id VARCHAR(50) REFERENCES tenants(id) ON DELETE CASCADE,
        activity_name VARCHAR(255) NOT NULL,
        purpose TEXT,
        department_name VARCHAR(255),
        created_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        legal_basis_id VARCHAR(100) REFERENCES ropa_legal_bases(id) ON DELETE SET NULL,
        retention_days INT,
        retention_trigger VARCHAR(255),
        status VARCHAR(50) DEFAULT 'DRAFT',
        current_version INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 3. Join Tables for Many-to-Many Relationships
      CREATE TABLE IF NOT EXISTS ropa_activity_data_subjects (
        activity_id VARCHAR(100) REFERENCES ropa_processing_activities(id) ON DELETE CASCADE,
        subject_type_id VARCHAR(100) REFERENCES ropa_data_subject_types(id) ON DELETE CASCADE,
        PRIMARY KEY (activity_id, subject_type_id)
      );

      CREATE TABLE IF NOT EXISTS ropa_activity_data_categories (
        activity_id VARCHAR(100) REFERENCES ropa_processing_activities(id) ON DELETE CASCADE,
        category_id VARCHAR(100) REFERENCES ropa_data_categories(id) ON DELETE CASCADE,
        PRIMARY KEY (activity_id, category_id)
      );

      CREATE TABLE IF NOT EXISTS ropa_activity_recipients (
        activity_id VARCHAR(100) REFERENCES ropa_processing_activities(id) ON DELETE CASCADE,
        recipient_id VARCHAR(100) REFERENCES ropa_data_recipients(id) ON DELETE CASCADE,
        PRIMARY KEY (activity_id, recipient_id)
      );

      -- 4. Versioning & Security
      CREATE TABLE IF NOT EXISTS ropa_versions (
        id VARCHAR(100) PRIMARY KEY,
        activity_id VARCHAR(100) REFERENCES ropa_processing_activities(id) ON DELETE CASCADE,
        version_number INT NOT NULL,
        snapshot_data JSONB NOT NULL,
        approved_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(activity_id, version_number)
      );

      CREATE TABLE IF NOT EXISTS ropa_audit_logs (
        id VARCHAR(100) PRIMARY KEY,
        org_id VARCHAR(50) REFERENCES tenants(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id VARCHAR(100),
        user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        ip_address VARCHAR(100),
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ropa_files (
        id VARCHAR(100) PRIMARY KEY,
        activity_id VARCHAR(100) REFERENCES ropa_processing_activities(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        file_data TEXT, -- Base64 or path
        uploaded_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    try {
      await dbPool.query('ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255)');
      console.log('✅ Added two_factor_secret column to users table');
    } catch (e) {}

    try {
      await dbPool.query('ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT false');
      console.log('✅ Added mfa_enabled column to users table');
    } catch (e) {}

    try {
      await dbPool.query('ALTER TABLE task_files ADD COLUMN is_deleted BOOLEAN DEFAULT false');
    } catch(e) {}
    
    try {
      await dbPool.query('ALTER TABLE pdpa_files ADD COLUMN IF NOT EXISTS encryption_iv VARCHAR(50);');
    } catch(e) {}
      
    try {
      // Auto-migrate users table for reset password feature
      await dbPool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);');
      await dbPool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP;');
    } catch(e) { console.error('[DB Init] Error adding reset_token columns:', e); }
      
    try {
      // Auto-migrate users table for password security enhancements
      await dbPool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT true;');
      await dbPool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;');
      await dbPool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_history JSONB DEFAULT '[]'::jsonb;");
    } catch(e) { console.error('[DB Init] Error adding password security columns:', e); }

    try {
      await dbPool.query('ALTER TABLE audit_logs ADD COLUMN actor_id VARCHAR(50)');
    } catch(e) {}
    try {
      await dbPool.query('ALTER TABLE audit_logs ADD COLUMN actor_name VARCHAR(255)');
    } catch(e) {}
    try {
      await dbPool.query('ALTER TABLE audit_logs ADD COLUMN actor_role VARCHAR(50)');
    } catch(e) {}
    try {
      await dbPool.query('ALTER TABLE audit_logs ADD COLUMN org_id VARCHAR(50)');
    } catch(e) {}
    try {
      await dbPool.query('ALTER TABLE audit_logs ADD COLUMN request_id VARCHAR(100)');
    } catch(e) {}
    try {
      await dbPool.query('ALTER TABLE audit_logs ADD COLUMN request_tracking_no VARCHAR(100)');
    } catch(e) {}
    try {
      await dbPool.query('ALTER TABLE audit_logs ADD COLUMN ip_address VARCHAR(50)');
    } catch(e) {}
    try {
      await dbPool.query('ALTER TABLE audit_logs ADD COLUMN user_agent TEXT');
    } catch(e) {}
    try {
      await dbPool.query('ALTER TABLE audit_logs ADD COLUMN checksum VARCHAR(100)');
    } catch(e) {}
    
    try {
      await dbPool.query('ALTER TABLE audit_logs ALTER COLUMN performed_by DROP NOT NULL');
    } catch(e) {}
    
    // Fix: Upgrade columns to TEXT to prevent 'value too long' errors
    const colsToText = ['actor_id', 'actor_name', 'actor_role', 'org_id', 'request_id', 'request_tracking_no', 'ip_address', 'action'];
    for (const col of colsToText) {
      try {
        await dbPool.query(`ALTER TABLE audit_logs ALTER COLUMN ${col} TYPE TEXT`);
      } catch (e) {}
    }
    
    console.log('✅ Added missing columns to audit_logs');

    try {
      await dbPool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT '[]'::jsonb");
      console.log('✅ Added roles JSONB column to users table');
    } catch (e) {}

    // Migration: rename password to password_hash if it exists
    try {
      await dbPool.query('ALTER TABLE users RENAME COLUMN password TO password_hash');
      console.log('✅ Renamed password to password_hash in users table');
    } catch (e) {}

    // Migration: Add data JSONB column to requests if it doesn't exist
    try {
      await dbPool.query('ALTER TABLE requests ADD COLUMN data JSONB');
      console.log('✅ Added data column to requests table');
    } catch (e) {}

    // Seed initial tenants if empty
    const { rows: existingTenants } = await dbPool.query('SELECT count(*) as count FROM tenants');
    if (parseInt(existingTenants[0].count) === 0) {
      console.log('🌱 Seeding initial tenants...');
      await dbPool.query(`
        INSERT INTO tenants (id, name_th, name_en, email, phone) VALUES 
        ('org_dopa', 'กรมการปกครอง', 'DOPA', 'pdpa@dopa.go.th', '02-221-8150'),
        ('org_rd', 'กรมสรรพากร', 'RD', 'pdpa@rd.go.th', '02-272-8000'),
        ('org_tech_th', 'บริษัท ไทยเทคโนโลยี อินโนเวชั่น จำกัด', 'Thai Tech', 'dpo@thaitech.co.th', '02-999-8888');
      `);
    }

    // Auto-create default-tenant for SINGLE_NODE mode
    if (process.env.SYSTEM_MODE === 'SINGLE_NODE') {
      const { rows: defaultTenant } = await dbPool.query('SELECT id FROM tenants WHERE id = $1', ['default-tenant']);
      if (defaultTenant.length === 0) {
        console.log('🌱 SYSTEM_MODE is SINGLE_NODE: Auto-creating default-tenant...');
        await dbPool.query(`
          INSERT INTO tenants (id, name_th, name_en, email, phone) VALUES 
          ('default-tenant', 'องค์กรของคุณ (Single Node)', 'Your Organization', 'admin@example.com', '02-000-0000');
        `);
      }
    }

    // Migration: ensure public_otps columns can hold long values (key for emails, otp for bcrypt hashes)
    try {
      await dbPool.query(`ALTER TABLE public_otps ALTER COLUMN key TYPE VARCHAR(255);`);
      await dbPool.query(`ALTER TABLE public_otps ALTER COLUMN otp TYPE VARCHAR(255);`);
    } catch (err) {
      console.log('Migration note: public_otps columns might already be updated.', err.message);
    }

    // Seed initial users if empty
    const { rows: existingUsers } = await dbPool.query('SELECT count(*) as count FROM users');
    if (parseInt(existingUsers[0].count) === 0) {
      console.log('🌱 Seeding initial users...');
      const defaultPassword = await bcrypt.hash('123456', 10);
      const superPassword = await bcrypt.hash('12345678', 10);
      await dbPool.query(`
        INSERT INTO users (id, org_id, username, password_hash, full_name_th, email, role, department) VALUES 
        ('usr_super_admin', 'org_dopa', 'super.admin', $2, 'Super Admin', 'admin@pdpa-system.or.th', 'superadmin', 'IT Core'),
        ('usr_admin_01', 'org_dopa', 'admin.pdpa', $1, 'สมเจตน์ จัดการดี (DOPA Admin)', 'admin@dopa.go.th', 'admin', 'เทคโนโลยีสารสนเทศ (กรมการปกครอง)'),
        ('usr_intake_01', 'org_dopa', 'intake.pdpa', $1, 'กิตติพงษ์ รับเรื่อง (DOPA Intake)', 'intake@dopa.go.th', 'intake', 'ศูนย์รับเรื่องร้องเรียน (กรมการปกครอง)'),
        ('usr_dpo_01', 'org_dopa', 'dpo.pdpa', $1, 'สุรพงษ์ ยุติธรรม (DOPA DPO)', 'dpo@dopa.go.th', 'dpo', 'กลุ่มงานคุ้มครองข้อมูลส่วนบุคคล'),
        ('usr_apichat', 'org_dopa', 'apichat.utopia@gmail.com', $2, 'Apichat Utopia', 'apichat.utopia@gmail.com', 'superadmin', 'IT Security'),
        ('usr_intake_demo', 'org_dopa', 'intake.demo', $1, 'สมชาย รับเรื่องทดสอบ (DOPA Intake Only)', 'intake.demo@dopa.go.th', 'intake', 'ศูนย์รับเรื่องและคัดกรองคำขอ PDPA'),
        ('usr_owner_crm', 'org_dopa', 'crm.owner', $1, 'ธนาธร ทะเบียนราษฎร (DOPA Owner)', 'crm@dopa.go.th', 'owner', 'สำนักบริหารการทะเบียน'),
        ('usr_owner_hr', 'org_dopa', 'hr.owner', $1, 'สมรศรี บุคลากร (DOPA HR)', 'hr@dopa.go.th', 'owner', 'กองการเจ้าหน้าที่ (กรมการปกครอง)'),
        ('usr_approver', 'org_dopa', 'exec.pdpa', $1, 'ดร. ประภาส อธิบดี (DOPA Exec)', 'director@dopa.go.th', 'approver', 'ผู้บริหารระดับสูง (กรมการปกครอง)'),
        ('usr_auditor', 'org_dopa', 'audit.pdpa', $1, 'วิลาวัลย์ ตรวจสอบ (Auditor)', 'auditor@external.or.th', 'auditor', 'ผู้ตรวจสอบภายในอิสระ'),
        ('usr_multi_normal', 'org_dopa', 'staff.multi', $1, 'อนุชา ควบหน้าที่ (Intake & Owner)', 'anucha@dopa.go.th', 'intake', 'ศูนย์รับเรื่องและคลังข้อมูล'),
        ('usr_multi_sod_risk', 'org_dopa', 'sod.risk', $1, 'สมศักดิ์ รวบสิทธิ์ (DPO & Approver - SOD Risk)', 'somsak@dopa.go.th', 'dpo', 'ฝ่ายกฎหมายและบริหารจัดการ');
      `, [defaultPassword, superPassword]);

      // Enable MFA for apichat by default
      await dbPool.query("UPDATE users SET mfa_enabled = true WHERE username = 'apichat.utopia@gmail.com'");
    }
    
    // Ensure apichat role is superadmin without overwriting user-defined password
    try {
      await dbPool.query("UPDATE users SET role = 'superadmin', mfa_enabled = true WHERE username = 'apichat.utopia@gmail.com' OR username = 'super.admin'");
    } catch (e) {}

    // ONE-TIME MIGRATION: Clear mockup requests for other organizations except Utopia N&N
    try {
      const { rows } = await dbPool.query("SELECT value FROM system_settings WHERE key = 'cleared_mockup_reqs_utopia'");
      if (rows.length === 0) {
        console.log('🧹 Clearing mockup requests from other organizations...');
        await dbPool.query("DELETE FROM requests WHERE org_id != 'org_028384'");
        await dbPool.query("INSERT INTO system_settings (key, value) VALUES ('cleared_mockup_reqs_utopia', 'true')");
        console.log('✅ Cleared mockup requests successfully.');
      }
    } catch (e) {
      console.error('Error clearing mockup requests:', e.message);
    }

    // Check and add signature_image column to users table if it doesn't exist
    try {
      await dbPool.query('ALTER TABLE users ADD COLUMN signature_image TEXT');
      console.log('✅ Added signature_image column to users table');
    } catch (e) {
      if (e.code === '42701') {
        console.log('ℹ️ signature_image column already exists in users table');
      } else {
        console.error('❌ Error adding signature_image column:', e.message);
      }
    }

    // [SECURITY] Migration 002: Account Lockout columns (VULN-04)
    try {
      await dbPool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0');
      await dbPool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ');
      await dbPool.query(`
        CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users (locked_until)
        WHERE locked_until IS NOT NULL
      `);
      console.log('✅ Account lockout columns ready (failed_login_attempts, locked_until)');
    } catch (e) {
      console.error('❌ Error adding account lockout columns:', e.message);
    }

    // [SECURITY] Migration 003: MFA / TOTP columns
    try {
      await dbPool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT');
      await dbPool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT false');
      console.log('✅ MFA / TOTP columns ready (totp_secret, totp_enabled)');
    } catch (e) {
      console.error('❌ Error adding MFA columns:', e.message);
    }

    // Run migration: Update old 'Complete' status to 'Documents Verified' in both column and JSON data
    try {
      const { rows } = await dbPool.query("SELECT id, data FROM requests WHERE status = 'Complete' OR data->>'status' = 'Complete'");
      
      for (const row of rows) {
        if (row.data) {
          row.data.status = 'Documents Verified';
          if (Array.isArray(row.data.statusHistory)) {
            row.data.statusHistory.forEach(h => {
              if (h.status === 'Complete') {
                h.status = 'Documents Verified';
              }
            });
          }
          await dbPool.query("UPDATE requests SET status = 'Documents Verified', data = $1 WHERE id = $2", [row.data, row.id]);
        }
      }
      console.log('✅ Migrated Complete status to Documents Verified');
    } catch (e) {
      console.log('Migration error:', e);
    }

    // ── Seed Workflow Engine data (idempotent) ────────────────────────────
    await seedWorkflowData(dbPool);
    
    // ── Seed RoPA Master Data (idempotent) ────────────────────────────────
    await seedRopaMasterData(dbPool);

    // ── Load workflow transition cache into memory ─────────────────────────
    await refreshTransitionCache(dbPool);

    console.log('✅ PostgreSQL Database Initialized Successfully');
  } catch (error) {
    console.error('❌ Database Initialization Error:', error);
  }
};
