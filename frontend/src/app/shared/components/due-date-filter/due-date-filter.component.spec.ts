import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DueDateFilterComponent } from './due-date-filter.component';
import { localDateStr } from './filter-utils';
import { FILTER_LABELS, DASHBOARD_PRESETS, DUE_DATE_PRESETS } from '../../../core/constants/app.constants';

describe('DueDateFilterComponent', () => {
  let component: DueDateFilterComponent;
  let fixture: ComponentFixture<DueDateFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DueDateFilterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DueDateFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exposes all expected presets from DASHBOARD_PRESETS', () => {
    expect(component.presets).toEqual(DASHBOARD_PRESETS);
  });

  it('exposes FILTER_LABELS', () => {
    expect(component.labels).toEqual(FILTER_LABELS);
  });

  describe('selectPreset', () => {
    it('emits undefined when null (All) is selected', (done) => {
      component.filterChange.subscribe(f => { expect(f).toBeUndefined(); done(); });
      component.selectPreset(null);
    });

    it('emits a filter for Today', (done) => {
      const today = localDateStr(new Date());
      component.filterChange.subscribe(f => {
        expect(f?.dateFrom).toBe(today);
        expect(f?.dateTo).toBe(today);
        done();
      });
      component.selectPreset(DUE_DATE_PRESETS.TODAY);
    });

    it('emits a filter for Week with Monday start', (done) => {
      component.filterChange.subscribe(f => {
        const parseDate = (str: string) => {
          const [y, m, d] = str.split('-').map(Number);
          return new Date(y, m - 1, d);
        };
        expect(parseDate(f?.dateFrom!).getDay()).toBe(1);
        expect(parseDate(f?.dateTo!).getDay()).toBe(0);
        done();
      });
      component.selectPreset(DUE_DATE_PRESETS.WEEK);
    });

    it('emits a filter for Month starting on the 1st', (done) => {
      const now = new Date();
      const expectedFrom = localDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
      component.filterChange.subscribe(f => {
        expect(f?.dateFrom).toBe(expectedFrom);
        done();
      });
      component.selectPreset(DUE_DATE_PRESETS.MONTH);
    });

    it('does NOT emit when Custom is selected — waits for Apply', () => {
      const spy = jasmine.createSpy('filterChange');
      component.filterChange.subscribe(spy);
      component.selectPreset(DUE_DATE_PRESETS.CUSTOM);
      expect(spy).not.toHaveBeenCalled();
    });

    it('initialises customFrom and customTo to today when Custom is selected', () => {
      const today = localDateStr(new Date());
      component.selectPreset(DUE_DATE_PRESETS.CUSTOM);
      expect(component.customFrom()).toBe(today);
      expect(component.customTo()).toBe(today);
    });
  });

  describe('showCustomRange', () => {
    it('is false initially', () => {
      expect(component.showCustomRange()).toBeFalse();
    });

    it('becomes true when Custom is selected', () => {
      component.selectPreset(DUE_DATE_PRESETS.CUSTOM);
      expect(component.showCustomRange()).toBeTrue();
    });

    it('returns to false when another preset is selected', () => {
      component.selectPreset(DUE_DATE_PRESETS.CUSTOM);
      component.selectPreset(DUE_DATE_PRESETS.TODAY);
      expect(component.showCustomRange()).toBeFalse();
    });
  });

  describe('applyCustomRange', () => {
    it('emits a Custom filter with the current from/to values', (done) => {
      component.selectPreset(DUE_DATE_PRESETS.CUSTOM);
      component.customFrom.set('2024-03-01');
      component.customTo.set('2024-03-31');

      component.filterChange.subscribe(f => {
        expect(f?.preset).toBe(DUE_DATE_PRESETS.CUSTOM);
        expect(f?.dateFrom).toBe('2024-03-01');
        expect(f?.dateTo).toBe('2024-03-31');
        done();
      });

      component.applyCustomRange();
    });

    it('emits undefined dateFrom/dateTo when signals are empty', (done) => {
      component.customFrom.set('');
      component.customTo.set('');
      component.filterChange.subscribe(f => {
        expect(f?.dateFrom).toBeUndefined();
        expect(f?.dateTo).toBeUndefined();
        done();
      });
      component.applyCustomRange();
    });
  });
});
