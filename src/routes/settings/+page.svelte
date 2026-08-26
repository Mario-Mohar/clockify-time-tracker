<script lang="ts">
  /**
   * Settings Page
   * Configure work contract and app settings
   */

  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { isAuthenticated } from '$lib/stores/auth';
  import Settings from '$lib/components/Settings.svelte';

  // Redirect to home if not authenticated
  onMount(() => {
    const unsubscribe = isAuthenticated.subscribe((authenticated) => {
      if (!authenticated) {
        goto('/');
      }
    });

    return unsubscribe;
  });
</script>

<svelte:head>
  <title>Einstellungen - Clockify Tracker</title>
</svelte:head>

{#if $isAuthenticated}
  <Settings />
{/if}
