/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project, ProjectGroup, ProjectTask } from '../types/types.ts';

export const DEFAULT_PROJECT_GROUPS: ProjectGroup[] = [
  { id: 'g1', name: 'งานงวดที่ 1', weightPercent: 30 },
  { id: 'g2', name: 'งานงวดที่ 2', weightPercent: 40 },
  { id: 'g3', name: 'งานงวดที่ 3', weightPercent: 30 },
  { id: 'g4', name: 'งานเครื่องจักร', weightPercent: 0 },
  { id: 'g5', name: 'คอนกรีต', weightPercent: 0 },
];

export function getEffectiveProjectGroups(project: Project): ProjectGroup[] {
  if (project.groups && project.groups.length > 0) {
    return project.groups;
  }
  if (project.groupsInitialized) {
    return [];
  }
  return DEFAULT_PROJECT_GROUPS;
}

export function getTaskProgressPercent(task: ProjectTask): number {
  if (typeof task.progressPercent === 'number' && !isNaN(task.progressPercent)) {
    return Math.min(100, Math.max(0, Math.round(task.progressPercent)));
  }
  return task.completed ? 100 : 0;
}

/**
 * Checks whether explicit phase-level weight percentages have been configured
 * for the project's installment columns.
 */
export function hasGroupWeightsConfigured(groups: ProjectGroup[]): boolean {
  return groups.some(
    (g) => typeof g.weightPercent === 'number' && !isNaN(g.weightPercent)
  );
}

/**
 * Checks whether task-level weights inside a specific phase column are explicitly weighted.
 */
export function hasTaskWeightsConfigured(
  groupTasks: ProjectTask[],
  groups: ProjectGroup[]
): boolean {
  if (hasGroupWeightsConfigured(groups)) {
    return true;
  }
  return groupTasks.some(
    (t) => typeof t.weightPercent === 'number' && !isNaN(t.weightPercent)
  );
}

export interface TaskWeightedStats {
  taskId: string;
  taskWeightInGroup: number; // น้ำหนักของกิจกรรมภายในงวด (เช่น 30%, 40%, 30% รวมในงวด = 100%)
  taskActualProgress: number; // ความคืบหน้าทำจริงของกิจกรรม (0-100%)
  taskEarnedInGroup: number; // % ความคืบหน้าของกิจกรรมที่ทำได้ภายในงวด (= weightInGroup * actualProgress / 100)
  taskWeightInProject: number; // น้ำหนักสูงสุดของกิจกรรมนี้เทียบทั้งโครงการ (= groupWeight * weightInGroup / 100)
  taskEarnedInProject: number; // % ของทั้งโครงการที่กิจกรรมนี้ทำได้จริง (= groupWeight * earnedInGroup / 100)
}

export interface GroupWeightedStats {
  groupId: string;
  groupName: string;
  groupWeightPercent: number; // น้ำหนักของงวดงานเทียบทั้งโครงการ (เช่น 30%)
  isWeightedMode: boolean;
  totalTaskWeightInGroup: number; // ผลรวมน้ำหนักกิจกรรมในงวดนี้ (เป้าหมาย = 100%)
  groupProgressPercent: number; // ความคืบหน้าภายในงวดนี้ (0-100% ของงวด)
  groupEarnedInProject: number; // ผลงานของงวดนี้คิดเป็น % ของโครงการ (= groupProgressPercent * groupWeightPercent / 100)
  taskCount: number;
  completedTaskCount: number;
  taskStatsById: Record<string, TaskWeightedStats>;
}

/**
 * Computes hierarchical weighted progress for a phase column (งวดงาน) and all tasks inside it:
 * Example:
 *  - งานงวดที่ 1 = 30% of project
 *  - Task 1 = 30% of phase, Task 2 = 40% of phase, Task 3 = 30% of phase (total = 100% of phase)
 *  - When all 3 tasks are 100% done -> groupProgressPercent = 100%, groupEarnedInProject = 30%
 */
