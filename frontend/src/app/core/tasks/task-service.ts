import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { CreateTaskDto, TaskItem, UpdateTaskDto } from '../models';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly apiBase = 'http://localhost:5080/api/tasks';

  private _tasks = signal<TaskItem[]>([]);
  private _loading = signal(false);
  private _error = signal<string | null>(null);

  readonly tasks = this._tasks.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly taskCount = computed(() => this._tasks().length);

  constructor(private http: HttpClient) {}

  loadTasks() {
    this._loading.set(true);
    this._error.set(null);
    return this.http.get<TaskItem[]>(this.apiBase).pipe(
      tap({
        next: tasks => { this._tasks.set(tasks); this._loading.set(false); },
        error: (err: { error?: { detail?: string } }) => {
          this._error.set(err.error?.detail ?? 'Failed to load tasks');
          this._loading.set(false);
        }
      })
    );
  }

  createTask(dto: CreateTaskDto) {
    return this.http.post<TaskItem>(this.apiBase, dto).pipe(
      tap(task => this._tasks.update(ts => [task, ...ts]))
    );
  }

  updateTask(id: string, dto: UpdateTaskDto) {
    return this.http.put<TaskItem>(`${this.apiBase}/${id}`, dto).pipe(
      tap(updated => this._tasks.update(ts => ts.map(t => t.id === id ? updated : t)))
    );
  }

  deleteTask(id: string) {
    return this.http.delete<void>(`${this.apiBase}/${id}`).pipe(
      tap(() => this._tasks.update(ts => ts.filter(t => t.id !== id)))
    );
  }
}
