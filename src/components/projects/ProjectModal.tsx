/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Project } from '../../types/types.ts';
import { X, Building2, Calendar, DollarSign, User } from 'lucide-react';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
  initialProject?: Project | null;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialProject,
}) => {
  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    code: '',
    location: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    budget: 1500000,
    status: 'in_progress',
    supervisorName: 'นายปรวิทย์ นวลนาค',
    clientName: 'บมจ. ซีพี ออลล์ (CP ALL)',
    isFollowed: false,
    progress: 0,
  });

  useEffect(() => {
    if (initialProject) {
      setFormData(initialProject);
    } else {
      setFormData({
        name: '',
        code: `PRJ-${Math.floor(100 + Math.random() * 900)}`,
        location: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        budget: 1500000,
        status: 'in_progress',
        supervisorName: 'นายปรวิทย์ นวลนาค',
        clientName: 'บมจ. ซีพี ออลล์ (CP ALL)',
        isFollowed: false,
        progress: 0,
      });
    }
  }, [initialProject, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    const project: Project = {
      id: initialProject?.id || `prj-${Date.now()}`,
      code: formData.code?.trim() || `PRJ-${Date.now()}`,
      name: formData.name.trim(),
      location: formData.location || '',
      startDate: formData.startDate || '',
      endDate: formData.endDate || '',
      budget: Number(formData.budget) || 0,
      status: formData.status || 'in_progress',
      supervisorName: formData.supervisorName || 'นายปรวิทย์ นวลนาค',
      clientName: formData.clientName || 'บมจ. ซีพี ออลล์',
      isFollowed: formData.isFollowed || false,
      progress: initialProject?.progress ?? 0,
      groups: initialProject?.groups || [
        { id: `grp-1`, name: 'งานงวดที่ 1' },
        { id: `grp-2`, name: 'งานงวดที่ 2' },
        { id: `grp-3`, name: 'งานงวดที่ 3' },
        { id: `grp-4`, name: 'งานเครื่องจักร' },
        { id: `grp-5`, name: 'คอนกรีต' },
      ],
      tasks: initialProject?.tasks || [],
      createdAt: initialProject?.createdAt || new Date().toISOString(),
    };

    onSave(project);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-lg">
              {initialProject ? 'แก้ไขข้อมูลโครงการ' : '2.1 เพิ่มโครงการใหม่ (กำหนดการเริ่ม - สิ้นสุด)'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white rounded-lg p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ชื่อโครงการ <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="เช่น 7-11 ไสวประชาราษฎร์ ซอย3 หรือ เบลลินี่ สระแก้ว"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                รหัสโครงการ / เลขที่ PO
              </label>
              <input
                type="text"
                placeholder="เช่น 2606-045 หรือ PRJ-711-01"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ผู้ว่าจ้าง / ลูกค้า
              </label>
              <input
                type="text"
                placeholder="เช่น บมจ. ซีพี ออลล์ (CP ALL)"
                value={formData.clientName || ''}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <Calendar className="w-3.5 h-3.5 inline mr-1 text-slate-500" />
                กำหนดการเริ่มโครงการ
              </label>
              <input
                type="date"
                required
                value={formData.startDate || ''}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <Calendar className="w-3.5 h-3.5 inline mr-1 text-slate-500" />
                กำหนดการสิ้นสุดโครงการ
              </label>
              <input
                type="date"
                required
                value={formData.endDate || ''}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <DollarSign className="w-3.5 h-3.5 inline mr-1 text-slate-500" />
                งบประมาณโครงการ (บาท)
              </label>
              <input
                type="number"
                step="1000"
                value={formData.budget || 0}
                onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-bold"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <User className="w-3.5 h-3.5 inline mr-1 text-slate-500" />
                ผู้ควบคุมงานโครงการ
              </label>
              <input
                type="text"
                placeholder="นายปรวิทย์ นวลนาค"
                value={formData.supervisorName || ''}
                onChange={(e) => setFormData({ ...formData, supervisorName: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              สถานที่ก่อสร้าง / รายละเอียดที่อยู่โครงการ
            </label>
            <input
              type="text"
              placeholder="เช่น ถ.ลาดกระบัง เขตลาดกระบัง กทม."
              value={formData.location || ''}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="isFollowed"
              checked={formData.isFollowed || false}
              onChange={(e) => setFormData({ ...formData, isFollowed: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <label htmlFor="isFollowed" className="text-sm font-medium text-slate-700 cursor-pointer">
              ปักหมุดไว้ที่ "โปรเจคที่ติดตาม" (แสดงด้านบนสุด)
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              บันทึกโครงการ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
