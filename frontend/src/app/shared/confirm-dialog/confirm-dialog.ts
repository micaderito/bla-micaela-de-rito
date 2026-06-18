import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmDialogData {
  title: string;
  message: string;
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialogComponent {
  dialogRef = inject<MatDialogRef<ConfirmDialogComponent>>(MatDialogRef);
  data: ConfirmDialogData = inject(MAT_DIALOG_DATA);

  confirm() { this.dialogRef.close(true); }
  cancel() { this.dialogRef.close(false); }
}
