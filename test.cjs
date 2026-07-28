const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

pool.query("SELECT tracking_no, created_at, data->'requester'->>'firstName' as fn, data->'requester'->>'lastName' as ln FROM requests ORDER BY created_at DESC LIMIT 10")
  .then(res => {
    console.log(JSON.stringify(res.rows, null, 2));
    pool.end();
  })
  .catch(err => {
    console.error(err);
    pool.end();
  });
