/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Camera,
  Upload,
  Crop,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Check,
  RefreshCw,
  Maximize2,
  Sliders,
  CreditCard,
  SwitchCamera,
  Stamp,
  CornerUpLeft,
} from 'lucide-react';

interface IdCardScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (croppedDataUrl: string) => void;
  initialImage?: string;
}

interface Point2D {
  x: number; // normalized 0..1 of source image width
  y: number; // normalized 0..1 of source image height
}

// Standard ISO/IEC 7810 ID-1 (Thai National ID Card: 85.60mm x 53.98mm => ~1.5858)
const ID_CARD_ASPECT = 85.6 / 54.0;
const OUTPUT_WIDTH = 950;
const OUTPUT_HEIGHT = Math.round(OUTPUT_WIDTH / ID_CARD_ASPECT); // 599px

export const IdCardScannerModal: React.FC<IdCardScannerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialImage,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'crop'>(
    initialImage ? 'crop' : 'camera'
  );
  const [cropSubMode, setCropSubMode] = useState<'frame' | 'corners'>('frame');

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(
    'environment'
  );

  // Source image for cropping
  const [sourceDataUrl, setSourceDataUrl] = useState<string>(
    initialImage || ''
  );
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const [sourceDimensions, setSourceDimensions] = useState<{
    w: number;
    h: number;
  }>({ w: 0, h: 0 });

  // Frame Crop Mode controls (Zoom / Pan / Rotation)
  const [zoom, setZoom] = useState<number>(1.15);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation90, setRotation90] = useState<number>(0); // 0, 90, 180, 270
  const [fineTilt, setFineTilt] = useState<number>(0); // -15 to +15 degrees
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    panX: number;
    panY: number;
  }>({ clientX: 0, clientY: 0, panX: 0, panY: 0 });

  // 4-Corner Perspective Mode controls (normalized 0..1 coordinates: TL, TR, BR, BL)
  const [corners, setCorners] = useState<[Point2D, Point2D, Point2D, Point2D]>([
    { x: 0.08, y: 0.12 },
    { x: 0.92, y: 0.12 },
    { x: 0.92, y: 0.88 },
    { x: 0.08, y: 0.88 },
  ]);
  const [draggingCornerIdx, setDraggingCornerIdx] = useState<number | null>(
    null
  );
  const cornerContainerRef = useRef<HTMLDivElement | null>(null);

  // Finishing / Enhancement options
  const [roundedCorners, setRoundedCorners] = useState<boolean>(true);
  const [enhanceMode, setEnhanceMode] = useState<
    'enhance' | 'original' | 'bw'
  >('enhance');
  const [showCertifiedStamp, setShowCertifiedStamp] = useState<boolean>(false);
  const [autoDetectNotice, setAutoDetectNotice] = useState<string | null>(null);

  // Preview canvas
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera stream helper
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'เบราว์เซอร์นี้ไม่รองรับการเปิดกล้องโดยตรง กรุณากดปุ่ม "เลือกรูป / ถ่ายจากมือถือ" ด้านล่างแทน'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      setCameraError(
        'ไม่สามารถเข้าถึงกล้องได้ (อาจยังไม่ได้อนุญาตสิทธิ์กล้อง หรืออุปกรณ์ไม่มีกล้อง) สามารถกดปุ่ม "อัปโหลดรูปบัตร / ถ่ายจากมือถือ" เพื่อตัดกรอบบัตรได้ทันทีครับ'
      );
      setIsCameraActive(false);
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }
    if (initialImage) {
      setSourceDataUrl(initialImage);
      setActiveTab('crop');
    } else {
      setActiveTab('camera');
    }
  }, [isOpen, initialImage, stopCamera]);

  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, startCamera, stopCamera]);

  // Load source HTMLImageElement whenever sourceDataUrl changes
  useEffect(() => {
    if (!sourceDataUrl) {
      sourceImageRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      sourceImageRef.current = img;
      setSourceDimensions({ w: img.naturalWidth, h: img.naturalHeight });
      // Reset view adjustments
      setRotation90(0);
      setFineTilt(0);
      setPan({ x: 0, y: 0 });
      // Auto detect card bounding box on load
      autoDetectCardBounds(img);
    };
    img.src = sourceDataUrl;
  }, [sourceDataUrl]);

  // Automatic Edge / Contrast Bounding Box Detection for ID Card on Background
  const autoDetectCardBounds = (img: HTMLImageElement) => {
    try {
      const sampleW = 240;
      const sampleH = Math.max(
        120,
        Math.round((img.naturalHeight / img.naturalWidth) * sampleW)
      );
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = sampleW;
      tempCanvas.height = sampleH;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, sampleW, sampleH);
      const { data } = ctx.getImageData(0, 0, sampleW, sampleH);

      // Sample border pixels (outer 4% ring) to estimate background color
      let bgR = 0,
        bgG = 0,
        bgB = 0,
        bgCount = 0;
      const marginX = Math.max(2, Math.floor(sampleW * 0.04));
      const marginY = Math.max(2, Math.floor(sampleH * 0.04));

      for (let y = 0; y < sampleH; y++) {
        for (let x = 0; x < sampleW; x++) {
          if (
            x < marginX ||
            x >= sampleW - marginX ||
            y < marginY ||
            y >= sampleH - marginY
          ) {
            const idx = (y * sampleW + x) * 4;
            bgR += data[idx];
            bgG += data[idx + 1];
            bgB += data[idx + 2];
            bgCount++;
          }
        }
      }

      if (bgCount === 0) return;
      bgR /= bgCount;
      bgG /= bgCount;
      bgB /= bgCount;

      // Find foreground bounding box where color distance from background exceeds threshold
      let minX = sampleW,
        maxX = 0,
        minY = sampleH,
        maxY = 0;
      let fgPixels = 0;
      const threshold = 36;

      for (let y = marginY; y < sampleH - marginY; y++) {
        for (let x = marginX; x < sampleW - marginX; x++) {
          const idx = (y * sampleW + x) * 4;
          const dr = data[idx] - bgR;
          const dg = data[idx + 1] - bgG;
          const db = data[idx + 2] - bgB;
          const dist = Math.sqrt(dr * dr + dg * dg + db * db);
          if (dist > threshold) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            fgPixels++;
          }
        }
      }

      const boxW = maxX - minX;
      const boxH = maxY - minY;
      const areaRatio = (boxW * boxH) / (sampleW * sampleH);

      if (
        fgPixels > sampleW * sampleH * 0.08 &&
        boxW > sampleW * 0.25 &&
        boxH > sampleH * 0.25 &&
        areaRatio < 0.94
      ) {
        const normLeft = Math.max(0.02, minX / sampleW);
        const normRight = Math.min(0.98, maxX / sampleW);
        const normTop = Math.max(0.02, minY / sampleH);
        const normBottom = Math.min(0.98, maxY / sampleH);

        setCorners([
          { x: normLeft, y: normTop },
          { x: normRight, y: normTop },
          { x: normRight, y: normBottom },
          { x: normLeft, y: normBottom },
        ]);

        // Also compute zoom & pan for Frame mode so the detected card fills the frame
        const detectedCenterX = (normLeft + normRight) / 2 - 0.5;
        const detectedCenterY = (normTop + normBottom) / 2 - 0.5;
        const widthScale = 1 / Math.max(0.35, normRight - normLeft);
        const heightScale = 1 / Math.max(0.35, normBottom - normTop);
        const suggestedZoom = Math.min(
          2.6,
          Math.max(1.0, Math.min(widthScale, heightScale) * 0.98)
        );

        setZoom(Number(suggestedZoom.toFixed(2)));
        setPan({
          x: Math.round(-detectedCenterX * OUTPUT_WIDTH * suggestedZoom),
          y: Math.round(-detectedCenterY * OUTPUT_HEIGHT * suggestedZoom),
        });
        setAutoDetectNotice(
          'ตรวจจับขอบบัตรประชาชนและจัดกรอบสัดส่วน 85.6 × 54 มม. อัตโนมัติแล้ว'
        );
        setTimeout(() => setAutoDetectNotice(null), 3500);
      } else {
        // Fallback default framing
        setZoom(1.06);
        setPan({ x: 0, y: 0 });
        setCorners([
          { x: 0.06, y: 0.08 },
          { x: 0.94, y: 0.08 },
          { x: 0.94, y: 0.92 },
          { x: 0.06, y: 0.92 },
        ]);
      }
    } catch {
      // Ignore canvas security errors if any
    }
  };

  // Render output canvas whenever crop settings or enhancement options change
  const renderOutputCardCanvas = useCallback(() => {
    const canvas = previewCanvasRef.current;
    const img = sourceImageRef.current;
    if (!canvas || !img || !sourceDimensions.w) return;

    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
    ctx.save();

    // Rounded card clipping mask
    if (roundedCorners) {
      const r = 28;
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(OUTPUT_WIDTH - r, 0);
      ctx.quadraticCurveTo(OUTPUT_WIDTH, 0, OUTPUT_WIDTH, r);
      ctx.lineTo(OUTPUT_WIDTH, OUTPUT_HEIGHT - r);
      ctx.quadraticCurveTo(
        OUTPUT_WIDTH,
        OUTPUT_HEIGHT,
        OUTPUT_WIDTH - r,
        OUTPUT_HEIGHT
      );
      ctx.lineTo(r, OUTPUT_HEIGHT);
      ctx.quadraticCurveTo(0, OUTPUT_HEIGHT, 0, OUTPUT_HEIGHT - r);
      ctx.lineTo(0, r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.closePath();
      ctx.clip();
    }

    // White base background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

    // Apply image enhancement filter
    if (enhanceMode === 'enhance') {
      ctx.filter = 'contrast(1.12) brightness(1.03) saturate(1.08)';
    } else if (enhanceMode === 'bw') {
      ctx.filter = 'grayscale(1) contrast(1.28) brightness(1.05)';
    } else {
      ctx.filter = 'none';
    }

    if (cropSubMode === 'frame') {
      // Standard Frame + Zoom + Pan + Rotation
      ctx.save();
      ctx.translate(OUTPUT_WIDTH / 2 + pan.x, OUTPUT_HEIGHT / 2 + pan.y);
      const totalAngleRad = ((rotation90 + fineTilt) * Math.PI) / 180;
      ctx.rotate(totalAngleRad);

      const isRotated90 = Math.abs(rotation90) % 180 === 90;
      const effImgW = isRotated90 ? img.naturalHeight : img.naturalWidth;
      const effImgH = isRotated90 ? img.naturalWidth : img.naturalHeight;

      // Scale image to cover output card dimensions at zoom=1
      const baseScale = Math.max(
        OUTPUT_WIDTH / effImgW,
        OUTPUT_HEIGHT / effImgH
      );
      const drawW = img.naturalWidth * baseScale * zoom;
      const drawH = img.naturalHeight * baseScale * zoom;

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    } else {
      // 4-Corner Perspective Warp (Subdivided Triangular Mesh Warp for smooth, fast bilinear perspective correction)
      const srcW = img.naturalWidth;
      const srcH = img.naturalHeight;
      const [tl, tr, br, bl] = corners;

      const gridCols = 16;
      const gridRows = 12;

      const bilerp = (u: number, v: number) => {
        const topX = tl.x + (tr.x - tl.x) * u;
        const topY = tl.y + (tr.y - tl.y) * u;
        const botX = bl.x + (br.x - bl.x) * u;
        const botY = bl.y + (br.y - bl.y) * u;
        return {
          x: (topX + (botX - topX) * v) * srcW,
          y: (topY + (botY - topY) * v) * srcH,
        };
      };

      const drawTexturedTriangle = (
        x0: number,
        y0: number,
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        u0: number,
        v0: number,
        u1: number,
        v1: number,
        u2: number,
        v2: number
      ) => {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.closePath();
        ctx.clip();

        // Compute affine transform mapping (u0,v0)->(x0,y0), (u1,v1)->(x1,y1), (u2,v2)->(x2,y2)
        const du1 = u1 - u0;
        const dv1 = v1 - v0;
        const du2 = u2 - u0;
        const dv2 = v2 - v0;
        const det = du1 * dv2 - du2 * dv1;
        if (Math.abs(det) > 1e-6) {
          const dx1 = x1 - x0;
          const dy1 = y1 - y0;
          const dx2 = x2 - x0;
          const dy2 = y2 - y0;

          const a = (dx1 * dv2 - dx2 * dv1) / det;
          const b = (dy1 * dv2 - dy2 * dv1) / det;
          const c = (dx2 * du1 - dx1 * du2) / det;
          const d = (dy2 * du1 - dy1 * du2) / det;
          const e = x0 - a * u0 - c * v0;
          const f = y0 - b * u0 - d * v0;

          ctx.transform(a, b, c, d, e, f);
          ctx.drawImage(img, 0, 0);
        }
        ctx.restore();
      };

      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          const u0 = c / gridCols;
          const v0 = r / gridRows;
          const u1 = (c + 1) / gridCols;
          const v1 = (r + 1) / gridRows;

          const dstX0 = u0 * OUTPUT_WIDTH;
          const dstY0 = v0 * OUTPUT_HEIGHT;
          const dstX1 = u1 * OUTPUT_WIDTH;
          const dstY1 = v1 * OUTPUT_HEIGHT;

          const s00 = bilerp(u0, v0);
          const s10 = bilerp(u1, v0);
          const s11 = bilerp(u1, v1);
          const s01 = bilerp(u0, v1);

          // Slightly expand destination triangles by 0.6px to prevent hairline seams
          drawTexturedTriangle(
            dstX0,
            dstY0,
            dstX1 + 0.6,
            dstY0,
            dstX1 + 0.6,
            dstY1 + 0.6,
            s00.x,
            s00.y,
            s10.x,
            s10.y,
            s11.x,
            s11.y
          );
          drawTexturedTriangle(
            dstX0,
            dstY0,
            dstX1 + 0.6,
            dstY1 + 0.6,
            dstX0,
            dstY1 + 0.6,
            s00.x,
            s00.y,
            s11.x,
            s11.y,
            s01.x,
            s01.y
          );
        }
      }
    }

    ctx.filter = 'none';

    // Optional Certified True Copy ("สำเนาถูกต้อง") overlay
    if (showCertifiedStamp) {
      ctx.save();
      ctx.translate(OUTPUT_WIDTH / 2, OUTPUT_HEIGHT / 2);
      ctx.rotate((-16 * Math.PI) / 180);

      // Parallel double lines
      ctx.strokeStyle = 'rgba(30, 64, 175, 0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-260, -28);
      ctx.lineTo(260, -28);
      ctx.moveTo(-260, 28);
      ctx.lineTo(260, 28);
      ctx.stroke();

      ctx.font = 'bold 26px "Sarabun", sans-serif';
      ctx.fillStyle = 'rgba(30, 64, 175, 0.62)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('สำเนาถูกต้อง (ใช้สำหรับเบิกจ่ายค่าจ้างเท่านั้น)', 0, 0);
      ctx.restore();
    }

    // Subtle realistic card border
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 4;
    if (roundedCorners) {
      const r = 28;
      ctx.beginPath();
      ctx.moveTo(r, 2);
      ctx.lineTo(OUTPUT_WIDTH - r, 2);
      ctx.quadraticCurveTo(OUTPUT_WIDTH - 2, 2, OUTPUT_WIDTH - 2, r);
      ctx.lineTo(OUTPUT_WIDTH - 2, OUTPUT_HEIGHT - r);
      ctx.quadraticCurveTo(
        OUTPUT_WIDTH - 2,
        OUTPUT_HEIGHT - 2,
        OUTPUT_WIDTH - r,
        OUTPUT_HEIGHT - 2
      );
      ctx.lineTo(r, OUTPUT_HEIGHT - 2);
      ctx.quadraticCurveTo(2, OUTPUT_HEIGHT - 2, 2, OUTPUT_HEIGHT - r);
      ctx.lineTo(2, r);
      ctx.quadraticCurveTo(2, 2, r, 2);
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.strokeRect(2, 2, OUTPUT_WIDTH - 4, OUTPUT_HEIGHT - 4);
    }

    ctx.restore();
  }, [
    corners,
    cropSubMode,
    enhanceMode,
    fineTilt,
    pan,
    rotation90,
    roundedCorners,
    showCertifiedStamp,
    sourceDimensions.w,
    zoom,
  ]);

  useEffect(() => {
    if (activeTab === 'crop' && sourceDataUrl) {
      renderOutputCardCanvas();
    }
  }, [activeTab, sourceDataUrl, renderOutputCardCanvas]);

  // Capture photo from live video stream inside the ID card guide box
  const handleCaptureFromCamera = (instantSave: boolean) => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // Guide box occupies ~82% of width (or height-constrained) with ID_CARD_ASPECT
    let cropW = vw * 0.82;
    let cropH = cropW / ID_CARD_ASPECT;
    if (cropH > vh * 0.78) {
      cropH = vh * 0.78;
      cropW = cropH * ID_CARD_ASPECT;
    }
    const sx = (vw - cropW) / 2;
    const sy = (vh - cropH) / 2;

    if (instantSave) {
      // Crop directly to final card dimensions with rounded corners and enhancement
      const outCanvas = document.createElement('canvas');
      outCanvas.width = OUTPUT_WIDTH;
      outCanvas.height = OUTPUT_HEIGHT;
      const ctx = outCanvas.getContext('2d');
      if (!ctx) return;

      const r = 28;
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(OUTPUT_WIDTH - r, 0);
      ctx.quadraticCurveTo(OUTPUT_WIDTH, 0, OUTPUT_WIDTH, r);
      ctx.lineTo(OUTPUT_WIDTH, OUTPUT_HEIGHT - r);
      ctx.quadraticCurveTo(
        OUTPUT_WIDTH,
        OUTPUT_HEIGHT,
        OUTPUT_WIDTH - r,
        OUTPUT_HEIGHT
      );
      ctx.lineTo(r, OUTPUT_HEIGHT);
      ctx.quadraticCurveTo(0, OUTPUT_HEIGHT, 0, OUTPUT_HEIGHT - r);
      ctx.lineTo(0, r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.closePath();
      ctx.clip();

      ctx.filter = 'contrast(1.1) brightness(1.03)';
      ctx.drawImage(
        video,
        sx,
        sy,
        cropW,
        cropH,
        0,
        0,
        OUTPUT_WIDTH,
        OUTPUT_HEIGHT
      );
      ctx.filter = 'none';

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 4;
      ctx.stroke();

      const dataUrl = outCanvas.toDataURL('image/png', 0.95);
      stopCamera();
      onConfirm(dataUrl);
      onClose();
      return;
    }

    // Otherwise capture full frame (with slight margin around guide) and open Crop tab for fine tuning
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = vw;
    fullCanvas.height = vh;
    const fCtx = fullCanvas.getContext('2d');
    if (!fCtx) return;
    fCtx.drawImage(video, 0, 0, vw, vh);
    const capturedUrl = fullCanvas.toDataURL('image/jpeg', 0.94);

    setSourceDataUrl(capturedUrl);
    // Pre-set corners to the exact guide box region!
    const leftNorm = sx / vw;
    const rightNorm = (sx + cropW) / vw;
    const topNorm = sy / vh;
    const bottomNorm = (sy + cropH) / vh;
    setCorners([
      { x: leftNorm, y: topNorm },
      { x: rightNorm, y: topNorm },
      { x: rightNorm, y: bottomNorm },
      { x: leftNorm, y: bottomNorm },
    ]);
    stopCamera();
    setActiveTab('crop');
  };

  // Handle file upload into cropper
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (result) {
        setSourceDataUrl(result);
        setActiveTab('crop');
      }
    };
    reader.readAsDataURL(file);
  };

  // Mouse / Touch handlers for 4-corner dragging
  const handleCornerPointerMove = (clientX: number, clientY: number) => {
    if (draggingCornerIdx === null || !cornerContainerRef.current) return;
    const rect = cornerContainerRef.current.getBoundingClientRect();
    const normX = Math.min(
      0.99,
      Math.max(0.01, (clientX - rect.left) / rect.width)
    );
    const normY = Math.min(
      0.99,
      Math.max(0.01, (clientY - rect.top) / rect.height)
    );

    setCorners((prev) => {
      const next: [Point2D, Point2D, Point2D, Point2D] = [...prev] as [
        Point2D,
        Point2D,
        Point2D,
        Point2D,
      ];
      next[draggingCornerIdx] = { x: normX, y: normY };
      return next;
    });
  };

  const handleConfirmCroppedCard = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const finalDataUrl = canvas.toDataURL('image/png', 0.95);
    stopCamera();
    onConfirm(finalDataUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4">
        {/* Top Modal Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                ระบบถ่ายภาพและตัดขอบบัตรประชาชนอัตโนมัติ (สัดส่วนมาตรฐาน 85.6 × 54 มม.)
              </h3>
              <p className="text-[11px] text-slate-400">
                วางบัตรในกรอบเพื่อถ่ายตัดขอบทันที หรือดึงมุมบัตร 4 มุมเพื่อดัดบัตรที่ถ่ายเอียงให้ตรงสวยงาม
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="px-5 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('camera')}
              className={`inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5 mr-1.5" />
              1. เปิดกล้องถ่ายพร้อมกรอบบัตร
            </button>
            <button
              type="button"
              onClick={() => {
                if (sourceDataUrl) {
                  setActiveTab('crop');
                } else {
                  fileInputRef.current?.click();
                }
              }}
              className={`inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'crop'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Crop className="w-3.5 h-3.5 mr-1.5" />
              2. ตัดขอบรอบบัตร & ดัดสัดส่วนบัตร
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => mobileCameraInputRef.current?.click()}
              className="inline-flex items-center px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 mr-1.5" />
              ถ่ายจากกล้องมือถือ
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              เลือกรูปบัตรจากเครื่อง
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={mobileCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* ================================================================= */}
        {/* TAB 1: LIVE CAMERA WITH THAI ID CARD OVERLAY GUIDE                 */}
        {/* ================================================================= */}
        {activeTab === 'camera' && (
          <div className="p-5 space-y-4">
            <div className="relative w-full max-w-2xl mx-auto aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* ID Card Alignment Overlay Guide */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                {/* Standard 85.6 x 54mm Card Frame */}
                <div
                  className="relative w-[82%] max-h-[80%] border-2 border-cyan-400/90 rounded-2xl shadow-[0_0_0_9999px_rgba(2,6,23,0.62)] flex flex-col justify-between p-3 sm:p-4"
                  style={{ aspectRatio: `${ID_CARD_ASPECT}` }}
                >
                  {/* 4 Glowing Corner Brackets */}
                  <div className="absolute -top-1 -left-1 w-7 h-7 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                  <div className="absolute -top-1 -right-1 w-7 h-7 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                  <div className="absolute -bottom-1 -left-1 w-7 h-7 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

                  {/* Top Card Header Silhouette Guide */}
                  <div className="flex items-start justify-between">
                    <div className="px-2.5 py-1 rounded-md bg-slate-900/70 border border-cyan-400/40 text-[11px] font-bold text-cyan-300">
                      วางขอบบัตรประชาชนให้พอดีกรอบนี้ (85.6 × 54 มม.)
                    </div>
                    <div className="hidden sm:block px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-semibold text-emerald-300">
                      ตัดขอบนอกกรอบออกอัตโนมัติ
                    </div>
                  </div>

                  {/* Right Side Portrait Box Guide & Chip Guide */}
                  <div className="flex items-center justify-between my-auto px-2">
                    {/* Smart Card Chip Guide */}
                    <div className="w-10 h-8 sm:w-12 sm:h-9 rounded-md border border-amber-300/50 bg-amber-400/10 flex items-center justify-center text-[9px] text-amber-200/80 font-mono">
                      CHIP
                    </div>

                    {/* Portrait Photo Guide */}
                    <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-lg border border-dashed border-cyan-300/60 bg-cyan-400/10 flex items-center justify-center text-center text-[10px] text-cyan-200/90 px-1">
                      ตำแหน่งรูปถ่ายบนบัตร
                    </div>
                  </div>

                  {/* Bottom Barcode / Number Guide */}
                  <div className="text-center">
                    <span className="inline-block px-3 py-0.5 rounded-full bg-slate-900/75 text-[11px] text-white/90 font-medium">
                      ให้ตัวหนังสือบนบัตรชัดเจนและไม่สะท้อนแสงแฟลช
                    </span>
                  </div>
                </div>
              </div>

              {/* Camera Error / Fallback Overlay */}
              {cameraError && (
                <div className="absolute inset-0 bg-slate-900/95 p-6 flex flex-col items-center justify-center text-center space-y-3 z-10">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 max-w-md leading-relaxed">
                    {cameraError}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => mobileCameraInputRef.current?.click()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold inline-flex items-center cursor-pointer shadow-sm"
                    >
                      <Camera className="w-4 h-4 mr-1.5" />
                      ถ่ายด้วยกล้องมือถือ
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold inline-flex items-center cursor-pointer shadow-sm"
                    >
                      <Upload className="w-4 h-4 mr-1.5" />
                      เลือกรูปบัตรประชาชนจากเครื่อง
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFacingMode((prev) =>
                      prev === 'environment' ? 'user' : 'environment'
                    )
                  }
                  className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold inline-flex items-center cursor-pointer"
                >
                  <SwitchCamera className="w-4 h-4 mr-1.5 text-slate-600" />
                  สลับกล้อง ({facingMode === 'environment' ? 'กล้องหลัง' : 'กล้องหน้า'})
                </button>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold inline-flex items-center cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
                  รีเฟรชกล้อง
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={!isCameraActive}
                  onClick={() => handleCaptureFromCamera(false)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold inline-flex items-center cursor-pointer shadow-xs"
                >
                  <Crop className="w-4 h-4 mr-1.5" />
                  ถ่ายแล้วปรับแต่งกรอบละเอียด
                </button>

                <button
                  type="button"
                  disabled={!isCameraActive}
                  onClick={() => handleCaptureFromCamera(true)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold inline-flex items-center cursor-pointer shadow-xs"
                >
                  <Camera className="w-4 h-4 mr-1.5" />
                  กดถ่ายและตัดเฉพาะในกรอบทันที
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: SMART CROP & 4-CORNER PERSPECTIVE SCANNER                  */}
        {/* ================================================================= */}
        {activeTab === 'crop' && (
          <div className="p-5 space-y-4">
            {autoDetectNotice && (
              <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
                <span className="inline-flex items-center">
                  <Sparkles className="w-4 h-4 mr-1.5 text-emerald-600" />
                  {autoDetectNotice}
                </span>
              </div>
            )}

            {/* Sub-mode selector: Frame Zoom/Pan vs 4-Corner Perspective Warp */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="inline-flex bg-white p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setCropSubMode('frame')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                    cropSubMode === 'frame'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  โหมดที่ 1: เลื่อน/ซูมรูปให้พอดีกรอบบัตร
                </button>
                <button
                  type="button"
                  onClick={() => setCropSubMode('corners')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                    cropSubMode === 'corners'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  โหมดที่ 2: ดึงมุมบัตร 4 มุม (ดัดบัตรเอียงให้ตรง)
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (sourceImageRef.current) {
                      autoDetectCardBounds(sourceImageRef.current);
                    }
                  }}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold inline-flex items-center cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  ตรวจจับขอบบัตรอัตโนมัติ
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setZoom(1.0);
                    setPan({ x: 0, y: 0 });
                    setRotation90(0);
                    setFineTilt(0);
                    setCorners([
                      { x: 0.04, y: 0.04 },
                      { x: 0.96, y: 0.04 },
                      { x: 0.96, y: 0.96 },
                      { x: 0.04, y: 0.96 },
                    ]);
                  }}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-lg text-xs font-semibold inline-flex items-center cursor-pointer"
                >
                  <CornerUpLeft className="w-3.5 h-3.5 mr-1" />
                  รีเซ็ตกรอบ
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* LEFT 7 COLS: Interactive Editor */}
              <div className="lg:col-span-7 space-y-3">
                {cropSubMode === 'frame' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">
                        คลิกค้างที่บัตรแล้วลากเพื่อจัดตำแหน่งให้พอดีกรอบ:
                      </span>
                      <span className="text-[11px] text-emerald-700 font-semibold">
                        ซูม {Math.round(zoom * 100)}% • เอียง {rotation90 + fineTilt}°
                      </span>
                    </div>

                    {/* Interactive Drag/Pan Viewport */}
                    <div
                      onMouseDown={(e) => {
                        setIsDraggingPan(true);
                        dragStartRef.current = {
                          clientX: e.clientX,
                          clientY: e.clientY,
                          panX: pan.x,
                          panY: pan.y,
                        };
                      }}
                      onMouseMove={(e) => {
                        if (!isDraggingPan) return;
                        const dx = (e.clientX - dragStartRef.current.clientX) * 1.6;
                        const dy = (e.clientY - dragStartRef.current.clientY) * 1.6;
                        setPan({
                          x: Math.round(dragStartRef.current.panX + dx),
                          y: Math.round(dragStartRef.current.panY + dy),
                        });
                      }}
                      onMouseUp={() => setIsDraggingPan(false)}
                      onMouseLeave={() => setIsDraggingPan(false)}
                      className="relative w-full bg-slate-900 rounded-2xl p-4 flex items-center justify-center cursor-grab active:cursor-grabbing select-none overflow-hidden border border-slate-800"
                    >
                      <div
                        className="relative w-full max-w-[460px] rounded-xl overflow-hidden shadow-lg ring-2 ring-emerald-400"
                        style={{ aspectRatio: `${ID_CARD_ASPECT}` }}
                      >
                        <canvas
                          ref={previewCanvasRef}
                          className="w-full h-full object-contain block pointer-events-none"
                        />
                        {/* Subtle Rule-of-Thirds Alignment Grid */}
                        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
                          <div className="border-r border-b border-white/15" />
                          <div className="border-r border-b border-white/15" />
                          <div className="border-b border-white/15" />
                          <div className="border-r border-b border-white/15" />
                          <div className="border-r border-b border-white/15" />
                          <div className="border-b border-white/15" />
                          <div className="border-r border-white/15" />
                          <div className="border-r border-white/15" />
                          <div />
                        </div>
                      </div>
                    </div>

                    {/* Zoom, Rotate 90, and Fine Tilt Sliders */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Zoom Control */}
                        <div>
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                            <span className="inline-flex items-center">
                              <ZoomIn className="w-3.5 h-3.5 mr-1 text-blue-600" />
                              ขยายให้เต็มกรอบ (Zoom)
                            </span>
                            <span>{Math.round(zoom * 100)}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setZoom((z) => Math.max(0.6, Number((z - 0.08).toFixed(2))))
                              }
                              className="p-1 rounded bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                              <ZoomOut className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="range"
                              min={0.6}
                              max={2.8}
                              step={0.02}
                              value={zoom}
                              onChange={(e) => setZoom(parseFloat(e.target.value))}
                              className="w-full accent-blue-600 cursor-pointer"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setZoom((z) => Math.min(2.8, Number((z + 0.08).toFixed(2))))
                              }
                              className="p-1 rounded bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Fine Tilt Control */}
                        <div>
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                            <span className="inline-flex items-center">
                              <Sliders className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                              ปรับบัตรเอียงละเอียด
                            </span>
                            <span>{fineTilt}°</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min={-15}
                              max={15}
                              step={0.5}
                              value={fineTilt}
                              onChange={(e) =>
                                setFineTilt(parseFloat(e.target.value))
                              }
                              className="w-full accent-emerald-600 cursor-pointer"
                            />
                            <button
                              type="button"
                              onClick={() => setFineTilt(0)}
                              className="px-2 py-0.5 rounded bg-white border border-slate-300 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                              0°
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Rotate 90 Degrees & Fit Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setRotation90((r) => (r - 90 + 360) % 360)
                            }
                            className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 inline-flex items-center cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            หมุนซ้าย 90°
                          </button>
                          <button
                            type="button"
                            onClick={() => setRotation90((r) => (r + 90) % 360)}
                            className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 inline-flex items-center cursor-pointer"
                          >
                            <RotateCw className="w-3.5 h-3.5 mr-1" />
                            หมุนขวา 90°
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setZoom(1.0);
                            setPan({ x: 0, y: 0 });
                            setFineTilt(0);
                          }}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold text-blue-700 inline-flex items-center cursor-pointer"
                        >
                          <Maximize2 className="w-3.5 h-3.5 mr-1" />
                          พอดีขนาดรูปเต็มใบ
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 4-CORNER PERSPECTIVE SCANNER MODE */
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">
                        ลากจุดสีเขียวทั้ง 4 มุมไปวางที่มุมบัตรประชาชนในรูป:
                      </span>
                      <span className="text-[11px] text-emerald-700 font-semibold">
                        ระบบจะดัดบัตรให้เป็นสี่เหลี่ยมผืนผ้าอัตโนมัติ
                      </span>
                    </div>

                    <div className="bg-slate-900 rounded-2xl p-3 flex items-center justify-center border border-slate-800 select-none">
                      <div
                        ref={cornerContainerRef}
                        onMouseMove={(e) =>
                          handleCornerPointerMove(e.clientX, e.clientY)
                        }
                        onMouseUp={() => setDraggingCornerIdx(null)}
                        onMouseLeave={() => setDraggingCornerIdx(null)}
                        onTouchMove={(e) => {
                          if (e.touches[0]) {
                            handleCornerPointerMove(
                              e.touches[0].clientX,
                              e.touches[0].clientY
                            );
                          }
                        }}
                        onTouchEnd={() => setDraggingCornerIdx(null)}
                        className="relative inline-block max-h-[340px] overflow-hidden rounded-lg"
                      >
                        <img
                          src={sourceDataUrl}
                          alt="ต้นฉบับสำหรับดึงมุมบัตร"
                          className="max-h-[340px] w-auto block pointer-events-none select-none"
                        />

                        {/* SVG Polygon connecting the 4 corners */}
                        <svg
                          className="absolute inset-0 w-full h-full pointer-events-none"
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                        >
                          <polygon
                            points={corners
                              .map((p) => `${p.x * 100},${p.y * 100}`)
                              .join(' ')}
                            fill="rgba(16, 185, 129, 0.18)"
                            stroke="#10b981"
                            strokeWidth="0.9"
                            strokeDasharray="2,1"
                          />
                        </svg>

                        {/* 4 Draggable Corner Handles */}
                        {corners.map((pt, idx) => {
                          const cornerLabels = [
                            'บนซ้าย',
                            'บนขวา',
                            'ล่างขวา',
                            'ล่างซ้าย',
                          ];
                          return (
                            <div
                              key={idx}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setDraggingCornerIdx(idx);
                              }}
                              onTouchStart={(e) => {
                                e.stopPropagation();
                                setDraggingCornerIdx(idx);
                              }}
                              style={{
                                left: `${pt.x * 100}%`,
                                top: `${pt.y * 100}%`,
                              }}
                              title={`ลากมุม${cornerLabels[idx]}`}
                              className="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center text-[10px] font-bold text-white cursor-move hover:scale-110 transition-transform z-10"
                            >
                              {idx + 1}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT 5 COLS: Live Final Card Preview & Finishing Controls */}
              <div className="lg:col-span-5 space-y-3.5">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      ตัวอย่างบัตรประชาชนที่ได้ (85.6 × 54 มม.)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      พร้อมแนบใบสำคัญรับเงิน
                    </span>
                  </div>

                  {/* When in 4-corner mode, render previewCanvasRef here; when in frame mode, show mirrored preview */}
                  <div className="bg-slate-200/70 p-3 rounded-xl flex items-center justify-center border border-slate-300/80">
                    {cropSubMode === 'corners' ? (
                      <canvas
                        ref={previewCanvasRef}
                        className="w-full rounded-lg shadow-md block"
                        style={{ aspectRatio: `${ID_CARD_ASPECT}` }}
                      />
                    ) : (
                      <div className="text-center py-2 space-y-1">
                        <p className="text-xs font-semibold text-slate-700">
                          แสดงผลลัพธ์แบบเรียลไทม์ในกรอบด้านซ้าย
                        </p>
                        <p className="text-[11px] text-slate-500">
                          สัดส่วนมาตรฐานบัตรประชาชน 950 × 600 px คมชัดสูง
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Card Finishing Options */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        โหมดปรับความคมชัดของบัตร:
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEnhanceMode('enhance')}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                            enhanceMode === 'enhance'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          สีคมชัด (แนะนำ)
                        </button>
                        <button
                          type="button"
                          onClick={() => setEnhanceMode('original')}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                            enhanceMode === 'original'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          สีต้นฉบับ
                        </button>
                        <button
                          type="button"
                          onClick={() => setEnhanceMode('bw')}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                            enhanceMode === 'bw'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          สำเนาขาว-ดำ
                        </button>
                      </div>
                    </div>

                    <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer">
                      <span className="text-xs font-semibold text-slate-700">
                        ตัดมุมบัตรโค้งมนเหมือนบัตรประชาชนจริง
                      </span>
                      <input
                        type="checkbox"
                        checked={roundedCorners}
                        onChange={(e) => setRoundedCorners(e.target.checked)}
                        className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer">
                      <span className="text-xs font-semibold text-slate-700 inline-flex items-center">
                        <Stamp className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                        ประทับลายน้ำ "สำเนาถูกต้อง" บนบัตร
                      </span>
                      <input
                        type="checkbox"
                        checked={showCertifiedStamp}
                        onChange={(e) =>
                          setShowCertifiedStamp(e.target.checked)
                        }
                        className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Confirm / Cancel Buttons */}
                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      onClose();
                    }}
                    className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCroppedCard}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center shadow-sm cursor-pointer"
                  >
                    <Check className="w-4 h-4 mr-1.5" />
                    ยืนยันใช้รูปบัตรประชาชนนี้
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
