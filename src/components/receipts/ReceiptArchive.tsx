/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Receipt, HandoverDocument as HandoverDocType, Subcontractor, Project } from '../../types/types.ts';
import { formatCurrency, formatThaiDate } from '../../utils/bahtText.ts';
import {
  CloudUpload,
  Search,
  Filter,
  FileText,
  ClipboardCheck,
  Eye,
  Edit2,
  Trash2,
  Table,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Download,
  UserCheck,
} from 'lucide-react';
import { ReceiptDocument } from './ReceiptDocument.tsx';
import { HandoverDocument } from './HandoverDocument.tsx';
import { DocumentActionButtons } from './DocumentActionButtons.tsx';
import { DocumentZoomContainer } from '../common/DocumentZoomContainer.tsx';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal.tsx';
import { uploadToGoogleDrive, exportToGoogleSheets } from '../../services/googleWorkspace.ts';
import { getAccessToken, googleSignIn } from '../../services/googleAuth.ts';
import confetti from 'canvas-confetti';

interface ReceiptArchiveProps {
  receipts: Receipt[];
  handovers: HandoverDocType[];
  subcontractors: Subcontractor[];
  projects: Project[];
  onDeleteReceipt: (id: string) => void;
  onDeleteHandover: (id: string) => void;
  onEditReceipt?: (receipt: Receipt) => void;
  onEditHandover?: (handover: HandoverDocType) => void;
  onEditSubcontractor?: (subcontractor: Subcontractor) => void;
}

