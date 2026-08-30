import { countWorkingDaysWithHolidays, DEFAULT_WORK_DAYS } from './holidays';
import type { AustrianState } from './holidays';

/**
 * Urlaub und Krankenstand liegen in derselben Tabelle und verhalten sich für
 * die Sollstundenrechnung gleich: der Tag zählt als gearbeitet, sonst erschiene
 * jede Krankenwoche als Minusstunden. Getrennt sind sie nur in der Bilanz --
 * Krankenstand geht nicht gegen das Urlaubskontingent.
 */
export type VacationKind = 'vacation' | 'sick';

export interface VacationEntry {
  id?: number;
  start: string; // ISO date YYYY-MM-DD
  end: string;   // ISO date YYYY-MM-DD
  note?: string | null;
  /** 0.5 oder 1. Fehlt = 1, damit alte Einträge ganze Tage bleiben. */
  fraction?: number;
  /** Fehlt = 'vacation', aus demselben Grund. */
  kind?: VacationKind;
}

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Der Bruchteil eines Eintrags, auf das Sinnvolle eingegrenzt.
 *
 * Ein halber Tag über einen Zeitraum ergibt keinen Sinn, deshalb gilt 0.5 nur
 * bei Einträgen, die auf einem Tag anfangen und enden. Die Prüfung steht hier
 * und nicht nur im Modal: die Zeile kann auch von Hand in der Datenbank
 * stehen, und dann darf sie keinen zweiwöchigen Urlaub halbieren.
 */
export function entryFraction(entry: Pick<VacationEntry, 'start' | 'end' | 'fraction'>): number {
  if (entry.fraction !== 0.5) return 1;
  return entry.start === entry.end ? 0.5 : 1;
}

export function entryKind(entry: Pick<VacationEntry, 'kind'>): VacationKind {
  return entry.kind === 'sick' ? 'sick' : 'vacation';
}

/**
 * Tage als Text, mit Komma und ohne Nachkommastelle, wo keine nötig ist.
 *
 * Aus 12 wird "12", aus 12.5 wird "12,5". Das Runden ist Absicht: gerechnet
 * wird in Vielfachen von 0.5, das ist binär exakt -- aber sobald jemand eine
 * andere Zahl in die Spalte schreibt, soll hier keine 12.500000000000002
 * herauskommen.
 */
export function formatDays(days: number): string {
  const rounded = Math.round(days * 2) / 2;
  return rounded.toLocaleString('de-AT', { maximumFractionDigits: 1 });
}

export function countVacationDaysInYear(
  entry: Pick<VacationEntry, 'start' | 'end' | 'fraction'>,
  year: number,
  state: AustrianState,
  workDays: number[] = DEFAULT_WORK_DAYS
): number {
  const start = parseDate(entry.start);
  const end = parseDate(entry.end);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  const rangeStart = start > yearStart ? start : yearStart;
  const rangeEnd = end < yearEnd ? end : yearEnd;

  if (rangeStart > rangeEnd) return 0;

  const days = countWorkingDaysWithHolidays(rangeStart, rangeEnd, state, workDays);
  return days * entryFraction(entry);
}

export interface VacationSummary {
  /** Urlaub, zählt gegen das Kontingent. */
  taken: number;
  planned: number;
  total: number;
  /** Krankenstand, wird nur gezählt und nicht begrenzt. */
  sickTaken: number;
  sickPlanned: number;
  sickTotal: number;
}

export function summarizeVacationYear(
  entries: Pick<VacationEntry, 'start' | 'end' | 'fraction' | 'kind'>[],
  year: number,
  state: AustrianState,
  today: Date,
  workDays: number[] = DEFAULT_WORK_DAYS
): VacationSummary {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  let taken = 0;
  let planned = 0;
  let sickTaken = 0;
  let sickPlanned = 0;

  for (const entry of entries) {
    const start = parseDate(entry.start);
    const end = parseDate(entry.end);
    const rangeStart = start > yearStart ? start : yearStart;
    const rangeEnd = end < yearEnd ? end : yearEnd;
    if (rangeStart > rangeEnd) continue;

    const fraction = entryFraction(entry);
    const isSick = entryKind(entry) === 'sick';

    // Split the clipped range at today.
    const takenEnd = rangeEnd <= today ? rangeEnd : today;
    const plannedStart = new Date(today);
    plannedStart.setDate(plannedStart.getDate() + 1);

    if (rangeStart <= takenEnd && rangeStart <= today) {
      const days = countWorkingDaysWithHolidays(rangeStart, takenEnd, state, workDays) * fraction;
      if (isSick) sickTaken += days;
      else taken += days;
    }
    if (plannedStart <= rangeEnd) {
      const pStart = rangeStart > plannedStart ? rangeStart : plannedStart;
      const days = countWorkingDaysWithHolidays(pStart, rangeEnd, state, workDays) * fraction;
      if (isSick) sickPlanned += days;
      else planned += days;
    }
  }

  return {
    taken,
    planned,
    total: taken + planned,
    sickTaken,
    sickPlanned,
    sickTotal: sickTaken + sickPlanned,
  };
}

/**
 * Stunden, die im Zeitraum nicht gearbeitet werden mussten.
 *
 * Urlaub und Krankenstand zählen hier gleich: beides sind Tage, an denen
 * nichts zu leisten war.
 */
export function vacationHoursInRange(
  entries: Pick<VacationEntry, 'start' | 'end' | 'fraction'>[],
  rangeStart: Date,
  rangeEnd: Date,
  state: AustrianState,
  hoursPerDay: number,
  workDays: number[] = DEFAULT_WORK_DAYS
): number {
  let total = 0;
  for (const entry of entries) {
    const start = parseDate(entry.start);
    const end = parseDate(entry.end);
    const clipStart = start > rangeStart ? start : rangeStart;
    const clipEnd = end < rangeEnd ? end : rangeEnd;
    if (clipStart > clipEnd) continue;
    total +=
      countWorkingDaysWithHolidays(clipStart, clipEnd, state, workDays) * entryFraction(entry);
  }
  return total * hoursPerDay;
}
