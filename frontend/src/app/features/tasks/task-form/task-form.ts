import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule, MAT_DATEPICKER_SCROLL_STRATEGY } from '@angular/material/datepicker';
import { DatePipe } from '@angular/common';
import { Overlay } from '@angular/cdk/overlay';
import { TaskItem, TaskStatus } from '../../../core/models';
import { STATUS_LABELS, TASK_FORM_STEPS, TASK_STATUSES } from '../../../core/constants/app.constants';

export interface TaskFormData {
  task?: TaskItem;
}

interface WizardStep {
  label: string;
  title: string;
}

@Component({
  selector: 'app-task-form',
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule,
    MatDatepickerModule, DatePipe
  ],
  providers: [
    {
      provide: MAT_DATEPICKER_SCROLL_STRATEGY,
      useFactory: (overlay: Overlay) => () => overlay.scrollStrategies.noop(),
      deps: [Overlay]
    }
  ],
  templateUrl: './task-form.html',
  styleUrl: './task-form.scss',
})
export class TaskFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  dialogRef = inject<MatDialogRef<TaskFormComponent>>(MatDialogRef);
  data: TaskFormData = inject(MAT_DIALOG_DATA);

  statuses: TaskStatus[] = TASK_STATUSES;
  statusLabels: Record<TaskStatus, string> = STATUS_LABELS;

  steps: WizardStep[] = TASK_FORM_STEPS;

  currentStep = signal(0);
  isLastStep = computed(() => this.currentStep() === this.steps.length - 1);

  form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    status: ['Pending' as TaskStatus, Validators.required],
    dueDate: [null as Date | null]
  });

  get isEdit() { return !!this.data?.task; }

  ngOnInit() {
    if (this.data?.task) {
      const t = this.data.task;
      this.form.patchValue({
        title: t.title,
        description: t.description,
        status: t.status,
        dueDate: t.dueDate ? new Date(t.dueDate) : null
      });
    }
  }

  // Returns true when the controls relevant to the current step are valid.
  private isStepValid(step: number): boolean {
    if (step === 0) return this.form.get('title')!.valid;
    if (step === 1) return this.form.get('dueDate')!.valid;
    return true;
  }

  // Called from the template's disabled binding; re-evaluated each change-detection cycle.
  canAdvance(): boolean {
    return this.isStepValid(this.currentStep());
  }

  next() {
    const step = this.currentStep();
    if (!this.isStepValid(step)) {
      if (step === 0) this.form.get('title')!.markAsTouched();
      if (step === 1) this.form.get('dueDate')!.markAsTouched();
      return;
    }
    if (!this.isLastStep()) this.currentStep.update(s => s + 1);
  }

  back() {
    if (this.currentStep() > 0) this.currentStep.update(s => s - 1);
  }

  goToStep(step: number) {
    // Only allow jumping to a step if every preceding step is valid.
    for (let i = 0; i < step; i++) {
      if (!this.isStepValid(i)) return;
    }
    this.currentStep.set(step);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.currentStep.set(0);
      return;
    }
    const v = this.form.value;
    this.dialogRef.close({
      title: v.title!,
      description: v.description ?? '',
      status: v.status!,
      dueDate: v.dueDate ? (v.dueDate as Date).toISOString().split('T')[0] : null
    });
  }

  cancel() { this.dialogRef.close(); }
}
