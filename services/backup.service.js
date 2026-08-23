import cron from 'node-cron';
import { exec } from 'child_process';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// ตั้งค่า AWS SDK เพื่อเชื่อมต่อกับ Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT, 
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  }
});

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const ALGORITHM = 'aes-256-cbc';

// สร้างโฟลเดอร์สำหรับเก็บไฟล์ชั่วคราว
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// ตรวจสอบความยาวของ Key ให้ได้ 32 bytes พอดีสำหรับ AES-256
const getValidKey = (key) => {
    return crypto.createHash('sha256').update(key || 'default-secret-pdpa-key-change-me').digest();
};

export const runBackup = async () => {
    console.log('[Backup] เริ่มกระบวนการสำรองข้อมูลฐานข้อมูล...');
    const timestamp = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).replace(/[: ]/g, '-');
    const dumpFile = path.join(BACKUP_DIR, `pdpa-db-${timestamp}.sql`);
    const encryptedFile = path.join(BACKUP_DIR, `pdpa-db-${timestamp}.sql.enc`);

    const pgDumpCmd = `pg_dump -U ${process.env.DB_USER} -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} ${process.env.DB_NAME} -f "${dumpFile}"`;

    try {
        // 1. ดึงข้อมูลจากฐานข้อมูล
        console.log(`[Backup] กำลังดึงข้อมูลจาก Database...`);
        await new Promise((resolve, reject) => {
            exec(pgDumpCmd, {
                env: {
                    ...process.env,
                    PGPASSWORD: process.env.DB_PASSWORD, // ส่งรหัสผ่านอย่างปลอดภัย
                }
            }, (error, stdout, stderr) => {
                if (error) {
                    console.error('[Backup] คำสั่ง pg_dump ล้มเหลว:', stderr);
                    return reject(error);
                }
                resolve();
            });
        });
        console.log(`[Backup] สร้างไฟล์ Dump สำเร็จ: ${dumpFile}`);

        // 2. เข้ารหัสไฟล์
        console.log(`[Backup] กำลังเข้ารหัสไฟล์...`);
        await new Promise((resolve, reject) => {
            const iv = crypto.randomBytes(16); // Initialization vector (สร้างแบบสุ่มทุกครั้ง)
            const key = getValidKey(process.env.BACKUP_ENCRYPTION_KEY);
            const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
            
            const input = fs.createReadStream(dumpFile);
            const output = fs.createWriteStream(encryptedFile);

            // แปะค่า IV ไว้ที่หัวไฟล์เพื่อให้รู้ว่าตอนถอดรหัสต้องใช้ IV อะไร (IV ไม่ใช่ความลับ)
            output.write(iv);

            input.pipe(cipher).pipe(output);

            output.on('finish', resolve);
            output.on('error', reject);
        });
        console.log(`[Backup] เข้ารหัสไฟล์สำเร็จ: ${encryptedFile}`);

        // 3. อัปโหลดขึ้น Cloudflare R2
        console.log('[Backup] กำลังอัปโหลดไปยัง Cloudflare R2...');
        const fileStream = fs.createReadStream(encryptedFile);
        
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: process.env.R2_BUCKET_NAME || 'pdpa-portal-backup',
                Key: `database_backups/pdpa-db-${timestamp}.sql.enc`,
                Body: fileStream,
            }
        });

        // สามารถแสดง % ความคืบหน้าได้ถ้าไฟล์ใหญ่
        upload.on('httpUploadProgress', (progress) => {
            if (progress.loaded && progress.total) {
                console.log(`[Backup] อัปโหลด: ${Math.round((progress.loaded / progress.total) * 100)}%`);
            }
        });

        await upload.done();
        console.log('[Backup] อัปโหลดข้อมูลเสร็จสมบูรณ์!');

        // 4. ลบไฟล์ชั่วคราว
        fs.unlinkSync(dumpFile);
        fs.unlinkSync(encryptedFile);
        console.log('[Backup] ทำความสะอาดไฟล์ชั่วคราวบนเครื่องสำเร็จ');

    } catch (error) {
        console.error('[Backup] เกิดข้อผิดพลาดในระบบสำรองข้อมูล:', error);
        // todo: สามารถเรียกใช้ email.service.js เพื่อส่งเมลเตือนแอดมินได้ที่นี่
    }
};

export const startBackupScheduler = () => {
    // ตั้งเวลาให้ทำงานทุกวัน เวลา 02:00 น.
    cron.schedule('0 2 * * *', () => {
        console.log('[Backup] ถึงเวลาทำ Automated Backup แล้ว...');
        runBackup();
    });
    console.log('[Backup] ⏰ ระบบจัดเตรียมสำรองข้อมูลถูกเปิดใช้งาน (จะทำงานทุกวันเวลา 02:00 น.)');
};
