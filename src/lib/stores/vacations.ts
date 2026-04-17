import { writable, get } from 'svelte/store';
import { createVacationsApi, type VacationRow, type VacationApiError } from '$lib/api/vacations';
import { auth } from './auth';

interface VacationsState {
  byYear: Record<number, VacationRow[]>;
  isLoading: boolean;
  error: VacationApiError | null;
}

function createStore() {
  const { subscribe, update, set } = writable<VacationsState>({
    byYear: {},
    isLoading: false,
    error: null,
  });

  function getApi() {
    const apiKey = auth.getApiKey();
    if (!apiKey) throw new Error('Not authenticated');
    return createVacationsApi(apiKey);
  }

  async function loadYear(year: number): Promise<void> {
    update((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const rows = await getApi().listByYear(year);
      update((s) => ({ ...s, byYear: { ...s.byYear, [year]: rows }, isLoading: false }));
    } catch (err) {
      update((s) => ({ ...s, isLoading: false, error: err as VacationApiError }));
      throw err;
    }
  }

  async function addEntry(start: string, end: string, note: string | null): Promise<VacationRow> {
    const row = await getApi().create(start, end, note);
    // Reload affected years
    const startYear = Number(row.start.slice(0, 4));
    const endYear = Number(row.end.slice(0, 4));
    for (let y = startYear; y <= endYear; y++) {
      if (get({ subscribe }).byYear[y] !== undefined) {
        await loadYear(y);
      }
    }
    return row;
  }

  async function removeEntry(id: number): Promise<void> {
    await getApi().remove(id);
    // Invalidate all cached years (simplest correct approach)
    const state = get({ subscribe });
    for (const y of Object.keys(state.byYear)) {
      await loadYear(Number(y));
    }
  }

  function reset() {
    set({ byYear: {}, isLoading: false, error: null });
  }

  return { subscribe, loadYear, addEntry, removeEntry, reset };
}

export const vacations = createStore();
