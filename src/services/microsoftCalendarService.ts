import { PublicClientApplication, Configuration, PopupRequest } from '@azure/msal-browser';
import { ClockifyTimeEntry } from '@/types/syncly';

const GRAPH_ENDPOINT = 'https://graph.microsoft.com/v1.0/me/events';

export class MicrosoftCalendarService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  static async login(clientId: string): Promise<string> {
    const msalConfig: Configuration = {
      auth: {
        clientId,
        authority: 'https://login.microsoftonline.com/common',
        redirectUri: window.location.origin,
      },
      cache: {
        cacheLocation: 'sessionStorage',
      },
    };

    const pca = new PublicClientApplication(msalConfig);
    await pca.initialize();

    const loginRequest: PopupRequest = {
      scopes: ['Calendars.ReadWrite'],
    };

    const response = await pca.loginPopup(loginRequest);
    const tokenResponse = await pca.acquireTokenSilent({
      scopes: ['Calendars.ReadWrite'],
      account: response.account!,
    });

    return tokenResponse.accessToken;
  }

  async createEvent(entry: ClockifyTimeEntry): Promise<any> {
    const summary = entry.description || entry.projectName || 'Time Entry';
    const description = `Syncly Bridge from: ${entry.projectName}`;

    const event = {
      subject: summary,
      body: { contentType: 'Text', content: description },
      start: {
        dateTime: entry.timeInterval.start,
        timeZone: 'UTC',
      },
      end: {
        dateTime: entry.timeInterval.end,
        timeZone: 'UTC',
      },
    };

    const response = await fetch(GRAPH_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

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
