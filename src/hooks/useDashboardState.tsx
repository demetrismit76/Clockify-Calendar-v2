import { createContext, useContext, useState, ReactNode } from 'react';
import { ClockifyWorkspace, ClockifyUser, ClockifyTimeEntry, SyncStatusState, SyncMode, ViewMode, CalendarTarget } from '@/types/syncly';

interface DashboardState {
  apiKey: string;
  setApiKey: (v: string) => void;
  googleClientId: string;
  setGoogleClientId: (v: string) => void;
  syncMode: SyncMode;
  setSyncMode: (v: SyncMode) => void;
  aiEnabled: boolean;
  setAiEnabled: (v: boolean) => void;
  includeProjectInDescription: boolean;
  setIncludeProjectInDescription: (v: boolean) => void;
  theme: 'light' | 'dark';
  setTheme: (v: 'light' | 'dark') => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  selectedProjects: string[];
  setSelectedProjects: (v: string[] | ((prev: string[]) => string[])) => void;
  hideShortEntries: boolean;
  setHideShortEntries: (v: boolean) => void;
  workspaces: ClockifyWorkspace[];
  setWorkspaces: (v: ClockifyWorkspace[]) => void;
  selectedWorkspace: string;
  setSelectedWorkspace: (v: string) => void;
  clockifyUser: ClockifyUser | null;
  setClockifyUser: (v: ClockifyUser | null) => void;
  entries: ClockifyTimeEntry[];
  setEntries: (v: ClockifyTimeEntry[] | ((prev: ClockifyTimeEntry[]) => ClockifyTimeEntry[])) => void;
  selectedEntries: Set<string>;
  setSelectedEntries: (v: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  dateRange: { start: string; end: string };
  setDateRange: (v: { start: string; end: string } | ((prev: { start: string; end: string }) => { start: string; end: string })) => void;
  syncStatus: SyncStatusState;
  setSyncStatus: (v: SyncStatusState | ((prev: SyncStatusState) => SyncStatusState)) => void;
  isFetching: boolean;
  setIsFetching: (v: boolean) => void;
  googleToken: string | null;
  setGoogleToken: (v: string | null) => void;
  microsoftClientId: string;
  setMicrosoftClientId: (v: string) => void;
  microsoftToken: string | null;
  setMicrosoftToken: (v: string | null) => void;
  calendarTarget: CalendarTarget;
  setCalendarTarget: (v: CalendarTarget) => void;
  workWeekDays: number;
  setWorkWeekDays: (v: number) => void;
  reportOpen: boolean;
  setReportOpen: (v: boolean) => void;
  settingsInitialized: boolean;
  setSettingsInitialized: (v: boolean) => void;
  defaultLastWeek: boolean;
  setDefaultLastWeek: (v: boolean) => void;
}

const DashboardContext = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const today = new Date().toISOString().split('T')[0];

  const [apiKey, setApiKey] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');
  const [syncMode, setSyncMode] = useState<SyncMode>('manual');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [includeProjectInDescription, setIncludeProjectInDescription] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjects, setSelectedProjects] = useState<string[]>(['all']);
  const [hideShortEntries, setHideShortEntries] = useState(false);
  const [workspaces, setWorkspaces] = useState<ClockifyWorkspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [clockifyUser, setClockifyUser] = useState<ClockifyUser | null>(null);
  const [entries, setEntries] = useState<ClockifyTimeEntry[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState({ start: today, end: today });
  const [syncStatus, setSyncStatus] = useState<SyncStatusState>({ status: 'idle', message: '' });
  const [isFetching, setIsFetching] = useState(false);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [microsoftClientId, setMicrosoftClientId] = useState('');
  const [microsoftToken, setMicrosoftToken] = useState<string | null>(null);
  const [calendarTarget, setCalendarTarget] = useState<CalendarTarget>('microsoft');
  const [workWeekDays, setWorkWeekDays] = useState(5);
  const [reportOpen, setReportOpen] = useState(false);
  const [settingsInitialized, setSettingsInitialized] = useState(false);
  const [defaultLastWeek, setDefaultLastWeek] = useState(false);

  return (
    <DashboardContext.Provider value={{
      apiKey, setApiKey, googleClientId, setGoogleClientId, syncMode, setSyncMode,
      aiEnabled, setAiEnabled, includeProjectInDescription, setIncludeProjectInDescription,
      theme, setTheme, viewMode, setViewMode, searchQuery, setSearchQuery,
      selectedProjects, setSelectedProjects, hideShortEntries, setHideShortEntries,
      workspaces, setWorkspaces, selectedWorkspace, setSelectedWorkspace,
      clockifyUser, setClockifyUser, entries, setEntries, selectedEntries, setSelectedEntries,
      dateRange, setDateRange, syncStatus, setSyncStatus, isFetching, setIsFetching,
      googleToken, setGoogleToken, microsoftClientId, setMicrosoftClientId,
      microsoftToken, setMicrosoftToken, calendarTarget, setCalendarTarget,
      workWeekDays, setWorkWeekDays,
      reportOpen, setReportOpen, settingsInitialized, setSettingsInitialized,
      defaultLastWeek, setDefaultLastWeek,
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardState() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboardState must be used within DashboardProvider');
  return ctx;
}