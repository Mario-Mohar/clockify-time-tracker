<script lang="ts">
  import { workConfig } from '$lib/stores/config';
  import { summarizeVacationYear, countVacationDaysInYear } from '$lib/utils/vacation';
  import type { VacationRow } from '$lib/api/vacations';

  export let entries: VacationRow[];
  export let onDelete: (id: number) => Promise<void>;

  $: grouped = groupByYear(entries);

  function groupByYear(list: VacationRow[]): { year: number; items: VacationRow[] }[] {
    const map = new Map<number, VacationRow[]>();
    for (const e of list) {
      const startYear = Number(e.start.slice(0, 4));
      const endYear = Number(e.end.slice(0, 4));
      for (let y = startYear; y <= endYear; y++) {
        if (!map.has(y)) map.set(y, []);
        map.get(y)!.push(e);
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, items]) => ({ year, items }));
  }

  function yearSummary(year: number, items: VacationRow[]) {
    return summarizeVacationYear(items, year, $workConfig.state, new Date());
  }

  function entryDays(entry: VacationRow, year: number): number {
    return countVacationDaysInYear(entry, year, $workConfig.state);
  }

  function isPast(entry: VacationRow): boolean {
    const [y, m, d] = entry.end.split('-').map(Number);
    const endDate = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return endDate < today;
  }

  function formatDate(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  }

  async function handleDelete(entry: VacationRow) {
    if (!confirm(`Urlaub ${formatDate(entry.start)} – ${formatDate(entry.end)} wirklich löschen?`)) return;
    await onDelete(entry.id);
  }
</script>

{#if grouped.length === 0}
  <div class="empty">
    <div class="empty-icon">🏖️</div>
    <div class="empty-text">Noch keine Urlaubseinträge.</div>
    <div class="empty-hint">Leg deinen ersten Urlaub mit „+ Urlaub hinzufügen" an.</div>
  </div>
{:else}
  {#each grouped as group (group.year)}
    {@const s = yearSummary(group.year, group.items)}
    <section class="year-group">
      <header class="year-header">
        <span class="year">{group.year}</span>
        <span class="summary">
          {s.taken} genommen{s.planned > 0 ? ` · ${s.planned} geplant` : ''}
        </span>
      </header>
      <ul class="entries">
        {#each group.items as entry (entry.id)}
          {@const days = entryDays(entry, group.year)}
          {@const past = isPast(entry)}
          <li class="entry" class:past>
            <div class="entry-main">
              <div class="dates">
                {formatDate(entry.start)} – {formatDate(entry.end)}
              </div>
              {#if entry.note}
                <div class="note">{entry.note}</div>
              {/if}
            </div>
            <span class="badge" class:past>
              {days} {days === 1 ? 'Tag' : 'Tage'}
            </span>
            <button type="button" class="delete" on:click={() => handleDelete(entry)} aria-label="Löschen">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                <path d="M10 11v6"></path>
                <path d="M14 11v6"></path>
                <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {/each}
{/if}

<style>
  .empty {
    text-align: center;
    padding: 2rem 1rem;
  }

  .empty-icon {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .empty-text {
    color: #2d3748;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .empty-hint {
    color: #a0aec0;
    font-size: 0.875rem;
  }

  .year-group {
    margin-bottom: 1.75rem;
  }

  .year-group:last-child {
    margin-bottom: 0;
  }

  .year-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding-bottom: 0.5rem;
    margin-bottom: 0.5rem;
    border-bottom: 2px solid #667eea;
  }

  .year {
    font-size: 1.125rem;
    font-weight: 700;
    color: #2d3748;
    letter-spacing: 0.02em;
  }

  .summary {
    font-size: 0.8125rem;
    color: #718096;
    font-weight: 500;
  }

  .entries {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .entry {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
    transition: background 0.15s;
  }

  .entry:hover {
    background: #f7fafc;
  }

  .entry.past {
    opacity: 0.7;
  }

  .entry-main {
    min-width: 0;
  }

  .dates {
    font-weight: 600;
    color: #2d3748;
    font-variant-numeric: tabular-nums;
  }

  .note {
    font-size: 0.8125rem;
    color: #718096;
    margin-top: 0.125rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .badge {
    background: #ebf4ff;
    color: #667eea;
    font-size: 0.8125rem;
    font-weight: 600;
    padding: 0.25rem 0.625rem;
    border-radius: 999px;
    white-space: nowrap;
  }

  .badge.past {
    background: #edf2f7;
    color: #718096;
  }

  .delete {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border: none;
    border-radius: 0.5rem;
    background: transparent;
    color: #a0aec0;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .delete:hover {
    background: #fed7d7;
    color: #e53e3e;
  }

  .delete:active {
    background: #feb2b2;
  }

  .delete:focus-visible {
    outline: 2px solid #667eea;
    outline-offset: 2px;
  }
</style>
