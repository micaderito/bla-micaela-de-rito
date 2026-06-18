import { Component, input, output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DatePipe } from '@angular/common';
import { TaskItem as TaskItemModel } from '../../../core/models';

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
    return { Pending: 'primary', InProgress: 'accent', Done: 'warn' }[status] ?? 'primary';
  }

  statusLabel(status: string): string {
    return { Pending: 'Pending', InProgress: 'In Progress', Done: 'Done' }[status] ?? status;
  }
}
