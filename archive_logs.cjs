const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:123456@localhost:5432/pdpa_db'
});

const ARCHIVE_DIR = path.join(__dirname, 'archives');

async function archiveLogs() {
  console.log('[Archiver] Starting audit log archival process...');
  
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR);
  }

  const retentionDays = parseInt(process.env.LOG_RETENTION_DAYS || '90', 10);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  const client = await pool.connect();
  
  try {
    // 1. Find logs older than the cutoff date
    const { rows } = await client.query(
      'SELECT * FROM audit_logs WHERE timestamp < $1',
      [cutoffDate.toISOString()]
    );

    if (rows.length === 0) {
      console.log(`[Archiver] No logs older than ${retentionDays} days found. Nothing to archive.`);
      return;
    }

    console.log(`[Archiver] Found ${rows.length} logs to archive.`);

    // 2. Write to a compressed file
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `audit_logs_archive_${dateStr}_count_${rows.length}.json.gz`;
    const filePath = path.join(ARCHIVE_DIR, filename);

    const jsonString = JSON.stringify(rows, null, 2);
    const compressed = zlib.gzipSync(jsonString);
    fs.writeFileSync(filePath, compressed);

    console.log(`[Archiver] Archived ${rows.length} logs to ${filePath}`);

    // 3. Delete from database
    await client.query('BEGIN');
    
    // We delete by ID to ensure we only delete what we exported
    const ids = rows.map(r => r.id);
    
    const batchSize = 1000;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batchIds = ids.slice(i, i + batchSize);
      const placeholders = batchIds.map((_, idx) => `$${idx + 1}`).join(',');
      await client.query(`DELETE FROM audit_logs WHERE id IN (${placeholders})`, batchIds);
    }
    
    await client.query('COMMIT');
    console.log(`[Archiver] Successfully deleted ${rows.length} archived logs from the database.`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Archiver] Error during archival:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Execute if run directly
if (require.main === module) {
  archiveLogs();
}

module.exports = archiveLogs;
