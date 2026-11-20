/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HandoverDocument as HandoverDocType } from '../../types/types.ts';
import { formatCurrency, formatThaiDate } from '../../utils/bahtText.ts';

interface HandoverDocumentProps {
  document: HandoverDocType;
  containerId?: string;
  isPrintPreview?: boolean;
}

export const HandoverDocument: React.FC<HandoverDocumentProps> = ({
  document: doc,
  containerId = 'handover-document-print',
  isPrintPreview = false,
}) => {
  const dateInfo = formatThaiDate(doc.date);
  const completionDateInfo = formatThaiDate(doc.completionDate);
  const poDateInfo = formatThaiDate(doc.poDate);

  // Guarantee at least 5 rows like the official form
  const rows = [...doc.items];
  while (rows.length < 5) {
    rows.push({
      id: `empty-${rows.length + 1}`,
      description: '',
      unitPrice: 0,
      totalPrice: 0,
    });
  }

  return (
    <div
      id={containerId}
      className={`bg-white text-slate-900 font-['Sarabun',sans-serif] mx-auto px-[20mm] py-[15mm] shadow-md print:shadow-none w-[210mm] min-w-[210mm] max-w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] flex flex-col justify-between text-[12.5px] sm:text-[13px] leading-snug border border-slate-200 print:border-none overflow-hidden ${
        isPrintPreview ? 'scale-[0.98] transform-origin-top' : ''
      }`}
      style={{
        width: '210mm',
        height: '297mm',
        minWidth: '210mm',
        maxWidth: '210mm',
        minHeight: '297mm',
        maxHeight: '297mm',
        paddingLeft: '20mm',
        paddingRight: '20mm',
        paddingTop: '15mm',
        paddingBottom: '15mm',
        boxSizing: 'border-box',
      }}
    >
      <div>
        {/* Document Header */}
        <div className="text-center pt-1 pb-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-wide text-slate-950">
            หนังสือส่งมอบงาน (ผู้รับเหมา)
          </h1>
        </div>

        {/* Date Row (Top Right) */}
        <div className="flex justify-end items-center text-xs sm:text-[12.5px] mb-2 space-x-1 sm:space-x-1.5">
          <span className="font-medium">วันที่</span>
          <span className="border-b border-slate-800 px-2.5 min-w-[32px] text-center font-semibold">
            {dateInfo.day}
          </span>
          <span className="font-medium ml-1">เดือน</span>
          <span className="border-b border-slate-800 px-3 min-w-[80px] text-center font-semibold">
            {dateInfo.month}
          </span>
          <span className="font-medium ml-1">พ.ศ.</span>
          <span className="border-b border-slate-800 px-2.5 min-w-[45px] text-center font-semibold">
            {dateInfo.year}
          </span>
        </div>

        {/* Subject & Recipient */}
        <div className="space-y-1 mb-2 text-xs sm:text-[12.5px]">
          <div className="flex items-baseline">
            <span className="w-14 font-bold text-slate-900 shrink-0">เรื่อง</span>
            <div className="flex-1 border-b border-slate-800 pb-0.5 px-2 font-medium">
              {doc.subject || 'ขอส่งมอบงาน'}
            </div>
          </div>
          <div className="flex items-baseline">
            <span className="w-14 font-bold text-slate-900 shrink-0">เรียน</span>
            <div className="flex-1 border-b border-slate-800 pb-0.5 px-2 font-medium">
              {doc.toRecipient || 'กรรมการผู้จัดการ'}
            </div>
          </div>
        </div>

        {/* Contractor & Project Header Text */}
        <div className="space-y-1.5 mb-2.5 text-xs sm:text-[12.5px] leading-normal">
          <div className="flex flex-wrap items-baseline gap-1 pl-14">
            <span className="font-medium text-slate-800">ข้าพเจ้า</span>
            <span className="border-b border-slate-800 px-2 font-semibold text-slate-950 flex-1 min-w-[140px]">
              {doc.subcontractorName}
            </span>
            <span className="font-medium text-slate-800 ml-1">เป็นผู้ทำการรับเหมางาน</span>
            <span className="border-b border-slate-800 px-2 font-semibold text-slate-950 flex-1 min-w-[170px]">
              {doc.contractWorkType || 'งานจ้างเหมาเฉพาะค่าแรงงานโครงสร้าง'}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-1">
            <span className="font-medium text-slate-800">โครงการ</span>
            <span className="border-b border-slate-800 px-2 font-semibold text-slate-950 flex-1 min-w-[180px]">
              {doc.projectName}
            </span>
            <span className="font-medium text-slate-800 ml-1">เลขที่ใบสั่งซื้อ</span>
            <span className="border-b border-slate-800 px-2 font-semibold text-slate-950 min-w-[110px] text-center">
              {doc.poNumber}
            </span>
            <span className="font-medium text-slate-800 ml-1">ลงวันที่</span>
            <span className="border-b border-slate-800 px-2 font-semibold text-slate-950 min-w-[120px] text-center">
              {poDateInfo.fullText}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-1">
            <span className="font-medium text-slate-800">แล้วเสร็จตั้งแต่วันที่</span>
            <span className="border-b border-slate-800 px-1.5 min-w-[30px] text-center font-semibold">
              {completionDateInfo.day}
            </span>
            <span className="font-medium text-slate-800">เดือน</span>
            <span className="border-b border-slate-800 px-2.5 min-w-[75px] text-center font-semibold">
              {completionDateInfo.month}
            </span>
            <span className="font-medium text-slate-800">พ.ศ.</span>
            <span className="border-b border-slate-800 px-1.5 min-w-[40px] text-center font-semibold">
              {completionDateInfo.year}
            </span>
            <span className="font-medium text-slate-800 ml-1">ขอส่งมอบงานงวดที่</span>
            <span className="border-b border-slate-800 px-2 min-w-[32px] text-center font-bold">
              {doc.periodNumber}
            </span>
            <span className="font-medium text-slate-800">โดยมีรายละเอียดดังนี้</span>
          </div>
        </div>

        {/* 5-Item Handover Table */}
        <div className="space-y-1 mb-2.5">
          {rows.map((item, index) => (
            <div key={item.id} className="flex items-baseline text-xs sm:text-[12.5px]">
              <span className="w-5 font-bold text-slate-900 shrink-0">{index + 1}.</span>
              <div className="flex-1 border-b border-slate-700 pb-0.5 px-2 font-medium text-slate-950 truncate">
                {item.description || ''}
              </div>
              <span className="font-medium text-slate-700 ml-2 shrink-0">จำนวน/ราคาต่อหน่วย:</span>
              <div className="w-24 sm:w-28 border-b border-slate-700 pb-0.5 px-2 text-right font-bold text-slate-950 shrink-0">
                {item.unitPrice > 0 ? formatCurrency(item.unitPrice) : ''}
              </div>
              <span className="font-medium text-slate-700 ml-2 shrink-0">รวมส่งมอบ:</span>
              <div className="w-24 sm:w-28 border-b border-slate-700 pb-0.5 px-2 text-right font-bold text-slate-950 shrink-0">
                {item.totalPrice > 0 ? formatCurrency(item.totalPrice) : ''}
              </div>
              <span className="w-8 text-right text-slate-700 shrink-0">บาท</span>
            </div>
          ))}
        </div>

        {/* Total Summary */}
        <div className="space-y-1 mb-3 text-xs sm:text-[12.5px]">
          <div className="flex items-baseline justify-end">
            <span className="font-medium text-slate-900 mr-2">
              จึงเรียนมาเพื่อทราบและโปรดพิจารณาจ่ายเงินเป็นจำนวนเงิน
            </span>
            <div className="w-32 sm:w-36 border-b-2 border-slate-900 pb-0.5 px-2 text-right font-bold text-sm sm:text-base text-slate-950">
              {formatCurrency(doc.totalAmount)}
            </div>
            <span className="font-bold text-slate-900 ml-1.5">บาท</span>
          </div>

          <div className="flex items-baseline justify-center">
            <span className="font-bold mr-1">(</span>
            <div className="flex-1 border-b border-slate-800 pb-0.5 text-center font-bold text-slate-950 px-2">
              {doc.totalAmountThaiText}
            </div>
            <span className="font-bold ml-1">)</span>
            <span className="font-medium text-slate-900 ml-2">ให้แก่ข้าพเจ้าด้วย</span>
          </div>
        </div>

        {/* Contractor Signature on Right */}
        <div className="flex justify-end mb-4 pt-2">
          <div className="w-64 sm:w-72 flex flex-col items-center">
            <div className="text-slate-700 text-xs mb-5">ขอแสดงความนับถือ</div>
            <div className="flex items-baseline justify-center w-full">
              <span className="font-medium text-slate-800 mr-2 text-xs">ลงชื่อ</span>
              <span className="border-b border-slate-700 flex-1 max-w-[180px] inline-block"></span>
              <span className="font-medium text-slate-800 ml-2 text-xs">ผู้รับจ้าง</span>
            </div>
            <div className="text-slate-950 font-medium text-xs pt-1 text-center">
              ( {doc.subcontractorName} )
            </div>
            <div className="text-[10.5px] text-slate-500">ผู้รับจ้าง / ผู้รับเหมา</div>
          </div>
        </div>

        {/* Supervisor Confirmation Box */}
        <div className="border-t border-slate-800 pt-3 mb-3 space-y-1.5 text-xs sm:text-[12.5px]">
          <div className="flex flex-wrap items-baseline gap-1 pl-14">
            <span className="font-medium">ข้าพเจ้า</span>
            <span className="border-b border-slate-800 px-2 font-semibold text-slate-950 flex-1 min-w-[140px] text-center">
              {doc.supervisorName}
            </span>
            <span className="font-medium ml-1">เป็นผู้ควบคุมงาน</span>
            <span className="border-b border-slate-800 px-2 font-semibold text-slate-950 flex-1 min-w-[180px] text-center">
              {doc.projectName}
            </span>
          </div>
          <div className="flex flex-wrap items-baseline gap-1">
            <span className="font-semibold text-slate-950">
              บริษัท ไม้ยืนต้นคอนสตรัคชั่น จำกัด
            </span>
            <span className="font-medium ml-1.5">ขอยืนยันว่า</span>
            <span className="border-b border-slate-800 px-2 font-semibold text-slate-950 flex-1 min-w-[130px] text-center">
              {doc.subcontractorName}
            </span>
            <span className="text-slate-800 ml-1">ได้ทำงานเสร็จจริงตามที่เสนอขอเบิกมา</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-1">
            <span className="font-medium">ตั้งแต่วันที่</span>
            <span className="border-b border-slate-800 px-3 min-w-[45px] text-center font-semibold">
              {completionDateInfo.day}
            </span>
            <span className="font-medium ml-1">เดือน</span>
            <span className="border-b border-slate-800 px-3 min-w-[90px] text-center font-semibold">
              {completionDateInfo.month}
            </span>
            <span className="font-medium ml-1">พ.ศ.</span>
            <span className="border-b border-slate-800 px-3 min-w-[55px] text-center font-semibold">
              {completionDateInfo.year}
            </span>
          </div>

          <div className="flex justify-end pt-1">
            <div className="w-64 sm:w-72 text-center space-y-0.5">
              <div className="flex items-baseline justify-center">
                <span className="font-medium text-slate-800 mr-2 text-xs">ลงชื่อ</span>
                <span className="border-b border-slate-700 w-36 sm:w-44 inline-block"></span>
              </div>
              <div className="text-slate-950 font-medium text-xs pt-0.5">
                ( {doc.supervisorName} )
              </div>
              <div className="text-[10.5px] text-slate-500">ผู้ควบคุมงาน ณ หน่วยงาน</div>
            </div>
          </div>
        </div>

        {/* Engineer and Approver Signatures */}
        <div className="border-t border-slate-300 pt-1.5">
          <p className="text-[11px] font-semibold text-slate-700 mb-1 text-center sm:text-left">
            งานดังกล่าวแล้วเสร็จจริง จึงเรียนมาเพื่ออนุมัติจ่ายเงินได้
          </p>
          <div className="grid grid-cols-2 gap-4 text-center text-xs">
            <div className="space-y-0.5">
              <div className="flex items-baseline justify-center">
                <span className="mr-1 text-[11px]">ลงชื่อ</span>
                <span className="border-b border-slate-500 w-32 inline-block"></span>
              </div>
              <div className="text-slate-800 text-xs">( {doc.engineerName || 'วิศวกรโครงการ'} )</div>
              <div className="text-slate-500 text-[10px]">วิศวกรโครงการ</div>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-baseline justify-center">
                <span className="mr-1 text-[11px]">ลงชื่อ</span>
                <span className="border-b border-slate-500 w-32 inline-block"></span>
              </div>
              <div className="text-slate-800 text-xs">( {doc.approverName || 'ผู้อนุมัติ'} )</div>
              <div className="text-slate-500 text-[10px]">ผู้อนุมัติ</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-2 pt-1 border-t border-slate-300 text-[10px] sm:text-[10.5px] text-slate-600">
        <p className="font-semibold text-slate-700 mb-0.2">หมายเหตุ</p>
        <p>
          กรุณาลงชื่อและระบุวันที่ตรวจงานให้เรียบร้อย
          และแนบเอกสารใบส่งมอบงานพร้อมกับสำเนาบัตรประชาชนผู้รับเหมาประกอบในการขออนุมัติเบิกจ่ายเงินทุกครั้ง
        </p>
      </div>
    </div>
  );
};
