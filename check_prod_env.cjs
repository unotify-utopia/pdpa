const { Client } = require("ssh2");
const conn = new Client();
conn.on("ready", () => {
  conn.exec("cat /var/www/pdpa/.env | grep -E '(REDIS|OTP_SENDER|FRONTEND)'", (err, stream) => {
    if (err) throw err;
    stream.on("close", () => conn.end())
          .on("data", (data) => console.log(data.toString()))
          .stderr.on("data", (data) => console.error(data.toString()));
  });
}).on("error", (err) => {
  console.error("SSH ERROR:", err);
}).connect({ host: "119.59.124.169", port: 22, username: "root", password: "9EIy;45Gf2n-" });
