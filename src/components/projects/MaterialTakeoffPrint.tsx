/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Project,
  ProjectGroup,
  ProjectTask,
  TaskMaterialItem,
  MaterialOrderStatus,
} from '../../types/types.ts';

export interface PhaseBlockData {
  group: ProjectGroup;
  phaseStartDate?: string;
  phaseEndDate?: string;
  tasks: Array<{
    task: ProjectTask;
    materials: TaskMaterialItem[];
  }>;
  totalMaterials: number;
}

export interface AggregatedMaterialRow {
  key: string;
  name: string;
  spec: string;
  unit: string;
  totalQuantity: number;
  notOrderedQty: number;
  orderedQty: number;
  deliveredQty: number;
  earliestRequiredDate?: string;
  usedInTasks: string[];
}

interface MaterialTakeoffPrintProps {
  project: Project;
  phaseBlocks: PhaseBlockData[];
  aggregatedRows: AggregatedMaterialRow[];
  viewMode: 'by_activity' | 'summary';
  containerId?: string;
  filterLabel?: string;
}

const THAI_SHORT_MONTHS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

export function formatThaiDateShort(dateStr?: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const yearNum = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const dayNum = parseInt(parts[2], 10);
  if (
    isNaN(yearNum) ||
    isNaN(monthIdx) ||
    isNaN(dayNum) ||
    monthIdx < 0 ||
    monthIdx > 11
  ) {
    return dateStr;
  }
  const thaiYearShort = ((yearNum + 543) % 100).toString().padStart(2, '0');
  return `${dayNum} ${THAI_SHORT_MONTHS[monthIdx]} ${thaiYearShort}`;
}

export function formatDateRangeThai(start?: string, end?: string): string {
  if (!start && !end) return 'ยังไม่ระบุวันที่';
  if (start && end) {
    if (start === end) return formatThaiDateShort(start);
    return `${formatThaiDateShort(start)} – ${formatThaiDateShort(end)}`;
  }
  if (start) return `เริ่ม ${formatThaiDateShort(start)}`;
  return `ถึง ${formatThaiDateShort(end)}`;
}

export function formatQuantityDisplay(qty: number): string {
  if (isNaN(qty)) return '0';
  return Number.isInteger(qty)
    ? qty.toLocaleString('th-TH')
    : qty.toLocaleString('th-TH', { maximumFractionDigits: 2 });
}

export function getMaterialStatusLabel(status: MaterialOrderStatus): string {
  switch (status) {
    case 'ordered':
      return 'สั่งแล้ว';
    case 'delivered':
      return 'ถึงหน้างานแล้ว';
    case 'not_ordered':
    default:
      return 'ยังไม่สั่ง';
  }
}

type FlatPrintRow =
  | {
      kind: 'phase_header';
      phaseName: string;
      phaseDateRange: string;
      taskCount: number;
      materialCount: number;
    }
  | {
      kind: 'task_header';
      taskTitle: string;
      taskDateRange: string;
      materialCount: number;
    }
  | {
      kind: 'material_item';
      rowNo: number;
      item: TaskMaterialItem;
    }
  | {
      kind: 'empty_task_note';
      text: string;
    };

