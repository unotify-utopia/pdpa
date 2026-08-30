const { Client } = require('ssh2');
const fs = require('fs');

const importScript = `
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  user: 'pdpa_admin',
  host: 'localhost',
  database: 'pdpa_single_db',
  password: 'T7#yM2@pW9$vK5^nR8!cJ4&q',
  port: 5432,
});

async function importData() {
  const data = JSON.parse(fs.readFileSync('/tmp/utopia_dump.json', 'utf8'));
  const targetOrgId = 'default-tenant';

  // Helper to construct INSERT queries from JSON objects
  const insertQuery = (table, rows) => {
    if (!rows || rows.length === 0) return null;
    const columns = Object.keys(rows[0]).filter(c => c !== 'org_id');
    const hasOrgId = rows[0].hasOwnProperty('org_id');
    const finalCols = hasOrgId ? [...columns, 'org_id'] : columns;
    
    let query = 'INSERT INTO ' + table + ' (' + finalCols.map(c => '"' + c + '"').join(', ') + ') VALUES ';
    
    const values = [];
    const valueSets = [];
    let counter = 1;
    
    for (const row of rows) {
      const rowValues = [];
      for (const col of columns) {
        rowValues.push('$' + counter++);
        let val = row[col];
        if (typeof val === 'object' && val !== null) {
          val = JSON.stringify(val);
        }
        values.push(val);
      }
      if (hasOrgId) {
        rowValues.push('$' + counter++);
        values.push(targetOrgId);
      }
      valueSets.push('(' + rowValues.join(', ') + ')');
    }
    
    query += valueSets.join(', ') + ' ON CONFLICT DO NOTHING;';
    return { query, values };
  };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Deleting existing default-tenant data...');
    await client.query("DELETE FROM users WHERE org_id = $1", [targetOrgId]);
    await client.query("DELETE FROM requests WHERE org_id = $1", [targetOrgId]);
    await client.query("DELETE FROM ropa_processing_activities WHERE org_id = $1", [targetOrgId]);
    
    console.log('Inserting Utopia data...');
    const tables = [
      'users',
      'requests',
      'ropa_processing_activities',
      'ropa_activity_data_subjects',
      'ropa_activity_data_categories',
      'ropa_activity_recipients',
      'ropa_versions'
    ];
    
    for (const table of tables) {
      const rows = data[table] || [];
      console.log('Importing ' + rows.length + ' rows into ' + table + '...');
      
      const chunkSize = 200;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const q = insertQuery(table, chunk);
        if (q) {
          await client.query(q.query, q.values);
        }
      }
    }
    
    await client.query('COMMIT');
    console.log('Import successful!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Import Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

importData();
`;

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected to Sandbox Server');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    console.log('Uploading JSON dump...');
    sftp.fastPut('utopia_dump.json', '/tmp/utopia_dump.json', (err) => {
      if (err) throw err;
      console.log('Upload complete. Running import script...');
      
      const cmd = "cat << 'EOF' > /var/www/pdpa-sandbox/import_utopia.cjs\n" + importScript + "\nEOF\ncd /var/www/pdpa-sandbox && node import_utopia.cjs";
      conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end())
          .on('data', (data) => console.log(data.toString()))
          .stderr.on('data', (data) => console.error('STDERR: ' + data.toString()));
      });
    });
  });
}).connect({ host: '119.59.102.26', port: 22, username: 'root', password: 'P8&xK!2mYc@5bW4^nJ7*' });
