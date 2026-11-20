/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DailyReport, DailyReportPhoto } from '../../types/types.ts';
import { formatThaiDate } from '../../utils/bahtText.ts';

interface DailyReportPrintProps {
  report: DailyReport;
  containerId?: string;
}

export const DailyReportPrint: React.FC<DailyReportPrintProps> = ({
  report,
  containerId = 'daily-report-print-view',
}) => {
  const dateInfo = formatThaiDate(report.date);

  const weatherLabels: Record<string, string> = {
    sunny: 'แดดจัด ท้องฟ้าแจ่มใส ☀️',
    cloudy: 'มีเมฆมาก ⛅',
    rain: 'ฝนตก 🌧️',
    heavy_rain: 'ฝนตกหนัก (หยุดงานชั่วคราว) ⛈️',
  };

  // Normalize photos from photoItems or legacy photos[]
  const photoList: DailyReportPhoto[] =
    report.photoItems && report.photoItems.length > 0
      ? report.photoItems
      : (report.photos || []).map((url, idx) => ({
          id: `legacy-photo-${idx}`,
          url,
          caption: `ภาพถ่ายความก้าวหน้าหน้างานที่ ${idx + 1}`,
        }));

  const layout = report.photoLayout || 'grid-2';
  const gridColsClass =
    layout === 'grid-4'
      ? 'grid-cols-4 gap-2'
      : layout === 'grid-3'
      ? 'grid-cols-3 gap-2.5'
      : 'grid-cols-2 gap-3';

  const imageHeightClass =
    layout === 'grid-4'
      ? 'h-24'
      : layout === 'grid-3'
      ? 'h-28'
      : photoList.length <= 2
      ? 'h-40'
      : 'h-32';

  return (
    <div
      id={containerId}
      className="bg-white text-slate-900 font-['Sarabun',sans-serif] mx-auto px-[20mm] py-[14mm] shadow-md print:shadow-none w-[210mm] min-w-[210mm] max-w-[210mm] min-h-[297mm] flex flex-col justify-between text-[12.5px] leading-relaxed border border-slate-200 print:border-none"
      style={{
        width: '210mm',
        minWidth: '210mm',
        maxWidth: '210mm',
        minHeight: '297mm',
        paddingLeft: '20mm',
        paddingRight: '20mm',
        paddingTop: '14mm',
        paddingBottom: '14mm',
        boxSizing: 'border-box',
      }}
    >
      <div>
        {/* Header */}
        <div className="border-b-2 border-slate-900 pb-2.5 mb-3.5">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold text-blue-700 tracking-wider uppercase">
                บริษัท ไม้ยืนต้น คอนสตรัคชั่น จำกัด
              </div>
              <h1 className="text-[16px] font-bold text-slate-900 mt-0.5 whitespace-nowrap leading-snug">
                รายงานความก้าวหน้างานประจำวัน (Daily Site Report)
              </h1>
            </div>
            <div className="text-right shrink-0 whitespace-nowrap">
              <span className="text-xs font-mono font-bold bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                {report.reportNumber}
              </span>
              <div className="text-xs text-slate-500 mt-1 font-medium">
                วันที่ {dateInfo.fullText}
              </div>
            </div>
          </div>
        </div>

        {/* Project Info Bar */}
        <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200 mb-3.5 text-xs">
          <div>
            <span className="font-semibold text-slate-600">โครงการ:</span>{' '}
            <span className="font-bold text-slate-900">{report.projectName}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-600">ผู้รายงาน:</span>{' '}
            <span className="font-medium text-slate-900">{report.reporterName}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-600">สภาพอากาศ:</span>{' '}
            <span>{weatherLabels[report.weather] || report.weather}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-600">ความก้าวหน้าสะสม:</span>{' '}
            <span className="font-bold text-blue-700">{report.accumulatedProgressPercent}%</span>
            <span className="text-slate-500 ml-2">(วันนี้ +{report.todayProgressPercent}%)</span>
          </div>
        </div>

        {/* Activities Description (from 2.2) */}
        <div className="mb-3.5">
          <h3 className="font-bold text-slate-900 text-xs sm:text-sm border-b border-slate-200 pb-1 mb-1.5">
            1. รายการกิจกรรมงานที่ปฏิบัติในวันนี้
          </h3>
          <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 whitespace-pre-line leading-relaxed min-h-[54px] text-xs">
            {report.activitiesDescription || 'ไม่มีข้อมูลกิจกรรม'}
          </div>
        </div>

        {/* 2-Column: Labor & Machinery */}
        <div className="grid grid-cols-2 gap-3.5 mb-3.5">
          {/* Labor Count Table */}
          <div className="border border-slate-200 rounded-lg p-2.5">
            <div className="flex justify-between items-center border-b border-slate-200 pb-1 mb-1.5 text-xs">
              <h4 className="font-bold text-slate-900">2. ยอดกำลังคน (แรงงาน)</h4>
              <span className="font-bold text-blue-700">{report.totalLaborCount} คน</span>
            </div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-100">
                {report.labors.map((item, i) => (
                  <tr key={i}>
                    <td className="py-0.5 text-slate-700">{item.type}</td>
                    <td className="py-0.5 text-right font-semibold text-slate-900">
                      {item.count} คน
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Machinery Count Table */}
          <div className="border border-slate-200 rounded-lg p-2.5">
            <div className="flex justify-between items-center border-b border-slate-200 pb-1 mb-1.5 text-xs">
              <h4 className="font-bold text-slate-900">3. เครื่องจักรและอุปกรณ์</h4>
              <span className="font-bold text-amber-700">{report.totalMachineryCount} คัน/เครื่อง</span>
            </div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-100">
                {report.machineries.map((item, i) => (
                  <tr key={i}>
                    <td className="py-0.5 text-slate-700">{item.type}</td>
                    <td className="py-0.5 text-right font-semibold text-slate-900">
                      {item.count} คัน
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Problems and Safety Notes */}
        <div className="grid grid-cols-2 gap-3.5 mb-3.5 text-xs">
          <div className="border border-slate-200 rounded-lg p-2.5">
            <h4 className="font-bold text-slate-900 mb-1">4. ปัญหา อุปสรรค และแนวทางแก้ไข</h4>
            <p className="text-slate-700 min-h-[32px]">
              {report.problemsAndIssues
                ? `${report.problemsAndIssues} (แก้ไข: ${report.solutions || 'กำลังดำเนินการ'})`
                : 'งานดำเนินไปตามแผนงานปกติ ไม่มีปัญหาสำคัญ'}
            </p>
          </div>
          <div className="border border-slate-200 rounded-lg p-2.5">
            <h4 className="font-bold text-slate-900 mb-1">5. มาตรการความปลอดภัย (Safety)</h4>
            <p className="text-slate-700 min-h-[32px]">
              {report.safetyNotes || 'ตรวจสอบการสวมใส่อุปกรณ์คุ้มครองความปลอดภัย (PPE) ครบถ้วน 100%'}
            </p>
          </div>
        </div>

        {/* 6. Attached Site Photos Grid */}
        {photoList.length > 0 && (
          <div className="mb-3.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-2">
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                6. ภาพถ่ายความก้าวหน้าหน้างานประจำวัน ({photoList.length} รูป)
              </h3>
              <span className="text-[10px] text-slate-500">
                หลักฐานการปฏิบัติงานประจำวันที่ {dateInfo.fullText}
              </span>
            </div>

            <div className={`grid ${gridColsClass}`}>
              {photoList.map((photo, index) => (
                <div
                  key={photo.id || index}
                  className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex flex-col"
                >
                  <div className={`relative w-full ${imageHeightClass} bg-slate-100 overflow-hidden`}>
                    <img
                      src={photo.url}
                      alt={photo.caption || `ภาพถ่ายหน้างานที่ ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-1.5 left-1.5 bg-slate-900/75 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                      รูปที่ {index + 1}
                    </span>
                  </div>
                  <div className="px-2 py-1 bg-white border-t border-slate-200/80 text-[10px] text-slate-700 truncate font-medium">
                    {photo.caption || `ภาพถ่ายหน้างานที่ ${index + 1}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Signature Box */}
      <div className="border-t-2 border-slate-800 pt-3.5 mt-3">
        <div className="grid grid-cols-2 gap-8 text-center text-xs">
          <div className="space-y-1">
            <div className="flex items-baseline justify-center">
              <span className="mr-1">ลงชื่อ</span>
              <span className="border-b border-slate-600 w-44 inline-block"></span>
              <span className="ml-1">ผู้รายงาน</span>
            </div>
            <div className="font-semibold text-slate-900">( {report.reporterName} )</div>
            <div className="text-slate-500 text-[11px]">ผู้ควบคุมงาน / วิศวกรสนาม</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline justify-center">
              <span className="mr-1">ลงชื่อ</span>
              <span className="border-b border-slate-600 w-44 inline-block"></span>
              <span className="ml-1">ผู้ตรวจงาน</span>
            </div>
            <div className="font-semibold text-slate-900">( .................................................... )</div>
            <div className="text-slate-500 text-[11px]">วิศวกรโครงการ / ตัวแทนผู้ว่าจ้าง</div>
          </div>
        </div>
      </div>
    </div>
  );
};
