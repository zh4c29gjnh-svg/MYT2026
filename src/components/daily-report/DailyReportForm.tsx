/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  DailyReport,
  DailyReportPhoto,
  DailyReportPhotoLayout,
  Project,
  LaborEntry,
  MachineryEntry,
} from '../../types/types.ts';
import { DailyReportPrint } from './DailyReportPrint.tsx';
import { DocumentActionButtons } from '../receipts/DocumentActionButtons.tsx';
import { DocumentZoomContainer } from '../common/DocumentZoomContainer.tsx';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal.tsx';
import { formatThaiDate } from '../../utils/bahtText.ts';
import {
  Calendar,
  Users,
  Truck,
  Plus,
  Trash2,
  Building,
  Image as ImageIcon,
  ArrowLeft,
  ArrowRight,
  FolderOpen,
  Folder,
  Search,
  Eye,
  Edit3,
  CheckCircle2,
  LayoutGrid,
  Save,
  FileText,
  X,
} from 'lucide-react';

interface DailyReportFormProps {
  projects: Project[];
  dailyReports: DailyReport[];
  onSaveReport: (report: DailyReport) => void;
  onDeleteReport: (id: string) => void;
}

/**
 * Helper to compress & resize uploaded images to a clean JPEG Data URL
 * so localStorage remains fast and html-to-image exports reliably.
 */
