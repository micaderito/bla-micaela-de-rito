import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { TaskItemComponent } from './task-item';
import { TaskItem } from '../../../core/models';

const mockTask: TaskItem = {
  id: '1', title: 'Test Task', description: 'A description', status: 'Pending',
  dueDate: '2027-01-01', userId: 'u1', createdAt: '', updatedAt: ''
};

describe('TaskItemComponent', () => {
  let fixture: ComponentFixture<TaskItemComponent>;
  let comp: TaskItemComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskItemComponent],
      providers: [provideAnimationsAsync()]
    }).compileComponents();
    fixture = TestBed.createComponent(TaskItemComponent);
    fixture.componentRef.setInput('task', mockTask);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => expect(comp).toBeTruthy());

  it('renders task title', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Test Task');
  });

  it('emits edit event', () => {
    let emitted: TaskItem | undefined;
    comp.edit.subscribe(t => emitted = t);
    comp.edit.emit(mockTask);
    expect(emitted).toEqual(mockTask);
  });

  it('emits delete event', () => {
    let emitted: string | undefined;
    comp.delete.subscribe(id => emitted = id);
    comp.delete.emit('1');
    expect(emitted).toBe('1');
  });

  it('statusColor returns correct color', () => {
    expect(comp.statusColor('Pending')).toBe('primary');
    expect(comp.statusColor('InProgress')).toBe('accent');
    expect(comp.statusColor('Done')).toBe('warn');
    expect(comp.statusColor('Unknown')).toBe('primary');
  });

  it('statusLabel returns readable label', () => {
    expect(comp.statusLabel('InProgress')).toBe('In progress');
    expect(comp.statusLabel('Done')).toBe('Done');
  });
});
