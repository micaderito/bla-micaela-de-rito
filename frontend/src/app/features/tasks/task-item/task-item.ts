import { Component, input, output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DatePipe } from '@angular/common';
import { TaskItem as TaskItemModel } from '../../../core/models';
import { STATUS_COLORS, STATUS_LABELS } from '../../../core/constants/app.constants';

@Component({
  selector: 'app-task-item',
  imports: [MatCardModule, MatChipsModule, MatButtonModule, MatIconModule, DatePipe],
  templateUrl: './task-item.html',
  styleUrl: './task-item.scss',
})
export class TaskItemComponent {
  task = input.required<TaskItemModel>();
  edit = output<TaskItemModel>();
  delete = output<string>();

  statusColor(status: string): string {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] ?? 'primary';
  }

  statusLabel(status: string): string {
    return STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status;
  }
}
