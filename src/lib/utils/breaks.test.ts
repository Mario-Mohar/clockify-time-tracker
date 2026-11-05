import { describe, it, expect } from 'vitest';
import { calculateBreakHours } from './breaks';
import type { ClockifyTimeEntry } from '#lib/api/clockify.ts';

// [Tag im November 2026, Start h, Start min, Dauer in Minuten]
const entry = (day: number, h: number, min: number, minutes: number | null): ClockifyTimeEntry =>
  ({
    id: `${day}-${h}-${min}`,
    description: '',
    projectId: '',
    userId: '',
    workspaceId: '',
    timeInterval: {
      start: new Date(2026, 10, day, h, min).toISOString(),
      end: '',
      duration:
        minutes === null ? null : `PT${Math.floor(minutes / 60)}H${minutes % 60}M`,
    },
  }) as ClockifyTimeEntry;

describe('calculateBreakHours', () => {
  it('zieht von 7:30 bis 16:00 in einem Stück 30 Minuten ab', () => {
    expect(calculateBreakHours([entry(18, 7, 30, 510)])).toBe(0.5);
  });

  it('zieht bei genau sechs Stunden nichts ab', () => {
    expect(calculateBreakHours([entry(18, 8, 0, 360)])).toBe(0);
  });

  it('führt nie unter sechs Stunden', () => {
    expect(calculateBreakHours([entry(18, 8, 0, 370)])).toBeCloseTo(10 / 60);
  });

  it('zieht nichts ab, wenn die Pause schon als Lücke gebucht ist', () => {
    expect(calculateBreakHours([entry(18, 7, 30, 270), entry(18, 12, 30, 210)])).toBe(0);
  });

  it('ergänzt eine zu kurze Pause auf 30 Minuten', () => {
    expect(calculateBreakHours([entry(18, 8, 0, 240), entry(18, 12, 15, 240)])).toBe(0.25);
  });

  it('wertet Lücken unter zehn Minuten nicht als Pause', () => {
    expect(calculateBreakHours([entry(18, 8, 0, 240), entry(18, 12, 5, 240)])).toBe(0.5);
  });

  it('rechnet die Einträge eines Tages zusammen, auch unsortiert', () => {
    expect(calculateBreakHours([entry(18, 12, 0, 240), entry(18, 8, 0, 240)])).toBe(0.5);
  });

  it('rechnet jeden Tag für sich', () => {
    const woche = [entry(16, 7, 30, 510), entry(17, 7, 30, 510), entry(18, 8, 0, 300)];
    expect(calculateBreakHours(woche)).toBe(1);
  });

  it('ignoriert einen laufenden Timer', () => {
    expect(calculateBreakHours([entry(18, 8, 0, null)])).toBe(0);
  });
});
