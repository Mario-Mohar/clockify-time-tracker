<script lang="ts">
  /**
   * Settings Component
   * Configure work contract settings (weekly hours, work days, federal state)
   */

  import { workConfig } from '$lib/stores/config';
  import { auth } from '$lib/stores/auth';
  import { getHoursPerDay } from '$lib/utils/calculations';
  import { STATE_NAMES, type AustrianState } from '$lib/utils/holidays';

  let weeklyHours = $workConfig.weeklyHours;
  let workDays = [...$workConfig.workDays];
  let startOfWeek = $workConfig.startOfWeek;
  let state = $workConfig.state;

  let isSaved = false;

  $: hoursPerDay = workDays.length ? weeklyHours / workDays.length : 0;

  // getDay()-Reihenfolge, aber montagsbeginnend angezeigt
  const WEEKDAYS: { value: number; label: string }[] = [
    { value: 1, label: 'Mo' }, { value: 2, label: 'Di' }, { value: 3, label: 'Mi' },
    { value: 4, label: 'Do' }, { value: 5, label: 'Fr' }, { value: 6, label: 'Sa' },
    { value: 0, label: 'So' },
  ];

  function toggleWorkDay(day: number) {
    workDays = workDays.includes(day)
      ? workDays.filter((d) => d !== day)
      : [...workDays, day].sort((a, b) => a - b);
  }

  function handleSave() {
    if (workDays.length === 0) return;
    workConfig.setConfig({
      ...$workConfig,
      weeklyHours,
      workDays,
      startOfWeek,
      state,
    });

    isSaved = true;
    setTimeout(() => {
      isSaved = false;
    }, 2000);
  }

  function handleReset() {
    if (confirm('Möchten Sie die Einstellungen auf Standardwerte zurücksetzen?')) {
      workConfig.reset();
      weeklyHours = $workConfig.weeklyHours;
      workDays = [...$workConfig.workDays];
      startOfWeek = $workConfig.startOfWeek;
      state = $workConfig.state;
    }
  }

  function handleLogout() {
    if (confirm('Möchten Sie sich wirklich abmelden? Alle Daten werden gelöscht.')) {
      auth.logout();
    }
  }
</script>