function paginateDetailedRows(blocks: PhaseBlockData[]): FlatPrintRow[][] {
  const flat: FlatPrintRow[] = [];

  for (const block of blocks) {
    flat.push({
      kind: 'phase_header',
      phaseName: block.group.name,
      phaseDateRange: formatDateRangeThai(
        block.phaseStartDate,
        block.phaseEndDate
      ),
      taskCount: block.tasks.length,
      materialCount: block.totalMaterials,
    });

    if (block.tasks.length === 0) {
      flat.push({
        kind: 'empty_task_note',
        text: 'ยังไม่มีกิจกรรมในงวดงานนี้',
      });
      continue;
    }

    for (const entry of block.tasks) {
      flat.push({
        kind: 'task_header',
        taskTitle: entry.task.title,
        taskDateRange: formatDateRangeThai(
          entry.task.startDate,
          entry.task.endDate
        ),
        materialCount: entry.materials.length,
      });

      if (entry.materials.length === 0) {
        flat.push({
          kind: 'empty_task_note',
          text: 'ยังไม่ได้ระบุรายการถอดวัสดุในกิจกรรมนี้',
        });
      } else {
        entry.materials.forEach((mat, idx) => {
          flat.push({
            kind: 'material_item',
            rowNo: idx + 1,
            item: mat,
          });
        });
      }
    }
  }

  if (flat.length === 0) {
    return [[]];
  }

  // Weight-based A4 pagination so rows never overflow or clip on iPadOS PDF rendering
  const pages: FlatPrintRow[][] = [];
  let current: FlatPrintRow[] = [];
  let weight = 0;
  const maxFirstPageWeight = 20;
  const maxNextPageWeight = 24;

  const getRowWeight = (r: FlatPrintRow): number => {
    if (r.kind === 'phase_header') return 1.5;
    if (r.kind === 'task_header') return 1.3;
    if (r.kind === 'empty_task_note') return 1;
    const textLen =
      (r.item.name?.length || 0) +
      (r.item.spec?.length || 0) +
      (r.item.notes?.length || 0);
    return textLen > 55 ? 1.8 : 1.15;
  };

  for (let i = 0; i < flat.length; i++) {
    const row = flat[i];
    const rowW = getRowWeight(row);
    const limit = pages.length === 0 ? maxFirstPageWeight : maxNextPageWeight;

    // Keep phase/task header attached to at least 1 following row
    const nextW = i + 1 < flat.length ? getRowWeight(flat[i + 1]) : 0;
    const lookahead =
      row.kind === 'phase_header' || row.kind === 'task_header'
        ? rowW + nextW
        : rowW;

    if (current.length > 0 && weight + lookahead > limit) {
      pages.push(current);
      current = [row];
      weight = rowW;
    } else {
      current.push(row);
      weight += rowW;
    }
  }

  if (current.length > 0) {
    pages.push(current);
  }

  return pages;
}

function paginateSummaryRows(
  rows: AggregatedMaterialRow[]
): AggregatedMaterialRow[][] {
  if (rows.length === 0) return [[]];
  const pages: AggregatedMaterialRow[][] = [];
  const firstLimit = 15;
  const nextLimit = 19;

  let offset = 0;
  while (offset < rows.length) {
    const take = pages.length === 0 ? firstLimit : nextLimit;
    pages.push(rows.slice(offset, offset + take));
    offset += take;
  }
  return pages;
}

