/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LandSurveyRecord,
  LandSurveyPin,
  SiteAttendanceCheckin,
} from '../../types/types.ts';
import {
  computeSurveyEdges,
  computePolygonAreaSqMeters,
  sqMetersToThaiArea,
  thaiAreaToSqMeters,
  SurveyEdgeSegment,
  buildParcelPlotLayout,
} from '../../utils/landSurveyMath.ts';
import { formatThaiDateShort } from '../projects/MaterialTakeoffPrint.tsx';

interface LandSurveyPrintProps {
  record: LandSurveyRecord;
  containerId?: string;
}

export function formatThaiDateTimeShort(isoStr?: string): string {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  return d.toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const LandSurveyPrint: React.FC<LandSurveyPrintProps> = ({
  record,
  containerId = 'land-survey-print-preview',
}) => {
  const pins = record.pins || [];
  const edges: SurveyEdgeSegment[] = computeSurveyEdges(
    pins,
    record.isClosedPolygon
  );
  const perimeterMeters = parseFloat(
    edges.reduce((sum, e) => sum + e.measuredMeters, 0).toFixed(2)
  );
  const deedPerimeterMeters = parseFloat(
    edges.reduce((sum, e) => sum + (e.deedMeters || 0), 0).toFixed(2)
  );
  const hasDeedDistances = edges.some((e) => e.deedMeters !== undefined);

  const areaSqm =
    record.isClosedPolygon && pins.length >= 3
      ? computePolygonAreaSqMeters(pins)
      : 0;
  const thaiArea = sqMetersToThaiArea(areaSqm);

  const deedSqm = thaiAreaToSqMeters(
    record.deedAreaRai,
    record.deedAreaNgan,
    record.deedAreaSqWah
  );
  const hasDeedArea = deedSqm > 0;

  // Build normalized SVG parcel geometry for the print sheet (minimum 2.00m x 2.00m frame)
  const plotW = 460;
  const plotH = 225;
  const latestAttendance = (record.attendanceCheckins || [])[0] || null;

  const renderParcelSvg = () => {
    const layout = buildParcelPlotLayout({
      pins,
      edges,
      checkinPoint: latestAttendance
        ? {
            lat: latestAttendance.lat,
            lng: latestAttendance.lng,
            label: `เช็คอิน (${latestAttendance.personName})`,
          }
        : null,
      width: plotW,
      height: plotH,
      padding: 36,
      minFrameMeters: 2.0,
    });

    if (!layout || pins.length === 0) {
      return (
        <div className="h-[225px] flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-300 rounded">
          ยังไม่มีหมุดพิกัดโฉนดในใบสำรวจนี้
        </div>
      );
    }

    const polyPoints = layout.projectedPins
      .map((p) => `${p.x},${p.y}`)
      .join(' ');

    return (
      <svg
        viewBox={`0 0 ${plotW} ${plotH}`}
        className="w-full h-[225px] border border-slate-300 rounded bg-slate-50/70"
      >
        {/* Subtle technical grid */}
        {[0.25, 0.5, 0.75].map((r) => (
          <g key={r}>
            <line
              x1={plotW * r}
              y1={0}
              x2={plotW * r}
              y2={plotH}
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <line
              x1={0}
              y1={plotH * r}
              x2={plotW}
              y2={plotH * r}
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          </g>
        ))}

        {/* Frame Scale Info & Scale Bar */}
        <g transform="translate(10, 14)">
          <text fontSize="8" fontWeight="600" fill="#475569">
            กรอบสเกลผัง: {layout.frameWidthMeters.toFixed(2)} ×{' '}
            {layout.frameHeightMeters.toFixed(2)} ม. (ขั้นต่ำ 2.00×2.00 ม.)
          </text>
        </g>

        <g transform={`translate(10, ${plotH - 12})`}>
          <line
            x1="0"
            y1="0"
            x2={layout.scaleBarPixels}
            y2="0"
            stroke="#0f172a"
            strokeWidth="1.8"
          />
          <line x1="0" y1="-3" x2="0" y2="3" stroke="#0f172a" strokeWidth="1.5" />
          <line
            x1={layout.scaleBarPixels}
            y1="-3"
            x2={layout.scaleBarPixels}
            y2="3"
            stroke="#0f172a"
            strokeWidth="1.5"
          />
          <text
            x={layout.scaleBarPixels / 2}
            y="-4"
            textAnchor="middle"
            fontSize="7.5"
            fontWeight="700"
            fill="#0f172a"
          >
            {layout.scaleBarMeters} ม.
          </text>
        </g>

        {/* Compass North Arrow */}
        <g transform={`translate(${plotW - 26}, 24)`}>
          <circle
            cx="0"
            cy="0"
            r="13"
            fill="#ffffff"
            stroke="#94a3b8"
            strokeWidth="1"
          />
          <polygon points="0,-8 -3.5,5 0,2 3.5,5" fill="#0f172a" />
          <text
            x="0"
            y="-9"
            textAnchor="middle"
            fontSize="6.5"
            fontWeight="700"
            fill="#0f172a"
          >
            N
          </text>
        </g>

        {/* Polygon Fill & Edges */}
        {record.isClosedPolygon && layout.projectedPins.length >= 3 && (
          <polygon
            points={polyPoints}
            fill="#10b981"
            fillOpacity="0.14"
            stroke="#059669"
            strokeWidth="2"
          />
        )}
        {(!record.isClosedPolygon || layout.projectedPins.length === 2) &&
          layout.projectedPins.length >= 2 && (
            <polyline
              points={polyPoints}
              fill="none"
              stroke="#059669"
              strokeWidth="2"
            />
          )}

        {/* Dashed line from latest check-in point to nearest pin */}
        {layout.projectedCheckin && layout.projectedCheckin.nearestPin && (
          <g>
            <line
              x1={layout.projectedCheckin.x}
              y1={layout.projectedCheckin.y}
              x2={layout.projectedCheckin.nearestPinX}
              y2={layout.projectedCheckin.nearestPinY}
              stroke="#2563eb"
              strokeWidth="1.4"
              strokeDasharray="3 3"
            />
            <rect
              x={layout.projectedCheckin.midLabelX - 32}
              y={layout.projectedCheckin.midLabelY - 7}
              width="64"
              height="14"
              rx="3"
              fill="#eff6ff"
              stroke="#3b82f6"
              strokeWidth="0.8"
            />
            <text
              x={layout.projectedCheckin.midLabelX}
              y={layout.projectedCheckin.midLabelY + 2.5}
              textAnchor="middle"
              fontSize="7.5"
              fontWeight="700"
              fill="#1d4ed8"
            >
              ห่างหมุด #{layout.projectedCheckin.nearestPin.pinNumber}:{' '}
              {layout.projectedCheckin.distanceToNearestPinMeters.toFixed(2)} ม.
            </text>
            <circle
              cx={layout.projectedCheckin.x}
              cy={layout.projectedCheckin.y}
              r="5.5"
              fill="#2563eb"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          </g>
        )}

        {/* Edge Distance Labels (non-overlapping) */}
        {layout.projectedEdges.map((pe) => {
          const labelText = `${pe.edge.measuredMeters.toFixed(2)} ม.`;
          return (
            <g key={`edge-lbl-${pe.index}`}>
              <rect
                x={pe.labelX - 24}
                y={pe.labelY - 7.5}
                width="48"
                height="15"
                rx="3"
                fill="#ffffff"
                stroke="#059669"
                strokeWidth="0.9"
              />
              <text
                x={pe.labelX}
                y={pe.labelY + 2.5}
                textAnchor="middle"
                fontSize="8"
                fontWeight="700"
                fill="#065f46"
              >
                {labelText}
              </text>
            </g>
          );
        })}

        {/* Boundary Pins + Outward Pushed Pin Labels */}
        {layout.projectedPins.map((pt) => (
          <g key={pt.pin.id}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r="7.5"
              fill="#0f172a"
              stroke="#ffffff"
              strokeWidth="1.8"
            />
            <text
              x={pt.x}
              y={pt.y + 2.5}
              textAnchor="middle"
              fontSize="7.5"
              fontWeight="700"
              fill="#ffffff"
            >
              {pt.pin.pinNumber}
            </text>
            <text
              x={pt.labelX}
              y={pt.labelY + 2.5}
              textAnchor="middle"
              fontSize="7.5"
              fontWeight="700"
              fill="#0f172a"
            >
              {pt.shortTitle}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  const pinsWithPhotos = pins.filter((p) => Boolean(p.photoUrl));
  const checkins: SiteAttendanceCheckin[] = record.attendanceCheckins || [];

  return (
    <div
      id={containerId}
      className="bg-white text-slate-900 font-sans select-text"
    >
      {/* PAGE 1: Main Survey Report, Parcel Diagram, Pin Coordinates & Edge Comparison */}
      <div className="a4-print-page bg-white w-[210mm] min-h-[297mm] px-[12mm] py-[11mm] box-border flex flex-col border-b border-slate-200 last:border-b-0 print:border-b-0 print:break-after-page last:print:break-after-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2.5 mb-3">
          <div>
            <div className="text-[15px] font-bold text-slate-900 tracking-tight">
              บริษัท ไม้ยืนต้น คอนสตรัคชั่น จำกัด
            </div>
            <div className="text-[10px] text-slate-600 mt-0.5">
              27/2 ซอยพหลโยธิน 24 แยก 2-1 ถนนพหลโยธิน แขวงจอมพล เขตจตุจักร กรุงเทพฯ 10900
            </div>
          </div>
          <div className="text-right">
            <div className="text-[14px] font-bold text-slate-900">
              รายงานงานสำรวจและเช็คระยะโฉนดที่ดิน (GPS Check-in)
            </div>
            <div className="text-[10px] text-slate-600 mt-0.5 tabular-nums">
              เลขที่เอกสาร: <strong>{record.docNumber}</strong> · วันที่สำรวจ:{' '}
              {formatThaiDateShort(record.surveyDate)}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-12 gap-2 border border-slate-300 rounded px-3 py-2 bg-slate-50/70 text-[10.5px] mb-3">
          <div className="col-span-7 space-y-0.5">
            <div>
              <span className="font-bold text-slate-700">หัวข้องานสำรวจ: </span>
              <span className="font-semibold text-slate-900">{record.title}</span>
            </div>
            <div>
              <span className="font-bold text-slate-700">โครงการที่เกี่ยวข้อง: </span>
              <span className="text-slate-800">{record.projectName || '-'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-700">สถานที่ตั้งแปลงที่ดิน: </span>
              <span className="text-slate-800">{record.location || '-'}</span>
            </div>
          </div>
          <div className="col-span-5 text-right space-y-0.5 tabular-nums">
            <div>
              <span className="font-bold text-slate-700">เลขที่โฉนด: </span>
              <span className="font-semibold text-slate-900">
                {record.deedNumber || '-'}
              </span>
              {record.parcelNumber && (
                <span className="text-slate-600 ml-1">({record.parcelNumber})</span>
              )}
            </div>
            <div>
              <span className="font-bold text-slate-700">ผู้สำรวจ / เช็คอินหลัก: </span>
              <span className="text-slate-900">{record.surveyorName || '-'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-700">จำนวนหมุดที่เช็คอิน: </span>
              <span className="font-semibold text-emerald-700">
                {pins.length} หมุด
              </span>{' '}
              · เส้นรอบรูป <strong>{perimeterMeters} ม.</strong>
            </div>
          </div>
        </div>

        {/* Parcel Diagram + Area Summary Side-by-Side */}
        <div className="grid grid-cols-12 gap-3 mb-3 items-stretch">
          <div className="col-span-7">
            <div className="text-[11px] font-bold text-slate-800 mb-1">
              1. ผังรูปแปลงที่ดินและระยะระหว่างหมุดจากพิกัดเช็คอิน
            </div>
            {renderParcelSvg()}
          </div>

          <div className="col-span-5 flex flex-col">
            <div className="text-[11px] font-bold text-slate-800 mb-1">
              2. สรุปผลการคำนวณเนื้อที่และเส้นรอบรูป
            </div>
            <div className="flex-1 border border-slate-300 rounded p-3 bg-white flex flex-col justify-between text-[10.5px] tabular-nums">
              <div className="space-y-2">
                <div className="border-b border-slate-200 pb-2">
                  <div className="text-[10px] text-slate-500">
                    เนื้อที่คำนวณจากพิกัดเช็คอิน (ไทย)
                  </div>
                  <div className="text-[14px] font-bold text-emerald-700 mt-0.5">
                    {thaiArea.formattedThai}
                  </div>
                  <div className="text-[10px] text-slate-600">
                    = {thaiArea.sqMeters.toLocaleString('th-TH')} ตร.ม. (
                    {thaiArea.totalSqWah.toLocaleString('th-TH')} ตร.ว.)
                  </div>
                </div>

                {hasDeedArea && (
                  <div className="border-b border-slate-200 pb-2">
                    <div className="text-[10px] text-slate-500">
                      เนื้อที่ระบุตามหน้าโฉนด
                    </div>
                    <div className="text-[12px] font-bold text-slate-900 mt-0.5">
                      {record.deedAreaRai || 0} ไร่ {record.deedAreaNgan || 0} งาน{' '}
                      {record.deedAreaSqWah || 0} ตร.ว. ({deedSqm.toLocaleString('th-TH')}{' '}
                      ตร.ม.)
                    </div>
                    <div className="text-[10px] font-semibold text-blue-700">
                      ผลต่างเนื้อที่:{' '}
                      {(areaSqm - deedSqm >= 0 ? '+' : '') +
                        (areaSqm - deedSqm).toFixed(2)}{' '}
                      ตร.ม.
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-600">ความยาวเส้นรอบรูปวัดจริง:</span>
                    <strong className="text-slate-900">{perimeterMeters} เมตร</strong>
                  </div>
                  {hasDeedDistances && (
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-600">ความยาวรวมตามโฉนด:</span>
                      <strong className="text-slate-900">
                        {deedPerimeterMeters} เมตร
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {record.notes && (
                <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-600">
                  <strong>หมายเหตุ:</strong> {record.notes}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Pin Check-in Coordinate Table */}
        <div className="mb-3">
          <div className="text-[11px] font-bold text-slate-800 mb-1">
            3. ตารางบันทึกการเช็คอินหมุดพิกัดโฉนด (WGS84 Lat/Lng และพิกัดฉาก UTM)
          </div>
          <table className="w-full border-collapse text-[10px] table-fixed tabular-nums">
            <colgroup>
              <col className="w-[7%]" />
              <col className="w-[27%]" />
              <col className="w-[21%]" />
              <col className="w-[22%]" />
              <col className="w-[9%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="border border-slate-700 py-1 px-1 text-center font-semibold">
                  หมุด
                </th>
                <th className="border border-slate-700 py-1 px-1.5 text-left font-semibold">
                  ชื่อจุด / รายละเอียดหลักหมุด
                </th>
                <th className="border border-slate-700 py-1 px-1.5 text-center font-semibold">
                  พิกัด GPS (Lat, Lng)
                </th>
                <th className="border border-slate-700 py-1 px-1.5 text-center font-semibold">
                  พิกัดฉาก UTM (Zone / E / N)
                </th>
                <th className="border border-slate-700 py-1 px-1 text-center font-semibold">
                  ความแม่นยำ
                </th>
                <th className="border border-slate-700 py-1 px-1.5 text-left font-semibold">
                  ผู้เช็คอิน / เวลา
                </th>
              </tr>
            </thead>
            <tbody>
              {pins.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="border border-slate-300 py-4 text-center text-slate-500"
                  >
                    ยังไม่มีรายการเช็คอินหมุดพิกัด
                  </td>
                </tr>
              ) : (
                pins.map((pin) => (
                  <tr key={pin.id} className="bg-white">
                    <td className="border border-slate-300 py-1 px-1 text-center font-bold text-slate-900">
                      #{pin.pinNumber}
                    </td>
                    <td className="border border-slate-300 py-1 px-1.5 font-medium text-slate-900 break-words">
                      {pin.label}
                      {pin.notes && (
                        <div className="text-[9px] text-slate-500">
                          {pin.notes}
                        </div>
                      )}
                    </td>
                    <td className="border border-slate-300 py-1 px-1.5 text-center font-mono text-[9.5px] text-slate-800">
                      {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}
                    </td>
                    <td className="border border-slate-300 py-1 px-1.5 text-center font-mono text-[9.5px] text-slate-700">
                      {pin.utmZone || '47P'} · E:{' '}
                      {pin.utmEasting?.toFixed(1) || '-'} / N:{' '}
                      {pin.utmNorthing?.toFixed(1) || '-'}
                    </td>
                    <td className="border border-slate-300 py-1 px-1 text-center text-slate-700">
                      {pin.accuracyMeters ? `±${pin.accuracyMeters} ม.` : '-'}
                    </td>
                    <td className="border border-slate-300 py-1 px-1.5 text-[9px] text-slate-700 break-words">
                      <div className="font-semibold text-slate-900">
                        {pin.checkedInBy || '-'}
                      </div>
                      <div>{formatThaiDateTimeShort(pin.checkedInAt)}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Section 4: Boundary Segment Distance Verification Table */}
        <div className="mb-3">
          <div className="text-[11px] font-bold text-slate-800 mb-1">
            4. ตารางตรวจสอบระยะแต่ละด้านเทียบกับระยะในใบโฉนด
          </div>
          <table className="w-full border-collapse text-[10px] table-fixed tabular-nums">
            <colgroup>
              <col className="w-[10%]" />
              <col className="w-[26%]" />
              <col className="w-[18%]" />
              <col className="w-[15%]" />
              <col className="w-[15%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="border border-slate-700 py-1 px-1 text-center font-semibold">
                  ด้านที่
                </th>
                <th className="border border-slate-700 py-1 px-1.5 text-left font-semibold">
                  ช่วงหมุดโฉนด
                </th>
                <th className="border border-slate-700 py-1 px-1.5 text-center font-semibold">
                  ทิศทาง (Azimuth)
                </th>
                <th className="border border-slate-700 py-1 px-1.5 text-right font-semibold">
                  ระยะวัดจริง (ม.)
                </th>
                <th className="border border-slate-700 py-1 px-1.5 text-right font-semibold">
                  ระยะตามโฉนด (ม.)
                </th>
                <th className="border border-slate-700 py-1 px-1.5 text-right font-semibold">
                  ผลต่าง (ม.)
                </th>
              </tr>
            </thead>
            <tbody>
              {edges.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="border border-slate-300 py-4 text-center text-slate-500"
                  >
                    ต้องมีอย่างน้อย 2 หมุดเพื่อคำนวณระยะห่างระหว่างหมุด
                  </td>
                </tr>
              ) : (
                edges.map((edge, idx) => {
                  const absDiff =
                    edge.diffMeters !== undefined
                      ? Math.abs(edge.diffMeters)
                      : 0;
                  const diffClass =
                    edge.diffMeters === undefined
                      ? 'text-slate-400'
                      : absDiff <= 0.5
                      ? 'text-emerald-700 font-bold'
                      : absDiff <= 1.5
                      ? 'text-amber-700 font-bold'
                      : 'text-rose-700 font-bold';

                  return (
                    <tr key={`edge-row-${idx}`} className="bg-white">
                      <td className="border border-slate-300 py-1 px-1 text-center font-semibold text-slate-700">
                        ด้านที่ {idx + 1}
                      </td>
                      <td className="border border-slate-300 py-1 px-1.5 font-semibold text-slate-900">
                        หมุด #{edge.fromPin.pinNumber} → หมุด #
                        {edge.toPin.pinNumber}
                      </td>
                      <td className="border border-slate-300 py-1 px-1.5 text-center text-slate-700">
                        {edge.bearingDegrees}° ({edge.compassLabel})
                      </td>
                      <td className="border border-slate-300 py-1 px-1.5 text-right font-bold text-slate-900">
                        {edge.measuredMeters.toFixed(2)}
                      </td>
                      <td className="border border-slate-300 py-1 px-1.5 text-right text-slate-800">
                        {edge.deedMeters !== undefined
                          ? edge.deedMeters.toFixed(2)
                          : '-'}
                      </td>
                      <td
                        className={`border border-slate-300 py-1 px-1.5 text-right ${diffClass}`}
                      >
                        {edge.diffMeters !== undefined
                          ? `${edge.diffMeters > 0 ? '+' : ''}${edge.diffMeters.toFixed(
                              2
                            )}`
                          : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Signatures at bottom of Page 1 */}
        <div className="mt-auto pt-3">
          <div className="grid grid-cols-3 gap-6 pt-3 border-t border-slate-300 text-[10px] text-slate-800">
            <div className="text-center">
              <div className="h-8 border-b border-dotted border-slate-500 mx-4"></div>
              <div className="mt-1 font-semibold">ผู้สำรวจ / เช็คอินพิกัด</div>
              <div className="text-[9px] text-slate-500">
                ({record.surveyorName || '........................................'})
              </div>
              <div className="text-[9px] text-slate-500">
                วันที่ ....... / ....... / .......
              </div>
            </div>
            <div className="text-center">
              <div className="h-8 border-b border-dotted border-slate-500 mx-4"></div>
              <div className="mt-1 font-semibold">วิศวกรผู้ควบคุมงาน</div>
              <div className="text-[9px] text-slate-500">
                (........................................)
              </div>
              <div className="text-[9px] text-slate-500">
                วันที่ ....... / ....... / .......
              </div>
            </div>
            <div className="text-center">
              <div className="h-8 border-b border-dotted border-slate-500 mx-4"></div>
              <div className="mt-1 font-semibold">ผู้อนุมัติ / เจ้าของโครงการ</div>
              <div className="text-[9px] text-slate-500">
                (........................................)
              </div>
              <div className="text-[9px] text-slate-500">
                วันที่ ....... / ....... / .......
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PAGE 2 (Optional): Attached Check-in Photos & Site Attendance Log */}
      {(pinsWithPhotos.length > 0 || checkins.length > 0) && (
        <div className="a4-print-page bg-white w-[210mm] min-h-[297mm] px-[12mm] py-[11mm] box-border flex flex-col">
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2.5 mb-3">
            <div>
              <div className="text-[14px] font-bold text-slate-900">
                ภาคผนวก: ภาพถ่ายหลักหมุดโฉนดและประวัติการเช็คอินเข้าพื้นที่หน้างาน
              </div>
              <div className="text-[10px] text-slate-600">
                {record.title} · เลขที่โฉนด {record.deedNumber || '-'}
              </div>
            </div>
            <div className="text-right text-[10px] text-slate-600 tabular-nums">
              เอกสารเลขที่ {record.docNumber} · หน้า 2 / 2
            </div>
          </div>

          {pinsWithPhotos.length > 0 && (
            <div className="mb-4">
              <div className="text-[11px] font-bold text-slate-800 mb-2">
                ภาพถ่ายหลักหมุดโฉนด ณ จุดเช็คอิน ({pinsWithPhotos.length} จุด)
              </div>
              <div className="grid grid-cols-2 gap-3">
                {pinsWithPhotos.slice(0, 4).map((p) => (
                  <div
                    key={`photo-${p.id}`}
                    className="border border-slate-300 rounded p-2 bg-slate-50/50"
                  >
                    <div className="h-44 w-full bg-white rounded overflow-hidden border border-slate-200 flex items-center justify-center">
                      <img
                        src={p.photoUrl}
                        alt={p.label}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="mt-1.5 text-[10px]">
                      <div className="font-bold text-slate-900">
                        หมุด #{p.pinNumber}: {p.label}
                      </div>
                      <div className="text-slate-600 font-mono text-[9px]">
                        GPS: {p.lat.toFixed(6)}, {p.lng.toFixed(6)} ·{' '}
                        {formatThaiDateTimeShort(p.checkedInAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {checkins.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-800 mb-1.5">
                บันทึกการเช็คอินเข้าพื้นที่หน้างาน (ตรวจสอบพิกัดเทียบขอบเขตโฉนด)
              </div>
              <table className="w-full border-collapse text-[10px] tabular-nums">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="border border-slate-700 py-1 px-1.5 text-center w-10">
                      #
                    </th>
                    <th className="border border-slate-700 py-1 px-2 text-left">
                      ชื่อผู้เช็คอิน / ตำแหน่ง
                    </th>
                    <th className="border border-slate-700 py-1 px-2 text-center">
                      พิกัดที่เช็คอิน
                    </th>
                    <th className="border border-slate-700 py-1 px-2 text-center">
                      ผลการตรวจสอบเขตโฉนด
                    </th>
                    <th className="border border-slate-700 py-1 px-2 text-center">
                      วันเวลา
                    </th>
                    <th className="border border-slate-700 py-1 px-2 text-left">
                      หมายเหตุ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {checkins.map((c, idx) => (
                    <tr key={c.id} className="bg-white">
                      <td className="border border-slate-300 py-1 px-1.5 text-center">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-300 py-1 px-2 font-semibold text-slate-900">
                        {c.personName}
                        {c.role && (
                          <span className="text-slate-500 font-normal">
                            {' '}
                            ({c.role})
                          </span>
                        )}
                      </td>
                      <td className="border border-slate-300 py-1 px-2 text-center font-mono text-[9.5px]">
                        {c.lat.toFixed(6)}, {c.lng.toFixed(6)}
                      </td>
                      <td
                        className={`border border-slate-300 py-1 px-2 text-center font-bold ${
                          c.isInsideBoundary
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {c.isInsideBoundary
                          ? 'อยู่ในเขตโฉนด'
                          : `อยู่นอกเขต (${c.distanceToBoundaryMeters} ม.)`}
                      </td>
                      <td className="border border-slate-300 py-1 px-2 text-center text-[9.5px]">
                        {formatThaiDateTimeShort(c.checkedInAt)}
                      </td>
                      <td className="border border-slate-300 py-1 px-2 text-slate-600">
                        {c.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
