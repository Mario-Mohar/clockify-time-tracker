/**
 * Authentication Store
 * Manages Clockify API Key storage and user session
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { ClockifyUser, ClockifyWorkspace } from '$lib/api/clockify';

interface AuthState {
  apiKey: string | null;
  user: ClockifyUser | null;
  workspace: ClockifyWorkspace | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = 'clockify_auth';

/**
 * Load auth state from localStorage
 */
function loadAuthState(): AuthState {
  if (!browser) {
    return {
      apiKey: null,
      user: null,
      workspace: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return {
        ...data,
        isAuthenticated: !!data.apiKey,
        isLoading: false,
        error: null,
      };
    }
  } catch (error) {
    console.error('Failed to load auth state:', error);
  }

  return {
    apiKey: null,
    user: null,
    workspace: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  };
}

/**
 * Save auth state to localStorage
 */
function saveAuthState(state: AuthState): void {
  if (!browser) return;

  try {
    const toSave = {
      apiKey: state.apiKey,
      user: state.user,
      workspace: state.workspace,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.error('Failed to save auth state:', error);
  }
}

/**
 * Create auth store
 */
function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(loadAuthState());

  return {
    subscribe,

    /**
     * Set API key and validate it
     */
    async setApiKey(apiKey: string): Promise<boolean> {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        // Dynamically import to avoid SSR issues
        const { createClockifyClient } = await import('$lib/api/clockify');
        const client = createClockifyClient(apiKey);

        // Validate API key by fetching user
        const user = await client.getCurrentUser();
        const workspaces = await client.getWorkspaces();
        const workspace = workspaces[0]; // Use first workspace

        const newState: AuthState = {
          apiKey,
          user,
          workspace,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        };

        set(newState);
        saveAuthState(newState);
        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Invalid API key';
        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));
        return false;
      }
    },

    /**
     * Logout and clear stored data
     */
    logout() {
      const emptyState: AuthState = {
        apiKey: null,
        user: null,
        workspace: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };

      set(emptyState);
      if (browser) {
        localStorage.removeItem(STORAGE_KEY);
      }

      // Reset vacation cache (lazy import to avoid circular deps)
      import('./vacations').then(({ vacations }) => vacations.reset());
    },

    /**
     * Clear error message
     */
    clearError() {
      update((state) => ({ ...state, error: null }));
    },

    /**
     * Get current API key
     */
    getApiKey(): string | null {
      return get({ subscribe }).apiKey;
    },
  };
}

export const auth = createAuthStore();

/**
 * Derived store: is user authenticated?
 */
export const isAuthenticated = derived(auth, ($auth) => $auth.isAuthenticated);

/**
 * Derived store: current user
 */
export const currentUser = derived(auth, ($auth) => $auth.user);

/**
 * Derived store: current workspace
 */
export const currentWorkspace = derived(auth, ($auth) => $auth.workspace);
