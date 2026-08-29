/**
 * Calculation Engine for Required vs Actual Working Hours
 * Handles all time-related calculations based on work contract configuration
 */

import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  format,
} from 'date-fns';
import { de } from 'date-fns/locale';
import {
  type AustrianState,
  DEFAULT_WORK_DAYS,
  countWorkingDaysWithHolidays,
  getMonthHolidays,
  getYearHolidays,
  isWorkingDay,
} from './holidays';

export interface WorkConfig {
  weeklyHours: number; // e.g., 40
  // Welche Wochentage gearbeitet werden, als getDay()-Indizes (0 = So ... 6 = Sa).
  // Früher stand hier nur workDaysPerWeek, eine blosse Anzahl. Damit liess sich
  // die Frage "ist dieser Tag ein Arbeitstag?" nicht beantworten, und das Soll
  // zählte für jeden fünf Wochentage.
  workDays: number[];
  startOfWeek: 'monday' | 'sunday'; // First day of week
  state: AustrianState; // Austrian federal state (for potential future use)
  vacationBudget: number; // Tage/Jahr, default 25
}

export interface TimeComparison {
  requiredHours: number;
  actualHours: number;
  clockifyHours: number;   // NEW: aus Clockify
  vacationHours: number;   // NEW: aus Urlaub
  difference: number; // positive = overtime, negative = missing
  status: 'over' | 'good' | 'under'; // Color coding
  period: string; // e.g., "2025-W47", "2025-11", "2025"
  workingDays?: number; // Number of working days in period
  holidays?: number; // Number of holidays in period
}

/**
 * Default work configuration: 40h/week, 5 days, W (Wien)
 */
export const DEFAULT_CONFIG: WorkConfig = {
  weeklyHours: 40,
  workDays: DEFAULT_WORK_DAYS,
  startOfWeek: 'monday',
  state: 'W', // Default to Wien (Austria)
  vacationBudget: 25,
};

/**
 * Calculate required hours per day
 */
export function getHoursPerDay(config: WorkConfig): number {
  const days = config.workDays?.length || DEFAULT_WORK_DAYS.length;
  return config.weeklyHours / days;
}

/**
 * Count working days in a date range (excluding weekends and holidays)
 */
export function countWorkingDays(start: Date, end: Date, config: WorkConfig): number {
  return countWorkingDaysWithHolidays(start, end, config.state, config.workDays ?? DEFAULT_WORK_DAYS);
}

/**
 * Calculate required hours for today
 */
export function calculateRequiredToday(config: WorkConfig, date: Date = new Date()): number {
  const today = date;
  // Wie Woche, Monat und Jahr: freie Wochentage UND Feiertage zählen nicht.
  // Vorher wurde hier nur aufs Wochenende geprüft, ein Feiertag verlangte also
  // einen vollen Arbeitstag, den die Wochenkachel daneben schon abgezogen hatte.
  if (!isWorkingDay(today, config.state, config.workDays ?? DEFAULT_WORK_DAYS)) {
    return 0;
  }
  return getHoursPerDay(config);
}

/**
 * Calculate required hours for current week
 */
export function calculateRequiredWeek(config: WorkConfig, date: Date = new Date()): number {
  const weekStart = startOfWeek(date, {
    weekStartsOn: config.startOfWeek === 'monday' ? 1 : 0,
  });
  const weekEnd = endOfWeek(date, {
    weekStartsOn: config.startOfWeek === 'monday' ? 1 : 0,
  });

  // Dieselbe Formel wie Monat und Jahr. Die frühere fest verdrahtete 5 stimmte
  // nur, solange auch tatsächlich fünf Tage gearbeitet wurden; jetzt weiss
  // countWorkingDays, welche Tage das sind, und die drei Kacheln sagen
  // dasselbe.
  const workDays = countWorkingDays(weekStart, weekEnd, config);
  return workDays * getHoursPerDay(config);
}

/**
 * Calculate required hours for current month
 */
export function calculateRequiredMonth(config: WorkConfig, date: Date = new Date()): number {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);

  const workDays = countWorkingDays(monthStart, monthEnd, config);
  const hoursPerDay = getHoursPerDay(config);

  return workDays * hoursPerDay;
}

/**
 * Calculate required hours for current year
 */
