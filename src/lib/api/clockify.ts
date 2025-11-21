/**
 * Clockify API Client
 * Handles all communication with the Clockify REST API
 * Documentation: https://docs.clockify.me/
 */

const CLOCKIFY_API_BASE = 'https://api.clockify.me/api/v1';

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
    const params = new URLSearchParams({
      start,
      end,
      'page-size': '1000', // Get up to 1000 entries
    });

    return this.fetch<ClockifyTimeEntry[]>(`${endpoint}?${params}`);
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
