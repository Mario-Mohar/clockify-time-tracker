<script lang="ts">
  import type { VacationSummary } from '$lib/utils/vacation';

  export let year: number;
  export let summary: VacationSummary | null;
  export let budget: number;
  export let isLoading: boolean;
  export let error: string | null;
  export let onRetry: () => void;
  export let onClick: () => void;

  $: available = summary ? budget - summary.taken - summary.planned : null;
  $: isNegative = available !== null && available < 0;
</script>

{#if error}
  <div class="tile">
    <div class="title">Urlaub {year}</div>
    <div class="error">
      <div>⚠️ {error}</div>
      <button class="retry" type="button" on:click={onRetry}>
        Erneut versuchen
      </button>
    </div>
  </div>
{:else}
  <button class="tile" on:click={onClick} disabled={isLoading} type="button">
    <div class="title">Urlaub {year}</div>

    {#if isLoading}
      <div class="loading">Lade …</div>
    {:else if summary}
      <div class="stats">
        <div class="stat">
          <div class="value">{summary.taken}</div>
          <div class="label">Genommen</div>
        </div>
        <div class="stat">
          <div class="value">{summary.planned}</div>
          <div class="label">Geplant</div>
        </div>
        <div class="stat" class:negative={isNegative}>
          <div class="value">{available}</div>
          <div class="label">Verfügbar</div>
        </div>
      </div>
    {/if}
  </button>
{/if}

<style>
  .tile {
    display: block;
    width: 100%;
    background: white;
    border: none;
    border-radius: 1rem;
    padding: 1.5rem;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    margin-bottom: 1.5rem;
    cursor: pointer;
    text-align: left;
    font: inherit;
  }

  .tile:disabled {
    cursor: default;
  }

  .title {
    font-size: 0.875rem;
    color: #718096;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 1rem;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  .stat {
    text-align: center;
  }

  .stat .value {
    font-size: 1.75rem;
    font-weight: 700;
    color: #2d3748;
  }

  .stat.negative .value {
    color: #e53e3e;
  }

  .stat .label {
    font-size: 0.75rem;
    color: #718096;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 0.25rem;
  }

  .loading, .error {
    text-align: center;
    color: #718096;
    padding: 1rem 0;
  }

  .retry {
    margin-top: 0.75rem;
    padding: 0.5rem 1rem;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
  }
</style>
