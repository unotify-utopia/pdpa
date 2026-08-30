const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'pdpa_admin',
  password: process.env.DB_PASSWORD || 'PdpaSecure_Prod2026',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'pdpa_prod_db',
  port: parseInt(process.env.DB_PORT || '5432')
});

async function run() {
  try {
    await pool.query(`
      INSERT INTO audit_logs (id, action, details, actor_id, target_id, ip_address, timestamp) VALUES 
      ('mock_1', 'OTP_VERIFICATION_FAILED', 'Incorrect OTP attempt for key: admin@dopa.go.th', 'system', 'system', '192.168.1.105', NOW() - INTERVAL '5 minutes'),
      ('mock_2', 'SUPERADMIN_LOGIN_FAILED', 'Invalid password for user: super.admin', 'system', 'system', '10.0.0.52', NOW() - INTERVAL '25 minutes'),
      ('mock_3', 'PAYLOAD_TOO_LARGE_ATTEMPT', 'Request exceeded 10MB limit on /api/requests', 'system', 'system', '45.33.12.99', NOW() - INTERVAL '2 hours'),
      ('mock_4', 'FRONTEND_PAYLOAD_TOO_LARGE', 'Blocked malicious large base64 upload', 'system', 'system', '118.175.22.41', NOW() - INTERVAL '5 hours'),
      ('mock_5', 'OTP_VERIFICATION_FAILED', 'OTP expired for key: REQ-028384', 'system', 'system', '127.0.0.1', NOW() - INTERVAL '1 day')
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ 5 Mock Security Alerts inserted successfully.');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}

run();
