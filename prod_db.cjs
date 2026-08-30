const { Client } = require('ssh2');

const scriptContent = `
rm -f /root/u_*.json
sudo -u postgres psql -d pdpa_prod_db -t -A -c "SELECT COALESCE(json_agg(t), '[]'::json) FROM (SELECT * FROM users WHERE org_id = 'org_028384') t;" > /root/u_users.json
sudo -u postgres psql -d pdpa_prod_db -t -A -c "SELECT COALESCE(json_agg(t), '[]'::json) FROM (SELECT * FROM requests WHERE org_id = 'org_028384') t;" > /root/u_requests.json
sudo -u postgres psql -d pdpa_prod_db -t -A -c "SELECT COALESCE(json_agg(t), '[]'::json) FROM (SELECT * FROM ropa_processing_activities WHERE org_id = 'org_028384') t;" > /root/u_ropa.json
sudo -u postgres psql -d pdpa_prod_db -t -A -c "SELECT COALESCE(json_agg(t), '[]'::json) FROM (SELECT * FROM system_settings) t;" > /root/u_settings.json

sudo -u postgres psql -d pdpa_prod_db -t -A -c "SELECT COALESCE(json_agg(t), '[]'::json) FROM (SELECT c.* FROM ropa_activity_data_subjects c JOIN ropa_processing_activities p ON c.activity_id = p.id WHERE p.org_id = 'org_028384') t;" > /root/u_ropa_sub.json
sudo -u postgres psql -d pdpa_prod_db -t -A -c "SELECT COALESCE(json_agg(t), '[]'::json) FROM (SELECT c.* FROM ropa_activity_data_categories c JOIN ropa_processing_activities p ON c.activity_id = p.id WHERE p.org_id = 'org_028384') t;" > /root/u_ropa_cat.json
sudo -u postgres psql -d pdpa_prod_db -t -A -c "SELECT COALESCE(json_agg(t), '[]'::json) FROM (SELECT c.* FROM ropa_activity_recipients c JOIN ropa_processing_activities p ON c.activity_id = p.id WHERE p.org_id = 'org_028384') t;" > /root/u_ropa_rec.json
sudo -u postgres psql -d pdpa_prod_db -t -A -c "SELECT COALESCE(json_agg(t), '[]'::json) FROM (SELECT c.* FROM ropa_versions c JOIN ropa_processing_activities p ON c.activity_id = p.id WHERE p.org_id = 'org_028384') t;" > /root/u_ropa_ver.json

python3 -c "
import json
data = {}
files = {
  'users': '/root/u_users.json',
  'requests': '/root/u_requests.json',
  'ropa_processing_activities': '/root/u_ropa.json',
  'system_settings': '/root/u_settings.json',
  'ropa_activity_data_subjects': '/root/u_ropa_sub.json',
  'ropa_activity_data_categories': '/root/u_ropa_cat.json',
  'ropa_activity_recipients': '/root/u_ropa_rec.json',
  'ropa_versions': '/root/u_ropa_ver.json'
}
for k, f in files.items():
  with open(f, 'r') as fp:
    txt = fp.read().strip()
    try:
        data[k] = json.loads(txt) if txt else []
    except json.JSONDecodeError as e:
        print('Error decoding', k)
        data[k] = []
with open('/root/utopia_dump.json', 'w') as fp:
  json.dump(data, fp)
"
cat /root/utopia_dump.json
`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cat << 'EOF' > /root/export.sh\n${scriptContent}\nEOF\nbash /root/export.sh`, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('close', () => {
      require('fs').writeFileSync('utopia_dump.json', out);
      console.log('Downloaded utopia_dump.json to local machine. Size: ' + out.length + ' bytes');
      conn.end();
    }).on('data', (data) => {
      out += data.toString();
    }).stderr.on('data', (data) => console.error('STDERR:\n' + data.toString()));
  });
}).connect({ host: '119.59.124.169', port: 22, username: 'root', password: 'wN4^bR7*vM1%xH+0qF(5' });
