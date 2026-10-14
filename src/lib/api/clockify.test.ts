import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  ClockifyClient,
  pickWorkspace,
  TIME_ENTRIES_MAX_PAGES,
  TIME_ENTRIES_PAGE_SIZE,
  type ClockifyTimeEntry,
} from './clockify';

// Nur gefälschtes fetch, nie die echte API.
const API_KEY = 'test-key';

function entry(n: number): ClockifyTimeEntry {
  return {
    id: `e${n}`,
    description: '',
    timeInterval: { start: '', end: '', duration: 'PT1H' },
    projectId: 'p1',
    userId: 'u1',
    workspaceId: 'w1',
  };
}

function page(size: number, offset = 0): ClockifyTimeEntry[] {
  return Array.from({ length: size }, (_, i) => entry(offset + i));
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockFetch(handler: (url: URL) => unknown) {
  const fn = vi.fn(async (input: RequestInfo | URL) => jsonResponse(handler(new URL(String(input)))));
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getTimeEntries (#33)', () => {
  const client = new ClockifyClient(API_KEY);
  const load = () => client.getTimeEntries('w1', 'u1', '2026-01-01T00:00:00Z', '2026-12-31T23:59:59Z');

  it('lädt Seite für Seite, bis eine Seite nicht mehr voll ist', async () => {
    const fetchMock = mockFetch((url) => {
      const p = Number(url.searchParams.get('page'));
      if (p === 1) return page(TIME_ENTRIES_PAGE_SIZE);
      if (p === 2) return page(TIME_ENTRIES_PAGE_SIZE, TIME_ENTRIES_PAGE_SIZE);
      return page(5, 2 * TIME_ENTRIES_PAGE_SIZE);
    });

    const entries = await load();

    expect(entries).toHaveLength(2 * TIME_ENTRIES_PAGE_SIZE + 5);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const urls = fetchMock.mock.calls.map(([u]) => new URL(String(u)));
    expect(urls.map((u) => u.searchParams.get('page'))).toEqual(['1', '2', '3']);
    expect(urls.every((u) => u.searchParams.get('page-size') === String(TIME_ENTRIES_PAGE_SIZE))).toBe(true);
    expect(urls[0].pathname).toBe('/api/v1/workspaces/w1/user/u1/time-entries');
  });

  it('hört nach einer leeren Seite auf', async () => {
    const fetchMock = mockFetch((url) =>
      url.searchParams.get('page') === '1' ? page(TIME_ENTRIES_PAGE_SIZE) : []
    );

    expect(await load()).toHaveLength(TIME_ENTRIES_PAGE_SIZE);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('braucht bei wenigen Einträgen nur eine Abfrage', async () => {
    const fetchMock = mockFetch(() => page(3));
    expect(await load()).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('bricht nach der Obergrenze mit einem Fehler ab statt endlos zu laden', async () => {
    const fetchMock = mockFetch(() => page(TIME_ENTRIES_PAGE_SIZE));
    await expect(load()).rejects.toThrow(/Zeiteinträge/);
    expect(fetchMock).toHaveBeenCalledTimes(TIME_ENTRIES_MAX_PAGES);
  });

  it('summiert die Stunden über alle Seiten', async () => {
    mockFetch((url) =>
      url.searchParams.get('page') === '1' ? page(TIME_ENTRIES_PAGE_SIZE) : page(10)
    );
    const summary = await client.getYearEntries('w1', 'u1', 2026);
    expect(summary.totalHours).toBe(TIME_ENTRIES_PAGE_SIZE + 10);
  });
});

describe('pickWorkspace (#34)', () => {
  const workspaces = [
    { id: 'w1', name: 'Erster' },
    { id: 'w2', name: 'Aktiver' },
    { id: 'w3', name: 'Standard' },
  ];

  it('nimmt den aktiven Workspace, nicht den ersten', () => {
    expect(pickWorkspace({ activeWorkspace: 'w2', defaultWorkspace: 'w3' }, workspaces)?.id).toBe('w2');
  });

  it('fällt auf den Standard-Workspace zurück', () => {
    expect(pickWorkspace({ activeWorkspace: 'weg', defaultWorkspace: 'w3' }, workspaces)?.id).toBe('w3');
  });

  it('nimmt den ersten nur, wenn sonst nichts passt', () => {
    expect(pickWorkspace({ activeWorkspace: 'weg' }, workspaces)?.id).toBe('w1');
  });

  it('liefert undefined ohne Workspaces', () => {
    expect(pickWorkspace({ activeWorkspace: 'w1' }, [])).toBeUndefined();
  });
});