export const MaterialTakeoffPrint: React.FC<MaterialTakeoffPrintProps> = ({
  project,
  phaseBlocks,
  aggregatedRows,
  viewMode,
  containerId = 'material-takeoff-print-preview',
  filterLabel,
}) => {
  const todayFormatted = formatThaiDateShort(
    new Date().toISOString().split('T')[0]
  );

  const totalMaterialsCount = phaseBlocks.reduce(
    (sum, b) => sum + b.totalMaterials,
    0
  );
  const allMaterials = phaseBlocks.flatMap((b) =>
    b.tasks.flatMap((t) => t.materials)
  );
  const notOrderedCount = allMaterials.filter(
    (m) => m.status === 'not_ordered'
  ).length;
  const orderedCount = allMaterials.filter(
    (m) => m.status === 'ordered'
  ).length;
  const deliveredCount = allMaterials.filter(
    (m) => m.status === 'delivered'
  ).length;

  const detailedPages =
    viewMode === 'by_activity' ? paginateDetailedRows(phaseBlocks) : [];
  const summaryPages =
    viewMode === 'summary' ? paginateSummaryRows(aggregatedRows) : [];
  const totalPages =
    viewMode === 'by_activity' ? detailedPages.length : summaryPages.length;

  const renderPageHeader = (pageIndex: number) => (
    <div className="mb-3">
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2.5">
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
            {viewMode === 'by_activity'
              ? 'ใบถอดวัสดุตามกิจกรรม (Material Take-off)'
              : 'ใบสรุปรวมรายการถอดวัสดุทั้งโครงการ'}
          </div>
          <div className="text-[10px] text-slate-600 mt-0.5 tabular-nums">
            วันที่ออกเอกสาร: {todayFormatted} · หน้า {pageIndex + 1} / {totalPages}
          </div>
        </div>
      </div>

      {pageIndex === 0 && (
        <div className="mt-2.5 grid grid-cols-12 gap-2 border border-slate-300 rounded px-3 py-2 bg-slate-50/70 text-[11px]">
          <div className="col-span-7 space-y-0.5">
            <div>
              <span className="font-bold text-slate-700">โครงการ: </span>
              <span className="font-semibold text-slate-900">
                {project.name}
              </span>
              {project.code && (
                <span className="text-slate-600 ml-1.5">({project.code})</span>
              )}
            </div>
            <div>
              <span className="font-bold text-slate-700">ระยะเวลาโครงการ: </span>
              <span className="text-slate-800 tabular-nums">
                {formatDateRangeThai(project.startDate, project.endDate)}
              </span>
              {filterLabel && (
                <span className="text-slate-600 ml-2">· {filterLabel}</span>
              )}
            </div>
          </div>
          <div className="col-span-5 text-right space-y-0.5 tabular-nums">
            <div>
              <span className="font-bold text-slate-700">ผู้ควบคุมงาน: </span>
              <span className="text-slate-900">
                {project.supervisorName || '-'}
              </span>
            </div>
            <div className="text-[10px] text-slate-700">
              รายการทั้งหมด <strong>{totalMaterialsCount}</strong> รายการ ·
              ยังไม่สั่ง <strong className="text-amber-700">{notOrderedCount}</strong> ·
              สั่งแล้ว <strong className="text-blue-700">{orderedCount}</strong> ·
              ถึงหน้างาน <strong className="text-emerald-700">{deliveredCount}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderSignatures = () => (
    <div className="mt-auto pt-4">
      <div className="grid grid-cols-3 gap-6 pt-3 border-t border-slate-300 text-[10.5px] text-slate-800">
        <div className="text-center">
          <div className="h-9 border-b border-dotted border-slate-500 mx-4"></div>
          <div className="mt-1 font-semibold">ผู้ถอดรายการวัสดุ</div>
          <div className="text-[9.5px] text-slate-500">
            ({project.supervisorName || '........................................'})
          </div>
          <div className="text-[9.5px] text-slate-500">วันที่ ....... / ....... / .......</div>
        </div>
        <div className="text-center">
          <div className="h-9 border-b border-dotted border-slate-500 mx-4"></div>
          <div className="mt-1 font-semibold">วิศวกร / ผู้ตรวจสอบ</div>
          <div className="text-[9.5px] text-slate-500">(........................................)</div>
          <div className="text-[9.5px] text-slate-500">วันที่ ....... / ....... / .......</div>
        </div>
        <div className="text-center">
          <div className="h-9 border-b border-dotted border-slate-500 mx-4"></div>
          <div className="mt-1 font-semibold">ผู้อนุมัติจัดซื้อ</div>
          <div className="text-[9.5px] text-slate-500">(........................................)</div>
          <div className="text-[9.5px] text-slate-500">วันที่ ....... / ....... / .......</div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      id={containerId}
      className="bg-white text-slate-900 font-sans select-text"
    >
      {viewMode === 'by_activity'
        ? detailedPages.map((rows, pageIdx) => (
            <div
              key={`mt-detail-page-${pageIdx}`}
              className="a4-print-page bg-white w-[210mm] min-h-[297mm] px-[12mm] py-[11mm] box-border flex flex-col border-b border-slate-200 last:border-b-0 print:border-b-0 print:break-after-page last:print:break-after-auto"
            >
              {renderPageHeader(pageIdx)}

              <div className="flex-1">
                <table className="w-full border-collapse text-[10.5px] table-fixed">
                  <colgroup>
                    <col className="w-[6%]" />
                    <col className="w-[24%]" />
                    <col className="w-[19%]" />
                    <col className="w-[9%]" />
                    <col className="w-[8%]" />
                    <col className="w-[12%]" />
                    <col className="w-[10%]" />
                    <col className="w-[12%]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="border border-slate-700 py-1.5 px-1 text-center font-semibold">
                        ลำดับ
                      </th>
                      <th className="border border-slate-700 py-1.5 px-1.5 text-left font-semibold">
                        ชื่อวัสดุ
                      </th>
                      <th className="border border-slate-700 py-1.5 px-1.5 text-left font-semibold">
                        รายละเอียด / สเปค
                      </th>
                      <th className="border border-slate-700 py-1.5 px-1.5 text-right font-semibold">
                        จำนวน
                      </th>
                      <th className="border border-slate-700 py-1.5 px-1 text-center font-semibold">
                        หน่วย
                      </th>
                      <th className="border border-slate-700 py-1.5 px-1 text-center font-semibold">
                        วันที่ต้องใช้
                      </th>
                      <th className="border border-slate-700 py-1.5 px-1 text-center font-semibold">
                        สถานะสั่งซื้อ
                      </th>
                      <th className="border border-slate-700 py-1.5 px-1.5 text-left font-semibold">
                        หมายเหตุ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="border border-slate-300 py-8 text-center text-slate-500"
                        >
                          ยังไม่มีข้อมูลกิจกรรมหรือรายการถอดวัสดุในโครงการนี้
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, idx) => {
                        if (row.kind === 'phase_header') {
                          return (
                            <tr
                              key={`ph-${pageIdx}-${idx}`}
                              className="bg-slate-200/90 text-slate-900"
                            >
                              <td
                                colSpan={8}
                                className="border border-slate-400 py-1.5 px-2 font-bold text-[11px]"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span>งวดงาน: {row.phaseName}</span>
                                  <span className="font-medium text-[10px] text-slate-700 tabular-nums">
                                    ช่วงวันที่งวด: {row.phaseDateRange} ·{' '}
                                    {row.taskCount} กิจกรรม · {row.materialCount}{' '}
                                    รายการวัสดุ
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        }
                        if (row.kind === 'task_header') {
                          return (
                            <tr
                              key={`tk-${pageIdx}-${idx}`}
                              className="bg-blue-50/80 text-slate-900"
                            >
                              <td
                                colSpan={8}
                                className="border border-slate-300 py-1 px-2 text-[10.5px]"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold text-slate-900">
                                    กิจกรรม: {row.taskTitle}
                                  </span>
                                  <span className="text-[10px] text-blue-900 font-medium tabular-nums shrink-0">
                                    วันที่กิจกรรม: {row.taskDateRange}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        }
                        if (row.kind === 'empty_task_note') {
                          return (
                            <tr key={`emp-${pageIdx}-${idx}`}>
                              <td
                                colSpan={8}
                                className="border border-slate-300 py-1.5 px-3 text-slate-400 italic text-[10px]"
                              >
                                {row.text}
                              </td>
                            </tr>
                          );
                        }
                        const m = row.item;
                        const statusColor =
                          m.status === 'delivered'
                            ? 'text-emerald-700 font-semibold'
                            : m.status === 'ordered'
                            ? 'text-blue-700 font-semibold'
                            : 'text-amber-700 font-semibold';
                        return (
                          <tr
                            key={`mat-${pageIdx}-${idx}-${m.id}`}
                            className="bg-white"
                          >
                            <td className="border border-slate-300 py-1.5 px-1 text-center tabular-nums text-slate-600">
                              {row.rowNo}
                            </td>
                            <td className="border border-slate-300 py-1.5 px-1.5 font-medium text-slate-900 break-words">
                              {m.name || '-'}
                            </td>
                            <td className="border border-slate-300 py-1.5 px-1.5 text-slate-700 break-words">
                              {m.spec || '-'}
                            </td>
                            <td className="border border-slate-300 py-1.5 px-1.5 text-right font-semibold tabular-nums text-slate-900">
                              {formatQuantityDisplay(m.quantity)}
                            </td>
                            <td className="border border-slate-300 py-1.5 px-1 text-center text-slate-700">
                              {m.unit || '-'}
                            </td>
                            <td className="border border-slate-300 py-1.5 px-1 text-center tabular-nums text-slate-700">
                              {formatThaiDateShort(m.requiredDate)}
                            </td>
                            <td
                              className={`border border-slate-300 py-1.5 px-1 text-center ${statusColor}`}
                            >
                              {getMaterialStatusLabel(m.status)}
                            </td>
                            <td className="border border-slate-300 py-1.5 px-1.5 text-slate-600 break-words">
                              {m.notes || '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {pageIdx === totalPages - 1 && renderSignatures()}
            </div>
          ))
        : summaryPages.map((rows, pageIdx) => {
            const startNumber =
              pageIdx === 0 ? 1 : 15 + (pageIdx - 1) * 19 + 1;
            return (
              <div
                key={`mt-summary-page-${pageIdx}`}
                className="a4-print-page bg-white w-[210mm] min-h-[297mm] px-[12mm] py-[11mm] box-border flex flex-col border-b border-slate-200 last:border-b-0 print:border-b-0 print:break-after-page last:print:break-after-auto"
              >
                {renderPageHeader(pageIdx)}

                <div className="flex-1">
                  <table className="w-full border-collapse text-[10.5px] table-fixed">
                    <colgroup>
                      <col className="w-[6%]" />
                      <col className="w-[23%]" />
                      <col className="w-[18%]" />
                      <col className="w-[9%]" />
                      <col className="w-[8%]" />
                      <col className="w-[12%]" />
                      <col className="w-[12%]" />
                      <col className="w-[12%]" />
                    </colgroup>
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        <th className="border border-slate-700 py-1.5 px-1 text-center font-semibold">
                          ลำดับ
                        </th>
                        <th className="border border-slate-700 py-1.5 px-1.5 text-left font-semibold">
                          ชื่อวัสดุ
                        </th>
                        <th className="border border-slate-700 py-1.5 px-1.5 text-left font-semibold">
                          รายละเอียด / สเปค
                        </th>
                        <th className="border border-slate-700 py-1.5 px-1.5 text-right font-semibold">
                          รวมจำนวน
                        </th>
                        <th className="border border-slate-700 py-1.5 px-1 text-center font-semibold">
                          หน่วย
                        </th>
                        <th className="border border-slate-700 py-1.5 px-1 text-center font-semibold">
                          ต้องใช้เร็วสุด
                        </th>
                        <th className="border border-slate-700 py-1.5 px-1 text-center font-semibold">
                          สถานะ (ยังไม่สั่ง/สั่ง/ถึง)
                        </th>
                        <th className="border border-slate-700 py-1.5 px-1.5 text-left font-semibold">
                          ใช้ในกิจกรรม
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="border border-slate-300 py-8 text-center text-slate-500"
                          >
                            ยังไม่มีรายการถอดวัสดุสำหรับสรุปรวม
                          </td>
                        </tr>
                      ) : (
                        rows.map((row, idx) => (
                          <tr key={row.key} className="bg-white">
                            <td className="border border-slate-300 py-1.5 px-1 text-center tabular-nums text-slate-600">
                              {startNumber + idx}
                            </td>
                            <td className="border border-slate-300 py-1.5 px-1.5 font-semibold text-slate-900 break-words">
                              {row.name}
                            </td>
                            <td className="border border-slate-300 py-1.5 px-1.5 text-slate-700 break-words">
                              {row.spec || '-'}
                            </td>
                            <td className="border border-slate-300 py-1.5 px-1.5 text-right font-bold tabular-nums text-slate-900">
                              {formatQuantityDisplay(row.totalQuantity)}
                            </td>
                            <td className="border border-slate-300 py-1.5 px-1 text-center text-slate-700">
                              {row.unit || '-'}
                            </td>
                            <td className="border border-slate-300 py-1.5 px-1 text-center tabular-nums text-slate-700">
                              {formatThaiDateShort(row.earliestRequiredDate)}
                            </td>
                            <td className="border border-slate-300 py-1.5 px-1 text-center tabular-nums text-[9.5px]">
                              <span className="text-amber-700 font-semibold">
                                {formatQuantityDisplay(row.notOrderedQty)}
                              </span>
                              {' / '}
                              <span className="text-blue-700 font-semibold">
                                {formatQuantityDisplay(row.orderedQty)}
                              </span>
                              {' / '}
                              <span className="text-emerald-700 font-semibold">
                                {formatQuantityDisplay(row.deliveredQty)}
                              </span>
                            </td>
                            <td className="border border-slate-300 py-1.5 px-1.5 text-[9.5px] text-slate-600 break-words">
                              {row.usedInTasks.join(', ')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {pageIdx === totalPages - 1 && renderSignatures()}
              </div>
            );
          })}
    </div>
  );
};
