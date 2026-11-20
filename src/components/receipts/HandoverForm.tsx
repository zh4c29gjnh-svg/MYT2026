/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { HandoverDocument as HandoverDocType, Subcontractor, Project, HandoverItem } from '../../types/types.ts';
import { formatBahtText } from '../../utils/bahtText.ts';
import { HandoverDocument } from './HandoverDocument.tsx';
import { DocumentActionButtons } from './DocumentActionButtons.tsx';
import { DocumentZoomContainer } from '../common/DocumentZoomContainer.tsx';
import {
  ClipboardCheck,
  Building,
  RotateCcw,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface HandoverFormProps {
  subcontractors: Subcontractor[];
  projects: Project[];
  onSaveHandover: (doc: HandoverDocType) => void;
  onSaveSubcontractor?: (subcontractor: Subcontractor) => void;
  initialDoc?: HandoverDocType | null;
  onClearEditDoc?: () => void;
}

function padHandoverItems(rawItems?: HandoverItem[]): HandoverItem[] {
  const base = rawItems && rawItems.length > 0 ? [...rawItems] : [];
  const padded: HandoverItem[] = [];
  for (let i = 0; i < 5; i++) {
    if (base[i]) {
      padded.push({ ...base[i] });
    } else {
      padded.push({
        id: `itm-${i + 1}`,
        description: '',
        unitPrice: 0,
        totalPrice: 0,
      });
    }
  }
  return padded;
}

export const HandoverForm: React.FC<HandoverFormProps> = ({
  subcontractors,
  projects,
  onSaveHandover,
  initialDoc,
  onClearEditDoc,
}) => {
  const [docDate, setDocDate] = useState<string>(
    initialDoc?.date || new Date().toISOString().split('T')[0]
  );
  const [subject] = useState<string>(initialDoc?.subject || 'ขอส่งมอบงาน');
  const [toRecipient] = useState<string>(initialDoc?.toRecipient || 'กรรมการผู้จัดการ');

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialDoc?.projectId || (projects[0]?.id || '')
  );
  const [projectName, setProjectName] = useState<string>(
    initialDoc?.projectName || (projects[0]?.name || '7-11 ลาดกระบัง (สนามชัยเขต)')
  );
  const [poNumber, setPoNumber] = useState<string>(
    initialDoc?.poNumber || (projects[0]?.code || '2606-045')
  );
  const [poDate, setPoDate] = useState<string>(initialDoc?.poDate || '2026-11-10');
  const [completionDate, setCompletionDate] = useState<string>(
    initialDoc?.completionDate || '2026-11-10'
  );
  const [periodNumber, setPeriodNumber] = useState<number>(initialDoc?.periodNumber || 1);

  const [selectedSubId, setSelectedSubId] = useState<string>(
    initialDoc?.subcontractorId || (subcontractors[0]?.id || '')
  );
  const [subName, setSubName] = useState<string>(
    initialDoc?.subcontractorName || (subcontractors[0]?.name || 'นายสมคิด ช่างก่อสร้าง')
  );
  const [contractWorkType, setContractWorkType] = useState<string>(
    initialDoc?.contractWorkType || 'งานจ้างเหมาเฉพาะค่าแรงงานโครงสร้าง'
  );

  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const [items, setItems] = useState<HandoverItem[]>(
    initialDoc?.items
      ? padHandoverItems(initialDoc.items)
      : [
          {
            id: 'itm-1',
            description: 'งวดที่ 1 งานโครงสร้างเทท็อปปิ้งแล้วเสร็จ',
            unitPrice: 51546.39,
            totalPrice: 51546.39,
          },
          {
            id: 'itm-2',
            description: '',
            unitPrice: 0,
            totalPrice: 0,
          },
          {
            id: 'itm-3',
            description: '',
            unitPrice: 0,
            totalPrice: 0,
          },
          {
            id: 'itm-4',
            description: '',
            unitPrice: 0,
            totalPrice: 0,
          },
          {
            id: 'itm-5',
            description: '',
            unitPrice: 0,
            totalPrice: 0,
          },
        ]
  );

  const [supervisorName, setSupervisorName] = useState<string>(
    initialDoc?.supervisorName || 'นายปรวิทย์ นวลนาค'
  );
  const [engineerName, setEngineerName] = useState<string>(
    initialDoc?.engineerName || 'วิศวกรโครงการ'
  );
  const [approverName, setApproverName] = useState<string>(
    initialDoc?.approverName || 'ผู้อนุมัติ'
  );

  // Sync Project dropdown selection manually
  const handleSelectProjectDropdown = (projId: string) => {
    setSelectedProjectId(projId);
    const p = projects.find((proj) => proj.id === projId);
    if (p) {
      setProjectName(p.name);
      setPoNumber(p.code);
      if (p.supervisorName) {
        setSupervisorName(p.supervisorName);
      }
    }
  };

  // Sync Subcontractor dropdown selection manually
  const handleSelectSubcontractorDropdown = (subId: string) => {
    setSelectedSubId(subId);
    const s = subcontractors.find((sub) => sub.id === subId);
    if (s) {
      setSubName(s.name);
      if (s.skillType && !initialDoc) {
        setContractWorkType(s.skillType);
      }
    }
  };

  // Sync when initialDoc is loaded from 1.6 Archive for editing
  useEffect(() => {
    if (initialDoc) {
      setDocDate(initialDoc.date);
      setSelectedProjectId(initialDoc.projectId || '');
      setProjectName(initialDoc.projectName);
      setPoNumber(initialDoc.poNumber);
      setPoDate(initialDoc.poDate);
      setCompletionDate(initialDoc.completionDate);
      setPeriodNumber(initialDoc.periodNumber);
      setSelectedSubId(initialDoc.subcontractorId || '');
      setSubName(initialDoc.subcontractorName);
      setContractWorkType(initialDoc.contractWorkType);
      setItems(padHandoverItems(initialDoc.items));
      setSupervisorName(initialDoc.supervisorName || 'นายปรวิทย์ นวลนาค');
      setEngineerName(initialDoc.engineerName || 'วิศวกรโครงการ');
      setApproverName(initialDoc.approverName || 'ผู้อนุมัติ');
    }
  }, [initialDoc]);

  const handleItemChange = (index: number, field: keyof HandoverItem, value: any) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: value };
    if (field === 'unitPrice') {
      const num = parseFloat(value) || 0;
      current.unitPrice = num;
      current.totalPrice = num;
    }
    updated[index] = current;
    setItems(updated);
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const totalAmountThaiText = formatBahtText(totalAmount);

  const currentDoc: HandoverDocType = {
    id: initialDoc?.id || `hod-${Date.now()}`,
    docNumber: initialDoc?.docNumber || `HOD-2569-${Math.floor(100 + Math.random() * 900)}`,
    date: docDate,
    subject,
    toRecipient,
    subcontractorId: selectedSubId,
    subcontractorName: subName,
    contractWorkType,
    projectId: selectedProjectId,
    projectName,
    poNumber,
    poDate,
    completionDate,
    periodNumber,
    items: items.filter((i) => i.description || i.totalPrice > 0),
    totalAmount,
    totalAmountThaiText,
    supervisorName,
    supervisorCompany: 'บริษัท ไม้ยืนต้นคอนสตรัคชั่น จำกัด',
    supervisorConfirmedDate: completionDate,
    engineerName,
    approverName,
    createdAt: initialDoc?.createdAt || new Date().toISOString(),
  };

  const handleSave = () => {
    onSaveHandover(currentDoc);
    setSaveSuccessMessage(
      initialDoc
        ? `บันทึกแก้ไขทับหนังสือส่งมอบงานเลขที่ ${currentDoc.docNumber} เรียบร้อยแล้ว!`
        : 'บันทึกหนังสือส่งมอบงานเข้าคลังเอกสารเรียบร้อยแล้ว!'
    );
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  const resetSample = () => {
    onClearEditDoc?.();
    setDocDate('2026-11-10');
    setPoDate('2026-11-10');
    setCompletionDate('2026-11-10');
    setPeriodNumber(1);
    setPoNumber('2606-045');
    setProjectName('7-11 ลาดกระบัง (สนามชัยเขต)');
    setContractWorkType('งานจ้างเหมาเฉพาะค่าแรงงานโครงสร้าง');
    setItems([
      {
        id: 'itm-1',
        description: 'งวดที่ 1 งานโครงสร้างเทท็อปปิ้งแล้วเสร็จ',
        unitPrice: 51546.39,
        totalPrice: 51546.39,
      },
      { id: 'itm-2', description: '', unitPrice: 0, totalPrice: 0 },
      { id: 'itm-3', description: '', unitPrice: 0, totalPrice: 0 },
      { id: 'itm-4', description: '', unitPrice: 0, totalPrice: 0 },
      { id: 'itm-5', description: '', unitPrice: 0, totalPrice: 0 },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Editing Mode Indicator Banner */}
      {initialDoc && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5 text-amber-950 text-xs sm:text-sm">
            <ClipboardCheck className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">
                โหมดแก้ไขหนังสือส่งมอบงานเดิม: เลขที่ {initialDoc.docNumber}
              </span>{' '}
              <span>
                ({initialDoc.projectName} · งวดที่ {initialDoc.periodNumber}) — เมื่อกด &ldquo;บันทึกเข้าระบบ&rdquo; ระบบจะบันทึกทับใบเดิมโดยใช้เลขที่เอกสารเดิม
              </span>
            </div>
          </div>
          {onClearEditDoc && (
            <button
              type="button"
              onClick={onClearEditDoc}
              className="px-3 py-1.5 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap self-end sm:self-center cursor-pointer"
            >
              + ออกใบส่งมอบงานใบใหม่แทน
            </button>
          )}
        </div>
      )}

      {/* Title */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 mb-1">
            <ClipboardCheck className="w-3.5 h-3.5 mr-1" />
            แบบฟอร์มเอกสารขอส่งมอบงาน
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            1.4 หนังสือส่งมอบงาน (ผู้รับเหมา)
          </h2>
          <p className="text-sm text-slate-500">
            เอกสารส่งมอบงานรายงวด พร้อมระบบรับรองของผู้ควบคุมงานและวิศวกรโครงการ
          </p>
        </div>

        <button
          type="button"
          onClick={resetSample}
          className="inline-flex items-center px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          โหลดตัวอย่าง 7-11 ลาดกระบัง
        </button>
      </div>

      {saveSuccessMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center text-emerald-800 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
          {saveSuccessMessage}
        </div>
      )}

      {/* Action Toolbar */}
      <DocumentActionButtons
        elementId="handover-document-view"
        documentTitle={`หนังสือส่งมอบงาน_${projectName}_งวด${periodNumber}`}
        fileName={`หนังสือส่งมอบงาน_${projectName.replace(/\s+/g, '_')}_งวด${periodNumber}`}
        onSaveToSystem={handleSave}
        documentData={currentDoc}
      />

      {/* Grid View */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Form: 5 cols */}
        <div className="xl:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-base flex items-center">
              <ClipboardCheck className="w-4 h-4 mr-2 text-emerald-600" />
              ข้อมูลการส่งมอบงาน
            </h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-mono">
              {currentDoc.docNumber}
            </span>
          </div>

          {/* Project & PO Selection */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เลือกโครงการ (2.1)
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => handleSelectProjectDropdown(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  เลขที่ใบสั่งซื้อ (PO)
                </label>
                <input
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-mono"
                  placeholder="2606-045"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  ลงวันที่ใน PO
                </label>
                <input
                  type="date"
                  value={poDate}
                  onChange={(e) => setPoDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          {/* Subcontractor Selection */}
          <div className="border-t border-slate-100 pt-3 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ผู้รับจ้าง / ผู้รับเหมา (1.1)
              </label>
              <select
                value={selectedSubId}
                onChange={(e) => handleSelectSubcontractorDropdown(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              >
                {subcontractors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} - {s.skillType}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                ลักษณะงานที่รับเหมา
              </label>
              <input
                type="text"
                value={contractWorkType}
                onChange={(e) => setContractWorkType(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                placeholder="งานจ้างเหมาเฉพาะค่าแรงงานโครงสร้าง"
              />
            </div>
          </div>

          {/* Handover Specifics */}
          <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                วันที่ส่งมอบ
              </label>
              <input
                type="date"
                value={docDate}
                onChange={(e) => setDocDate(e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                แล้วเสร็จวันที่
              </label>
              <input
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                ส่งมอบงานงวดที่
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={periodNumber}
                onChange={(e) => setPeriodNumber(parseInt(e.target.value) || 1)}
                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-center font-bold"
              />
            </div>
          </div>

          {/* Items 1 to 5 Editor */}
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              รายการที่ส่งมอบ (สูงสุด 5 แถวตามแบบฟอร์มมาตรฐาน)
            </label>
            {items.map((item, index) => (
              <div
                key={item.id}
                className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">รายการที่ {index + 1}</span>
                  {item.totalPrice > 0 && (
                    <span className="text-emerald-700 font-semibold">
                      {item.totalPrice.toLocaleString()} บาท
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder={`คำอธิบายรายการ เช่น งวดที่ ${index + 1} งานโครงสร้างเทท็อปปิ้ง`}
                  value={item.description}
                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                />
                <div className="flex items-center justify-end space-x-2">
                  <span className="text-slate-500">จำนวน/ราคาต่อหน่วย:</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={item.unitPrice || ''}
                    onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                    className="w-32 px-2 py-1 border border-slate-300 rounded-lg text-right font-medium bg-white"
                  />
                  <span className="text-slate-500">บาท</span>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1">
            <div className="flex justify-between items-center text-sm font-bold text-emerald-900">
              <span>รวมยอดเงินที่ขอเบิกจ่าย:</span>
              <span className="text-base text-emerald-700">
                {totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
              </span>
            </div>
            <div className="text-emerald-800 font-medium pt-1 flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              <span>( {totalAmountThaiText} )</span>
            </div>
          </div>

          {/* Supervisors & Signatures */}
          <div className="border-t border-slate-100 pt-3 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
              <Building className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              ผู้ควบคุมงานและผู้อนุมัติ
            </h4>
            <div className="text-xs">
              <label className="text-slate-600 block mb-0.5">ผู้ควบคุมงาน ณ หน่วยงาน</label>
              <input
                type="text"
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-slate-600 block mb-0.5">วิศวกรโครงการ</label>
                <input
                  type="text"
                  value={engineerName}
                  onChange={(e) => setEngineerName(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-0.5">ผู้อนุมัติ</label>
                <input
                  type="text"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview: 7 cols with Zoom Controls */}
        <div className="xl:col-span-7">
          <DocumentZoomContainer
            defaultZoom={85}
            title="ตัวอย่างหนังสือส่งมอบงาน (ผู้รับเหมา) A4"
            badge="พร้อมส่งมอบ & พิมพ์"
          >
            <HandoverDocument
              document={currentDoc}
              containerId="handover-document-view"
            />
          </DocumentZoomContainer>
        </div>
      </div>
    </div>
  );
};
