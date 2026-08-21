import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function resetTransactions() {
  console.log('⚠️ WARNING: You are about to DELETE all transactional data (Requests, Logs, Files, OTPs).');
  console.log('Master data (Users, Organizations, Workflow Config) will NOT be affected.');
  console.log('Press Ctrl+C within 5 seconds to abort...');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('\n🚀 Starting database reset...');
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🧹 Clearing download_tokens...');
    await client.query('TRUNCATE TABLE download_tokens CASCADE');
    
    console.log('🧹 Clearing task_files...');
    await client.query('TRUNCATE TABLE task_files CASCADE');
    
    console.log('🧹 Clearing audit_logs...');
    await client.query('TRUNCATE TABLE audit_logs CASCADE');
    
    console.log('🧹 Clearing public_otps...');
    await client.query('TRUNCATE TABLE public_otps CASCADE');
    
    console.log('🧹 Clearing requests...');
    await client.query('TRUNCATE TABLE requests CASCADE');
    
    await client.query('COMMIT');
    console.log('\n✅ Reset completed successfully! All mock transactions have been wiped.');
    console.log('Users and Organizations remain intact.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during reset:', err);
  } finally {
    client.release();
    pool.end();
  }
}

resetTransactions();