export function calculateRequiredYear(config: WorkConfig, date: Date = new Date()): number {
  const yearStart = startOfYear(date);
  const yearEnd = endOfYear(date);

  const workDays = countWorkingDays(yearStart, yearEnd, config);
  const hoursPerDay = getHoursPerDay(config);

  return workDays * hoursPerDay;
}

/**
 * Determine status based on difference
 * - over: >= 1 hour overtime
 * - good: within ±1 hour
 * - under: >= 1 hour missing
 */
export function getStatus(difference: number): 'over' | 'good' | 'under' {
  if (difference >= 1) return 'over';
  if (difference <= -1) return 'under';
  return 'good';
}

/**
 * Compare required vs actual hours for today
 */
export function compareTodayHours(
  clockifyHours: number,
  vacationHours: number,
  config: WorkConfig
): TimeComparison {
  const requiredHours = calculateRequiredToday(config);
  const actualHours = clockifyHours + vacationHours;
  const difference = actualHours - requiredHours;
  const today = new Date();
  return {
    requiredHours,
    actualHours,
    clockifyHours,
    vacationHours,
    difference,
    status: getStatus(difference),
    period: format(today, 'yyyy-MM-dd', { locale: de }),
  };
}

/**
 * Compare required vs actual hours for current week
 */
export function compareWeekHours(
  clockifyHours: number,
  vacationHours: number,
  config: WorkConfig,
  date: Date = new Date()
): TimeComparison {
  const requiredHours = calculateRequiredWeek(config, date);
  const actualHours = clockifyHours + vacationHours;
  const difference = actualHours - requiredHours;
  return {
    requiredHours,
    actualHours,
    clockifyHours,
    vacationHours,
    difference,
    status: getStatus(difference),
    period: format(date, "'KW' II/yyyy", { locale: de }),
  };
}

/**
 * Compare required vs actual hours for current month
 */
export function compareMonthHours(
  clockifyHours: number,
  vacationHours: number,
  config: WorkConfig,
  date: Date = new Date()
): TimeComparison {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const workingDays = countWorkingDays(monthStart, monthEnd, config);
  const holidays = getMonthHolidays(date.getFullYear(), date.getMonth(), config.state);
  const requiredHours = calculateRequiredMonth(config, date);
  const actualHours = clockifyHours + vacationHours;
  const difference = actualHours - requiredHours;
  return {
    requiredHours,
    actualHours,
    clockifyHours,
    vacationHours,
    difference,
    status: getStatus(difference),
    period: format(date, 'MMMM yyyy', { locale: de }),
    workingDays,
    holidays: holidays.length,
  };
}

/**
 * Compare required vs actual hours for current year
 */
export function compareYearHours(
  clockifyHours: number,
  vacationHours: number,
  config: WorkConfig,
  date: Date = new Date()
): TimeComparison {
  const yearStart = startOfYear(date);
  const yearEnd = endOfYear(date);
  const workingDays = countWorkingDays(yearStart, yearEnd, config);
  const holidays = getYearHolidays(date.getFullYear(), config.state);
  const requiredHours = calculateRequiredYear(config, date);
  const actualHours = clockifyHours + vacationHours;
  const difference = actualHours - requiredHours;
  return {
    requiredHours,
    actualHours,
    clockifyHours,
    vacationHours,
    difference,
    status: getStatus(difference),
    period: format(date, 'yyyy', { locale: de }),
    workingDays,
    holidays: holidays.length,
  };
}

/**
 * Format hours to readable string (e.g., "8:30h")
 */
export function formatHours(hours: number): string {
  const h = Math.floor(Math.abs(hours));
  const m = Math.round((Math.abs(hours) - h) * 60);
  const sign = hours < 0 ? '-' : '';

  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}:${m.toString().padStart(2, '0')}h`;
}

/**
 * Format difference with + or - prefix
 */
export function formatDifference(difference: number): string {
  const sign = difference >= 0 ? '+' : '';
  return sign + formatHours(difference);
}

/**
 * Get week start date based on configuration
 */
export function getWeekStart(config: WorkConfig, date: Date = new Date()): Date {
  return startOfWeek(date, {
    weekStartsOn: config.startOfWeek === 'monday' ? 1 : 0,
  });
}

/**
 * Get current week number
 */
export function getWeekNumber(date: Date = new Date()): string {
  return format(date, "'KW' II", { locale: de });
}
