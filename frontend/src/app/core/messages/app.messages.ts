import { STATUS_LABELS } from '../constants/app.constants';
import { TaskStatus } from '../models';

export const TASK_MESSAGES = {
  CREATED:      'Task created',
  UPDATED:      'Task updated',
  DELETED:      'Task deleted',
  moved:        (status: TaskStatus) => `Moved to ${STATUS_LABELS[status]}`,
  ERROR_LOAD:   'Failed to load tasks',
  ERROR_CREATE: 'Failed to create task',
  ERROR_UPDATE: 'Failed to update task',
  ERROR_DELETE: 'Failed to delete task',
};

export const AUTH_MESSAGES = {
  LOGIN_FAILED:    'Login failed',
  REGISTER_FAILED: 'Registration failed',
};

export const CONFIRM_DELETE_TASK = {
  title:   'Delete Task',
  message: 'Are you sure you want to delete this task?',
};
