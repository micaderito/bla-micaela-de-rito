import { buildFilter, localDateStr } from './filter-utils';
import { DUE_DATE_PRESETS } from '../../../core/constants/app.constants';

describe('localDateStr', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(localDateStr(new Date(2024, 0, 5))).toBe('2024-01-05');
    expect(localDateStr(new Date(2024, 11, 31))).toBe('2024-12-31');
  });

  it('zero-pads single-digit month and day', () => {
    expect(localDateStr(new Date(2024, 2, 3))).toMatch(/^\d{4}-03-03$/);
  });
});

describe('buildFilter', () => {
  it('always returns preset: Custom', () => {
    expect(buildFilter(DUE_DATE_PRESETS.TODAY).preset).toBe(DUE_DATE_PRESETS.CUSTOM);
    expect(buildFilter(DUE_DATE_PRESETS.WEEK).preset).toBe(DUE_DATE_PRESETS.CUSTOM);
    expect(buildFilter(DUE_DATE_PRESETS.MONTH).preset).toBe(DUE_DATE_PRESETS.CUSTOM);
  });

  it('all output dates are formatted as YYYY-MM-DD', () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    for (const preset of [DUE_DATE_PRESETS.TODAY, DUE_DATE_PRESETS.WEEK, DUE_DATE_PRESETS.MONTH] as const) {
      const filter = buildFilter(preset);
      expect(filter.dateFrom).toMatch(dateRegex);
      expect(filter.dateTo).toMatch(dateRegex);
    }
  });

  describe('Today', () => {
    it('sets dateFrom and dateTo to today', () => {
      const today = localDateStr(new Date());
      const filter = buildFilter(DUE_DATE_PRESETS.TODAY);
      expect(filter.dateFrom).toBe(today);
      expect(filter.dateTo).toBe(today);
    });
  });

  describe('Week', () => {
    function parseDate(dateStr: string): Date {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    }

    it('spans Monday to Sunday', () => {
      const filter = buildFilter(DUE_DATE_PRESETS.WEEK);
      expect(parseDate(filter.dateFrom!).getDay()).toBe(1);
      expect(parseDate(filter.dateTo!).getDay()).toBe(0);
    });

    it('range is exactly 6 days apart', () => {
      const filter = buildFilter(DUE_DATE_PRESETS.WEEK);
      const from = parseDate(filter.dateFrom!);
      const to   = parseDate(filter.dateTo!);
      const diffDays = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
      expect(diffDays).toBe(6);
    });

    it('handles Sunday as current day — starts from previous Monday', () => {
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date(2024, 0, 7)); // known Sunday
      const filter = buildFilter(DUE_DATE_PRESETS.WEEK);
      expect(parseDate(filter.dateFrom!).getDay()).toBe(1);
      jasmine.clock().uninstall();
    });
  });

  describe('Month', () => {
    it('sets dateFrom to the first day of the current month', () => {
      const now = new Date();
      const expected = localDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
      expect(buildFilter(DUE_DATE_PRESETS.MONTH).dateFrom).toBe(expected);
    });

    it('sets dateTo to the last day of the current month', () => {
      const now = new Date();
      const expected = localDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      expect(buildFilter(DUE_DATE_PRESETS.MONTH).dateTo).toBe(expected);
    });
  });
});
