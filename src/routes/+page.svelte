<script lang="ts">
  /**
   * Main Entry Page
   * Shows Login or Dashboard based on authentication state
   */

  import { isAuthenticated } from '$lib/stores/auth';
  import Login from '$lib/components/Login.svelte';
  import Dashboard from '$lib/components/Dashboard.svelte';
</script>

<svelte:head>
  <title>Clockify Tracker - Zeiterfassung</title>
</svelte:head>

{#if $isAuthenticated}
  <Dashboard />
{:else}
  <Login />
{/if}
