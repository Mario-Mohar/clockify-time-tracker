<script lang="ts">
  import { workConfig } from '$lib/stores/config';
  import { summarizeVacationYear } from '$lib/utils/vacation';
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
  <div class="empty">Noch keine Urlaubseinträge.</div>
{:else}
  {#each grouped as group (group.year)}
    {@const s = yearSummary(group.year, group.items)}
    <section class="year-group">
      <header class="year-header">
        <span class="year">{group.year}</span>
        <span class="summary">
          {s.taken} Tage genommen{s.planned > 0 ? `, ${s.planned} geplant` : ''}
        </span>
      </header>
      <ul class="entries">
        {#each group.items as entry (entry.id)}
          <li class="entry">
            <div class="dates">
              {formatDate(entry.start)} – {formatDate(entry.end)}
            </div>
            {#if entry.note}
              <div class="note">{entry.note}</div>
            {/if}
            <button type="button" class="delete" on:click={() => handleDelete(entry)} aria-label="Löschen">🗑️</button>
          </li>
        {/each}
      </ul>
    </section>
  {/each}
{/if}

<style>
  .empty {
    color: #a0aec0;
    padding: 2rem 0;
    text-align: center;
  }

  .year-group {
    margin-bottom: 1.5rem;
  }

  .year-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .year {
    font-size: 1.125rem;
    font-weight: 700;
    color: #2d3748;
  }

  .summary {
    font-size: 0.875rem;
    color: #718096;
  }

  .entries {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .entry {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    column-gap: 0.5rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid #f7fafc;
  }

  .dates {
    font-weight: 600;
    color: #2d3748;
  }

  .note {
    grid-column: 1;
    grid-row: 2;
    font-size: 0.875rem;
    color: #718096;
  }

  .delete {
    grid-row: 1 / span 2;
    align-self: center;
    background: #f7fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 1rem;
    padding: 0.5rem 0.75rem;
    color: #e53e3e;
    min-width: 2.5rem;
    min-height: 2.5rem;
    transition: background 0.15s, border-color 0.15s;
  }

  .delete:hover {
    background: #fed7d7;
    border-color: #e53e3e;
  }

  .delete:active {
    background: #feb2b2;
  }
</style>
