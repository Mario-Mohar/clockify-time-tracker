import { createHash } from 'node:crypto';
import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';

interface ClockifyUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Jede Prüfung kostet eine der 30 Anfragen pro Stunde, die Clockify im Free-Plan
 * erlaubt. Darum wird das Ergebnis kurz gemerkt, nur im Speicher und nur unter dem
 * Hash des Keys. Ein bei Clockify widerrufener Key gilt hier also bis zu 15 Minuten
 * weiter, und zwar nur für die eigenen Urlaubsdaten.
 */
const USER_ID_TTL_MS = 15 * 60 * 1000;
const knownKeys = new Map<string, { userId: string; expires: number }>();

/** Nur für Tests. */
export function resetKnownKeys(): void {
  knownKeys.clear();
}

/**
 * Liest den Clockify-API-Key aus dem 'X-Api-Key'-Header,
 * validiert ihn gegen Clockify und gibt die userId zurück.
 * Wirft 401 bei fehlendem oder ungültigem Key. Dass Clockify gerade nicht antwortet
 * oder das Limit erreicht ist, sagt nichts über den Key aus und ist kein 401.
 */
export async function requireClockifyUserId(event: RequestEvent): Promise<string> {
  const apiKey = event.request.headers.get('x-api-key');
  if (!apiKey) {
    throw error(401, 'Missing X-Api-Key header');
  }

  const hash = createHash('sha256').update(apiKey).digest('hex');
  const now = Date.now();
  const known = knownKeys.get(hash);
  if (known && known.expires > now) return known.userId;

  const res = await fetch('https://api.clockify.me/api/v1/user', {
    headers: { 'X-Api-Key': apiKey },
  });

  if (res.status === 429) {
    throw error(429, 'Clockify-Limit erreicht, bitte später erneut versuchen');
  }
  if (res.status === 401 || res.status === 403) {
    throw error(401, 'Invalid Clockify API key');
  }
  if (!res.ok) {
    throw error(502, 'Clockify nicht erreichbar');
  }

  const user = (await res.json()) as ClockifyUser;
  for (const [k, v] of knownKeys) if (v.expires <= now) knownKeys.delete(k);
  knownKeys.set(hash, { userId: user.id, expires: now + USER_ID_TTL_MS });
  return user.id;
}
