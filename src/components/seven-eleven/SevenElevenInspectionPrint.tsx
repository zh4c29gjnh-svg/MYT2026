/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  SevenElevenDailyWeatherItem,
  SevenElevenInspectionDoc,
  SevenElevenInspectionItem,
  SevenElevenInspectionPhoto,
  SevenElevenPhotoLayout,
  SevenElevenWeatherCondition,
} from '../../types/types.ts';
import { ensureSevenDayForecast } from '../../utils/thaiProvincesWeather.ts';

interface SevenElevenInspectionPrintProps {
  doc: SevenElevenInspectionDoc;
  containerId?: string;
}

const SquareBox: React.FC<{ checked?: boolean; size?: 'md' | 'sm' }> = ({
  checked = false,
  size = 'md',
}) => {
  const dim = size === 'sm' ? 'w-[10.5px] h-[10.5px]' : 'w-[12.5px] h-[12.5px]';
  return (
    <span
      className={`inline-flex items-center justify-center border-[1.2px] border-black bg-white align-middle ${dim} shrink-0`}
    >
      {checked && (
        <span className="text-[10.5px] font-black text-black leading-none select-none">
          ✓
        </span>
      )}
    </span>
  );
};

/**
 * รูปเมฆฝน (แสดงในวันที่ฝนตก) และ รูปเมฆพระอาทิตย์ (แสดงในวันที่ไม่มีฝน)
 */
export const DailyWeatherIconSvg: React.FC<{
  isRainy: boolean;
  sizeClass?: string;
}> = ({ isRainy, sizeClass = 'w-6 h-6' }) => {
  if (isRainy) {
    // รูปเมฆฝน (Cloud with Rain Drops)
    return (
      <svg viewBox="0 0 40 40" className={`${sizeClass} shrink-0`}>
        <path
          d="M11 24.5h17.5a5.8 5.8 0 0 0 1-11.5A8.2 8.2 0 0 0 13 11.2a5.5 5.5 0 0 0-2 13.3z"
          fill="#3B82F6"
          stroke="#1D4ED8"
          strokeWidth="1.2"
        />
        <g stroke="#0284C7" strokeWidth="2.2" strokeLinecap="round">
          <line x1="13.5" y1="28" x2="11.5" y2="34.5" />
          <line x1="19.5" y1="28" x2="17.5" y2="34.5" />
          <line x1="25.5" y1="28" x2="23.5" y2="34.5" />
        </g>
      </svg>
    );
  }

  // รูปเมฆพระอาทิตย์ (Sun behind Cloud - วันที่ไม่มีฝน)
  return (
    <svg viewBox="0 0 40 40" className={`${sizeClass} shrink-0`}>
      <circle cx="14.5" cy="14.5" r="6.8" fill="#F59E0B" />
      <g stroke="#F59E0B" strokeWidth="2" strokeLinecap="round">
        <line x1="14.5" y1="4" x2="14.5" y2="6.2" />
        <line x1="4" y1="14.5" x2="6.2" y2="14.5" />
        <line x1="7.2" y1="7.2" x2="8.8" y2="8.8" />
        <line x1="21.8" y1="7.2" x2="20.2" y2="8.8" />
        <line x1="7.2" y1="21.8" x2="8.8" y2="20.2" />
      </g>
      <path
        d="M14.5 29.5h15a5.8 5.8 0 0 0 1-11.5 7.8 7.8 0 0 0-15-1.5 5.3 5.3 0 0 0-1 13z"
        fill="#BAE6FD"
        stroke="#0284C7"
        strokeWidth="1.2"
      />
    </svg>
  );
};

const WeatherGraphicSvg: React.FC<{
  condition: SevenElevenWeatherCondition;
}> = ({ condition }) => {
  const rainy =
    condition === 'light_rain' ||
    condition === 'rain' ||
    condition === 'thunderstorm';
  return <DailyWeatherIconSvg isRainy={rainy} sizeClass="w-8 h-8" />;
};

/**
 * Formats a SevenElevenInspectionItem into a readable full title including sub-options
 */
export function formatApprovalItemFullTitle(
  item: SevenElevenInspectionItem
): string {
  if (item.itemNumber === 4) {
    const subs: string[] = [];
    if (item.slabRc) subs.push('พื้น คสล.');
    if (item.slabTopping) subs.push('พื้น Topping');
    if (item.slabSv) subs.push('พื้น SV');
    const subStr = subs.length > 0 ? ` (${subs.join(', ')})` : '';
    return `4. งานโครงสร้าง${subStr}`;
  }
  if (item.itemNumber === 7) {
    const subs: string[] = [];
    if (item.groundGs) subs.push('พื้น GS');
    if (item.groundAsphalt) subs.push('พื้น Asphant');
    const timeStr = item.groundTimeNo ? ` ครั้งที่ ${item.groundTimeNo}` : '';
    const subStr = subs.length > 0 ? ` (${subs.join(', ')})` : '';
    return `7. งานโครงสร้าง${subStr}${timeStr}`;
  }
  return `${item.itemNumber}. ${item.title}`;
}

function getPhotosPerPage(layout: SevenElevenPhotoLayout = 'layout-4'): number {
  switch (layout) {
    case 'layout-1':
      return 1;
    case 'layout-2':
      return 2;
    case 'layout-4':
      return 4;
    case 'layout-6':
      return 6;
    default:
      return 4;
  }
}

