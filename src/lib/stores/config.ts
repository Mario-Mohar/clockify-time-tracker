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
      // Migration: aus der alten Anzahl workDaysPerWeek konkrete Wochentage
      // machen. Vier Tage werden zu Montag bis Donnerstag -- eine Annahme, die
      // in den Einstellungen mit zwei Klicks zu korrigieren ist, aber besser
      // als weiterhin fuenf Tage zu unterstellen.
      if (!Array.isArray(config.workDays)) {
        const n = Number(config.workDaysPerWeek) || DEFAULT_CONFIG.workDays.length;
        config.workDays = [1, 2, 3, 4, 5, 6, 0].slice(0, Math.max(1, Math.min(7, n)));
        delete config.workDaysPerWeek;
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
     * Update which weekdays are worked (getDay() indices, 0 = Sunday)
     */
    setWorkDays(days: number[]) {
      update((config) => {
        const newConfig = { ...config, workDays: [...days].sort((a, b) => a - b) };
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
