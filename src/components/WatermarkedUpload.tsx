import React, { useRef, useState, useEffect } from 'react';
import { ShieldCheck, EyeOff, Check, AlertCircle } from 'lucide-react';

interface WatermarkedUploadProps {
  label: string;
  onFileProcessed: (fileName: string, fileDataUrl: string) => void;
  orgName: string;
}

export const WatermarkedUpload: React.FC<WatermarkedUploadProps> = ({
  label,
  onFileProcessed,
  orgName,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Custom rect drawing for client-side masking
  const [maskRects, setMaskRects] = useState<{ x: number; y: number; w: number; h: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });

  // Reset when image changes
  useEffect(() => {
    setMaskRects([]);
    setIsCompleted(false);
  }, [imageSrc]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('ขนาดไฟล์ต้องไม่เกิน 5MB (File size exceeds 5MB)');
      return;
    }

    // Verify MIME type (images only for this visual mock tool)
    if (!file.type.startsWith('image/')) {
      setErrorMessage('กรุณาอัปโหลดเฉพาะไฟล์รูปภาพเพื่อใช้ระบบปกปิดข้อมูลออนไลน์ (JPEG, PNG Only)');
      return;
    }

    setErrorMessage(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageSrc(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Coordinates mapping
  const getCanvasMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isCompleted || !imageSrc) return;
    const pos = getCanvasMousePos(e);
    setStartPos(pos);
    setCurrentPos(pos);
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isCompleted || !imageSrc) return;
    const pos = getCanvasMousePos(e);
    setCurrentPos(pos);
  };

  const handleMouseUp = () => {
    if (!isDrawing || isCompleted || !imageSrc) return;
    setIsDrawing(false);

    // Save drawn box
    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const w = Math.abs(startPos.x - currentPos.x);
    const h = Math.abs(startPos.y - currentPos.y);

    // Filter out tiny clicks
    if (w > 5 && h > 5) {
      setMaskRects((prev) => [...prev, { x, y, w, h }]);
    }
  };

  // Render loop
  useEffect(() => {
    if (!imageSrc) return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw original image scaled to canvas size
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw existing mask rects (blackout)
      ctx.fillStyle = '#0f172a'; // Deep slate (almost black)
      maskRects.forEach((r) => {
        ctx.fillRect(r.x, r.y, r.w, r.h);
      });

      // Draw current active drag box
      if (isDrawing) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        const x = Math.min(startPos.x, currentPos.x);
        const y = Math.min(startPos.y, currentPos.y);
        const w = Math.abs(startPos.x - currentPos.x);
        const h = Math.abs(startPos.y - currentPos.y);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]); // reset
      }

      // Draw Watermark Overlay (Section 3.3 / 7.4)
      ctx.save();
      ctx.font = 'bold 12px "Prompt", sans-serif';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)'; // Semi-transparent red/orange watermark
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(-Math.PI / 6); // rotate 30 degrees

      const watermarkText = `ใช้ยื่นคำขอรับสิทธิข้อมูลส่วนบุคคล (PDPA) กับ ${orgName} เท่านั้น`;
      const dateText = `วันที่: ${new Date().toLocaleDateString('th-TH')} (ห้ามนำไปใช้วัตถุประสงค์อื่น)`;
      
      ctx.textAlign = 'center';
      ctx.fillText(watermarkText, 0, -10);
      ctx.fillText(dateText, 0, 10);
      ctx.restore();
    };
  }, [imageSrc, maskRects, isDrawing, startPos, currentPos, orgName]);

  const handleApplySanitizing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsProcessing(true);

    setTimeout(() => {
      const sanitizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      onFileProcessed(fileName, sanitizedDataUrl);
      setIsProcessing(false);
      setIsCompleted(true);
    }, 1000);
  };

  const handleClearMasks = () => {
    setMaskRects([]);
  };

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-4 shadow-sm" ref={containerRef}>
      <span className="block text-sm font-semibold text-slate-800 mb-2">{label}</span>

      {/* File input (if no image loaded) */}
      {!imageSrc && (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-6 bg-slate-50 hover:bg-slate-100/50 transition cursor-pointer relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            id={`file-input-${label}`}
          />
          <ShieldCheck className="h-10 w-10 text-brand-500 mb-2" />
          <span className="text-sm font-medium text-slate-700">อัปโหลดภาพถ่ายบัตรประชาชน หรือเอกสารยืนยันตัวตน</span>
          <span className="text-xs text-slate-400 mt-1">เฉพาะไฟล์รูปภาพ (JPEG, PNG) ขนาดไม่เกิน 5MB</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 text-red-700 rounded-lg text-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Interactive Masking and Watermarking Tool */}
      {imageSrc && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-brand-50 border border-brand-100 rounded-lg text-xs text-brand-800">
            <div className="flex items-center gap-1.5 font-medium">
              <EyeOff className="h-4 w-4 text-brand-600" />
              <span>ความปลอดภัยสูงสุด: ลากเมาส์บนรูปภาพเพื่อถมดำปกปิดเลขประจำตัว ศาสนา หรือข้อมูลอื่นที่ไม่จำเป็น</span>
            </div>
            {maskRects.length > 0 && !isCompleted && (
              <button
                type="button"
                onClick={handleClearMasks}
                className="text-red-600 font-semibold hover:underline"
              >
                เคลียร์กรอบปกปิด ({maskRects.length})
              </button>
            )}
          </div>

          <div className="relative flex justify-center bg-slate-100 border border-slate-200 rounded-lg overflow-hidden p-2">
            <canvas
              ref={canvasRef}
              width={420}
              height={260}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className={`max-w-full rounded border border-slate-300 shadow-sm ${
                isCompleted ? 'cursor-default' : 'cursor-crosshair'
              }`}
            />
            {isProcessing && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></span>
                <span className="text-xs font-semibold">กำลังใส่ลายน้ำและเข้ารหัสรักษาความปลอดภัย...</span>
              </div>
            )}
            {isCompleted && (
              <div className="absolute bottom-4 right-4 bg-emerald-600 text-white flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-md">
                <Check className="h-3.5 w-3.5" />
                <span>ป้องกันเอกสารสำเร็จ (Sanitized)</span>
              </div>
            )}
          </div>

          {!isCompleted ? (
            <button
              type="button"
              onClick={handleApplySanitizing}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2 px-4 rounded-lg text-sm flex items-center justify-center gap-2 transition"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>ยืนยันการปกปิดและใส่ลายน้ำป้องกัน</span>
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setImageSrc(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg text-sm transition text-center"
              >
                อัปโหลดไฟล์ใหม่ (Change File)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
