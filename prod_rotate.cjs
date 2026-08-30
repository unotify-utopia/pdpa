const { Client } = require('ssh2');

const script = `
# 1. Find directory
cd /var/www/pdpa-enterprise-backend || cd /var/www/pdpa || exit 1
pwd

# 2. Backup and Git
cp .env .env.backup
git rm --cached .env || true
git commit -m "chore: remove .env from git tracking for security" || true

# 3. Rotate DB Password
NEW_DB_PASS="P@ssw0rdProd_$(date +%s)_Secure"
echo "New DB Pass: $NEW_DB_PASS"

sudo -u postgres psql -c "ALTER USER pdpa_admin WITH PASSWORD '$NEW_DB_PASS';"

# 4. Update .env
sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$NEW_DB_PASS/" .env

# 5. Restart PM2 to apply DB change
pm2 restart all
`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(script, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', d => process.stdout.write(d.toString()))
      .stderr.on('data', d => process.stderr.write(d.toString()));
  });
}).connect({ host: '119.59.124.169', port: 22, username: 'root', password: 'wN4^bR7*vM1%xH+0qF(5' });
