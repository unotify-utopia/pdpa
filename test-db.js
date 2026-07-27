import 'dotenv/config';
import pg from 'pg';

const dbPool = new pg.Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function checkCols() {
  try {
    const res = await dbPool.query("SELECT column_name FROM information_schema.columns WHERE table_name='users'");
    console.log(res.rows.map(r => r.column_name));
  } catch (err) {
    console.error(err);
  } finally {
    dbPool.end();
  }
}
checkCols();
