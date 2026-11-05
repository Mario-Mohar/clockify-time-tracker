import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { requireClockifyUserId, resetKnownKeys } from './auth';

const event = (key: string | null) =>
  ({ request: new Request('http://x/', { headers: key ? { 'x-api-key': key } : {} }) }) as RequestEvent;

const respond = (status: number, body: unknown = {}) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  resetKnownKeys();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('requireClockifyUserId', () => {
  it('fragt Clockify für denselben Key nur einmal in 15 Minuten', async () => {
    const f = respond(200, { id: 'u1' });
    vi.stubGlobal('fetch', f);
    expect(await requireClockifyUserId(event('k'))).toBe('u1');
    vi.advanceTimersByTime(15 * 60 * 1000 - 1);
    expect(await requireClockifyUserId(event('k'))).toBe('u1');
    expect(f).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    await requireClockifyUserId(event('k'));
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('merkt sich ein Ergebnis nicht für einen anderen Key', async () => {
    const f = respond(200, { id: 'u1' });
    vi.stubGlobal('fetch', f);
    await requireClockifyUserId(event('a'));
    await requireClockifyUserId(event('b'));
    expect(f).toHaveBeenCalledTimes(2);
  });

  it.each([
    [401, 401],
    [403, 401],
    [429, 429],
    [500, 502],
  ])('Clockify %i ergibt %i und wird nicht gemerkt', async (from, to) => {
    const f = respond(from);
    vi.stubGlobal('fetch', f);
    await expect(requireClockifyUserId(event('k'))).rejects.toMatchObject({ status: to });
    await expect(requireClockifyUserId(event('k'))).rejects.toMatchObject({ status: to });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('ohne Key gibt es 401 ohne Anfrage', async () => {
    const f = respond(200);
    vi.stubGlobal('fetch', f);
    await expect(requireClockifyUserId(event(null))).rejects.toMatchObject({ status: 401 });
    expect(f).not.toHaveBeenCalled();
  });
});
