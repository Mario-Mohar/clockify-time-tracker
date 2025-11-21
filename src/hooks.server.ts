/**
 * SvelteKit Server Hooks
 * Handle server-side logic and error handling
 */

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  return response;
};
