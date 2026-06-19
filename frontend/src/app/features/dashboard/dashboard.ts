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
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { TaskService } from '../../core/tasks/task-service';
import { DueDatePreset, TaskDueDateFilter } from '../../core/models';
import { SpinnerComponent } from '../../shared/spinner/spinner';
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
  DASHBOARD_PRESETS,
  DASHBOARD_WEEKS,
  DUE_HEALTH_LABELS,
  FLOW_DATASET_LABELS,
  STATUS_LABELS,
} from '../../core/constants/app.constants';

Chart.register(...registerables);

interface PresetOption {
  label: string;
  value: DueDatePreset | null;
}

@Component({
  selector: 'app-dashboard',
  imports: [SpinnerComponent, FormsModule],
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

  readonly presets: PresetOption[] = DASHBOARD_PRESETS;

  activePreset = signal<DueDatePreset | null>(null);
  customFrom = signal('');
  customTo = signal('');
  showCustomRange = computed(() => this.activePreset() === 'Custom');

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

  selectPreset(preset: DueDatePreset | null) {
    this.activePreset.set(preset);
    if (preset === 'Custom') {
      const today = this.localDateStr(new Date());
      this.customFrom.set(today);
      this.customTo.set(today);
      return;
    }
    this.reload(preset ? this.buildFilter(preset) : undefined);
  }

  applyCustomRange() {
    const dateFrom = this.customFrom() || undefined;
    const dateTo = this.customTo() || undefined;
    this.reload({ preset: 'Custom', dateFrom, dateTo });
  }

  private localDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private buildFilter(preset: DueDatePreset): TaskDueDateFilter {
    const today = new Date();
    const fmt = (d: Date) => this.localDateStr(d);

    if (preset === 'Today') {
      const s = fmt(today);
      return { preset: 'Custom', dateFrom: s, dateTo: s };
    }
    if (preset === 'Week') {
      const dow = today.getDay();
      const toMon = dow === 0 ? -6 : 1 - dow;
      const mon = new Date(today); mon.setDate(today.getDate() + toMon);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { preset: 'Custom', dateFrom: fmt(mon), dateTo: fmt(sun) };
    }
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { preset: 'Custom', dateFrom: fmt(first), dateTo: fmt(last) };
  }

  private reload(filter?: TaskDueDateFilter) {
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
