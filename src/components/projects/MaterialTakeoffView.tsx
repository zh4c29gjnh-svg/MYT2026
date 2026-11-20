/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  Project,
  ProjectGroup,
  ProjectTask,
  TaskMaterialItem,
  MaterialOrderStatus,
} from '../../types/types.ts';
import { DEFAULT_PROJECT_GROUPS } from '../../utils/projectWeights.ts';
import { getTaskProgressPercent } from './ProjectKanban.tsx';
import { DocumentActionButtons } from '../receipts/DocumentActionButtons.tsx';
import { DocumentZoomContainer } from '../common/DocumentZoomContainer.tsx';
import {
  MaterialTakeoffPrint,
  PhaseBlockData,
  AggregatedMaterialRow,
  formatThaiDateShort,
  formatDateRangeThai,
  formatQuantityDisplay,
} from './MaterialTakeoffPrint.tsx';
import {
  Package,
  Plus,
  Trash2,
  Search,
  ChevronDown,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ClipboardList,
  ArrowRight,
  Copy,
} from 'lucide-react';

interface MaterialTakeoffViewProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onNavigateToKanban?: () => void;
}

const COMMON_MATERIALS = [
  'ปูนซีเมนต์ปอร์ตแลนด์',
  'ปูนซีเมนต์ก่อ-ฉาบ',
  'ปูนกาวปูกระเบื้อง',
  'คอนกรีตผสมเสร็จ 240 ksc',
  'คอนกรีตผสมเสร็จ 280 ksc',
  'ทรายหยาบ',
  'ทรายละเอียด',
  'หินคลุก',
  'หิน 3/4',
  'เหล็กข้ออ้อย DB12',
  'เหล็กข้ออ้อย DB16',
  'เหล็กเส้นกลม RB6',
  'เหล็กเส้นกลม RB9',
  'ลวดผูกเหล็ก เบอร์ 18',
  'ไวร์เมช 4 มม.',
  'อิฐมวลเบา 7.5 ซม.',
  'อิฐมอญ',
  'แผ่นยิปซั่มบอร์ด 9 มม.',
  'โครงคร่าวฝ้า ซีไลน์',
  'กระเบื้องแกรนิตโต้ 60x60',
  'สีรองพื้นปูนใหม่',
  'สีน้ำอะคริลิคภายนอก',
  'สีน้ำอะคริลิคภายใน',
  'ท่อ PVC ชั้น 8.5 ขนาด 1 นิ้ว',
  'ท่อ PVC ชั้น 8.5 ขนาด 2 นิ้ว',
  'สายไฟ THW 2.5 sq.mm.',
  'สายไฟ THW 4 sq.mm.',
  'ไม้แบบ / ไม้อัดดำ 15 มม.',
  'ตะปูตอกไม้',
];

const COMMON_UNITS = [
  'ถุง',
  'คิว',
  'เส้น',
  'แผ่น',
  'ก้อน',
  'กก.',
  'ตัน',
  'เมตร',
  'ตร.ม.',
  'กล่อง',
  'ชุด',
  'ถัง',
  'แกลลอน',
  'ชิ้น',
  'ม้วน',
  'เที่ยว',
  'บาน',
  'ดวง',
];

function parseIsoDateLocal(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m, d);
}

function getTodayStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function diffDays(target: Date, base: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((target.getTime() - base.getTime()) / msPerDay);
}

function getDurationDays(startStr?: string, endStr?: string): number | null {
  const s = parseIsoDateLocal(startStr);
  const e = parseIsoDateLocal(endStr);
  if (!s || !e) return null;
  const days = diffDays(e, s) + 1;
  return days > 0 ? days : 1;
}

interface ScheduleReminder {
  level: 'urgent' | 'upcoming' | 'active' | 'done' | 'none';
  label: string;
}

function getTaskScheduleReminder(
  task: ProjectTask,
  materials: TaskMaterialItem[]
): ScheduleReminder {
  const progress = getTaskProgressPercent(task);
  const hasUnordered = materials.some((m) => m.status === 'not_ordered');
  const today = getTodayStart();
  const start = parseIsoDateLocal(task.startDate);
  const end = parseIsoDateLocal(task.endDate);

  if (progress >= 100) {
    return { level: 'done', label: 'กิจกรรมเสร็จสิ้น 100%' };
  }

  if (!start && !end) {
    return { level: 'none', label: 'ยังไม่ระบุวันที่ในหน้า 2.2' };
  }

  if (start) {
    const daysUntilStart = diffDays(start, today);
    if (daysUntilStart < 0) {
      if (end && diffDays(end, today) >= 0) {
        return {
          level: hasUnordered ? 'urgent' : 'active',
          label: hasUnordered
            ? 'อยู่ในช่วงใช้งาน (มีวัสดุยังไม่สั่ง)'
            : 'กำลังอยู่ในช่วงดำเนินการ',
        };
      }
      const overdueDays = Math.abs(daysUntilStart);
      return {
        level: hasUnordered ? 'urgent' : 'active',
        label: hasUnordered
          ? `เลยวันเริ่ม ${overdueDays} วัน (มีวัสดุยังไม่สั่ง)`
          : `เลยกำหนดเริ่ม ${overdueDays} วัน`,
      };
    }

    if (daysUntilStart === 0) {
      return {
        level: hasUnordered ? 'urgent' : 'active',
        label: hasUnordered
          ? 'เริ่มงานวันนี้ (มีวัสดุยังไม่สั่ง)'
          : 'กำหนดเริ่มงานวันนี้',
      };
    }

    if (daysUntilStart <= 3) {
      return {
        level: hasUnordered ? 'urgent' : 'upcoming',
        label: hasUnordered
          ? `เร่งสั่งวัสดุ · เริ่มในอีก ${daysUntilStart} วัน`
          : `ใกล้เริ่มงาน (อีก ${daysUntilStart} วัน)`,
      };
    }

    if (daysUntilStart <= 7) {
      return {
        level: 'upcoming',
        label: `เตรียมวัสดุ · เริ่มในอีก ${daysUntilStart} วัน`,
      };
    }

    return {
      level: 'none',
      label: `เริ่มในอีก ${daysUntilStart} วัน`,
    };
  }

  return { level: 'none', label: 'กำหนดสิ้นสุด ' + formatThaiDateShort(endStr(task)) };
}

