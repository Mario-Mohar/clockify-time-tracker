import { describe, it, expect } from 'vitest';
import { countVacationDaysInYear, summarizeVacationYear } from './vacation';

describe('countVacationDaysInYear', () => {
  it('counts working days only (Mo–Fr, no holidays) within a single year', () => {
    // 20.07.2026 (Mo) – 24.07.2026 (Fr) = 5 Arbeitstage
    const days = countVacationDaysInYear(
      { start: '2026-07-20', end: '2026-07-24' },
      2026,
      'W'
    );
    expect(days).toBe(5);
  });

  it('excludes holidays (e.g. Nationalfeiertag 26.10.)', () => {
    // 26.10.2026 is a Monday AND Nationalfeiertag in Austria.
    // Range 26.10.2026 (Mo, Feiertag) – 30.10.2026 (Fr) = 4 Arbeitstage
    const days = countVacationDaysInYear(
      { start: '2026-10-26', end: '2026-10-30' },
      2026,
      'W'
    );
    expect(days).toBe(4);
  });

  it('splits entries crossing year boundary: only counts days in the requested year', () => {
    // 28.12.2026 (Mo) – 05.01.2027 (Di)
    // Year 2026: 28.12 (Mo), 29.12 (Di), 30.12 (Mi), 31.12 (Do) = 4 Arbeitstage
    // Year 2027: 04.01 (Mo), 05.01 (Di) = 2 Arbeitstage
    //   (01.01 Fr = Neujahr/Feiertag, 02.01 Sa, 03.01 So)
    const entry = { start: '2026-12-28', end: '2027-01-05' };
    expect(countVacationDaysInYear(entry, 2026, 'W')).toBe(4);
    expect(countVacationDaysInYear(entry, 2027, 'W')).toBe(2);
  });

  it('returns 0 if the entry does not overlap the year', () => {
    const days = countVacationDaysInYear(
      { start: '2025-07-20', end: '2025-07-24' },
      2026,
      'W'
    );
    expect(days).toBe(0);
  });

  it('handles single-day entries', () => {
    // 21.07.2026 is a Tuesday
    const days = countVacationDaysInYear(
      { start: '2026-07-21', end: '2026-07-21' },
      2026,
      'W'
    );
    expect(days).toBe(1);
  });

  it('returns 0 for a weekend-only entry', () => {
    // 18.07.2026 (Sa) - 19.07.2026 (So)
    const days = countVacationDaysInYear(
      { start: '2026-07-18', end: '2026-07-19' },
      2026,
      'W'
    );
    expect(days).toBe(0);
  });
});

describe('summarizeVacationYear', () => {
  const TODAY = new Date(2026, 6, 20); // 2026-07-20 (Monday)

  it('splits into taken (<= today) and planned (> today)', () => {
    const entries = [
      { start: '2026-03-02', end: '2026-03-06' }, // 5 days, all past → taken
      { start: '2026-09-14', end: '2026-09-18' }, // 5 days, all future → planned
    ];
    const summary = summarizeVacationYear(entries, 2026, 'W', TODAY);
    expect(summary.taken).toBe(5);
    expect(summary.planned).toBe(5);
    expect(summary.total).toBe(10);
  });

  it('splits a single entry that spans today', () => {
    // 2026-07-20 (today, Mo) - 2026-07-24 (Fr) = 5 working days
    // Taken: today only = 1; Planned: Tue-Fri = 4
    const entries = [{ start: '2026-07-20', end: '2026-07-24' }];
    const summary = summarizeVacationYear(entries, 2026, 'W', TODAY);
    expect(summary.taken).toBe(1);
    expect(summary.planned).toBe(4);
    expect(summary.total).toBe(5);
  });

  it('ignores entries outside the requested year for the summary', () => {
    const entries = [
      { start: '2025-07-20', end: '2025-07-24' }, // other year
      { start: '2026-03-02', end: '2026-03-06' }, // 5 days 2026, taken
    ];
    const summary = summarizeVacationYear(entries, 2026, 'W', TODAY);
    expect(summary.taken).toBe(5);
    expect(summary.planned).toBe(0);
    expect(summary.total).toBe(5);
  });

  it('handles year-boundary entry correctly', () => {
    // 28.12.2026 (Mo) – 05.01.2027 (Di)
    // For year 2026 with today = 2026-07-20: all 4 days in 2026 are future → planned
    const entries = [{ start: '2026-12-28', end: '2027-01-05' }];
    const summary = summarizeVacationYear(entries, 2026, 'W', TODAY);
    expect(summary.taken).toBe(0);
    expect(summary.planned).toBe(4);
    expect(summary.total).toBe(4);
  });

  it('returns zeros for an empty list', () => {
    const summary = summarizeVacationYear([], 2026, 'W', TODAY);
    expect(summary).toEqual({ taken: 0, planned: 0, total: 0 });
  });
});