export function calculateGroupWeightedStats(
  group: ProjectGroup,
  allGroups: ProjectGroup[],
  allTasks: ProjectTask[]
): GroupWeightedStats {
  const groupTasks = allTasks.filter((t) => t.groupName === group.name);
  const weightedGroups = hasGroupWeightsConfigured(allGroups);
  const weightedTasks = hasTaskWeightsConfigured(groupTasks, allGroups);

  const groupWeightPercent = weightedGroups
    ? Math.max(0, Number(group.weightPercent ?? 0))
    : allGroups.length > 0
    ? parseFloat((100 / allGroups.length).toFixed(2))
    : 0;

  const taskStatsById: Record<string, TaskWeightedStats> = {};
  let totalTaskWeightInGroup = 0;
  let groupProgressSum = 0;

  groupTasks.forEach((task) => {
    const actualProgress = getTaskProgressPercent(task);
    let weightInGroup = 0;

    if (weightedTasks) {
      weightInGroup = Math.max(0, Number(task.weightPercent ?? 0));
    } else {
      weightInGroup =
        groupTasks.length > 0
          ? parseFloat((100 / groupTasks.length).toFixed(2))
          : 0;
    }

    const earnedInGroup = (weightInGroup * actualProgress) / 100;
    const weightInProject = (groupWeightPercent * weightInGroup) / 100;
    const earnedInProject = (groupWeightPercent * earnedInGroup) / 100;

    totalTaskWeightInGroup += weightInGroup;
    groupProgressSum += earnedInGroup;

    taskStatsById[task.id] = {
      taskId: task.id,
      taskWeightInGroup: parseFloat(weightInGroup.toFixed(2)),
      taskActualProgress: actualProgress,
      taskEarnedInGroup: parseFloat(earnedInGroup.toFixed(2)),
      taskWeightInProject: parseFloat(weightInProject.toFixed(2)),
      taskEarnedInProject: parseFloat(earnedInProject.toFixed(2)),
    };
  });

  // If task weights weren't explicitly configured and floating division occurred,
  // clamp average nicely for clean display
  const groupProgressPercent = weightedTasks
    ? parseFloat(Math.min(100, groupProgressSum).toFixed(2))
    : groupTasks.length > 0
    ? parseFloat(
        (
          groupTasks.reduce((s, t) => s + getTaskProgressPercent(t), 0) /
          groupTasks.length
        ).toFixed(2)
      )
    : 0;

  const groupEarnedInProject = parseFloat(
    ((groupWeightPercent * groupProgressPercent) / 100).toFixed(2)
  );

  return {
    groupId: group.id,
    groupName: group.name,
    groupWeightPercent: parseFloat(groupWeightPercent.toFixed(2)),
    isWeightedMode: weightedGroups || weightedTasks,
    totalTaskWeightInGroup: parseFloat(totalTaskWeightInGroup.toFixed(2)),
    groupProgressPercent,
    groupEarnedInProject,
    taskCount: groupTasks.length,
    completedTaskCount: groupTasks.filter(
      (t) => getTaskProgressPercent(t) >= 100
    ).length,
    taskStatsById,
  };
}

/**
 * Computes total project progress % using hierarchical weighted phases + tasks
 * when weights are configured, or falls back cleanly to task averages / stored progress.
 */
export function calculateProjectWeightedStats(project: Project): {
  groups: ProjectGroup[];
  groupStats: GroupWeightedStats[];
  totalGroupWeightPercent: number;
  projectProgressPercent: number;
  isWeightedMode: boolean;
} {
  const groups = getEffectiveProjectGroups(project);
  const weightedGroups = hasGroupWeightsConfigured(groups);

  if (weightedGroups && groups.length > 0) {
    const groupStats = groups.map((g) =>
      calculateGroupWeightedStats(g, groups, project.tasks)
    );
    const totalGroupWeightPercent = parseFloat(
      groupStats.reduce((sum, gs) => sum + gs.groupWeightPercent, 0).toFixed(2)
    );
    const rawProjectProgress = groupStats.reduce(
      (sum, gs) => sum + gs.groupEarnedInProject,
      0
    );
    const projectProgressPercent =
      project.tasks.length > 0
        ? parseFloat(Math.min(100, rawProjectProgress).toFixed(2))
        : parseFloat((project.progress || 0).toFixed(2));

    return {
      groups,
      groupStats,
      totalGroupWeightPercent,
      projectProgressPercent,
      isWeightedMode: true,
    };
  }

  // Fallback for legacy projects without group weightPercent set
  const groupStats = groups.map((g) =>
    calculateGroupWeightedStats(g, groups, project.tasks)
  );
  const projectProgressPercent =
    project.tasks.length > 0
      ? parseFloat(
          (
            project.tasks.reduce(
              (acc, t) => acc + getTaskProgressPercent(t),
              0
            ) / project.tasks.length
          ).toFixed(2)
        )
      : parseFloat((project.progress || 0).toFixed(2));

  return {
    groups,
    groupStats,
    totalGroupWeightPercent: 100,
    projectProgressPercent,
    isWeightedMode: false,
  };
}
