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
