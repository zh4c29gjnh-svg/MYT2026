/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';

interface DocumentZoomContainerProps {
  children: React.ReactNode;
  defaultZoom?: number;
  title?: string;
  badge?: string;
  containerClassName?: string;
  orientation?: 'portrait' | 'landscape';
}

export const DocumentZoomContainer: React.FC<DocumentZoomContainerProps> = ({
  children,
  defaultZoom = 85,
  title = 'ตัวอย่างเอกสาร A4 เสมือนจริง',
  badge = 'พร้อมส่งออก & พิมพ์',
  containerClassName = '',
  orientation = 'portrait',
}) => {
  const [zoomPercent, setZoomPercent] = useState<number>(defaultZoom);

  const zoomPresets = [50, 65, 75, 85, 100, 115, 125, 150];

  const handleZoomIn = () => {
    setZoomPercent((prev) => Math.min(150, prev + 10));
  };

  const handleZoomOut = () => {
    setZoomPercent((prev) => Math.max(40, prev - 10));
  };

  const handleResetZoom = () => {
    setZoomPercent(100);
  };

  const handleFitWidth = () => {
    setZoomPercent(orientation === 'landscape' ? 70 : 80);
  };

  const isLandscape = orientation === 'landscape';
  const paperWidthMm = isLandscape ? '297mm' : '210mm';
  const paperHeightMm = isLandscape ? '210mm' : '297mm';

  return (
    <div className={`bg-slate-200/80 rounded-2xl border border-slate-300/80 p-3 sm:p-5 shadow-inner flex flex-col ${containerClassName}`}>
      {/* Top Controller Bar */}
      <div className="bg-white/95 backdrop-blur-xs p-3 rounded-xl border border-slate-200 shadow-xs mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
              {title}
            </span>
            <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full font-semibold font-mono">
              {isLandscape
                ? 'A4 แนวนอน (297 × 210 มม.)'
                : 'A4 (210 × 297 มม. | ขอบซ้าย-ขวา 2 ซม.)'}
            </span>
            {badge && (
              <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                {badge}
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400">
            ปรับย่อ-ขยายมุมมองเพื่อตรวจทานรายละเอียดเอกสาร
          </span>
        </div>

        {/* Zoom Controls Toolbar */}
        <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          {/* Zoom Out Button */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomPercent <= 40}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-40 transition-colors"
            title="ย่อขนาด (-10%)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Slider */}
          <div className="flex items-center space-x-2 px-1">
            <input
              type="range"
              min="40"
              max="150"
              step="5"
              value={zoomPercent}
              onChange={(e) => setZoomPercent(parseInt(e.target.value, 10))}
              className="w-20 sm:w-28 accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
          </div>

          {/* Preset Dropdown / Display */}
          <select
            value={zoomPercent}
            onChange={(e) => setZoomPercent(parseInt(e.target.value, 10))}
            className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            {zoomPresets.map((val) => (
              <option key={val} value={val}>
                {val}%
              </option>
            ))}
            {!zoomPresets.includes(zoomPercent) && (
              <option value={zoomPercent}>{zoomPercent}%</option>
            )}
          </select>

          {/* Zoom In Button */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomPercent >= 150}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-40 transition-colors"
            title="ขยายขนาด (+10%)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Fit Width button */}
          <button
            type="button"
            onClick={handleFitWidth}
            className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-200 rounded-lg transition-colors flex items-center"
            title="ขนาดพอดีหน้าจอ"
          >
            <Maximize2 className="w-3 h-3 mr-1" />
            <span className="hidden sm:inline">พอดีจอ</span>
          </button>

          {/* Reset 100% button */}
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
            title="รีเซ็ตเป็น 100%"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scalable Document Area */}
      <div className="w-full overflow-auto flex justify-center py-3 min-h-[520px]">
        <div
          className="transition-transform duration-150 origin-top flex justify-center"
          style={{
            transform: `scale(${zoomPercent / 100})`,
            marginBottom: `${Math.max(
              0,
              ((zoomPercent - 100) / 100) * (isLandscape ? 800 : 1125)
            )}px`,
          }}
        >
          <div
            className="shadow-2xl rounded-sm overflow-hidden bg-white shrink-0 border border-slate-300"
            style={{
              width: paperWidthMm,
              minWidth: paperWidthMm,
              maxWidth: paperWidthMm,
              minHeight: paperHeightMm,
              boxSizing: 'border-box',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
