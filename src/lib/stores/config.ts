/**
 * Configuration Store
 * Manages work contract configuration (weekly hours, work days)
 */

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { WorkConfig } from '$lib/utils/calculations';
import { DEFAULT_CONFIG } from '$lib/utils/calculations';

const STORAGE_KEY = 'clockify_work_config';

/**
 * Load config from localStorage
 */
function loadConfig(): WorkConfig {
  if (!browser) {
    return DEFAULT_CONFIG;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const config = JSON.parse(stored);
      // Migration: Add state if missing (for old configs)
      if (!config.state) {
        config.state = DEFAULT_CONFIG.state;
        saveConfig(config);
      }
      // Migration: Add vacationBudget if missing (for old configs)
      if (config.vacationBudget === undefined) {
        config.vacationBudget = DEFAULT_CONFIG.vacationBudget;
        saveConfig(config);
      }
      return config;
    }
  } catch (error) {
    console.error('Failed to load config:', error);
  }

  return DEFAULT_CONFIG;
}

/**
 * Save config to localStorage
 */
function saveConfig(config: WorkConfig): void {
  if (!browser) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}

/**
 * Create config store
 */
function createConfigStore() {
  const { subscribe, set, update } = writable<WorkConfig>(loadConfig());

  return {
    subscribe,

    /**
     * Update weekly hours
     */
    setWeeklyHours(hours: number) {
      update((config) => {
        const newConfig = { ...config, weeklyHours: hours };
        saveConfig(newConfig);
        return newConfig;
      });
    },

    /**
     * Update work days per week
     */
    setWorkDays(days: number) {
      update((config) => {
        const newConfig = { ...config, workDaysPerWeek: days };
        saveConfig(newConfig);
        return newConfig;
      });
    },

    /**
     * Update start of week
     */
    setStartOfWeek(day: 'monday' | 'sunday') {
      update((config) => {
        const newConfig = { ...config, startOfWeek: day };
        saveConfig(newConfig);
        return newConfig;
      });
    },

    /**
     * Update federal state
     */
    setState(state: WorkConfig['state']) {
      update((config) => {
        const newConfig = { ...config, state };
        saveConfig(newConfig);
        return newConfig;
      });
    },

    /**
     * Update vacation budget (days per year)
     */
    setVacationBudget(days: number) {
      update((config) => {
        const newConfig = { ...config, vacationBudget: days };
        saveConfig(newConfig);
        return newConfig;
      });
    },

    /**
     * Update entire config
     */
    setConfig(config: WorkConfig) {
      set(config);
      saveConfig(config);
    },

    /**
     * Reset to default config
     */
    reset() {
      set(DEFAULT_CONFIG);
      saveConfig(DEFAULT_CONFIG);
    },

    /**
     * Get current config value
     */
    getConfig(): WorkConfig {
      return get({ subscribe });
    },
  };
}

export const workConfig = createConfigStore();
