/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Subcontractor } from '../../types/types.ts';
import {
  X,
  UserCheck,
  Upload,
  Trash2,
  CreditCard,
  Camera,
  Crop,
  Sparkles,
} from 'lucide-react';
import { IdCardScannerModal } from './IdCardScannerModal.tsx';

interface SubcontractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subcontractor: Subcontractor) => void;
  initialData?: Subcontractor | null;
}

export const SubcontractorModal: React.FC<SubcontractorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [formData, setFormData] = useState<Partial<Subcontractor>>({
    name: '',
    idCardNumber: '',
    address: '',
    phone: '',
    skillType: 'งานจ้างเหมาเฉพาะค่าแรงงานโครงสร้าง',
    bankName: 'ธนาคารกสิกรไทย',
    bankAccount: '',
    idCardImage: '',
    notes: '',
  });

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerInitialImage, setScannerInitialImage] = useState<
    string | undefined
  >(undefined);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUploadError(null);
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        name: '',
        idCardNumber: '',
        address: '',
        phone: '',
        skillType: 'งานจ้างเหมาเฉพาะค่าแรงงานโครงสร้าง',
        bankName: 'ธนาคารกสิกรไทย',
        bankAccount: '',
        idCardImage: '',
        notes: '',
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      setUploadError(
        'ขนาดไฟล์รูปภาพเกิน 12MB กรุณาเลือกรูปภาพที่มีขนาดเล็กลง'
      );
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        // Open Smart Crop & Perspective Scanner automatically so uploaded photo is cropped to ID card proportions
        setScannerInitialImage(base64);
        setIsScannerOpen(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleOpenCameraScanner = () => {
    setUploadError(null);
    setScannerInitialImage(undefined);
    setIsScannerOpen(true);
  };

  const handleOpenRecropExisting = () => {
    if (!formData.idCardImage) return;
    setUploadError(null);
    setScannerInitialImage(formData.idCardImage);
    setIsScannerOpen(true);
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, idCardImage: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    const subcontractor: Subcontractor = {
      id: initialData?.id || `sub-${Date.now()}`,
      name: formData.name.trim(),
      idCardNumber: formData.idCardNumber?.trim() || '',
      address: formData.address?.trim() || '',
      phone: formData.phone?.trim() || '',
      skillType: formData.skillType?.trim() || 'งานจ้างเหมาทั่วไป',
      bankName: formData.bankName,
      bankAccount: formData.bankAccount,
      idCardImage: formData.idCardImage || '',
      notes: formData.notes,
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    onSave(subcontractor);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-lg">
              {initialData ? 'แก้ไขข้อมูลผู้รับเหมา (ผรม.)' : '1.1 เพิ่มข้อมูลผู้รับเหมา (ผรม.)'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white rounded-lg p-1 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ชื่อ - นามสกุล ผู้รับเหมา <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="เช่น นายบรรเลง ร่องกล้า หรือ หจก. ทรัพย์อนันต์"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              หมายเลขบัตรประจำตัวประชาชน (13 หลัก)
            </label>
            <input
              type="text"
              placeholder="เช่น 1 1002 01884 92 0"
              value={formData.idCardNumber || ''}
              onChange={(e) => setFormData({ ...formData, idCardNumber: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Thai ID Card Photo Capture & Smart Crop Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                  <CreditCard className="w-4 h-4 mr-1.5 text-blue-600" />
                  รูปถ่ายสำเนาบัตรประจำตัวประชาชน (ตัดขอบสัดส่วนบัตร 85.6 × 54 มม.)
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  ถ่ายรูปบัตรในกรอบมาตรฐาน หรืออัปโหลดรูปเพื่อตัดพื้นหลังรอบบัตรออกให้อัตโนมัติ
                </p>
              </div>
              {formData.idCardImage && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  ลบรูปบัตร
                </button>
              )}
            </div>

            {uploadError && (
              <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {uploadError}
              </div>
            )}

            {formData.idCardImage ? (
              <div className="space-y-2.5">
                <div className="relative border border-slate-300 rounded-xl overflow-hidden bg-slate-900/5 p-3 flex flex-col items-center">
                  <img
                    src={formData.idCardImage}
                    alt="สำเนาบัตรประชาชน"
                    className="w-full max-w-[340px] aspect-[85.6/54] object-contain rounded-xl shadow-sm bg-white"
                  />
                  <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                    <Sparkles className="w-3 h-3 mr-1" />
                    จัดกรอบสัดส่วนบัตรประชาชนเรียบร้อยแล้ว
                  </span>
                </div>

                {/* Action buttons when card image already exists */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleOpenRecropExisting}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                  >
                    <Crop className="w-3.5 h-3.5 mr-1.5" />
                    ตัดขอบ / ดัดบัตรใหม่
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenCameraScanner}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 mr-1.5" />
                    ถ่ายบัตรใหม่ด้วยกล้อง
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold inline-flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    อัปโหลดรูปอื่น
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleOpenCameraScanner}
                    className="border-2 border-dashed border-blue-400 hover:border-blue-600 bg-blue-50/50 hover:bg-blue-50 rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mb-2 shadow-xs">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-blue-900">
                      ถ่ายรูปบัตรประชาชนด้วยกล้อง
                    </div>
                    <div className="text-[11px] text-blue-700/80 mt-0.5">
                      มีกรอบเล็งสัดส่วนบัตร ตัดขอบรอบนอกอัตโนมัติ
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-emerald-400 hover:border-emerald-600 bg-emerald-50/40 hover:bg-emerald-50/80 rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-xs">
                      <Crop className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-emerald-900">
                      อัปโหลดรูปบัตร & ตัดขอบสวยงาม
                    </div>
                    <div className="text-[11px] text-emerald-700/80 mt-0.5">
                      ตรวจจับขอบบัตร และดึงมุมดัดบัตรเอียงให้ตรงได้
                    </div>
                  </button>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ที่อยู่ตามบัตรประชาชน / สำนักงาน
            </label>
            <textarea
              rows={2}
              placeholder="เช่น 24/9 ซอยลาดพร้าว 122 แขวงพลับพลา เขตวังทองหลาง กทม. 10310"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                เบอร์โทรศัพท์ติดต่อ
              </label>
              <input
                type="text"
                placeholder="เช่น 081-456-7890"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ความเชี่ยวชาญ / ประเภทงาน
              </label>
              <input
                type="text"
                placeholder="เช่น เช่าเครื่องจักร, งานโครงสร้าง, ทาสี"
                value={formData.skillType || ''}
                onChange={(e) => setFormData({ ...formData, skillType: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ธนาคาร
              </label>
              <select
                value={formData.bankName || 'ธนาคารกสิกรไทย'}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="ธนาคารกสิกรไทย">ธนาคารกสิกรไทย (KBANK)</option>
                <option value="ธนาคารไทยพาณิชย์">ธนาคารไทยพาณิชย์ (SCB)</option>
                <option value="ธนาคารกรุงเทพ">ธนาคารกรุงเทพ (BBL)</option>
                <option value="ธนาคารกรุงไทย">ธนาคารกรุงไทย (KTB)</option>
                <option value="ธนาคารกรุงศรีอยุธยา">ธนาคารกรุงศรีอยุธยา (BAY)</option>
                <option value="ธนาคารทหารไทยธนชาต">ธนาคารทหารไทยธนชาต (TTB)</option>
                <option value="ธนาคารออมสิน">ธนาคารออมสิน (GSB)</option>
                <option value="พร้อมเพย์">พร้อมเพย์ (PromptPay)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                เลขที่บัญชี
              </label>
              <input
                type="text"
                placeholder="เช่น 023-2-89412-3"
                value={formData.bankAccount || ''}
                onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              หมายเหตุ / บันทึกเพิ่มเติม
            </label>
            <input
              type="text"
              placeholder="เช่น มีรถขุด 2 คัน, พร้อมเริ่มงานได้ทันที"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
            >
              บันทึกข้อมูล ผรม.
            </button>
          </div>
        </form>
      </div>

      {/* ID Card Camera & Smart Crop / Perspective Scanner Modal */}
      <IdCardScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        initialImage={scannerInitialImage}
        onConfirm={(croppedDataUrl) => {
          setFormData((prev) => ({ ...prev, idCardImage: croppedDataUrl }));
          setIsScannerOpen(false);
        }}
      />
    </div>
  );
};
