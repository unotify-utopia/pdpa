import { runBackup } from './services/backup.service.js';

console.log('--- เริ่มการทดสอบ Backup แบบ Manual ---');
runBackup().then(() => {
    console.log('--- ทดสอบ Backup เสร็จสิ้น ---');
    process.exit(0);
}).catch(err => {
    console.error('--- ทดสอบล้มเหลว ---', err);
    process.exit(1);
});
