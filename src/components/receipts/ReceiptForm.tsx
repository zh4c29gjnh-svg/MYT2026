/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Receipt, Subcontractor, Project } from '../../types/types.ts';
import { formatBahtText } from '../../utils/bahtText.ts';
import { ReceiptDocument } from './ReceiptDocument.tsx';
import { DocumentActionButtons } from './DocumentActionButtons.tsx';
import { DocumentZoomContainer } from '../common/DocumentZoomContainer.tsx';
import {
  FileText,
  User,
  Building,
  RotateCcw,
  Sparkles,
  CreditCard,
  Image as ImageIcon,
  Upload,
  Eye,
  X,
  CheckCircle2,
} from 'lucide-react';

  interface ReceiptFormProps {
  receiptType: 'tax_0' | 'tax_3' | 'tax_3_retention_5';
  subcontractors: Subcontractor[];
  projects: Project[];
  onSaveReceipt: (receipt: Receipt) => void;
  onSaveSubcontractor?: (subcontractor: Subcontractor) => void;
  initialReceipt?: Receipt | null;
  onClearEditReceipt?: () => void;
  selectedSubcontractor?: Subcontractor | null;
}

export const ReceiptForm: React.FC<ReceiptFormProps> = ({
  receiptType,
  subcontractors,
  projects,
  onSaveReceipt,
  onSaveSubcontractor,
  initialReceipt,
  onClearEditReceipt,
  selectedSubcontractor,
}) => {
  const getDefaultTaxRate = () => (receiptType === 'tax_0' ? 0 : 3);
  const getDefaultRetentionRate = () => (receiptType === 'tax_3_retention_5' ? 5 : 0);

  const [date, setDate] = useState<string>(
    initialReceipt?.date || (subcontractors[0]?.name.includes('บานชื่น') ? '2026-07-31' : new Date().toISOString().split('T')[0])
  );
  const [selectedSubId, setSelectedSubId] = useState<string>(
    initialReceipt?.subcontractorId || selectedSubcontractor?.id || (subcontractors[0]?.id || '')
  );
  const [subName, setSubName] = useState<string>(
    initialReceipt?.subcontractorName || selectedSubcontractor?.name || (subcontractors[0]?.name || '')
  );
  const [subAddress, setSubAddress] = useState<string>(
    initialReceipt?.subcontractorAddress ||
      selectedSubcontractor?.address ||
      (subcontractors[0]?.address || '')
  );
  const [subIdCard, setSubIdCard] = useState<string>(
    initialReceipt?.subcontractorIdCard ||
      selectedSubcontractor?.idCardNumber ||
      (subcontractors[0]?.idCardNumber || '')
  );

  const [payerName, setPayerName] = useState<string>(
    initialReceipt?.payerCompanyName || 'บริษัท ไม้ยืนต้น คอนสตรัคชั่น จำกัด'
  );
  const [payerAddress, setPayerAddress] = useState<string>(
    initialReceipt?.payerCompanyAddress ||
      '27/2 ซอยพหลโยธิน 24 แยก 2-1 ถนนพหลโยธิน แขวงจอมพล เขตจตุจักร กทม.10900'
  );
  const [paymentFor, setPaymentFor] = useState<string>(
    initialReceipt?.paymentFor ||
      (subcontractors[0]?.skillType || 'จ้างเหมา ขัดหน้าปูน พื้นบ้าน')
  );

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialReceipt?.projectId || (projects[0]?.id || '')
  );

  // Financial inputs
  const [amount, setAmount] = useState<number>(
    initialReceipt?.amount ?? (subcontractors[0]?.name.includes('บานชื่น') ? 4000 : 45000)
  );
  const [depositAdvance, setDepositAdvance] = useState<number>(initialReceipt?.depositAdvance ?? 0);
  const [taxRate, setTaxRate] = useState<number>(initialReceipt?.taxRate ?? getDefaultTaxRate());
  const [retentionRate, setRetentionRate] = useState<number>(
    initialReceipt?.retentionRate ?? getDefaultRetentionRate()
  );
  const [otherDeductions, setOtherDeductions] = useState<number>(
    initialReceipt?.otherDeductions ?? 0
  );

  const [signeeName, setSigneeName] = useState<string>(
    initialReceipt?.signeeName || subName
  );

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [showAttachedIdCard, setShowAttachedIdCard] = useState<boolean>(false);
  const [isViewingIdModal, setIsViewingIdModal] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const currentSub = subcontractors.find((s) => s.id === selectedSubId) || 
    (subIdCard ? subcontractors.find((s) => s.idCardNumber.replace(/\s+/g, '') === subIdCard.replace(/\s+/g, '')) : null);

  // Whenever subcontractor selector changes manually (when not loading an initialReceipt), fill details
  const handleSelectSubcontractorDropdown = (subId: string) => {
    setSelectedSubId(subId);
    const found = subcontractors.find((s) => s.id === subId);
    if (found) {
      setSubName(found.name);
      setSubAddress(found.address);
      setSubIdCard(found.idCardNumber);
      setSigneeName(found.name);
      if (found.skillType && !initialReceipt) {
        setPaymentFor(`${found.skillType}`);
      }
      if (found.name.includes('บานชื่น') && !initialReceipt) {
        setAmount(4000);
        setDate('2026-07-31');
      } else if (found.name.includes('บรรเลง') && !initialReceipt) {
        setAmount(45000);
        setDate('2026-06-25');
      }
    }
  };

  // Sync when selectedSubcontractor from 1.1 changes (and not editing an existing receipt)
  useEffect(() => {
    if (selectedSubcontractor && !initialReceipt) {
      handleSelectSubcontractorDropdown(selectedSubcontractor.id);
    }
  }, [selectedSubcontractor]);

  // Sync when initialReceipt changes (loaded from 1.6 Archive for editing)
  useEffect(() => {
    if (initialReceipt) {
      setDate(initialReceipt.date);
      setSelectedSubId(initialReceipt.subcontractorId || '');
      setSubName(initialReceipt.subcontractorName);
      setSubAddress(initialReceipt.subcontractorAddress);
      setSubIdCard(initialReceipt.subcontractorIdCard);
      setPayerName(
        initialReceipt.payerCompanyName || 'บริษัท ไม้ยืนต้น คอนสตรัคชั่น จำกัด'
      );
      setPayerAddress(
        initialReceipt.payerCompanyAddress ||
          '27/2 ซอยพหลโยธิน 24 แยก 2-1 ถนนพหลโยธิน แขวงจอมพล เขตจตุจักร กทม.10900'
      );
      setPaymentFor(initialReceipt.paymentFor);
      if (initialReceipt.projectId) {
        setSelectedProjectId(initialReceipt.projectId);
      }
      setAmount(initialReceipt.amount);
      setDepositAdvance(initialReceipt.depositAdvance);
      setTaxRate(initialReceipt.taxRate);
      setRetentionRate(initialReceipt.retentionRate);
      setOtherDeductions(initialReceipt.otherDeductions);
      setSigneeName(initialReceipt.signeeName);
    }
  }, [initialReceipt]);

  // Derived calculations
  const effectiveTaxRate = receiptType === 'tax_3_retention_5' ? 3 : taxRate;
  const amountBeforeTax = Math.max(0, amount - depositAdvance);
  const taxWithheld = parseFloat(((amountBeforeTax * effectiveTaxRate) / 100).toFixed(2));
  const amountAfterTax = parseFloat((amountBeforeTax - taxWithheld).toFixed(2));
  const retentionAmount =
    receiptType === 'tax_3_retention_5'
      ? parseFloat(((amount * retentionRate) / 100).toFixed(2))
      : 0;
  const netPayable =
    receiptType === 'tax_3_retention_5'
      ? parseFloat((amountAfterTax - retentionAmount - otherDeductions).toFixed(2))
      : amountAfterTax;

  const thaiText = formatBahtText(netPayable);

  // Construct current receipt object (preserves id & receiptNumber when editing)
  const currentReceipt: Receipt = {
    id: initialReceipt?.id || `rec-${Date.now()}`,
    receiptNumber: initialReceipt?.receiptNumber || `REC-2569-${Math.floor(100 + Math.random() * 900)}`,
    type: receiptType,
    date,
    subcontractorId: selectedSubId,
    subcontractorName: subName,
    subcontractorAddress: subAddress,
    subcontractorIdCard: subIdCard,
    payerCompanyName: payerName,
    payerCompanyAddress: payerAddress,
    paymentFor,
    projectId: selectedProjectId,
    projectName: projects.find((p) => p.id === selectedProjectId)?.name,
    amount,
    depositAdvance,
    amountBeforeTax,
    taxRate: effectiveTaxRate,
    taxWithheld,
    amountAfterTax,
    retentionRate,
    retentionAmount,
    otherDeductions,
    netPayable,
    amountThaiText: thaiText,
    signeeName: signeeName || subName,
    createdAt: initialReceipt?.createdAt || new Date().toISOString(),
  };

  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const handleSave = () => {
    onSaveReceipt(currentReceipt);
    setSaveSuccessMessage(
      initialReceipt
        ? `บันทึกแก้ไขทับใบเสร็จเลขที่ ${currentReceipt.receiptNumber} เรียบร้อยแล้ว!`
        : 'บันทึกใบเสร็จเข้าคลังเอกสาร MYT เรียบร้อยแล้ว!'
    );
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  const getMenuTitle = () => {
    switch (receiptType) {
      case 'tax_0':
        return '1.2 ใบเสร็จหัก 0-5%';
      case 'tax_3':
        return '1.2 ใบเสร็จหัก 0-5%';
      case 'tax_3_retention_5':
        return '1.3 ใบเสร็จหัก 3% + ประกันผลงาน 5%';
    }
  };

  return (
    <div className="space-y-6">
      {/* Editing Mode Indicator Banner */}
      {initialReceipt && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5 text-amber-950 text-xs sm:text-sm">
            <FileText className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">
                โหมดแก้ไขใบเสร็จเดิม: เลขที่ {initialReceipt.receiptNumber}
              </span>{' '}
              <span>
                ({initialReceipt.subcontractorName}) — เมื่อกด &ldquo;บันทึกเข้าระบบ&rdquo; ระบบจะบันทึกทับใบเดิมโดยใช้เลขที่เอกสารเดิม
              </span>
            </div>
          </div>
          {onClearEditReceipt && (
            <button
              type="button"
              onClick={onClearEditReceipt}
              className="px-3 py-1.5 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap self-end sm:self-center cursor-pointer"
            >
              + ออกใบเสร็จใบใหม่แทน
            </button>
          )}
        </div>
      )}

      {/* Title & Action Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 mb-1">
            <FileText className="w-3.5 h-3.5 mr-1" />
            แบบฟอร์มเอกสารใบเสร็จรับเงิน
          </div>
          <h2 className="text-xl font-bold text-slate-900">{getMenuTitle()}</h2>
          <p className="text-sm text-slate-500">
            กรอกรายละเอียดเพื่อคำนวณภาษีและหักประกันผลงานอัตโนมัติ พร้อมพิมพ์และส่งออก PNG/PDF
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => {
              onClearEditReceipt?.();
              setAmount(45000);
              setDepositAdvance(0);
              setOtherDeductions(0);
              setTaxRate(getDefaultTaxRate());
              setRetentionRate(getDefaultRetentionRate());
            }}
            className="inline-flex items-center px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            รีเซ็ตค่าตัวอย่าง
          </button>
        </div>
      </div>

      {saveSuccessMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center text-emerald-800 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
          {saveSuccessMessage}
        </div>
      )}

      {/* Action Toolbar */}
      <DocumentActionButtons
        elementId="receipt-document-view"
        documentTitle={`ใบเสร็จรับเงิน ${subName}`}
        fileName={`ใบเสร็จ_${subName.replace(/\s+/g, '_')}_${receiptType}`}
        onSaveToSystem={handleSave}
        documentData={currentReceipt}
      />

      {/* Grid: Inputs Form on left, A4 live preview on right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Editor (5 cols) */}
        <div className="xl:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-base flex items-center">
              <User className="w-4 h-4 mr-2 text-blue-600" />
              ข้อมูลสำหรับออกใบเสร็จ
            </h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-mono">
              {currentReceipt.receiptNumber}
            </span>
          </div>

          {/* Quick Subcontractor Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              เลือกผู้รับเหมา (ผรม.) จากฐานข้อมูล
            </label>
            <select
              value={selectedSubId}
              onChange={(e) => handleSelectSubcontractorDropdown(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="">-- กรอกข้อมูลเอง / เลือกจากรายการ --</option>
              {subcontractors.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.skillType})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                วันที่ในใบเสร็จ
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                โครงการที่เกี่ยวข้อง
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contractor Detailed Info */}
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                ชื่อผู้รับเงิน (ข้าพเจ้า)
              </label>
              <input
                type="text"
                value={subName}
                onChange={(e) => {
                  setSubName(e.target.value);
                  setSigneeName(e.target.value);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold"
                placeholder="นายบรรเลง ร่องกล้า"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                เลขประจำตัวประชาชน 13 หลัก
              </label>
              <input
                type="text"
                value={subIdCard}
                onChange={(e) => setSubIdCard(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono tracking-wider"
                placeholder="1 1002 01884 92 0"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                ที่อยู่ผู้รับเงิน
              </label>
              <textarea
                rows={2}
                value={subAddress}
                onChange={(e) => setSubAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="24/9 ซอยลาดพร้าว 122 แขวงพลับพลา เขตวังทองหลาง กทม. 10310"
              />
            </div>

            {/* Subcontractor ID Card Photo Status & Attachment */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center">
                  <CreditCard className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                  รูปถ่ายสำเนาบัตรประจำตัวประชาชน ผรม.
                </span>
                {currentSub?.idCardImage ? (
                  <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                    มีรูปบัตรในระบบ
                  </span>
                ) : (
                  <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                    ยังไม่มีรูปบัตร
                  </span>
                )}
              </div>

              {currentSub?.idCardImage ? (
                <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                  <div className="flex items-center space-x-2">
                    <img
                      src={currentSub.idCardImage}
                      alt="สำเนาบัตร ปชช."
                      className="w-14 h-9 object-cover rounded border border-slate-300 shadow-2xs"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-800">
                        {currentSub.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {currentSub.idCardNumber || 'เลขบัตร 13 หลัก'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setIsViewingIdModal(true)}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-md transition-colors flex items-center"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      ดูรูปบัตร
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-md transition-colors"
                      title="เปลี่ยนรูปถ่ายบัตร"
                    >
                      เปลี่ยนรูป
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-dashed border-slate-300">
                  <span className="text-xs text-slate-500">
                    อัปโหลดรูปถ่ายบัตร ปชช. สำหรับแนบท้ายใบเสร็จ
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    อัปโหลดรูปบัตร
                  </button>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const base64 = event.target?.result as string;
                    if (currentSub && onSaveSubcontractor) {
                      const updatedSub = { ...currentSub, idCardImage: base64 };
                      onSaveSubcontractor(updatedSub);
                    }
                  };
                  reader.readAsDataURL(file);
                }}
              />

              {/* Toggle to include ID Card in document preview/print */}
              {currentSub?.idCardImage && (
                <label className="flex items-center space-x-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAttachedIdCard}
                    onChange={(e) => setShowAttachedIdCard(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    แนบสำเนาบัตร ปชช. ในใบเสร็จรับเงิน (พิมพ์พร้อมกันบนหน้า A4)
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* Payment For */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              เป็นการชำระค่า
            </label>
            <input
              type="text"
              value={paymentFor}
              onChange={(e) => setPaymentFor(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="ค่าบริการเช่าเครื่องจักรและรถขุดดิน..."
            />
          </div>

          {/* Payer Details - Fixed on Document */}
          <div className="border-t border-slate-100 pt-3">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center text-slate-700">
                <Building className="w-3.5 h-3.5 mr-1.5 text-blue-600 shrink-0" />
                <span className="font-semibold text-slate-800">ผู้จ่ายเงิน:</span>
                <span className="ml-1 text-slate-600 truncate">
                  บริษัท ไม้ยืนต้น คอนสตรัคชั่น จำกัด (คงที่บนกระดาษ)
                </span>
              </div>
            </div>
          </div>

          {/* Calculation Inputs */}
          <div className="border-t border-slate-100 pt-4 space-y-3.5 bg-slate-50 p-4 rounded-xl border">
            <h4 className="font-bold text-slate-800 text-sm flex items-center justify-between">
              <span>การคำนวณยอดเงิน</span>
              <span className="text-xs font-normal text-blue-600 flex items-center">
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                คำนวณอัตโนมัติ
              </span>
            </h4>

            {/* Amount */}
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700">จำนวนเงิน (Gross):</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-36 px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm text-right font-bold bg-white"
                />
                <span className="text-xs text-slate-500">บาท</span>
              </div>
            </div>

            {/* Deposit */}
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-600">หักเงินมัดจำ/ล่วงหน้า:</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="0.01"
                  value={depositAdvance}
                  onChange={(e) => setDepositAdvance(parseFloat(e.target.value) || 0)}
                  className="w-36 px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm text-right bg-white"
                />
                <span className="text-xs text-slate-500">บาท</span>
              </div>
            </div>

            {/* Tax Rate */}
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700">อัตราภาษีหัก ณ ที่จ่าย:</label>
              {receiptType === 'tax_3_retention_5' ? (
                <div className="flex items-center space-x-2">
                  <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm font-bold text-blue-800 flex items-center space-x-1.5">
                    <span>หัก 3%</span>
                    <span className="text-xs font-normal text-blue-600">(ค่าจ้างเหมา/บริการ)</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 min-w-[70px] text-right">
                    {taxWithheld.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value))}
                    className="w-36 px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm font-semibold bg-white"
                  >
                    <option value={0}>0% (ไม่หักภาษี)</option>
                    <option value={1}>1% (ค่าขนส่ง)</option>
                    <option value={2}>2% (ค่าโฆษณา)</option>
                    <option value={3}>3% (ค่าจ้างเหมา/บริการ)</option>
                    <option value={5}>5% (ค่าเช่าทรัพย์สิน/เครื่องจักร)</option>
                  </select>
                  <span className="text-xs text-slate-500">%</span>
                </div>
              )}
            </div>

            {/* Retention 5% (for 1.3 ใบเสร็จหัก 3% + ประกันผลงาน 5%) */}
            {receiptType === 'tax_3_retention_5' && (
              <>
                <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={retentionRate === 5}
                        onChange={(e) => setRetentionRate(e.target.checked ? 5 : 0)}
                        className="w-4 h-4 text-amber-600 rounded border-amber-400 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-amber-950">
                        หักประกันผลงาน (Retention) 5%
                      </span>
                    </label>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                          retentionRate === 5
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {retentionRate === 5 ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                            แสดงการหัก 5%
                          </>
                        ) : (
                          'ไม่หัก (0%)'
                        )}
                      </span>
                      <span className="text-xs font-bold text-amber-950 min-w-[70px] text-right">
                        {retentionAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-600">หักค่าสินค้า/ค่าใช้จ่ายอื่นๆ:</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="0.01"
                      value={otherDeductions}
                      onChange={(e) => setOtherDeductions(parseFloat(e.target.value) || 0)}
                      className="w-36 px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm text-right bg-white"
                    />
                    <span className="text-xs text-slate-500">บาท</span>
                  </div>
                </div>
              </>
            )}

            {/* Net Total Display */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-base font-bold text-slate-900">
              <span>ยอดจ่ายสุทธิ:</span>
              <span className="text-lg text-blue-600">
                {netPayable.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
              </span>
            </div>

            {/* BahtText */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs text-slate-700">
              <span className="font-semibold text-slate-500 block mb-0.5">ตัวอักษรภาษาไทย:</span>
              <span className="font-bold text-slate-900">{thaiText}</span>
            </div>
          </div>

          {/* Signee name */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              ชื่อผู้ลงนามรับเงิน
            </label>
            <input
              type="text"
              value={signeeName}
              onChange={(e) => setSigneeName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="นายบรรเลง ร่องกล้า"
            />
          </div>
        </div>

        {/* Right Column: Live Document A4 Display (7 cols) with Zoom Controller */}
        <div className="xl:col-span-7">
          <DocumentZoomContainer
            defaultZoom={85}
            title="ตัวอย่างใบเสร็จรับเงิน A4 เสมือนจริง"
            badge="ตรงตามแบบฟอร์ม 100%"
          >
            <ReceiptDocument
              receipt={currentReceipt}
              containerId="receipt-document-view"
              showAttachedIdCard={showAttachedIdCard}
              idCardImage={currentSub?.idCardImage}
            />
          </DocumentZoomContainer>
        </div>
      </div>

      {/* Enlarged ID Card View Modal */}
      {isViewingIdModal && currentSub?.idCardImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden my-8">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                <h4 className="font-semibold text-sm">
                  สำเนาบัตรประจำตัวประชาชน - {currentSub.name}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsViewingIdModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center">
                <img
                  src={currentSub.idCardImage}
                  alt={`บัตรประชาชน ${currentSub.name}`}
                  className="max-h-72 w-auto object-contain"
                />
                {/* Security Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-slate-900/15 font-black text-xl rotate-[-25deg] select-none text-center">
                    สำเนาถูกต้อง
                    <br />
                    ใช้สำหรับงานก่อสร้าง MYT เท่านั้น
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1 text-slate-600">
                <div>
                  <span className="font-semibold text-slate-700">ชื่อ:</span> {currentSub.name}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">เลขประจำตัวประชาชน:</span>{' '}
                  <span className="font-mono">{currentSub.idCardNumber}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">ที่อยู่:</span>{' '}
                  {currentSub.address}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={showAttachedIdCard}
                    onChange={(e) => setShowAttachedIdCard(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span>แนบรูปนี้ในใบเสร็จที่พิมพ์</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsViewingIdModal(false)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
