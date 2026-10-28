import { error, type RequestHandler } from '@sveltejs/kit';
import { requireClockifyUserId } from '#lib/server/auth.ts';
import { remove } from '#lib/server/vacations.ts';

export const DELETE: RequestHandler = async (event) => {
  const userId = await requireClockifyUserId(event);
  const id = Number(event.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw error(400, 'Invalid id');
  }

  const deleted = await remove(userId, id);
  if (!deleted) {
    throw error(404, 'Vacation not found');
  }
  return Response.json({ ok: true });
};
