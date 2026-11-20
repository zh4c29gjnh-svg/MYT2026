/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Subcontractor } from '../../types/types.ts';
import {
  UserPlus,
  Search,
  Phone,
  CreditCard,
  MapPin,
  Briefcase,
  Edit2,
  Trash2,
  FileText,
  Image as ImageIcon,
  X,
  Camera,
  Crop,
} from 'lucide-react';
import { SubcontractorModal } from './SubcontractorModal.tsx';
import { IdCardScannerModal } from './IdCardScannerModal.tsx';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal.tsx';

interface SubcontractorListProps {
  subcontractors: Subcontractor[];
  onSaveSubcontractor: (subcontractor: Subcontractor) => void;
  onDeleteSubcontractor: (id: string) => void;
  onSelectForReceipt?: (subcontractor: Subcontractor) => void;
  initialEditSubcontractor?: Subcontractor | null;
  onClearInitialEdit?: () => void;
}

export const SubcontractorList: React.FC<SubcontractorListProps> = ({
  subcontractors,
  onSaveSubcontractor,
  onDeleteSubcontractor,
  onSelectForReceipt,
  initialEditSubcontractor,
  onClearInitialEdit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubcontractor, setEditingSubcontractor] = useState<Subcontractor | null>(null);
  const [viewingIdCardSub, setViewingIdCardSub] = useState<Subcontractor | null>(null);
  const [scanningIdCardSub, setScanningIdCardSub] = useState<{
    sub: Subcontractor;
    initialImage?: string;
  } | null>(null);
  const [subToDelete, setSubToDelete] = useState<Subcontractor | null>(null);

  React.useEffect(() => {
    if (initialEditSubcontractor) {
      setEditingSubcontractor(initialEditSubcontractor);
      setIsModalOpen(true);
      onClearInitialEdit?.();
    }
  }, [initialEditSubcontractor, onClearInitialEdit]);

  const filtered = subcontractors.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.idCardNumber.includes(searchTerm) ||
      s.skillType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (sub: Subcontractor) => {
    setEditingSubcontractor(sub);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingSubcontractor(null);
    setIsModalOpen(true);
  };

  const handleDelete = (sub: Subcontractor) => {
    setSubToDelete(sub);
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            1.1 ทะเบียนข้อมูลผู้รับเหมา (ผรม.)
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            จัดการข้อมูลผู้รับเหมา เลขประจำตัวประชาชน แนบรูปถ่ายสำเนาบัตร และบัญชีธนาคารสำหรับออกใบเสร็จ
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleAddNew}
            className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-all"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            เพิ่มข้อมูล ผรม. ใหม่
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="ค้นหาตามชื่อผู้รับเหมา, เลขบัตรประชาชน, หรือประเภทงาน..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
        />
      </div>

      {/* Subcontractors Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((sub) => (
          <div
            key={sub.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{sub.name}</h3>
                  <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md mt-1 w-fit font-medium">
                    <Briefcase className="w-3 h-3 mr-1" />
                    {sub.skillType}
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleEdit(sub)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="แก้ไขข้อมูล"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(sub)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="ลบข้อมูล"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ID Card */}
              <div className="text-xs text-slate-600 space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CreditCard className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                    <span className="font-mono font-medium text-slate-800">
                      {sub.idCardNumber || 'ไม่ได้ระบุเลขบัตร'}
                    </span>
                  </div>

                  {/* ID Card Photo badge/trigger */}
                  <div className="flex items-center gap-1">
                    {sub.idCardImage ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setViewingIdCardSub(sub)}
                          className="inline-flex items-center px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          <ImageIcon className="w-3 h-3 mr-1" />
                          ดูรูปบัตร
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setScanningIdCardSub({
                              sub,
                              initialImage: sub.idCardImage,
                            })
                          }
                          title="ตัดขอบบัตร / ถ่ายรูปบัตรประชาชนใหม่"
                          className="inline-flex items-center px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          <Crop className="w-3 h-3 mr-1" />
                          ตัดขอบบัตร
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setScanningIdCardSub({ sub })}
                        className="inline-flex items-center px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        <Camera className="w-3 h-3 mr-1" />
                        ถ่าย/แนบบัตร
                      </button>
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-center">
                  <Phone className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                  <span>{sub.phone || 'ไม่ได้ระบุเบอร์โทร'}</span>
                </div>

                {/* Address */}
                <div className="flex items-start">
                  <MapPin className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2 text-slate-500">
                    {sub.address || 'ไม่ได้ระบุที่อยู่'}
                  </span>
                </div>
              </div>

              {/* Bank Account */}
              {sub.bankAccount && (
                <div className="bg-slate-50 p-2 rounded-lg text-xs text-slate-700 flex justify-between items-center border border-slate-100">
                  <span className="text-slate-500">{sub.bankName}:</span>
                  <span className="font-mono font-medium">{sub.bankAccount}</span>
                </div>
              )}
            </div>

            {/* Quick Action to Create Receipt */}
            {onSelectForReceipt && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  onClick={() => onSelectForReceipt(sub)}
                  className="w-full inline-flex items-center justify-center px-3 py-2 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  ออกใบเสร็จรับเงินให้ ผรม. ท่านนี้
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-400 text-sm">ไม่พบข้อมูลผู้รับเหมาที่ค้นหา</p>
          <button
            onClick={handleAddNew}
            className="mt-3 text-blue-600 font-semibold text-sm hover:underline"
          >
            + เพิ่มข้อมูลผู้รับเหมาคนแรก
          </button>
        </div>
      )}

      {/* View ID Card Photo Modal */}
      {viewingIdCardSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden my-8">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                <h4 className="font-semibold text-sm">
                  สำเนาบัตรประจำตัวประชาชน - {viewingIdCardSub.name}
                </h4>
              </div>
              <button
                onClick={() => setViewingIdCardSub(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center p-2">
                {viewingIdCardSub.idCardImage ? (
                  <img
                    src={viewingIdCardSub.idCardImage}
                    alt={`บัตรประชาชน ${viewingIdCardSub.name}`}
                    className="max-h-72 w-auto object-contain rounded-lg"
                  />
                ) : (
                  <p className="text-xs text-slate-400 p-8">ไม่มีรูปถ่ายสำเนาบัตรประชาชน</p>
                )}
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
                  <span className="font-semibold text-slate-700">ชื่อ:</span> {viewingIdCardSub.name}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">เลขประจำตัวประชาชน:</span>{' '}
                  <span className="font-mono">{viewingIdCardSub.idCardNumber}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">ที่อยู่:</span>{' '}
                  {viewingIdCardSub.address}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const sub = viewingIdCardSub;
                      setViewingIdCardSub(null);
                      setScanningIdCardSub({
                        sub,
                        initialImage: sub.idCardImage,
                      });
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center cursor-pointer"
                  >
                    <Crop className="w-3.5 h-3.5 mr-1.5" />
                    ตัดขอบ / ดัดบัตรให้ได้สัดส่วน
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const sub = viewingIdCardSub;
                      setViewingIdCardSub(null);
                      setScanningIdCardSub({ sub });
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold inline-flex items-center cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 mr-1.5" />
                    ถ่ายบัตรใหม่
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setViewingIdCardSub(null)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick ID Card Scanner & Cropper Modal from Subcontractor List */}
      <IdCardScannerModal
        isOpen={!!scanningIdCardSub}
        onClose={() => setScanningIdCardSub(null)}
        initialImage={scanningIdCardSub?.initialImage}
        onConfirm={(croppedDataUrl) => {
          if (scanningIdCardSub) {
            onSaveSubcontractor({
              ...scanningIdCardSub.sub,
              idCardImage: croppedDataUrl,
            });
            setScanningIdCardSub(null);
          }
        }}
      />

      {/* Subcontractor Add/Edit Modal */}
      <SubcontractorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onSaveSubcontractor}
        initialData={editingSubcontractor}
      />

      {/* Confirm Delete In-App Modal */}
      <ConfirmDeleteModal
        isOpen={!!subToDelete}
        title="ยืนยันการลบข้อมูลผู้รับเหมา"
        itemName={subToDelete ? `${subToDelete.name} (${subToDelete.skillType})` : undefined}
        description="คุณต้องการลบข้อมูลผู้รับเหมานี้ออกจากระบบใช่หรือไม่? ข้อมูลประวัติและเอกสารที่เกี่ยวข้องอาจได้รับผลกระทบ"
        confirmLabel="ลบข้อมูลผู้รับเหมา"
        cancelLabel="ยกเลิก"
        onConfirm={() => {
          if (subToDelete) {
            onDeleteSubcontractor(subToDelete.id);
            setSubToDelete(null);
          }
        }}
        onCancel={() => setSubToDelete(null)}
      />
    </div>
  );
};
