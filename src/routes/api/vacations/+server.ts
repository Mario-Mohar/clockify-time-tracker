import { json, error, type RequestHandler } from '@sveltejs/kit';
import { requireClockifyUserId } from '$lib/server/auth';
import { listByYear, listAll, create, findOverlap } from '$lib/server/vacations';

export const GET: RequestHandler = async (event) => {
  const userId = await requireClockifyUserId(event);
  const yearParam = event.url.searchParams.get('year');

  if (yearParam) {
    const year = Number(yearParam);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw error(400, 'Invalid year parameter');
    }
    const rows = await listByYear(userId, year);
    return json({ vacations: rows });
  }

  const rows = await listAll(userId);
  return json({ vacations: rows });
};

export const POST: RequestHandler = async (event) => {
  const userId = await requireClockifyUserId(event);
  const body = await event.request.json().catch(() => null);

  if (!body || typeof body !== 'object') {
    throw error(400, 'Invalid JSON body');
  }

  const { start, end, note, fraction, kind } = body as {
    start?: unknown;
    end?: unknown;
    note?: unknown;
    fraction?: unknown;
    kind?: unknown;
  };

  if (typeof start !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    throw error(400, 'start must be an ISO date (YYYY-MM-DD)');
  }
  if (typeof end !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw error(400, 'end must be an ISO date (YYYY-MM-DD)');
  }
  if (end < start) {
    throw error(400, 'end must be >= start');
  }
  const noteStr = typeof note === 'string' && note.trim().length > 0 ? note.trim() : null;

  if (fraction !== undefined && fraction !== 0.5 && fraction !== 1) {
    throw error(400, 'fraction must be 0.5 or 1');
  }
  // Ein halber Tag über einen Zeitraum ergibt keinen Sinn. Das Modal bietet
  // ihn gar nicht erst an; hier steht dieselbe Regel für alles, was nicht
  // durch das Modal kommt.
  if (fraction === 0.5 && start !== end) {
    throw error(400, 'fraction 0.5 is only valid for a single day');
  }
  if (kind !== undefined && kind !== 'vacation' && kind !== 'sick') {
    throw error(400, "kind must be 'vacation' or 'sick'");
  }

  const fractionValue = fraction === 0.5 ? 0.5 : 1;
  const kindValue = kind === 'sick' ? 'sick' : 'vacation';

  // Urlaub und Krankenstand am selben Tag ergibt genauso wenig Sinn wie zwei
  // Urlaube, die Prüfung bleibt also über alle Einträge -- aber die Antwort
  // sagt jetzt, womit es sich überschneidet.
  const conflict = await findOverlap(userId, start, end);
  if (conflict) {
    return json(
      { error: 'overlap', conflictsWith: conflict },
      { status: 409 }
    );
  }

  const row = await create(userId, start, end, noteStr, fractionValue, kindValue);
  return json({ vacation: row }, { status: 201 });
};
