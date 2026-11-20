/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SevenElevenBranch } from '../../types/types.ts';
import {
  THAI_PROVINCES,
  detectProvinceFromText,
} from '../../utils/thaiProvincesWeather.ts';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal.tsx';
import { SignatureInput } from '../common/SignatureInput.tsx';
import {
  Store,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  FileCheck2,
  Search,
  Save,
  X,
} from 'lucide-react';

interface SevenElevenBranchListProps {
  branches: SevenElevenBranch[];
  onSaveBranch: (branch: SevenElevenBranch) => void;
  onDeleteBranch: (id: string) => void;
  onSelectBranchForInspection: (branch: SevenElevenBranch) => void;
}

export const SevenElevenBranchList: React.FC<SevenElevenBranchListProps> = ({
  branches,
  onSaveBranch,
  onDeleteBranch,
  onSelectBranchForInspection,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string>('');
  const [branchCode, setBranchCode] = useState<string>('');
  const [area, setArea] = useState<string>('BS');
  const [province, setProvince] = useState<string>('กรุงเทพมหานคร');
  const [contractorCompany, setContractorCompany] = useState<string>(
    'ไม้ยืนต้น คอนสตรัคชั่น'
  );
  const [defaultSupervisor, setDefaultSupervisor] = useState<string>(
    'ปรวิทย์ นวลนาค'
  );
  const [defaultSupervisorSignature, setDefaultSupervisorSignature] =
    useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [branchToDelete, setBranchToDelete] = useState<SevenElevenBranch | null>(
    null
  );
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setBranchName('');
    setBranchCode('');
    setArea('BS');
    setProvince('กรุงเทพมหานคร');
    setContractorCompany('ไม้ยืนต้น คอนสตรัคชั่น');
    setDefaultSupervisor('ปรวิทย์ นวลนาค');
    setDefaultSupervisorSignature('');
    setNotes('');
  };

  const handleEdit = (branch: SevenElevenBranch) => {
    setEditingId(branch.id);
    setBranchName(branch.branchName);
    setBranchCode(branch.branchCode);
    setArea(branch.area);
    setProvince(
      branch.province ||
        detectProvinceFromText(`${branch.branchName} ${branch.area}`)
    );
    setContractorCompany(branch.contractorCompany);
    setDefaultSupervisor(branch.defaultSupervisor);
    setDefaultSupervisorSignature(branch.defaultSupervisorSignature || '');
    setNotes(branch.notes || '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return;

    const newBranch: SevenElevenBranch = {
      id: editingId || `br711-${Date.now()}`,
      branchName: branchName.trim(),
      branchCode: branchCode.trim() || '-',
      area: area.trim() || 'BS',
      province: province || 'กรุงเทพมหานคร',
      contractorCompany:
        contractorCompany.trim() || 'ไม้ยืนต้น คอนสตรัคชั่น',
      defaultSupervisor: defaultSupervisor.trim() || 'ปรวิทย์ นวลนาค',
      defaultSupervisorSignature: defaultSupervisorSignature || undefined,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    onSaveBranch(newBranch);
    setBannerMessage(
      editingId
        ? `อัปเดตข้อมูลสาขา "${newBranch.branchName}" เรียบร้อยแล้ว`
        : `เพิ่มข้อมูลสาขา "${newBranch.branchName}" เข้าสู่ระบบ 7-11 เรียบร้อยแล้ว`
    );
    resetForm();
    setTimeout(() => setBannerMessage(null), 5000);
  };

  const filteredBranches = branches.filter((b) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      b.branchName.toLowerCase().includes(q) ||
      b.branchCode.toLowerCase().includes(q) ||
      b.area.toLowerCase().includes(q) ||
      (b.province || '').toLowerCase().includes(q) ||
      b.defaultSupervisor.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 mb-1">
            <Store className="w-3.5 h-3.5 mr-1" />
            4. เอกสาร 7-11 • เมนูย่อย 4.1
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            4.1 เพิ่มข้อมูลโครงการ (ฐานข้อมูลสาขา 7-11)
          </h2>
          <p className="text-sm text-slate-500">
            จัดการข้อมูล ชื่อสาขา, รหัสสาขา, พื้นที่ และชื่อ ผรม. สำหรับดึงไปใช้ในใบขออนุมัติตรวจสอบงานก่อสร้าง (4.2)
          </p>
        </div>

        <div className="text-xs font-semibold bg-slate-100 text-slate-700 px-3.5 py-2 rounded-xl">
          จำนวนสาขา 7-11 ทั้งหมด: <strong className="text-emerald-700">{branches.length}</strong> สาขา
        </div>
      </div>

      {/* Feedback Banner */}
      {bannerMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl flex items-center justify-between text-xs sm:text-sm font-semibold shadow-2xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{bannerMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Form to Add / Edit 7-11 Branch (5 cols) */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-base flex items-center">
              <Plus className="w-4 h-4 mr-1.5 text-emerald-600" />
              {editingId
                ? 'แก้ไขข้อมูลโครงการสาขา 7-11'
                : 'เพิ่มข้อมูลโครงการสาขา 7-11 ใหม่'}
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center"
              >
                <X className="w-3.5 h-3.5 mr-0.5" />
                ยกเลิกแก้ไข
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ชื่อสาขา <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={branchName}
              onChange={(e) => {
                const val = e.target.value;
                setBranchName(val);
                if (!editingId) {
                  setProvince(detectProvinceFromText(`${val} ${area}`));
                }
              }}
              placeholder="เช่น 7-11 สุขุมวิท66 จุด3 หรือ มาบยางพร (ระยอง)"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                รหัสสาขา <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={branchCode}
                onChange={(e) => setBranchCode(e.target.value)}
                placeholder="เช่น 24045"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                พื้นที่ (Area) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="เช่น BS, BN..."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                จังหวัด (พยากรณ์อากาศ)
              </label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs font-bold text-sky-900 bg-sky-50/40 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                {THAI_PROVINCES.map((p) => (
                  <option key={p.name} value={p.name}>
                    จ.{p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ชื่อ ผรม. บริษัท
            </label>
            <input
              type="text"
              value={contractorCompany}
              onChange={(e) => setContractorCompany(e.target.value)}
              placeholder="เช่น ไม้ยืนต้น คอนสตรัคชั่น"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              แสดงต่อท้ายคำว่า &ldquo;ชื่อผรม. บริษัท&rdquo; ในหัวกระดาษใบขออนุมัติ
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              หัวหน้างานผู้รับผิดชอบ (โฟร์แมน หรือ วิศวกร ผรม.) ค่าเริ่มต้น
            </label>
            <input
              type="text"
              value={defaultSupervisor}
              onChange={(e) => setDefaultSupervisor(e.target.value)}
              placeholder="เช่น ปรวิทย์ นวลนาค"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <SignatureInput
            value={defaultSupervisorSignature}
            onChange={setDefaultSupervisorSignature}
            signerName={defaultSupervisor}
            label="ลายเซ็น หัวหน้างานผู้รับผิดชอบ (ค่าเริ่มต้น)"
            helperText="ดึงไปแสดงเหนือวงเล็บ ผู้ขออนุมัติ ในใบขออนุมัติฯ (4.2) อัตโนมัติ"
          />

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              หมายเหตุเพิ่มเติม (ถ้ามี)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ระบุรายละเอียดสถานที่ หรือหมายเหตุสาขา..."
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>
              {editingId ? 'บันทึกการแก้ไขข้อมูลสาขา' : 'บันทึกข้อมูลโครงการ 7-11'}
            </span>
          </button>
        </form>

        {/* Right: Saved 7-11 Branches List (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                รายชื่อโครงการสาขา 7-11 ในระบบ
              </h3>
              <p className="text-xs text-slate-500">
                คลิกปุ่ม &ldquo;สร้างใบขออนุมัติ (4.2)&rdquo; เพื่อนำข้อมูลสาขาไปออกเอกสารทันที
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อสาขา, รหัสสาขา, พื้นที่..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {filteredBranches.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
              ยังไม่มีข้อมูลสาขา 7-11 ที่ตรงกับการค้นหา
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBranches.map((branch) => (
                <div
                  key={branch.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-emerald-400 bg-slate-50/40 hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm sm:text-base">
                        {branch.branchName}
                      </span>
                      <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                        รหัสสาขา: {branch.branchCode}
                      </span>
                      <span className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
                        พื้นที่: {branch.area}
                      </span>
                      <span className="text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded">
                        จ.{branch.province || detectProvinceFromText(branch.branchName)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>
                        ผรม. บริษัท:{' '}
                        <strong className="text-slate-800">
                          {branch.contractorCompany}
                        </strong>
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1.5">
                        <span>
                          หัวหน้างาน/วิศวกร:{' '}
                          <strong className="text-slate-800">
                            {branch.defaultSupervisor}
                          </strong>
                        </span>
                        {branch.defaultSupervisorSignature && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-emerald-200 rounded text-[10px] font-semibold text-emerald-700">
                            <img
                              src={branch.defaultSupervisorSignature}
                              alt="ลายเซ็น"
                              className="h-3.5 w-auto object-contain mix-blend-multiply"
                            />
                            <span>มีลายเซ็น</span>
                          </span>
                        )}
                      </span>
                    </div>
                    {branch.notes && (
                      <p className="text-[11px] text-slate-400">{branch.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onSelectBranchForInspection(branch)}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>สร้างใบขออนุมัติ (4.2)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEdit(branch)}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="แก้ไขข้อมูลสาขา"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setBranchToDelete(branch)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="ลบสาขา"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!branchToDelete}
        title="ยืนยันการลบข้อมูลสาขา 7-11"
        itemName={
          branchToDelete
            ? `${branchToDelete.branchName} (รหัสสาขา ${branchToDelete.branchCode})`
            : undefined
        }
        description="คุณต้องการลบข้อมูลสาขา 7-11 นี้ใช่หรือไม่?"
        confirmLabel="ลบข้อมูลสาขา"
        cancelLabel="ยกเลิก"
        onConfirm={() => {
          if (branchToDelete) {
            onDeleteBranch(branchToDelete.id);
            setBranchToDelete(null);
          }
        }}
        onCancel={() => setBranchToDelete(null)}
      />
    </div>
  );
};
