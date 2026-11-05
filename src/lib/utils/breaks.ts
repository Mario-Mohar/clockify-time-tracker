/**
 * Gesetzliche Ruhepause nach § 11 AZG: Wer an einem Tag mehr als sechs Stunden
 * arbeitet, muss mindestens 30 Minuten Pause machen. Wer in Clockify den Tag in
 * einem Stück bucht (7:30 bis 16:00), hat diese Pause mitgebucht, sie zählt aber
 * nicht als Arbeitszeit.
 */

import type { ClockifyTimeEntry } from '#lib/api/clockify.ts';

const SIX_HOURS = 6 * 3600;
const REQUIRED_BREAK = 30 * 60;
/** Das AZG erlaubt die Teilung in 2 x 15 oder 3 x 10 Minuten, kürzeres zählt nicht. */
const MIN_BREAK_PART = 10 * 60;

function parseDuration(duration: string | null | undefined): number {
  const m = duration?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

/**
 * Wie viel Pause ein Tag zusätzlich abgezogen bekommt, in Sekunden.
 * Lücken zwischen den Einträgen sind bereits genommene Pause und mindern den
 * Abzug. Der Abzug führt nie unter sechs Stunden: bei 6:10 h Anwesenheit bleiben
 * 6 h Arbeit, und für genau 6 h ist keine Pause vorgeschrieben.
 */
function breakForDay(entries: ClockifyTimeEntry[]): number {
  const worked = entries.reduce((sum, e) => sum + parseDuration(e.timeInterval.duration), 0);
  if (worked <= SIX_HOURS) return 0;

  const sorted = [...entries].sort(
    (a, b) => Date.parse(a.timeInterval.start) - Date.parse(b.timeInterval.start)
  );
  let taken = 0;
  let lastEnd = Date.parse(sorted[0].timeInterval.start);
  for (const entry of sorted) {
    const start = Date.parse(entry.timeInterval.start);
    const gap = (start - lastEnd) / 1000;
    if (gap >= MIN_BREAK_PART) taken += gap;
    lastEnd = Math.max(lastEnd, start + parseDuration(entry.timeInterval.duration) * 1000);
  }

  return Math.min(Math.max(0, REQUIRED_BREAK - taken), worked - SIX_HOURS);
}

/**
 * Summe der abzuziehenden Pausen in Stunden, Tag für Tag gerechnet.
 * Ein Eintrag gehört zu dem lokalen Tag, an dem er beginnt. Laufende Timer haben
 * noch keine Dauer und zählen nicht, wie auch beim Ist.
 */
export function calculateBreakHours(entries: ClockifyTimeEntry[]): number {
  const days = new Map<string, ClockifyTimeEntry[]>();
  for (const entry of entries) {
    if (!entry.timeInterval.duration) continue;
    const d = new Date(entry.timeInterval.start);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    days.set(key, [...(days.get(key) ?? []), entry]);
  }

  let seconds = 0;
  for (const dayEntries of days.values()) seconds += breakForDay(dayEntries);
  return seconds / 3600;
}
