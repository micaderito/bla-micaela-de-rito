import { DueDatePreset, TaskStatus } from '../models';

export const ROUTES = {
  ROOT: '/tasks',
  LOGIN: '/login',
  REGISTER: '/register',
  TASKS: '/tasks',
  DASHBOARD: '/dashboard',
} as const;

export const API_BASE = {
  AUTH: 'http://localhost:5080/api/auth',
  TASKS: 'http://localhost:5080/api/tasks',
} as const;

export const AUTH_TOKEN_KEY = 'auth_token';

export const TASK_STATUSES: TaskStatus[] = ['Pending', 'InProgress', 'Done'];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  Pending: 'Pending',
  InProgress: 'In progress',
  Done: 'Done',
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  Pending: 'primary',
  InProgress: 'accent',
  Done: 'warn',
};

export const KANBAN_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'Pending',    label: STATUS_LABELS.Pending },
  { status: 'InProgress', label: STATUS_LABELS.InProgress },
  { status: 'Done',       label: STATUS_LABELS.Done },
];

export const TASK_FORM_STEPS = [
  { label: 'Basics',  title: 'Set a title and description' },
  { label: 'Details', title: 'Choose status and due date' },
  { label: 'Review',  title: 'Review and confirm' },
];

export const DASHBOARD_WEEKS = 8;

export const CHART_COLORS = {
  pending:    '#BA7517',
  inProgress: '#378ADD',
  done:       '#1D9E75',
  cycle:      '#534AB7',
  neutral:    '#888780',
  overdue:    '#E24B4A',
  grid:       'rgba(128,128,128,0.15)',
} as const;

export const DUE_DATE_PRESETS = {
  TODAY:  'Today'  as DueDatePreset,
  WEEK:   'Week'   as DueDatePreset,
  MONTH:  'Month'  as DueDatePreset,
  CUSTOM: 'Custom' as DueDatePreset,
} as const;

export const DASHBOARD_PRESETS: { label: string; value: DueDatePreset | null }[] = [
  { label: 'All',        value: null },
  { label: 'Today',      value: 'Today' },
  { label: 'This week',  value: 'Week' },
  { label: 'This month', value: 'Month' },
  { label: 'Custom',     value: 'Custom' },
];

export const DUE_HEALTH_LABELS = ['Overdue', 'Due this week', 'Later', 'No due date'] as const;

export const FLOW_DATASET_LABELS = { CREATED: 'Created', COMPLETED: 'Completed' } as const;

export const SNACK_DURATION = { DEFAULT: 3000, SHORT: 2500 } as const;

export const NO_DUE_DATE_TEXT = 'No due date';

export const FILTER_LABELS = {
  FROM:  'From',
  TO:    'To',
  APPLY: 'Apply',
} as const;
