import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Applies a diagonal watermark to a PDF or Image base64 string
 * @param {string} base64Data - The file content in base64 (with or without data: MIME prefix)
 * @param {string} filename - The name of the file to determine extension
 * @param {string} trackingNo - Request tracking number for the watermark text
 * @returns {Promise<string>} - Watermarked base64 string
 */
export async function applyWatermark(base64Data, filename, trackingNo) {
  const isPdf = filename.toLowerCase().endsWith('.pdf');
  const isImage = filename.toLowerCase().match(/\.(jpg|jpeg|png)$/);
  
  if (!isPdf && !isImage) return base64Data; // Ignore unsupported types
  
  const hasPrefix = base64Data.includes(',');
  const pureBase64 = hasPrefix ? base64Data.split(',')[1] : base64Data;
  const prefix = hasPrefix ? base64Data.split(',')[0] + ',' : '';
  
  const buffer = Buffer.from(pureBase64, 'base64');
  
  const watermarkText1 = `SUPPORTING DOCUMENT FOR REQUEST ${trackingNo}`;
  const watermarkText2 = `CONFIDENTIAL: FOR AUTHORIZED USE ONLY`;
  
  try {
    if (isPdf) {
      const pdfDoc = await PDFDocument.load(buffer);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const pages = pdfDoc.getPages();
      
      for (const page of pages) {
        const { width, height } = page.getSize();
        const fontSize = Math.floor(Math.min(width, height) * 0.035);
        
        const drawText = (text, yOffset) => {
          const textWidth = helveticaFont.widthOfTextAtSize(text, fontSize);
          
          // Calculate center and rotate
          page.drawText(text, {
            x: width / 2 - (textWidth / 2) * Math.cos(Math.PI / 4) + yOffset * Math.sin(Math.PI / 4),
            y: height / 2 - (textWidth / 2) * Math.sin(Math.PI / 4) - yOffset * Math.cos(Math.PI / 4),
            size: fontSize,
            font: helveticaFont,
            color: rgb(0.5, 0.5, 0.5),
            opacity: 0.3,
            rotate: degrees(45)
          });
        };
        
        drawText(watermarkText1, 30);
        drawText(watermarkText2, -30);
      }
      
      const pdfBytes = await pdfDoc.save();
      return prefix + Buffer.from(pdfBytes).toString('base64');
    } 
    
    if (isImage) {
      const metadata = await sharp(buffer).metadata();
      const width = metadata.width || 800;
      const height = metadata.height || 1000;
      const fontSize = Math.floor(width * 0.035);
      
      const svgOverlay = `
        <svg width="${width}" height="${height}">
          <style>
            .watermark {
              fill: rgba(128, 128, 128, 0.3);
              font-size: ${fontSize}px;
              font-family: Arial, Helvetica, sans-serif;
              font-weight: bold;
              text-anchor: middle;
              transform-origin: ${width/2}px ${height/2}px;
              transform: rotate(-45deg);
            }
          </style>
          <text x="${width/2}" y="${height/2 - 20}" class="watermark">${watermarkText1}</text>
          <text x="${width/2}" y="${height/2 + 30}" class="watermark">${watermarkText2}</text>
        </svg>
      `;
      
      const watermarkedBuffer = await sharp(buffer)
        .composite([{ input: Buffer.from(svgOverlay), blend: 'over' }])
        .toBuffer();
        
      return prefix + watermarkedBuffer.toString('base64');
    }
  } catch (err) {
    console.error('Watermark application failed:', err);
    // Fallback to original file if watermarking fails
    return base64Data;
  }
  
  return base64Data;
}
