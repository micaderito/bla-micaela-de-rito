import { TaskItem, TaskStatus } from '../models';
import {
  completionRate,
  countByStatus,
  createdVsCompleted,
  cycleTimeByWeek,
  dueHealth,
  lastNWeeks,
  velocityByWeek,
} from './task-stats';

// Fixed "now" so week buckets and due-date math are deterministic.
const NOW = new Date('2026-06-18T12:00:00Z');

function task(partial: Partial<TaskItem> & { status: TaskStatus }): TaskItem {
  return {
    id: Math.random().toString(36).slice(2),
    title: 't',
    description: '',
    dueDate: null,
    userId: 'u1',
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...partial,
  };
}

const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86400000).toISOString();

describe('task-stats', () => {
  describe('lastNWeeks', () => {
    it('returns n contiguous 7-day buckets ending with the current week', () => {
      const weeks = lastNWeeks(8, NOW);
      expect(weeks.length).toBe(8);
      for (let i = 1; i < weeks.length; i++) {
        expect(weeks[i].start.getTime()).toBe(weeks[i - 1].end.getTime());
      }
      // "now" falls inside the final bucket.
      const last = weeks[weeks.length - 1];
      expect(NOW >= last.start && NOW < last.end).toBeTrue();
    });
  });

  describe('countByStatus / completionRate', () => {
    const tasks = [
      task({ status: 'Pending' }),
      task({ status: 'Pending' }),
      task({ status: 'InProgress' }),
      task({ status: 'Done' }),
    ];

    it('counts each status', () => {
      expect(countByStatus(tasks)).toEqual({ pending: 2, inProgress: 1, done: 1 });
    });

    it('computes completion rate', () => {
      expect(completionRate(tasks)).toBe(0.25);
      expect(completionRate([])).toBe(0);
    });
  });

  describe('velocityByWeek', () => {
    it('buckets done tasks by completion (updatedAt) and ignores open tasks', () => {
      const weeks = lastNWeeks(8, NOW);
      const tasks = [
        task({ status: 'Done', updatedAt: daysAgo(1) }), // current week
        task({ status: 'Done', updatedAt: daysAgo(2) }), // current week
        task({ status: 'Done', updatedAt: daysAgo(9) }), // previous week
        task({ status: 'Pending', updatedAt: daysAgo(1) }), // ignored
      ];
      const series = velocityByWeek(tasks, weeks);
      expect(series[7]).toBe(2);
      expect(series[6]).toBe(1);
      expect(series.reduce((a, b) => a + b, 0)).toBe(3);
    });
  });

  describe('createdVsCompleted', () => {
    it('tracks created and completed counts per week', () => {
      const weeks = lastNWeeks(8, NOW);
      const tasks = [
        task({ status: 'Done', createdAt: daysAgo(3), updatedAt: daysAgo(1) }),
        task({ status: 'Pending', createdAt: daysAgo(2) }),
      ];
      const { created, completed } = createdVsCompleted(tasks, weeks);
      expect(created[7]).toBe(2);
      expect(completed[7]).toBe(1);
    });
  });

  describe('cycleTimeByWeek', () => {
    it('averages days from creation to completion, null when no completions', () => {
      const weeks = lastNWeeks(8, NOW);
      const tasks = [
        task({ status: 'Done', createdAt: daysAgo(5), updatedAt: daysAgo(1) }), // 4 days
        task({ status: 'Done', createdAt: daysAgo(3), updatedAt: daysAgo(1) }), // 2 days
      ];
      const series = cycleTimeByWeek(tasks, weeks);
      expect(series[7]).toBe(3); // (4 + 2) / 2
      expect(series[0]).toBeNull();
    });
  });

  describe('dueHealth', () => {
    it('buckets open tasks by deadline and excludes done tasks', () => {
      const tasks = [
        task({ status: 'Pending', dueDate: daysAgo(1) }), // overdue
        task({ status: 'InProgress', dueDate: daysAhead(3) }), // this week
        task({ status: 'Pending', dueDate: daysAhead(30) }), // later
        task({ status: 'Pending', dueDate: null }), // no due date
        task({ status: 'Done', dueDate: daysAgo(10) }), // excluded
      ];
      expect(dueHealth(tasks, NOW)).toEqual({
        overdue: 1,
        dueThisWeek: 1,
        later: 1,
        noDueDate: 1,
      });
    });
  });
});
