const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

// Configuration
const BUCKET_NAME = 'pdpa-portal-backup';
const PREFIX = 'database_backups/'; // Folder in R2
// Get destination folder from command line arguments, default to D:\PDPA_Backups
const DEST_FOLDER = process.argv[2] || 'D:\\PDPA_Backups';

// Initialize R2 Client
const s3 = new S3Client({
  region: 'auto',
  endpoint: 'https://1c30f4a4fa4c5ccec8107622d36374f9.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: 'f2dc90cedb4d2b0331cd6a15df39b773',
    secretAccessKey: 'ea3e06a829db2f6836576ea2633e176245e0f9f81be9eeb0fe0865e4b91b58da'
  }
});

async function syncBackups() {
  console.log(`\n=================================================`);
  console.log(`[PDPA Backup Sync] เริ่มต้นการซิงค์ข้อมูลจาก R2`);
  console.log(`โฟลเดอร์ปลายทาง: ${DEST_FOLDER}`);
  console.log(`=================================================\n`);

  // Create destination folder if it doesn't exist
  if (!fs.existsSync(DEST_FOLDER)) {
    console.log(`[Info] กำลังสร้างโฟลเดอร์: ${DEST_FOLDER}`);
    fs.mkdirSync(DEST_FOLDER, { recursive: true });
  }

  try {
    // 1. List all files in the bucket
    console.log(`[Info] กำลังดึงรายชื่อไฟล์จาก Cloudflare R2...`);
    const listCmd = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: PREFIX
    });
    
    const data = await s3.send(listCmd);
    const objects = data.Contents || [];
    
    if (objects.length === 0) {
      console.log(`[Info] ไม่พบไฟล์ Backup ใน R2`);
      return;
    }

    let downloadCount = 0;
    let skipCount = 0;

    // 2. Loop through files and download if missing
    for (const obj of objects) {
      // Skip the folder itself if returned
      if (obj.Key === PREFIX || obj.Key.endsWith('/')) continue;

      const fileName = path.basename(obj.Key);
      const localFilePath = path.join(DEST_FOLDER, fileName);

      // Check if file already exists locally
      if (fs.existsSync(localFilePath)) {
        // Option: we could also check file size to be absolutely sure, but filename has timestamp so it's unique
        const stats = fs.statSync(localFilePath);
        if (stats.size === obj.Size) {
          console.log(`[Skip] มีไฟล์นี้อยู่แล้ว: ${fileName}`);
          skipCount++;
          continue;
        } else {
          console.log(`[Update] ไฟล์ ${fileName} มีขนาดไม่ตรงกัน จะทำการดาวน์โหลดใหม่...`);
        }
      }

      // Download file
      console.log(`[Download] กำลังโหลดไฟล์ใหม่: ${fileName} (${(obj.Size / (1024 * 1024)).toFixed(2)} MB)...`);
      const getCmd = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: obj.Key
      });

      const response = await s3.send(getCmd);
      await pipeline(response.Body, fs.createWriteStream(localFilePath));
      console.log(`  -> ดาวน์โหลดสำเร็จ!`);
      downloadCount++;
    }

    console.log(`\n=================================================`);
    console.log(`[สรุปผล] ซิงค์ข้อมูลเสร็จสมบูรณ์!`);
    console.log(`- ดาวน์โหลดไฟล์ใหม่: ${downloadCount} ไฟล์`);
    console.log(`- ข้ามไฟล์ที่มีอยู่แล้ว: ${skipCount} ไฟล์`);
    console.log(`=================================================\n`);

  } catch (error) {
    console.error(`\n[Error] เกิดข้อผิดพลาดระหว่างการซิงค์:`, error.message);
  }
}

syncBackups();
