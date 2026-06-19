import { Routes } from '@angular/router';
import { authGuardGuard } from './core/auth/auth-guard-guard';

export const routes: Routes = [
  { path: '', redirectTo: '/tasks', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then(m => m.RegisterComponent)
  },
  {
    path: 'tasks',
    canActivate: [authGuardGuard],
    data: { nav: { label: 'Tasks', icon: 'checklist' } },
    loadComponent: () => import('./features/tasks/task-list/task-list').then(m => m.TaskListComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuardGuard],
    data: { nav: { label: 'Dashboard', icon: 'bar_chart' } },
    loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent)
  },
  { path: '**', redirectTo: '/tasks' }
];
