export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export interface AuthResult {
  token: string;
  expiresAtUtc: string;
  user: User;
}

export type TaskStatus = 'Pending' | 'InProgress' | 'Done';

export type DueDatePreset = 'Today' | 'Week' | 'Month' | 'Custom';

export interface TaskDueDateFilter {
  preset: DueDatePreset;
  dateFrom?: string;
  dateTo?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskDto {
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: string | null;
}

export interface UpdateTaskDto {
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: string | null;
}

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
}

export interface LoginDto {
  usernameOrEmail: string;
  password: string;
}
