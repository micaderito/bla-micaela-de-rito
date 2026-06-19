import { DueDatePreset, TaskDueDateFilter } from '../../../core/models';
import { DUE_DATE_PRESETS } from '../../../core/constants/app.constants';

export function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function buildFilter(preset: DueDatePreset): TaskDueDateFilter {
  const today = new Date();
  const fmt = (d: Date) => localDateStr(d);

  if (preset === DUE_DATE_PRESETS.TODAY) {
    const s = fmt(today);
    return { preset: DUE_DATE_PRESETS.CUSTOM, dateFrom: s, dateTo: s };
  }
  if (preset === DUE_DATE_PRESETS.WEEK) {
    const dow = today.getDay();
    const toMon = dow === 0 ? -6 : 1 - dow;
    const mon = new Date(today); mon.setDate(today.getDate() + toMon);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { preset: DUE_DATE_PRESETS.CUSTOM, dateFrom: fmt(mon), dateTo: fmt(sun) };
  }
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const last  = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { preset: DUE_DATE_PRESETS.CUSTOM, dateFrom: fmt(first), dateTo: fmt(last) };
}
