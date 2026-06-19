import {
  Component,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { TaskService } from '../../core/tasks/task-service';
import { TaskDueDateFilter } from '../../core/models';
import { SpinnerComponent } from '../../shared/spinner/spinner';
import { DueDateFilterComponent } from '../../shared/components/due-date-filter/due-date-filter.component';
import {
  completionRate,
  countByStatus,
  createdVsCompleted,
  cycleTimeByWeek,
  dueHealth,
  lastNWeeks,
  velocityByWeek,
} from '../../core/tasks/task-stats';
import {
  CHART_COLORS,
  DASHBOARD_WEEKS,
  DUE_HEALTH_LABELS,
  FLOW_DATASET_LABELS,
  STATUS_LABELS,
} from '../../core/constants/app.constants';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  imports: [SpinnerComponent, DueDateFilterComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  taskService = inject(TaskService);

  private velocityCanvas = viewChild<ElementRef<HTMLCanvasElement>>('velocityCanvas');
  private statusCanvas = viewChild<ElementRef<HTMLCanvasElement>>('statusCanvas');
  private flowCanvas = viewChild<ElementRef<HTMLCanvasElement>>('flowCanvas');
  private cycleCanvas = viewChild<ElementRef<HTMLCanvasElement>>('cycleCanvas');
  private dueCanvas = viewChild<ElementRef<HTMLCanvasElement>>('dueCanvas');

  private charts: Chart[] = [];
  private readonly weeks = lastNWeeks(DASHBOARD_WEEKS);

  private stats = computed(() => {
    const tasks = this.taskService.tasks();
    const counts = countByStatus(tasks);
    return {
      counts,
      total: tasks.length,
      completionRate: Math.round(completionRate(tasks) * 100),
      velocity: velocityByWeek(tasks, this.weeks),
      flow: createdVsCompleted(tasks, this.weeks),
      cycle: cycleTimeByWeek(tasks, this.weeks),
      due: dueHealth(tasks),
    };
  });

  total = computed(() => this.stats().total);
  pending = computed(() => this.stats().counts.pending);
  inProgress = computed(() => this.stats().counts.inProgress);
  completionRatePct = computed(() => this.stats().completionRate);

  constructor() {
    effect(() => this.renderCharts());
  }

  ngOnInit() {
    this.taskService.loadTasks().subscribe();
  }

  onFilterChange(filter: TaskDueDateFilter | undefined) {
    this.taskService.loadTasks(filter).subscribe();
  }

  private renderCharts() {
    const labels = this.weeks.map(w => w.label);
    const s = this.stats();
    const velocityEl = this.velocityCanvas()?.nativeElement;
    const statusEl = this.statusCanvas()?.nativeElement;
    const flowEl = this.flowCanvas()?.nativeElement;
    const cycleEl = this.cycleCanvas()?.nativeElement;
    const dueEl = this.dueCanvas()?.nativeElement;

    if (!velocityEl || !statusEl || !flowEl || !cycleEl || !dueEl) return;

    this.charts.forEach(c => c.destroy());
    this.charts = [];

    const noLegend = { legend: { display: false as const } };
    const xy = (yTickSuffix = '') => ({
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        grid: { color: CHART_COLORS.grid },
        ticks: yTickSuffix ? { callback: (v: number | string) => `${v}${yTickSuffix}` } : {},
      },
    });

    this.charts.push(
      new Chart(velocityEl, {
        type: 'bar',
        data: {
          labels,
          datasets: [{ data: s.velocity, backgroundColor: CHART_COLORS.done, borderRadius: 4 }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: noLegend, scales: xy() },
      })
    );

    this.charts.push(
      new Chart(statusEl, {
        type: 'doughnut',
        data: {
          labels: [STATUS_LABELS.Pending, STATUS_LABELS.InProgress, STATUS_LABELS.Done],
          datasets: [
            {
              data: [s.counts.pending, s.counts.inProgress, s.counts.done],
              backgroundColor: [CHART_COLORS.pending, CHART_COLORS.inProgress, CHART_COLORS.done],
              borderWidth: 0,
            },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: noLegend },
      })
    );

    this.charts.push(
      new Chart(flowEl, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: FLOW_DATASET_LABELS.CREATED,
              data: s.flow.created,
              borderColor: CHART_COLORS.neutral,
              backgroundColor: 'rgba(136,135,128,0.08)',
              fill: true,
              tension: 0.35,
              pointRadius: 0,
            },
            {
              label: FLOW_DATASET_LABELS.COMPLETED,
              data: s.flow.completed,
              borderColor: CHART_COLORS.done,
              borderDash: [5, 4],
              tension: 0.35,
              pointRadius: 0,
            },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: noLegend, scales: xy() },
      })
    );

    this.charts.push(
      new Chart(cycleEl, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              data: s.cycle,
              borderColor: CHART_COLORS.cycle,
              backgroundColor: 'rgba(83,74,183,0.08)',
              fill: true,
              tension: 0.35,
              pointRadius: 3,
              pointBackgroundColor: CHART_COLORS.cycle,
              spanGaps: true,
            },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: noLegend, scales: xy('d') },
      })
    );

    this.charts.push(
      new Chart(dueEl, {
        type: 'bar',
        data: {
          labels: [...DUE_HEALTH_LABELS],
          datasets: [
            {
              data: [s.due.overdue, s.due.dueThisWeek, s.due.later, s.due.noDueDate],
              backgroundColor: [CHART_COLORS.overdue, CHART_COLORS.pending, CHART_COLORS.inProgress, CHART_COLORS.neutral],
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: noLegend,
          scales: { x: { beginAtZero: true, grid: { color: CHART_COLORS.grid } }, y: { grid: { display: false } } },
        },
      })
    );
  }
}
