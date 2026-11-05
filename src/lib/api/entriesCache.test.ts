import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClockifyRateLimitError, type ClockifyClient, type ClockifyTimeEntry } from './clockify';
import { ENTRIES_FRESH_MS, RATE_LIMIT_PAUSE_MS, loadEntries, resetEntriesCache } from './entriesCache';

const entries = [{ id: 'e1' }] as ClockifyTimeEntry[];
const load = (getTimeEntries: ReturnType<typeof vi.fn>, force = false, userId = 'u1') =>
  loadEntries({ getTimeEntries: getTimeEntries as unknown as ClockifyClient['getTimeEntries'] }, 'w1', userId, 'a', 'b', { force });

beforeEach(() => {
  resetEntriesCache();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('loadEntries', () => {
  it('fragt innerhalb der Frist nicht noch einmal bei Clockify an', async () => {
    const api = vi.fn().mockResolvedValue(entries);
    await load(api);
    vi.advanceTimersByTime(ENTRIES_FRESH_MS - 1);
    expect((await load(api)).entries).toBe(entries);
    expect(api).toHaveBeenCalledTimes(1);
  });

  it('lädt nach Ablauf der Frist neu', async () => {
    const api = vi.fn().mockResolvedValue(entries);
    await load(api);
    vi.advanceTimersByTime(ENTRIES_FRESH_MS);
    await load(api);
    expect(api).toHaveBeenCalledTimes(2);
  });

  it('der Knopf lädt immer neu', async () => {
    const api = vi.fn().mockResolvedValue(entries);
    await load(api);
    await load(api, true);
    expect(api).toHaveBeenCalledTimes(2);
  });

  it('teilt nichts zwischen zwei Benutzern', async () => {
    const api = vi.fn().mockResolvedValue(entries);
    await load(api, false, 'u1');
    await load(api, false, 'u2');
    expect(api).toHaveBeenCalledTimes(2);
  });

  it('behält bei einem Fehler die alten Daten und nennt den Fehler', async () => {
    const api = vi.fn().mockResolvedValueOnce(entries).mockRejectedValueOnce(new Error('offline'));
    const first = await load(api);
    const second = await load(api, true);
    expect(second.entries).toBe(entries);
    expect(second.error).toBe('offline');
    expect(second.fetchedAt).toEqual(first.fetchedAt);
  });

  it('wirft, wenn es noch keine Daten gibt', async () => {
    const api = vi.fn().mockRejectedValue(new Error('offline'));
    await expect(load(api)).rejects.toThrow('offline');
  });

  it('pausiert nach einem 429 eine Stunde, außer beim Knopf', async () => {
    const api = vi.fn().mockResolvedValueOnce(entries).mockRejectedValueOnce(new ClockifyRateLimitError());
    await load(api);
    vi.advanceTimersByTime(ENTRIES_FRESH_MS);
    expect((await load(api)).error).toContain('Limit');
    expect(api).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(ENTRIES_FRESH_MS);
    expect((await load(api)).error).toContain('Limit');
    expect(api).toHaveBeenCalledTimes(2);

    api.mockResolvedValue(entries);
    expect((await load(api, true)).error).toBeNull();
    expect(api).toHaveBeenCalledTimes(3);
  });

  it('versucht es nach der Pause von selbst wieder', async () => {
    const api = vi.fn().mockResolvedValueOnce(entries).mockRejectedValueOnce(new ClockifyRateLimitError());
    await load(api);
    vi.advanceTimersByTime(ENTRIES_FRESH_MS);
    await load(api);
    vi.advanceTimersByTime(RATE_LIMIT_PAUSE_MS);
    api.mockResolvedValue(entries);
    expect((await load(api)).error).toBeNull();
  });
});
