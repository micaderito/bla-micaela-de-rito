import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ConfirmDialogComponent } from './confirm-dialog';

describe('ConfirmDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let comp: ConfirmDialogComponent;
  let dialogRef: jasmine.SpyObj<MatDialogRef<ConfirmDialogComponent>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { title: 'Delete', message: 'Sure?' } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ConfirmDialogComponent);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => expect(comp).toBeTruthy());
  it('renders title and message', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Delete');
    expect(el.textContent).toContain('Sure?');
  });
  it('confirm closes with true', () => {
    comp.confirm();
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });
  it('cancel closes with false', () => {
    comp.cancel();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });
});
