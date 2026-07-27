import * as otplib from 'otplib';
const { authenticator } = otplib;

const secret = authenticator.generateSecret();
console.log('Secret:', secret);
const uri = authenticator.keyuri('intake.uto', 'PDPA', secret);
console.log('URI:', uri);
