import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ALGORITHM = 'aes-256-cbc';

const getValidKey = (key) => {
    return crypto.createHash('sha256').update(key || 'default-secret-pdpa-key-change-me').digest();
};

const decryptFile = async (inputFile, outputFile) => {
    console.log(`[Decrypt] เริ่มกระบวนการถอดรหัสไฟล์: ${inputFile}`);
    
    if (!fs.existsSync(inputFile)) {
        console.error(`[Decrypt] ❌ ไม่พบไฟล์: ${inputFile}`);
        process.exit(1);
    }

    try {
        await new Promise((resolve, reject) => {
            const input = fs.createReadStream(inputFile);
            
            // อ่าน 16 bytes แรกเพื่อเอาค่า IV
            let iv = Buffer.alloc(0);
            
            input.on('readable', () => {
                if (iv.length < 16) {
                    const chunk = input.read(16 - iv.length);
                    if (chunk) {
                        iv = Buffer.concat([iv, chunk]);
                    }
                }
                
                // เมื่ออ่าน IV ครบ 16 bytes แล้ว เริ่มถอดรหัสได้
                if (iv.length === 16) {
                    const key = getValidKey(process.env.BACKUP_ENCRYPTION_KEY);
                    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
                    
                    const output = fs.createWriteStream(outputFile);
                    
                    // ปล่อยข้อมูลส่วนที่เหลือไหลเข้าตัวถอดรหัส
                    input.pipe(decipher).pipe(output);
                    
                    output.on('finish', resolve);
                    output.on('error', reject);
                }
            });
            
            input.on('error', reject);
        });
        
        console.log(`[Decrypt] ✅ ถอดรหัสเสร็จสมบูรณ์! บันทึกไฟล์ที่: ${outputFile}`);
        console.log(`[Decrypt] คุณสามารถนำไฟล์นี้ไป Restore ใน PostgreSQL ได้เลย`);
    } catch (error) {
        console.error('[Decrypt] ❌ เกิดข้อผิดพลาดในการถอดรหัส (รหัสผ่านอาจไม่ถูกต้อง หรือไฟล์เสียหาย):', error.message);
    }
};

// รับค่าจาก Command Line
const args = process.argv.slice(2);
if (args.length < 1) {
    console.log(`การใช้งาน: node decrypt-backup.mjs <ชื่อไฟล์.enc> [ชื่อไฟล์ปลายทาง.sql]`);
    console.log(`ตัวอย่าง: node decrypt-backup.mjs pdpa-db-2026.sql.enc`);
    process.exit(1);
}

const inputFile = path.resolve(args[0]);
let outputFile = args[1] ? path.resolve(args[1]) : inputFile.replace('.enc', '');

if (inputFile === outputFile) {
    outputFile = inputFile + '.decrypted.sql';
}

decryptFile(inputFile, outputFile);
