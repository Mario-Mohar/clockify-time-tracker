import { describe, it, expect } from 'vitest';
import {
  countVacationDaysInYear,
  summarizeVacationYear,
  vacationHoursInRange,
  entryFraction,
  entryKind,
  formatDays,
} from './vacation';

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
    expect(summary).toEqual({
      taken: 0, planned: 0, total: 0,
      sickTaken: 0, sickPlanned: 0, sickTotal: 0,
    });
  });
});

describe('vacationHoursInRange', () => {
  it('returns hoursPerDay * working days in the range', () => {
    // Week 2026-07-20 (Mo) to 2026-07-26 (So): vacation 20.-22.07 = 3 days
    const entries = [{ start: '2026-07-20', end: '2026-07-22' }];
    const hours = vacationHoursInRange(
      entries,
      new Date(2026, 6, 20),
      new Date(2026, 6, 26),
      'W',
      8 // hoursPerDay
    );
    expect(hours).toBe(24);
  });

  it('clips entries that extend beyond the range', () => {
    // Entry: 2026-07-20 - 2026-07-31 (10 working days)
    // Range: only 2026-07-20 - 2026-07-24 (5 working days) → 40h
    const entries = [{ start: '2026-07-20', end: '2026-07-31' }];
    const hours = vacationHoursInRange(
      entries,
      new Date(2026, 6, 20),
      new Date(2026, 6, 24),
      'W',
      8
    );
    expect(hours).toBe(40);
  });

  it('returns 0 when no entries overlap', () => {
    const entries = [{ start: '2026-03-02', end: '2026-03-06' }];
    const hours = vacationHoursInRange(
      entries,
      new Date(2026, 6, 20),
      new Date(2026, 6, 26),
      'W',
      8
    );
    expect(hours).toBe(0);
  });
});

describe('halbe Tage', () => {
  // 21.07.2026 ist ein Dienstag, also ein ganz normaler Arbeitstag.
  const HALBER_TAG = { start: '2026-07-21', end: '2026-07-21', fraction: 0.5 };

  it('zählt einen halben Tag als 0,5', () => {
    expect(countVacationDaysInYear(HALBER_TAG, 2026, 'W')).toBe(0.5);
  });

  it('liest einen fehlenden Bruchteil als ganzen Tag', () => {
    // Sonst würde aus jedem bestehenden Eintrag rückwirkend ein halber.
    expect(countVacationDaysInYear({ start: '2026-07-21', end: '2026-07-21' }, 2026, 'W')).toBe(1);
    expect(entryFraction({ start: '2026-07-21', end: '2026-07-21' })).toBe(1);
  });

  it('ignoriert einen Bruchteil über mehrere Tage', () => {
    // Ein halber Tag über zwei Wochen ergibt keinen Sinn; die Zeile kann aber
    // von Hand in der Datenbank stehen.
    const range = { start: '2026-07-20', end: '2026-07-24', fraction: 0.5 };
    expect(entryFraction(range)).toBe(1);
    expect(countVacationDaysInYear(range, 2026, 'W')).toBe(5);
  });

  it('summiert sechs halbe Tage zu drei', () => {
    // Genau der Fall aus dem Issue: verbraucht sind drei Tage, nicht sechs.
    const tage = ['2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10', '2026-07-13'];
    const entries = tage.map((d) => ({ start: d, end: d, fraction: 0.5 }));
    const summary = summarizeVacationYear(entries, 2026, 'W', new Date(2026, 11, 31));
    expect(summary.taken).toBe(3);
  });

  it('rechnet halbe Tage auch in Stunden um', () => {
    const hours = vacationHoursInRange(
      [HALBER_TAG],
      new Date(2026, 6, 1),
      new Date(2026, 6, 31),
      'W',
      8
    );
    expect(hours).toBe(4);
  });

  it('schreibt Tage mit Komma und ohne unnötige Null', () => {
    expect(formatDays(12)).toBe('12');
    expect(formatDays(12.5)).toBe('12,5');
    expect(formatDays(0.5)).toBe('0,5');
  });
});

describe('Krankenstand', () => {
  const KRANK = { start: '2026-07-21', end: '2026-07-22', kind: 'sick' as const };
  const URLAUB = { start: '2026-07-27', end: '2026-07-28' };
  const ENDE_2026 = new Date(2026, 11, 31);

  it('zählt Krankenstand nicht gegen das Kontingent', () => {
    const summary = summarizeVacationYear([KRANK, URLAUB], 2026, 'W', ENDE_2026);
    expect(summary.taken).toBe(2);      // nur der Urlaub
    expect(summary.sickTaken).toBe(2);  // getrennt ausgewiesen
    expect(summary.total).toBe(2);
  });

  it('liest einen fehlenden Typ als Urlaub', () => {
    expect(entryKind({})).toBe('vacation');
    expect(entryKind({ kind: 'sick' })).toBe('sick');
  });

  it('zählt Krankenstand für die Sollstunden wie Urlaub', () => {
    // Beides sind Tage, an denen nichts zu leisten war -- sonst erschiene
    // jede Krankenwoche als Minusstunden.
    const hours = vacationHoursInRange(
      [KRANK],
      new Date(2026, 6, 1),
      new Date(2026, 6, 31),
      'W',
      8
    );
    expect(hours).toBe(16);
  });

  it('kennt auch halbe Krankenstandstage', () => {
    const summary = summarizeVacationYear(
      [{ start: '2026-07-21', end: '2026-07-21', kind: 'sick', fraction: 0.5 }],
      2026, 'W', ENDE_2026
    );
    expect(summary.sickTaken).toBe(0.5);
    expect(summary.taken).toBe(0);
  });
});
