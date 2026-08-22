import pg from 'pg';
import dotenv from 'dotenv';
import { initDatabase } from './services/database.init.js';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

async function run() {
  console.log('Initializing database...');
  await initDatabase(pool);
  console.log('Checking ropa_records table...');
  const res = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'ropa_records'
  `);
  console.log('Table columns:');
  console.table(res.rows);
  await pool.end();
}

run().catch(console.error);
