import { countWorkingDaysWithHolidays } from './holidays';
import type { AustrianState } from './holidays';

export interface VacationEntry {
  id?: number;
  start: string; // ISO date YYYY-MM-DD
  end: string;   // ISO date YYYY-MM-DD
  note?: string | null;
}

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function countVacationDaysInYear(
  entry: Pick<VacationEntry, 'start' | 'end'>,
  year: number,
  state: AustrianState
): number {
  const start = parseDate(entry.start);
  const end = parseDate(entry.end);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  const rangeStart = start > yearStart ? start : yearStart;
  const rangeEnd = end < yearEnd ? end : yearEnd;

  if (rangeStart > rangeEnd) return 0;

  return countWorkingDaysWithHolidays(rangeStart, rangeEnd, state);
}

export interface VacationSummary {
  taken: number;
  planned: number;
  total: number;
}

export function summarizeVacationYear(
  entries: Pick<VacationEntry, 'start' | 'end'>[],
  year: number,
  state: AustrianState,
  today: Date
): VacationSummary {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  let taken = 0;
  let planned = 0;

  for (const entry of entries) {
    const start = parseDate(entry.start);
    const end = parseDate(entry.end);
    const rangeStart = start > yearStart ? start : yearStart;
    const rangeEnd = end < yearEnd ? end : yearEnd;
    if (rangeStart > rangeEnd) continue;

    // Split the clipped range at today.
    const takenEnd = rangeEnd <= today ? rangeEnd : today;
    const plannedStart = new Date(today);
    plannedStart.setDate(plannedStart.getDate() + 1);

    if (rangeStart <= takenEnd && rangeStart <= today) {
      taken += countWorkingDaysWithHolidays(rangeStart, takenEnd, state);
    }
    if (plannedStart <= rangeEnd) {
      const pStart = rangeStart > plannedStart ? rangeStart : plannedStart;
      planned += countWorkingDaysWithHolidays(pStart, rangeEnd, state);
    }
  }

  return { taken, planned, total: taken + planned };
}

export function vacationHoursInRange(
  entries: Pick<VacationEntry, 'start' | 'end'>[],
  rangeStart: Date,
  rangeEnd: Date,
  state: AustrianState,
  hoursPerDay: number
): number {
  let total = 0;
  for (const entry of entries) {
    const start = parseDate(entry.start);
    const end = parseDate(entry.end);
    const clipStart = start > rangeStart ? start : rangeStart;
    const clipEnd = end < rangeEnd ? end : rangeEnd;
    if (clipStart > clipEnd) continue;
    total += countWorkingDaysWithHolidays(clipStart, clipEnd, state);
  }
  return total * hoursPerDay;
}
