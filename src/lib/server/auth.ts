import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';

interface ClockifyUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Liest den Clockify-API-Key aus dem 'X-Api-Key'-Header,
 * validiert ihn gegen Clockify und gibt die userId zurück.
 * Wirft `error(401, ...)` bei fehlendem oder ungültigem Key.
 */
export async function requireClockifyUserId(event: RequestEvent): Promise<string> {
  const apiKey = event.request.headers.get('x-api-key');
  if (!apiKey) {
    throw error(401, 'Missing X-Api-Key header');
  }

  const res = await fetch('https://api.clockify.me/api/v1/user', {
    headers: { 'X-Api-Key': apiKey },
  });

  if (!res.ok) {
    throw error(401, 'Invalid Clockify API key');
  }

  const user = (await res.json()) as ClockifyUser;
  return user.id;
}
