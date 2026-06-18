import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TaskService } from './task-service';
import { TaskItem } from '../models';

const mockTask: TaskItem = {
  id: 'abc', title: 'Test', description: 'Desc', status: 'Pending',
  dueDate: null, userId: 'u1', createdAt: '', updatedAt: ''
};

describe('TaskService', () => {
  let service: TaskService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(TaskService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => expect(service).toBeTruthy());

  it('loadTasks sets tasks signal', fakeAsync(() => {
    service.loadTasks().subscribe();
    http.expectOne('http://localhost:5080/api/tasks').flush([mockTask]);
    tick();
    expect(service.tasks().length).toBe(1);
    expect(service.loading()).toBeFalse();
  }));

  it('loadTasks sets error on failure', fakeAsync(() => {
    service.loadTasks().subscribe({ error: () => {} });
    http.expectOne('http://localhost:5080/api/tasks').flush(
      { detail: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' }
    );
    tick();
    expect(service.error()).toBe('Unauthorized');
    expect(service.loading()).toBeFalse();
  }));

  it('createTask prepends to list', fakeAsync(() => {
    service.createTask({ title: 'New', description: '', status: 'Pending', dueDate: null }).subscribe();
    http.expectOne('http://localhost:5080/api/tasks').flush({ ...mockTask, id: 'new' });
    tick();
    expect(service.tasks()[0].id).toBe('new');
  }));

  it('updateTask replaces item in list', fakeAsync(() => {
    // seed a task
    service['_tasks'].set([mockTask]);
    service.updateTask('abc', { title: 'Updated', description: '', status: 'Done', dueDate: null }).subscribe();
    http.expectOne('http://localhost:5080/api/tasks/abc').flush({ ...mockTask, title: 'Updated', status: 'Done' });
    tick();
    expect(service.tasks()[0].title).toBe('Updated');
    expect(service.tasks()[0].status).toBe('Done');
  }));

  it('deleteTask removes item', fakeAsync(() => {
    service['_tasks'].set([mockTask]);
    service.deleteTask('abc').subscribe();
    http.expectOne('http://localhost:5080/api/tasks/abc').flush(null);
    tick();
    expect(service.tasks().length).toBe(0);
  }));

  it('taskCount computed from tasks', () => {
    service['_tasks'].set([mockTask, mockTask]);
    expect(service.taskCount()).toBe(2);
  });
});
