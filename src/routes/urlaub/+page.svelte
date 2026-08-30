<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { isAuthenticated } from '$lib/stores/auth';
  import { vacations } from '$lib/stores/vacations';
  import { createVacationsApi, type VacationRow, type VacationApiError } from '$lib/api/vacations';
  import { auth } from '$lib/stores/auth';
  import VacationList from '$lib/components/VacationList.svelte';
  import VacationModal from '$lib/components/VacationModal.svelte';
  import type { VacationKind } from '$lib/utils/vacation';

  let allEntries: VacationRow[] = [];
  let isLoading = true;
  let loadError: string | null = null;
  let showModal = false;

  async function loadAll() {
    if (!$isAuthenticated) return;
    isLoading = true;
    loadError = null;
    try {
      const apiKey = auth.getApiKey();
      if (!apiKey) throw new Error('Nicht angemeldet');
      allEntries = await createVacationsApi(apiKey).listAll();
    } catch (err) {
      const e = err as VacationApiError;
      loadError = e?.message || 'Fehler beim Laden';
    } finally {
      isLoading = false;
    }
  }

  async function handleSave(
    start: string,
    end: string,
    note: string | null,
    fraction: number,
    kind: VacationKind
  ) {
    await vacations.addEntry(start, end, note, fraction, kind);
    await loadAll();
  }

  async function handleDelete(id: number) {
    try {
      await vacations.removeEntry(id);
    } catch (err) {
      const e = err as VacationApiError;
      if (e?.status === 404) {
        alert('Eintrag nicht mehr vorhanden');
      } else {
        alert(e?.message || 'Löschen fehlgeschlagen');
      }
    }
    await loadAll();
  }

  onMount(() => {
    if (!$isAuthenticated) {
      goto('/');
      return;
    }
    loadAll();
  });
</script>

<svelte:head>
  <title>Urlaubsverwaltung</title>
</svelte:head>

<div class="page">
  <header class="header">
    <div class="header-content">
      <button type="button" class="back" on:click={() => goto('/')}>← Dashboard</button>
      <h1>Urlaub</h1>
      <span class="spacer"></span>
    </div>
  </header>

  <div class="container">
    <div class="toolbar">
      <button type="button" class="btn-primary" on:click={() => (showModal = true)}>
        + Urlaub hinzufügen
      </button>
    </div>

    {#if isLoading}
      <div class="info">Lade …</div>
    {:else if loadError}
      <div class="info error">
        ⚠️ {loadError}
        <button type="button" class="btn-secondary" on:click={loadAll}>Erneut versuchen</button>
      </div>
    {:else}
      <div class="list-card">
        <VacationList entries={allEntries} onDelete={handleDelete} />
      </div>
    {/if}
  </div>

  {#if showModal}
    <VacationModal onSave={handleSave} onClose={() => (showModal = false)} />
  {/if}
</div>

<style>
  .page {
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
    color: white;
  }

  .back {
    background: none;
    border: none;
    color: white;
    font: inherit;
    cursor: pointer;
  }

  .spacer { width: 5rem; }

  .container {
    max-width: 600px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
  }

  .toolbar {
    margin-bottom: 1.5rem;
  }

  .btn-primary {
    background: white;
    color: #667eea;
    border: none;
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: none;
    border-radius: 0.375rem;
    padding: 0.5rem 1rem;
    cursor: pointer;
    margin-top: 0.5rem;
  }

  .info {
    background: white;
    border-radius: 0.5rem;
    padding: 1.5rem;
    text-align: center;
    color: #718096;
  }

  .info.error {
    color: #e53e3e;
  }

  .list-card {
    background: white;
    border-radius: 1rem;
    padding: 1.5rem;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  }
</style>
