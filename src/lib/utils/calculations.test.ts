import { describe, it, expect } from 'vitest';
import {
  calculateRequiredWeek,
  calculateRequiredMonth,
  calculateRequiredToday,
  countWorkingDays,
  getHoursPerDay,
  type WorkConfig,
} from './calculations';

const mk = (weeklyHours: number, workDays: number[]): WorkConfig => ({
  weeklyHours,
  workDays,
  startOfWeek: 'monday',
  state: 'W',
  vacationBudget: 25,
});

const vollzeit = mk(40, [1, 2, 3, 4, 5]); // Mo–Fr
const teilzeit = mk(32, [1, 2, 3, 4]);    // Mo–Do
const zweiTage = mk(16, [3, 5]);          // Mi und Fr

// 16.–22.11.2026 ist eine Woche ohne Feiertag,
// 26.10.2026 ist der Nationalfeiertag und fällt auf einen Montag.
const normaleWoche = new Date(2026, 10, 18);
const feiertagsWoche = new Date(2026, 9, 27);

describe('getHoursPerDay', () => {
  it('teilt die Wochenstunden durch die Anzahl der Arbeitstage', () => {
    expect(getHoursPerDay(vollzeit)).toBe(8);
    expect(getHoursPerDay(teilzeit)).toBe(8);
    expect(getHoursPerDay(zweiTage)).toBe(8);
  });
});

describe('calculateRequiredWeek', () => {
  it('eine volle Woche ergibt genau die Wochenstunden', () => {
    expect(calculateRequiredWeek(vollzeit, normaleWoche)).toBe(40);
    // Vorher rechnete die Woche mit einer fest verdrahteten 5 und kam hier
    // ebenfalls auf 32 -- aber der Monat daneben auf 21 * 8 = 168.
    expect(calculateRequiredWeek(teilzeit, normaleWoche)).toBe(32);
    expect(calculateRequiredWeek(zweiTage, normaleWoche)).toBe(16);
  });

  it('ein Feiertag zieht nur ab, wenn er auf einen eigenen Arbeitstag fällt', () => {
    expect(calculateRequiredWeek(vollzeit, feiertagsWoche)).toBe(32);
    expect(calculateRequiredWeek(teilzeit, feiertagsWoche)).toBe(24);
    // Mi und Fr: der Montag war ohnehin frei.
    expect(calculateRequiredWeek(zweiTage, feiertagsWoche)).toBe(16);
  });
});

describe('calculateRequiredMonth', () => {
  it('zählt nur die eigenen Arbeitstage', () => {
    const nov = new Date(2026, 10, 15);
    expect(countWorkingDays(new Date(2026, 10, 1), new Date(2026, 10, 30), vollzeit)).toBe(21);
    expect(countWorkingDays(new Date(2026, 10, 1), new Date(2026, 10, 30), teilzeit)).toBe(17);
    expect(countWorkingDays(new Date(2026, 10, 1), new Date(2026, 10, 30), zweiTage)).toBe(8);
    expect(calculateRequiredMonth(vollzeit, nov)).toBe(168);
    expect(calculateRequiredMonth(teilzeit, nov)).toBe(136);
    expect(calculateRequiredMonth(zweiTage, nov)).toBe(64);
  });

  it('Woche und Monat widersprechen sich nicht mehr', () => {
    // Monat / Stunden pro Tag muss die Zahl der Arbeitstage ergeben, und die
    // Woche muss dieselbe Formel benutzen.
    for (const cfg of [vollzeit, teilzeit, zweiTage]) {
      const tageImMonat = calculateRequiredMonth(cfg, new Date(2026, 10, 15)) / getHoursPerDay(cfg);
      const tageInWoche = calculateRequiredWeek(cfg, normaleWoche) / getHoursPerDay(cfg);
      expect(tageImMonat).toBe(countWorkingDays(new Date(2026, 10, 1), new Date(2026, 10, 30), cfg));
      expect(tageInWoche).toBe(cfg.workDays.length);
    }
  });
});

describe('calculateRequiredToday', () => {
  const mittwoch = new Date(2026, 10, 18);
  const donnerstag = new Date(2026, 10, 19);
  const samstag = new Date(2026, 10, 21);
  const nationalfeiertag = new Date(2026, 9, 26); // Montag

  it('ein eigener Arbeitstag verlangt die Stunden pro Tag', () => {
    expect(calculateRequiredToday(zweiTage, mittwoch)).toBe(8);
    expect(calculateRequiredToday(teilzeit, donnerstag)).toBe(8);
  });

  it('ein Wochentag, an dem man nicht arbeitet, verlangt nichts', () => {
    expect(calculateRequiredToday(zweiTage, donnerstag)).toBe(0);
    expect(calculateRequiredToday(vollzeit, samstag)).toBe(0);
  });

  it('ein Feiertag verlangt nichts -- vorher wurde nur aufs Wochenende geprüft', () => {
    expect(calculateRequiredToday(vollzeit, nationalfeiertag)).toBe(0);
    expect(calculateRequiredToday(teilzeit, nationalfeiertag)).toBe(0);
  });
});
