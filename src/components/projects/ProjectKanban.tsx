/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Project, ProjectGroup, ProjectTask, TaskPriority } from '../../types/types.ts';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal.tsx';
import {
  DEFAULT_PROJECT_GROUPS,
  getTaskProgressPercent,
  calculateGroupWeightedStats,
  calculateProjectWeightedStats,
  hasGroupWeightsConfigured,
} from '../../utils/projectWeights.ts';
import {
  Plus,
  Search,
  Check,
  Star,
  MessageSquare,
  Calendar,
  ChevronDown,
  Trash2,
  Pencil,
  X,
  Scale,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export { getTaskProgressPercent };

interface ProjectKanbanProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
}

const THAI_SHORT_MONTHS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

function formatShortThaiDate(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const yearNum = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const dayNum = parseInt(parts[2], 10);
  if (isNaN(yearNum) || isNaN(monthIdx) || isNaN(dayNum) || monthIdx < 0 || monthIdx > 11) {
    return dateStr;
  }
  const thaiYearShort = ((yearNum + 543) % 100).toString().padStart(2, '0');
  return `${dayNum} ${THAI_SHORT_MONTHS[monthIdx]} ${thaiYearShort}`;
}

export const ProjectKanban: React.FC<ProjectKanbanProps> = ({
  project,
  onUpdateProject,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Add Task state
  const [isAddingTaskToGroup, setIsAddingTaskToGroup] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('High');
  const [newTaskStartDate, setNewTaskStartDate] = useState('');
  const [newTaskEndDate, setNewTaskEndDate] = useState('');
  const [newTaskProgress, setNewTaskProgress] = useState<number>(0);
  const [newTaskWeight, setNewTaskWeight] = useState<number>(0);

  // Edit Task state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskPriority, setEditTaskPriority] = useState<TaskPriority>('High');
  const [editTaskStartDate, setEditTaskStartDate] = useState('');
  const [editTaskEndDate, setEditTaskEndDate] = useState('');
  const [editTaskProgress, setEditTaskProgress] = useState<number>(0);
  const [editTaskWeight, setEditTaskWeight] = useState<number>(0);

  // Add Group state
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupWeight, setNewGroupWeight] = useState<number>(0);

  // Rename Group state
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  // Collapse/expand state per phase column
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Record<string, boolean>>({});

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'group'; group: ProjectGroup; taskCount: number }
    | { type: 'task'; task: ProjectTask }
    | null
  >(null);

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroupIds((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const groups: ProjectGroup[] =
    project.groups && project.groups.length > 0
      ? project.groups
      : project.groupsInitialized
      ? []
      : DEFAULT_PROJECT_GROUPS;

  const projectWeightedSummary = calculateProjectWeightedStats({
    ...project,
    groups,
  });

  const recalculateProgress = (
    tasks: ProjectTask[],
    nextGroups: ProjectGroup[] = groups
  ) => {
    const stats = calculateProjectWeightedStats({
      ...project,
      groups: nextGroups,
      groupsInitialized: true,
      tasks,
    });
    return stats.projectProgressPercent;
  };

  const getTodayThai = () =>
    new Date().toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    });

  const handleToggleTask = (task: ProjectTask) => {
    const isNowCompleted = !task.completed;
    const nextPercent = isNowCompleted ? 100 : 0;
    const todayThai = getTodayThai();

    const updatedTasks = project.tasks.map((t) => {
      if (t.id === task.id) {
        return {
          ...t,
          completed: isNowCompleted,
          progressPercent: nextPercent,
          status: isNowCompleted ? ('completed' as const) : ('pending' as const),
          completionDate: isNowCompleted ? `เสร็จสิ้นเมื่อ ${todayThai}` : undefined,
        };
      }
      return t;
    });

    const newProgress = recalculateProgress(updatedTasks);

    onUpdateProject({
      ...project,
      tasks: updatedTasks,
      progress: newProgress,
      status: newProgress >= 100 && updatedTasks.length > 0 ? 'completed' : 'in_progress',
    });
  };

  const handleTaskProgressChange = (task: ProjectTask, rawValue: number) => {
    const clamped = Math.min(100, Math.max(0, isNaN(rawValue) ? 0 : Math.round(rawValue)));
    const isNowCompleted = clamped >= 100;
    const todayThai = getTodayThai();

    const updatedTasks = project.tasks.map((t) => {
      if (t.id === task.id) {
        return {
          ...t,
          progressPercent: clamped,
          completed: isNowCompleted,
          status: isNowCompleted
            ? ('completed' as const)
            : clamped > 0
            ? ('in_progress' as const)
            : ('pending' as const),
          completionDate: isNowCompleted
            ? t.completionDate || `เสร็จสิ้นเมื่อ ${todayThai}`
            : undefined,
        };
      }
      return t;
    });

    const newProgress = recalculateProgress(updatedTasks);

    onUpdateProject({
      ...project,
      tasks: updatedTasks,
      progress: newProgress,
      status: newProgress >= 100 && updatedTasks.length > 0 ? 'completed' : 'in_progress',
    });
  };

  // Helper to ensure groups have explicit weightPercent initialized when entering weighted edits
  const getEditableGroups = (): ProjectGroup[] => {
    if (hasGroupWeightsConfigured(groups)) {
      return groups;
    }
    const equalW = groups.length > 0 ? parseFloat((100 / groups.length).toFixed(2)) : 0;
    return groups.map((g, idx) => ({
      ...g,
      weightPercent:
        idx === groups.length - 1
          ? parseFloat(Math.max(0, 100 - equalW * (groups.length - 1)).toFixed(2))
          : equalW,
    }));
  };

  // Update weight % of a specific phase column (คอลัมน์งวดงาน)
  const handleGroupWeightChange = (groupId: string, rawWeight: number) => {
    const clamped = Math.min(100, Math.max(0, isNaN(rawWeight) ? 0 : parseFloat(rawWeight.toFixed(2))));
    const baseGroups = hasGroupWeightsConfigured(groups)
      ? groups
      : groups.map((g) => ({ ...g, weightPercent: 0 }));

    const updatedGroups = baseGroups.map((g) =>
      g.id === groupId ? { ...g, weightPercent: clamped } : g
    );
    const newProgress = recalculateProgress(project.tasks, updatedGroups);

    onUpdateProject({
      ...project,
      groups: updatedGroups,
      groupsInitialized: true,
      progress: newProgress,
      status: newProgress >= 100 && project.tasks.length > 0 ? 'completed' : 'in_progress',
    });
  };

  // Auto-split 100% evenly across all active phase columns
  const handleEqualizeGroupWeights = () => {
    if (groups.length === 0) return;
    const activeIndices = groups
      .map((g, idx) => ({
        idx,
        hasTasks: project.tasks.some((t) => t.groupName === g.name),
      }))
      .filter((x) => x.hasTasks);

    const targetIndices =
      activeIndices.length > 0
        ? activeIndices.map((x) => x.idx)
        : groups.map((_, idx) => idx);

    const count = targetIndices.length;
    const baseShare = Math.floor((100 / count) * 100) / 100;
    const updatedGroups = groups.map((g, idx) => {
      const pos = targetIndices.indexOf(idx);
      if (pos === -1) return { ...g, weightPercent: 0 };
      const weight =
        pos === count - 1
          ? parseFloat((100 - baseShare * (count - 1)).toFixed(2))
          : baseShare;
      return { ...g, weightPercent: weight };
    });

    const newProgress = recalculateProgress(project.tasks, updatedGroups);
    onUpdateProject({
      ...project,
      groups: updatedGroups,
      groupsInitialized: true,
      progress: newProgress,
    });
  };

  // Auto-split 100% evenly across tasks inside a single phase column
  const handleEqualizeTasksInGroup = (groupName: string) => {
    const grpTasks = project.tasks.filter((t) => t.groupName === groupName);
    if (grpTasks.length === 0) return;

    const editableGroups = getEditableGroups();
    const baseShare = Math.floor((100 / grpTasks.length) * 100) / 100;
    let cursor = 0;

    const updatedTasks = project.tasks.map((t) => {
      if (t.groupName !== groupName) return t;
      const isLast = cursor === grpTasks.length - 1;
      const w = isLast
        ? parseFloat((100 - baseShare * (grpTasks.length - 1)).toFixed(2))
        : baseShare;
      cursor++;
      return { ...t, weightPercent: w };
    });

    const newProgress = recalculateProgress(updatedTasks, editableGroups);
    onUpdateProject({
      ...project,
      groups: editableGroups,
      groupsInitialized: true,
      tasks: updatedTasks,
      progress: newProgress,
    });
  };

  // Update weight % of a specific task inside its phase column
  const handleTaskWeightChange = (task: ProjectTask, rawWeight: number) => {
    const clamped = Math.min(100, Math.max(0, isNaN(rawWeight) ? 0 : parseFloat(rawWeight.toFixed(2))));
    const editableGroups = getEditableGroups();
    const updatedTasks = project.tasks.map((t) =>
      t.id === task.id ? { ...t, weightPercent: clamped } : t
    );
    const newProgress = recalculateProgress(updatedTasks, editableGroups);

    onUpdateProject({
      ...project,
      groups: editableGroups,
      groupsInitialized: true,
      tasks: updatedTasks,
      progress: newProgress,
      status: newProgress >= 100 && updatedTasks.length > 0 ? 'completed' : 'in_progress',
    });
  };

  const openAddTaskForm = (groupName: string) => {
    const existingGrpTasks = project.tasks.filter((t) => t.groupName === groupName);
    const currentSumWeight = existingGrpTasks.reduce(
      (sum, t) => sum + (typeof t.weightPercent === 'number' ? t.weightPercent : 0),
      0
    );
    const suggestedRemaining =
      existingGrpTasks.length === 0
        ? 100
        : Math.max(0, parseFloat((100 - currentSumWeight).toFixed(2)));

    const targetGrp = groups.find((g) => g.name === groupName);
    if (targetGrp) {
      setCollapsedGroupIds((prev) => ({ ...prev, [targetGrp.id]: false }));
    }

    setIsAddingTaskToGroup(groupName);
    setNewTaskTitle('');
    setNewTaskPriority('High');
    setNewTaskStartDate(project.startDate || '');
    setNewTaskEndDate(project.endDate || '');
    setNewTaskProgress(0);
    setNewTaskWeight(suggestedRemaining);
  };

  const handleAddTask = (groupName: string) => {
    if (!newTaskTitle.trim()) return;

    const clampedProgress = Math.min(100, Math.max(0, Math.round(newTaskProgress || 0)));
    const clampedWeight = Math.min(100, Math.max(0, parseFloat((newTaskWeight || 0).toFixed(2))));
    const isCompleted = clampedProgress >= 100;
    const todayThai = getTodayThai();
    const editableGroups = getEditableGroups();

    const newTask: ProjectTask = {
      id: `tsk-${Date.now()}`,
      projectId: project.id,
      groupName: groupName,
      title: newTaskTitle.trim(),
      priority: newTaskPriority,
      status: isCompleted ? 'completed' : clampedProgress > 0 ? 'in_progress' : 'pending',
      completed: isCompleted,
      progressPercent: clampedProgress,
      startDate: newTaskStartDate || undefined,
      endDate: newTaskEndDate || undefined,
      completionDate: isCompleted ? `เสร็จสิ้นเมื่อ ${todayThai}` : undefined,
      ratingStars: 5,
      commentsCount: 0,
      weightPercent: clampedWeight,
    };

    const updatedTasks = [...project.tasks, newTask];
    const newProgress = recalculateProgress(updatedTasks, editableGroups);

    onUpdateProject({
      ...project,
      groups: editableGroups,
      groupsInitialized: true,
      tasks: updatedTasks,
      progress: newProgress,
      status: newProgress >= 100 && updatedTasks.length > 0 ? 'completed' : 'in_progress',
    });

    setNewTaskTitle('');
    setNewTaskStartDate('');
    setNewTaskEndDate('');
    setNewTaskProgress(0);
    setNewTaskWeight(0);
    setIsAddingTaskToGroup(null);
  };

  const startEditingTask = (task: ProjectTask) => {
    const grp = groups.find((g) => g.name === task.groupName);
    const stats = grp
      ? calculateGroupWeightedStats(grp, groups, project.tasks).taskStatsById[task.id]
      : undefined;

    setEditingTaskId(task.id);
    setEditTaskTitle(task.title);
    setEditTaskPriority(task.priority);
    setEditTaskStartDate(task.startDate || '');
    setEditTaskEndDate(task.endDate || '');
    setEditTaskProgress(getTaskProgressPercent(task));
    setEditTaskWeight(
      typeof task.weightPercent === 'number'
        ? task.weightPercent
        : stats?.taskWeightInGroup ?? 0
    );
  };

  const handleSaveTaskEdit = (taskId: string) => {
    if (!editTaskTitle.trim()) return;

    const clampedProgress = Math.min(100, Math.max(0, Math.round(editTaskProgress || 0)));
    const clampedWeight = Math.min(100, Math.max(0, parseFloat((editTaskWeight || 0).toFixed(2))));
    const isCompleted = clampedProgress >= 100;
    const todayThai = getTodayThai();
    const editableGroups = getEditableGroups();

    const updatedTasks = project.tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          title: editTaskTitle.trim(),
          priority: editTaskPriority,
          startDate: editTaskStartDate || undefined,
          endDate: editTaskEndDate || undefined,
          progressPercent: clampedProgress,
          weightPercent: clampedWeight,
          completed: isCompleted,
          status: isCompleted
            ? ('completed' as const)
            : clampedProgress > 0
            ? ('in_progress' as const)
            : ('pending' as const),
          completionDate: isCompleted
            ? t.completionDate || `เสร็จสิ้นเมื่อ ${todayThai}`
            : undefined,
        };
      }
      return t;
    });

    const newProgress = recalculateProgress(updatedTasks, editableGroups);

    onUpdateProject({
      ...project,
      groups: editableGroups,
      groupsInitialized: true,
      tasks: updatedTasks,
      progress: newProgress,
      status: newProgress >= 100 && updatedTasks.length > 0 ? 'completed' : 'in_progress',
    });
    setEditingTaskId(null);
  };

  const openAddGroupForm = () => {
    const currentTotalGroupWeight = hasGroupWeightsConfigured(groups)
      ? groups.reduce((s, g) => s + (g.weightPercent ?? 0), 0)
      : 0;
    setNewGroupWeight(
      groups.length === 0
        ? 100
        : Math.max(0, parseFloat((100 - currentTotalGroupWeight).toFixed(2)))
    );
    setIsAddingGroup(true);
  };

  const handleAddGroup = () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    if (groups.some((g) => g.name === trimmed)) return;

    const clampedGroupWeight = Math.min(
      100,
      Math.max(0, parseFloat((newGroupWeight || 0).toFixed(2)))
    );
    const baseGroups = hasGroupWeightsConfigured(groups)
      ? groups
      : groups.map((g) => ({ ...g, weightPercent: 0 }));

    const newGrp: ProjectGroup = {
      id: `grp-${Date.now()}`,
      name: trimmed,
      weightPercent: clampedGroupWeight,
    };
    const nextGroups = [...baseGroups, newGrp];
    const newProgress = recalculateProgress(project.tasks, nextGroups);

    onUpdateProject({
      ...project,
      groups: nextGroups,
      groupsInitialized: true,
      progress: newProgress,
    });
    setNewGroupName('');
    setNewGroupWeight(0);
    setIsAddingGroup(false);
  };

  const startRenamingGroup = (group: ProjectGroup) => {
    setEditingGroupId(group.id);
    setEditingGroupName(group.name);
  };

  const handleSaveGroupName = (group: ProjectGroup) => {
    const trimmed = editingGroupName.trim();
    if (!trimmed || trimmed === group.name) {
      setEditingGroupId(null);
      return;
    }

    // Prevent duplicate column name collision
    if (groups.some((g) => g.id !== group.id && g.name === trimmed)) {
      return;
    }

    const updatedGroups = groups.map((g) =>
      g.id === group.id ? { ...g, name: trimmed } : g
    );
    const updatedTasks = project.tasks.map((t) =>
      t.groupName === group.name ? { ...t, groupName: trimmed } : t
    );

    if (isAddingTaskToGroup === group.name) {
      setIsAddingTaskToGroup(trimmed);
    }

    onUpdateProject({
      ...project,
      groups: updatedGroups,
      groupsInitialized: true,
      tasks: updatedTasks,
    });
    setEditingGroupId(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'group') {
      const { group } = deleteTarget;
      const updatedGroups = groups.filter((g) => g.id !== group.id);
      const updatedTasks = project.tasks.filter((t) => t.groupName !== group.name);
      const newProgress = recalculateProgress(updatedTasks);

      onUpdateProject({
        ...project,
        groups: updatedGroups,
        groupsInitialized: true,
        tasks: updatedTasks,
        progress: newProgress,
        status: newProgress >= 100 && updatedTasks.length > 0 ? 'completed' : 'in_progress',
      });
    } else if (deleteTarget.type === 'task') {
      const updatedTasks = project.tasks.filter((t) => t.id !== deleteTarget.task.id);
      const newProgress = recalculateProgress(updatedTasks);

      onUpdateProject({
        ...project,
        tasks: updatedTasks,
        progress: newProgress,
        status: newProgress >= 100 && updatedTasks.length > 0 ? 'completed' : 'in_progress',
      });
    }

    setDeleteTarget(null);
  };

  const filteredTasks = project.tasks.filter((t) =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหากิจกรรมการทำงานในงวดงาน..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleEqualizeGroupWeights}
              className="inline-flex items-center px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors"
              title="แบ่งน้ำหนัก % ทุกคอลัมน์งวดงานที่มีกิจกรรมให้รวมกันเท่ากับ 100%"
            >
              <Scale className="w-3.5 h-3.5 mr-1.5" />
              แบ่งน้ำหนักงวดงานเท่ากัน (100%)
            </button>
            <button
              type="button"
              onClick={openAddGroupForm}
              className="inline-flex items-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              เพิ่มคอลัมน์งวดงาน
            </button>
          </div>
        </div>

        {/* Project Weight % Summary Banner */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-700 flex items-center">
              <Scale className="w-3.5 h-3.5 mr-1 text-blue-600" />
              สัดส่วนน้ำหนักรวมทุกงวดงาน:
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold border ${
                Math.abs(projectWeightedSummary.totalGroupWeightPercent - 100) < 0.01
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : projectWeightedSummary.totalGroupWeightPercent > 100
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {Math.abs(projectWeightedSummary.totalGroupWeightPercent - 100) < 0.01 ? (
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
              )}
              {projectWeightedSummary.totalGroupWeightPercent}% / 100%
              {projectWeightedSummary.totalGroupWeightPercent < 99.99 &&
                ` (ขาดอีก ${(100 - projectWeightedSummary.totalGroupWeightPercent).toFixed(2)}%)`}
              {projectWeightedSummary.totalGroupWeightPercent > 100.01 &&
                ` (เกิน ${(projectWeightedSummary.totalGroupWeightPercent - 100).toFixed(2)}%)`}
            </span>
            <span className="text-[11px] text-slate-500">
              (ตั้งค่าน้ำหนัก % ของแต่ละงวด และกำหนด % กิจกรรมในแต่ละงวดให้ครบ 100% ของงวดนั้น)
            </span>
          </div>

          <div className="px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-bold">
            ผลงานโครงการรวม (คิดตามน้ำหนัก %): {projectWeightedSummary.projectProgressPercent}%
          </div>
        </div>
      </div>

      {/* Add New Group Form */}
      {isAddingGroup && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            placeholder="ชื่องวดงาน เช่น งานงวดที่ 4 หรือ งานระบบไฟฟ้า"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddGroup();
              if (e.key === 'Escape') setIsAddingGroup(false);
            }}
            className="flex-1 px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-sm"
            autoFocus
          />
          <div className="flex items-center space-x-1.5 bg-white border border-blue-300 rounded-lg px-2.5 py-1">
            <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
              น้ำหนักงวด (%):
            </span>
            <input
              type="number"
              min={0}
              max={100}
              step="0.5"
              value={newGroupWeight}
              onChange={(e) =>
                setNewGroupWeight(
                  Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                )
              }
              className="w-16 text-right text-sm font-bold text-blue-700 focus:outline-hidden"
            />
            <span className="text-xs font-bold text-slate-500">%</span>
          </div>
          <div className="flex items-center space-x-2 justify-end">
            <button
              type="button"
              onClick={handleAddGroup}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
            >
              บันทึกงวดงาน
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingGroup(false);
                setNewGroupName('');
              }}
              className="px-3 py-1.5 text-slate-500 hover:text-slate-800 text-xs"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Empty Columns State */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-3">
          <p className="text-sm text-slate-500">ยังไม่มีคอลัมน์งวดงานในโครงการนี้</p>
          <button
            type="button"
            onClick={openAddGroupForm}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            เพิ่มคอลัมน์งวดงานแรก
          </button>
        </div>
      ) : (
        /* Kanban Board Columns Container */
        <div className="overflow-x-auto pb-4">
          <div className="flex items-start space-x-4 min-w-max">
            {groups.map((group) => {
              const allGroupTasks = project.tasks.filter(
                (t) => t.groupName === group.name
              );
              const allGroupTasksCount = allGroupTasks.length;
              const groupTasks = filteredTasks.filter((t) => t.groupName === group.name);
              const totalGrpTasks = allGroupTasks.length;
              const grpStats = calculateGroupWeightedStats(
                group,
                groups,
                project.tasks
              );
              const completedGrpTasks = grpStats.completedTaskCount;
              const grpPercent = grpStats.groupProgressPercent;
              const isTaskWeightComplete =
                Math.abs(grpStats.totalTaskWeightInGroup - 100) < 0.01;
              const isEditingThisGroup = editingGroupId === group.id;
              const isCollapsed = Boolean(collapsedGroupIds[group.id]);

              return (
                <div
                  key={group.id}
                  className="w-80 bg-slate-50/90 rounded-xl border border-slate-200/90 flex flex-col max-h-[820px] shadow-xs"
                >
                  {/* Column Header */}
                  <div className="bg-[#1b4870] text-white p-3 rounded-t-xl">
                    {isEditingThisGroup ? (
                      <div className="flex items-center space-x-1.5 mb-2">
                        <input
                          type="text"
                          value={editingGroupName}
                          onChange={(e) => setEditingGroupName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveGroupName(group);
                            if (e.key === 'Escape') setEditingGroupId(null);
                          }}
                          className="flex-1 px-2 py-1 rounded-md bg-white text-slate-900 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-cyan-400 min-w-0"
                          placeholder="ชื่อคอลัมน์งวดงาน"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveGroupName(group)}
                          className="p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md transition-colors shrink-0"
                          title="บันทึกชื่องวดงาน"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingGroupId(null)}
                          className="p-1 bg-white/15 hover:bg-white/25 text-white rounded-md transition-colors shrink-0"
                          title="ยกเลิก"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mb-1 gap-1">
                        <h4 className="font-semibold text-sm truncate" title={group.name}>
                          {group.name}
                        </h4>
                        <div className="flex items-center space-x-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => openAddTaskForm(group.name)}
                            className="p-1 hover:bg-white/15 rounded-md transition-colors text-white"
                            title="เพิ่มกิจกรรมในงวดนี้"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => startRenamingGroup(group)}
                            className="p-1 hover:bg-white/15 rounded-md transition-colors text-blue-100 hover:text-white"
                            title="แก้ไขชื่องวดงาน"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                type: 'group',
                                group,
                                taskCount: allGroupTasksCount,
                              })
                            }
                            className="p-1 hover:bg-rose-500/80 rounded-md transition-colors text-blue-100 hover:text-white"
                            title="ลบคอลัมน์งวดงาน"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Phase Weight % Input + Earned Breakdown */}
                    <div className="mt-2 pt-2 border-t border-white/15 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-blue-100 font-medium">
                          น้ำหนักงวดงาน (% โครงการ):
                        </span>
                        <div className="flex items-center space-x-1 bg-white/15 rounded-md px-1.5 py-0.5 border border-white/25">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step="0.5"
                            value={grpStats.groupWeightPercent}
                            onChange={(e) =>
                              handleGroupWeightChange(
                                group.id,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-12 bg-transparent text-right text-xs font-bold text-white focus:outline-hidden"
                            title="กำหนด % น้ำหนักของงวดงานนี้เทียบทั้งโครงการ"
                          />
                          <span className="text-cyan-200 font-bold">%</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-blue-100">
                        <span>
                          {completedGrpTasks}/{totalGrpTasks} ทาสก์เสร็จ
                        </span>
                        <span className="font-bold text-cyan-300">
                          ในงวด {grpPercent}% (ได้ {grpStats.groupEarnedInProject}% / {grpStats.groupWeightPercent}%)
                        </span>
                      </div>

                      {/* Progress Line */}
                      <div className="w-full bg-blue-950/40 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-cyan-400 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, grpPercent)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Task List in Column */}
                  <div className="p-2.5 overflow-y-auto space-y-2.5 flex-1">
                    {/* Task Weight Sum indicator inside column */}
                    <div
                      className={`flex items-center justify-between text-[11px] px-2 py-1.5 rounded-lg border ${
                        totalGrpTasks === 0
                          ? 'bg-slate-100 border-slate-200 text-slate-500'
                          : isTaskWeightComplete
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : grpStats.totalTaskWeightInGroup > 100
                          ? 'bg-rose-50 border-rose-200 text-rose-700'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}
                    >
                      <span className="font-bold">
                        รวม % กิจกรรมในงวด: {grpStats.totalTaskWeightInGroup}% / 100%
                      </span>
                      {totalGrpTasks > 0 && !isTaskWeightComplete && (
                        <button
                          type="button"
                          onClick={() => handleEqualizeTasksInGroup(group.name)}
                          className="px-1.5 py-0.5 rounded bg-white border border-current text-[10px] font-bold hover:opacity-80"
                          title="แบ่ง % กิจกรรมในงวดนี้ให้เท่ากันรวมเป็น 100%"
                        >
                          ปรับครบ 100%
                        </button>
                      )}
                      {totalGrpTasks > 0 && isTaskWeightComplete && (
                        <span className="text-[10px] font-bold">✓ ครบ 100%</span>
                      )}
                    </div>

                    {/* Status / Collapse-Expand header inside column */}
                    <button
                      type="button"
                      onClick={() => toggleGroupCollapse(group.id)}
                      aria-expanded={!isCollapsed}
                      className="w-full flex items-center justify-between text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      title={isCollapsed ? 'คลิกเพื่อกางรายการทาสก์' : 'คลิกเพื่อพับเก็บรายการทาสก์'}
                    >
                      <span className="font-medium">
                        ทาสก์ทั้งหมด ({totalGrpTasks})
                        {isCollapsed && (
                          <span className="ml-1.5 text-[10px] text-slate-400 font-normal">
                            (พับเก็บอยู่)
                          </span>
                        )}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                          isCollapsed ? '-rotate-90' : 'rotate-0'
                        }`}
                      />
                    </button>

                    {/* Tasks Cards */}
                    {!isCollapsed && groupTasks.map((task) => {
                      const isEditingThisTask = editingTaskId === task.id;
                      const hasDateRange = Boolean(task.startDate || task.endDate);
                      const taskProgress = getTaskProgressPercent(task);
                      const isTaskDone = taskProgress >= 100;
                      const taskStat = grpStats.taskStatsById[task.id];

                      if (isEditingThisTask) {
                        return (
                          <div
                            key={task.id}
                            className="bg-white p-3 rounded-xl border-2 border-blue-400 shadow-sm space-y-2.5"
                          >
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                ชื่อกิจกรรมงวดงาน
                              </label>
                              <textarea
                                rows={2}
                                value={editTaskTitle}
                                onChange={(e) => setEditTaskTitle(e.target.value)}
                                className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                                autoFocus
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                                  วันที่เริ่ม
                                </label>
                                <input
                                  type="date"
                                  value={editTaskStartDate}
                                  onChange={(e) => setEditTaskStartDate(e.target.value)}
                                  className="w-full px-1.5 py-1 text-[11px] border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                                  วันที่สิ้นสุด
                                </label>
                                <input
                                  type="date"
                                  value={editTaskEndDate}
                                  onChange={(e) => setEditTaskEndDate(e.target.value)}
                                  className="w-full px-1.5 py-1 text-[11px] border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                                />
                              </div>
                            </div>

                            {/* Edit Task Weight % & Progress % */}
                            <div className="bg-indigo-50/70 p-2 rounded-lg border border-indigo-200 flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-indigo-800">
                                น้ำหนักงานในงวด (%):
                              </span>
                              <div className="flex items-center space-x-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step="0.5"
                                  value={editTaskWeight}
                                  onChange={(e) =>
                                    setEditTaskWeight(
                                      Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                                    )
                                  }
                                  className="w-14 px-1.5 py-0.5 text-right text-xs font-bold border border-indigo-300 rounded bg-white text-indigo-700"
                                />
                                <span className="text-indigo-700 font-bold">%</span>
                              </div>
                            </div>

                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-slate-700">
                                  ความคืบหน้าของงาน (%)
                                </span>
                                <div className="flex items-center space-x-1">
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={editTaskProgress}
                                    onChange={(e) =>
                                      setEditTaskProgress(
                                        Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0))
                                      )
                                    }
                                    className="w-14 px-1.5 py-0.5 text-right text-xs font-bold border border-slate-300 rounded bg-white"
                                  />
                                  <span className="text-slate-600 font-bold">%</span>
                                </div>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                step={1}
                                value={editTaskProgress}
                                onChange={(e) =>
                                  setEditTaskProgress(parseInt(e.target.value, 10) || 0)
                                }
                                className="w-full h-1.5 accent-blue-600 cursor-pointer"
                              />
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <select
                                value={editTaskPriority}
                                onChange={(e) =>
                                  setEditTaskPriority(e.target.value as TaskPriority)
                                }
                                className="text-xs border border-slate-200 rounded px-2 py-1"
                              >
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                              </select>
                              <div className="flex space-x-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingTaskId(null)}
                                  className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700"
                                >
                                  ยกเลิก
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveTaskEdit(task.id)}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
                                >
                                  บันทึก
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={task.id}
                          className={`bg-white rounded-xl p-3 border transition-all shadow-xs hover:shadow-md ${
                            isTaskDone
                              ? 'border-emerald-200 bg-white/95'
                              : 'border-slate-300 ring-1 ring-blue-500/20'
                          }`}
                        >
                          {/* Priority Tag & Star Rating */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-0.5">
                              {[1, 2, 3, 4, 5, 6, 7].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-3 h-3 ${
                                    star <= (task.ratingStars || 5)
                                      ? 'text-red-500 fill-red-500'
                                      : 'text-slate-200'
                                  }`}
                                />
                              ))}
                            </div>

                            <div className="flex items-center space-x-1">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  task.priority === 'High'
                                    ? 'bg-rose-100 text-rose-700'
                                    : task.priority === 'Medium'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {task.priority}
                              </span>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditingTask(task);
                                }}
                                className="text-slate-300 hover:text-blue-600 p-0.5 transition-colors"
                                title="แก้ไขกิจกรรมและวันที่เริ่ม-สิ้นสุด"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget({ type: 'task', task });
                                }}
                                className="text-slate-300 hover:text-rose-500 p-0.5 transition-colors"
                                title="ลบกิจกรรมนี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Checkbox and Task Title */}
                          <div className="flex items-start space-x-2.5 mb-2">
                            <button
                              type="button"
                              onClick={() => handleToggleTask(task)}
                              className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center transition-colors shrink-0 ${
                                isTaskDone
                                  ? 'bg-emerald-600 text-white'
                                  : 'border-2 border-slate-400 hover:border-blue-600'
                              }`}
                              title={isTaskDone ? 'คลิกเพื่อรีเซ็ตเป็น 0%' : 'คลิกเพื่อทำเครื่องหมายเสร็จ 100%'}
                            >
                              {isTaskDone && <Check className="w-3 h-3 stroke-[3]" />}
                            </button>

                            <span
                              className={`text-xs font-semibold leading-snug ${
                                isTaskDone ? 'text-slate-700' : 'text-slate-900'
                              }`}
                            >
                              {task.title}
                            </span>
                          </div>

                          {/* Start - End Date Row */}
                          <button
                            type="button"
                            onClick={() => startEditingTask(task)}
                            className={`w-full text-left flex items-center text-[11px] px-2 py-1 rounded-lg mb-2 transition-colors ${
                              hasDateRange
                                ? 'bg-blue-50/70 text-blue-800 hover:bg-blue-100/70 font-medium'
                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                            }`}
                            title="คลิกเพื่อแก้ไขวันที่เริ่ม-สิ้นสุด"
                          >
                            <Calendar
                              className={`w-3 h-3 mr-1.5 shrink-0 ${
                                hasDateRange ? 'text-blue-600' : 'text-slate-400'
                              }`}
                            />
                            {hasDateRange ? (
                              <span className="truncate">
                                {task.startDate ? formatShortThaiDate(task.startDate) : 'ไม่ระบุ'}
                                {' - '}
                                {task.endDate ? formatShortThaiDate(task.endDate) : 'ไม่ระบุ'}
                              </span>
                            ) : (
                              <span>+ กำหนดวันที่เริ่ม - สิ้นสุด</span>
                            )}
                          </button>

                          {/* Task Weight (%) within Phase & Actual Progress (%) */}
                          <div className="bg-indigo-50/75 border border-indigo-200/80 rounded-lg px-2 py-1.5 mb-2 space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-indigo-800">
                                น้ำหนักกิจกรรมในงวด:
                              </span>
                              <div className="flex items-center space-x-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step="0.5"
                                  value={taskStat?.taskWeightInGroup ?? 0}
                                  onChange={(e) =>
                                    handleTaskWeightChange(
                                      task,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-13 px-1.5 py-0.5 text-right text-xs font-bold border border-indigo-300 rounded bg-white text-indigo-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                                />
                                <span className="font-bold text-indigo-700">%</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-indigo-700/90">
                              <span>
                                ได้งานในงวด{' '}
                                <strong>{taskStat?.taskEarnedInGroup ?? 0}%</strong> /{' '}
                                {taskStat?.taskWeightInGroup ?? 0}%
                              </span>
                              <span className="font-semibold">
                                (= {taskStat?.taskEarnedInProject ?? 0}% ของโครงการ)
                              </span>
                            </div>
                          </div>

                          {/* Interactive Task Progress (%) Adjuster */}
                          <div className="bg-slate-50/90 border border-slate-200/80 rounded-lg p-2 mb-2 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-medium text-slate-600">ความคืบหน้าทำจริง:</span>
                              <div className="flex items-center space-x-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={taskProgress}
                                  onChange={(e) =>
                                    handleTaskProgressChange(
                                      task,
                                      parseInt(e.target.value, 10) || 0
                                    )
                                  }
                                  className={`w-13 px-1.5 py-0.5 text-right text-xs font-bold border rounded bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 ${
                                    isTaskDone
                                      ? 'border-emerald-300 text-emerald-700'
                                      : taskProgress > 0
                                      ? 'border-blue-300 text-blue-700'
                                      : 'border-slate-300 text-slate-700'
                                  }`}
                                />
                                <span
                                  className={`font-bold ${
                                    isTaskDone
                                      ? 'text-emerald-700'
                                      : taskProgress > 0
                                      ? 'text-blue-700'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  %
                                </span>
                              </div>
                            </div>

                            {/* Range Slider */}
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={1}
                              value={taskProgress}
                              onChange={(e) =>
                                handleTaskProgressChange(
                                  task,
                                  parseInt(e.target.value, 10) || 0
                                )
                              }
                              className={`w-full h-1.5 rounded-lg cursor-pointer ${
                                isTaskDone ? 'accent-emerald-600' : 'accent-blue-600'
                              }`}
                            />

                            {/* Quick Preset Buttons */}
                            <div className="flex items-center justify-between gap-1 pt-0.5">
                              {[0, 25, 50, 75, 100].map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => handleTaskProgressChange(task, preset)}
                                  className={`flex-1 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                                    taskProgress === preset
                                      ? preset === 100
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-blue-600 text-white'
                                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  {preset}%
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Completion Date or Status */}
                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                            <span
                              className={
                                isTaskDone
                                  ? 'text-emerald-600 font-medium'
                                  : taskProgress > 0
                                  ? 'text-blue-600 font-medium'
                                  : ''
                              }
                            >
                              {isTaskDone
                                ? task.completionDate || 'เสร็จสิ้นแล้ว (100%)'
                                : taskProgress > 0
                                ? `กำลังดำเนินการ (${taskProgress}%)`
                                : 'รอดำเนินการ (0%)'}
                            </span>

                            <div className="flex items-center space-x-2">
                              {task.commentsCount !== undefined && task.commentsCount > 0 && (
                                <span className="flex items-center text-slate-400">
                                  <MessageSquare className="w-3 h-3 mr-0.5" />
                                  {task.commentsCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add Task Box inside this group */}
                    {!isCollapsed && (
                      isAddingTaskToGroup === group.name ? (
                        <div className="bg-white p-3 rounded-xl border border-blue-300 shadow-sm space-y-2.5">
                          <textarea
                            rows={2}
                            placeholder="พิมพ์ชื่อกิจกรรม เช่น 4.งานพื้น คสล. ชั้น 1"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                            autoFocus
                          />

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                                วันที่เริ่ม
                              </label>
                              <input
                                type="date"
                                value={newTaskStartDate}
                                onChange={(e) => setNewTaskStartDate(e.target.value)}
                                className="w-full px-1.5 py-1 text-[11px] border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                                วันที่สิ้นสุด
                              </label>
                              <input
                                type="date"
                                value={newTaskEndDate}
                                onChange={(e) => setNewTaskEndDate(e.target.value)}
                                className="w-full px-1.5 py-1 text-[11px] border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                              />
                            </div>
                          </div>

                          {/* Task Weight % inside this phase when adding */}
                          <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-200 flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-indigo-800">
                              น้ำหนักกิจกรรมในงวด (%):
                            </span>
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step="0.5"
                                value={newTaskWeight}
                                onChange={(e) =>
                                  setNewTaskWeight(
                                    Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                                  )
                                }
                                className="w-14 px-1.5 py-0.5 text-right text-xs font-bold border border-indigo-300 rounded bg-white text-indigo-700"
                              />
                              <span className="text-indigo-700 font-bold">%</span>
                            </div>
                          </div>

                          {/* Initial Progress % when adding */}
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-medium text-slate-600">
                                ความคืบหน้าเริ่มต้น (%):
                              </span>
                              <div className="flex items-center space-x-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={newTaskProgress}
                                  onChange={(e) =>
                                    setNewTaskProgress(
                                      Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0))
                                    )
                                  }
                                  className="w-14 px-1.5 py-0.5 text-right text-xs font-bold border border-slate-300 rounded bg-white"
                                />
                                <span className="text-slate-600 font-bold">%</span>
                              </div>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={1}
                              value={newTaskProgress}
                              onChange={(e) =>
                                setNewTaskProgress(parseInt(e.target.value, 10) || 0)
                              }
                              className="w-full h-1.5 accent-blue-600 cursor-pointer"
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <select
                              value={newTaskPriority}
                              onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                              className="text-xs border border-slate-200 rounded px-2 py-1"
                            >
                              <option value="High">ความสำคัญ High</option>
                              <option value="Medium">ความสำคัญ Medium</option>
                              <option value="Low">ความสำคัญ Low</option>
                            </select>
                            <div className="flex space-x-1">
                              <button
                                type="button"
                                onClick={() => setIsAddingTaskToGroup(null)}
                                className="px-2 py-1 text-xs text-slate-500"
                              >
                                ยกเลิก
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddTask(group.name)}
                                className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold"
                              >
                                เพิ่ม
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openAddTaskForm(group.name)}
                          className="w-full py-2 border border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 rounded-xl text-xs text-slate-500 hover:text-blue-600 font-medium transition-colors flex items-center justify-center space-x-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>เพิ่มกิจกรรมการทำงาน</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirm Delete Modal for Column or Task */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title={
          deleteTarget?.type === 'group'
            ? 'ยืนยันการลบคอลัมน์งวดงาน'
            : 'ยืนยันการลบกิจกรรมการทำงาน'
        }
        itemName={
          deleteTarget?.type === 'group'
            ? deleteTarget.group.name
            : deleteTarget?.task.title
        }
        description={
          deleteTarget?.type === 'group'
            ? deleteTarget.taskCount > 0
              ? `คอลัมน์งวดงานนี้มีกิจกรรมอยู่ ${deleteTarget.taskCount} รายการ หากลบคอลัมน์นี้ กิจกรรมทั้งหมดในงวดงานนี้จะถูกลบออกด้วย`
              : 'คุณต้องการลบคอลัมน์งวดงานนี้ใช่หรือไม่?'
            : 'คุณต้องการลบกิจกรรมการทำงานนี้ออกจากงวดงานใช่หรือไม่?'
        }
        confirmLabel={deleteTarget?.type === 'group' ? 'ลบคอลัมน์งวดงาน' : 'ลบกิจกรรม'}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
