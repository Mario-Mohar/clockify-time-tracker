/**
 * Austrian Holidays Calculator
 * Calculates public holidays for Austrian federal states (Bundesländer)
 */

import { isWeekend, isSameDay } from 'date-fns';

/**
 * Austrian federal states (Bundesländer)
 */
export type AustrianState =
  | 'B'   // Burgenland
  | 'K'   // Kärnten
  | 'NÖ'  // Niederösterreich
  | 'OÖ'  // Oberösterreich
  | 'S'   // Salzburg
  | 'ST'  // Steiermark
  | 'T'   // Tirol
  | 'V'   // Vorarlberg
  | 'W';  // Wien

export interface Holiday {
  date: Date;
  name: string;
  isNational: boolean;
  states: AustrianState[];
}

/**
 * State names in German
 */
export const STATE_NAMES: Record<AustrianState, string> = {
  'B': 'Burgenland',
  'K': 'Kärnten',
  'NÖ': 'Niederösterreich',
  'OÖ': 'Oberösterreich',
  'S': 'Salzburg',
  'ST': 'Steiermark',
  'T': 'Tirol',
  'V': 'Vorarlberg',
  'W': 'Wien',
};

/**
 * All Austrian states
 */
const ALL_STATES: AustrianState[] = ['B', 'K', 'NÖ', 'OÖ', 'S', 'ST', 'T', 'V', 'W'];

/**
 * Calculate Easter Sunday using Gauss's Easter algorithm
 * (Computus - Meeus/Jones/Butcher algorithm)
 */
function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month, day);
}

/**
 * Get all Austrian public holidays for a specific year and state
 */
export function getAustrianHolidays(year: number, state?: AustrianState): Holiday[] {
  const easter = calculateEaster(year);
  const holidays: Holiday[] = [];

  // Helper to add days to a date
  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  // Fixed national holidays (13 in total)
  holidays.push(
    {
      date: new Date(year, 0, 1),
      name: 'Neujahr',
      isNational: true,
      states: ALL_STATES,
    },
    {
      date: new Date(year, 0, 6),
      name: 'Heilige Drei Könige',
      isNational: true,
      states: ALL_STATES,
    },
    {
      date: new Date(year, 4, 1),
      name: 'Staatsfeiertag',
      isNational: true,
      states: ALL_STATES,
    },
    {
      date: new Date(year, 7, 15),
      name: 'Mariä Himmelfahrt',
      isNational: true,
      states: ALL_STATES,
    },
    {
      date: new Date(year, 9, 26),
      name: 'Nationalfeiertag',
      isNational: true,
      states: ALL_STATES,
    },
    {
      date: new Date(year, 10, 1),
      name: 'Allerheiligen',
      isNational: true,
      states: ALL_STATES,
    },
    {
      date: new Date(year, 11, 8),
      name: 'Mariä Empfängnis',
      isNational: true,
      states: ALL_STATES,
    },
    {
      date: new Date(year, 11, 25),
      name: 'Christtag',
      isNational: true,
      states: ALL_STATES,
    },
    {
      date: new Date(year, 11, 26),
      name: 'Stefanitag',
      isNational: true,
      states: ALL_STATES,
    }
  );

  // Easter-dependent national holidays
  holidays.push(
    {
      date: addDays(easter, 1),
      name: 'Ostermontag',
      isNational: true,
      states: ALL_STATES,
    },
    {
      date: addDays(easter, 39),
      name: 'Christi Himmelfahrt',
      isNational: true,
      states: ALL_STATES,
    },
    {
      date: addDays(easter, 50),
      name: 'Pfingstmontag',
      isNational: true,
      states: ALL_STATES,
    },
    {
      date: addDays(easter, 60),
      name: 'Fronleichnam',
      isNational: true,
      states: ALL_STATES,
    }
  );

  // Note: Regional holidays are not included as per user request
  // All 13 national holidays are sufficient for accurate calculations

  // Filter by state if provided
  if (state) {
    return holidays.filter((h) => h.states.includes(state));
  }

  return holidays;
}

/**
 * Check if a date is a holiday in a specific state
 */
export function isHoliday(date: Date, state: AustrianState): boolean {
  const year = date.getFullYear();
  const holidays = getAustrianHolidays(year, state);

  return holidays.some((holiday) => isSameDay(holiday.date, date));
}

/**
 * Check if a date is a working day (not weekend, not holiday)
 */
export function isWorkingDay(date: Date, state: AustrianState): boolean {
  if (isWeekend(date)) return false;
  if (isHoliday(date, state)) return false;
  return true;
}

/**
 * Count working days in a date range (excluding weekends and holidays)
 */
export function countWorkingDaysWithHolidays(
  start: Date,
  end: Date,
  state: AustrianState
): number {
  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    if (isWorkingDay(current, state)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Get holidays for a specific month
 */
export function getMonthHolidays(
  year: number,
  month: number,
  state: AustrianState
): Holiday[] {
  const holidays = getAustrianHolidays(year, state);
  return holidays.filter((h) => h.date.getMonth() === month);
}

/**
 * Get holidays for a specific year
 */
export function getYearHolidays(year: number, state: AustrianState): Holiday[] {
  return getAustrianHolidays(year, state);
}

/**
 * Get holiday count for a date range
 */
export function getHolidayCount(
  start: Date,
  end: Date,
  state: AustrianState
): number {
  // Ueber alle beruehrten Jahre, nicht nur ueber das Startjahr: der klassische
  // Weihnachtsurlaub laeuft ueber den Jahreswechsel, und Neujahr sowie Heilige
  // Drei Koenige gehoeren dann schon zum Folgejahr. isHoliday() und
  // countWorkingDaysWithHolidays() fragen ohnehin je Datum nach dem Jahr.
  let count = 0;
  for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
    count += getAustrianHolidays(year, state).filter(
      (h) => h.date >= start && h.date <= end
    ).length;
  }
  return count;
}

// Re-export types for backwards compatibility
export type GermanState = AustrianState;