function resizeImageFile(file: File, maxDimension = 1000, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function getNormalizedPhotos(report: DailyReport): DailyReportPhoto[] {
  if (report.photoItems && report.photoItems.length > 0) {
    return report.photoItems;
  }
  return (report.photos || []).map((url, idx) => ({
    id: `legacy-${report.id}-${idx}`,
    url,
    caption: `ภาพถ่ายหน้างานที่ ${idx + 1}`,
  }));
}

export const DailyReportForm: React.FC<DailyReportFormProps> = ({
  projects,
  dailyReports,
  onSaveReport,
  onDeleteReport,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'archive'>('create');
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [reportNumber, setReportNumber] = useState<string>(
    `DLR-2569-${Math.floor(100 + Math.random() * 900)}`
  );
  const [reportToDelete, setReportToDelete] = useState<DailyReport | null>(null);
  const [saveBannerMessage, setSaveBannerMessage] = useState<string | null>(null);

  // Archive Filter & Search State
  const [selectedArchiveProjectId, setSelectedArchiveProjectId] = useState<string>('ALL');
  const [archiveSearchQuery, setArchiveSearchQuery] = useState<string>('');
  const [lightboxPhoto, setLightboxPhoto] = useState<{
    url: string;
    caption: string;
    reportTitle: string;
  } | null>(null);

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projects[0]?.id || ''
  );

  const selectedProject =
    projects.find((p) => p.id === selectedProjectId) || projects[0];

  const [date, setDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [weather, setWeather] = useState<'sunny' | 'cloudy' | 'rain' | 'heavy_rain'>('sunny');
  const [temperature, setTemperature] = useState<string>('33°C');

  // Activities (from 2.2 Project Tasks)
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [activitiesDescription, setActivitiesDescription] = useState<string>(
    'เทคอนกรีตพื้น คสล. ชั้น 1 และเตรียมเหล็กเสริมฐานราก'
  );

  // Labors list
  const [labors, setLabors] = useState<LaborEntry[]>([
    { type: 'ช่างปูน/เทคอนกรีต', count: 6 },
    { type: 'ช่างเหล็ก/ผูกเหล็ก', count: 4 },
    { type: 'ช่างไม้/แบบหล่อ', count: 3 },
    { type: 'กรรมกรทั่วไป', count: 5 },
  ]);

  // Machineries list
  const [machineries, setMachineries] = useState<MachineryEntry[]>([
    { type: 'รถโม่ปูนคอนกรีตผสมเสร็จ', count: 4, status: 'working' },
    { type: 'รถปั๊มคอนกรีตบูมยาว', count: 1, status: 'working' },
    { type: 'เครื่องจี้คอนกรีต (Vibrator)', count: 3, status: 'working' },
    { type: 'รถขุดดิน PC30', count: 1, status: 'standby' },
  ]);

  // Photos & Layout state
  const [photoItems, setPhotoItems] = useState<DailyReportPhoto[]>([]);
  const [photoLayout, setPhotoLayout] = useState<DailyReportPhotoLayout>('grid-2');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [todayProgress, setTodayProgress] = useState<number>(5.5);
  const [accumulatedProgress, setAccumulatedProgress] = useState<number>(
    selectedProject?.progress || 75.5
  );
  const [problems, setProblems] = useState<string>(
    'การจราจรหน้าหน่วยงานติดขัดเล็กน้อยช่วงรถโม่เข้า แต่ประสานงานเจ้าหน้าที่เรียบร้อย'
  );
  const [solutions, setSolutions] = useState<string>(
    'จัดเจ้าหน้าที่โบกธงจราจรหน้าทางเข้าโครงการ'
  );
  const [safetyNotes, setSafetyNotes] = useState<string>(
    'สวมใส่อุปกรณ์ PPE ครบถ้วน 100% ไม่มีอุบัติเหตุ'
  );
  const [reporterName, setReporterName] = useState<string>(
    selectedProject?.supervisorName || 'นายปรวิทย์ นวลนาค'
  );

  const [viewingHistoricalReport, setViewingHistoricalReport] = useState<DailyReport | null>(null);

  // Sync when project changes (only when not loading an existing report for edit)
  const handleSelectProjectInForm = (newProjId: string) => {
    setSelectedProjectId(newProjId);
    const targetProj = projects.find((p) => p.id === newProjId);
    if (targetProj) {
      setReporterName(targetProj.supervisorName || 'นายปรวิทย์ นวลนาค');
      setAccumulatedProgress(targetProj.progress || 0);
      setSelectedTaskIds([]);
    }
  };

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // When tasks are toggled from 2.2, update activities description
  const handleToggleTask = (taskId: string) => {
    let next: string[];
    if (selectedTaskIds.includes(taskId)) {
      next = selectedTaskIds.filter((id) => id !== taskId);
    } else {
      next = [...selectedTaskIds, taskId];
    }
    setSelectedTaskIds(next);

    const chosenTitles = selectedProject?.tasks
      .filter((t) => next.includes(t.id))
      .map((t) => `• ${t.title}`)
      .join('\n');

    if (chosenTitles) {
      setActivitiesDescription(chosenTitles);
    }
  };

  // Photo Upload, Reorder, Caption & Delete Handlers
  const handleUploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPhotos: DailyReportPhoto[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const resizedDataUrl = await resizeImageFile(file);
        const defaultCaption = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]/g, ' ');
        newPhotos.push({
          id: `photo-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          url: resizedDataUrl,
          caption:
            defaultCaption.length > 3
              ? defaultCaption
              : `ภาพถ่ายหน้างานที่ ${photoItems.length + i + 1}`,
        });
      } catch {
        // ignore failed file
      }
    }

    if (newPhotos.length > 0) {
      setPhotoItems((prev) => [...prev, ...newPhotos]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpdatePhotoCaption = (photoId: string, caption: string) => {
    setPhotoItems((prev) =>
      prev.map((item) => (item.id === photoId ? { ...item, caption } : item))
    );
  };

  const handleMovePhoto = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= photoItems.length) return;
    const updated = [...photoItems];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setPhotoItems(updated);
  };

  const handleRemovePhoto = (photoId: string) => {
    setPhotoItems((prev) => prev.filter((item) => item.id !== photoId));
  };

  // Labor Handlers
  const handleAddLabor = () => {
    setLabors([...labors, { type: 'ช่างสี/ตกแต่ง', count: 2 }]);
  };
  const handleRemoveLabor = (index: number) => {
    setLabors(labors.filter((_, i) => i !== index));
  };
  const handleLaborChange = (index: number, field: keyof LaborEntry, val: any) => {
    const updated = [...labors];
    updated[index] = { ...updated[index], [field]: val };
    setLabors(updated);
  };

  // Machinery Handlers
  const handleAddMachinery = () => {
    setMachineries([
      ...machineries,
      { type: 'รถบรรทุก 10 ล้อ', count: 2, status: 'working' },
    ]);
  };
  const handleRemoveMachinery = (index: number) => {
    setMachineries(machineries.filter((_, i) => i !== index));
  };
  const handleMachineryChange = (index: number, field: keyof MachineryEntry, val: any) => {
    const updated = [...machineries];
    updated[index] = { ...updated[index], [field]: val };
    setMachineries(updated);
  };

  const totalLaborCount = labors.reduce((sum, l) => sum + (Number(l.count) || 0), 0);
  const totalMachineryCount = machineries.reduce((sum, m) => sum + (Number(m.count) || 0), 0);

  const currentReport: DailyReport = {
    id: editingReportId || `dlr-${Date.now()}`,
    reportNumber,
    date,
    projectId: selectedProjectId,
    projectName: selectedProject?.name || 'โครงการก่อสร้าง',
    weather,
    temperature,
    selectedTaskIds,
    activitiesDescription,
    labors,
    totalLaborCount,
    machineries,
    totalMachineryCount,
    todayProgressPercent: todayProgress,
    accumulatedProgressPercent: accumulatedProgress,
    problemsAndIssues: problems,
    solutions,
    safetyNotes,
    reporterName,
    photos: photoItems.map((p) => p.url),
    photoItems,
    photoLayout,
    createdAt: new Date().toISOString(),
  };

  const handleSave = () => {
    onSaveReport(currentReport);
    setSaveBannerMessage(
      `บันทึกรายงาน "${currentReport.reportNumber}" เข้าสู่คลังโครงการ "${currentReport.projectName}" เรียบร้อยแล้ว!`
    );
    setEditingReportId(null);
    setReportNumber(`DLR-2569-${Math.floor(100 + Math.random() * 900)}`);
    setTimeout(() => {
      setSaveBannerMessage(null);
    }, 6000);
  };

  const handleEditExistingReport = (rep: DailyReport) => {
    setEditingReportId(rep.id);
    setReportNumber(rep.reportNumber);
    setSelectedProjectId(rep.projectId);
    setDate(rep.date);
    setWeather(rep.weather);
    setTemperature(rep.temperature || '33°C');
    setSelectedTaskIds(rep.selectedTaskIds || []);
    setActivitiesDescription(rep.activitiesDescription || '');
    setLabors(rep.labors || []);
    setMachineries(rep.machineries || []);
    setTodayProgress(rep.todayProgressPercent || 0);
    setAccumulatedProgress(rep.accumulatedProgressPercent || 0);
    setProblems(rep.problemsAndIssues || '');
    setSolutions(rep.solutions || '');
    setSafetyNotes(rep.safetyNotes || '');
    setReporterName(rep.reporterName || '');
    setPhotoItems(getNormalizedPhotos(rep));
    setPhotoLayout(rep.photoLayout || 'grid-2');
    setActiveTab('create');
  };

  const handleStartNewReportForProject = (projId: string) => {
    setEditingReportId(null);
    setReportNumber(`DLR-2569-${Math.floor(100 + Math.random() * 900)}`);
    handleSelectProjectInForm(projId);
    setPhotoItems([]);
    setActiveTab('create');
  };

  // Group Daily Reports by Project for the Archive
  const projectArchiveGroups = React.useMemo(() => {
    const map = new Map<
      string,
      {
        projectId: string;
        projectName: string;
        projectCode?: string;
        supervisorName?: string;
        reports: DailyReport[];
        totalPhotos: number;
        latestDate: string;
        latestProgress: number;
      }
    >();

    // Initialize from existing projects so every project has a folder in the archive
    projects.forEach((p) => {
      map.set(p.id, {
        projectId: p.id,
        projectName: p.name,
        projectCode: p.code,
        supervisorName: p.supervisorName,
        reports: [],
        totalPhotos: 0,
        latestDate: p.startDate || '-',
        latestProgress: p.progress || 0,
      });
    });

    // Add all daily reports into their respective project group
    dailyReports.forEach((rep) => {
      const key = rep.projectId || rep.projectName || 'unassigned';
      if (!map.has(key)) {
        map.set(key, {
          projectId: key,
          projectName: rep.projectName || 'โครงการอื่นๆ',
          supervisorName: rep.reporterName,
          reports: [],
          totalPhotos: 0,
          latestDate: rep.date,
          latestProgress: rep.accumulatedProgressPercent,
        });
      }
      const group = map.get(key)!;
      group.reports.push(rep);
      const photosCount = getNormalizedPhotos(rep).length;
      group.totalPhotos += photosCount;
    });

    // Sort reports inside each project newest first
    const result = Array.from(map.values()).map((grp) => {
      const sorted = [...grp.reports].sort((a, b) =>
        b.date.localeCompare(a.date)
      );
      return {
        ...grp,
        reports: sorted,
        latestDate: sorted[0]?.date || grp.latestDate,
        latestProgress:
          sorted[0]?.accumulatedProgressPercent ?? grp.latestProgress,
      };
    });

    // Sort project folders: projects with reports first
    return result.sort((a, b) => b.reports.length - a.reports.length);
  }, [projects, dailyReports]);

  // Filter groups based on selectedArchiveProjectId and archiveSearchQuery
  const visibleProjectArchiveGroups = React.useMemo(() => {
    const q = archiveSearchQuery.trim().toLowerCase();
    return projectArchiveGroups
      .filter(
        (grp) =>
          selectedArchiveProjectId === 'ALL' ||
          grp.projectId === selectedArchiveProjectId
      )
      .map((grp) => {
        if (!q) return grp;
        const filteredReports = grp.reports.filter(
          (r) =>
            r.reportNumber.toLowerCase().includes(q) ||
            r.date.toLowerCase().includes(q) ||
            r.projectName.toLowerCase().includes(q) ||
            r.activitiesDescription.toLowerCase().includes(q) ||
            r.reporterName.toLowerCase().includes(q)
        );
        return {
          ...grp,
          reports: filteredReports,
        };
      })
      .filter(
        (grp) =>
          selectedArchiveProjectId !== 'ALL' ||
          !q ||
          grp.reports.length > 0 ||
          grp.projectName.toLowerCase().includes(q)
      );
  }, [projectArchiveGroups, selectedArchiveProjectId, archiveSearchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 mb-1">
            <Calendar className="w-3.5 h-3.5 mr-1" />
            3. เมนูรายงานความก้าวหน้างานประจำวัน (Daily Site Report & Archive)
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            ระบบรายงานความก้าวหน้างานประจำวัน & คลังข้อมูลแยกตามโครงการ
          </h2>
          <p className="text-sm text-slate-500">
            ดึงข้อมูลจากโครงการ (2.1), กิจกรรม (2.2), แนบรูปภาพหน้างานพร้อมจัดเรียง และบันทึกแยกเป็นหมวดหมู่ตามโครงการ
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1.5 rounded-xl text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2.5 rounded-lg transition-all flex items-center space-x-1.5 ${
              activeTab === 'create'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>
              {editingReportId
                ? 'กำลังแก้ไขรายงานประจำวัน'
                : '3.1 สร้างรายงานประจำวัน'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('archive')}
            className={`px-4 py-2.5 rounded-lg transition-all flex items-center space-x-1.5 ${
              activeTab === 'archive'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>3.2 คลังรายงานแยกตามโครงการ ({dailyReports.length})</span>
          </button>
        </div>
      </div>

      {/* Save Success In-App Banner */}
      {saveBannerMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-2 text-xs sm:text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{saveBannerMessage}</span>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setSelectedArchiveProjectId(currentReport.projectId);
                setActiveTab('archive');
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
            >
              เปิดดูในคลังโครงการนี้ →
            </button>
            <button
              type="button"
              onClick={() => setSaveBannerMessage(null)}
              className="text-emerald-600 hover:text-emerald-800 p-1 text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {activeTab === 'create' && (
        <>
          {/* Action Toolbar */}
          <DocumentActionButtons
            elementId="daily-report-preview-view"
            documentTitle={`Daily_Report_${currentReport.projectName}_${date}`}
            fileName={`Daily_Report_${date}`}
            onSaveToSystem={handleSave}
            documentData={currentReport}
          />

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            {/* Form Editor (5 cols) */}
            <div className="xl:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
              {editingReportId && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-xs text-amber-800">
                  <span className="font-semibold">
                    กำลังแก้ไขรายงานเลขที่: {reportNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingReportId(null);
                      setReportNumber(`DLR-2569-${Math.floor(100 + Math.random() * 900)}`);
                    }}
                    className="underline font-bold hover:text-amber-950"
                  >
                    สลับเป็นสร้างใบใหม่
                  </button>
                </div>
              )}

              {/* 2.1 Project Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center">
                  <Building className="w-3.5 h-3.5 mr-1 text-blue-600" />
                  เลือกโครงการ (บันทึกแยกเข้าคลังตามโครงการนี้)
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => handleSelectProjectInForm(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {selectedProject && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    สถานที่: {selectedProject.location || '-'} | ผู้ควบคุม:{' '}
                    {selectedProject.supervisorName}
                  </p>
                )}
              </div>

              {/* Date & Weather */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    วันที่บันทึก
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
                    สภาพอากาศ
                  </label>
                  <select
                    value={weather}
                    onChange={(e) => setWeather(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="sunny">แดดจัด ท้องฟ้าแจ่มใส</option>
                    <option value="cloudy">มีเมฆมาก</option>
                    <option value="rain">ฝนตก</option>
                    <option value="heavy_rain">ฝนตกหนัก (หยุดงาน)</option>
                  </select>
                </div>
              </div>

              {/* 2.2 Activities Picker from Project Tasks */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>ดึงข้อมูลจาก 2.2 กิจกรรมการทำงานในโครงการ</span>
                  <span className="text-[11px] font-normal text-blue-600">
                    คลิกเพื่อเลือกกิจกรรม
                  </span>
                </label>

                {selectedProject?.tasks && selectedProject.tasks.length > 0 ? (
                  <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    {selectedProject.tasks.map((task) => (
                      <label
                        key={task.id}
                        className="flex items-center space-x-2 p-1.5 bg-white rounded border border-slate-200/80 hover:bg-blue-50/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTaskIds.includes(task.id)}
                          onChange={() => handleToggleTask(task.id)}
                          className="w-3.5 h-3.5 text-blue-600 rounded"
                        />
                        <span className="truncate flex-1 font-medium text-slate-800">
                          {task.title}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          ({task.groupName})
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    โครงการนี้ยังไม่มีกิจกรรม สามารถพิมพ์รายละเอียดได้ด้านล่าง
                  </p>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    รายละเอียดกิจกรรมงานที่ปฏิบัติในวันนี้
                  </label>
                  <textarea
                    rows={3}
                    value={activitiesDescription}
                    onChange={(e) => setActivitiesDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs leading-relaxed"
                    placeholder="ระบุกิจกรรมงานที่ทำในวันนี้..."
                  />
                </div>
              </div>

              {/* Photo Attachment & Layout Section */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                    <ImageIcon className="w-4 h-4 mr-1.5 text-blue-600" />
                    แนบรูปภาพหน้างาน & จัดเรียง ({photoItems.length} รูป)
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleUploadPhotos}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    เพิ่มรูปภาพหน้างาน
                  </button>
                </div>

                {/* Grid Layout Picker */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600 font-medium flex items-center">
                    <LayoutGrid className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                    รูปแบบการจัดเรียงในใบรายงาน:
                  </span>
                  <div className="inline-flex bg-white p-0.5 rounded-lg border border-slate-200">
                    {(
                      [
                        { id: 'grid-2', label: '2 คอลัมน์ (ดูชัด)' },
                        { id: 'grid-3', label: '3 คอลัมน์' },
                        { id: 'grid-4', label: '4 คอลัมน์' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPhotoLayout(opt.id)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                          photoLayout === opt.id
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Uploaded Photos List with Reordering & Captions */}
                {photoItems.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/30 rounded-xl p-5 text-center cursor-pointer transition-colors"
                  >
                    <ImageIcon className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-slate-700">
                      คลิกเพื่อเลือกรูปภาพหน้างาน (เลือกได้หลายรูปพร้อมกัน)
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      สามารถพิมพ์คำอธิบายใต้ภาพ และกดเลื่อนจัดเรียงลำดับรูปได้ทันที
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {photoItems.map((photo, index) => (
                      <div
                        key={photo.id}
                        className="border border-slate-200 rounded-xl p-2 bg-slate-50/70 flex flex-col gap-2"
                      >
                        <div className="relative h-28 w-full rounded-lg overflow-hidden bg-slate-200">
                          <img
                            src={photo.url}
                            alt={photo.caption || `รูปที่ ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-1.5 left-1.5 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                            รูปที่ {index + 1}
                          </span>

                          {/* Reorder & Delete Overlay Controls */}
                          <div className="absolute top-1.5 right-1.5 flex items-center space-x-1">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => handleMovePhoto(index, 'left')}
                              className="p-1 rounded bg-white/90 hover:bg-white text-slate-700 disabled:opacity-40 shadow-2xs"
                              title="เลื่อนลำดับขึ้น/ไปทางซ้าย"
                            >
                              <ArrowLeft className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={index === photoItems.length - 1}
                              onClick={() => handleMovePhoto(index, 'right')}
                              className="p-1 rounded bg-white/90 hover:bg-white text-slate-700 disabled:opacity-40 shadow-2xs"
                              title="เลื่อนลำดับลง/ไปทางขวา"
                            >
                              <ArrowRight className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(photo.id)}
                              className="p-1 rounded bg-rose-600/90 hover:bg-rose-600 text-white shadow-2xs"
                              title="ลบรูปภาพนี้"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <input
                          type="text"
                          value={photo.caption || ''}
                          onChange={(e) =>
                            handleUpdatePhotoCaption(photo.id, e.target.value)
                          }
                          placeholder={`คำอธิบายรูปที่ ${index + 1}...`}
                          className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-[11px] text-slate-800"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Labor Count Section */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                    <Users className="w-3.5 h-3.5 mr-1 text-blue-600" />
                    เพิ่มจำนวนแรงงาน (รวม {totalLaborCount} คน)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddLabor}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center"
                  >
                    <Plus className="w-3 h-3 mr-0.5" />
                    เพิ่มประเภท
                  </button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {labors.map((labor, idx) => (
                    <div key={idx} className="flex items-center space-x-2 text-xs">
                      <input
                        type="text"
                        value={labor.type}
                        onChange={(e) => handleLaborChange(idx, 'type', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-lg"
                        placeholder="ประเภทแรงงาน"
                      />
                      <input
                        type="number"
                        min="0"
                        value={labor.count}
                        onChange={(e) =>
                          handleLaborChange(idx, 'count', parseInt(e.target.value) || 0)
                        }
                        className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-center font-bold"
                      />
                      <span className="text-slate-500 text-xs">คน</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLabor(idx)}
                        className="text-slate-300 hover:text-rose-500 p-1"
                        title="ลบแถวแรงงาน"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Machinery Count Section */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                    <Truck className="w-3.5 h-3.5 mr-1 text-amber-600" />
                    เพิ่มจำนวนเครื่องจักร (รวม {totalMachineryCount} คัน/เครื่อง)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMachinery}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center"
                  >
                    <Plus className="w-3 h-3 mr-0.5" />
                    เพิ่มเครื่องจักร
                  </button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {machineries.map((mach, idx) => (
                    <div key={idx} className="flex items-center space-x-2 text-xs">
                      <input
                        type="text"
                        value={mach.type}
                        onChange={(e) => handleMachineryChange(idx, 'type', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-lg"
                        placeholder="ชนิดเครื่องจักร"
                      />
                      <input
                        type="number"
                        min="0"
                        value={mach.count}
                        onChange={(e) =>
                          handleMachineryChange(idx, 'count', parseInt(e.target.value) || 0)
                        }
                        className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg text-center font-bold"
                      />
                      <select
                        value={mach.status}
                        onChange={(e) => handleMachineryChange(idx, 'status', e.target.value)}
                        className="px-2 py-1.5 border border-slate-300 rounded-lg text-[11px]"
                      >
                        <option value="working">ใช้งาน</option>
                        <option value="standby">สแตนด์บาย</option>
                        <option value="maintenance">ซ่อมบำรุง</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveMachinery(idx)}
                        className="text-slate-300 hover:text-rose-500 p-1"
                        title="ลบแถวเครื่องจักร"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress & Safety */}
              <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-600 block mb-1">ความคืบหน้าวันนี้ (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={todayProgress}
                    onChange={(e) => setTodayProgress(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1">ความคืบหน้าสะสม (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={accumulatedProgress}
                    onChange={(e) => setAccumulatedProgress(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-blue-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  ปัญหา อุปสรรค และแนวทางแก้ไข
                </label>
                <input
                  type="text"
                  value={problems}
                  onChange={(e) => setProblems(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  placeholder="เช่น การจราจรติดขัด, ฝนตกชุก"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  ชื่อผู้รายงาน (วิศวกร/ผู้ควบคุมงาน)
                </label>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>

              {/* Prominent Save to Project Archive Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-sm flex items-center justify-center space-x-2 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    บันทึกรายงานเข้าคลังโครงการ ({selectedProject?.name || 'โครงการ'})
                  </span>
                </button>
              </div>
            </div>

            {/* Live Print View on Right (7 cols) with Zoom Controller */}
            <div className="xl:col-span-7">
              <DocumentZoomContainer
                defaultZoom={85}
                title="ตัวอย่างรายงานประจำวัน A4 เสมือนจริง"
                badge="พร้อมพิมพ์ & ส่งออก"
              >
                <DailyReportPrint report={currentReport} containerId="daily-report-preview-view" />
              </DocumentZoomContainer>
            </div>
          </div>
        </>
      )}

      {/* Archive Tab: Organized by Project */}
      {activeTab === 'archive' && (
        <div className="space-y-6">
          {/* 1. Project Folder Selector Grid */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center">
                  <FolderOpen className="w-5 h-5 mr-2 text-amber-500" />
                  คลังรายงานความก้าวหน้างานประจำวัน (แยกเป็นโครงการ)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  คลิกเลือกแฟ้มโครงการเพื่อดูเฉพาะรายงานและรูปภาพหน้างานของโครงการนั้นๆ
                </p>
              </div>

              {/* Search Input */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={archiveSearchQuery}
                  onChange={(e) => setArchiveSearchQuery(e.target.value)}
                  placeholder="ค้นหาเลขที่รายงาน, วันที่, กิจกรรม..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Project Folders Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* All Projects Card */}
              <button
                type="button"
                onClick={() => setSelectedArchiveProjectId('ALL')}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  selectedArchiveProjectId === 'ALL'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50/80 hover:bg-slate-100 text-slate-800 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <FolderOpen
                      className={`w-5 h-5 ${
                        selectedArchiveProjectId === 'ALL'
                          ? 'text-amber-300'
                          : 'text-amber-500'
                      }`}
                    />
                    <span className="text-xs font-bold">แสดงทุกโครงการรวมกัน</span>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      selectedArchiveProjectId === 'ALL'
                        ? 'bg-white/20 text-white'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {dailyReports.length} ฉบับ
                  </span>
                </div>
                <p
                  className={`text-[11px] ${
                    selectedArchiveProjectId === 'ALL'
                      ? 'text-blue-100'
                      : 'text-slate-500'
                  }`}
                >
                  แยกหมวดหมู่ตามรายชื่อโครงการทั้งหมด ({projectArchiveGroups.length} โครงการ)
                </p>
              </button>

              {/* Individual Project Folder Cards */}
              {projectArchiveGroups.map((grp) => {
                const isSelected = selectedArchiveProjectId === grp.projectId;
                return (
                  <button
                    key={grp.projectId}
                    type="button"
                    onClick={() => setSelectedArchiveProjectId(grp.projectId)}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white hover:border-blue-300 text-slate-800 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <Folder
                            className={`w-4 h-4 shrink-0 ${
                              isSelected ? 'text-amber-300' : 'text-amber-500'
                            }`}
                          />
                          <span className="text-xs font-bold truncate">
                            {grp.projectName}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : grp.reports.length > 0
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {grp.reports.length} รายงาน
                        </span>
                      </div>
                    </div>

                    <div
                      className={`flex items-center justify-between text-[10px] pt-2 border-t ${
                        isSelected
                          ? 'border-blue-500 text-blue-100'
                          : 'border-slate-100 text-slate-500'
                      }`}
                    >
                      <span>📷 รูปแนบ {grp.totalPhotos} รูป</span>
                      <span className="font-semibold">
                        สะสม {grp.latestProgress}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Project Sections with Daily Reports */}
          <div className="space-y-6">
            {visibleProjectArchiveGroups.map((grp) => (
              <div
                key={`section-${grp.projectId}`}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden"
              >
                {/* Project Folder Banner Header */}
                <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                      <FolderOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-sm sm:text-base text-white">
                          {grp.projectName}
                        </h4>
                        <span className="text-[11px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full font-semibold">
                          {grp.reports.length} รายงาน
                        </span>
                        {grp.totalPhotos > 0 && (
                          <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-semibold">
                            รูปหน้างาน {grp.totalPhotos} รูป
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        ผู้ควบคุม/ผู้รายงาน: {grp.supervisorName || '-'} • ความก้าวหน้าสะสมล่าสุด:{' '}
                        <strong className="text-emerald-400">{grp.latestProgress}%</strong>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStartNewReportForProject(grp.projectId)}
                    className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    สร้างรายงานเพิ่มในโครงการนี้
                  </button>
                </div>

                {/* Reports List inside this Project */}
                {grp.reports.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/40">
                    ยังไม่มีรายงานความก้าวหน้าประจำวันในโครงการนี้ — กดปุ่ม{' '}
                    <button
                      type="button"
                      onClick={() => handleStartNewReportForProject(grp.projectId)}
                      className="text-blue-600 font-bold underline"
                    >
                      สร้างรายงานเพิ่มในโครงการนี้
                    </button>
                  </div>
                ) : (
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {grp.reports.map((rep) => {
                      const repPhotos = getNormalizedPhotos(rep);
                      const thaiDate = formatThaiDate(rep.date);
                      return (
                        <div
                          key={rep.id}
                          className="rounded-xl border border-slate-200 hover:border-blue-300 bg-white p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                        >
                          <div>
                            {/* Top Row: Number & Date */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                                {rep.reportNumber}
                              </span>
                              <span className="text-xs font-semibold text-slate-600">
                                📅 {thaiDate.fullText}
                              </span>
                            </div>

                            {/* Progress Pill */}
                            <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 mb-2.5 text-xs">
                              <span className="text-slate-600">ความก้าวหน้าสะสม:</span>
                              <span className="font-bold text-emerald-600">
                                {rep.accumulatedProgressPercent}%{' '}
                                <span className="text-[11px] font-normal text-slate-500">
                                  (+{rep.todayProgressPercent}%)
                                </span>
                              </span>
                            </div>

                            {/* Activities Description */}
                            <p className="text-xs text-slate-700 line-clamp-2 mb-3 leading-relaxed">
                              {rep.activitiesDescription || 'ไม่มีรายละเอียดกิจกรรม'}
                            </p>

                            {/* Labor & Machinery Summary */}
                            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/70 p-2 rounded-lg border border-slate-100 mb-3">
                              <div>
                                <span className="text-slate-400 block text-[10px]">
                                  ยอดแรงงาน:
                                </span>
                                <span className="font-bold text-slate-800">
                                  {rep.totalLaborCount} คน
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">
                                  เครื่องจักร:
                                </span>
                                <span className="font-bold text-slate-800">
                                  {rep.totalMachineryCount} คัน
                                </span>
                              </div>
                            </div>

                            {/* Attached Photos Strip */}
                            {repPhotos.length > 0 && (
                              <div className="mb-3">
                                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                                  <span className="font-semibold text-slate-700 flex items-center">
                                    <ImageIcon className="w-3.5 h-3.5 mr-1 text-blue-600" />
                                    รูปภาพแนบ ({repPhotos.length} รูป)
                                  </span>
                                  <span className="text-[10px] text-blue-600">
                                    คลิกที่รูปเพื่อขยาย
                                  </span>
                                </div>
                                <div className="grid grid-cols-4 gap-1.5">
                                  {repPhotos.slice(0, 4).map((p, idx) => (
                                    <button
                                      key={p.id || idx}
                                      type="button"
                                      onClick={() =>
                                        setLightboxPhoto({
                                          url: p.url,
                                          caption:
                                            p.caption || `ภาพถ่ายหน้างานที่ ${idx + 1}`,
                                          reportTitle: `${rep.reportNumber} (${rep.projectName})`,
                                        })
                                      }
                                      className="relative h-14 rounded-md overflow-hidden border border-slate-200 group"
                                      title={p.caption || `รูปที่ ${idx + 1}`}
                                    >
                                      <img
                                        src={p.url}
                                        alt={p.caption || ''}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                      />
                                      {idx === 3 && repPhotos.length > 4 && (
                                        <span className="absolute inset-0 bg-slate-900/70 text-white text-xs font-bold flex items-center justify-center">
                                          +{repPhotos.length - 4}
                                        </span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Footer Actions */}
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            <span className="text-[11px] text-slate-500 truncate">
                              ผู้รายงาน: {rep.reporterName}
                            </span>
                            <div className="flex items-center space-x-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setViewingHistoricalReport(rep)}
                                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>เปิดดู/พิมพ์</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditExistingReport(rep)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                title="แก้ไขรายงาน / เพิ่มรูปภาพ"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setReportToDelete(rep)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                title="ลบรายงาน"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Photo Lightbox Modal */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">{lightboxPhoto.caption}</h4>
                <p className="text-[11px] text-slate-400">{lightboxPhoto.reportTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-slate-950 flex items-center justify-center max-h-[75vh] overflow-hidden">
              <img
                src={lightboxPhoto.url}
                alt={lightboxPhoto.caption}
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Historical Report A4 Preview & Export Modal */}
      {viewingHistoricalReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-6">
            <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm sm:text-base">
                  รายงานประจำวัน {viewingHistoricalReport.reportNumber} —{' '}
                  {viewingHistoricalReport.projectName}
                </h3>
                <p className="text-[11px] text-slate-400">
                  ผู้รายงาน: {viewingHistoricalReport.reporterName}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const rep = viewingHistoricalReport;
                    setViewingHistoricalReport(null);
                    handleEditExistingReport(rep);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
                >
                  แก้ไข / เพิ่มรูปภาพ
                </button>
                <button
                  type="button"
                  onClick={() => setViewingHistoricalReport(null)}
                  className="text-slate-400 hover:text-white px-2 py-1 text-sm font-medium"
                >
                  ✕ ปิดหน้าต่าง
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <DocumentActionButtons
                elementId="modal-daily-report-print"
                documentTitle={`Daily_Report_${viewingHistoricalReport.reportNumber}`}
                fileName={`Daily_Report_${viewingHistoricalReport.reportNumber}`}
                documentData={viewingHistoricalReport}
              />
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100 flex justify-center">
              <DocumentZoomContainer
                defaultZoom={85}
                title={`รายงานประจำวัน ${viewingHistoricalReport.reportNumber}`}
                badge="ตรวจสอบรายงาน & รูปภาพแนบ"
                containerClassName="w-full"
              >
                <DailyReportPrint
                  report={viewingHistoricalReport}
                  containerId="modal-daily-report-print"
                />
              </DocumentZoomContainer>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete In-App Modal */}
      <ConfirmDeleteModal
        isOpen={!!reportToDelete}
        title="ยืนยันการลบรายงานประจำวัน"
        itemName={
          reportToDelete
            ? `รายงานประจำวัน ${reportToDelete.reportNumber} - ${reportToDelete.projectName}`
            : undefined
        }
        description="คุณต้องการลบรายงานประจำวันนี้ใช่หรือไม่? เมื่อลบแล้วจะไม่สามารถกู้คืนได้"
        confirmLabel="ลบรายงานนี้"
        cancelLabel="ยกเลิก"
        onConfirm={() => {
          if (reportToDelete) {
            onDeleteReport(reportToDelete.id);
            setReportToDelete(null);
          }
        }}
        onCancel={() => setReportToDelete(null)}
      />
    </div>
  );
};
