/**
 * Clockify API Client
 * Handles all communication with the Clockify REST API
 * Documentation: https://docs.clockify.me/
 */

const CLOCKIFY_API_BASE = 'https://api.clockify.me/api/v1';

/** Einträge pro Seite beim Laden der Zeiteinträge. */
export const TIME_ENTRIES_PAGE_SIZE = 1000;

/**
 * Obergrenze für die Seiten, damit eine API, die immer volle Seiten liefert,
 * keine Endlosschleife auslöst. 50 Seiten zu je 1000 sind weit mehr als ein
 * Jahr Zeiterfassung.
 */
export const TIME_ENTRIES_MAX_PAGES = 50;

export interface ClockifyTimeEntry {
  id: string;
  description: string;
  timeInterval: {
    start: string;
    end: string;
    duration: string; // ISO 8601 duration format
  };
  projectId: string;
  userId: string;
  workspaceId: string;
}

export interface ClockifyUser {
  id: string;
  email: string;
  name: string;
  activeWorkspace: string;
  defaultWorkspace?: string;
}

export interface ClockifyWorkspace {
  id: string;
  name: string;
}

export interface TimeEntrySummary {
  totalSeconds: number;
  totalHours: number;
  entries: ClockifyTimeEntry[];
}

/**
 * Der Workspace, in dem der Nutzer gerade arbeitet: activeWorkspace, sonst
 * defaultWorkspace, erst zuletzt der erste aus der Liste. Mit mehreren
 * Workspaces ist der erste sonst oft der falsche.
 */
export function pickWorkspace(
  user: Pick<ClockifyUser, 'activeWorkspace' | 'defaultWorkspace'>,
  workspaces: ClockifyWorkspace[]
): ClockifyWorkspace | undefined {
  return (
    workspaces.find((w) => w.id === user.activeWorkspace) ??
    workspaces.find((w) => w.id === user.defaultWorkspace) ??
    workspaces[0]
  );
}

/**
 * Clockify API Client Class
 */
export class ClockifyClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = CLOCKIFY_API_BASE;
  }

  /**
   * Generic fetch wrapper with authentication
   */
  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Clockify API Error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<ClockifyUser> {
    return this.fetch<ClockifyUser>('/user');
  }

  /**
   * Get all workspaces
   */
  async getWorkspaces(): Promise<ClockifyWorkspace[]> {
    return this.fetch<ClockifyWorkspace[]>('/workspaces');
  }

  /**
   * Get time entries for a specific date range
   * @param workspaceId - The workspace ID
   * @param userId - The user ID
   * @param start - Start date (ISO 8601 format)
   * @param end - End date (ISO 8601 format)
   */
  async getTimeEntries(
    workspaceId: string,
    userId: string,
    start: string,
    end: string
  ): Promise<ClockifyTimeEntry[]> {
    const endpoint = `/workspaces/${workspaceId}/user/${userId}/time-entries`;
    const entries: ClockifyTimeEntry[] = [];

    // Seitenweise laden, bis eine Seite nicht mehr voll ist. Sonst fehlen ab
    // 1000 Einträgen still Stunden.
    for (let page = 1; page <= TIME_ENTRIES_MAX_PAGES; page++) {
      const params = new URLSearchParams({
        start,
        end,
        page: String(page),
        'page-size': String(TIME_ENTRIES_PAGE_SIZE),
      });

      const batch = await this.fetch<ClockifyTimeEntry[]>(`${endpoint}?${params}`);
      entries.push(...batch);
      if (batch.length < TIME_ENTRIES_PAGE_SIZE) return entries;
    }

    // Lieber einen Fehler zeigen als ein zu niedriges Ist.
    throw new Error(
      `Mehr als ${TIME_ENTRIES_MAX_PAGES * TIME_ENTRIES_PAGE_SIZE} Zeiteinträge im Zeitraum, Abbruch`
    );
  }

  /**
   * Calculate total hours from time entries
   */
  calculateTotalHours(entries: ClockifyTimeEntry[]): TimeEntrySummary {
    let totalSeconds = 0;

    for (const entry of entries) {
      const duration = entry.timeInterval.duration;
      if (duration) {
        // Parse ISO 8601 duration (e.g., "PT8H30M" -> 8.5 hours)
        totalSeconds += this.parseDuration(duration);
      }
    }

    return {
      totalSeconds,
      totalHours: totalSeconds / 3600,
      entries,
    };
  }

  /**
   * Parse ISO 8601 duration to seconds
   * Format: PT#H#M#S
   */
  private parseDuration(duration: string): number {
    if (!duration || duration === 'PT0S') return 0;

    const matches = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
    if (!matches) return 0;

    const hours = parseInt(matches[1] || '0', 10);
    const minutes = parseInt(matches[2] || '0', 10);
    const seconds = parseFloat(matches[3] || '0');

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Validate API key by attempting to fetch user
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get time entries for today
   */
  async getTodayEntries(workspaceId: string, userId: string): Promise<TimeEntrySummary> {
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const end = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    const entries = await this.getTimeEntries(workspaceId, userId, start, end);
    return this.calculateTotalHours(entries);
  }

  /**
   * Get time entries for current week
   */
  async getWeekEntries(
    workspaceId: string,
    userId: string,
    startOfWeek: Date
  ): Promise<TimeEntrySummary> {
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const entries = await this.getTimeEntries(
      workspaceId,
      userId,
      startOfWeek.toISOString(),
      endOfWeek.toISOString()
    );
    return this.calculateTotalHours(entries);
  }

  /**
   * Get time entries for current month
   */
  async getMonthEntries(
    workspaceId: string,
    userId: string,
    year: number,
    month: number
  ): Promise<TimeEntrySummary> {
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();

    const entries = await this.getTimeEntries(workspaceId, userId, start, end);
    return this.calculateTotalHours(entries);
  }

  /**
   * Get time entries for current year
   */
  async getYearEntries(
    workspaceId: string,
    userId: string,
    year: number
  ): Promise<TimeEntrySummary> {
    const start = new Date(year, 0, 1).toISOString();
    const end = new Date(year, 11, 31, 23, 59, 59, 999).toISOString();

    const entries = await this.getTimeEntries(workspaceId, userId, start, end);
    return this.calculateTotalHours(entries);
  }
}

/**
 * Factory function to create a Clockify client
 */
export function createClockifyClient(apiKey: string): ClockifyClient {
  return new ClockifyClient(apiKey);
}
