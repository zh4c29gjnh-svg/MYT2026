/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Project,
  ProjectGroup,
  ProjectTask,
  TaskPriority,
} from '../../types/types.ts';
import {
  calculateProjectWeightedStats,
  calculateGroupWeightedStats,
  getTaskProgressPercent,
} from '../../utils/projectWeights.ts';
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Plus,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  ChevronsLeft,
  ChevronsRight,
  Edit3,
  Trash2,
  Calendar,
  Check,
} from 'lucide-react';

interface GeneralWorkflowViewProps {
  project: Project;
  projects?: Project[];
  onUpdateProject: (project: Project) => void;
  onDeleteProject?: (id: string) => void;
  onSelectProject?: (project: Project) => void;
}

export interface WorkflowBadgeOption {
  label: string;
  bgClass: string;
  textClass: string;
  marksCompleted?: boolean;
}

export const WORKFLOW_BADGE_OPTIONS: WorkflowBadgeOption[] = [
  {
    label: 'ทีมออกแบบ เตรียมแบบ',
    bgClass: 'bg-[#5c6672]',
    textClass: 'text-white',
  },
  {
    label: 'ทีมขายติดต่อลูกค้า',
    bgClass: 'bg-[#4ea866]',
    textClass: 'text-white',
  },
  {
    label: 'งานเสร็จเรียบร้อย',
    bgClass: 'bg-[#48a860]',
    textClass: 'text-white',
    marksCompleted: true,
  },
  {
    label: 'Completed',
    bgClass: 'bg-[#5ec299]',
    textClass: 'text-white',
    marksCompleted: true,
  },
  {
    label: 'To do',
    bgClass: 'bg-[#4a7ebb]',
    textClass: 'text-white',
  },
  {
    label: 'Pending',
    bgClass: 'bg-[#a6adb4]',
    textClass: 'text-white',
  },
  {
    label: 'In Progress',
    bgClass: 'bg-[#0ea5e9]',
    textClass: 'text-white',
  },
];

const THAI_MONTHS_SHORT = [
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

const THAI_DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

function parseIsoDate(iso?: string): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) return null;
  const [y, m, d] = iso.trim().split('-').map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  return isNaN(dt.getTime()) ? null : dt;
}

