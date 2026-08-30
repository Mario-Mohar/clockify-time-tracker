import type { VacationKind } from '$lib/utils/vacation';

export interface VacationRow {
  id: number;
  start: string;
  end: string;
  note: string | null;
  fraction: number;
  kind: VacationKind;
}

export interface VacationApiError {
  status: number;
  message: string;
  conflictsWith?: VacationRow;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let conflictsWith: VacationRow | undefined;
    let message = res.statusText;
    try {
      const body = await res.json();
      if (body?.error === 'overlap') conflictsWith = body.conflictsWith;
      if (body?.message) message = body.message;
    } catch {
      // ignore body parse error
    }
    const err: VacationApiError = { status: res.status, message, conflictsWith };
    throw err;
  }
  return res.json() as Promise<T>;
}

export function createVacationsApi(apiKey: string) {
  const headers = { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' };

  return {
    async listByYear(year: number): Promise<VacationRow[]> {
      const res = await fetch(`/api/vacations?year=${year}`, { headers });
      const body = await handle<{ vacations: VacationRow[] }>(res);
      return body.vacations;
    },

    async listAll(): Promise<VacationRow[]> {
      const res = await fetch(`/api/vacations`, { headers });
      const body = await handle<{ vacations: VacationRow[] }>(res);
      return body.vacations;
    },

    async create(
      start: string,
      end: string,
      note: string | null,
      fraction: number = 1,
      kind: VacationKind = 'vacation'
    ): Promise<VacationRow> {
      const res = await fetch(`/api/vacations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ start, end, note, fraction, kind }),
      });
      const body = await handle<{ vacation: VacationRow }>(res);
      return body.vacation;
    },

    async remove(id: number): Promise<void> {
      const res = await fetch(`/api/vacations/${id}`, {
        method: 'DELETE',
        headers,
      });
      await handle<{ ok: true }>(res);
    },
  };
}
