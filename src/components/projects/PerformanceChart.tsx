/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Project, ProjectGroup } from '../../types/types.ts';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  DollarSign,
  PieChart,
  Layers,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { formatCurrency } from '../../utils/bahtText.ts';
import { getTaskProgressPercent } from './ProjectKanban.tsx';
import {
  DEFAULT_PROJECT_GROUPS,
  calculateGroupWeightedStats,
  calculateProjectWeightedStats,
} from '../../utils/projectWeights.ts';

interface PerformanceChartProps {
  project: Project;
}

const DEFAULT_GROUPS: ProjectGroup[] = [
  { id: 'g1', name: 'งานงวดที่ 1' },
  { id: 'g2', name: 'งานงวดที่ 2' },
  { id: 'g3', name: 'งานงวดที่ 3' },
  { id: 'g4', name: 'งานเครื่องจักร' },
  { id: 'g5', name: 'คอนกรีต' },
];

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

function formatShortDate(date: Date): string {
  if (isNaN(date.getTime())) return '';
  const day = date.getDate();
  const month = THAI_SHORT_MONTHS[date.getMonth()];
  const thaiYearShort = ((date.getFullYear() + 543) % 100).toString().padStart(2, '0');
  return `${day} ${month} ${thaiYearShort}`;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ project }) => {
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('ALL');
  const [barChartLayout, setBarChartLayout] = useState<'both' | 'vertical' | 'horizontal'>('both');

  const groups: ProjectGroup[] =
    project.groups && project.groups.length > 0
      ? project.groups
      : project.groupsInitialized
      ? []
      : DEFAULT_PROJECT_GROUPS;

  const hasTasks = project.tasks.length > 0;
  const totalTasks = hasTasks ? project.tasks.length : 20;
  const completedTasks = hasTasks
    ? project.tasks.filter((t) => getTaskProgressPercent(t) >= 100).length
    : project.progress >= 100
    ? totalTasks
    : Math.round((project.progress / 100) * totalTasks);

  const inProgressTasks = hasTasks
    ? project.tasks.filter((t) => {
        const p = getTaskProgressPercent(t);
        return p > 0 && p < 100;
      }).length
    : 0;

  const weightedProjectStats = calculateProjectWeightedStats({
    ...project,
    groups,
  });

  // Overall Actual % using weighted phases & tasks (or fallback to equal average/project.progress)
  const actualPercent = weightedProjectStats.projectProgressPercent;

  // Calculate per-group (งวดงาน) statistics
  const activeGroups =
    groups.length > 0
      ? groups
      : [{ id: 'default', name: 'งวดงานหลัก', weightPercent: 100 }];

  const groupStats = activeGroups.map((grp, idx) => {
    const grpWeighted = calculateGroupWeightedStats(grp, activeGroups, project.tasks);
    const avgProgress = hasTasks ? grpWeighted.groupProgressPercent : actualPercent;
    const weight = grpWeighted.groupWeightPercent;
    const weightedContribution = hasTasks
      ? grpWeighted.groupEarnedInProject
      : parseFloat(((avgProgress * weight) / 100).toFixed(2));

    return {
      id: grp.id,
      index: idx + 1,
      name: grp.name,
      taskCount: grpWeighted.taskCount,
      completedCount: grpWeighted.completedTaskCount,
      totalTaskWeightInGroup: grpWeighted.totalTaskWeightInGroup,
      avgProgress: parseFloat(avgProgress.toFixed(2)),
      weight: parseFloat(weight.toFixed(2)),
      weightedContribution: parseFloat(weightedContribution.toFixed(2)),
    };
  });

  // Build activity items for Bar Chart comparing each activity vs actual work done
  const allActivityBarItems = hasTasks
    ? project.tasks.map((task, idx) => {
        const actual = parseFloat(getTaskProgressPercent(task).toFixed(1));
        const planned = 100;
        const remaining = parseFloat(Math.max(0, 100 - actual).toFixed(1));
        return {
          id: task.id,
          index: idx + 1,
          title: task.title,
          groupName: task.groupName || 'ทั่วไป',
          actual,
          planned,
          remaining,
          startDate: task.startDate,
          endDate: task.endDate,
          priority: task.priority,
        };
      })
    : groupStats.map((g, idx) => ({
        id: g.id,
        index: idx + 1,
        title: g.name,
        groupName: g.name,
        actual: g.avgProgress,
        planned: 100,
        remaining: parseFloat(Math.max(0, 100 - g.avgProgress).toFixed(1)),
        startDate: project.startDate,
        endDate: project.endDate,
        priority: 'Medium' as const,
      }));

  const filteredActivityBarItems =
    selectedGroupFilter === 'ALL'
      ? allActivityBarItems
      : allActivityBarItems.filter((item) => item.groupName === selectedGroupFilter);

  // Helper to parse YYYY-MM-DD in local time (avoiding UTC midnight shift)
  const parseLocalDateMs = (dateStr?: string, fallbackMs?: number): number => {
    if (dateStr) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          return new Date(y, m, d).getTime();
        }
      }
      const parsed = new Date(dateStr).getTime();
      if (!isNaN(parsed)) return parsed;
    }
    return fallbackMs ?? Date.now();
  };

  const todayDateObj = new Date();
  const todayLocalMidnight = new Date(
    todayDateObj.getFullYear(),
    todayDateObj.getMonth(),
    todayDateObj.getDate()
  );
  const todayMs = todayLocalMidnight.getTime();
  const todayThaiSlash = `${todayLocalMidnight.getDate()}/${
    todayLocalMidnight.getMonth() + 1
  }/${todayLocalMidnight.getFullYear() + 543}`;

  // Build dynamic S-Curve Milestones from project startDate -> endDate
  const startMs = parseLocalDateMs(project.startDate, todayMs - 30 * 24 * 60 * 60 * 1000);
  const rawEndMs = parseLocalDateMs(project.endDate, startMs + 90 * 24 * 60 * 60 * 1000);
  const endMs = rawEndMs <= startMs ? startMs + 90 * 24 * 60 * 60 * 1000 : rawEndMs;

  // Hermite S-curve helper: t in [0, 1] -> planned % in [0, 100]
  const calcPlannedSPercent = (ratio: number): number => {
    const t = Math.min(1, Math.max(0, ratio));
    const s = 3 * t * t - 2 * t * t * t;
    return parseFloat((s * 100).toFixed(1));
  };

  // Current date position along the project timeline [0, 1]
  const isBeforeStart = todayMs < startMs;
  const isAfterEnd = todayMs > endMs;
  const timeElapsedRatio = Math.min(1, Math.max(0, (todayMs - startMs) / (endMs - startMs)));
  const plannedAtToday = calcPlannedSPercent(timeElapsedRatio);
  const variance = parseFloat((actualPercent - plannedAtToday).toFixed(1));

  // Standard S-Curve milestones for Planned line (0% -> 100% across full project)
  const totalSteps = Math.max(4, activeGroups.length + 1);
  const milestones = Array.from({ length: totalSteps + 1 }, (_, stepIdx) => {
    const ratio = stepIdx / totalSteps;
    const stepMs = startMs + (endMs - startMs) * ratio;
    const stepDate = new Date(stepMs);
    const dateLabel = formatShortDate(stepDate);
    const plannedVal =
      stepIdx === 0 ? 0 : stepIdx === totalSteps ? 100 : calcPlannedSPercent(ratio);

    let stepLabel = '';
    if (stepIdx === 0) {
      stepLabel = 'เริ่มโครงการ';
    } else if (stepIdx === totalSteps) {
      stepLabel = 'ส่งมอบงาน';
    } else if (activeGroups[stepIdx - 1]) {
      stepLabel = activeGroups[stepIdx - 1].name;
    } else {
      stepLabel = `ระยะที่ ${stepIdx}`;
    }

    return {
      stepIdx,
      ratio,
      dateMs: stepMs,
      label: stepLabel,
      dateLabel,
      planned: plannedVal,
    };
  });

  // SVG chart dimensions
  const svgWidth = 760;
  const svgHeight = 326;
  const padLeft = 52;
  const padRight = 40;
  const padTop = 44;
  const padBottom = 64;
  const graphWidth = svgWidth - padLeft - padRight;
  const graphHeight = svgHeight - padTop - padBottom;

  const getXByRatio = (ratio: number) =>
    padLeft + Math.min(1, Math.max(0, ratio)) * graphWidth;
  const getX = (index: number) =>
    getXByRatio(index / Math.max(1, milestones.length - 1));
  const getY = (val: number) =>
    padTop + graphHeight - (Math.min(100, Math.max(0, val)) / 100) * graphHeight;

  // Build smooth cubic bezier SVG path for S-Curve
  const buildSmoothPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpx1 = p0.x + (p1.x - p0.x) * 0.45;
      const cpy1 = p0.y;
      const cpx2 = p0.x + (p1.x - p0.x) * 0.55;
      const cpy2 = p1.y;
      d += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  // Planned points cover the entire project duration (0% -> 100%)
  const plannedPoints = milestones.map((m, i) => ({ x: getX(i), y: getY(m.planned) }));
  const plannedPath = buildSmoothPath(plannedPoints);

  // Actual cumulative points STOP at Today (like a live trading chart)
  // Build past checkpoints strictly before todayMs, then terminate at (todayX, actualPercent)
  const todayX = getXByRatio(timeElapsedRatio);
  const todayActualY = getY(actualPercent);
  const todayPlannedY = getY(plannedAtToday);

  interface ActualCurveNode {
    x: number;
    y: number;
    value: number;
    isTodayTerminal?: boolean;
  }

  const actualNodes: ActualCurveNode[] = [];
  if (timeElapsedRatio <= 0.001) {
    // Today is at or before project start date -> stop at start point
    actualNodes.push({
      x: padLeft,
      y: getY(actualPercent),
      value: actualPercent,
      isTodayTerminal: true,
    });
  } else {
    // Start at (startMs, 0%)
    actualNodes.push({ x: padLeft, y: getY(0), value: 0 });

    // Intermediate milestone nodes strictly before today (with small margin so dots don't overlap today's terminal dot)
    const pastMilestones = milestones.filter(
      (m) => m.stepIdx > 0 && m.ratio < timeElapsedRatio - 0.035
    );

    let prevActual = 0;
    for (const m of pastMilestones) {
      // Scale progress smoothly along elapsed ratio up to today's actualPercent
      const progressAlongElapsed =
        plannedAtToday > 0
          ? (m.planned / plannedAtToday) * actualPercent
          : (m.ratio / timeElapsedRatio) * actualPercent;

      // Blend slightly with real phase cumulative contribution if tasks exist
      let val = progressAlongElapsed;
      if (hasTasks && activeGroups.length > 0 && m.stepIdx <= groupStats.length) {
        const sumContrib = groupStats
          .slice(0, m.stepIdx)
          .reduce((acc, g) => acc + g.weightedContribution, 0);
        val = Math.min(actualPercent, (progressAlongElapsed + sumContrib) / 2);
      }
      val = parseFloat(Math.min(actualPercent, Math.max(prevActual, val)).toFixed(1));
      prevActual = val;

      actualNodes.push({
        x: getXByRatio(m.ratio),
        y: getY(val),
        value: val,
      });
    }

    // Terminal live point right at Today's date
    actualNodes.push({
      x: todayX,
      y: todayActualY,
      value: actualPercent,
      isTodayTerminal: true,
    });
  }

  const actualPath = buildSmoothPath(actualNodes);
  const baselineY = getY(0);
  const actualAreaPath =
    actualNodes.length > 1
      ? `${actualPath} L ${actualNodes[actualNodes.length - 1].x} ${baselineY} L ${actualNodes[0].x} ${baselineY} Z`
      : '';

  // Smart positioning for Today's live callout badge so it never clips off the SVG edges
  const placeCalloutLeft = todayX > svgWidth - padRight - 140;
  const calloutW = 108;
  const calloutH = 22;
  const calloutX = placeCalloutLeft ? todayX - calloutW - 10 : todayX + 10;
  const calloutY = Math.min(
    baselineY - calloutH - 4,
    Math.max(padTop + 4, todayActualY - calloutH / 2)
  );

  // Today top header pill X clamped inside graph bounds
  const todayPillW = 122;
  const todayPillX = Math.min(
    svgWidth - padRight - todayPillW / 2,
    Math.max(padLeft + todayPillW / 2, todayX)
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-1.5 text-xs text-blue-600 font-semibold mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>2.4 กราฟแสดงผลงาน (Project Performance & S-Curve)</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900">{project.name}</h3>
          <p className="text-xs text-slate-500">
            วิเคราะห์ความก้าวหน้าสะสมของโครงการ (S-Curve) และกราฟแท่งเปรียบเทียบกิจกรรมกับผลงานที่ทำจริงในแต่ละกิจกรรม
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span className="text-slate-600">
            ระยะเวลา: <strong className="text-slate-900">{project.startDate}</strong> ถึง{' '}
            <strong className="text-slate-900">{project.endDate}</strong>
          </span>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Actual Progress */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>ผลงานจริงสะสม (ณ {todayThaiSlash})</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 tabular-nums">{actualPercent}%</div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, actualPercent)}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            คำนวณจากน้ำหนักงวดงานและ % ของทุกกิจกรรมในโครงการ
          </p>
        </div>

        {/* Planned Progress at Today */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>แผนงานคาดการณ์ ณ วันนี้</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600 tabular-nums">
              {plannedAtToday}%
            </span>
            <span className="text-xs text-slate-400">/ เป้าหมาย 100%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full"
              style={{ width: `${Math.min(100, plannedAtToday)}%` }}
            ></div>
          </div>
          <p
            className={`text-[11px] font-semibold mt-1.5 tabular-nums ${
              variance > 0
                ? 'text-emerald-600'
                : variance < 0
                ? 'text-rose-600'
                : 'text-slate-500'
            }`}
          >
            {variance > 0
              ? `เร็วกว่าแผน +${variance}%`
              : variance < 0
              ? `ช้ากว่าแผน ${variance}%`
              : 'ผลงานจริงตรงตามแผนงาน ณ วันนี้'}
          </p>
        </div>

        {/* Task Completion */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>สถานะกิจกรรมการทำงาน</span>
            <PieChart className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {completedTasks} / {totalTasks} <span className="text-xs font-normal text-slate-500">เสร็จ 100%</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            กำลังดำเนินการ {inProgressTasks} กิจกรรม • รอดำเนินการ{' '}
            {Math.max(0, totalTasks - completedTasks - inProgressTasks)} กิจกรรม
          </p>
        </div>

        {/* Project Budget */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>งบประมาณโครงการ</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {formatCurrency(project.budget)} บ.
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1.5 tabular-nums">
            มูลค่างานตามผลงานจริง ≈ {formatCurrency((project.budget * actualPercent) / 100)} บ.
          </p>
        </div>
      </div>

      {/* S-Curve Graph Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h4 className="font-bold text-slate-800 text-base">
              กราฟเส้นแสดงความก้าวหน้าโครงการ (S-Curve)
            </h4>
            <p className="text-xs text-slate-500">
              เส้นทึบสีเขียว (ผลงานจริงสะสม) หยุดที่วันที่ปัจจุบัน ({todayThaiSlash}) เพื่อเปรียบเทียบกับเส้นแผนงานคาดการณ์ (เส้นประสีน้ำเงิน)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
            <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
              <span className="w-4 h-0.5 bg-blue-600 border-t-2 border-dashed border-blue-600"></span>
              <span className="text-blue-800">
                แผนงานสะสม (ณ วันนี้ {plannedAtToday}%)
              </span>
            </div>
            <div className="flex items-center space-x-2 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
              <span className="w-4 h-1 bg-emerald-500 rounded-full"></span>
              <span className="text-emerald-900 font-bold">
                ผลงานจริงสะสม ({actualPercent}% ณ {todayThaiSlash})
              </span>
            </div>
            <div className="flex items-center space-x-1.5 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200 text-amber-800 font-semibold">
              <span className="w-0.5 h-3.5 bg-amber-500"></span>
              <span>
                วันนี้ {todayThaiSlash}
                {isBeforeStart ? ' (ก่อนเริ่มงาน)' : isAfterEnd ? ' (เลยกำหนดส่ง)' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Responsive SVG Chart */}
        <div className="w-full overflow-x-auto">
          <div className="min-w-[680px] mx-auto">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto overflow-visible"
            >
              <defs>
                <linearGradient id="actualAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.26" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Future/Forecast Region subtle tint to the right of Today (like a trading chart) */}
              {timeElapsedRatio < 1 && (
                <rect
                  x={todayX}
                  y={padTop}
                  width={Math.max(0, svgWidth - padRight - todayX)}
                  height={graphHeight}
                  fill="#f8fafc"
                  opacity="0.7"
                />
              )}

              {/* Horizontal Grid lines (0%, 25%, 50%, 75%, 100%) */}
              {[0, 25, 50, 75, 100].map((val) => (
                <g key={val}>
                  <line
                    x1={padLeft}
                    y1={getY(val)}
                    x2={svgWidth - padRight}
                    y2={getY(val)}
                    stroke={val === 0 ? '#cbd5e1' : '#e2e8f0'}
                    strokeWidth={val === 0 ? '1.5' : '1'}
                    strokeDasharray={val === 0 || val === 100 ? '' : '4 4'}
                  />
                  <text
                    x={padLeft - 10}
                    y={getY(val) + 4}
                    textAnchor="end"
                    fontSize="11"
                    fontWeight="600"
                    fill="#64748b"
                  >
                    {val}%
                  </text>
                </g>
              ))}

              {/* Vertical Milestone lines & X-axis labels */}
              {milestones.map((m, i) => (
                <g key={`axis-${i}`}>
                  <line
                    x1={getX(i)}
                    y1={padTop}
                    x2={getX(i)}
                    y2={svgHeight - padBottom}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                  />
                  {/* Phase / Milestone Name */}
                  <text
                    x={getX(i)}
                    y={svgHeight - padBottom + 20}
                    textAnchor="middle"
                    fontSize="10.5"
                    fontWeight="700"
                    fill="#334155"
                  >
                    {m.label}
                  </text>
                  {/* Date Sub-label */}
                  <text
                    x={getX(i)}
                    y={svgHeight - padBottom + 36}
                    textAnchor="middle"
                    fontSize="9.5"
                    fill="#64748b"
                  >
                    {m.dateLabel}
                  </text>
                </g>
              ))}

              {/* Vertical "Today" Cutoff Line (Trading-style Data Date cursor) */}
              <g>
                <line
                  x1={todayX}
                  y1={padTop - 8}
                  x2={todayX}
                  y2={baselineY}
                  stroke="#f59e0b"
                  strokeWidth="1.75"
                  strokeDasharray="4 3"
                />
                <rect
                  x={todayPillX - todayPillW / 2}
                  y={padTop - 30}
                  width={todayPillW}
                  height="20"
                  rx="6"
                  fill="#fffbeb"
                  stroke="#f59e0b"
                  strokeWidth="1.2"
                />
                <text
                  x={todayPillX}
                  y={padTop - 16.5}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill="#b45309"
                >
                  วันนี้ {todayThaiSlash}
                </text>
              </g>

              {/* Shaded Area under Actual Curve (Stops strictly at Today) */}
              {actualAreaPath && <path d={actualAreaPath} fill="url(#actualAreaGrad)" />}

              {/* Planned S-Curve Line (Dashed Blue across entire project) */}
              <path
                d={plannedPath}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeDasharray="6 4"
              />

              {/* Horizontal live-level guide line from Today's actual value to Y-axis (like trading price line) */}
              <line
                x1={padLeft}
                y1={todayActualY}
                x2={todayX}
                y2={todayActualY}
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.7"
              />

              {/* Actual S-Curve Line (Solid Emerald — stops strictly at Today) */}
              {actualNodes.length > 1 && (
                <path
                  d={actualPath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              )}

              {/* Planned Milestone Dots & Labels (Full timeline) */}
              {milestones.map((m, i) => {
                const cx = getX(i);
                const cyPlanned = getY(m.planned);
                const nearTodayX = Math.abs(cx - todayX) < 34;

                return (
                  <g key={`planned-dot-${i}`}>
                    <circle
                      cx={cx}
                      cy={cyPlanned}
                      r="3.8"
                      fill="#3b82f6"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    {i > 0 && !nearTodayX && (
                      <text
                        x={cx}
                        y={cyPlanned - 9}
                        textAnchor="middle"
                        fontSize="9.5"
                        fontWeight="600"
                        fill="#2563eb"
                      >
                        {m.planned}%
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Planned Value Marker right at Today's vertical line */}
              <g>
                <circle
                  cx={todayX}
                  cy={todayPlannedY}
                  r="4.5"
                  fill="#2563eb"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <text
                  x={placeCalloutLeft ? todayX - 10 : todayX + 10}
                  y={
                    Math.abs(todayPlannedY - todayActualY) < 22
                      ? todayPlannedY <= todayActualY
                        ? todayPlannedY - 12
                        : todayPlannedY + 18
                      : todayPlannedY - 8
                  }
                  textAnchor={placeCalloutLeft ? 'end' : 'start'}
                  fontSize="9.5"
                  fontWeight="700"
                  fill="#1d4ed8"
                >
                  แผนวันนี้ {plannedAtToday}%
                </text>
              </g>

              {/* Past Actual Nodes (only up to Today) */}
              {actualNodes.map((node, idx) => {
                if (node.isTodayTerminal) return null;
                return (
                  <g key={`actual-node-${idx}`}>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="4"
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth="1.75"
                    />
                    {idx > 0 && (
                      <text
                        x={node.x}
                        y={node.y + 15}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="700"
                        fill="#047857"
                      >
                        {node.value}%
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Live Terminal Endpoint at Today (Trading-style marker + callout tag) */}
              <g>
                {/* Soft outer halo */}
                <circle
                  cx={todayX}
                  cy={todayActualY}
                  r="10"
                  fill="#10b981"
                  opacity="0.22"
                />
                {/* Crisp endpoint dot */}
                <circle
                  cx={todayX}
                  cy={todayActualY}
                  r="5.5"
                  fill="#059669"
                  stroke="#ffffff"
                  strokeWidth="2.2"
                />
                {/* Live value callout tag */}
                <rect
                  x={calloutX}
                  y={calloutY}
                  width={calloutW}
                  height={calloutH}
                  rx="6"
                  fill="#059669"
                />
                <text
                  x={calloutX + calloutW / 2}
                  y={calloutY + 14.5}
                  textAnchor="middle"
                  fontSize="10.5"
                  fontWeight="700"
                  fill="#ffffff"
                >
                  ทำจริง {actualPercent}%
                </text>
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* NEW: Bar Chart Comparing Activities vs Actual Work Done */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h4 className="font-bold text-slate-900 text-base flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
              กราฟแท่งเปรียบเทียบกิจกรรมกับผลงานที่ทำจริงในกิจกรรมนั้นๆ
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              แสดงการเปรียบเทียบเป้าหมายของแต่ละกิจกรรม (100%) เทียบกับเปอร์เซ็นต์ผลงานที่ทำจริงในกิจกรรมนั้นๆ
            </p>
          </div>

          {/* Layout Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setBarChartLayout('both')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  barChartLayout === 'both'
                    ? 'bg-white text-blue-700 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                แสดงทั้งแนวตั้ง & แนวนอน
              </button>
              <button
                type="button"
                onClick={() => setBarChartLayout('vertical')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  barChartLayout === 'vertical'
                    ? 'bg-white text-blue-700 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                กราฟแท่งแนวตั้ง
              </button>
              <button
                type="button"
                onClick={() => setBarChartLayout('horizontal')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  barChartLayout === 'horizontal'
                    ? 'bg-white text-blue-700 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                กราฟแท่งแนวนอน
              </button>
            </div>
          </div>
        </div>

        {/* Filter by Phase / Group & Legend */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Group Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedGroupFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                selectedGroupFilter === 'ALL'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              ทุกงวดงาน ({allActivityBarItems.length})
            </button>
            {activeGroups.map((grp) => {
              const count = allActivityBarItems.filter((i) => i.groupName === grp.name).length;
              return (
                <button
                  key={grp.id}
                  type="button"
                  onClick={() => setSelectedGroupFilter(grp.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                    selectedGroupFilter === grp.name
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {grp.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Color Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded-xs bg-slate-200 border border-dashed border-slate-400"></span>
              เป้าหมายกิจกรรม (100%)
            </span>
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
              <span className="w-3 h-3 rounded-xs bg-emerald-500"></span>
              ทำจริงเสร็จสิ้น (100%)
            </span>
            <span className="inline-flex items-center gap-1.5 text-blue-700 font-semibold">
              <span className="w-3 h-3 rounded-xs bg-blue-600"></span>
              กำลังดำเนินการ (1–99%)
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber-700 font-semibold">
              <span className="w-3 h-3 rounded-xs bg-amber-400"></span>
              รอดำเนินการ (0%)
            </span>
          </div>
        </div>

        {filteredActivityBarItems.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
            ไม่มีรายการกิจกรรมในหมวดงวดงานที่เลือก
          </div>
        ) : (
          <div className="space-y-8">
            {/* 1. Vertical Grouped Column Bar Chart */}
            {(barChartLayout === 'both' || barChartLayout === 'vertical') && (
              <div className="border border-slate-200/90 rounded-2xl p-4 sm:p-5 bg-slate-50/40">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-700">
                    แผนภูมิแท่งแนวตั้ง: เปรียบเทียบเป้าหมายกิจกรรม (100%) กับผลงานที่ทำจริง (%)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    จำนวน {filteredActivityBarItems.length} กิจกรรม
                  </span>
                </div>

                <div className="w-full overflow-x-auto pb-2">
                  <div
                    className="relative pt-8 pb-2 px-2"
                    style={{
                      minWidth: `${Math.max(560, filteredActivityBarItems.length * 76)}px`,
                    }}
                  >
                    {/* Chart Plot Area with Horizontal Grid Lines */}
                    <div className="relative h-56 border-l border-b border-slate-300 ml-9 flex items-end justify-around gap-3 px-3">
                      {[0, 25, 50, 75, 100].map((tick) => (
                        <div
                          key={tick}
                          className="absolute left-0 right-0 border-t border-dashed border-slate-200 pointer-events-none"
                          style={{ bottom: `${tick}%` }}
                        >
                          <span className="absolute -left-10 -top-2 text-[10px] font-semibold text-slate-400 w-8 text-right">
                            {tick}%
                          </span>
                        </div>
                      ))}

                      {/* Columns for each activity */}
                      {filteredActivityBarItems.map((item) => {
                        const isDone = item.actual >= 100;
                        const isStarted = item.actual > 0 && item.actual < 100;

                        return (
                          <div
                            key={item.id}
                            className="relative z-10 flex flex-col items-center justify-end h-full flex-1 max-w-[72px] group"
                          >
                            {/* Paired Bars Container */}
                            <div className="w-full h-full flex items-end justify-center gap-1.5 px-1">
                              {/* Bar 1: Target 100% */}
                              <div
                                className="w-3.5 sm:w-4 h-full bg-slate-200/85 border border-dashed border-slate-400/80 rounded-t-md relative flex items-start justify-center"
                                title={`เป้าหมายกิจกรรม "${item.title}": 100%`}
                              >
                                <span className="text-[8px] font-semibold text-slate-500 mt-1 hidden sm:inline">
                                  100
                                </span>
                              </div>

                              {/* Bar 2: Actual Work Done % */}
                              <div className="w-5 sm:w-6 h-full flex flex-col justify-end items-center relative">
                                {/* Percentage Badge Above Actual Bar */}
                                <span
                                  className={`mb-1 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shadow-2xs border ${
                                    isDone
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : isStarted
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {item.actual}%
                                </span>

                                <div
                                  className={`w-full rounded-t-md transition-all duration-300 shadow-2xs ${
                                    isDone
                                      ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                                      : isStarted
                                      ? 'bg-gradient-to-t from-blue-600 to-blue-400'
                                      : 'bg-amber-400'
                                  }`}
                                  style={{
                                    height: `${Math.max(4, Math.min(100, item.actual))}%`,
                                  }}
                                  title={`${item.title} — ทำจริง ${item.actual}%`}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* X-Axis Labels under columns */}
                    <div className="ml-9 flex items-start justify-around gap-3 px-3 pt-2.5">
                      {filteredActivityBarItems.map((item) => (
                        <div
                          key={`lbl-${item.id}`}
                          className="flex-1 max-w-[72px] text-center"
                          title={`${item.title} (${item.groupName}) - ผลงานทำจริง ${item.actual}%`}
                        >
                          <div className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700 text-[9px] font-bold mb-1">
                            #{item.index}
                          </div>
                          <p className="text-[10px] font-semibold text-slate-800 line-clamp-2 leading-tight">
                            {item.title}
                          </p>
                          <p className="text-[9px] text-slate-400 truncate mt-0.5">
                            {item.groupName}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Horizontal Comparison Bar Chart per Activity */}
            {(barChartLayout === 'both' || barChartLayout === 'horizontal') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    ตารางกราฟแท่งแนวนอน: เปรียบเทียบรายกิจกรรมกับผลงานที่ทำจริง
                  </span>
                  <span className="text-[11px] text-slate-500">
                    เปรียบเทียบ เป้าหมาย 100% vs ผลงานทำจริงรายทาสก์
                  </span>
                </div>

                <div className="space-y-2.5">
                  {filteredActivityBarItems.map((item) => {
                    const isDone = item.actual >= 100;
                    const isStarted = item.actual > 0 && item.actual < 100;

                    return (
                      <div
                        key={`hbar-${item.id}`}
                        className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 bg-white transition-all shadow-2xs"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                          {/* Activity Info (Left 5 cols) */}
                          <div className="md:col-span-5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-6 h-6 rounded-lg text-[11px] font-bold flex items-center justify-center shrink-0 ${
                                  isDone
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : isStarted
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {item.index}
                              </span>
                              <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                {item.title}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-1.5 pl-8">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                                {item.groupName}
                              </span>
                              {(item.startDate || item.endDate) && (
                                <span className="text-[10px] text-slate-400">
                                  📅 {item.startDate || '-'} ถึง {item.endDate || '-'}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Comparison Bars (Right 7 cols) */}
                          <div className="md:col-span-7 space-y-1.5">
                            {/* Bar 1: Target Bar (100%) */}
                            <div className="flex items-center gap-2.5 text-[11px]">
                              <span className="w-24 text-slate-500 font-medium shrink-0 text-right">
                                เป้าหมายกิจกรรม
                              </span>
                              <div className="flex-1 bg-slate-100 rounded-md h-3 overflow-hidden border border-dashed border-slate-300 relative">
                                <div
                                  className="bg-slate-300/70 h-full w-full"
                                  style={{ width: '100%' }}
                                />
                              </div>
                              <span className="w-14 text-right font-mono font-semibold text-slate-500 shrink-0">
                                100%
                              </span>
                            </div>

                            {/* Bar 2: Actual Work Done Bar */}
                            <div className="flex items-center gap-2.5 text-[11px]">
                              <span className="w-24 text-slate-800 font-bold shrink-0 text-right">
                                ผลงานทำจริง
                              </span>
                              <div className="flex-1 bg-slate-100 rounded-md h-4 overflow-hidden border border-slate-200 relative">
                                <div
                                  className={`h-full rounded-r-sm transition-all duration-300 ${
                                    isDone
                                      ? 'bg-emerald-500'
                                      : isStarted
                                      ? 'bg-blue-600'
                                      : 'bg-amber-400'
                                  }`}
                                  style={{
                                    width: `${Math.min(100, Math.max(item.actual > 0 ? 3 : 0, item.actual))}%`,
                                  }}
                                />
                              </div>
                              <span
                                className={`w-14 text-right font-mono font-bold shrink-0 ${
                                  isDone
                                    ? 'text-emerald-600'
                                    : isStarted
                                    ? 'text-blue-600'
                                    : 'text-amber-600'
                                }`}
                              >
                                {item.actual}%
                              </span>
                            </div>

                            {/* Status & Remaining Summary Line */}
                            <div className="flex items-center justify-between text-[10px] pl-[106px] pt-0.5">
                              <span
                                className={`font-semibold ${
                                  isDone
                                    ? 'text-emerald-600'
                                    : isStarted
                                    ? 'text-blue-600'
                                    : 'text-slate-400'
                                }`}
                              >
                                {isDone
                                  ? '✓ ดำเนินการแล้วเสร็จตามเป้าหมาย 100%'
                                  : isStarted
                                  ? `กำลังดำเนินการ (ทำจริงแล้ว ${item.actual}%)`
                                  : 'รอดำเนินการ (0%)'}
                              </span>
                              {item.remaining > 0 && (
                                <span className="text-slate-400">
                                  คงเหลืออีก {item.remaining}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Phase / Group Progress Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-base flex items-center">
              <Layers className="w-4 h-4 mr-2 text-blue-600" />
              สรุปความก้าวหน้ารายงวดงาน (เชื่อมโยงจากเมนู 2.2)
            </h4>
            <p className="text-xs text-slate-500">
              เมื่อปรับ % ความคืบหน้าของทาสก์ในเมนู 2.2 กราฟ S-Curve และกราฟแท่งจะอัปเดตอัตโนมัติทันที
            </p>
          </div>
          <span className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg">
            รวมทั้งโครงการ {actualPercent}%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {groupStats.map((g) => (
            <div
              key={g.id}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="w-5 h-5 rounded-md bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    {g.index}
                  </span>
                  <span className="font-bold text-slate-800 text-xs truncate">{g.name}</span>
                </div>
                <span
                  className={`text-xs font-bold shrink-0 ${
                    g.avgProgress >= 100
                      ? 'text-emerald-600'
                      : g.avgProgress > 0
                      ? 'text-blue-600'
                      : 'text-slate-400'
                  }`}
                >
                  {g.avgProgress}%
                </span>
              </div>

              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    g.avgProgress >= 100 ? 'bg-emerald-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min(100, g.avgProgress)}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  เสร็จ 100%: {g.completedCount}/{g.taskCount} ทาสก์
                </span>
                <span>
                  น้ำหนักงวด {g.weight}% (ได้ {g.weightedContribution}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
