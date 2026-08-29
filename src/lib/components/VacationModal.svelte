<script lang="ts">
  import { workConfig } from '$lib/stores/config';
  import { countWorkingDaysWithHolidays, getHolidayCount } from '$lib/utils/holidays';

  export let onSave: (start: string, end: string, note: string | null) => Promise<void>;
  export let onClose: () => void;

  let start = '';
  let end = '';
  let note = '';
  let submitting = false;
  let errorMessage = '';

  function parseDate(iso: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  $: startDate = parseDate(start);
  $: endDate = parseDate(end);
  $: dateInvalid = startDate && endDate && endDate < startDate;
  $: preview = startDate && endDate && !dateInvalid && $workConfig.workDays
    ? computePreview(startDate, endDate, $workConfig.state)
    : null;

  function computePreview(s: Date, e: Date, state: typeof $workConfig.state) {
    const workDays = $workConfig.workDays;
    const workingDays = countWorkingDaysWithHolidays(s, e, state, workDays);
    const totalDays = Math.floor((e.getTime() - s.getTime()) / 86_400_000) + 1;
    // Die eigenen Arbeitstage, noch ohne Feiertagsabzug -- nicht pauschal Mo-Fr.
    let weekdays = 0;
    const cur = new Date(s);
    while (cur <= e) {
      if (workDays.includes(cur.getDay())) weekdays++;
      cur.setDate(cur.getDate() + 1);
    }
    const holidays = getHolidayCount(s, e, state);
    return { workingDays, totalDays, weekdays, holidays };
  }

  async function handleSubmit() {
    if (!start || !end || dateInvalid || submitting) return;
    submitting = true;
    errorMessage = '';
    try {
      await onSave(start, end, note.trim() || null);
      onClose();
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string; conflictsWith?: { start: string; end: string } };
      if (e.status === 409 && e.conflictsWith) {
        errorMessage = `Überlappt mit Eintrag ${e.conflictsWith.start} – ${e.conflictsWith.end}`;
      } else {
        errorMessage = e.message || 'Speichern fehlgeschlagen';
      }
    } finally {
      submitting = false;
    }
  }
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<div class="backdrop" on:click={onClose} on:keydown={(e) => e.key === 'Escape' && onClose()} role="presentation">
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="modal" on:click|stopPropagation role="dialog" aria-label="Urlaub hinzufügen" tabindex="-1">
    <h2>Urlaub hinzufügen</h2>

    <label>
      Von
      <input type="date" bind:value={start} required />
    </label>

    <label>
      Bis
      <input type="date" bind:value={end} required />
    </label>

    {#if dateInvalid}
      <div class="error">Das Bis-Datum muss ≥ Von-Datum sein.</div>
    {:else if preview}
      <div class="preview">
        → {preview.workingDays} Arbeitstage ({preview.weekdays} Werktage,
        {#if preview.holidays > 0}davon {preview.holidays} Feiertag{preview.holidays > 1 ? 'e' : ''}{:else}keine Feiertage{/if})
      </div>
    {/if}

    <label>
      Notiz (optional)
      <textarea bind:value={note} rows="2" placeholder="z.B. Sommerurlaub"></textarea>
    </label>

    {#if errorMessage}
      <div class="error">{errorMessage}</div>
    {/if}

    <div class="actions">
      <button type="button" class="btn-secondary" on:click={onClose} disabled={submitting}>Abbrechen</button>
      <button
        type="button"
        class="btn-primary"
        on:click={handleSubmit}
        disabled={!start || !end || !!dateInvalid || submitting}
      >
        {submitting ? 'Speichere …' : 'Speichern'}
      </button>
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
    padding: 1rem;
  }

  .modal {
    background: white;
    border-radius: 1rem;
    padding: 1.5rem;
    max-width: 400px;
    width: 100%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  h2 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
  }

  label {
    display: block;
    margin-bottom: 1rem;
    color: #2d3748;
    font-size: 0.875rem;
    font-weight: 600;
  }

  input, textarea {
    display: block;
    width: 100%;
    margin-top: 0.25rem;
    padding: 0.5rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
    font: inherit;
    box-sizing: border-box;
  }

  .preview {
    margin: -0.5rem 0 1rem 0;
    color: #4a5568;
    font-size: 0.875rem;
  }

  .error {
    color: #e53e3e;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .btn-primary, .btn-secondary {
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    border: none;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-primary:disabled {
    background: #a0aec0;
    cursor: default;
  }

  .btn-primary {
    background: #667eea;
    color: white;
  }

  .btn-secondary {
    background: #e2e8f0;
    color: #2d3748;
  }
</style>
