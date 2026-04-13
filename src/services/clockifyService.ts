import { ClockifyWorkspace, ClockifyUser, ClockifyTimeEntry } from '@/types/syncly';

const BASE_URL = 'https://api.clockify.me/api/v1';

export class ClockifyService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private get headers() {
    return {
      'X-Api-Key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  async getWorkspaces(): Promise<ClockifyWorkspace[]> {
    const response = await fetch(`${BASE_URL}/workspaces`, {
      headers: this.headers,
    });
    if (!response.ok) throw new Error('Failed to fetch workspaces');
    return response.json();
  }

  async getCurrentUser(): Promise<ClockifyUser> {
    const response = await fetch(`${BASE_URL}/user`, {
      headers: this.headers,
    });
    if (!response.ok) throw new Error('Failed to fetch user');
    return response.json();
  }

  async getTimeEntries(
    workspaceId: string,
    userId: string,
    start: string,
    end: string
  ): Promise<ClockifyTimeEntry[]> {
    const params = new URLSearchParams({
      start,
      end,
      hydrated: 'true',
      'page-size': '1000',
    });
    const response = await fetch(
      `${BASE_URL}/workspaces/${workspaceId}/user/${userId}/time-entries?${params}`,
      { headers: this.headers }
    );
    if (!response.ok) throw new Error('Failed to fetch time entries');
    const entries = await response.json();

    return entries.map((e: any) => ({
      ...e,
      projectName: e.project?.name || 'No Project',
    }));
  }
}
