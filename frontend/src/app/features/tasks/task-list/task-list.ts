import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../../core/tasks/task-service';
import { TaskItemComponent } from '../task-item/task-item';
import { TaskFormComponent } from '../task-form/task-form';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog';
import { SpinnerComponent } from '../../../shared/spinner/spinner';
import { TaskItem, TaskStatus } from '../../../core/models';

@Component({
  selector: 'app-task-list',
  imports: [
    MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule,
    FormsModule, TaskItemComponent, SpinnerComponent
  ],
  templateUrl: './task-list.html',
  styleUrl: './task-list.scss',
})
export class TaskListComponent implements OnInit {
  taskService = inject(TaskService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  statusFilter = signal<TaskStatus | 'All'>('All');

  filteredTasks = computed(() => {
    const f = this.statusFilter();
    return f === 'All'
      ? this.taskService.tasks()
      : this.taskService.tasks().filter(t => t.status === f);
  });

  statuses: (TaskStatus | 'All')[] = ['All', 'Pending', 'InProgress', 'Done'];
  statusLabels: Record<string, string> = { All: 'All', Pending: 'Pending', InProgress: 'In Progress', Done: 'Done' };

  ngOnInit() {
    this.taskService.loadTasks().subscribe();
  }

  openCreate() {
    this.dialog.open(TaskFormComponent, { data: {} }).afterClosed().subscribe(dto => {
      if (!dto) return;
      this.taskService.createTask(dto).subscribe({
        next: () => this.snack.open('Task created', 'OK', { duration: 3000 }),
        error: () => this.snack.open('Failed to create task', 'OK', { duration: 3000 })
      });
    });
  }

  openEdit(task: TaskItem) {
    this.dialog.open(TaskFormComponent, { data: { task } }).afterClosed().subscribe(dto => {
      if (!dto) return;
      this.taskService.updateTask(task.id, dto).subscribe({
        next: () => this.snack.open('Task updated', 'OK', { duration: 3000 }),
        error: () => this.snack.open('Failed to update task', 'OK', { duration: 3000 })
      });
    });
  }

  confirmDelete(id: string) {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Task', message: 'Are you sure you want to delete this task?' }
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.taskService.deleteTask(id).subscribe({
        next: () => this.snack.open('Task deleted', 'OK', { duration: 3000 }),
        error: () => this.snack.open('Failed to delete task', 'OK', { duration: 3000 })
      });
    });
  }

  filterChange(val: TaskStatus | 'All') {
    this.statusFilter.set(val);
  }
}
