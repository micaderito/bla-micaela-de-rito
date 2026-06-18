import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { TaskItem, TaskStatus } from '../../../core/models';

export interface TaskFormData {
  task?: TaskItem;
}

@Component({
  selector: 'app-task-form',
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule,
    MatDatepickerModule, MatNativeDateModule
  ],
  templateUrl: './task-form.html',
  styleUrl: './task-form.scss',
})
export class TaskFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  dialogRef = inject<MatDialogRef<TaskFormComponent>>(MatDialogRef);
  data: TaskFormData = inject(MAT_DIALOG_DATA);

  statuses: TaskStatus[] = ['Pending', 'InProgress', 'Done'];
  statusLabels: Record<TaskStatus, string> = { Pending: 'Pending', InProgress: 'In Progress', Done: 'Done' };

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

  submit() {
    if (this.form.invalid) return;
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
