import { TaskItem, TaskStatus } from '../models';

/**
 * Pure functions that derive dashboard statistics from a list of tasks.
 *
 * Completion time is not stored explicitly; for tasks in the `Done` status we
 * treat `updatedAt` as the completion timestamp. This is accurate unless a Done
 * task is edited after completion, which would shift its bucket.
 */

export interface WeekBucket {
  /** Short label for the week start, e.g. "Jun 2". */
  label: string;
  /** Inclusive start of the 7-day window. */
  start: Date;
  /** Exclusive end of the 7-day window. */
  end: Date;
}

export interface StatusCounts {
  pending: number;
  inProgress: number;
  done: number;
}

export interface DueHealth {
  overdue: number;
  dueThisWeek: number;
  later: number;
  noDueDate: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function formatLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Returns `n` consecutive 7-day buckets ending with the week that contains
 * `now`. The most recent bucket's exclusive end is the start of tomorrow.
 */
export function lastNWeeks(n: number, now: Date = new Date()): WeekBucket[] {
  const tomorrow = new Date(startOfDay(now).getTime() + DAY_MS);
  const buckets: WeekBucket[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const end = new Date(tomorrow.getTime() - i * 7 * DAY_MS);
    const start = new Date(end.getTime() - 7 * DAY_MS);
    buckets.push({ start, end, label: formatLabel(start) });
  }
  return buckets;
}

function bucketIndex(buckets: WeekBucket[], date: Date): number {
  return buckets.findIndex(b => date >= b.start && date < b.end);
}

/** Completion timestamp for a Done task, or null if the task is not done. */
function completedAt(task: TaskItem): Date | null {
  return task.status === 'Done' ? new Date(task.updatedAt) : null;
}

export function countByStatus(tasks: TaskItem[]): StatusCounts {
  const counts: StatusCounts = { pending: 0, inProgress: 0, done: 0 };
  for (const t of tasks) {
    if (t.status === 'Pending') counts.pending++;
    else if (t.status === 'InProgress') counts.inProgress++;
    else if (t.status === 'Done') counts.done++;
  }
  return counts;
}

export function completionRate(tasks: TaskItem[]): number {
  if (tasks.length === 0) return 0;
  return countByStatus(tasks).done / tasks.length;
}

/** Chart #1: number of tasks completed in each week bucket. */
export function velocityByWeek(tasks: TaskItem[], buckets: WeekBucket[]): number[] {
  const series = new Array(buckets.length).fill(0);
  for (const t of tasks) {
    const done = completedAt(t);
    if (!done) continue;
    const i = bucketIndex(buckets, done);
    if (i >= 0) series[i]++;
  }
  return series;
}

/** Chart #3: tasks created vs completed in each week bucket. */
export function createdVsCompleted(
  tasks: TaskItem[],
  buckets: WeekBucket[]
): { created: number[]; completed: number[] } {
  const created = new Array(buckets.length).fill(0);
  const completed = new Array(buckets.length).fill(0);
  for (const t of tasks) {
    const ci = bucketIndex(buckets, new Date(t.createdAt));
    if (ci >= 0) created[ci]++;
    const done = completedAt(t);
    if (done) {
      const di = bucketIndex(buckets, done);
      if (di >= 0) completed[di]++;
    }
  }
  return { created, completed };
}

/**
 * Chart #4: average cycle time (days from creation to completion) for tasks
 * completed in each week bucket. Weeks with no completions are null so the
 * line chart can skip them rather than plotting a misleading zero.
 */
export function cycleTimeByWeek(tasks: TaskItem[], buckets: WeekBucket[]): (number | null)[] {
  const totals = new Array(buckets.length).fill(0);
  const counts = new Array(buckets.length).fill(0);
  for (const t of tasks) {
    const done = completedAt(t);
    if (!done) continue;
    const i = bucketIndex(buckets, done);
    if (i < 0) continue;
    const days = Math.max(0, (done.getTime() - new Date(t.createdAt).getTime()) / DAY_MS);
    totals[i] += days;
    counts[i]++;
  }
  return totals.map((sum, i) =>
    counts[i] === 0 ? null : Math.round((sum / counts[i]) * 10) / 10
  );
}

/** Chart #5: open (not Done) tasks bucketed by deadline proximity. */
export function dueHealth(tasks: TaskItem[], now: Date = new Date()): DueHealth {
  const today = startOfDay(now);
  const weekEnd = new Date(today.getTime() + 7 * DAY_MS);
  const health: DueHealth = { overdue: 0, dueThisWeek: 0, later: 0, noDueDate: 0 };
  for (const t of tasks) {
    if (t.status === 'Done') continue;
    if (!t.dueDate) {
      health.noDueDate++;
      continue;
    }
    const due = new Date(t.dueDate);
    if (due < today) health.overdue++;
    else if (due < weekEnd) health.dueThisWeek++;
    else health.later++;
  }
  return health;
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  Pending: 'Pending',
  InProgress: 'In progress',
  Done: 'Done',
};
