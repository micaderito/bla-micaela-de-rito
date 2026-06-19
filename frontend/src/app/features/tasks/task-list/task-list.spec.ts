import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TaskListComponent } from './task-list';
import { TaskService } from '../../../core/tasks/task-service';
import { TaskItem, TaskDueDateFilter } from '../../../core/models';

const mockTask: TaskItem = {
  id: '1', title: 'Task A', description: '', status: 'Pending',
  dueDate: null, userId: 'u1', createdAt: '', updatedAt: ''
};

function buildProviders(tasks: TaskItem[] = [mockTask]) {
  const taskSpy = jasmine.createSpyObj('TaskService', ['loadTasks', 'createTask', 'updateTask', 'deleteTask'], {
    tasks: signal(tasks),
    loading: signal(false),
    error: signal(null),
    taskCount: signal(tasks.length)
  });
  taskSpy.loadTasks.and.returnValue(of(tasks));
  const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
  const snackSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
  return { taskSpy, dialogSpy, snackSpy };
}

describe('TaskListComponent', () => {
  let fixture: ComponentFixture<TaskListComponent>;
  let comp: TaskListComponent;
  let taskSpy: jasmine.SpyObj<TaskService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let snackSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    const p = buildProviders();
    taskSpy = p.taskSpy; dialogSpy = p.dialogSpy; snackSpy = p.snackSpy;
    await TestBed.configureTestingModule({
      imports: [TaskListComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: TaskService, useValue: taskSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: MatSnackBar, useValue: snackSpy }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(TaskListComponent);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => expect(comp).toBeTruthy());
  it('calls loadTasks on init', () => expect(taskSpy.loadTasks).toHaveBeenCalled());
  it('tasksForColumn returns tasks matching status', () => {
    const pendingTasks = comp.tasksForColumn('Pending')();
    expect(pendingTasks.length).toBe(1);
    expect(pendingTasks[0].status).toBe('Pending');
  });
  it('tasksForColumn filters by search query', () => {
    comp.searchQuery.set('Task A');
    const pendingTasks = comp.tasksForColumn('Pending')();
    expect(pendingTasks.length).toBe(1);
  });
  it('tasksForColumn returns empty when search does not match', () => {
    comp.searchQuery.set('Non-existent');
    const pendingTasks = comp.tasksForColumn('Pending')();
    expect(pendingTasks.length).toBe(0);
  });
  it('onFilterChange calls loadTasks with filter', () => {
    const filter: TaskDueDateFilter = { preset: 'Today' };
    comp.onFilterChange(filter);
    expect(taskSpy.loadTasks).toHaveBeenCalledWith(filter);
  });

  it('openCreate creates task on dialog close', fakeAsync(() => {
    const dto = { title: 'New', description: '', status: 'Pending' as const, dueDate: null };
    dialogSpy.open.and.returnValue({ afterClosed: () => of(dto) } as any);
    taskSpy.createTask.and.returnValue(of(mockTask));
    comp.openCreate();
    tick();
    expect(taskSpy.createTask).toHaveBeenCalledWith(dto);
    expect(snackSpy.open).toHaveBeenCalledWith('Task created', 'OK', jasmine.any(Object));
  }));
  it('openCreate does nothing when cancelled', fakeAsync(() => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
    comp.openCreate();
    tick();
    expect(taskSpy.createTask).not.toHaveBeenCalled();
  }));
  it('openCreate shows error snack on failure', fakeAsync(() => {
    const dto = { title: 'X', description: '', status: 'Pending' as const, dueDate: null };
    dialogSpy.open.and.returnValue({ afterClosed: () => of(dto) } as any);
    taskSpy.createTask.and.returnValue(throwError(() => new Error()));
    comp.openCreate();
    tick();
    expect(snackSpy.open).toHaveBeenCalledWith('Failed to create task', 'OK', jasmine.any(Object));
  }));

  it('openEdit updates task', fakeAsync(() => {
    const dto = { title: 'Upd', description: '', status: 'Done' as const, dueDate: null };
    dialogSpy.open.and.returnValue({ afterClosed: () => of(dto) } as any);
    taskSpy.updateTask.and.returnValue(of({ ...mockTask, title: 'Upd' }));
    comp.openEdit(mockTask);
    tick();
    expect(taskSpy.updateTask).toHaveBeenCalledWith('1', dto);
    expect(snackSpy.open).toHaveBeenCalledWith('Task updated', 'OK', jasmine.any(Object));
  }));
  it('openEdit does nothing when cancelled', fakeAsync(() => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
    comp.openEdit(mockTask);
    tick();
    expect(taskSpy.updateTask).not.toHaveBeenCalled();
  }));
  it('openEdit shows error snack on failure', fakeAsync(() => {
    const dto = { title: 'X', description: '', status: 'Done' as const, dueDate: null };
    dialogSpy.open.and.returnValue({ afterClosed: () => of(dto) } as any);
    taskSpy.updateTask.and.returnValue(throwError(() => new Error()));
    comp.openEdit(mockTask);
    tick();
    expect(snackSpy.open).toHaveBeenCalledWith('Failed to update task', 'OK', jasmine.any(Object));
  }));

  it('confirmDelete deletes when confirmed', fakeAsync(() => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as any);
    taskSpy.deleteTask.and.returnValue(of(undefined));
    comp.confirmDelete('1');
    tick();
    expect(taskSpy.deleteTask).toHaveBeenCalledWith('1');
    expect(snackSpy.open).toHaveBeenCalledWith('Task deleted', 'OK', jasmine.any(Object));
  }));
  it('confirmDelete does nothing when cancelled', fakeAsync(() => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(false) } as any);
    comp.confirmDelete('1');
    tick();
    expect(taskSpy.deleteTask).not.toHaveBeenCalled();
  }));
  it('confirmDelete shows error snack on failure', fakeAsync(() => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as any);
    taskSpy.deleteTask.and.returnValue(throwError(() => new Error()));
    comp.confirmDelete('1');
    tick();
    expect(snackSpy.open).toHaveBeenCalledWith('Failed to delete task', 'OK', jasmine.any(Object));
  }));
});
