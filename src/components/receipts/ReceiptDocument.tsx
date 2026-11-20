/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Receipt } from '../../types/types.ts';
import { formatCurrency, formatThaiDate } from '../../utils/bahtText.ts';
import { generateSampleIdCardDataUrl } from '../../utils/sampleIdCard.ts';

interface ReceiptDocumentProps {
  receipt: Receipt;
  containerId?: string;
  isPrintPreview?: boolean;
  showAttachedIdCard?: boolean;
  idCardImage?: string;
}

export const ReceiptDocument: React.FC<ReceiptDocumentProps> = ({
  receipt,
  containerId = 'receipt-document-print',
  isPrintPreview = false,
  idCardImage,
}) => {
  const dateInfo = formatThaiDate(receipt.date);
  const isRetentionType = receipt.type === 'tax_3_retention_5';

  // Resolve ID Card image:
  // 1. Explicit prop passed in
  // 2. Exact sample image if it's น.ส.บานชื่น
  // 3. Realistic generated SVG copy based on contractor credentials
  const resolvedIdCardImage =
    idCardImage ||
    (receipt.subcontractorName?.includes('บานชื่น') || receipt.subcontractorIdCard?.includes('1898 00026 81 2')
      ? '/assets/aistudio/sample_id_card_banchuen.png'
      : generateSampleIdCardDataUrl(
          receipt.subcontractorName || 'ผู้รับเหมา',
          receipt.subcontractorIdCard || '1 1002 01884 92 0',
          receipt.subcontractorAddress || 'กรุงเทพมหานคร'
        ));

  return (
    <div
      id={containerId}
      className={`bg-white text-slate-900 font-['Sarabun',sans-serif] mx-auto px-[20mm] py-[15mm] shadow-md print:shadow-none w-[210mm] min-w-[210mm] max-w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] flex flex-col justify-between text-[13px] sm:text-[13.5px] leading-snug border border-slate-200 print:border-none overflow-hidden ${
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
        <div className="text-center pt-1 pb-3">
          <h1 className="text-2xl sm:text-[26px] font-bold tracking-wide text-slate-950">
            ใบเสร็จรับเงิน
          </h1>
        </div>

        {/* Date Row (Top Right) */}
        <div className="flex justify-end items-center text-xs sm:text-[13px] mb-3 space-x-1 sm:space-x-1.5">
          <span className="font-medium text-slate-800">วันที่</span>
          <span className="border-b border-slate-800 px-3 min-w-[36px] text-center font-semibold text-slate-950">
            {dateInfo.day}
          </span>
          <span className="font-medium text-slate-800 ml-1">เดือน</span>
          <span className="border-b border-slate-800 px-3.5 min-w-[85px] text-center font-semibold text-slate-950">
            {dateInfo.month}
          </span>
          <span className="font-medium text-slate-800 ml-1">ปี</span>
          <span className="border-b border-slate-800 px-3 min-w-[48px] text-center font-semibold text-slate-950">
            {dateInfo.year}
          </span>
        </div>

        {/* Subcontractor Information */}
        <div className="space-y-1.5 mb-2.5 text-xs sm:text-[13px]">
          <div className="flex items-baseline">
            <span className="w-14 sm:w-16 font-medium text-slate-800 shrink-0">
              ข้าพเจ้า
            </span>
            <div className="flex-1 border-b border-slate-800 pb-0.5 px-2 font-semibold text-slate-950">
              {receipt.subcontractorName || '....................................................................'}
            </div>
          </div>

          <div className="flex items-baseline">
            <span className="w-14 sm:w-16 font-medium text-slate-800 shrink-0">ที่อยู่</span>
            <div className="flex-1 border-b border-slate-800 pb-0.5 px-2 text-slate-950">
              {receipt.subcontractorAddress || '....................................................................'}
            </div>
          </div>

          <div className="flex items-baseline">
            <span className="w-44 sm:w-48 font-medium text-slate-800 shrink-0">
              หมายเลขบัตรประจำตัวประชาชน
            </span>
            <div className="flex-1 border-b border-slate-800 pb-0.5 px-2 font-mono tracking-wider font-bold text-slate-950">
              {receipt.subcontractorIdCard || '...................................................'}
            </div>
          </div>
        </div>

        {/* Payer Information - Fixed on paper with equal font size */}
        <div className="space-y-0.5 mb-2.5 pt-0.5 text-xs sm:text-[13px]">
          <div className="flex flex-wrap items-baseline gap-1">
            <span className="font-semibold text-slate-800">ได้รับเงินจาก</span>
            <span className="font-bold text-slate-950">
              {receipt.payerCompanyName || 'บริษัท ไม้ยืนต้น คอนสตรัคชั่น จำกัด'}
            </span>
          </div>
          <div className="flex flex-wrap items-baseline text-xs sm:text-[13px] text-slate-900">
            <span className="font-medium mr-1.5 text-slate-950">ที่อยู่</span>
            <span>
              {receipt.payerCompanyAddress ||
                '27/2 ซอยพหลโยธิน 24 แยก 2-1 ถนนพหลโยธิน แขวงจอมพล เขตจตุจักร กทม.10900'}
            </span>
          </div>
        </div>

        {/* Payment For */}
        <div className="flex items-baseline mb-3 text-xs sm:text-[13px]">
          <span className="w-24 sm:w-28 font-medium text-slate-800 shrink-0">เป็นการชำระค่า</span>
          <div className="flex-1 border-b border-slate-800 pb-0.5 px-2 font-medium text-slate-950">
            {receipt.paymentFor || 'ค่าบริการ / ค่าจ้างเหมา'}
          </div>
        </div>

        {/* Financial Calculation Lines */}
        <div className="space-y-1 mb-3 text-xs sm:text-[13px]">
          {/* 1. Amount */}
          <div className="flex items-baseline py-0.5">
            <span className="font-medium text-slate-800 shrink-0">จำนวนเงิน</span>
            <div className="flex-1 ml-2 border-b border-dotted border-slate-500 flex justify-end pb-0.5 pr-1">
              <span className="font-bold text-slate-950">
                {formatCurrency(receipt.amount)}
              </span>
            </div>
            <span className="w-10 text-right text-slate-700 shrink-0 ml-1">บาท</span>
          </div>

          {/* 2. Deposit Advance */}
          <div className="flex items-baseline py-0.5 text-slate-700">
            <span className="font-medium shrink-0">หักเงินมัดจำ/เบิกเงินล่วงหน้า</span>
            <div className="flex-1 ml-2 border-b border-dotted border-slate-500 flex justify-end pb-0.5 pr-1">
              <span className="font-medium text-slate-900">
                {receipt.depositAdvance > 0 ? formatCurrency(receipt.depositAdvance) : '-'}
              </span>
            </div>
            <span className="w-10 text-right shrink-0 ml-1">บาท</span>
          </div>

          {/* 3. Amount Before Tax */}
          <div className="flex items-baseline py-0.5">
            <span className="font-medium text-slate-800 shrink-0">จำนวนเงินก่อนภาษีหัก ณ ที่จ่าย</span>
            <div className="flex-1 ml-2 border-b border-dotted border-slate-500 flex justify-end pb-0.5 pr-1">
              <span className="font-bold text-slate-950">
                {formatCurrency(receipt.amountBeforeTax)}
              </span>
            </div>
            <span className="w-10 text-right text-slate-700 shrink-0 ml-1">บาท</span>
          </div>

          {/* 4. Tax Withheld */}
          <div className="flex items-baseline py-0.5 text-slate-800">
            <span className="font-medium shrink-0">หักภาษีหัก ณ ที่จ่าย</span>
            <div className="flex-1 ml-2 border-b border-dotted border-slate-500 flex justify-end pb-0.5 pr-1">
              <span className="font-semibold text-slate-900">
                {receipt.taxWithheld > 0 ? formatCurrency(receipt.taxWithheld) : '-'}
              </span>
            </div>
            <span className="w-10 text-right text-slate-700 shrink-0 ml-1">บาท</span>
          </div>

          {/* 5. Amount After Tax (Net Total - Dotted Line underneath amount) */}
          <div className="flex items-baseline py-0.5">
            <span className="font-bold text-slate-900 shrink-0">
              จำนวนเงินสุทธิหลังหักภาษี ณ ที่จ่าย
            </span>
            <div className="flex-1 ml-2 border-b border-dotted border-slate-500 flex justify-end pb-0.5 pr-1">
              <span className="font-bold text-sm sm:text-base text-slate-950">
                {formatCurrency(receipt.amountAfterTax)}
              </span>
            </div>
            <span className="w-10 text-right font-bold text-slate-900 shrink-0 ml-1">บาท</span>
          </div>

          {/* Retention Options (If 1.3 or Retention applied) */}
          {isRetentionType && (
            <>
              <div className="flex items-baseline py-0.5 text-slate-800 pt-1">
                <span className="font-medium shrink-0">หัก Retention {receipt.retentionRate}%</span>
                <div className="flex-1 ml-2 border-b border-dotted border-slate-500 flex justify-end pb-0.5 pr-1">
                  <span className="font-semibold text-slate-900">
                    {receipt.retentionAmount > 0 ? formatCurrency(receipt.retentionAmount) : '-'}
                  </span>
                </div>
                <span className="w-10 text-right text-slate-700 shrink-0 ml-1">บาท</span>
              </div>

              <div className="flex items-baseline py-0.5 text-slate-700">
                <span className="font-medium shrink-0">หักค่าสินค้า/ค่าใช้จ่ายอื่นๆ</span>
                <div className="flex-1 ml-2 border-b border-dotted border-slate-500 flex justify-end pb-0.5 pr-1">
                  <span className="font-medium text-slate-900">
                    {receipt.otherDeductions > 0 ? formatCurrency(receipt.otherDeductions) : '-'}
                  </span>
                </div>
                <span className="w-10 text-right shrink-0 ml-1">บาท</span>
              </div>

              <div className="flex items-baseline py-1 mt-0.5">
                <span className="font-bold text-slate-950 shrink-0">
                  จำนวนเงินสุทธิหลังหัก Retention/ค่าใช้จ่ายอื่นๆ
                </span>
                <div className="flex-1 ml-2 border-b border-dotted border-slate-500 flex justify-end pb-0.5 pr-1">
                  <span className="font-bold text-sm sm:text-base text-slate-950">
                    {formatCurrency(receipt.netPayable)}
                  </span>
                </div>
                <span className="w-10 text-right font-bold text-slate-950 shrink-0 ml-1">บาท</span>
              </div>
            </>
          )}

          {/* Thai Baht Text row */}
          <div className="flex items-baseline pt-2 pb-1 text-xs sm:text-[13px]">
            <span className="font-medium text-slate-800 mr-1.5 shrink-0">จำนวนเงินตัวอักษร</span>
            <span className="text-slate-800 font-bold mr-1">(</span>
            <div className="flex-1 border-b border-slate-800 pb-0.5 text-center font-bold text-slate-950">
              {receipt.amountThaiText || '....................................................................'}
            </div>
            <span className="text-slate-800 font-bold ml-1">)</span>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* LOWER SECTION: EXACT LAYOUT MATCHING USER'S SAMPLE (image_77cb6605) */}
        {/* Left: ID Card Image + "ลงชื่อรับรองสำเนาถูกต้อง"                        */}
        {/* Right: Signature Line + "( ชื่อผู้รับเงิน )"                             */}
        {/* ==================================================================== */}
        <div className="mt-4 sm:mt-5 flex items-end justify-between gap-4">
          {/* Left: Attached ID Card Photo */}
          <div className="w-[48%] max-w-[270px] flex flex-col items-center">
            <div className="w-full text-left text-[11px] sm:text-xs text-slate-600 mb-1 pl-0.5 font-medium">
              สำเนาบัตรประจำตัวประชาชนแนบ
            </div>
            <div className="w-full border border-slate-300 rounded-lg p-0.5 bg-white shadow-2xs overflow-hidden flex items-center justify-center">
              <img
                src={resolvedIdCardImage}
                alt="สำเนาบัตรประจำตัวประชาชนแนบ"
                className="w-full max-h-[145px] sm:max-h-[155px] object-contain rounded"
              />
            </div>
            <div className="text-[11px] sm:text-xs text-slate-700 font-medium mt-1 text-center">
              ลงชื่อรับรองสำเนาถูกต้อง
            </div>
          </div>

          {/* Right: Receiver Signature Block */}
          <div className="w-[48%] flex flex-col justify-end items-center pb-2">
            <div className="flex items-baseline justify-center w-full">
              <span className="font-medium text-slate-800 mr-2 text-xs sm:text-[13px]">ลงชื่อ</span>
              <span className="border-b border-slate-700 flex-1 max-w-[190px] inline-block"></span>
              <span className="font-medium text-slate-800 ml-2 text-xs sm:text-[13px]">ผู้รับเงิน</span>
            </div>
            <div className="pt-2 text-slate-950 font-medium text-xs sm:text-[13px] text-center">
              ( {receipt.signeeName || receipt.subcontractorName || '....................................................'} )
            </div>
          </div>
        </div>
      </div>

      {/* Footer Notes (หมายเหตุ) */}
      <div className="mt-4 pt-2.5 border-t border-slate-300 text-[10.5px] sm:text-[11px] text-slate-600 space-y-0.5">
        <p className="font-semibold text-slate-700">หมายเหตุ</p>
        <ul className="list-disc list-inside space-y-0.5 pl-0.5 text-[10px] sm:text-[10.5px]">
          <li>ถ่ายสำเนาบัตรประจำตัวประชาชนพร้อมรับรองสำเนาถูกต้องแนบท้าย</li>
          <li>ค่าบริการ/ค่าจ้างทำของ/ค่าจ้างเหมา หัก ณ ที่จ่าย 3%</li>
          <li>ค่าขนส่ง หักภาษี ณ ที่จ่าย 1%</li>
          <li>อื่นๆ ตามอัตราที่กฎหมายกำหนด</li>
        </ul>
      </div>
    </div>
  );
};