export const SevenElevenInspectionPrint: React.FC<
  SevenElevenInspectionPrintProps
> = ({ doc, containerId = 'seven-eleven-inspection-print' }) => {
  const photos = doc.photoItems || [];
  const fullPagePhotos = doc.fullPagePhotoItems || [];
  const layout: SevenElevenPhotoLayout =
    doc.photoLayout && doc.photoLayout !== 'layout-1'
      ? doc.photoLayout
      : 'layout-4';
  const perPage = getPhotosPerPage(layout);

  // Split Section 3 photos into pages automatically
  const photoPages: SevenElevenInspectionPhoto[][] = [];
  for (let i = 0; i < photos.length; i += perPage) {
    photoPages.push(photos.slice(i, i + perPage));
  }

  // Total pages = 1 (Main Form) + Section 3 pages + Section 4 full-page photos (1 photo per page)
  const totalPages = 1 + photoPages.length + fullPagePhotos.length;

  const requesterName =
    doc.defaultSupervisor?.trim() ||
    doc.items
      .find((i) => i.checked && i.responsiblePerson.trim())
      ?.responsiblePerson.trim() ||
    'ผู้รับเหมาก่อสร้าง';

  const checkedItems = doc.items.filter((i) => i.checked);

  // Build header text for a photo page from the checked approval items
  const getPhotoPageHeaderItemsText = (
    pagePhotos: SevenElevenInspectionPhoto[]
  ): { titleLine: string; detailLine: string } => {
    const specificNums = new Set<number>();
    let hasAll = false;
    pagePhotos.forEach((p) => {
      if (!p.linkedItemNumber || p.linkedItemNumber === 'ALL') {
        hasAll = true;
      } else {
        specificNums.add(p.linkedItemNumber);
      }
    });

    let relevantItems: SevenElevenInspectionItem[] = [];
    if (!hasAll && specificNums.size > 0) {
      relevantItems = doc.items.filter((i) => specificNums.has(i.itemNumber));
    }
    if (relevantItems.length === 0) {
      relevantItems = checkedItems;
    }

    if (relevantItems.length === 0) {
      return {
        titleLine: 'เอกสารแนบแสดงจุดที่จะขออนุมัติตรวจสอบงานก่อสร้าง',
        detailLine: '',
      };
    }

    const titles = relevantItems.map((it) => formatApprovalItemFullTitle(it));
    const details = relevantItems
      .map((it) => {
        const parts: string[] = [];
        if (it.details?.trim()) parts.push(it.details.trim());
        if (it.inspectionDate?.trim())
          parts.push(`นัดตรวจ: ${it.inspectionDate.trim()}`);
        return parts.length > 0 ? parts.join(' • ') : '';
      })
      .filter(Boolean);

    return {
      titleLine: titles.join(' | '),
      detailLine: details.join(' | '),
    };
  };

  // Single-line rendering for Item 4 and Item 7 on Page 1
  const renderApprovalTitle = (item: SevenElevenInspectionItem) => {
    if (item.itemNumber === 4) {
      return (
        <div className="flex items-center flex-nowrap whitespace-nowrap gap-x-1 text-[10.5px] leading-none">
          <span className="w-3.5 inline-block shrink-0">4.</span>
          <span className="shrink-0">งานโครงสร้าง</span>
          <span className="inline-flex items-center gap-0.5 shrink-0 ml-0.5">
            <SquareBox checked={!!item.slabRc} size="sm" />
            <span>พื้น คสล.</span>
          </span>
          <span className="inline-flex items-center gap-0.5 shrink-0">
            <SquareBox checked={!!item.slabTopping} size="sm" />
            <span>พื้น Topping</span>
          </span>
          <span className="inline-flex items-center gap-0.5 shrink-0">
            <SquareBox checked={!!item.slabSv} size="sm" />
            <span>พื้น SV</span>
          </span>
        </div>
      );
    }

    if (item.itemNumber === 7) {
      return (
        <div className="flex items-center flex-nowrap whitespace-nowrap gap-x-1 text-[10.5px] leading-none">
          <span className="w-3.5 inline-block shrink-0">7.</span>
          <span className="shrink-0">งานโครงสร้าง</span>
          <span className="inline-flex items-center gap-0.5 shrink-0 ml-0.5">
            <SquareBox checked={!!item.groundGs} size="sm" />
            <span>พื้น GS</span>
          </span>
          <span className="inline-flex items-center gap-0.5 shrink-0">
            <SquareBox checked={!!item.groundAsphalt} size="sm" />
            <span>พื้น Asphant</span>
          </span>
          <span className="inline-flex items-baseline shrink-0">
            <span>ครั้งที่</span>
            <span className="border-b border-dotted border-black min-w-[22px] px-0.5 text-center inline-block ml-0.5">
              {item.groundTimeNo || ''}
            </span>
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-x-1 text-[11px] leading-tight">
        <span className="w-4 inline-block shrink-0">{item.itemNumber}.</span>
        <span className="break-words">{item.title}</span>
      </div>
    );
  };

  const wf = doc.weatherForecast;
  const firstCheckedDate =
    doc.items.find((i) => i.checked && i.inspectionDate)?.inspectionDate || '';
  const displayForecastDate =
    wf?.forecastDate || firstCheckedDate || '15/9/69';

  const sevenDays: SevenElevenDailyWeatherItem[] =
    wf && wf.enabled
      ? ensureSevenDayForecast({
          ...wf,
          forecastDate: displayForecastDate,
        })
      : [];

  const weekMinTemp =
    sevenDays.length > 0
      ? Math.min(...sevenDays.map((d) => d.tempMin)) - 1
      : 22;
  const weekMaxTemp =
    sevenDays.length > 0
      ? Math.max(...sevenDays.map((d) => d.tempMax)) + 1
      : 36;
  const tempSpan = Math.max(4, weekMaxTemp - weekMinTemp);

  const getGridClassForLayout = (l: SevenElevenPhotoLayout) => {
    switch (l) {
      case 'layout-1':
        return 'grid-cols-1 grid-rows-1 gap-2';
      case 'layout-2':
        return 'grid-cols-2 grid-rows-1 gap-3';
      case 'layout-4':
        return 'grid-cols-2 grid-rows-2 gap-2.5';
      case 'layout-6':
        return 'grid-cols-3 grid-rows-2 gap-2.5';
      default:
        return 'grid-cols-2 grid-rows-2 gap-2.5';
    }
  };

  return (
    <div id={containerId} className="flex flex-col gap-5 print:gap-0 bg-slate-300/60 print:bg-white">
      {/* =================================================================== */}
      {/* PAGE 1: MAIN B4-FM-04-01-19 INSPECTION REQUEST FORM                 */}
      {/* =================================================================== */}
      <div
        className="a4-print-page bg-white text-black font-['Sarabun',sans-serif] mx-auto shadow-md print:shadow-none w-[297mm] min-w-[297mm] max-w-[297mm] h-[210mm] min-h-[210mm] max-h-[210mm] flex flex-col justify-between border border-slate-200 print:border-none overflow-hidden"
        style={{
          width: '297mm',
          height: '210mm',
          minWidth: '297mm',
          maxWidth: '297mm',
          minHeight: '210mm',
          maxHeight: '210mm',
          paddingTop: '4.5mm',
          paddingBottom: '4.5mm',
          paddingLeft: '13mm',
          paddingRight: '13mm',
          boxSizing: 'border-box',
        }}
      >
        <div>
          {/* Page Number Top Right */}
          <div className="text-right text-[10.5px] font-medium text-black mb-0.5">
            แผ่นที่ 1/{totalPages}
          </div>

          {/* Top Header Box */}
          <div className="border-[1.8px] border-black grid grid-cols-12">
            {/* Left Header Column */}
            <div className="col-span-6 border-r-[1.8px] border-black py-1 px-4 text-center flex flex-col justify-center space-y-0.5 text-[12.5px] font-bold text-black leading-snug">
              <div>บริษัทซีพี ออลล์ จำกัด ( มหาชน )</div>
              <div>รหัสเอกสาร B4-FM-04-01-19</div>
              <div>แบบฟอร์มเรื่อง การขออนุมัติตรวจสอบงานก่อสร้าง โดยผู้รับเหมา</div>
              <div>ปรับปรุงครั้งที่ 2 วันที่ประกาศใช้ 1 เมษายน 2569</div>
            </div>

            {/* Right Header Column */}
            <div className="col-span-6 py-1 px-5 flex flex-col justify-between text-[12px] leading-snug">
              <div className="flex items-baseline">
                <span className="w-[88px] font-bold text-black shrink-0">
                  ชื่อสาขา
                </span>
                <span className="flex-1 border-b border-dotted border-black text-[#003399] font-semibold px-1 min-h-[17px]">
                  {doc.branchName}
                </span>
              </div>

              <div className="flex items-baseline">
                <span className="w-[88px] font-bold text-black shrink-0">
                  รหัสสาขา
                </span>
                <span className="flex-1 border-b border-dotted border-black text-[#003399] font-semibold px-1 min-h-[17px] text-[12px]">
                  {doc.branchCode}
                </span>
              </div>

              <div className="flex items-baseline">
                <span className="w-[88px] font-bold text-black shrink-0">
                  พื้นที่
                </span>
                <span className="flex-1 border-b border-dotted border-black text-[#003399] font-semibold px-1 min-h-[17px] text-[12px]">
                  {doc.area}
                </span>
              </div>

              <div className="flex items-baseline">
                <span className="w-[88px] font-bold text-black shrink-0">
                  ชื่อผรม. บริษัท
                </span>
                <span className="flex-1 border-b border-dotted border-black text-[#003399] font-semibold px-1 min-h-[17px]">
                  {doc.contractorCompany}
                </span>
              </div>
            </div>
          </div>

          {/* Main 9-Column Table (Balanced proportions matching CP ALL B4-FM-04-01-19 template) */}
          <table className="w-full border-[1.8px] border-black border-collapse mt-1 text-[11.5px] table-fixed">
            <colgroup>
              <col className="w-[4.2%]" />
              <col className="w-[35.8%]" />
              <col className="w-[15%]" />
              <col className="w-[11.5%]" />
              <col className="w-[6.5%]" />
              <col className="w-[5.5%]" />
              <col className="w-[8.5%]" />
              <col className="w-[5.5%]" />
              <col className="w-[7.5%]" />
            </colgroup>
            <thead>
              {/* Group Header Row */}
              <tr className="border-b-[1.5px] border-black text-[12px] font-bold">
                <th
                  colSpan={5}
                  className="border-r-[1.5px] border-black py-0.5 text-center font-bold"
                >
                  ส่วนที่ 1 : ผู้รับเหมา Request for Inspection
                </th>
                <th colSpan={4} className="py-0.5 text-center font-bold">
                  ส่วนที่ 2 : ส่วน ACM ตรวจสอบ
                </th>
              </tr>

              {/* Column Header Row */}
              <tr className="border-b-[1.5px] border-black text-center leading-tight">
                <th className="border-r border-black py-0.5 px-0.5 font-bold text-[10.5px]">
                  <div>เลือก</div>
                  <div>หัวข้อ</div>
                </th>
                <th className="border-r border-black py-0.5 px-2 font-bold text-[12px]">
                  รายการอนุมัติ
                </th>
                <th className="border-r border-black py-0.5 px-1">
                  <div className="font-bold text-[11px]">รายละเอียด</div>
                  <div className="font-normal text-[9px]">
                    ( เช่น ตำแหน่ง , ปริมาณ หรือ จำนวน )
                  </div>
                </th>
                <th className="border-r border-black py-0.5 px-1">
                  <div className="font-bold text-[10.5px]">หัวหน้างานผู้รับผิดชอบ</div>
                  <div className="font-normal text-[8.5px]">
                    ( โฟร์แมน หรือ วิศวกร ผรม. )
                  </div>
                </th>
                <th className="border-r-[1.5px] border-black py-0.5 px-0.5">
                  <div className="font-bold text-[11px]">วันที่</div>
                  <div className="font-normal text-[8.5px]">
                    นัดหมายตรวจ
                  </div>
                </th>
                <th className="border-r border-black py-0.5 px-0.5">
                  <div className="font-bold text-[9.5px]">ผลการ</div>
                  <div className="font-bold text-[9.5px]">ตรวจ</div>
                  <div className="font-normal text-[8px]">
                    (ผ่าน/ไม่ผ่าน)
                  </div>
                </th>
                <th className="border-r border-black py-0.5 px-0.5">
                  <div className="font-bold text-[10px]">กรณีไม่ผ่าน</div>
                  <div className="font-normal text-[8.5px]">( แก้ไข )</div>
                  <div className="font-normal text-[8px] leading-tight">
                    เรียบร้อย / ไม่เรียบร้อย
                  </div>
                </th>
                <th className="border-r border-black py-0.5 px-0.5">
                  <div className="font-bold text-[9.5px]">วันที่</div>
                  <div className="font-normal text-[8.5px]">อนุมัติ</div>
                  <div className="font-normal text-[8.5px]">ให้เท</div>
                  <div className="font-normal text-[8.5px]">คอนกรีต</div>
                </th>
                <th className="py-0.5 px-1 font-bold text-[11px]">หมายเหตุ</th>
              </tr>
            </thead>

            <tbody>
              {doc.items.map((item, idx) => {
                const isLast = idx === doc.items.length - 1;
                const rowHeightClass =
                  wf && wf.enabled ? 'h-[22px]' : 'h-[24.5px]';
                return (
                  <tr
                    key={item.itemNumber}
                    className={
                      isLast
                        ? `border-b-[1.8px] border-black ${rowHeightClass}`
                        : `border-b border-dotted border-black ${rowHeightClass}`
                    }
                  >
                    {/* Col 1: Checkbox */}
                    <td className="border-r border-black text-center align-middle py-0">
                      <SquareBox checked={item.checked} />
                    </td>

                    {/* Col 2: Approval Item Title (Full text, never clipped) */}
                    <td className="border-r border-black px-1.5 align-middle text-black">
                      {renderApprovalTitle(item)}
                    </td>

                    {/* Col 3: Details */}
                    <td className="border-r border-black px-1.5 py-0.5 align-middle text-[10.5px] font-medium text-black leading-tight break-words">
                      {item.checked ? item.details : ''}
                    </td>

                    {/* Col 4: Responsible Person */}
                    <td className="border-r border-black px-1.5 py-0.5 align-middle text-[10.5px] font-medium text-black leading-tight break-words">
                      {item.checked ? item.responsiblePerson : ''}
                    </td>

                    {/* Col 5: Appointment Date */}
                    <td className="border-r-[1.5px] border-black px-1 align-middle text-center text-[10.5px] font-medium text-black whitespace-nowrap">
                      {item.checked ? item.inspectionDate : ''}
                    </td>

                    {/* Cols 6-9: Section 2 (Blank for ACM on-site handwriting) */}
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td></td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Bottom Notes & Signature Section */}
          <div className="grid grid-cols-12 mt-1 text-[11px] leading-tight">
            {/* Left: Preparation Notes + 7-Day Weather Forecast Strip below Note 4 */}
            <div className="col-span-8 space-y-0.5 pr-2">
              <div>
                <span className="underline font-bold text-black">หมายเหตุ</span>{' '}
                <span className="font-bold text-[#d00000]">
                  : ต้องแนบแบบแสดงจุดที่จะขออนุมัติ พร้อมกับเอกสารขออนุมัติ
                </span>
              </div>
              <div className="underline font-bold text-black">
                การเตรียมความพร้อมก่อนเทคอนกรีต
              </div>
              <div className="font-bold text-black">
                1. ตรวจเช็คสภาพอากาศล่วงหน้า ก่อนวางแผน
              </div>
              <div className="font-bold text-black">
                2. เตรียมวัสดุ อุปกรณ์ป้องกัน กรณีฝนตก
              </div>
              <div className="font-bold text-black">
                3. เตรียมคนงานให้เพียงพอสำหรับงานเทพื้นคอนกรีต
              </div>
              <div className="font-bold text-black">
                4. กรณีวันที่ ACM ตรวจสอบตรงกับวันเสาร์-อาทิตย์ หรือวันหยุดนักขัตฤกษ์ ขอให้ผู้รับเหมาแจ้งก่อน 3 วัน
              </div>

              {/* 7-Day Horizontal Weather Forecast Strip directly below Line 4 */}
              {wf && wf.enabled && sevenDays.length === 7 && (
                <div className="mt-1 pt-0.5">
                  <div className="rounded-lg border-[1.3px] border-sky-800/80 bg-gradient-to-b from-slate-900 via-sky-950 to-slate-900 text-white px-2.5 py-1.5 shadow-2xs">
                    {/* Header bar inside 7-day forecast card */}
                    <div className="flex items-center justify-between gap-2 pb-1 mb-1 border-b border-sky-800/80 text-[9.5px] leading-none">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-extrabold text-sky-300">
                          พยากรณ์อากาศ 7 วัน จ.{wf.province || 'กรุงเทพมหานคร'}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="font-semibold text-white truncate">
                          สาขา: {doc.branchName || '-'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-amber-300 font-bold">
                          ★ วันนัดตรวจ (ตรงกลาง): {displayForecastDate} ({wf.conditionLabel})
                        </span>
                      </div>
                    </div>

                    {/* 7-Day Horizontal Grid (Left to Right, Inspection Date at Center Index 3) */}
                    <div className="grid grid-cols-7 gap-1">
                      {sevenDays.map((day, dIdx) => {
                        const isCenter = dIdx === 3 || !!day.isInspectionDay;
                        const barLeftPct = Math.max(
                          0,
                          Math.min(
                            85,
                            ((day.tempMin - weekMinTemp) / tempSpan) * 100
                          )
                        );
                        const barWidthPct = Math.max(
                          15,
                          Math.min(
                            100 - barLeftPct,
                            ((day.tempMax - day.tempMin) / tempSpan) * 100
                          )
                        );

                        return (
                          <div
                            key={`wf-day-${day.dayOffset}-${dIdx}`}
                            className={`rounded-md px-1 py-1 flex flex-col items-center justify-between text-center leading-none ${
                              isCenter
                                ? 'bg-sky-500/30 border-[1.4px] border-amber-300 shadow-2xs'
                                : 'bg-white/5 border border-white/10'
                            }`}
                          >
                            {/* Row 1: Day Name + Date (and Center Badge) */}
                            <div className="w-full flex flex-col items-center">
                              {isCenter ? (
                                <span className="text-[8px] font-extrabold text-amber-300 tracking-tight mb-0.5">
                                  ★ วันนัดตรวจ ★
                                </span>
                              ) : (
                                <span className="text-[7.5px] text-slate-300 mb-0.5">
                                  {day.dayOffset < 0
                                    ? `ล่วงหน้า ${Math.abs(day.dayOffset)} วัน`
                                    : `ถัดไป +${day.dayOffset} วัน`}
                                </span>
                              )}
                              <span
                                className={`text-[9.5px] font-bold tabular-nums ${
                                  isCenter ? 'text-white' : 'text-slate-100'
                                }`}
                              >
                                {day.dayNameShort} {day.dateLabel}
                              </span>
                            </div>

                            {/* Row 2: Weather Icon (Rain Cloud vs Sun Cloud) + Rain % */}
                            <div className="flex items-center justify-center gap-1 my-0.5">
                              <DailyWeatherIconSvg
                                isRainy={day.isRainy}
                                sizeClass="w-5 h-5"
                              />
                              <div className="flex flex-col items-start leading-none">
                                <span
                                  className={`text-[9px] font-extrabold tabular-nums ${
                                    day.isRainy
                                      ? 'text-sky-300'
                                      : 'text-amber-200'
                                  }`}
                                >
                                  {day.rainProbability}%
                                </span>
                                <span className="text-[7px] text-slate-300">
                                  {day.isRainy ? 'ฝนตก' : 'ไม่มีฝน'}
                                </span>
                              </div>
                            </div>

                            {/* Row 3: Temp Min - Temp Bar - Temp Max */}
                            <div className="w-full flex items-center gap-0.5 text-[8.5px] font-bold tabular-nums mt-0.5">
                              <span className="text-slate-300 shrink-0">
                                {day.tempMin}°
                              </span>
                              <div className="flex-1 h-[4px] rounded-full bg-slate-700/90 relative overflow-hidden">
                                <div
                                  className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-red-400"
                                  style={{
                                    left: `${barLeftPct}%`,
                                    width: `${barWidthPct}%`,
                                  }}
                                />
                              </div>
                              <span className="text-white shrink-0">
                                {day.tempMax}°
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Signatures */}
            <div className="col-span-4 flex flex-col justify-center space-y-4 pl-4 pt-1">
              <div>
                <div className="flex items-end">
                  <span className="w-16 font-medium text-black shrink-0 leading-none pb-0.5">
                    ผู้ขออนุมัติ
                  </span>
                  <div className="flex-1 relative border-b border-dotted border-black min-h-[26px] flex items-end justify-center">
                    {doc.supervisorSignature && (
                      <img
                        src={doc.supervisorSignature}
                        alt={`ลายเซ็น ${requesterName}`}
                        className="max-h-[38px] max-w-[155px] object-contain -mb-[3px] mix-blend-multiply pointer-events-none select-none"
                      />
                    )}
                  </div>
                </div>
                <div className="text-center pl-16 text-[11px] text-black mt-0.5">
                  ( {requesterName} )
                </div>
              </div>

              <div>
                <div className="flex items-baseline">
                  <span className="w-16 font-medium text-black shrink-0">
                    ผู้อนุมัติ
                  </span>
                  <span className="flex-1 border-b border-dotted border-black"></span>
                </div>
                <div className="text-center pl-16 text-[11px] text-black mt-0.5">
                  ( ACM )
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Right Document Editor Footer */}
        <div className="text-right text-[9.5px] text-black leading-none">
          Document Editor : สำนัก Construction Management (CM)
        </div>
      </div>

      {/* =================================================================== */}
      {/* SECTION 3 PAGES: MULTI-PHOTO ATTACHMENT PAGES (2, 4, 6 PER PAGE)    */}
      {/* =================================================================== */}
      {photoPages.map((pagePhotos, pIdx) => {
        const pageNumber = pIdx + 2;
        const headerInfo = getPhotoPageHeaderItemsText(pagePhotos);
        const startPhotoIndex = pIdx * perPage;

        return (
          <div
            key={`photo-page-sec3-${pageNumber}`}
            className="a4-print-page bg-white text-black font-['Sarabun',sans-serif] mx-auto shadow-md print:shadow-none w-[297mm] min-w-[297mm] max-w-[297mm] h-[210mm] min-h-[210mm] max-h-[210mm] flex flex-col justify-between border border-slate-200 print:border-none overflow-hidden"
            style={{
              width: '297mm',
              height: '210mm',
              minWidth: '297mm',
              maxWidth: '297mm',
              minHeight: '210mm',
              maxHeight: '210mm',
              paddingTop: '5.5mm',
              paddingBottom: '5.5mm',
              paddingLeft: '13mm',
              paddingRight: '13mm',
              boxSizing: 'border-box',
            }}
          >
            {/* Top Header */}
            <div className="flex flex-col flex-1 min-h-0">
              <div className="text-right text-[10.5px] font-medium text-black mb-0.5">
                แผ่นที่ {pageNumber}/{totalPages}
              </div>

              {/* Header Box with Selected Approval Items */}
              <div className="border-[1.8px] border-black grid grid-cols-12 shrink-0">
                {/* Left Column: Approval Items Header pulled from Selection */}
                <div className="col-span-7 border-r-[1.8px] border-black py-1.5 px-3.5 flex flex-col justify-center space-y-0.5 leading-snug">
                  <div className="flex items-center justify-between text-[11.5px] font-bold text-black">
                    <span>บริษัทซีพี ออลล์ จำกัด ( มหาชน )</span>
                    <span>รหัสเอกสาร B4-FM-04-01-19 (เอกสารแนบรูปภาพ/แบบ)</span>
                  </div>
                  <div className="text-[12.5px] font-bold text-[#003399] truncate">
                    รายการอนุมัติ : {headerInfo.titleLine}
                  </div>
                  {headerInfo.detailLine ? (
                    <div className="text-[11px] font-semibold text-slate-800 truncate">
                      รายละเอียด : {headerInfo.detailLine}
                    </div>
                  ) : (
                    <div className="text-[11px] font-medium text-slate-600">
                      แบบแสดงจุดและภาพถ่ายประกอบการขออนุมัติตรวจสอบงานก่อสร้าง
                    </div>
                  )}
                </div>

                {/* Right Column: Branch Info */}
                <div className="col-span-5 py-1.5 px-4 flex flex-col justify-between text-[11.5px] leading-snug">
                  <div className="flex items-baseline">
                    <span className="w-[78px] font-bold text-black shrink-0">
                      ชื่อสาขา
                    </span>
                    <span className="flex-1 border-b border-dotted border-black text-[#003399] font-semibold px-1 truncate">
                      {doc.branchName}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-baseline">
                      <span className="w-[52px] font-bold text-black shrink-0">
                        รหัสสาขา
                      </span>
                      <span className="flex-1 border-b border-dotted border-black text-[#003399] font-semibold px-1 text-[11px]">
                        {doc.branchCode}
                      </span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="w-[36px] font-bold text-black shrink-0">
                        พื้นที่
                      </span>
                      <span className="flex-1 border-b border-dotted border-black text-[#003399] font-semibold px-1 text-[11px]">
                        {doc.area}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-baseline">
                    <span className="w-[78px] font-bold text-black shrink-0">
                      ชื่อผรม. บริษัท
                    </span>
                    <span className="flex-1 border-b border-dotted border-black text-[#003399] font-semibold px-1 truncate">
                      {doc.contractorCompany}
                    </span>
                  </div>
                </div>
              </div>

              {/* Photo Grid Container */}
              <div
                className={`mt-2 flex-1 min-h-0 grid ${getGridClassForLayout(
                  layout
                )}`}
              >
                {pagePhotos.map((photo, idxInPage) => {
                  const globalIdx = startPhotoIndex + idxInPage + 1;
                  const linkedItem =
                    photo.linkedItemNumber && photo.linkedItemNumber !== 'ALL'
                      ? doc.items.find(
                          (it) => it.itemNumber === photo.linkedItemNumber
                        )
                      : null;
                  const itemTagText = linkedItem
                    ? formatApprovalItemFullTitle(linkedItem)
                    : headerInfo.titleLine;

                  return (
                    <div
                      key={photo.id}
                      className="border-[1.5px] border-black flex flex-col overflow-hidden bg-white min-h-0"
                    >
                      {/* Top Strip: Photo Number & Approval Item Name */}
                      <div className="bg-slate-100 border-b border-black px-2.5 py-1 flex items-center justify-between gap-2 text-[11px] shrink-0">
                        <span className="font-bold text-black shrink-0">
                          รูปที่ {globalIdx}
                        </span>
                        <span className="font-semibold text-[#003399] truncate">
                          {itemTagText}
                        </span>
                      </div>

                      {/* Image Area */}
                      <div className="flex-1 min-h-0 w-full bg-slate-50/50 flex items-center justify-center overflow-hidden p-1">
                        <img
                          src={photo.url}
                          alt={photo.caption || `รูปที่ ${globalIdx}`}
                          className="max-w-full max-h-full w-full h-full object-contain"
                        />
                      </div>

                      {/* Bottom Caption Bar */}
                      <div className="border-t border-dotted border-black px-2.5 py-1 bg-white text-[11px] font-medium text-black truncate shrink-0">
                        <span className="font-bold mr-1">คำอธิบาย:</span>
                        <span>
                          {photo.caption?.trim() ||
                            linkedItem?.details?.trim() ||
                            'ภาพถ่าย / แบบแสดงจุดที่ขออนุมัติตรวจสอบงานก่อสร้าง'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Signatures & Document Editor Footer */}
            <div className="mt-2 pt-1 shrink-0">
              <div className="grid grid-cols-12 items-end text-[11px]">
                <div className="col-span-5 flex items-end pr-4">
                  <span className="font-medium text-black mr-2 shrink-0 leading-none pb-0.5">
                    ผู้ขออนุมัติ
                  </span>
                  <div className="flex-1 relative border-b border-dotted border-black min-h-[24px] flex items-end justify-center">
                    {doc.supervisorSignature && (
                      <img
                        src={doc.supervisorSignature}
                        alt={`ลายเซ็น ${requesterName}`}
                        className="max-h-[30px] max-w-[140px] object-contain -mb-[2px] mix-blend-multiply pointer-events-none select-none"
                      />
                    )}
                  </div>
                  <span className="ml-2 text-black shrink-0 leading-none pb-0.5">
                    ( {requesterName} )
                  </span>
                </div>

                <div className="col-span-5 flex items-baseline pr-4">
                  <span className="font-medium text-black mr-2 shrink-0">
                    ผู้อนุมัติ
                  </span>
                  <span className="flex-1 border-b border-dotted border-black"></span>
                  <span className="ml-2 text-black shrink-0">( ACM )</span>
                </div>

                <div className="col-span-2 text-right text-[9.5px] text-black leading-none">
                  Document Editor : สำนัก CM
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* =================================================================== */}
      {/* SECTION 4 PAGES: DEDICATED FULL-PAGE 1 PHOTO PER PAGE               */}
      {/* =================================================================== */}
      {fullPagePhotos.map((photo, fIdx) => {
        const pageNumber = 1 + photoPages.length + fIdx + 1;
        const headerInfo = getPhotoPageHeaderItemsText([photo]);
        const linkedItem =
          photo.linkedItemNumber && photo.linkedItemNumber !== 'ALL'
            ? doc.items.find((it) => it.itemNumber === photo.linkedItemNumber)
            : null;
        const itemTagText = linkedItem
          ? formatApprovalItemFullTitle(linkedItem)
          : headerInfo.titleLine;

        return (
          <div
            key={`photo-page-sec4-${pageNumber}`}
            className="a4-print-page bg-white text-black font-['Sarabun',sans-serif] mx-auto shadow-md print:shadow-none w-[297mm] min-w-[297mm] max-w-[297mm] h-[210mm] min-h-[210mm] max-h-[210mm] flex flex-col justify-between border border-slate-200 print:border-none overflow-hidden"
            style={{
              width: '297mm',
              height: '210mm',
              minWidth: '297mm',
              maxWidth: '297mm',
              minHeight: '210mm',
              maxHeight: '210mm',
              paddingTop: '5.5mm',
              paddingBottom: '5.5mm',
              paddingLeft: '13mm',
              paddingRight: '13mm',
              boxSizing: 'border-box',
            }}
          >
            {/* Top Header */}
            <div className="flex flex-col flex-1 min-h-0">
              <div className="text-right text-[10.5px] font-medium text-black mb-0.5">
                แผ่นที่ {pageNumber}/{totalPages}
              </div>

              {/* Header Box with Selected Approval Items */}
              <div className="border-[1.8px] border-black grid grid-cols-12 shrink-0">
                {/* Left Column: Approval Items Header pulled from Selection */}
                <div className="col-span-7 border-r-[1.8px] border-black py-1.5 px-3.5 flex flex-col justify-center space-y-0.5 leading-snug">
                  <div className="flex items-center justify-between text-[11.5px] font-bold text-black">
                    <span>บริษัทซีพี ออลล์ จำกัด ( มหาชน )</span>
                    <span>
                      รหัสเอกสาร B4-FM-04-01-19 (แบบแสดงจุดขออนุมัติเต็มหน้า)
                    </span>
                  </div>
                  <div className="text-[12.5px] font-bold text-[#003399] truncate">
                    รายการอนุมัติ : {headerInfo.titleLine}
                  </div>
                  {headerInfo.detailLine ? (
                    <div className="text-[11px] font-semibold text-slate-800 truncate">
                      รายละเอียด : {headerInfo.detailLine}
                    </div>
                  ) : (
                    <div className="text-[11px] font-medium text-slate-600">
                      แนบรูปภาพ / แบบแสดงจุดที่จะขออนุมัติตรวจสอบงานก่อสร้าง (แบบเต็มหน้า 1 รูป)
                    </div>
                  )}
                </div>

                {/* Right Column: Branch Info */}
                <div className="col-span-5 py-1.5 px-4 flex flex-col justify-between text-[11.5px] leading-snug">
                  <div className="flex items-baseline">
                    <span className="w-[78px] font-bold text-black shrink-0">
                      ชื่อสาขา
                    </span>
                    <span className="flex-1 border-b border-dotted border-black text-[#003399] font-semibold px-1 truncate">
                      {doc.branchName}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-baseline">
                      <span className="w-[52px] font-bold text-black shrink-0">
                        รหัสสาขา
                      </span>
                      <span className="flex-1 border-b border-dotted border-black text-[#003399] font-semibold px-1 text-[11px]">
                        {doc.branchCode}
                      </span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="w-[36px] font-bold text-black shrink-0">
                        พื้นที่
                      </span>
                      <span className="flex-1 border-b border-dotted border-black text-[#003399] font-semibold px-1 text-[11px]">
                        {doc.area}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-baseline">
                    <span className="w-[78px] font-bold text-black shrink-0">
                      ชื่อผรม. บริษัท
                    </span>
                    <span className="flex-1 border-b border-dotted border-black text-[#003399] font-semibold px-1 truncate">
                      {doc.contractorCompany}
                    </span>
                  </div>
                </div>
              </div>

              {/* Single Full-Page Photo Frame */}
              <div className="mt-2 flex-1 min-h-0 grid grid-cols-1 grid-rows-1">
                <div className="border-[1.8px] border-black flex flex-col overflow-hidden bg-white min-h-0">
                  {/* Top Strip: Full-Page Photo Number & Approval Item Name */}
                  <div className="bg-slate-100 border-b border-black px-3 py-1 flex items-center justify-between gap-2 text-[11.5px] shrink-0">
                    <span className="font-bold text-black shrink-0">
                      ภาพแบบเต็มหน้าที่ {fIdx + 1} (แผ่นที่ {pageNumber}/{totalPages})
                    </span>
                    <span className="font-bold text-[#003399] truncate">
                      {itemTagText}
                    </span>
                  </div>

                  {/* Full-Page Image Area */}
                  <div className="flex-1 min-h-0 w-full bg-slate-50/40 flex items-center justify-center overflow-hidden p-1.5">
                    <img
                      src={photo.url}
                      alt={photo.caption || `ภาพแบบเต็มหน้าที่ ${fIdx + 1}`}
                      className="max-w-full max-h-full w-full h-full object-contain"
                    />
                  </div>

                  {/* Bottom Caption Bar */}
                  <div className="border-t border-dotted border-black px-3 py-1 bg-white text-[11.5px] font-medium text-black truncate shrink-0">
                    <span className="font-bold mr-1.5">คำอธิบาย:</span>
                    <span>
                      {photo.caption?.trim() ||
                        linkedItem?.details?.trim() ||
                        'แบบแสดงจุดที่จะขออนุมัติ / ภาพถ่ายเต็มหน้าประกอบการขออนุมัติตรวจสอบงานก่อสร้าง'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Signatures & Document Editor Footer */}
            <div className="mt-2 pt-1 shrink-0">
              <div className="grid grid-cols-12 items-end text-[11px]">
                <div className="col-span-5 flex items-end pr-4">
                  <span className="font-medium text-black mr-2 shrink-0 leading-none pb-0.5">
                    ผู้ขออนุมัติ
                  </span>
                  <div className="flex-1 relative border-b border-dotted border-black min-h-[24px] flex items-end justify-center">
                    {doc.supervisorSignature && (
                      <img
                        src={doc.supervisorSignature}
                        alt={`ลายเซ็น ${requesterName}`}
                        className="max-h-[30px] max-w-[140px] object-contain -mb-[2px] mix-blend-multiply pointer-events-none select-none"
                      />
                    )}
                  </div>
                  <span className="ml-2 text-black shrink-0 leading-none pb-0.5">
                    ( {requesterName} )
                  </span>
                </div>

                <div className="col-span-5 flex items-baseline pr-4">
                  <span className="font-medium text-black mr-2 shrink-0">
                    ผู้อนุมัติ
                  </span>
                  <span className="flex-1 border-b border-dotted border-black"></span>
                  <span className="ml-2 text-black shrink-0">( ACM )</span>
                </div>

                <div className="col-span-2 text-right text-[9.5px] text-black leading-none">
                  Document Editor : สำนัก CM
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
