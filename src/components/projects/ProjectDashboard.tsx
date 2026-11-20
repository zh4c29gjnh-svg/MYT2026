/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Project } from '../../types/types.ts';
import {
  Plus,
  Star,
  Settings,
  Calendar,
  Layers,
  ChevronDown,
  Building,
  BarChart3,
  Edit2,
  Trash2,
} from 'lucide-react';
import { ProjectModal } from './ProjectModal.tsx';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal.tsx';
import { calculateProjectWeightedStats } from '../../utils/projectWeights.ts';

interface ProjectDashboardProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onSaveProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  projects,
  onSelectProject,
  onSaveProject,
  onDeleteProject,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const followedProjects = projects.filter((p) => p.isFollowed);
  const otherProjects = projects.filter((p) => !p.isFollowed);

  const toggleStar = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    onSaveProject({
      ...project,
      isFollowed: !project.isFollowed,
    });
  };

  const handleEdit = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setProjectToDelete(project);
  };

  const renderProjectCard = (project: Project) => {
    const hasTasks = project.tasks.length > 0;
    const totalTasks = hasTasks ? project.tasks.length : 20;
    const completedTasks = hasTasks
      ? project.tasks.filter((t) => (t.progressPercent ?? (t.completed ? 100 : 0)) >= 100).length
      : project.progress === 100
      ? totalTasks
      : Math.round((project.progress / 100) * totalTasks);
    const weightedSummary = calculateProjectWeightedStats(project);
    const calculatedPercent = weightedSummary.projectProgressPercent.toFixed(2);

    const isDone = parseFloat(calculatedPercent) >= 100;

    return (
      <div
        key={project.id}
        onClick={() => onSelectProject(project)}
        className="bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400 p-4 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group relative"
      >
        <div>
          {/* Card Top: Status Tag & Icons */}
          <div className="flex items-center justify-between mb-2.5">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center space-x-1 ${
                isDone
                  ? 'bg-emerald-500 text-white'
                  : 'bg-amber-500 text-white'
              }`}
            >
              <span>{isDone ? 'เสร็จสิ้นแล้ว' : 'กำลังทำงาน'}</span>
              <ChevronDown className="w-3 h-3 ml-0.5 opacity-80" />
            </span>

            <div className="flex items-center space-x-1">
              <button
                onClick={(e) => toggleStar(e, project)}
                className={`p-1 rounded-md transition-colors ${
                  project.isFollowed
                    ? 'text-amber-400 hover:text-amber-500'
                    : 'text-slate-300 hover:text-amber-400'
                }`}
                title={project.isFollowed ? 'ยกเลิกการติดตาม' : 'ปักหมุดติดตาม'}
              >
                <Star className="w-4 h-4 fill-current" />
              </button>
              <button
                onClick={(e) => handleEdit(e, project)}
                className="p-1 text-slate-300 hover:text-slate-600 rounded-md transition-colors"
                title="แก้ไขข้อมูลโครงการ"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => handleDelete(e, project)}
                className="p-1 text-slate-300 hover:text-rose-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                title="ลบโครงการ"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Project Title */}
          <div className="flex items-start space-x-2 mb-3">
            <span className="text-base text-slate-400 mt-0.5">🌐</span>
            <h3 className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
              {project.name}
            </h3>
          </div>

          {/* Dates & Location */}
          <div className="text-[11px] text-slate-500 space-y-1 mb-3">
            <div className="flex items-center">
              <Calendar className="w-3 h-3 mr-1.5 text-slate-400" />
              <span>
                {project.startDate || '2026-10-01'} ถึง {project.endDate || '2026-12-15'}
              </span>
            </div>
            {project.supervisorName && (
              <div className="flex items-center text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
                <span>ผู้ควบคุม: {project.supervisorName}</span>
              </div>
            )}
          </div>

          {/* Member Avatars */}
          <div className="flex items-center space-x-1 mb-3">
            <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-[10px] text-white font-bold border border-white">
              ป
            </div>
            <div className="w-6 h-6 rounded-full bg-blue-400 flex items-center justify-center text-[10px] text-white font-bold border border-white">
              บ
            </div>
            {project.tasks.length > 0 && (
              <span className="text-[10px] text-slate-400 ml-1">
                {project.tasks.length} กิจกรรม
              </span>
            )}
          </div>
        </div>

        {/* Card Bottom: Progress Bar and Stats */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex justify-between items-center text-xs text-slate-600 mb-1.5">
            <span className="font-semibold text-slate-800">{calculatedPercent}% เสร็จสิ้น</span>
            <span className="text-slate-500 font-mono">
              {completedTasks}/ {totalTasks} ทาสก์
            </span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isDone ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, parseFloat(calculatedPercent)))}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 mb-1">
            <Building className="w-3.5 h-3.5 mr-1" />
            2. เมนู โครงการ
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            2.1 ภาพรวมโครงการก่อสร้าง (กำหนดการเริ่มและสิ้นสุด)
          </h2>
          <p className="text-sm text-slate-500">
            คลิกที่โครงการเพื่อเปิดดูกระดานทาสก์ (2.2), ไทม์ไลน์แผนงาน (2.3) และกราฟผลงาน (2.4)
          </p>
        </div>

        <button
          onClick={() => {
            setEditingProject(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          สร้างโปรเจคใหม่
        </button>
      </div>

      {/* Section 1: Followed Projects */}
      {followedProjects.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-slate-700 font-bold text-sm">
            <span>โปรเจคที่ติดตาม ({followedProjects.length})</span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {followedProjects.map(renderProjectCard)}
          </div>
        </div>
      )}

      {/* Section 2: Related Projects (Grid with "+ สร้างโปรเจคใหม่" card as first item) */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-slate-700 font-bold text-sm">
          <span>โปรเจคที่เกี่ยวข้อง ({otherProjects.length})</span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* "+ สร้างโปรเจคใหม่" card */}
          <div
            onClick={() => {
              setEditingProject(null);
              setIsModalOpen(true);
            }}
            className="border-2 border-dashed border-blue-400/80 bg-blue-50/20 hover:bg-blue-50/50 rounded-2xl min-h-[190px] flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all hover:scale-[1.01] group"
          >
            <div className="w-12 h-12 rounded-full bg-blue-100 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center transition-colors mb-2 shadow-xs">
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="font-bold text-blue-600 text-base">สร้างโปรเจคใหม่</span>
            <span className="text-xs text-slate-400 mt-1">
              กำหนดวันที่เริ่ม-สิ้นสุด และงวดงาน
            </span>
          </div>

          {/* Cards for other projects */}
          {otherProjects.map(renderProjectCard)}
        </div>
      </div>

      {/* Project Modal */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onSaveProject}
        initialProject={editingProject}
      />

      {/* Confirm Delete In-App Modal */}
      <ConfirmDeleteModal
        isOpen={!!projectToDelete}
        title="ยืนยันการลบโครงการ"
        itemName={projectToDelete ? `โครงการ ${projectToDelete.name} (${projectToDelete.code})` : undefined}
        description="คุณต้องการลบโครงการนี้ใช่หรือไม่? กิจกรรมการทำงานและงวดงานทั้งหมดในโครงการนี้จะถูกลบด้วย"
        confirmLabel="ลบโครงการ"
        cancelLabel="ยกเลิก"
        onConfirm={() => {
          if (projectToDelete) {
            onDeleteProject(projectToDelete.id);
            setProjectToDelete(null);
          }
        }}
        onCancel={() => setProjectToDelete(null)}
      />
    </div>
  );
};
