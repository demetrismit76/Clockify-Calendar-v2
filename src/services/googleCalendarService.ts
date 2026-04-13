import { ClockifyTimeEntry } from '@/types/syncly';

export class GoogleCalendarService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async createEvent(entry: ClockifyTimeEntry): Promise<any> {
    const summary = entry.description || entry.projectName || 'Time Entry';
    const description = `Syncly Bridge from: ${entry.projectName}`;

    const event = {
      summary,
      description,
      start: { dateTime: entry.timeInterval.start },
      end: { dateTime: entry.timeInterval.end },
    };

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to create event');
    }

    return response.json();
  }

  async syncEntries(
    entries: ClockifyTimeEntry[],
    onProgress: (current: number) => void
  ): Promise<void> {
    for (let i = 0; i < entries.length; i++) {
      await this.createEvent(entries[i]);
      onProgress(i + 1);
    }
  }
}
