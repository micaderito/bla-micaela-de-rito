import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../../core/tasks/task-service';
import { TaskFormComponent } from '../task-form/task-form';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog';
import { SpinnerComponent } from '../../../shared/spinner/spinner';
import { TaskItem, TaskStatus } from '../../../core/models';

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'Pending',    label: 'Pending' },
  { status: 'InProgress', label: 'In progress' },
  { status: 'Done',       label: 'Done' },
];

@Component({
  selector: 'app-task-list',
  imports: [
    MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule,
    FormsModule, SpinnerComponent
  ],
  templateUrl: './task-list.html',
  styleUrl: './task-list.scss',
})
export class TaskListComponent implements OnInit {
  taskService = inject(TaskService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  readonly columns = COLUMNS;
  searchQuery = signal('');
  draggingId = signal<string | null>(null);
  dragOverCol = signal<TaskStatus | null>(null);

  private matchesSearch(task: TaskItem, q: string): boolean {
    const lq = q.toLowerCase();
    return task.title.toLowerCase().includes(lq) ||
           task.description.toLowerCase().includes(lq);
  }

  tasksForColumn = (status: TaskStatus) => computed(() => {
    const q = this.searchQuery().trim();
    return this.taskService.tasks().filter(t =>
      t.status === status && (q === '' || this.matchesSearch(t, q))
    );
  });

  columnCount = (status: TaskStatus) => computed(() =>
    this.taskService.tasks().filter(t => t.status === status).length
  );

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

  onDragStart(event: DragEvent, task: TaskItem) {
    this.draggingId.set(task.id);
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', task.id);
  }

  onDragEnd() {
    this.draggingId.set(null);
    this.dragOverCol.set(null);
  }

  onDragOver(event: DragEvent, status: TaskStatus) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    this.dragOverCol.set(status);
  }

  onDragLeave(event: DragEvent, colEl: HTMLElement) {
    if (!colEl.contains(event.relatedTarget as Node)) {
      this.dragOverCol.set(null);
    }
  }

  onDrop(event: DragEvent, newStatus: TaskStatus) {
    event.preventDefault();
    const id = event.dataTransfer!.getData('text/plain');
    const task = this.taskService.tasks().find(t => t.id === id);
    if (!task || task.status === newStatus) {
      this.draggingId.set(null);
      this.dragOverCol.set(null);
      return;
    }
    const dto = { title: task.title, description: task.description, status: newStatus, dueDate: task.dueDate };
    this.taskService.updateTask(id, dto).subscribe({
      next: () => this.snack.open(`Moved to ${newStatus === 'InProgress' ? 'In progress' : newStatus}`, 'OK', { duration: 2500 }),
      error: () => this.snack.open('Failed to update task', 'OK', { duration: 3000 })
    });
    this.draggingId.set(null);
    this.dragOverCol.set(null);
  }

  highlightText(text: string, query: string): string {
    const q = query.trim();
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return text.slice(0, idx) +
      `<mark>${text.slice(idx, idx + q.length)}</mark>` +
      text.slice(idx + q.length);
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return 'No due date';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
