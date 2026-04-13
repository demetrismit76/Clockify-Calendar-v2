export type SyncMode = 'manual' | 'auto';
export type ViewMode = 'list' | 'grouped' | 'week' | 'month';
export type CalendarTarget = 'microsoft' | 'google';

export interface ClockifyWorkspace {
  id: string;
  name: string;
}

export interface ClockifyUser {
  id: string;
  name: string;
  email: string;
}

export interface ClockifyTimeEntry {
  id: string;
  description: string;
  originalDescription?: string;
  timeInterval: {
    start: string;
    end: string;
    duration: string;
  };
  projectId: string;
  projectName?: string;
}

export interface SyncStatusState {
  status: 'idle' | 'loading' | 'success' | 'error' | 'syncing';
  message: string;
  progress?: {
    current: number;
    total: number;
  };
}

export interface GoogleCalendarEvent {
  summary: string;
  description: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
}

export interface UserSettings {
  clockify_api_key: string | null;
  google_client_id: string | null;
  microsoft_client_id: string | null;
  calendar_target: string;
  sync_mode: string;
  ai_enabled: boolean;
  include_project_in_description: boolean;
  dark_mode: boolean;
  default_last_week: boolean;
  approved: boolean;
  banned: boolean;
}
