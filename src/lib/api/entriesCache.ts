/**
 * Clockify erlaubt im Free-Plan nur 30 Anfragen pro Stunde. Darum lädt das
 * Dashboard einmal den ganzen Zeitraum und merkt sich das Ergebnis, auch über
 * einen Seitenwechsel hinweg. Der Zeitgeber läuft alle 15 Minuten, die Frist hier
 * liegt knapp darunter, damit er nicht knapp am Ablauf scheitert.
 */

import { ClockifyRateLimitError, type ClockifyClient, type ClockifyTimeEntry } from './clockify';

export const ENTRIES_FRESH_MS = 14 * 60 * 1000;
/** Clockify sagt "wait for one hour". Vorher versucht es nur noch der Knopf. */
export const RATE_LIMIT_PAUSE_MS = 60 * 60 * 1000;

export interface LoadedEntries {
  entries: ClockifyTimeEntry[];
  fetchedAt: Date;
  /** Gesetzt, wenn die Aktualisierung fehlschlug und ältere Daten geliefert werden. */
  error: string | null;
}

let cache: { key: string; entries: ClockifyTimeEntry[]; fetchedAt: number } | null = null;
let pausedUntil = 0;

export function resetEntriesCache(): void {
  cache = null;
  pausedUntil = 0;
}

/**
 * force steht für den Aktualisieren-Knopf. Wirft nur, wenn es nichts Älteres zu
 * zeigen gibt: eine fehlgeschlagene Aktualisierung soll die Zahlen nicht wegnehmen.
 */
export async function loadEntries(
  client: Pick<ClockifyClient, 'getTimeEntries'>,
  workspaceId: string,
  userId: string,
  start: string,
  end: string,
  { force = false }: { force?: boolean } = {}
): Promise<LoadedEntries> {
  const key = [workspaceId, userId, start, end].join('|');
  const known = cache?.key === key ? cache : null;
  const now = Date.now();

  if (known && !force) {
    const fetchedAt = new Date(known.fetchedAt);
    if (now - known.fetchedAt < ENTRIES_FRESH_MS) {
      return { entries: known.entries, fetchedAt, error: null };
    }
    if (now < pausedUntil) {
      return { entries: known.entries, fetchedAt, error: new ClockifyRateLimitError().message };
    }
  }

  try {
    const entries = await client.getTimeEntries(workspaceId, userId, start, end);
    cache = { key, entries, fetchedAt: now };
    pausedUntil = 0;
    return { entries, fetchedAt: new Date(now), error: null };
  } catch (err) {
    if (err instanceof ClockifyRateLimitError) pausedUntil = now + RATE_LIMIT_PAUSE_MS;
    if (!known) throw err;
    return {
      entries: known.entries,
      fetchedAt: new Date(known.fetchedAt),
      error: err instanceof Error ? err.message : 'Aktualisierung fehlgeschlagen',
    };
  }
}
