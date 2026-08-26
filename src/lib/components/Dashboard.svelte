<script lang="ts">
  /**
   * Dashboard Component
   * Main view showing time tracking comparison for Day, Week, Month, Year
   */

  import { onMount } from 'svelte';
  import { auth, currentUser, currentWorkspace } from '$lib/stores/auth';
  import { workConfig } from '$lib/stores/config';
  import { createClockifyClient } from '$lib/api/clockify';
  import type { TimeEntrySummary } from '$lib/api/clockify';
  import {
    compareTodayHours,
    compareWeekHours,
    compareMonthHours,
    compareYearHours,
    formatHours,
    formatDifference,
    getWeekStart,
  } from '$lib/utils/calculations';
  import type { TimeComparison } from '$lib/utils/calculations';
  import { goto } from '$app/navigation';
  import { vacations } from '$lib/stores/vacations';
  import VacationTile from './VacationTile.svelte';
  import { summarizeVacationYear, vacationHoursInRange, type VacationSummary } from '$lib/utils/vacation';
  import { startOfMonth, endOfMonth, startOfYear, endOfYear, endOfWeek } from 'date-fns';

  type Period = 'day' | 'week' | 'month' | 'year';

  let selectedPeriod: Period = 'day';
  let isLoading = false;
  let error: string | null = null;

  let todayData: TimeComparison | null = null;
  let weekData: TimeComparison | null = null;
  let monthData: TimeComparison | null = null;
  let yearData: TimeComparison | null = null;

  let lastUpdated: Date | null = null;
  let vacationError: string | null = null;
  let vacationSummary: VacationSummary | null = null;

  $: currentData = {
    day: todayData,
    week: weekData,
    month: monthData,
    year: yearData,
  }[selectedPeriod];

  /**
   * Fetch time data from Clockify and vacation store
   */
  async function fetchTimeData() {
    if (!$auth.apiKey || !$currentUser || !$currentWorkspace) return;

    isLoading = true;
    error = null;
    vacationError = null;

    const userId = $currentUser.id;
    const workspaceId = $currentWorkspace.id;
    const currentYear = new Date().getFullYear();

    // Load Clockify — errors here must not kill the vacation load
    const clockifyPromise = (async () => {
      const client = createClockifyClient($auth.apiKey!);
      return Promise.all([
        client.getTodayEntries(workspaceId, userId),
        client.getWeekEntries(workspaceId, userId, getWeekStart($workConfig)),
        client.getMonthEntries(workspaceId, userId, new Date().getFullYear(), new Date().getMonth()),
        client.getYearEntries(workspaceId, userId, new Date().getFullYear()),
      ]);
    })();

    // Load vacations — errors here must not kill Clockify display
    const vacationPromise = vacations
      .loadYear(currentYear)
      .catch((err) => {
        vacationError = err?.message || 'Urlaubsdaten nicht verfügbar';
      });

    const [clockifyResult] = await Promise.allSettled([clockifyPromise, vacationPromise]);

    // Build comparisons from whichever data is available.
    const entries = $vacations.byYear[currentYear] ?? [];
    const hoursPerDay = $workConfig.weeklyHours / $workConfig.workDaysPerWeek;
    const now = new Date();
    const weekStart = getWeekStart($workConfig);
    const weekEnd = endOfWeek(now, { weekStartsOn: $workConfig.startOfWeek === 'monday' ? 1 : 0 });

    const vacToday = vacationHoursInRange(entries, now, now, $workConfig.state, hoursPerDay);
    const vacWeek = vacationHoursInRange(entries, weekStart, weekEnd, $workConfig.state, hoursPerDay);
    const vacMonth = vacationHoursInRange(entries, startOfMonth(now), endOfMonth(now), $workConfig.state, hoursPerDay);
    const vacYear = vacationHoursInRange(entries, startOfYear(now), endOfYear(now), $workConfig.state, hoursPerDay);

    if (clockifyResult.status === 'fulfilled') {
      const [today, week, month, year] = clockifyResult.value;
      todayData = compareTodayHours(today.totalHours, vacToday, $workConfig);
      weekData = compareWeekHours(week.totalHours, vacWeek, $workConfig);
      monthData = compareMonthHours(month.totalHours, vacMonth, $workConfig);
      yearData = compareYearHours(year.totalHours, vacYear, $workConfig);
      lastUpdated = new Date();
    } else {
      error = clockifyResult.reason instanceof Error
        ? clockifyResult.reason.message
        : 'Fehler beim Laden der Clockify-Daten';
    }

    // Vacation summary for the tile
    vacationSummary = summarizeVacationYear(entries, currentYear, $workConfig.state, now);

    isLoading = false;
  }

  /**
   * Handle logout
   */
  function handleLogout() {
    if (confirm('Möchten Sie sich wirklich abmelden?')) {
      auth.logout();
    }
  }

  /**
   * Format last updated time
   */
  function formatLastUpdated(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  onMount(() => {
    fetchTimeData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchTimeData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  });
</script>

<div class="dashboard">
  <header class="header">
    <div class="header-content">
      <h1>⏱️ Zeiterfassung</h1>
      <div class="header-info">
        <span class="user-name">{$currentUser?.name || 'User'}</span>
        <button class="btn-icon" on:click={handleLogout} title="Abmelden">
          🚪
        </button>
      </div>
    </div>
  </header>

  <div class="container">
    <!-- Period Tabs -->
    <div class="tabs">
      <button
        class="tab"
        class:active={selectedPeriod === 'day'}
        on:click={() => (selectedPeriod = 'day')}
      >
        Tag
      </button>
      <button
        class="tab"
        class:active={selectedPeriod === 'week'}
        on:click={() => (selectedPeriod = 'week')}
      >
        Woche
      </button>
      <button
        class="tab"
        class:active={selectedPeriod === 'month'}
        on:click={() => (selectedPeriod = 'month')}
      >
        Monat
      </button>
      <button
        class="tab"
        class:active={selectedPeriod === 'year'}
        on:click={() => (selectedPeriod = 'year')}
      >
        Jahr
      </button>
    </div>

    <!-- Vacation Tile -->
    <VacationTile
      year={new Date().getFullYear()}
      summary={vacationSummary}
      budget={$workConfig.vacationBudget}
      isLoading={$vacations.isLoading}
      error={vacationError}
      onRetry={fetchTimeData}
      onClick={() => goto('/urlaub')}
    />

    <!-- Main Card -->
    {#if isLoading}
      <div class="loading-card">
        <div class="spinner"></div>
        <p>Lade Daten...</p>
      </div>
    {:else if error}
      <div class="error-card">
        <div class="error-icon">⚠️</div>
        <p>{error}</p>
        <button class="btn-secondary" on:click={fetchTimeData}>
          Erneut versuchen
        </button>
      </div>
    {:else if currentData}
      <div class="time-card status-{currentData.status}">
        <div class="period-label">{currentData.period}</div>

        <div class="main-stat">
          <div class="stat-label">Differenz</div>
          <div class="stat-value difference">
            {formatDifference(currentData.difference)}
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat">
            <div class="stat-label">Soll</div>
            <div class="stat-value">{formatHours(currentData.requiredHours)}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Ist</div>
            <div class="stat-value">{formatHours(currentData.actualHours)}</div>
            {#if currentData.vacationHours > 0}
              <div class="stat-sub">
                {formatHours(currentData.clockifyHours)} Clockify + {formatHours(currentData.vacationHours)} Urlaub
              </div>
            {/if}
          </div>
        </div>

        <!-- Working Days & Holidays (for month/year) -->
        {#if (selectedPeriod === 'month' || selectedPeriod === 'year') && currentData.workingDays}
          <div class="info-grid">
            <div class="info-item">
              <span class="info-icon">📅</span>
              <div>
                <div class="info-label">Arbeitstage</div>
                <div class="info-value">{currentData.workingDays}</div>
              </div>
            </div>
            {#if currentData.holidays && currentData.holidays > 0}
              <div class="info-item">
                <span class="info-icon">🎉</span>
                <div>
                  <div class="info-label">Feiertage</div>
                  <div class="info-value">{currentData.holidays}</div>
                </div>
              </div>
            {/if}
          </div>
        {/if}

        <div class="status-message">
          {#if currentData.status === 'over'}
            <span class="icon">✅</span>
            <span>Sie haben {formatHours(Math.abs(currentData.difference))} Überstunden</span>
          {:else if currentData.status === 'under'}
            <span class="icon">⚠️</span>
            <span>Es fehlen noch {formatHours(Math.abs(currentData.difference))}</span>
          {:else}
            <span class="icon">👌</span>
            <span>Perfekt im Soll!</span>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Footer Actions -->
    <div class="actions">
      <button class="btn-secondary" on:click={fetchTimeData} disabled={isLoading}>
        🔄 Aktualisieren
      </button>
      <a href="/settings" class="btn-secondary">
        ⚙️ Einstellungen
      </a>
    </div>

    {#if lastUpdated}
      <div class="last-updated">
        Zuletzt aktualisiert: {formatLastUpdated(lastUpdated)} Uhr
      </div>
    {/if}
  </div>
</div>

<style>
  .dashboard {
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
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: white;
  }

  .header-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .user-name {
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .btn-icon {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: 50%;
    width: 2.5rem;
    height: 2.5rem;
    font-size: 1.25rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-icon:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.05);
  }

  .container {
    max-width: 600px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
  }

  .tabs {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .tab {
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid transparent;
    border-radius: 0.5rem;
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.875rem;
  }

  .tab:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .tab.active {
    background: white;
    color: #667eea;
    border-color: white;
  }

  .time-card {
    background: white;
    border-radius: 1rem;
    padding: 2rem;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    margin-bottom: 1.5rem;
  }

  .period-label {
    text-align: center;
    font-size: 0.875rem;
    color: #718096;
    margin-bottom: 1.5rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .main-stat {
    text-align: center;
    margin-bottom: 2rem;
  }

  .main-stat .stat-label {
    font-size: 0.875rem;
    color: #718096;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }

  .main-stat .stat-value {
    font-size: 3rem;
    font-weight: 700;
    line-height: 1;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: #f7fafc;
    border-radius: 0.75rem;
  }

  .stat {
    text-align: center;
  }

  .stat-label {
    font-size: 0.75rem;
    color: #718096;
    margin-bottom: 0.25rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #2d3748;
  }

  .stat-sub {
    font-size: 0.7rem;
    color: #718096;
    margin-top: 0.25rem;
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    padding: 0.75rem;
    background: #edf2f7;
    border-radius: 0.5rem;
  }

  .info-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .info-icon {
    font-size: 1.5rem;
  }

  .info-label {
    font-size: 0.75rem;
    color: #718096;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }

  .info-value {
    font-size: 1.125rem;
    font-weight: 700;
    color: #2d3748;
  }

  .status-message {
    text-align: center;
    padding: 1rem;
    border-radius: 0.5rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .status-message .icon {
    font-size: 1.5rem;
  }

  /* Status Colors */
  .status-over .difference {
    color: #38a169;
  }

  .status-over .status-message {
    background: #f0fff4;
    color: #22543d;
  }

  .status-good .difference {
    color: #667eea;
  }

  .status-good .status-message {
    background: #f0f4ff;
    color: #4c51bf;
  }

  .status-under .difference {
    color: #e53e3e;
  }

  .status-under .status-message {
    background: #fff5f5;
    color: #742a2a;
  }

  .loading-card,
  .error-card {
    background: white;
    border-radius: 1rem;
    padding: 3rem 2rem;
    text-align: center;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    margin-bottom: 1.5rem;
  }

  .spinner {
    width: 3rem;
    height: 3rem;
    border: 4px solid #e2e8f0;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .btn-secondary {
    padding: 0.875rem;
    background: rgba(255, 255, 255, 0.2);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 0.5rem;
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
    text-decoration: none;
    display: inline-block;
  }

  .btn-secondary:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  }

  .btn-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .last-updated {
    text-align: center;
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.875rem;
  }

  @media (max-width: 480px) {
    .container {
      padding: 1rem 0.75rem;
    }

    .time-card {
      padding: 1.5rem;
    }

    .main-stat .stat-value {
      font-size: 2.5rem;
    }

    h1 {
      font-size: 1.25rem;
    }

    .user-name {
      display: none;
    }
  }
</style>
