/**
 * Library Exports
 * Main exports for the library
 */

// API
export { ClockifyClient, createClockifyClient } from './api/clockify';
export type { ClockifyTimeEntry, ClockifyUser, ClockifyWorkspace, TimeEntrySummary } from './api/clockify';

// Stores
export { auth, isAuthenticated, currentUser, currentWorkspace } from './stores/auth';
export { workConfig } from './stores/config';

// Utils
export * from './utils/calculations';
export * from './utils/holidays';

// Components
export { default as Dashboard } from './components/Dashboard.svelte';
export { default as Login } from './components/Login.svelte';
export { default as Settings } from './components/Settings.svelte';
