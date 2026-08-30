const { authenticator } = require('otplib');
const secret = 'PYFTA73GJFDAMEQD';
const target = '903065';
// search +/- 365 days
const timeMs = new Date('2026-08-29T08:36:10+07:00').getTime();
let found = false;
// 1 year = 365 * 24 * 60 * 2 = 1,051,200 windows
for (let i = -1051200; i <= 1051200; i++) {
  const t = timeMs + i * 30000;
  authenticator.options = { epoch: t };
  if (authenticator.generate(secret) === target) {
    console.log('FOUND MATCH AT:', new Date(t).toISOString(), '(offset minutes:', (i * 30) / 60, ')');
    found = true;
    break;
  }
}
if (!found) console.log('Not found in +/- 1 year');