function toIsoDate(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getBadgeStyle(badgeLabel?: string, fallbackCompleted?: boolean) {
  const label =
    badgeLabel || (fallbackCompleted ? 'Completed' : 'Pending');
  const found = WORKFLOW_BADGE_OPTIONS.find(
    (b) => b.label.toLowerCase() === label.toLowerCase()
  );
  if (found) return found;
  if (label.includes('เสร็จ') || label.toLowerCase() === 'completed') {
    return {
      label,
      bgClass: 'bg-[#5ec299]',
      textClass: 'text-white',
      marksCompleted: true,
    };
  }
  if (label.includes('ทีมขาย')) {
    return { label, bgClass: 'bg-[#4ea866]', textClass: 'text-white' };
  }
  if (label.includes('ทีมออกแบบ')) {
    return { label, bgClass: 'bg-[#5c6672]', textClass: 'text-white' };
  }
  if (label.toLowerCase() === 'to do') {
    return { label, bgClass: 'bg-[#4a7ebb]', textClass: 'text-white' };
  }
  return { label, bgClass: 'bg-[#a6adb4]', textClass: 'text-white' };
}

function recalculateProjectProgress(
  tasks: ProjectTask[],
  projectContext?: Project,
  groupsOverride?: ProjectGroup[]
): number {
  if (projectContext) {
    return calculateProjectWeightedStats({
      ...projectContext,
      groups: groupsOverride || projectContext.groups,
      tasks,
    }).projectProgressPercent;
  }
  if (tasks.length === 0) return 0;
  const total = tasks.reduce((acc, t) => {
    const pct =
      typeof t.progressPercent === 'number'
        ? t.progressPercent
        : t.completed
        ? 100
        : t.status === 'in_progress'
        ? 50
        : 0;
    return acc + pct;
  }, 0);
  return Number((total / tasks.length).toFixed(2));
}

const TeamAvatarCluster: React.FC<{
  count?: number;
  doubleAvatar?: boolean;
  onClick?: () => void;
}> = ({ count = 0, doubleAvatar = false, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 shrink-0 group cursor-pointer"
      title="คลิกเพื่อแก้ไขผู้รับผิดชอบและจำนวนทีมงาน"
    >
      <div className="flex items-center -space-x-1.5">
        <span className="w-5 h-5 rounded-full bg-amber-100 border border-white flex items-center justify-center overflow-hidden shadow-2xs">
          <svg viewBox="0 0 24 24" className="w-4 h-4">
            <circle cx="12" cy="8" r="4" fill="#92400e" />
            <path
              d="M5 20c0-3.8 3.1-6.5 7-6.5s7 2.7 7 6.5"
              fill="#d97706"
            />
          </svg>
        </span>
        {doubleAvatar && (
          <span className="w-5 h-5 rounded-full bg-emerald-100 border border-white flex items-center justify-center overflow-hidden shadow-2xs">
            <svg viewBox="0 0 24 24" className="w-4 h-4">
              <circle cx="12" cy="8" r="4" fill="#1e293b" />
              <path
                d="M5 20c0-3.8 3.1-6.5 7-6.5s7 2.7 7 6.5"
                fill="#059669"
              />
            </svg>
          </span>
        )}
      </div>
      {count > 0 && (
        <span className="inline-flex items-center text-[11px] font-medium text-emerald-700 group-hover:text-emerald-900">
          <UserPlus className="w-3 h-3 mr-0.5 text-emerald-600" />+{count}
        </span>
      )}
    </button>
  );
};

interface EditItemModalState {
  mode: 'create_project' | 'edit_project' | 'create_phase' | 'edit_phase' | 'create_task' | 'edit_task';
  projectId?: string;
  groupId?: string;
  taskId?: string;
  title: string;
  groupName: string;
  supervisorOrAssignee: string;
  teamCount: number;
  weightPercent: number;
  progressPercent: number;
  workflowBadge: string;
  startDate: string;
  endDate: string;
  priority: TaskPriority;
  hasSubArrow: boolean;
}

export const GeneralWorkflowView: React.FC<GeneralWorkflowViewProps> = ({
  project,
  projects,
  onUpdateProject,
  onDeleteProject,
  onSelectProject,
}) => {
  const allProjects = projects && projects.length > 0 ? projects : [project];
  const activeProject = project;

  // Filter & Search States matching KANNA screenshot
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterResponsible, setFilterResponsible] = useState<boolean>(false);
  const [filterIncomplete, setFilterIncomplete] = useState<boolean>(false);
  const [filterHasDate, setFilterHasDate] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<
    'newest' | 'oldest' | 'name' | 'progress'
  >('newest');

  const getDefaultWindowStart = (proj: Project): Date => {
    const parsed = parseIsoDate(proj.startDate);
    if (parsed) {
      const d = new Date(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate(),
        12,
        0,
        0
      );
      if (proj.id !== 'prj-somjai') {
        d.setDate(d.getDate() - 4); // Start 4 days before project start so the bar start is clearly visible
      }
      return d;
    }
    return new Date(2026, 4, 27, 12, 0, 0);
  };

  // Calendar Window State (viewAnchorDate = exact first visible day of the calendar window)
  const [viewAnchorDate, setViewAnchorDate] = useState<Date>(() =>
    getDefaultWindowStart(activeProject)
  );
  const [highlightedDateIso, setHighlightedDateIso] = useState<string>(() => {
    if (activeProject.id === 'prj-somjai') return '2026-06-10';
    return activeProject.startDate || '2026-06-10';
  });
  const [calendarSpanDays, setCalendarSpanDays] = useState<number>(28); // 28 days (e.g. 27 May - 23 June)

  // Whenever the selected project changes, jump calendar to that project's schedule window
  useEffect(() => {
    setViewAnchorDate(getDefaultWindowStart(activeProject));
    setHighlightedDateIso(
      activeProject.id === 'prj-somjai'
        ? '2026-06-10'
        : activeProject.startDate || '2026-06-10'
    );
  }, [activeProject.id, activeProject.startDate]);

  // Expand / Collapse states for Projects and Phases
  const [collapsedProjects, setCollapsedProjects] = useState<
    Record<string, boolean>
  >({});
  const [collapsedPhases, setCollapsedPhases] = useState<
    Record<string, boolean>
  >({});

  // Interactive Drag-to-Schedule state on the Gantt Grid
  const [dragSchedule, setDragSchedule] = useState<{
    targetType: 'project' | 'phase' | 'task';
    projectId: string;
    groupId?: string;
    taskId?: string;
    anchorIso: string;
    currentIso: string;
  } | null>(null);

  // Modal state for creating/editing Project, Phase, or Task
  const [modalState, setModalState] = useState<EditItemModalState | null>(null);

  // Build visible daily columns directly starting from viewAnchorDate
  const visibleDays = useMemo(() => {
    const start = new Date(
      viewAnchorDate.getFullYear(),
      viewAnchorDate.getMonth(),
      viewAnchorDate.getDate(),
      12,
      0,
      0
    );
    const list: {
      iso: string;
      dayNum: number;
      dayShort: string;
      isWeekend: boolean;
      monthLabel: string;
    }[] = [];

    for (let i = 0; i < calendarSpanDays; i++) {
      const d = new Date(start.getTime());
      d.setDate(start.getDate() + i);
      const dow = d.getDay();
      list.push({
        iso: toIsoDate(d),
        dayNum: d.getDate(),
        dayShort: THAI_DAYS_SHORT[dow],
        isWeekend: dow === 0 || dow === 6,
        monthLabel: `${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`,
      });
    }
    return list;
  }, [viewAnchorDate, calendarSpanDays]);

  const middleDay = useMemo(() => {
    const mid = new Date(viewAnchorDate.getTime());
    mid.setDate(mid.getDate() + Math.floor(calendarSpanDays / 3));
    return mid;
  }, [viewAnchorDate, calendarSpanDays]);

  const currentMonthTitle = `${
    THAI_MONTHS_SHORT[middleDay.getMonth()]
  } ${middleDay.getFullYear()}`;

  const visibleRangeLabel = useMemo(() => {
    if (visibleDays.length === 0) return '';
    const first = parseIsoDate(visibleDays[0].iso);
    const last = parseIsoDate(visibleDays[visibleDays.length - 1].iso);
    if (!first || !last) return '';
    return `${first.getDate()} ${THAI_MONTHS_SHORT[first.getMonth()]} - ${last.getDate()} ${THAI_MONTHS_SHORT[last.getMonth()]} ${last.getFullYear()}`;
  }, [visibleDays]);

  // Offset in days from project default window start (for the bottom horizontal scrubber)
  const timelineDayOffset = useMemo(() => {
    const base = getDefaultWindowStart(activeProject);
    return Math.round((viewAnchorDate.getTime() - base.getTime()) / 86400000);
  }, [viewAnchorDate, activeProject.id, activeProject.startDate]);

  // Single separated project view: never mix multiple projects together
  const filteredProjects = useMemo(() => {
    return [activeProject];
  }, [activeProject]);

  // Helper to filter tasks/phases within the single active project
  const filterProjectTasks = (tasks: ProjectTask[]) => {
    const q = searchQuery.trim().toLowerCase();
    return tasks.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q) && !t.groupName.toLowerCase().includes(q) && !activeProject.name.toLowerCase().includes(q)) {
        return false;
      }
      if (filterResponsible && !(t.assignedTo?.trim() || activeProject.supervisorName?.trim())) {
        return false;
      }
      if (filterIncomplete && t.completed) {
        return false;
      }
      if (filterHasDate && (!t.startDate || !t.endDate)) {
        return false;
      }
      return true;
    });
  };

  // Shift calendar by N days (e.g. -7 / +7 days)
  const handleShiftDays = (deltaDays: number) => {
    setViewAnchorDate((prev) => {
      const next = new Date(
        prev.getFullYear(),
        prev.getMonth(),
        prev.getDate() + deltaDays,
        12,
        0,
        0
      );
      return next;
    });
  };

  // Helper to shift calendar month
  const handleShiftMonth = (deltaMonths: number) => {
    setViewAnchorDate((prev) => {
      const next = new Date(
        prev.getFullYear(),
        prev.getMonth() + deltaMonths,
        prev.getDate(),
        12,
        0,
        0
      );
      return next;
    });
  };

  const handleJumpToDate = (isoDate?: string) => {
    const parsed = parseIsoDate(isoDate);
    if (parsed) {
      const targetAnchor = new Date(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate() - 3,
        12,
        0,
        0
      );
      setViewAnchorDate(targetAnchor);
      setHighlightedDateIso(toIsoDate(parsed));
    } else {
      const today = new Date();
      const todayIso = toIsoDate(today);
      const targetAnchor = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 5,
        12,
        0,
        0
      );
      setViewAnchorDate(targetAnchor);
      setHighlightedDateIso(todayIso);
    }
  };

  // Cycle badge inline when clicked
  const handleCycleBadge = (
    targetType: 'project' | 'phase' | 'task',
    project: Project,
    groupId?: string,
    taskId?: string
  ) => {
    const labels = WORKFLOW_BADGE_OPTIONS.map((o) => o.label);
    if (targetType === 'project') {
      const idx = labels.indexOf(
        project.workflowBadge || 'ทีมออกแบบ เตรียมแบบ'
      );
      const next = labels[(idx + 1) % labels.length];
      onUpdateProject({ ...project, workflowBadge: next });
      return;
    }

    if (targetType === 'phase' && groupId) {
      const updatedGroups = project.groups.map((g) => {
        if (g.id !== groupId) return g;
        const idx = labels.indexOf(g.workflowBadge || 'To do');
        const next = labels[(idx + 1) % labels.length];
        return { ...g, workflowBadge: next };
      });
      onUpdateProject({ ...project, groups: updatedGroups });
      return;
    }

    if (targetType === 'task' && taskId) {
      const updatedTasks = project.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const currentLabel =
          t.workflowBadge || (t.completed ? 'Completed' : 'Pending');
        const idx = labels.indexOf(currentLabel);
        const next = labels[(idx + 1) % labels.length];
        const opt = WORKFLOW_BADGE_OPTIONS.find((o) => o.label === next);
        const isDone = !!opt?.marksCompleted;
        return {
          ...t,
          workflowBadge: next,
          completed: isDone,
          status: isDone
            ? ('completed' as const)
            : next === 'In Progress'
            ? ('in_progress' as const)
            : ('pending' as const),
          progressPercent: isDone ? 100 : getTaskProgressPercent(t) >= 100 ? 50 : getTaskProgressPercent(t),
        };
      });
      onUpdateProject({
        ...project,
        tasks: updatedTasks,
        progress: recalculateProjectProgress(updatedTasks, project),
      });
    }
  };

  // Inline task progress % change directly from General Workflow
  const handleInlineTaskProgressChange = (
    proj: Project,
    taskId: string,
    rawPercent: number
  ) => {
    const clamped = Math.min(
      100,
      Math.max(0, isNaN(rawPercent) ? 0 : Math.round(rawPercent))
    );
    const isDone = clamped >= 100;
    const updatedTasks = proj.tasks.map((t) => {
      if (t.id !== taskId) return t;
      const currentOpt = WORKFLOW_BADGE_OPTIONS.find(
        (b) => b.label === t.workflowBadge
      );
      let nextBadge = t.workflowBadge || (isDone ? 'Completed' : 'Pending');
      if (isDone && !currentOpt?.marksCompleted) {
        nextBadge = 'Completed';
      } else if (!isDone && currentOpt?.marksCompleted) {
        nextBadge = clamped > 0 ? 'In Progress' : 'Pending';
      }
      return {
        ...t,
        progressPercent: clamped,
        completed: isDone,
        status: isDone
          ? ('completed' as const)
          : clamped > 0
          ? ('in_progress' as const)
          : ('pending' as const),
        workflowBadge: nextBadge,
      };
    });

    onUpdateProject({
      ...proj,
      tasks: updatedTasks,
      progress: recalculateProjectProgress(updatedTasks, proj),
    });
  };

  // Commit drag-to-schedule dates on Gantt grid
  const commitDragSchedule = () => {
    if (!dragSchedule) return;
    const { targetType, projectId, groupId, taskId, anchorIso, currentIso } =
      dragSchedule;
    const startIso = anchorIso <= currentIso ? anchorIso : currentIso;
    const endIso = anchorIso <= currentIso ? currentIso : anchorIso;

    const proj =
      allProjects.find((p) => p.id === projectId) || activeProject;
    if (proj) {
      if (targetType === 'project') {
        onUpdateProject({ ...proj, startDate: startIso, endDate: endIso });
      } else if (targetType === 'phase' && groupId) {
        const updatedGroups = proj.groups.map((g) =>
          g.id === groupId ? { ...g, startDate: startIso, endDate: endIso } : g
        );
        onUpdateProject({ ...proj, groups: updatedGroups });
      } else if (targetType === 'task' && taskId) {
        const updatedTasks = proj.tasks.map((t) =>
          t.id === taskId ? { ...t, startDate: startIso, endDate: endIso } : t
        );
        onUpdateProject({ ...proj, tasks: updatedTasks });
      }
    }
    setDragSchedule(null);
  };

  // Save modal handler
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalState || !modalState.title.trim()) return;

    if (modalState.mode === 'create_project') {
      const newProjId = `prj-${Date.now()}`;
      const newProject: Project = {
        id: newProjId,
        code: `PRJ-${Math.floor(100 + Math.random() * 900)}`,
        name: modalState.title.trim(),
        location: 'กรุงเทพมหานคร',
        startDate: modalState.startDate || '2026-06-01',
        endDate: modalState.endDate || '2026-06-30',
        budget: 2000000,
        status: 'in_progress',
        supervisorName: modalState.supervisorOrAssignee || 'นายปรวิทย์ นวลนาค',
        isFollowed: true,
        progress: 0,
        teamCount: modalState.teamCount,
        workflowBadge: modalState.workflowBadge,
        groupsInitialized: true,
        groups: [
          {
            id: `grp-${Date.now()}-1`,
            name: `${modalState.title.trim()} Phase 1`,
            startDate: modalState.startDate || '2026-06-01',
            endDate: modalState.endDate || '2026-06-30',
            teamCount: 5,
            workflowBadge: 'To do',
          },
        ],
        tasks: [],
        createdAt: new Date().toISOString(),
      };
      onUpdateProject(newProject);
      if (onSelectProject) {
        onSelectProject(newProject);
      }
      setModalState(null);
      return;
    }

    const proj =
      allProjects.find((p) => p.id === modalState.projectId) || activeProject;
    if (!proj) {
      setModalState(null);
      return;
    }

    if (modalState.mode === 'edit_project') {
      onUpdateProject({
        ...proj,
        name: modalState.title.trim(),
        supervisorName: modalState.supervisorOrAssignee.trim(),
        teamCount: modalState.teamCount,
        workflowBadge: modalState.workflowBadge,
        startDate: modalState.startDate,
        endDate: modalState.endDate,
      });
    } else if (modalState.mode === 'create_phase') {
      const newGroup: ProjectGroup = {
        id: `grp-${Date.now()}`,
        name: modalState.title.trim(),
        weightPercent: Math.min(100, Math.max(0, Number(modalState.weightPercent) || 0)),
        assignedTo: modalState.supervisorOrAssignee.trim(),
        teamCount: modalState.teamCount,
        workflowBadge: modalState.workflowBadge,
        startDate: modalState.startDate || undefined,
        endDate: modalState.endDate || undefined,
      };
      const nextGroups = [...(proj.groups || []), newGroup];
      onUpdateProject({
        ...proj,
        groupsInitialized: true,
        groups: nextGroups,
        progress: recalculateProjectProgress(proj.tasks, proj, nextGroups),
      });
    } else if (modalState.mode === 'edit_phase' && modalState.groupId) {
      const oldGroup = proj.groups.find((g) => g.id === modalState.groupId);
      const newPhaseName = modalState.title.trim();
      const updatedGroups = proj.groups.map((g) =>
        g.id === modalState.groupId
          ? {
              ...g,
              name: newPhaseName,
              weightPercent: Math.min(100, Math.max(0, Number(modalState.weightPercent) || 0)),
              assignedTo: modalState.supervisorOrAssignee.trim(),
              teamCount: modalState.teamCount,
              workflowBadge: modalState.workflowBadge,
              startDate: modalState.startDate || undefined,
              endDate: modalState.endDate || undefined,
            }
          : g
      );
      const updatedTasks = oldGroup
        ? proj.tasks.map((t) =>
            t.groupName === oldGroup.name ? { ...t, groupName: newPhaseName } : t
          )
        : proj.tasks;
      onUpdateProject({
        ...proj,
        groups: updatedGroups,
        tasks: updatedTasks,
        progress: recalculateProjectProgress(updatedTasks, proj, updatedGroups),
      });
    } else if (modalState.mode === 'create_task') {
      const clampedPct = Math.min(
        100,
        Math.max(0, Math.round(Number(modalState.progressPercent) || 0))
      );
      const badgeOpt = WORKFLOW_BADGE_OPTIONS.find(
        (b) => b.label === modalState.workflowBadge
      );
      const isDone = clampedPct >= 100 || !!badgeOpt?.marksCompleted;
      const finalPct = isDone ? 100 : clampedPct;
      const newTask: ProjectTask = {
        id: `tsk-${Date.now()}`,
        projectId: proj.id,
        groupName: modalState.groupName,
        title: modalState.title.trim(),
        priority: modalState.priority,
        status: isDone ? 'completed' : finalPct > 0 ? 'in_progress' : 'pending',
        completed: isDone,
        progressPercent: finalPct,
        assignedTo: modalState.supervisorOrAssignee.trim(),
        teamCount: modalState.teamCount,
        workflowBadge: modalState.workflowBadge,
        startDate: modalState.startDate || undefined,
        endDate: modalState.endDate || undefined,
        hasSubArrow: modalState.hasSubArrow,
        weightPercent: Math.min(100, Math.max(0, Number(modalState.weightPercent) || 0)),
      };
      const nextTasks = [...proj.tasks, newTask];
      onUpdateProject({
        ...proj,
        tasks: nextTasks,
        progress: recalculateProjectProgress(nextTasks, proj),
      });
    } else if (modalState.mode === 'edit_task' && modalState.taskId) {
      const clampedPct = Math.min(
        100,
        Math.max(0, Math.round(Number(modalState.progressPercent) || 0))
      );
      const isDone = clampedPct >= 100;
      const currentOpt = WORKFLOW_BADGE_OPTIONS.find(
        (b) => b.label === modalState.workflowBadge
      );
      let finalBadge = modalState.workflowBadge;
      if (isDone && !currentOpt?.marksCompleted) {
        finalBadge = 'Completed';
      } else if (!isDone && currentOpt?.marksCompleted) {
        finalBadge = clampedPct > 0 ? 'In Progress' : 'Pending';
      }

      const nextTasks = proj.tasks.map((t) =>
        t.id === modalState.taskId
          ? {
              ...t,
              title: modalState.title.trim(),
              groupName: modalState.groupName || t.groupName,
              assignedTo: modalState.supervisorOrAssignee.trim(),
              teamCount: modalState.teamCount,
              weightPercent: Math.min(100, Math.max(0, Number(modalState.weightPercent) || 0)),
              workflowBadge: finalBadge,
              completed: isDone,
              status: isDone
                ? ('completed' as const)
                : clampedPct > 0
                ? ('in_progress' as const)
                : ('pending' as const),
              progressPercent: clampedPct,
              startDate: modalState.startDate || undefined,
              endDate: modalState.endDate || undefined,
              hasSubArrow: modalState.hasSubArrow,
            }
          : t
      );
      onUpdateProject({
        ...proj,
        tasks: nextTasks,
        progress: recalculateProjectProgress(nextTasks, proj),
      });
    }

    setModalState(null);
  };

  // Highlight search match in text like "Project **SomJai**" in the screenshot
  const renderHighlightedText = (text: string, isBoldBase = false) => {
    const q = searchQuery.trim();
    if (!q) {
      return (
        <span className={isBoldBase ? 'font-bold text-slate-900' : ''}>
          {text}
        </span>
      );
    }
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <span className={isBoldBase ? 'font-semibold text-slate-800' : ''}>
        {parts.map((part, i) =>
          part.toLowerCase() === q.toLowerCase() ? (
            <strong key={i} className="font-black text-slate-950 underline decoration-emerald-500/60">
              {part}
            </strong>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  // Renders the daily Gantt grid cells + bar for a single row
  const renderGanttRowCells = (
    targetType: 'project' | 'phase' | 'task',
    project: Project,
    startDate?: string,
    endDate?: string,
    barLabel?: string,
    groupId?: string,
    taskId?: string,
    taskProgressPercent?: number
  ) => {
    const isTaskRow = targetType === 'task';

    // Project and Phase/Installment rows are header rows — do not render Gantt bars on them
    if (!isTaskRow) {
      return (
        <div
          className="grid relative select-none h-[42px]"
          style={{
            gridTemplateColumns: `repeat(${visibleDays.length}, minmax(30px, 1fr))`,
          }}
        >
          {visibleDays.map((day) => (
            <div
              key={day.iso}
              className={`border-r border-b border-slate-200/80 h-[42px] relative ${
                day.isWeekend
                  ? 'bg-slate-100/80'
                  : targetType === 'project'
                  ? 'bg-slate-50/60'
                  : 'bg-slate-50/30'
              }`}
            />
          ))}
        </div>
      );
    }

    const isDraggingThisRow =
      dragSchedule &&
      dragSchedule.targetType === targetType &&
      dragSchedule.projectId === project.id &&
      dragSchedule.groupId === groupId &&
      dragSchedule.taskId === taskId;

    const effStart = isDraggingThisRow
      ? dragSchedule.anchorIso <= dragSchedule.currentIso
        ? dragSchedule.anchorIso
        : dragSchedule.currentIso
      : startDate;
    const effEnd = isDraggingThisRow
      ? dragSchedule.anchorIso <= dragSchedule.currentIso
        ? dragSchedule.currentIso
        : dragSchedule.anchorIso
      : endDate;

    const firstVisibleIso = visibleDays[0]?.iso || '';
    const lastVisibleIso = visibleDays[visibleDays.length - 1]?.iso || '';

    const hasSchedule = !!(effStart && effEnd);

    // Show left jump arrow [←] when task bar is to the left of the visible window
    const showLeftJumpArrow =
      hasSchedule && (effStart! < firstVisibleIso || effEnd! < firstVisibleIso);

    // Show right jump arrow button [→] when task row has no visible bar or extends to right
    const showRightJumpArrow =
      !hasSchedule || effEnd! > lastVisibleIso || effStart! > lastVisibleIso;

    const startDt = effStart ? parseIsoDate(effStart) : null;
    const endDt = effEnd ? parseIsoDate(effEnd) : null;
    const totalTaskDays =
      startDt && endDt
        ? Math.max(
            1,
            Math.round((endDt.getTime() - startDt.getTime()) / 86400000) + 1
          )
        : 1;
    const clampedTaskProgress = Math.min(
      100,
      Math.max(0, Math.round(taskProgressPercent ?? 0))
    );

    return (
      <div
        className="grid relative select-none h-[42px]"
        style={{
          gridTemplateColumns: `repeat(${visibleDays.length}, minmax(30px, 1fr))`,
        }}
        onMouseLeave={() => {
          if (isDraggingThisRow) commitDragSchedule();
        }}
      >
        {visibleDays.map((day, dIdx) => {
          const inBar =
            hasSchedule && day.iso >= effStart! && day.iso <= effEnd!;
          const isBarStart =
            inBar && (dIdx === 0 || visibleDays[dIdx - 1].iso < effStart!);
          const isBarEnd =
            inBar &&
            (dIdx === visibleDays.length - 1 ||
              visibleDays[dIdx + 1].iso > effEnd!);

          // Calculate how much of this specific day cell is filled by yellow actual progress (0..100%)
          let yellowInCellPct = 0;
          if (inBar && startDt && clampedTaskProgress > 0) {
            const dayDt = parseIsoDate(day.iso);
            const dayOffset = dayDt
              ? Math.max(
                  0,
                  Math.round((dayDt.getTime() - startDt.getTime()) / 86400000)
                )
              : 0;
            const cellStartPct = (dayOffset / totalTaskDays) * 100;
            const cellEndPct = ((dayOffset + 1) / totalTaskDays) * 100;

            if (clampedTaskProgress >= cellEndPct) {
              yellowInCellPct = 100;
            } else if (clampedTaskProgress > cellStartPct) {
              yellowInCellPct =
                ((clampedTaskProgress - cellStartPct) /
                  (cellEndPct - cellStartPct)) *
                100;
            }
          }

          const isPartialYellowBoundary =
            yellowInCellPct > 0 && yellowInCellPct < 99.9;

          return (
            <div
              key={day.iso}
              onMouseDown={() =>
                setDragSchedule({
                  targetType,
                  projectId: project.id,
                  groupId,
                  taskId,
                  anchorIso: day.iso,
                  currentIso: day.iso,
                })
              }
              onMouseEnter={() => {
                if (dragSchedule) {
                  setDragSchedule((prev) =>
                    prev ? { ...prev, currentIso: day.iso } : null
                  );
                }
              }}
              onMouseUp={commitDragSchedule}
              title={
                inBar
                  ? `${barLabel || 'ทาสก์'} • ความคืบหน้าทำจริง ${clampedTaskProgress}% / 100% (${effStart} ถึง ${effEnd})`
                  : `คลิกหรือลากเพื่อตั้งวันที่ของทาสก์ (${day.iso})`
              }
              className={`border-r border-b border-slate-200/80 h-[42px] relative flex items-center cursor-pointer transition-colors ${
                day.isWeekend ? 'bg-slate-100/75' : 'bg-white'
              } hover:bg-emerald-50/40`}
            >
              {inBar && (
                <div
                  className={`h-[24px] w-full bg-[#ccebd7]/95 border-y border-[#8fd1a8] relative flex items-center ${
                    isBarStart ? 'rounded-l-md border-l ml-0.5' : ''
                  } ${isBarEnd ? 'rounded-r-md border-r mr-0.5' : ''}`}
                >
                  {/* Yellow Progress Overlay (1% - 100% of task bar) for Task rows */}
                  {yellowInCellPct > 0 && (
                    <div
                      className={`absolute -top-[1px] -bottom-[1px] left-0 bg-[#facc15] border-y border-[#ca8a04] pointer-events-none transition-all duration-200 ${
                        isBarStart ? 'rounded-l-md border-l -left-[1px]' : ''
                      } ${
                        isBarEnd && yellowInCellPct >= 99.9
                          ? 'rounded-r-md border-r -right-[1px]'
                          : ''
                      } ${
                        isPartialYellowBoundary
                          ? 'border-r-2 border-r-[#b45309]'
                          : ''
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(0, yellowInCellPct))}%`,
                      }}
                    />
                  )}

                  {isBarStart && barLabel && (
                    <span className="text-[11px] font-semibold text-slate-900 pl-2 whitespace-nowrap z-10 pointer-events-none inline-flex items-center gap-1.5 drop-shadow-[0_1px_0_rgba(255,255,255,0.75)]">
                      <span>{barLabel}</span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-900/75 text-amber-300 text-[10px] font-bold">
                        {clampedTaskProgress}%
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Quick Left Arrow [←] Button when task bar starts/lies to the left of the current window */}
        {showLeftJumpArrow && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (
                effStart &&
                effStart < firstVisibleIso &&
                effEnd &&
                effEnd >= firstVisibleIso
              ) {
                handleShiftDays(-7);
              } else {
                handleJumpToDate(effStart);
              }
            }}
            title={`เลื่อนปฏิทินไปทางซ้าย (${effStart})`}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded bg-slate-200/90 hover:bg-emerald-600 text-slate-600 hover:text-white flex items-center justify-center shadow-2xs transition-colors z-20 cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3" />
          </button>
        )}

        {/* Quick Right Arrow [→] Button on task row */}
        {showRightJumpArrow && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (hasSchedule) {
                if (effStart! > lastVisibleIso) {
                  handleJumpToDate(effStart);
                } else {
                  handleShiftDays(7);
                }
              } else if (taskId) {
                const defStart =
                  visibleDays[2]?.iso ||
                  activeProject.startDate ||
                  '2026-06-05';
                const defEnd =
                  visibleDays[Math.min(12, visibleDays.length - 2)]?.iso ||
                  activeProject.endDate ||
                  '2026-06-20';
                const updatedTasks = project.tasks.map((t) =>
                  t.id === taskId
                    ? { ...t, startDate: defStart, endDate: defEnd }
                    : t
                );
                onUpdateProject({ ...project, tasks: updatedTasks });
              }
            }}
            title={
              hasSchedule
                ? effStart! > lastVisibleIso
                  ? `เลื่อนปฏิทินไปที่จุดเริ่ม (${effStart})`
                  : `เลื่อนปฏิทินไปทางขวาเพื่อดูถึงวันสิ้นสุด (${effEnd})`
                : 'คลิกเพื่อกำหนดแถบเวลาของทาสก์ในช่วงวันที่แสดงอยู่'
            }
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded bg-slate-200/90 hover:bg-emerald-600 text-slate-600 hover:text-white flex items-center justify-center shadow-2xs transition-colors z-20 cursor-pointer"
          >
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden font-sans">
      {/* ================================================================= */}
      {/* 1. TOP WORKFLOW HEADER BAR ("General workflow v" per project)     */}
      {/* ================================================================= */}
      <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
        <div className="flex items-center space-x-3">
          <div className="relative inline-flex items-center">
            <select
              value={activeProject.id}
              onChange={(e) => {
                const chosen = allProjects.find((p) => p.id === e.target.value);
                if (chosen && onSelectProject) {
                  onSelectProject(chosen);
                }
              }}
              className="appearance-none bg-transparent pr-7 py-1 text-base font-bold text-[#14804a] hover:text-[#0f683b] focus:outline-hidden cursor-pointer"
            >
              {allProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  General workflow • {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[#14804a] pointer-events-none -ml-5" />
          </div>
          <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700">
            แยกเฉพาะโครงการ: {activeProject.name}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
            <span className="w-3.5 h-3 rounded-xs bg-[#facc15] border border-[#ca8a04] inline-block" />
            <span className="font-semibold text-slate-700">% ทาสก์ทำจริง (ความคืบหน้า)</span>
            <span className="text-slate-300">•</span>
            <span className="w-3.5 h-3 rounded-xs bg-[#ccebd7] border border-[#8fd1a8] inline-block" />
            <span className="font-semibold text-slate-700">แผนงานทาสก์ 100%</span>
          </div>
          <span className="text-slate-500 hidden xl:inline">
            คลิกหรือลากบนช่องวันที่เพื่อกำหนดแถบแผนงาน (Gantt)
          </span>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 2. FILTER & CALENDAR TOOLBAR (Matching KANNA screenshot)          */}
      {/* ================================================================= */}
      <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/40">
        {/* Left: Count + Search Box + 3 Checkboxes */}
        <div className="flex flex-wrap items-center gap-4">
          <span
            className="text-sm font-bold text-slate-800 tabular-nums"
            title="จำนวนเฟสงานในโครงการนี้"
          >
            {(activeProject.groups || []).length || 1}
          </span>

          {/* Search Input */}
          <div className="relative w-56 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหา เช่น SomJai, 7-11..."
              className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="w-4 h-4 rounded-full bg-slate-300 hover:bg-slate-400 text-white flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] cursor-pointer"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {/* 3 Filter Checkboxes */}
          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterResponsible}
              onChange={(e) => setFilterResponsible(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 accent-emerald-600 cursor-pointer"
            />
            <span>รับผิดชอบ</span>
          </label>

          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterIncomplete}
              onChange={(e) => setFilterIncomplete(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 accent-emerald-600 cursor-pointer"
            />
            <span>ไม่สำเร็จ</span>
          </label>

          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterHasDate}
              onChange={(e) => setFilterHasDate(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 accent-emerald-600 cursor-pointer"
            />
            <span>มีการตั้งค่าวันที่</span>
          </label>
        </div>

        {/* Right: Week/Month Navigation + Start/Today Buttons + Span Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => handleShiftMonth(-1)}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="ย้อนกลับ 1 เดือน"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleShiftDays(-7)}
              className="px-2 py-1 rounded-md hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-bold inline-flex items-center gap-0.5 transition-colors cursor-pointer"
              title="เลื่อนปฏิทินไปทางซ้าย 7 วัน"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">7 วัน</span>
            </button>

            <div className="px-2.5 py-0.5 text-center border-x border-slate-200 min-w-[130px]">
              <span className="block text-xs font-bold text-slate-800 tabular-nums leading-tight">
                {currentMonthTitle}
              </span>
              <span className="block text-[10px] text-slate-500 tabular-nums leading-tight">
                {visibleRangeLabel}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleShiftDays(7)}
              className="px-2 py-1 rounded-md hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-bold inline-flex items-center gap-0.5 transition-colors cursor-pointer"
              title="เลื่อนปฏิทินไปทางขวา 7 วัน"
            >
              <span className="hidden sm:inline">7 วัน</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleShiftMonth(1)}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="ถัดไป 1 เดือน"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setViewAnchorDate(getDefaultWindowStart(activeProject));
              setHighlightedDateIso(
                activeProject.id === 'prj-somjai'
                  ? '2026-06-10'
                  : activeProject.startDate || '2026-06-10'
              );
            }}
            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-800 transition-colors cursor-pointer"
            title="กลับไปที่ช่วงวันเริ่มต้นของโครงการนี้"
          >
            วันเริ่มโครงการ
          </button>

          <button
            type="button"
            onClick={() => {
              const todayIso = toIsoDate(new Date());
              // If already highlighting today, jump to 2026-06-10 or project start; otherwise jump to today
              if (highlightedDateIso === todayIso) {
                handleJumpToDate(activeProject.startDate || '2026-06-10');
              } else {
                handleJumpToDate(todayIso);
              }
            }}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 transition-colors cursor-pointer"
            title="เลื่อนปฏิทินไปที่วันนี้"
          >
            วันนี้
          </button>

          <select
            value={calendarSpanDays}
            onChange={(e) => setCalendarSpanDays(Number(e.target.value))}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 cursor-pointer"
          >
            <option value={28}>เดือน (28 วัน)</option>
            <option value={14}>2 สัปดาห์ (14 วัน)</option>
            <option value={42}>6 สัปดาห์ (42 วัน)</option>
          </select>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 3. SPLIT-PANE TREE + DAILY CALENDAR GANTT GRID                    */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* LEFT PANE: HIERARCHICAL PROJECT / PHASE / TASK TREE (5 cols) */}
        <div className="lg:col-span-5 border-r border-slate-200 flex flex-col">
          {/* Left Subheader: + สร้างโปรเจกต์ & เรียง dropdown */}
          <div className="h-[60px] px-4 border-b border-slate-200 flex items-center justify-between gap-2 bg-white">
            <button
              type="button"
              onClick={() =>
                setModalState({
                  mode: 'create_project',
                  title: '',
                  groupName: '',
                  supervisorOrAssignee: 'นายปรวิทย์ นวลนาค',
                  teamCount: 12,
                  weightPercent: 100,
                  progressPercent: 0,
                  workflowBadge: 'ทีมออกแบบ เตรียมแบบ',
                  startDate: '2026-05-27',
                  endDate: '2026-06-30',
                  priority: 'High',
                  hasSubArrow: false,
                })
              }
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#14804a] hover:text-[#0f683b] py-1.5 px-2 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างโปรเจกต์</span>
            </button>

            <div className="flex items-center gap-1.5 text-xs text-slate-600 min-w-0">
              <span className="font-semibold shrink-0">เรียง:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-medium truncate max-w-[190px] cursor-pointer"
              >
                <option value="newest">Creation date: Newest to Oldest</option>
                <option value="oldest">Creation date: Oldest to Newest</option>
                <option value="name">ชื่อโปรเจกต์ (ก-ฮ / A-Z)</option>
                <option value="progress">ความคืบหน้า (มากไปน้อย)</option>
              </select>
            </div>
          </div>

          {/* Left Tree Rows */}
          <div className="divide-y divide-slate-200/80">
            {filteredProjects.map((project) => {
              const isProjCollapsed = !!collapsedProjects[project.id];
              const projBadge = getBadgeStyle(project.workflowBadge, false);
              const projectGroups =
                project.groups && project.groups.length > 0
                  ? project.groups
                  : [
                      {
                        id: `${project.id}-default-g1`,
                        name: 'งานงวดที่ 1',
                        startDate: project.startDate,
                        endDate: project.endDate,
                        teamCount: 5,
                        workflowBadge: 'To do',
                      },
                    ];

              return (
                <React.Fragment key={project.id}>
                  {/* LEVEL 1: PROJECT ROW */}
                  <div className="h-[42px] px-3 flex items-center justify-between gap-2 bg-white hover:bg-slate-50/80 group transition-colors">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedProjects((prev) => ({
                            ...prev,
                            [project.id]: !prev[project.id],
                          }))
                        }
                        className="w-5 h-5 flex items-center justify-center text-slate-700 hover:text-slate-950 shrink-0 cursor-pointer"
                      >
                        {isProjCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <span
                        onClick={() =>
                          setModalState({
                            mode: 'edit_project',
                            projectId: project.id,
                            title: project.name,
                            groupName: '',
                            supervisorOrAssignee: project.supervisorName || '',
                            teamCount: project.teamCount ?? 12,
                            weightPercent: 100,
                            progressPercent: project.progress || 0,
                            workflowBadge:
                              project.workflowBadge || 'ทีมออกแบบ เตรียมแบบ',
                            startDate: project.startDate || '',
                            endDate: project.endDate || '',
                            priority: 'High',
                            hasSubArrow: false,
                          })
                        }
                        className="text-xs font-bold text-slate-900 truncate cursor-pointer hover:text-emerald-700"
                      >
                        {renderHighlightedText(project.name, true)}
                      </span>

                      {/* Quick hover buttons: + Phase & Edit */}
                      <div className="hidden group-hover:inline-flex items-center gap-1 ml-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setModalState({
                              mode: 'create_phase',
                              projectId: project.id,
                              title: '',
                              groupName: '',
                              supervisorOrAssignee:
                                project.supervisorName || 'นายปรวิทย์ นวลนาค',
                              teamCount: 5,
                              weightPercent: Math.max(
                                0,
                                100 -
                                  projectGroups.reduce(
                                    (sum, g) => sum + (g.weightPercent ?? 0),
                                    0
                                  )
                              ),
                              progressPercent: 0,
                              workflowBadge: 'To do',
                              startDate: project.startDate || '2026-06-01',
                              endDate: project.endDate || '2026-06-30',
                              priority: 'High',
                              hasSubArrow: false,
                            })
                          }
                          className="px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold cursor-pointer whitespace-nowrap"
                          title="เพิ่มเฟส / งวดงานในโปรเจกต์นี้"
                        >
                          + เฟส
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <TeamAvatarCluster
                        count={project.teamCount ?? 12}
                        onClick={() =>
                          setModalState({
                            mode: 'edit_project',
                            projectId: project.id,
                            title: project.name,
                            groupName: '',
                            supervisorOrAssignee: project.supervisorName || '',
                            teamCount: project.teamCount ?? 12,
                            weightPercent: 100,
                            progressPercent: project.progress || 0,
                            workflowBadge:
                              project.workflowBadge || 'ทีมออกแบบ เตรียมแบบ',
                            startDate: project.startDate || '',
                            endDate: project.endDate || '',
                            priority: 'High',
                            hasSubArrow: false,
                          })
                        }
                      />

                      <button
                        type="button"
                        onClick={() => handleCycleBadge('project', project)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold truncate w-[86px] text-center cursor-pointer transition-opacity hover:opacity-90 ${projBadge.bgClass} ${projBadge.textClass}`}
                        title={`สถานะ: ${projBadge.label} (คลิกเพื่อสลับสถานะ)`}
                      >
                        {projBadge.label}
                      </button>
                    </div>
                  </div>

                  {/* LEVEL 2: PHASE / GROUP ROWS */}
                  {!isProjCollapsed &&
                    projectGroups.map((group) => {
                      const phaseKey = `${project.id}::${group.id}`;
                      const isPhaseCollapsed = !!collapsedPhases[phaseKey];
                      const phaseBadge = getBadgeStyle(
                        group.workflowBadge || 'To do'
                      );
                      const grpStats = calculateGroupWeightedStats(
                        group,
                        projectGroups,
                        project.tasks || []
                      );
                      const groupTasks = filterProjectTasks(
                        (project.tasks || []).filter(
                          (t) => t.groupName === group.name
                        )
                      );

                      return (
                        <React.Fragment key={phaseKey}>
                          <div className="h-[42px] pl-6 pr-3 flex items-center justify-between gap-2 bg-white hover:bg-slate-50/80 group transition-colors">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setCollapsedPhases((prev) => ({
                                    ...prev,
                                    [phaseKey]: !prev[phaseKey],
                                  }))
                                }
                                className="w-5 h-5 flex items-center justify-center text-emerald-600 hover:text-emerald-800 shrink-0 cursor-pointer"
                              >
                                {isPhaseCollapsed ? (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <span
                                onClick={() =>
                                  setModalState({
                                    mode: 'edit_phase',
                                    projectId: project.id,
                                    groupId: group.id,
                                    title: group.name,
                                    groupName: group.name,
                                    supervisorOrAssignee:
                                      group.assignedTo ||
                                      project.supervisorName ||
                                      '',
                                    teamCount: group.teamCount ?? 5,
                                    weightPercent: grpStats.groupWeightPercent,
                                    progressPercent: grpStats.groupProgressPercent,
                                    workflowBadge:
                                      group.workflowBadge || 'To do',
                                    startDate: group.startDate || '',
                                    endDate: group.endDate || '',
                                    priority: 'High',
                                    hasSubArrow: false,
                                  })
                                }
                                className="text-xs font-medium text-slate-800 truncate cursor-pointer hover:text-emerald-700"
                              >
                                {renderHighlightedText(group.name)}
                              </span>

                              <span
                                className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold shrink-0"
                                title={`น้ำหนักงวดงาน ${grpStats.groupWeightPercent}% (ในงวดเสร็จ ${grpStats.groupProgressPercent}% = ${grpStats.groupEarnedInProject}% ของโครงการ)`}
                              >
                                {grpStats.groupWeightPercent}%
                              </span>

                              <div className="hidden group-hover:inline-flex items-center gap-1 ml-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setModalState({
                                      mode: 'create_task',
                                      projectId: project.id,
                                      groupId: group.id,
                                      title: '',
                                      groupName: group.name,
                                      supervisorOrAssignee:
                                        project.supervisorName ||
                                        'นายปรวิทย์ นวลนาค',
                                      teamCount: 4,
                                      weightPercent: Math.max(
                                        0,
                                        parseFloat(
                                          (
                                            100 -
                                            grpStats.totalTaskWeightInGroup
                                          ).toFixed(2)
                                        )
                                      ),
                                      progressPercent: 0,
                                      workflowBadge: 'Pending',
                                      startDate:
                                        group.startDate ||
                                        project.startDate ||
                                        '2026-06-05',
                                      endDate:
                                        group.endDate ||
                                        project.endDate ||
                                        '2026-06-25',
                                      priority: 'High',
                                      hasSubArrow: false,
                                    })
                                  }
                                  className="px-1.5 py-0.5 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 text-[10px] font-bold cursor-pointer whitespace-nowrap"
                                  title="เพิ่มกิจกรรมในเฟสนี้"
                                >
                                  + กิจกรรม
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <TeamAvatarCluster
                                count={group.teamCount ?? 5}
                                onClick={() =>
                                  setModalState({
                                    mode: 'edit_phase',
                                    projectId: project.id,
                                    groupId: group.id,
                                    title: group.name,
                                    groupName: group.name,
                                    supervisorOrAssignee:
                                      group.assignedTo ||
                                      project.supervisorName ||
                                      '',
                                    teamCount: group.teamCount ?? 5,
                                    weightPercent: grpStats.groupWeightPercent,
                                    progressPercent: grpStats.groupProgressPercent,
                                    workflowBadge:
                                      group.workflowBadge || 'To do',
                                    startDate: group.startDate || '',
                                    endDate: group.endDate || '',
                                    priority: 'High',
                                    hasSubArrow: false,
                                  })
                                }
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  handleCycleBadge('phase', project, group.id)
                                }
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold truncate w-[86px] text-center cursor-pointer transition-opacity hover:opacity-90 ${phaseBadge.bgClass} ${phaseBadge.textClass}`}
                                title={`สถานะ: ${phaseBadge.label} (คลิกเพื่อสลับสถานะ)`}
                              >
                                {phaseBadge.label}
                              </button>
                            </div>
                          </div>

                          {/* LEVEL 3: TASK / SUB-ITEM ROWS */}
                          {!isPhaseCollapsed &&
                            groupTasks.map((task) => {
                              const taskBadge = getBadgeStyle(
                                task.workflowBadge,
                                task.completed
                              );
                              const taskStat = grpStats.taskStatsById[task.id];
                              const actualTaskPct = getTaskProgressPercent(task);
                              return (
                                <div
                                  key={task.id}
                                  className="h-[42px] pl-11 pr-3 flex items-center justify-between gap-2 bg-white hover:bg-slate-50/80 group transition-colors"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    {task.hasSubArrow ? (
                                      <ChevronRight className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                    ) : (
                                      <span className="w-2 shrink-0" />
                                    )}
                                    <span
                                      onClick={() =>
                                        setModalState({
                                          mode: 'edit_task',
                                          projectId: project.id,
                                          groupId: group.id,
                                          taskId: task.id,
                                          title: task.title,
                                          groupName: task.groupName,
                                          supervisorOrAssignee:
                                            task.assignedTo ||
                                            project.supervisorName ||
                                            '',
                                          teamCount: task.teamCount ?? 3,
                                          weightPercent:
                                            taskStat?.taskWeightInGroup ??
                                            task.weightPercent ??
                                            0,
                                          progressPercent: actualTaskPct,
                                          workflowBadge: taskBadge.label,
                                          startDate: task.startDate || '',
                                          endDate: task.endDate || '',
                                          priority: task.priority || 'High',
                                          hasSubArrow: !!task.hasSubArrow,
                                        })
                                      }
                                      className="text-xs text-slate-800 leading-tight line-clamp-2 cursor-pointer hover:text-emerald-700"
                                    >
                                      {renderHighlightedText(task.title)}
                                    </span>
                                    {taskStat && (
                                      <span
                                        className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold shrink-0"
                                        title={`น้ำหนักในงวด ${taskStat.taskWeightInGroup}% (ได้ ${taskStat.taskEarnedInProject}% ของโครงการ)`}
                                      >
                                        น้ำหนัก {taskStat.taskWeightInGroup}%
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {/* Inline Actual Task Progress (%) Editor matching the Yellow Gantt Bar */}
                                    <div
                                      className="inline-flex items-center bg-amber-50 border border-amber-300 rounded px-1.5 py-0.5 text-[10px] font-bold text-amber-900"
                                      title="ปรับ % ความคืบหน้างานที่ทำจริงของทาสก์นี้ (แสดงเป็นแถบสีเหลืองบนตาราง Gantt)"
                                    >
                                      <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={actualTaskPct}
                                        onChange={(e) =>
                                          handleInlineTaskProgressChange(
                                            project,
                                            task.id,
                                            parseInt(e.target.value, 10) || 0
                                          )
                                        }
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-8 bg-transparent text-right font-bold text-amber-900 focus:outline-hidden"
                                      />
                                      <span className="ml-0.5 text-amber-700">%</span>
                                    </div>

                                    <TeamAvatarCluster
                                      count={task.teamCount ?? 0}
                                      doubleAvatar={
                                        (task.teamCount ?? 0) === 4 ||
                                        (task.teamCount ?? 0) === 2
                                      }
                                      onClick={() =>
                                        setModalState({
                                          mode: 'edit_task',
                                          projectId: project.id,
                                          groupId: group.id,
                                          taskId: task.id,
                                          title: task.title,
                                          groupName: task.groupName,
                                          supervisorOrAssignee:
                                            task.assignedTo ||
                                            project.supervisorName ||
                                            '',
                                          teamCount: task.teamCount ?? 3,
                                          weightPercent:
                                            taskStat?.taskWeightInGroup ??
                                            task.weightPercent ??
                                            0,
                                          progressPercent: actualTaskPct,
                                          workflowBadge: taskBadge.label,
                                          startDate: task.startDate || '',
                                          endDate: task.endDate || '',
                                          priority: task.priority || 'High',
                                          hasSubArrow: !!task.hasSubArrow,
                                        })
                                      }
                                    />

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCycleBadge(
                                          'task',
                                          project,
                                          group.id,
                                          task.id
                                        )
                                      }
                                      className={`px-2 py-0.5 rounded text-[11px] font-semibold truncate w-[86px] text-center cursor-pointer transition-opacity hover:opacity-90 ${taskBadge.bgClass} ${taskBadge.textClass}`}
                                      title={`สถานะ: ${taskBadge.label} (คลิกเพื่อสลับสถานะ)`}
                                    >
                                      {taskBadge.label}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                        </React.Fragment>
                      );
                    })}
                </React.Fragment>
              );
            })}

            {filteredProjects.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                ไม่พบโปรเจกต์ที่ตรงกับเงื่อนไขการค้นหา
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: DAILY CALENDAR HEADER + GANTT BARS (7 cols) */}
        <div className="lg:col-span-7 overflow-x-auto flex flex-col">
          <div className="min-w-[840px]">
            {/* Calendar Header (60px height matching Left Subheader) */}
            <div className="h-[60px] border-b border-slate-200 bg-white flex flex-col justify-between">
              {/* Top Month Label + Quick Left/Right Day Shift Buttons */}
              <div className="px-3 pt-1 flex items-center justify-between text-[11px] font-bold text-slate-700">
                <span>
                  {currentMonthTitle}{' '}
                  <span className="font-normal text-slate-400 ml-1">
                    ({visibleRangeLabel})
                  </span>
                </span>
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleShiftDays(-7)}
                    className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-800 text-[10px] font-semibold cursor-pointer"
                    title="เลื่อนซ้าย 7 วัน"
                  >
                    ← เลื่อนซ้าย
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShiftDays(7)}
                    className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-800 text-[10px] font-semibold cursor-pointer"
                    title="เลื่อนขวา 7 วัน"
                  >
                    เลื่อนขวา →
                  </button>
                </div>
              </div>

              {/* Day Numbers + Day of Week Row */}
              <div
                className="grid text-center"
                style={{
                  gridTemplateColumns: `repeat(${visibleDays.length}, minmax(30px, 1fr))`,
                }}
              >
                {visibleDays.map((day) => {
                  const isHighlighted = day.iso === highlightedDateIso;
                  return (
                    <div
                      key={`hdr-${day.iso}`}
                      onClick={() => setHighlightedDateIso(day.iso)}
                      className={`pb-1 flex flex-col items-center justify-end cursor-pointer select-none ${
                        day.isWeekend ? 'bg-slate-100/70' : ''
                      }`}
                    >
                      <span
                        className={`w-5 h-5 flex items-center justify-center text-[11px] font-bold tabular-nums ${
                          isHighlighted
                            ? 'rounded-full bg-[#14804a] text-white shadow-2xs'
                            : 'text-slate-700'
                        }`}
                      >
                        {day.dayNum}
                      </span>
                      <span className="text-[10px] text-slate-500 leading-none mt-0.5">
                        {day.dayShort}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Gantt Rows (Synchronized 1-to-1 with Left Tree Rows) */}
            <div>
              {filteredProjects.map((project) => {
                const isProjCollapsed = !!collapsedProjects[project.id];
                const projectGroups =
                  project.groups && project.groups.length > 0
                    ? project.groups
                    : [
                        {
                          id: `${project.id}-default-g1`,
                          name: 'งานงวดที่ 1',
                          startDate: project.startDate,
                          endDate: project.endDate,
                          teamCount: 5,
                          workflowBadge: 'To do',
                        },
                      ];

                return (
                  <React.Fragment key={`gantt-proj-${project.id}`}>
                    {/* LEVEL 1 GANTT ROW: PROJECT */}
                    {renderGanttRowCells(
                      'project',
                      project,
                      project.startDate,
                      project.endDate
                    )}

                    {/* LEVEL 2 GANTT ROWS: PHASES */}
                    {!isProjCollapsed &&
                      projectGroups.map((group) => {
                        const phaseKey = `${project.id}::${group.id}`;
                        const isPhaseCollapsed = !!collapsedPhases[phaseKey];
                        const groupTasks = filterProjectTasks(
                          (project.tasks || []).filter(
                            (t) => t.groupName === group.name
                          )
                        );

                        return (
                          <React.Fragment key={`gantt-phase-${phaseKey}`}>
                            {renderGanttRowCells(
                              'phase',
                              project,
                              group.startDate,
                              group.endDate,
                              undefined,
                              group.id
                            )}

                            {/* LEVEL 3 GANTT ROWS: TASKS */}
                            {!isPhaseCollapsed &&
                              groupTasks.map((task) => (
                                <React.Fragment key={`gantt-task-${task.id}`}>
                                  {renderGanttRowCells(
                                    'task',
                                    project,
                                    task.startDate,
                                    task.endDate,
                                    task.title,
                                    group.id,
                                    task.id,
                                    getTaskProgressPercent(task)
                                  )}
                                </React.Fragment>
                              ))}
                          </React.Fragment>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Bottom Horizontal Calendar Timeline Scrubber Bar */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleShiftDays(-7)}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 inline-flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>เลื่อนซ้าย 7 วัน</span>
              </button>

              <div className="flex-1 flex items-center gap-3 max-w-md mx-auto">
                <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
                  เลื่อนช่วงปฏิทิน:
                </span>
                <input
                  type="range"
                  min={-90}
                  max={90}
                  step={1}
                  value={Math.min(90, Math.max(-90, timelineDayOffset))}
                  onChange={(e) => {
                    const offset = parseInt(e.target.value, 10) || 0;
                    const base = getDefaultWindowStart(activeProject);
                    base.setDate(base.getDate() + offset);
                    setViewAnchorDate(base);
                  }}
                  className="w-full h-2 accent-emerald-600 cursor-pointer"
                  title="ลากแถบนี้เพื่อเลื่อนปฏิทินซ้าย-ขวาแบบรายวัน"
                />
                <span className="text-[11px] font-bold text-emerald-700 whitespace-nowrap min-w-[115px] text-right tabular-nums">
                  {visibleRangeLabel}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleShiftDays(7)}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 inline-flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
              >
                <span>เลื่อนขวา 7 วัน</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 4. MODAL FOR CREATING / EDITING PROJECT, PHASE, OR TASK           */}
      {/* ================================================================= */}
      {modalState && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                <span>
                  {modalState.mode === 'create_project' &&
                    'สร้างโปรเจกต์ใหม่ (General Workflow)'}
                  {modalState.mode === 'edit_project' &&
                    'แก้ไขข้อมูลโปรเจกต์'}
                  {modalState.mode === 'create_phase' &&
                    'เพิ่มเฟส / งวดงานใหม่'}
                  {modalState.mode === 'edit_phase' &&
                    'แก้ไขเฟส / งวดงาน'}
                  {modalState.mode === 'create_task' &&
                    'เพิ่มกิจกรรม / งานย่อยใหม่'}
                  {modalState.mode === 'edit_task' &&
                    'แก้ไขกิจกรรม / งานย่อย'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setModalState(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {modalState.mode.includes('project')
                    ? 'ชื่อโปรเจกต์'
                    : modalState.mode.includes('phase')
                    ? 'ชื่อเฟส / งวดงาน'
                    : 'ชื่อกิจกรรม / อาคาร / งานย่อย'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={modalState.title}
                  onChange={(e) =>
                    setModalState({ ...modalState, title: e.target.value })
                  }
                  placeholder={
                    modalState.mode.includes('project')
                      ? 'เช่น Project SomJai หรือ 7-11 สุขุมวิท'
                      : modalState.mode.includes('phase')
                      ? 'เช่น SomJai Phase 2 หรือ งานงวดที่ 1'
                      : 'เช่น Install Fire Alarm system หรือ Building 2'
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ผู้รับผิดชอบหลัก
                  </label>
                  <input
                    type="text"
                    value={modalState.supervisorOrAssignee}
                    onChange={(e) =>
                      setModalState({
                        ...modalState,
                        supervisorOrAssignee: e.target.value,
                      })
                    }
                    placeholder="เช่น นายปรวิทย์ นวลนาค"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    จำนวนทีมงาน (+คน)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={modalState.teamCount}
                    onChange={(e) =>
                      setModalState({
                        ...modalState,
                        teamCount: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-emerald-700"
                  />
                </div>
              </div>

              {!modalState.mode.includes('project') && (
                <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div>
                    <span className="block font-bold text-indigo-900 text-xs">
                      {modalState.mode.includes('phase')
                        ? 'น้ำหนักงวดงาน (% เทียบทั้งโครงการ)'
                        : 'น้ำหนักกิจกรรม (% ภายในงวดงานนี้)'}
                    </span>
                    <span className="text-[10px] text-indigo-700">
                      {modalState.mode.includes('phase')
                        ? 'ผลรวมทุกงวดงานควรเท่ากับ 100% ของโครงการ'
                        : 'ผลรวมกิจกรรมในงวดควรเท่ากับ 100% ของงวดงาน'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.5"
                      value={modalState.weightPercent}
                      onChange={(e) =>
                        setModalState({
                          ...modalState,
                          weightPercent: Math.min(
                            100,
                            Math.max(0, parseFloat(e.target.value) || 0)
                          ),
                        })
                      }
                      className="w-16 px-2 py-1 text-right font-bold text-indigo-700 bg-white border border-indigo-300 rounded-lg"
                    />
                    <span className="font-bold text-indigo-800">%</span>
                  </div>
                </div>
              )}

              {modalState.mode.includes('task') && (
                <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="block font-bold text-amber-950 text-xs">
                        ความคืบหน้างานที่ทำจริง (%)
                      </span>
                      <span className="text-[10px] text-amber-800">
                        แสดงเป็นแถบสีเหลืองทับแถบแผนงาน 100% (สีเขียวอ่อน) บนตาราง Gantt
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={modalState.progressPercent}
                        onChange={(e) => {
                          const nextPct = Math.min(
                            100,
                            Math.max(0, parseInt(e.target.value, 10) || 0)
                          );
                          setModalState({
                            ...modalState,
                            progressPercent: nextPct,
                            workflowBadge:
                              nextPct >= 100
                                ? 'Completed'
                                : modalState.workflowBadge === 'Completed' ||
                                  modalState.workflowBadge === 'งานเสร็จเรียบร้อย'
                                ? nextPct > 0
                                  ? 'In Progress'
                                  : 'Pending'
                                : modalState.workflowBadge,
                          });
                        }}
                        className="w-16 px-2 py-1 text-right font-bold text-amber-900 bg-white border border-amber-400 rounded-lg"
                      />
                      <span className="font-bold text-amber-900">%</span>
                    </div>
                  </div>

                  {/* Live Two-Tone Preview Bar inside Modal */}
                  <div className="w-full h-3 rounded-md bg-[#ccebd7] border border-[#8fd1a8] relative overflow-hidden">
                    <div
                      className="h-full bg-[#facc15] border-r border-[#ca8a04] transition-all duration-150"
                      style={{
                        width: `${Math.min(100, Math.max(0, modalState.progressPercent))}%`,
                      }}
                    />
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={modalState.progressPercent}
                    onChange={(e) => {
                      const nextPct = parseInt(e.target.value, 10) || 0;
                      setModalState({
                        ...modalState,
                        progressPercent: nextPct,
                        workflowBadge:
                          nextPct >= 100
                            ? 'Completed'
                            : modalState.workflowBadge === 'Completed' ||
                              modalState.workflowBadge === 'งานเสร็จเรียบร้อย'
                            ? nextPct > 0
                              ? 'In Progress'
                              : 'Pending'
                            : modalState.workflowBadge,
                      });
                    }}
                    className="w-full h-1.5 accent-amber-500 cursor-pointer"
                  />

                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    {[0, 25, 50, 75, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          setModalState({
                            ...modalState,
                            progressPercent: preset,
                            workflowBadge:
                              preset >= 100
                                ? 'Completed'
                                : modalState.workflowBadge === 'Completed' ||
                                  modalState.workflowBadge === 'งานเสร็จเรียบร้อย'
                                ? preset > 0
                                  ? 'In Progress'
                                  : 'Pending'
                                : modalState.workflowBadge,
                          })
                        }
                        className={`flex-1 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                          modalState.progressPercent === preset
                            ? 'bg-amber-500 text-slate-950 shadow-2xs'
                            : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                        }`}
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ป้ายสถานะ (Workflow Status)
                </label>
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  {WORKFLOW_BADGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() =>
                        setModalState({
                          ...modalState,
                          workflowBadge: opt.label,
                          progressPercent: opt.marksCompleted
                            ? 100
                            : modalState.progressPercent >= 100
                            ? 50
                            : modalState.progressPercent,
                        })
                      }
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-between cursor-pointer border ${
                        modalState.workflowBadge === opt.label
                          ? 'ring-2 ring-slate-900 border-transparent'
                          : 'border-transparent opacity-85 hover:opacity-100'
                      } ${opt.bgClass} ${opt.textClass}`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {modalState.workflowBadge === opt.label && (
                        <Check className="w-3.5 h-3.5 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={modalState.workflowBadge}
                  onChange={(e) =>
                    setModalState({
                      ...modalState,
                      workflowBadge: e.target.value,
                    })
                  }
                  placeholder="หรือพิมพ์สถานะกำหนดเอง..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    <Calendar className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                    วันที่เริ่มต้น (Start Date)
                  </label>
                  <input
                    type="date"
                    value={modalState.startDate}
                    onChange={(e) =>
                      setModalState({
                        ...modalState,
                        startDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    <Calendar className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                    วันที่สิ้นสุด (End Date)
                  </label>
                  <input
                    type="date"
                    value={modalState.endDate}
                    onChange={(e) =>
                      setModalState({
                        ...modalState,
                        endDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                {modalState.mode === 'edit_task' && modalState.taskId ? (
                  <button
                    type="button"
                    onClick={() => {
                      const proj =
                        allProjects.find(
                          (p) => p.id === modalState.projectId
                        ) || activeProject;
                      if (proj) {
                        const nextTasks = proj.tasks.filter(
                          (t) => t.id !== modalState.taskId
                        );
                        onUpdateProject({
                          ...proj,
                          tasks: nextTasks,
                          progress: recalculateProjectProgress(nextTasks, proj),
                        });
                      }
                      setModalState(null);
                    }}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบกิจกรรม</span>
                  </button>
                ) : modalState.mode === 'edit_project' &&
                  modalState.projectId &&
                  onDeleteProject ? (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteProject(modalState.projectId!);
                      setModalState(null);
                    }}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบโปรเจกต์</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalState(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                  >
                    บันทึกข้อมูล
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
