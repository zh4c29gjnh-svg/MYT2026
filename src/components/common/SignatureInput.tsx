/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { PenTool, Upload, Eraser, Trash2, Check } from 'lucide-react';

interface SignatureInputProps {
  value?: string;
  onChange: (signatureDataUrl: string) => void;
  signerName?: string;
  label?: string;
  helperText?: string;
  compact?: boolean;
}

/**
 * Trims transparent/blank edges around drawn ink on canvas so signatures sit neatly above dotted lines
 */
function exportTrimmedCanvasPng(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const { width, height } = canvas;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return '';
  }

  const pad = 10;
  const cropX = Math.max(0, minX - pad);
  const cropY = Math.max(0, minY - pad);
  const cropW = Math.min(width - cropX, maxX - minX + 1 + pad * 2);
  const cropH = Math.min(height - cropY, maxY - minY + 1 + pad * 2);

  const out = document.createElement('canvas');
  out.width = cropW;
  out.height = cropH;
  const outCtx = out.getContext('2d');
  if (!outCtx) return canvas.toDataURL('image/png');
  outCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  return out.toDataURL('image/png');
}

/**
 * Resizes an uploaded signature image cleanly (preserving transparency for PNG, or scaling JPG)
 */
async function processUploadedSignatureFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        reject(new Error('Invalid image'));
        return;
      }
      const img = new Image();
      img.onload = () => {
        const maxW = 600;
        const maxH = 260;
        let targetW = img.width;
        let targetH = img.height;

        if (targetW > maxW || targetH > maxH) {
          const ratio = Math.min(maxW / targetW, maxH / targetH);
          targetW = Math.max(1, Math.round(targetW * ratio));
          targetH = Math.max(1, Math.round(targetH * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = src;
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

export const SignatureInput: React.FC<SignatureInputProps> = ({
  value = '',
  onChange,
  signerName,
  label = 'ลายเซ็นหัวหน้างานผู้รับผิดชอบ',
  helperText = 'วาดลายเซ็นบนหน้าจอ หรืออัปโหลดรูปลายเซ็น (PNG / JPG)',
  compact = false,
}) => {
  const [mode, setMode] = useState<'draw' | 'upload'>('draw');
  const [penColor, setPenColor] = useState<'#1e3a8a' | '#0f172a'>('#1e3a8a');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasCanvasInk, setHasCanvasInk] = useState<boolean>(false);
  const [showDrawPad, setShowDrawPad] = useState<boolean>(!value);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!value) {
      setHasCanvasInk(false);
    }
  }, [value]);

  const getCanvasPoint = (
    e: React.PointerEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const pt = getCanvasPoint(e, canvas);
    lastPointRef.current = pt;
    setIsDrawing(true);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = penColor;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
      setHasCanvasInk(true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas || !lastPointRef.current) return;
    const pt = getCanvasPoint(e, canvas);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = penColor;
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      setHasCanvasInk(true);
    }
    lastPointRef.current = pt;
  };

  const finishStroke = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = exportTrimmedCanvasPng(canvas);
      if (dataUrl) {
        onChange(dataUrl);
      }
    }
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasCanvasInk(false);
    onChange('');
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const dataUrl = await processUploadedSignatureFile(file);
      onChange(dataUrl);
      setShowDrawPad(false);
      setHasCanvasInk(false);
    } catch {
      // ignore invalid image
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="block text-xs font-bold text-slate-700">
          {label}
        </label>

        {/* Mode Switcher */}
        <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-[11px]">
          <button
            type="button"
            onClick={() => {
              setMode('draw');
              setShowDrawPad(true);
            }}
            className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'draw'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PenTool className="w-3 h-3" />
            <span>วาดลายเซ็น</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('upload');
              setShowDrawPad(false);
            }}
            className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'upload'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3 h-3" />
            <span>อัปโหลดรูป</span>
          </button>
        </div>
      </div>

      {/* Saved Signature Preview */}
      {value && !showDrawPad && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 flex items-center justify-between gap-3">
          <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-lg border border-slate-200 px-3 py-2 min-h-[68px]">
            <img
              src={value}
              alt={`ลายเซ็น ${signerName || 'หัวหน้างาน'}`}
              className="max-h-[42px] max-w-[180px] object-contain mix-blend-multiply"
            />
            <div className="w-40 border-t border-dotted border-slate-400 mt-1 pt-0.5 text-center text-[10.5px] text-slate-600">
              ( {signerName || 'ผู้ขออนุมัติ'} )
            </div>
          </div>

          <div className="flex flex-col gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setMode('draw');
                setShowDrawPad(true);
                setHasCanvasInk(false);
              }}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-semibold text-slate-700 flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <PenTool className="w-3 h-3 text-emerald-600" />
              <span>วาดใหม่</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-semibold text-slate-700 flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-3 h-3 text-sky-600" />
              <span>เปลี่ยนรูป</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setHasCanvasInk(false);
                setShowDrawPad(mode === 'draw');
              }}
              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-[11px] font-semibold text-rose-700 flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-3 h-3" />
              <span>ลบลายเซ็น</span>
            </button>
          </div>
        </div>
      )}

      {/* Draw Pad Mode */}
      {mode === 'draw' && (showDrawPad || !value) && (
        <div className="rounded-xl border border-slate-300 bg-slate-50/70 p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-600 font-medium">สีหมึก:</span>
              <button
                type="button"
                onClick={() => setPenColor('#1e3a8a')}
                className={`px-2 py-0.5 rounded border text-[10.5px] font-semibold cursor-pointer ${
                  penColor === '#1e3a8a'
                    ? 'bg-blue-900 text-white border-blue-900'
                    : 'bg-white text-blue-900 border-slate-300'
                }`}
              >
                น้ำเงิน
              </button>
              <button
                type="button"
                onClick={() => setPenColor('#0f172a')}
                className={`px-2 py-0.5 rounded border text-[10.5px] font-semibold cursor-pointer ${
                  penColor === '#0f172a'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-900 border-slate-300'
                }`}
              >
                ดำ
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleClearCanvas}
                className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[10.5px] font-semibold text-slate-600 flex items-center gap-1 cursor-pointer"
              >
                <Eraser className="w-3 h-3" />
                <span>ล้าง</span>
              </button>
              {value && (
                <button
                  type="button"
                  onClick={() => setShowDrawPad(false)}
                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10.5px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  <span>ดูตัวอย่าง</span>
                </button>
              )}
            </div>
          </div>

          <div className="relative bg-white rounded-lg border border-dashed border-slate-300 overflow-hidden">
            {!hasCanvasInk && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-slate-400">
                <span className="text-[11px] font-medium">
                  ใช้เมาส์หรือนิ้วลากเซ็นชื่อที่นี่
                </span>
                <div className="w-40 border-b border-dotted border-slate-300 mt-3" />
              </div>
            )}
            <canvas
              ref={canvasRef}
              width={440}
              height={compact ? 115 : 135}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishStroke}
              onPointerCancel={finishStroke}
              className="w-full h-[96px] touch-none cursor-crosshair block"
            />
          </div>
        </div>
      )}

      {/* Upload Mode */}
      {mode === 'upload' && !value && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-center space-y-2">
          <p className="text-xs text-slate-600">
            เลือกรูปลายเซ็นจากเครื่อง (รองรับ PNG พื้นหลังโปร่งใส และ JPG)
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>เลือกรูปลายเซ็น (PNG / JPG)</span>
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleUploadFile}
        className="hidden"
      />

      {helperText && (
        <span className="text-[11px] text-slate-400 block">{helperText}</span>
      )}
    </div>
  );
};
