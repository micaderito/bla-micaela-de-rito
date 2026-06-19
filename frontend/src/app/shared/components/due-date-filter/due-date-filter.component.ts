import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DueDatePreset, TaskDueDateFilter } from '../../../core/models';
import { DASHBOARD_PRESETS, DUE_DATE_PRESETS, FILTER_LABELS } from '../../../core/constants/app.constants';
import { buildFilter, localDateStr } from './filter-utils';

interface PresetOption {
  label: string;
  value: DueDatePreset | null;
}

@Component({
  selector: 'app-due-date-filter',
  imports: [FormsModule],
  templateUrl: './due-date-filter.component.html',
  styleUrl: './due-date-filter.component.scss',
})
export class DueDateFilterComponent {
  readonly presets: PresetOption[] = DASHBOARD_PRESETS;
  readonly labels = FILTER_LABELS;

  selectedPreset = input<DueDatePreset | null>(null);
  filterChange = output<TaskDueDateFilter | undefined>();

  activePreset = signal<DueDatePreset | null>(this.selectedPreset());
  customFrom = signal('');
  customTo = signal('');

  showCustomRange = computed(() => this.activePreset() === DUE_DATE_PRESETS.CUSTOM);

  selectPreset(preset: DueDatePreset | null) {
    this.activePreset.set(preset);
    if (preset === DUE_DATE_PRESETS.CUSTOM) {
      const today = localDateStr(new Date());
      this.customFrom.set(today);
      this.customTo.set(today);
      return;
    }
    this.filterChange.emit(preset ? buildFilter(preset) : undefined);
  }

  applyCustomRange() {
    const dateFrom = this.customFrom() || undefined;
    const dateTo = this.customTo() || undefined;
    this.filterChange.emit({ preset: DUE_DATE_PRESETS.CUSTOM, dateFrom, dateTo });
  }
}
