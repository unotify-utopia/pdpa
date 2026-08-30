const { Client } = require("ssh2");
const conn = new Client();

const commands = [
  "echo '--- Checking directory ---'",
  "cd /var/www/pdpa || cd /var/www/pdpa-portal",
  "echo '--- Installing Redis on Production ---'",
  "apt-get update && apt-get install redis-server -y",
  "systemctl enable redis-server && systemctl start redis-server",
  "echo '--- Updating Code ---'",
  "git fetch origin sandbox-single-node",
  "git checkout sandbox-single-node",
  "git pull origin sandbox-single-node",
  "npm install",
  "npm run build",
  "echo '--- Setting up REDIS_URL in .env ---'",
  "grep -q 'REDIS_URL' .env || echo '\nREDIS_URL=redis://localhost:6379' >> .env",
  "grep -q 'OTP_SENDER_EMAIL' .env || echo '\nOTP_SENDER_EMAIL=noreply@pdpa.click' >> .env",
  "sed -i 's/^EMAIL_FROM=.*/EMAIL_FROM=noreply@pdpa.click/' .env",
  "echo '--- Restarting Server ---'",
  "pm2 restart all --update-env",
  "pm2 save"
];

conn.on("ready", () => {
  console.log("Client :: ready");
  conn.exec(commands.join(" && "), (err, stream) => {
    if (err) throw err;
    stream.on("close", (code, signal) => {
      console.log("Stream :: close :: code: " + code + ", signal: " + signal);
      conn.end();
    }).on("data", (data) => {
      console.log("STDOUT: " + data);
    }).stderr.on("data", (data) => {
      console.error("STDERR: " + data);
    });
  });
}).connect({
  host: "119.59.124.169",
  port: 22,
  username: "root",
  password: "wN4^bR7*vM1%xH+0qF(5"
});
