import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideNativeDateAdapter } from '@angular/material/core';
import { TaskFormComponent } from './task-form';
import { TaskItem } from '../../../core/models';

const mockTask: TaskItem = {
  id: '1', title: 'Existing', description: 'Desc', status: 'InProgress',
  dueDate: '2027-06-01', userId: 'u1', createdAt: '', updatedAt: ''
};

function makeFixture(task?: TaskItem) {
  const dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
  TestBed.configureTestingModule({
    imports: [TaskFormComponent],
    providers: [
      provideAnimationsAsync(),
      provideNativeDateAdapter(),
      { provide: MatDialogRef, useValue: dialogRef },
      { provide: MAT_DIALOG_DATA, useValue: task ? { task } : {} }
    ]
  });
  const fixture = TestBed.createComponent(TaskFormComponent);
  fixture.detectChanges();
  return { fixture, comp: fixture.componentInstance, dialogRef };
}

describe('TaskFormComponent - create mode', () => {
  let fixture: ComponentFixture<TaskFormComponent>;
  let comp: TaskFormComponent;
  let dialogRef: jasmine.SpyObj<MatDialogRef<TaskFormComponent>>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    const r = makeFixture();
    fixture = r.fixture; comp = r.comp; dialogRef = r.dialogRef;
  });

  it('should create', () => expect(comp).toBeTruthy());
  it('isEdit is false for new task', () => expect(comp.isEdit).toBeFalse());

  it('cancel closes dialog', () => {
    comp.cancel();
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('submit does not close when invalid', () => {
    comp.form.get('title')?.setValue('');
    comp.submit();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('submit closes with dto when valid', fakeAsync(() => {
    comp.form.setValue({ title: 'New Task', description: 'Desc', status: 'Pending', dueDate: null });
    comp.submit();
    tick();
    expect(dialogRef.close).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'New Task', status: 'Pending' }));
  }));
});

describe('TaskFormComponent - edit mode', () => {
  let comp: TaskFormComponent;

  beforeEach(() => {
    TestBed.resetTestingModule();
    const r = makeFixture(mockTask);
    comp = r.comp;
  });

  it('isEdit is true', () => expect(comp.isEdit).toBeTrue());
  it('form pre-filled with task data', () => {
    expect(comp.form.value.title).toBe('Existing');
    expect(comp.form.value.status).toBe('InProgress');
  });
});
