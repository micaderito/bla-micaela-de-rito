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
import { KANBAN_COLUMNS, NO_DUE_DATE_TEXT, SNACK_DURATION, STATUS_LABELS } from '../../../core/constants/app.constants';
import { CONFIRM_DELETE_TASK, TASK_MESSAGES } from '../../../core/messages/app.messages';

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

  readonly columns = KANBAN_COLUMNS;
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
        next: () => this.snack.open(TASK_MESSAGES.CREATED, 'OK', { duration: SNACK_DURATION.DEFAULT }),
        error: () => this.snack.open(TASK_MESSAGES.ERROR_CREATE, 'OK', { duration: SNACK_DURATION.DEFAULT })
      });
    });
  }

  openEdit(task: TaskItem) {
    this.dialog.open(TaskFormComponent, { data: { task } }).afterClosed().subscribe(dto => {
      if (!dto) return;
      this.taskService.updateTask(task.id, dto).subscribe({
        next: () => this.snack.open(TASK_MESSAGES.UPDATED, 'OK', { duration: SNACK_DURATION.DEFAULT }),
        error: () => this.snack.open(TASK_MESSAGES.ERROR_UPDATE, 'OK', { duration: SNACK_DURATION.DEFAULT })
      });
    });
  }

  confirmDelete(id: string) {
    this.dialog.open(ConfirmDialogComponent, {
      data: CONFIRM_DELETE_TASK
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.taskService.deleteTask(id).subscribe({
        next: () => this.snack.open(TASK_MESSAGES.DELETED, 'OK', { duration: SNACK_DURATION.DEFAULT }),
        error: () => this.snack.open(TASK_MESSAGES.ERROR_DELETE, 'OK', { duration: SNACK_DURATION.DEFAULT })
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
      next: () => this.snack.open(TASK_MESSAGES.moved(newStatus), 'OK', { duration: SNACK_DURATION.SHORT }),
      error: () => this.snack.open(TASK_MESSAGES.ERROR_UPDATE, 'OK', { duration: SNACK_DURATION.DEFAULT })
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
    if (!dateStr) return NO_DUE_DATE_TEXT;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