<div class="settings">
  <header class="header">
    <div class="header-content">
      <a href="/" class="back-btn">← Zurück</a>
      <h1>⚙️ Einstellungen</h1>
      <div></div>
    </div>
  </header>

  <div class="container">
    <div class="settings-card">
      <h2>Arbeitszeitmodell</h2>
      <p class="description">
        Konfigurieren Sie Ihr Arbeitsvertrag, um genaue Soll-Zeiten zu berechnen.
      </p>

      <form on:submit|preventDefault={handleSave}>
        <div class="form-group">
          <label for="weekly-hours">
            Wochenstunden
            <span class="label-hint">Sollstunden pro Woche</span>
          </label>
          <input
            id="weekly-hours"
            type="number"
            bind:value={weeklyHours}
            min="1"
            max="60"
            step="0.5"
            required
          />
        </div>

        <div class="form-group">
          <fieldset class="weekday-fieldset">
            <legend>
              Arbeitstage
              <span class="label-hint">Welche Wochentage du arbeitest</span>
            </legend>
            <div class="weekday-row">
              {#each WEEKDAYS as day (day.value)}
                <label class="weekday" class:selected={workDays.includes(day.value)}>
                  <input
                    type="checkbox"
                    checked={workDays.includes(day.value)}
                    on:change={() => toggleWorkDay(day.value)}
                  />
                  {day.label}
                </label>
              {/each}
            </div>
            {#if workDays.length === 0}
              <p class="weekday-warning">Mindestens ein Arbeitstag muss ausgewählt sein.</p>
            {/if}
          </fieldset>
        </div>

        <div class="form-group">
          <label for="start-of-week">
            Wochenbeginn
            <span class="label-hint">Erster Tag der Woche</span>
          </label>
          <select id="start-of-week" bind:value={startOfWeek}>
            <option value="monday">Montag</option>
            <option value="sunday">Sonntag</option>
          </select>
        </div>

        <div class="form-group">
          <label for="state">
            Bundesland (Österreich)
            <span class="label-hint">13 bundesweite Feiertage werden berücksichtigt</span>
          </label>
          <select id="state" bind:value={state}>
            {#each Object.entries(STATE_NAMES) as [code, name]}
              <option value={code}>{name}</option>
            {/each}
          </select>
        </div>

        <div class="calculated-info">
          <div class="info-item">
            <span class="info-label">Stunden pro Tag:</span>
            <span class="info-value">{hoursPerDay.toFixed(2)}h</span>
          </div>
        </div>

        {#if isSaved}
          <div class="success-message">
            ✅ Einstellungen gespeichert!
          </div>
        {/if}

        <div class="button-group">
          <button type="submit" class="btn-primary">
            💾 Speichern
          </button>
          <button type="button" class="btn-secondary" on:click={handleReset}>
            🔄 Zurücksetzen
          </button>
        </div>
      </form>
    </div>

    <div class="settings-card danger-zone">
      <h2>Gefahrenbereich</h2>

      <div class="danger-section">
        <div>
          <h3>Abmelden</h3>
          <p>Alle lokal gespeicherten Daten werden gelöscht.</p>
        </div>
        <button class="btn-danger" on:click={handleLogout}>
          Abmelden
        </button>
      </div>
    </div>

    <div class="info-card">
      <h3>ℹ️ Hinweise</h3>
      <ul>
        <li>Alle Einstellungen werden lokal in Ihrem Browser gespeichert</li>
        <li>Wochenenden werden automatisch von der Berechnung ausgeschlossen</li>
        <li>Feiertage werden aktuell noch nicht berücksichtigt</li>
      </ul>
    </div>
  </div>
</div>

<style>
  .weekday-fieldset {
    border: none;
    padding: 0;
    margin: 0;
  }

  .weekday-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .weekday {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.7rem;
    border: 1px solid var(--border, #ccc);
    border-radius: 6px;
    cursor: pointer;
    user-select: none;
  }

  .weekday.selected {
    border-color: var(--accent, #3b82f6);
    font-weight: 600;
  }

  .weekday-warning {
    margin: 0.5rem 0 0;
    color: var(--danger, #dc2626);
    font-size: 0.85rem;
  }

  .settings {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .header {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    padding: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }

  .header-content {
    max-width: 600px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
  }

  .back-btn {
    color: white;
    text-decoration: none;
    font-weight: 600;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    transition: all 0.2s;
  }

  .back-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: white;
    text-align: center;
  }

  .container {
    max-width: 600px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
  }

  .settings-card {
    background: white;
    border-radius: 1rem;
    padding: 2rem;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    margin-bottom: 1.5rem;
  }

  h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: #1a202c;
  }

  h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #2d3748;
  }

  .description {
    color: #718096;
    margin-bottom: 1.5rem;
    line-height: 1.5;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #2d3748;
  }

  .label-hint {
    display: block;
    font-weight: 400;
    font-size: 0.875rem;
    color: #718096;
    margin-top: 0.25rem;
  }

  input,
  select {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e2e8f0;
    border-radius: 0.5rem;
    font-size: 1rem;
    transition: all 0.2s;
    box-sizing: border-box;
  }

  input:focus,
  select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .calculated-info {
    background: #f0f4ff;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .info-label {
    font-weight: 600;
    color: #4c51bf;
  }

  .info-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: #667eea;
  }

  .success-message {
    padding: 0.75rem;
    background: #f0fff4;
    border: 1px solid #9ae6b4;
    border-radius: 0.5rem;
    color: #22543d;
    margin-bottom: 1rem;
    text-align: center;
    font-weight: 600;
  }

  .button-group {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .btn-primary {
    padding: 0.875rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
  }

  .btn-secondary {
    padding: 0.875rem;
    background: white;
    color: #667eea;
    border: 2px solid #667eea;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    background: #f0f4ff;
  }

  .danger-zone {
    border: 2px solid #feb2b2;
  }

  .danger-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .danger-section p {
    margin: 0.5rem 0 0 0;
    color: #718096;
    font-size: 0.875rem;
  }

  .btn-danger {
    padding: 0.75rem 1.5rem;
    background: #e53e3e;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .btn-danger:hover {
    background: #c53030;
    transform: translateY(-2px);
  }

  .info-card {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 1rem;
    padding: 1.5rem;
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
  }

  .info-card ul {
    margin: 0.5rem 0 0 0;
    padding-left: 1.5rem;
    color: #4a5568;
    line-height: 1.8;
  }

  @media (max-width: 480px) {
    .container {
      padding: 1rem 0.75rem;
    }

    .settings-card {
      padding: 1.5rem;
    }

    .danger-section {
      flex-direction: column;
      align-items: stretch;
    }

    .btn-danger {
      width: 100%;
    }

    h1 {
      font-size: 1.25rem;
    }

    .button-group {
      grid-template-columns: 1fr;
    }
  }
</style>