export const ReceiptArchive: React.FC<ReceiptArchiveProps> = ({
  receipts,
  handovers,
  subcontractors,
  projects,
  onDeleteReceipt,
  onDeleteHandover,
  onEditReceipt,
  onEditHandover,
  onEditSubcontractor,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'receipt' | 'handover' | 'subcontractor'>('all');
  const [selectedSubFilter, setSelectedSubFilter] = useState<string>('all');
  
  const [viewingReceipt, setViewingReceipt] = useState<Receipt | null>(null);
  const [viewingHandover, setViewingHandover] = useState<HandoverDocType | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'receipt' | 'handover'; name: string } | null>(null);

  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [driveUrl, setDriveUrl] = useState<string | null>(null);
  const [sheetsUrl, setSheetsUrl] = useState<string | null>(null);

  // Combine items for uniform table view
  const receiptItems = receipts.map((r) => ({
    id: r.id,
    type: 'receipt' as const,
    docNumber: r.receiptNumber,
    date: r.date,
    subcontractorName: r.subcontractorName,
    title: r.paymentFor,
    amount: r.netPayable,
    grossAmount: r.amount,
    tag:
      r.type === 'tax_0'
        ? 'หัก 0%'
        : r.type === 'tax_3'
        ? 'หัก 3%'
        : 'หัก 3% + Retention 5%',
    tagColor:
      r.type === 'tax_0'
        ? 'bg-slate-100 text-slate-700'
        : r.type === 'tax_3'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-amber-100 text-amber-800',
    raw: r,
  }));

  const handoverItems = handovers.map((h) => ({
    id: h.id,
    type: 'handover' as const,
    docNumber: h.docNumber,
    date: h.date,
    subcontractorName: h.subcontractorName,
    title: `${h.projectName} - งวดที่ ${h.periodNumber}`,
    amount: h.totalAmount,
    grossAmount: h.totalAmount,
    tag: 'ใบส่งมอบงาน',
    tagColor: 'bg-emerald-100 text-emerald-800',
    raw: h,
  }));

  const allDocuments = [...receiptItems, ...handoverItems].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const filtered = allDocuments.filter((doc) => {
    if (typeFilter !== 'all' && doc.type !== typeFilter) return false;
    if (selectedSubFilter !== 'all' && doc.subcontractorName !== selectedSubFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        doc.docNumber.toLowerCase().includes(q) ||
        doc.subcontractorName.toLowerCase().includes(q) ||
        doc.title.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Backup all to Google Drive
  const handleBackupAllToGoogleDrive = async () => {
    setIsSyncingDrive(true);
    setSyncStatus(null);
    setDriveUrl(null);

    try {
      let token = await getAccessToken();
      if (!token) {
        try {
          const authRes = await googleSignIn();
          if (!authRes) {
            setSyncStatus('กรุณาลงชื่อเข้าใช้ Google เพื่อสำรองข้อมูลเข้า Google Drive');
            setIsSyncingDrive(false);
            return;
          }
        } catch (authErr: any) {
          setSyncStatus(authErr.message || 'หน้าต่างลงชื่อเข้าใช้ถูกปิด กรุณาลองใหม่อีกครั้ง');
          setIsSyncingDrive(false);
          return;
        }
      }

      const payload = {
        exportedAt: new Date().toISOString(),
        appName: 'MYT Construction Management',
        summary: {
          totalReceipts: receipts.length,
          totalHandovers: handovers.length,
          totalSubcontractors: subcontractors.length,
        },
        subcontractors,
        receipts,
        handovers,
      };

      const dateStr = new Date().toISOString().split('T')[0];
      const res = await uploadToGoogleDrive(
        `MYT_Archive_Backup_${dateStr}.json`,
        JSON.stringify(payload, null, 2),
        'application/json'
      );

      if (res) {
        setDriveUrl(res.webViewLink || null);
        confetti({ particleCount: 50, spread: 80 });
        setSyncStatus(`สำรองข้อมูลเข้า Google Drive สำเร็จ! (${res.name})`);
      }
    } catch (err: any) {
      console.error(err);
      setSyncStatus(`ข้อผิดพลาด: ${err?.message || err}`);
    } finally {
      setIsSyncingDrive(false);
    }
  };

  // Export Table to Google Sheets
  const handleExportToGoogleSheets = async () => {
    setIsSyncingSheets(true);
    setSyncStatus(null);
    setSheetsUrl(null);

    try {
      let token = await getAccessToken();
      if (!token) {
        try {
          const authRes = await googleSignIn();
          if (!authRes) {
            setSyncStatus('กรุณาลงชื่อเข้าใช้ Google เพื่อส่งออก Google Sheets');
            setIsSyncingSheets(false);
            return;
          }
        } catch (authErr: any) {
          setSyncStatus(authErr.message || 'หน้าต่างลงชื่อเข้าใช้ถูกปิด กรุณาลองใหม่อีกครั้ง');
          setIsSyncingSheets(false);
          return;
        }
      }

      const headerRow = [
        'ลำดับ',
        'ประเภทเอกสาร',
        'เลขที่เอกสาร',
        'วันที่ (พ.ศ.)',
        'ผู้รับเหมา/ผู้รับจ้าง',
        'รายการ/โครงการ',
        'ยอดเงินรวม (บาท)',
        'ยอดจ่ายสุทธิ (บาท)',
      ];

      const dataRows = filtered.map((item, idx) => {
        const thaiDate = formatThaiDate(item.date).fullText;
        return [
          idx + 1,
          item.tag,
          item.docNumber,
          thaiDate,
          item.subcontractorName,
          item.title,
          item.grossAmount,
          item.amount,
        ];
      });

      const today = new Date().toLocaleDateString('th-TH');
      const res = await exportToGoogleSheets(
        `MYT_คลังใบเสร็จและใบส่งมอบงาน_${today}`,
        headerRow,
        dataRows
      );

      if (res) {
        setSheetsUrl(res.spreadsheetUrl);
        confetti({ particleCount: 40, spread: 70 });
        setSyncStatus('ส่งออกข้อมูลไปยัง Google Sheets สำเร็จเรียบร้อยแล้ว!');
      }
    } catch (err: any) {
      console.error(err);
      setSyncStatus(`ข้อผิดพลาด Sheets: ${err?.message || err}`);
    } finally {
      setIsSyncingSheets(false);
    }
  };

  // Download local JSON file
  const handleDownloadLocalBackup = () => {
    const backupData = {
      subcontractors,
      receipts,
      handovers,
      projects,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MYT_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header and Drive Sync Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 mb-1">
            <CloudUpload className="w-3.5 h-3.5 mr-1 text-amber-600" />
            ระบบคลังข้อมูลและสำรองเข้า Google Drive
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            1.6 คลังข้อมูล ผรม. และใบเสร็จรับเงิน
          </h2>
          <p className="text-sm text-slate-500">
            รวมประวัติเอกสารทั้งหมด ค้นหา พิมพ์ย้อนหลัง และสำรองข้อมูลขึ้นระบบ Google Drive & Sheets
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sync to Drive */}
          <button
            onClick={handleBackupAllToGoogleDrive}
            disabled={isSyncingDrive}
            className="inline-flex items-center px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            {isSyncingDrive ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CloudUpload className="w-4 h-4 mr-2" />
            )}
            บันทึกเข้า Google Drive
          </button>

          {/* Export to Sheets */}
          <button
            onClick={handleExportToGoogleSheets}
            disabled={isSyncingSheets}
            className="inline-flex items-center px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            {isSyncingSheets ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Table className="w-4 h-4 mr-2" />
            )}
            ส่งออก Google Sheets
          </button>

          {/* Local Download */}
          <button
            onClick={handleDownloadLocalBackup}
            className="inline-flex items-center px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-medium transition-colors"
            title="ดาวน์โหลดไฟล์สำรองข้อมูล JSON ลงเครื่อง"
          >
            <Download className="w-4 h-4 mr-1.5" />
            สำรอง JSON
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatus && (
        <div className="p-3.5 rounded-xl bg-slate-900 text-white text-xs sm:text-sm font-medium flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncStatus}</span>
          </div>
          <div className="flex items-center space-x-3">
            {driveUrl && (
              <a
                href={driveUrl}
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:underline inline-flex items-center"
              >
                ดูใน Drive
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </a>
            )}
            {sheetsUrl && (
              <a
                href={sheetsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline inline-flex items-center"
              >
                เปิด Spreadsheet
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาเลขที่เอกสาร, ชื่อผู้รับเหมา, หรือรายละเอียด..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                typeFilter === 'all' ? 'bg-white shadow-xs text-slate-900 font-semibold' : 'text-slate-600'
              }`}
            >
              ทั้งหมด ({allDocuments.length})
            </button>
            <button
              onClick={() => setTypeFilter('receipt')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                typeFilter === 'receipt' ? 'bg-white shadow-xs text-slate-900 font-semibold' : 'text-slate-600'
              }`}
            >
              ใบเสร็จ ({receiptItems.length})
            </button>
            <button
              onClick={() => setTypeFilter('handover')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                typeFilter === 'handover' ? 'bg-white shadow-xs text-slate-900 font-semibold' : 'text-slate-600'
              }`}
            >
              ใบส่งมอบงาน ({handoverItems.length})
            </button>
            <button
              onClick={() => setTypeFilter('subcontractor')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                typeFilter === 'subcontractor' ? 'bg-white shadow-xs text-slate-900 font-semibold' : 'text-slate-600'
              }`}
            >
              ข้อมูล ผรม. ({subcontractors.length})
            </button>
          </div>

          <select
            value={selectedSubFilter}
            onChange={(e) => setSelectedSubFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700"
          >
            <option value="all">ผรม. ทั้งหมด</option>
            {subcontractors.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Subcontractor Directory Table when typeFilter === 'subcontractor' */}
      {typeFilter === 'subcontractor' ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="p-3.5 pl-5">ชื่อผู้รับเหมา (ผรม.)</th>
                  <th className="p-3.5">ประเภทงาน / ความชำนาญ</th>
                  <th className="p-3.5">เลขบัตรประชาชน</th>
                  <th className="p-3.5">เบอร์โทรศัพท์</th>
                  <th className="p-3.5">ที่อยู่</th>
                  <th className="p-3.5 text-center pr-5">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subcontractors
                  .filter((sub) => {
                    if (selectedSubFilter !== 'all' && sub.name !== selectedSubFilter) {
                      return false;
                    }
                    if (searchTerm) {
                      const q = searchTerm.toLowerCase();
                      return (
                        sub.name.toLowerCase().includes(q) ||
                        sub.skillType.toLowerCase().includes(q) ||
                        sub.idCardNumber.toLowerCase().includes(q)
                      );
                    }
                    return true;
                  })
                  .map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 pl-5 font-bold text-slate-900">{sub.name}</td>
                      <td className="p-3.5 text-slate-700">{sub.skillType}</td>
                      <td className="p-3.5 font-mono text-slate-700">{sub.idCardNumber || '-'}</td>
                      <td className="p-3.5 text-slate-600">{sub.phone || '-'}</td>
                      <td className="p-3.5 text-slate-600 max-w-xs truncate" title={sub.address}>
                        {sub.address || '-'}
                      </td>
                      <td className="p-3.5 pr-5 text-center">
                        {onEditSubcontractor && (
                          <button
                            type="button"
                            onClick={() => onEditSubcontractor(sub)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            title="เรียกข้อมูล ผรม. ไปแก้ไขที่หน้า 1.1"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>เรียกไปแก้ไข (1.1)</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Documents Table */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="p-3.5 pl-5">ประเภท</th>
                  <th className="p-3.5">เลขที่เอกสาร</th>
                  <th className="p-3.5">วันที่</th>
                  <th className="p-3.5">ผู้รับเหมา / ผู้รับเงิน</th>
                  <th className="p-3.5">รายการชำระ / โครงการ</th>
                  <th className="p-3.5 text-right">ยอดสุทธิ (บาท)</th>
                  <th className="p-3.5 text-center pr-5">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => {
                  const thaiDate = formatThaiDate(item.date).fullText;
                  const matchedSub = subcontractors.find(
                    (s) =>
                      s.id === (item.raw as any).subcontractorId ||
                      s.name === item.subcontractorName
                  );
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 pl-5">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${item.tagColor}`}>
                          {item.tag}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-900">{item.docNumber}</td>
                      <td className="p-3.5 text-slate-600">{thaiDate}</td>
                      <td className="p-3.5 font-medium text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{item.subcontractorName}</span>
                          {matchedSub && onEditSubcontractor && (
                            <button
                              type="button"
                              onClick={() => onEditSubcontractor(matchedSub)}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title={`แก้ไขข้อมูล ผรม. (${matchedSub.name}) ในหน้า 1.1`}
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600 max-w-xs truncate" title={item.title}>
                        {item.title}
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-900">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="p-3.5 pr-5 text-center">
                        <div className="inline-flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (item.type === 'receipt') {
                                onEditReceipt?.(item.raw as Receipt);
                              } else {
                                onEditHandover?.(item.raw as HandoverDocType);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            title={
                              item.type === 'receipt'
                                ? 'เรียกใบเสร็จไปแก้ไขที่หน้าฟอร์ม (บันทึกทับใบเดิม)'
                                : 'เรียกหนังสือส่งมอบงานไปแก้ไขที่หน้าฟอร์ม (บันทึกทับใบเดิม)'
                            }
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>แก้ไข</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (item.type === 'receipt') {
                                setViewingReceipt(item.raw as Receipt);
                              } else {
                                setViewingHandover(item.raw as HandoverDocType);
                              }
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="ดูตัวอย่างเอกสาร A4 / พิมพ์ / ดาวน์โหลด"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setItemToDelete({
                                id: item.id,
                                type: item.type,
                                name: `${item.type === 'receipt' ? 'ใบเสร็จรับเงิน' : 'หนังสือส่งมอบงาน'} ${item.docNumber} (${item.subcontractorName})`,
                              });
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="ลบเอกสาร"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p>ไม่พบเอกสารตามเงื่อนไขที่ค้นหา</p>
            </div>
          )}
        </div>
      )}

      {/* Receipt Viewer Modal */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-6">
            <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold">
                  ใบเสร็จรับเงิน {viewingReceipt.receiptNumber} - {viewingReceipt.subcontractorName}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {onEditReceipt && (
                  <button
                    type="button"
                    onClick={() => {
                      const rec = viewingReceipt;
                      setViewingReceipt(null);
                      onEditReceipt(rec);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>เรียกไปแก้ไขในหน้าฟอร์ม</span>
                  </button>
                )}
                <button
                  onClick={() => setViewingReceipt(null)}
                  className="text-slate-400 hover:text-white px-2 py-1 text-sm font-medium cursor-pointer"
                >
                  ✕ ปิดหน้าต่าง
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <DocumentActionButtons
                elementId="modal-receipt-print"
                documentTitle={`ใบเสร็จ_${viewingReceipt.subcontractorName}`}
                fileName={`ใบเสร็จ_${viewingReceipt.receiptNumber}`}
                documentData={viewingReceipt}
              />
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100 flex justify-center">
              <DocumentZoomContainer
                defaultZoom={85}
                title={`ใบเสร็จรับเงิน ${viewingReceipt.receiptNumber}`}
                badge="ตรวจสอบเอกสาร"
                containerClassName="w-full"
              >
                <ReceiptDocument
                  receipt={viewingReceipt}
                  containerId="modal-receipt-print"
                  idCardImage={
                    subcontractors.find(
                      (s) =>
                        s.id === viewingReceipt.subcontractorId ||
                        s.name === viewingReceipt.subcontractorName ||
                        s.idCardNumber === viewingReceipt.subcontractorIdCard
                    )?.idCardImage
                  }
                />
              </DocumentZoomContainer>
            </div>
          </div>
        </div>
      )}

      {/* Handover Viewer Modal */}
      {viewingHandover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-6">
            <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <ClipboardCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold">
                  หนังสือส่งมอบงาน {viewingHandover.docNumber} - {viewingHandover.projectName}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {onEditHandover && (
                  <button
                    type="button"
                    onClick={() => {
                      const doc = viewingHandover;
                      setViewingHandover(null);
                      onEditHandover(doc);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>เรียกไปแก้ไขในหน้าฟอร์ม</span>
                  </button>
                )}
                <button
                  onClick={() => setViewingHandover(null)}
                  className="text-slate-400 hover:text-white px-2 py-1 text-sm font-medium cursor-pointer"
                >
                  ✕ ปิดหน้าต่าง
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <DocumentActionButtons
                elementId="modal-handover-print"
                documentTitle={`หนังสือส่งมอบงาน_${viewingHandover.projectName}`}
                fileName={`ส่งมอบงาน_${viewingHandover.docNumber}`}
                documentData={viewingHandover}
              />
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100 flex justify-center">
              <DocumentZoomContainer
                defaultZoom={85}
                title={`หนังสือส่งมอบงาน ${viewingHandover.docNumber}`}
                badge="ตรวจสอบเอกสาร"
                containerClassName="w-full"
              >
                <HandoverDocument
                  document={viewingHandover}
                  containerId="modal-handover-print"
                />
              </DocumentZoomContainer>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete In-App Modal */}
      <ConfirmDeleteModal
        isOpen={!!itemToDelete}
        title="ยืนยันการลบเอกสาร"
        itemName={itemToDelete?.name}
        description="คุณต้องการลบเอกสารนี้ออกจากคลังข้อมูลใช่หรือไม่? เมื่อลบแล้วจะไม่สามารถกู้คืนได้"
        confirmLabel="ลบเอกสารนี้"
        cancelLabel="ยกเลิก"
        onConfirm={() => {
          if (itemToDelete) {
            if (itemToDelete.type === 'receipt') {
              onDeleteReceipt(itemToDelete.id);
            } else {
              onDeleteHandover(itemToDelete.id);
            }
            setItemToDelete(null);
          }
        }}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
};