function endStr(task: ProjectTask): string | undefined {
  return task.endDate;
}

function getMaterialDateUrgency(
  requiredDate?: string,
  status?: MaterialOrderStatus
): 'urgent' | 'upcoming' | null {
  if (!requiredDate || status !== 'not_ordered') return null;
  const target = parseIsoDateLocal(requiredDate);
  if (!target) return null;
  const days = diffDays(target, getTodayStart());
  if (days <= 3) return 'urgent';
  if (days <= 7) return 'upcoming';
  return null;
}

function computePhaseDateBounds(
  group: ProjectGroup,
  tasks: ProjectTask[]
): { startDate?: string; endDate?: string } {
  const starts = tasks
    .map((t) => t.startDate)
    .filter((d): d is string => Boolean(d))
    .sort();
  const ends = tasks
    .map((t) => t.endDate)
    .filter((d): d is string => Boolean(d))
    .sort();

  return {
    startDate: starts[0] || group.startDate,
    endDate: ends[ends.length - 1] || group.endDate,
  };
}

export const MaterialTakeoffView: React.FC<MaterialTakeoffViewProps> = ({
  project,
  onUpdateProject,
  onNavigateToKanban,
}) => {
  const [viewMode, setViewMode] = useState<'by_activity' | 'summary'>(
    'by_activity'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | MaterialOrderStatus | 'URGENT'
  >('ALL');
  const [collapsedPhases, setCollapsedPhases] = useState<
    Record<string, boolean>
  >({});
  const [collapsedTasks, setCollapsedTasks] = useState<Record<string, boolean>>(
    {}
  );
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const previewSectionRef = useRef<HTMLDivElement | null>(null);

  const groups: ProjectGroup[] = useMemo(() => {
    if (project.groups && project.groups.length > 0) return project.groups;
    if (project.groupsInitialized) return [];
    return DEFAULT_PROJECT_GROUPS;
  }, [project.groups, project.groupsInitialized]);

  // Also capture any orphan tasks whose groupName isn't in groups list
  const effectiveGroups: ProjectGroup[] = useMemo(() => {
    const names = new Set(groups.map((g) => g.name));
    const extras: ProjectGroup[] = [];
    for (const t of project.tasks) {
      if (t.groupName && !names.has(t.groupName)) {
        names.add(t.groupName);
        extras.push({ id: `extra_${t.groupName}`, name: t.groupName });
      }
    }
    return [...groups, ...extras];
  }, [groups, project.tasks]);

  // Compute complete project metrics (unfiltered)
  const overallStats = useMemo(() => {
    let totalMaterials = 0;
    let notOrdered = 0;
    let ordered = 0;
    let delivered = 0;
    let urgentTasksCount = 0;
    let tasksWithMaterials = 0;

    for (const task of project.tasks) {
      const mats = task.materials || [];
      if (mats.length > 0) tasksWithMaterials += 1;
      totalMaterials += mats.length;
      for (const m of mats) {
        if (m.status === 'delivered') delivered += 1;
        else if (m.status === 'ordered') ordered += 1;
        else notOrdered += 1;
      }
      const reminder = getTaskScheduleReminder(task, mats);
      if (reminder.level === 'urgent') {
        urgentTasksCount += 1;
      }
    }

    return {
      phaseCount: effectiveGroups.length,
      taskCount: project.tasks.length,
      tasksWithMaterials,
      totalMaterials,
      notOrdered,
      ordered,
      delivered,
      urgentTasksCount,
    };
  }, [effectiveGroups.length, project.tasks]);

  // Build filtered phase blocks
  const phaseBlocks: PhaseBlockData[] = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return effectiveGroups
      .filter(
        (g) => selectedPhaseFilter === 'ALL' || g.name === selectedPhaseFilter
      )
      .map((group) => {
        const groupTasks = project.tasks.filter(
          (t) => t.groupName === group.name
        );
        const { startDate, endDate } = computePhaseDateBounds(
          group,
          groupTasks
        );

        const filteredTasks = groupTasks
          .map((task) => {
            const allMats = task.materials || [];
            const reminder = getTaskScheduleReminder(task, allMats);

            // Apply status filter on materials
            let mats = allMats;
            if (statusFilter === 'URGENT') {
              mats = allMats.filter(
                (m) =>
                  m.status === 'not_ordered' &&
                  (reminder.level === 'urgent' ||
                    getMaterialDateUrgency(m.requiredDate, m.status) ===
                      'urgent')
              );
            } else if (statusFilter !== 'ALL') {
              mats = allMats.filter((m) => m.status === statusFilter);
            }

            // Apply search filter
            if (q) {
              const phaseMatches = group.name.toLowerCase().includes(q);
              const taskMatches = task.title.toLowerCase().includes(q);
              const matchingMats = mats.filter(
                (m) =>
                  m.name.toLowerCase().includes(q) ||
                  m.spec.toLowerCase().includes(q) ||
                  m.unit.toLowerCase().includes(q) ||
                  (m.notes || '').toLowerCase().includes(q)
              );

              if (!phaseMatches && !taskMatches && matchingMats.length === 0) {
                return null;
              }
              if (!phaseMatches && !taskMatches) {
                mats = matchingMats;
              }
            }

            // When filtering by specific status/urgent, keep only tasks with matching materials or urgent reminder
            if (statusFilter === 'URGENT') {
              if (mats.length === 0 && reminder.level !== 'urgent') {
                return null;
              }
            } else if (statusFilter !== 'ALL' && mats.length === 0) {
              return null;
            }

            return { task, materials: mats };
          })
          .filter(
            (
              entry
            ): entry is { task: ProjectTask; materials: TaskMaterialItem[] } =>
              entry !== null
          );

        const totalMaterials = filteredTasks.reduce(
          (sum, t) => sum + t.materials.length,
          0
        );

        return {
          group,
          phaseStartDate: startDate,
          phaseEndDate: endDate,
          tasks: filteredTasks,
          totalMaterials,
        };
      })
      .filter((block) => {
        if (
          q ||
          statusFilter !== 'ALL' ||
          selectedPhaseFilter !== 'ALL'
        ) {
          return (
            block.tasks.length > 0 ||
            selectedPhaseFilter === block.group.name
          );
        }
        return true;
      });
  }, [effectiveGroups, project.tasks, searchTerm, selectedPhaseFilter, statusFilter]);

  // Build aggregated material list across filtered blocks
  const aggregatedRows: AggregatedMaterialRow[] = useMemo(() => {
    const map = new Map<string, AggregatedMaterialRow>();

    for (const block of phaseBlocks) {
      for (const { task, materials } of block.tasks) {
        for (const m of materials) {
          const cleanName = (m.name || '').trim();
          if (!cleanName) continue;
          const cleanSpec = (m.spec || '').trim();
          const cleanUnit = (m.unit || '').trim();
          const key = `${cleanName.toLowerCase()}__${cleanSpec.toLowerCase()}__${cleanUnit.toLowerCase()}`;

          const existing = map.get(key);
          const qty = Number(m.quantity) || 0;
          const reqDate = m.requiredDate || task.startDate;

          if (!existing) {
            map.set(key, {
              key,
              name: cleanName,
              spec: cleanSpec,
              unit: cleanUnit,
              totalQuantity: qty,
              notOrderedQty: m.status === 'not_ordered' ? qty : 0,
              orderedQty: m.status === 'ordered' ? qty : 0,
              deliveredQty: m.status === 'delivered' ? qty : 0,
              earliestRequiredDate: reqDate,
              usedInTasks: [`${block.group.name}: ${task.title}`],
            });
          } else {
            existing.totalQuantity = parseFloat(
              (existing.totalQuantity + qty).toFixed(4)
            );
            if (m.status === 'not_ordered') {
              existing.notOrderedQty = parseFloat(
                (existing.notOrderedQty + qty).toFixed(4)
              );
            } else if (m.status === 'ordered') {
              existing.orderedQty = parseFloat(
                (existing.orderedQty + qty).toFixed(4)
              );
            } else if (m.status === 'delivered') {
              existing.deliveredQty = parseFloat(
                (existing.deliveredQty + qty).toFixed(4)
              );
            }
            if (
              reqDate &&
              (!existing.earliestRequiredDate ||
                reqDate < existing.earliestRequiredDate)
            ) {
              existing.earliestRequiredDate = reqDate;
            }
            const taskLabel = `${block.group.name}: ${task.title}`;
            if (!existing.usedInTasks.includes(taskLabel)) {
              existing.usedInTasks.push(taskLabel);
            }
          }
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.earliestRequiredDate && b.earliestRequiredDate) {
        return a.earliestRequiredDate.localeCompare(b.earliestRequiredDate);
      }
      if (a.earliestRequiredDate) return -1;
      if (b.earliestRequiredDate) return 1;
      return a.name.localeCompare(b.name, 'th');
    });
  }, [phaseBlocks]);

  // --- Mutations (auto-saved into Project via onUpdateProject) ---

  const updateTaskMaterials = (
    taskId: string,
    updater: (prev: TaskMaterialItem[]) => TaskMaterialItem[]
  ) => {
    const updatedTasks = project.tasks.map((t) => {
      if (t.id !== taskId) return t;
      const prev = t.materials || [];
      return {
        ...t,
        materials: updater(prev),
      };
    });

    onUpdateProject({
      ...project,
      tasks: updatedTasks,
    });
  };

  const handleAddMaterial = (task: ProjectTask) => {
    // Ensure task and phase are expanded when adding
    setCollapsedTasks((prev) => ({ ...prev, [task.id]: false }));
    const newItem: TaskMaterialItem = {
      id: `mat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: '',
      spec: '',
      quantity: 1,
      unit: 'ถุง',
      requiredDate: task.startDate || '',
      status: 'not_ordered',
      notes: '',
    };
    updateTaskMaterials(task.id, (prev) => [...prev, newItem]);
  };

  const handleDuplicateMaterial = (
    taskId: string,
    source: TaskMaterialItem
  ) => {
    const cloned: TaskMaterialItem = {
      ...source,
      id: `mat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    updateTaskMaterials(taskId, (prev) => [...prev, cloned]);
  };

  const handleUpdateMaterialField = <K extends keyof TaskMaterialItem>(
    taskId: string,
    materialId: string,
    field: K,
    value: TaskMaterialItem[K]
  ) => {
    updateTaskMaterials(taskId, (prev) =>
      prev.map((m) => (m.id === materialId ? { ...m, [field]: value } : m))
    );
  };

  const handleDeleteMaterial = (taskId: string, materialId: string) => {
    updateTaskMaterials(taskId, (prev) =>
      prev.filter((m) => m.id !== materialId)
    );
  };

  const handleSyncRequiredDatesToTaskStart = (task: ProjectTask) => {
    if (!task.startDate) return;
    updateTaskMaterials(task.id, (prev) =>
      prev.map((m) => ({
        ...m,
        requiredDate: m.requiredDate || task.startDate,
      }))
    );
  };

  const handleToggleAllPhases = (collapse: boolean) => {
    const next: Record<string, boolean> = {};
    for (const g of effectiveGroups) {
      next[g.id] = collapse;
    }
    setCollapsedPhases(next);
  };

  const handlePreviewToggle = () => {
    setShowPrintPreview((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => {
          previewSectionRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }, 80);
      }
      return next;
    });
  };

  const safeFileSlug = (project.name || 'project')
    .replace(/[^\u0E00-\u0E7Fa-zA-Z0-9_-]+/g, '_')
    .slice(0, 48);

  const exportFileName =
    viewMode === 'by_activity'
      ? `ถอดวัสดุตามกิจกรรม_${safeFileSlug}`
      : `สรุปรวมถอดวัสดุ_${safeFileSlug}`;

  const activeFilterSummary = useMemo(() => {
    const parts: string[] = [];
    if (selectedPhaseFilter !== 'ALL') {
      parts.push(`งวด: ${selectedPhaseFilter}`);
    }
    if (statusFilter === 'not_ordered') parts.push('สถานะ: ยังไม่สั่ง');
    else if (statusFilter === 'ordered') parts.push('สถานะ: สั่งแล้ว');
    else if (statusFilter === 'delivered') parts.push('สถานะ: ถึงหน้างานแล้ว');
    else if (statusFilter === 'URGENT') parts.push('เฉพาะรายการเร่งด่วน');
    return parts.join(' · ');
  }, [selectedPhaseFilter, statusFilter]);

  return (
    <div className="space-y-5 font-sans">
      {/* Global autocomplete datalists for Thai construction materials & units */}
      <datalist id="myt-common-materials">
        {COMMON_MATERIALS.map((mat) => (
          <option key={mat} value={mat} />
        ))}
      </datalist>
      <datalist id="myt-common-units">
        {COMMON_UNITS.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>

      {/* Top Header & Metrics Bar (Single-elevation, clean unboxed metadata) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Package className="w-5 h-5 text-blue-600 shrink-0" />
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                2.3 ถอดวัสดุตามกิจกรรม
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 tabular-nums">
              <span className="font-semibold text-slate-700">
                {project.name}
              </span>
              {project.code && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{project.code}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>
                ระยะเวลาโครงการ {formatDateRangeThai(project.startDate, project.endDate)}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                ดึงข้อมูลอัตโนมัติจาก 2.2 กิจกรรมการทำงาน ({overallStats.phaseCount}{' '}
                งวดงาน / {overallStats.taskCount} กิจกรรม)
              </span>
            </div>
          </div>

          {/* Segmented View Switch */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 self-start lg:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('by_activity')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                viewMode === 'by_activity'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              แยกตามงวดงานและกิจกรรม
            </button>
            <button
              type="button"
              onClick={() => setViewMode('summary')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                viewMode === 'summary'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              สรุปรวมวัสดุ ({aggregatedRows.length})
            </button>
          </div>
        </div>

        {/* Clean Tabular Summary Strip (No nested card sandwiches) */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 tabular-nums">
          <div>
            <div className="text-[11px] font-medium text-slate-500">
              รายการวัสดุทั้งหมด
            </div>
            <div className="mt-0.5 text-xl font-bold text-slate-900">
              {overallStats.totalMaterials}{' '}
              <span className="text-xs font-normal text-slate-500">
                รายการ ({overallStats.tasksWithMaterials}/{overallStats.taskCount} กิจกรรม)
              </span>
            </div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-amber-700">
              ยังไม่สั่งซื้อ
            </div>
            <div className="mt-0.5 text-xl font-bold text-amber-700">
              {overallStats.notOrdered}{' '}
              <span className="text-xs font-normal text-slate-500">รายการ</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-blue-700">
              สั่งซื้อแล้ว (รอจัดส่ง)
            </div>
            <div className="mt-0.5 text-xl font-bold text-blue-700">
              {overallStats.ordered}{' '}
              <span className="text-xs font-normal text-slate-500">รายการ</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-emerald-700">
              ถึงหน้างานแล้ว
            </div>
            <div className="mt-0.5 text-xl font-bold text-emerald-700">
              {overallStats.delivered}{' '}
              <span className="text-xs font-normal text-slate-500">รายการ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Document Export Toolbar (PDF / PNG / Print / iPad / Google Drive) */}
      <DocumentActionButtons
        elementId="material-takeoff-print-preview"
        documentTitle={`ใบถอดวัสดุตามกิจกรรม - ${project.name}`}
        fileName={exportFileName}
        onPreviewToggle={handlePreviewToggle}
        isPreviewMode={showPrintPreview}
      />

      {/* Schedule Reminder Alert Banner when urgent un-ordered materials exist */}
      {overallStats.urgentTasksCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-start sm:items-center gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-bold">
                แจ้งเตือนกำหนดใช้วัสดุ: พบ {overallStats.urgentTasksCount}{' '}
                กิจกรรม
              </span>{' '}
              ที่อยู่ในช่วงดำเนินงานหรือใกล้ถึงวันเริ่มงาน (ภายใน 3 วัน)
              แต่ยังมีรายการวัสดุสถานะ <strong>&ldquo;ยังไม่สั่ง&rdquo;</strong>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              setStatusFilter(statusFilter === 'URGENT' ? 'ALL' : 'URGENT')
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              statusFilter === 'URGENT'
                ? 'bg-amber-700 text-white'
                : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
            }`}
          >
            {statusFilter === 'URGENT'
              ? 'แสดงทั้งหมด'
              : 'กรองดูเฉพาะรายการเร่งด่วน'}
          </button>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหางวดงาน, กิจกรรม, ชื่อวัสดุ, สเปค..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Phase Filter */}
          <select
            value={selectedPhaseFilter}
            onChange={(e) => setSelectedPhaseFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">ทุกคอลัมน์งวดงาน ({effectiveGroups.length})</option>
            {effectiveGroups.map((g) => (
              <option key={g.id} value={g.name}>
                {g.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as 'ALL' | MaterialOrderStatus | 'URGENT'
              )
            }
            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">สถานะสั่งซื้อ: ทั้งหมด</option>
            <option value="not_ordered">ยังไม่สั่ง ({overallStats.notOrdered})</option>
            <option value="ordered">สั่งแล้ว ({overallStats.ordered})</option>
            <option value="delivered">ถึงหน้างานแล้ว ({overallStats.delivered})</option>
            <option value="URGENT">เร่งด่วน (ใกล้/ถึงวันใช้งาน)</option>
          </select>
        </div>

        {/* Collapse / Expand + Link to 2.2 */}
        <div className="flex items-center gap-2 shrink-0">
          {viewMode === 'by_activity' && (
            <>
              <button
                type="button"
                onClick={() => handleToggleAllPhases(false)}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                กางทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => handleToggleAllPhases(true)}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                พับทั้งหมด
              </button>
            </>
          )}
          {onNavigateToKanban && (
            <button
              type="button"
              onClick={onNavigateToKanban}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              title="ไปแก้ไขคอลัมน์งวดงาน กิจกรรม หรือวันที่เริ่ม–สิ้นสุดในหน้า 2.2"
            >
              <span>แก้ไขงวด/วันที่ใน 2.2</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* VIEW 1: ตารางเรียงตามงวดงาน → กิจกรรม → ถอดวัสดุที่ใช้ในกิจกรรม    */}
      {/* ================================================================= */}
      {viewMode === 'by_activity' && (
        <div className="space-y-4 print:hidden">
          {effectiveGroups.length === 0 || project.tasks.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">
                ยังไม่มีงวดงานหรือกิจกรรมจากหน้า 2.2
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                กรุณาเพิ่มคอลัมน์งวดงานและกิจกรรมพร้อมวันที่เริ่ม–สิ้นสุดในหน้า
                2.2 กิจกรรมการทำงาน จากนั้นข้อมูลจะถูกดึงมาแสดงในหน้านี้ให้อัตโนมัติ
              </p>
              {onNavigateToKanban && (
                <button
                  type="button"
                  onClick={onNavigateToKanban}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  ไปที่หน้า 2.2 กิจกรรมการทำงาน
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : phaseBlocks.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-700">
                ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา / ตัวกรอง
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedPhaseFilter('ALL');
                  setStatusFilter('ALL');
                }}
                className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          ) : (
            phaseBlocks.map((block) => {
              const isPhaseCollapsed = Boolean(collapsedPhases[block.group.id]);
              const phaseDuration = getDurationDays(
                block.phaseStartDate,
                block.phaseEndDate
              );
              const phaseNotOrdered = block.tasks.reduce(
                (s, t) =>
                  s +
                  t.materials.filter((m) => m.status === 'not_ordered').length,
                0
              );

              return (
                <section
                  key={block.group.id}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                >
                  {/* Phase Header (คอลัมน์งวดงาน + วันที่แสดงในงวดนี้) */}
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedPhases((prev) => ({
                        ...prev,
                        [block.group.id]: !prev[block.group.id],
                      }))
                    }
                    className="w-full px-5 py-3.5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left hover:bg-slate-800/95 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ChevronDown
                        className={`w-4 h-4 text-slate-300 shrink-0 transition-transform duration-150 ${
                          isPhaseCollapsed ? '-rotate-90' : 'rotate-0'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                          <span className="text-xs font-medium text-slate-300">
                            คอลัมน์งวดงาน:
                          </span>
                          <h3 className="text-sm font-bold text-white truncate">
                            {block.group.name}
                          </h3>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-300 tabular-nums">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-sky-300" />
                            วันที่แสดงในงวดนี้:{' '}
                            <strong className="text-white font-semibold">
                              {formatDateRangeThai(
                                block.phaseStartDate,
                                block.phaseEndDate
                              )}
                            </strong>
                            {phaseDuration !== null && (
                              <span className="text-slate-300">
                                ({phaseDuration} วัน)
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-200 tabular-nums shrink-0 pl-7 sm:pl-0">
                      <span>{block.tasks.length} กิจกรรม</span>
                      <span aria-hidden="true">·</span>
                      <span>{block.totalMaterials} รายการวัสดุ</span>
                      {phaseNotOrdered > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-300 font-semibold">
                            ยังไม่สั่ง {phaseNotOrdered}
                          </span>
                        </>
                      )}
                    </div>
                  </button>

                  {/* Activities inside this Phase */}
                  {!isPhaseCollapsed && (
                    <div className="divide-y divide-slate-200">
                      {block.tasks.length === 0 ? (
                        <div className="px-5 py-6 text-xs text-slate-500 text-center">
                          ยังไม่มีกิจกรรมในงวดงานนี้ (สามารถเพิ่มได้ที่หน้า 2.2
                          กิจกรรมการทำงาน)
                        </div>
                      ) : (
                        block.tasks.map(({ task, materials }, taskIdx) => {
                          const isTaskCollapsed = Boolean(
                            collapsedTasks[task.id]
                          );
                          const taskProgress = getTaskProgressPercent(task);
                          const taskDuration = getDurationDays(
                            task.startDate,
                            task.endDate
                          );
                          const reminder = getTaskScheduleReminder(
                            task,
                            task.materials || []
                          );
                          const hasMissingDates =
                            Boolean(task.startDate) &&
                            materials.some((m) => !m.requiredDate);

                          return (
                            <div key={task.id} className="bg-white">
                              {/* Activity Header Row (กิจกรรมในงวดนี้ + วันที่เริ่ม-สิ้นสุด + แจ้งเตือน) */}
                              <div className="px-5 py-3.5 bg-slate-50/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCollapsedTasks((prev) => ({
                                        ...prev,
                                        [task.id]: !prev[task.id],
                                      }))
                                    }
                                    className="mt-0.5 p-1 rounded hover:bg-slate-200/70 text-slate-500 transition-colors cursor-pointer shrink-0"
                                    title={
                                      isTaskCollapsed
                                        ? 'กางตารางถอดวัสดุ'
                                        : 'พับตารางถอดวัสดุ'
                                    }
                                  >
                                    <ChevronDown
                                      className={`w-4 h-4 transition-transform duration-150 ${
                                        isTaskCollapsed
                                          ? '-rotate-90'
                                          : 'rotate-0'
                                      }`}
                                    />
                                  </button>

                                  <div className="min-w-0 space-y-1">
                                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                      <span className="text-xs font-semibold text-slate-400 tabular-nums">
                                        กิจกรรมที่ {taskIdx + 1}
                                      </span>
                                      <h4 className="text-sm font-bold text-slate-900">
                                        {task.title}
                                      </h4>
                                    </div>

                                    {/* Date Range + Reminder + Progress (Clean unboxed metadata) */}
                                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs tabular-nums">
                                      <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                                        <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                        ช่วงวันที่ใช้งาน:{' '}
                                        <strong className="text-slate-900">
                                          {formatDateRangeThai(
                                            task.startDate,
                                            task.endDate
                                          )}
                                        </strong>
                                        {taskDuration !== null && (
                                          <span className="text-slate-500">
                                            ({taskDuration} วัน)
                                          </span>
                                        )}
                                      </span>

                                      <span
                                        className="text-slate-300"
                                        aria-hidden="true"
                                      >
                                        ·
                                      </span>

                                      {/* Semantic Schedule Alert Label */}
                                      <span
                                        className={`inline-flex items-center gap-1 font-semibold ${
                                          reminder.level === 'urgent'
                                            ? 'text-rose-700'
                                            : reminder.level === 'upcoming'
                                            ? 'text-amber-700'
                                            : reminder.level === 'active'
                                            ? 'text-blue-700'
                                            : reminder.level === 'done'
                                            ? 'text-emerald-700'
                                            : 'text-slate-500 font-normal'
                                        }`}
                                      >
                                        {reminder.level === 'urgent' && (
                                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                        )}
                                        {reminder.level === 'upcoming' && (
                                          <Clock className="w-3.5 h-3.5 shrink-0" />
                                        )}
                                        {reminder.level === 'done' && (
                                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                        )}
                                        {reminder.label}
                                      </span>

                                      <span
                                        className="text-slate-300"
                                        aria-hidden="true"
                                      >
                                        ·
                                      </span>

                                      <span className="text-slate-500">
                                        ความคืบหน้า {taskProgress}%
                                      </span>

                                      <span
                                        className="text-slate-300"
                                        aria-hidden="true"
                                      >
                                        ·
                                      </span>

                                      <span className="text-slate-600 font-medium">
                                        ถอดวัสดุ {materials.length} รายการ
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 pl-8 lg:pl-0">
                                  {hasMissingDates && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSyncRequiredDatesToTaskStart(task)
                                      }
                                      className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                                      title="เติมวันที่เริ่มกิจกรรมลงในช่องวันที่ต้องใช้วัสดุที่ยังว่าง"
                                    >
                                      ดึงวันเริ่มกิจกรรม
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleAddMaterial(task)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    เพิ่มวัสดุในกิจกรรมนี้
                                  </button>
                                </div>
                              </div>

                              {/* Section: ถอดวัสดุที่ใช้ในกิจกรรม */}
                              {!isTaskCollapsed && (
                                <div className="px-5 py-3.5">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-700">
                                      ถอดวัสดุที่ใช้ในกิจกรรม
                                    </span>
                                    {task.startDate && (
                                      <span className="text-[11px] text-slate-500 tabular-nums">
                                        แนะนำสั่งก่อนวันเริ่มงาน:{' '}
                                        <strong className="text-slate-700">
                                          {formatThaiDateShort(task.startDate)}
                                        </strong>
                                      </span>
                                    )}
                                  </div>

                                  {materials.length === 0 ? (
                                    <div className="border border-dashed border-slate-200 rounded-lg py-5 px-4 flex flex-col sm:flex-row items-center justify-between gap-2 bg-slate-50/40">
                                      <span className="text-xs text-slate-500">
                                        ยังไม่มีรายการถอดวัสดุสำหรับกิจกรรมนี้
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleAddMaterial(task)}
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        เพิ่มรายการวัสดุแรก
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                      <table className="w-full min-w-[860px] border-collapse text-xs">
                                        <thead>
                                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                            <th className="py-2 px-2.5 text-center font-semibold w-10">
                                              #
                                            </th>
                                            <th className="py-2 px-2.5 text-left font-semibold min-w-[180px]">
                                              ชื่อวัสดุ
                                            </th>
                                            <th className="py-2 px-2.5 text-left font-semibold min-w-[150px]">
                                              รายละเอียด / สเปค
                                            </th>
                                            <th className="py-2 px-2.5 text-right font-semibold w-24">
                                              จำนวน
                                            </th>
                                            <th className="py-2 px-2.5 text-left font-semibold w-24">
                                              หน่วย
                                            </th>
                                            <th className="py-2 px-2.5 text-left font-semibold w-36">
                                              วันที่ต้องใช้หน้างาน
                                            </th>
                                            <th className="py-2 px-2.5 text-left font-semibold w-36">
                                              สถานะการสั่งซื้อ
                                            </th>
                                            <th className="py-2 px-2.5 text-left font-semibold min-w-[140px]">
                                              หมายเหตุ
                                            </th>
                                            <th className="py-2 px-2 text-center font-semibold w-16">
                                              จัดการ
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {materials.map((mat, matIdx) => {
                                            const dateUrgency =
                                              getMaterialDateUrgency(
                                                mat.requiredDate,
                                                mat.status
                                              );
                                            const statusSelectClass =
                                              mat.status === 'delivered'
                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                                                : mat.status === 'ordered'
                                                ? 'bg-blue-50 text-blue-800 border-blue-200 font-semibold'
                                                : 'bg-amber-50 text-amber-800 border-amber-200 font-semibold';

                                            return (
                                              <tr
                                                key={mat.id}
                                                className="hover:bg-slate-50/70 transition-colors"
                                              >
                                                <td className="py-2 px-2.5 text-center text-slate-400 tabular-nums">
                                                  {matIdx + 1}
                                                </td>

                                                {/* ชื่อวัสดุ */}
                                                <td className="py-1.5 px-2">
                                                  <input
                                                    type="text"
                                                    list="myt-common-materials"
                                                    value={mat.name}
                                                    onChange={(e) =>
                                                      handleUpdateMaterialField(
                                                        task.id,
                                                        mat.id,
                                                        'name',
                                                        e.target.value
                                                      )
                                                    }
                                                    placeholder="เช่น ปูนซีเมนต์, เหล็ก DB12"
                                                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                  />
                                                </td>

                                                {/* รายละเอียด / สเปค */}
                                                <td className="py-1.5 px-2">
                                                  <input
                                                    type="text"
                                                    value={mat.spec}
                                                    onChange={(e) =>
                                                      handleUpdateMaterialField(
                                                        task.id,
                                                        mat.id,
                                                        'spec',
                                                        e.target.value
                                                      )
                                                    }
                                                    placeholder="ขนาด / ยี่ห้อ / รุ่น"
                                                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                  />
                                                </td>

                                                {/* จำนวน */}
                                                <td className="py-1.5 px-2">
                                                  <input
                                                    type="number"
                                                    min={0}
                                                    step="any"
                                                    value={
                                                      mat.quantity === 0
                                                        ? ''
                                                        : mat.quantity
                                                    }
                                                    onChange={(e) => {
                                                      const v = parseFloat(
                                                        e.target.value
                                                      );
                                                      handleUpdateMaterialField(
                                                        task.id,
                                                        mat.id,
                                                        'quantity',
                                                        isNaN(v) ? 0 : v
                                                      );
                                                    }}
                                                    placeholder="0"
                                                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-right font-semibold tabular-nums text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                  />
                                                </td>

                                                {/* หน่วย */}
                                                <td className="py-1.5 px-2">
                                                  <input
                                                    type="text"
                                                    list="myt-common-units"
                                                    value={mat.unit}
                                                    onChange={(e) =>
                                                      handleUpdateMaterialField(
                                                        task.id,
                                                        mat.id,
                                                        'unit',
                                                        e.target.value
                                                      )
                                                    }
                                                    placeholder="ถุง/คิว/เส้น"
                                                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                  />
                                                </td>

                                                {/* วันที่ต้องใช้หน้างาน */}
                                                <td className="py-1.5 px-2">
                                                  <input
                                                    type="date"
                                                    value={mat.requiredDate || ''}
                                                    onChange={(e) =>
                                                      handleUpdateMaterialField(
                                                        task.id,
                                                        mat.id,
                                                        'requiredDate',
                                                        e.target.value
                                                      )
                                                    }
                                                    className={`w-full px-2 py-1.5 border rounded-md text-xs tabular-nums focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                                                      dateUrgency === 'urgent'
                                                        ? 'bg-rose-50 border-rose-300 text-rose-800 font-semibold'
                                                        : dateUrgency ===
                                                          'upcoming'
                                                        ? 'bg-amber-50 border-amber-300 text-amber-900 font-medium'
                                                        : 'bg-white border-slate-200 text-slate-800'
                                                    }`}
                                                  />
                                                </td>

                                                {/* สถานะการสั่งซื้อ */}
                                                <td className="py-1.5 px-2">
                                                  <select
                                                    value={mat.status}
                                                    onChange={(e) =>
                                                      handleUpdateMaterialField(
                                                        task.id,
                                                        mat.id,
                                                        'status',
                                                        e.target
                                                          .value as MaterialOrderStatus
                                                      )
                                                    }
                                                    className={`w-full px-2 py-1.5 border rounded-md text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer ${statusSelectClass}`}
                                                  >
                                                    <option value="not_ordered">
                                                      ยังไม่สั่ง
                                                    </option>
                                                    <option value="ordered">
                                                      สั่งแล้ว
                                                    </option>
                                                    <option value="delivered">
                                                      ถึงหน้างานแล้ว
                                                    </option>
                                                  </select>
                                                </td>

                                                {/* หมายเหตุ */}
                                                <td className="py-1.5 px-2">
                                                  <input
                                                    type="text"
                                                    value={mat.notes || ''}
                                                    onChange={(e) =>
                                                      handleUpdateMaterialField(
                                                        task.id,
                                                        mat.id,
                                                        'notes',
                                                        e.target.value
                                                      )
                                                    }
                                                    placeholder="ร้านค้า / เผื่อเสีย"
                                                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                  />
                                                </td>

                                                {/* จัดการ */}
                                                <td className="py-1.5 px-2 text-center">
                                                  <div className="inline-flex items-center gap-1">
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        handleDuplicateMaterial(
                                                          task.id,
                                                          mat
                                                        )
                                                      }
                                                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                                      title="คัดลอกแถวนี้"
                                                    >
                                                      <Copy className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        handleDeleteMaterial(
                                                          task.id,
                                                          mat.id
                                                        )
                                                      }
                                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                                      title="ลบรายการวัสดุนี้"
                                                    >
                                                      <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}

                                  {materials.length > 0 && (
                                    <div className="mt-2 flex items-center justify-end">
                                      <button
                                        type="button"
                                        onClick={() => handleAddMaterial(task)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        เพิ่มแถววัสดุ
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* VIEW 2: สรุปรวมวัสดุทั้งโครงการ (รวมรายการซ้ำเพื่อออกใบสั่งซื้อ)    */}
      {/* ================================================================= */}
      {viewMode === 'summary' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print:hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                ตารางสรุปรวมวัสดุเพื่อสั่งซื้อ (เรียงตามวันที่ต้องใช้เร็วสุด)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                รวมยอดอัตโนมัติสำหรับวัสดุที่ชื่อ สเปค และหน่วยเหมือนกันจากทุกกิจกรรมที่เลือก
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600 tabular-nums">
              รวม {aggregatedRows.length} รายการวัสดุ
            </span>
          </div>

          {aggregatedRows.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-700">
                ยังไม่มีรายการวัสดุสำหรับสรุปรวม
              </p>
              <p className="text-xs text-slate-500">
                สลับไปที่แท็บ &ldquo;แยกตามงวดงานและกิจกรรม&rdquo;
                เพื่อกรอกรายการถอดวัสดุใต้แต่ละกิจกรรมก่อน
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-2.5 px-3 text-center font-semibold w-12">
                      ลำดับ
                    </th>
                    <th className="py-2.5 px-3 text-left font-semibold">
                      ชื่อวัสดุ
                    </th>
                    <th className="py-2.5 px-3 text-left font-semibold">
                      รายละเอียด / สเปค
                    </th>
                    <th className="py-2.5 px-3 text-right font-semibold w-24">
                      รวมจำนวน
                    </th>
                    <th className="py-2.5 px-3 text-center font-semibold w-20">
                      หน่วย
                    </th>
                    <th className="py-2.5 px-3 text-center font-semibold w-28">
                      ต้องใช้เร็วสุด
                    </th>
                    <th className="py-2.5 px-3 text-right font-semibold w-24 text-amber-700">
                      ยังไม่สั่ง
                    </th>
                    <th className="py-2.5 px-3 text-right font-semibold w-24 text-blue-700">
                      สั่งแล้ว
                    </th>
                    <th className="py-2.5 px-3 text-right font-semibold w-24 text-emerald-700">
                      ถึงหน้างาน
                    </th>
                    <th className="py-2.5 px-3 text-left font-semibold">
                      ใช้ในกิจกรรม
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aggregatedRows.map((row, idx) => (
                    <tr
                      key={row.key}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {row.name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {row.spec || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold tabular-nums text-slate-900">
                        {formatQuantityDisplay(row.totalQuantity)}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-700">
                        {row.unit || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums text-slate-700 font-medium">
                        {formatThaiDateShort(row.earliestRequiredDate)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-amber-700">
                        {row.notOrderedQty > 0
                          ? formatQuantityDisplay(row.notOrderedQty)
                          : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-blue-700">
                        {row.orderedQty > 0
                          ? formatQuantityDisplay(row.orderedQty)
                          : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-emerald-700">
                        {row.deliveredQty > 0
                          ? formatQuantityDisplay(row.deliveredQty)
                          : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {row.usedInTasks.join(' · ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* A4 PRINT / PDF / IPAD / GOOGLE DRIVE DOCUMENT CONTAINER           */}
      {/* Always mounted in live DOM so iPad Safari PDF export works        */}
      {/* immediately whether or not the user toggles preview first.        */}
      {/* ================================================================= */}
      <div
        ref={previewSectionRef}
        className={
          showPrintPreview
            ? 'block'
            : 'fixed -left-[12000px] top-0 pointer-events-none print:static print:left-auto'
        }
        aria-hidden={!showPrintPreview}
      >
        <DocumentZoomContainer
          defaultZoom={85}
          title={
            viewMode === 'by_activity'
              ? 'ตัวอย่างเอกสาร A4: ใบถอดวัสดุตามกิจกรรม'
              : 'ตัวอย่างเอกสาร A4: สรุปรวมรายการถอดวัสดุทั้งโครงการ'
          }
          badge="รองรับ PDF · iPad · Google Drive"
          orientation="portrait"
        >
          <MaterialTakeoffPrint
            project={project}
            phaseBlocks={phaseBlocks}
            aggregatedRows={aggregatedRows}
            viewMode={viewMode}
            containerId="material-takeoff-print-preview"
            filterLabel={activeFilterSummary}
          />
        </DocumentZoomContainer>
      </div>
    </div>
  );
};
