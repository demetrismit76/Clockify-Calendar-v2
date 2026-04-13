import { useEffect, useMemo, useState } from 'react';
import { ClockifyTimeEntry, SyncMode, ViewMode, CalendarTarget } from '@/types/syncly';
import { ClockifyService } from '@/services/clockifyService';
import { GoogleCalendarService } from '@/services/googleCalendarService';
import { MicrosoftCalendarService } from '@/services/microsoftCalendarService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useDashboardState } from '@/hooks/useDashboardState';
import Header from '@/components/syncly/Header';
import Settings from '@/components/syncly/Settings';
import EntryCard from '@/components/syncly/EntryCard';
import ActionBar from '@/components/syncly/ActionBar';
import CalendarView from '@/components/syncly/CalendarView';
import SyncToast from '@/components/syncly/SyncToast';
import TimesheetReport from '@/components/syncly/TimesheetReport';
import TeamReport from '@/components/syncly/TeamReport';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Calendar, Send, Clock, LayoutList, CalendarDays, CalendarRange, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react';
import { useThemePreset } from '@/hooks/useThemePreset';
import { sidebarColorPresets } from '@/lib/themes';

export default function Dashboard() {
  const { user } = useAuth();
  const { settings, updateSettings, loading: settingsLoading } = useUserSettings();

  const {
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
  } = useDashboardState();

  const { layoutPreset, sidebarColor } = useThemePreset();
  const { isTeamLead } = useUserRole();
  const [settingsCollapsed, setSettingsCollapsed] = useState(false);
  const [teamReportOpen, setTeamReportOpen] = useState(false);
  const isTopNav = layoutPreset === 'topnav';
  const isCompact = layoutPreset === 'compact';
  const isMinimal = layoutPreset === 'minimal';
  const isColoredSidebar = layoutPreset === 'sidebar-colored';

  const sidebarPreset = sidebarColorPresets.find((p) => p.id === sidebarColor) || sidebarColorPresets[0];
  const hasSidebarColor = isColoredSidebar || sidebarColor !== 'dark';


  // Fetch global app settings
  const [globalAiEnabled, setGlobalAiEnabled] = useState(true);
  const [globalAutoApiEnabled, setGlobalAutoApiEnabled] = useState(true);
  useEffect(() => {
    Promise.all([
      supabase.from('app_settings').select('value').eq('key', 'work_week_days').single(),
      supabase.from('app_settings').select('value').eq('key', 'ai_refinement_enabled').single(),
      supabase.from('app_settings').select('value').eq('key', 'auto_api_enabled').single(),
    ]).then(([workWeekRes, aiRes, autoApiRes]) => {
      if (workWeekRes.data?.value && typeof workWeekRes.data.value === 'object' && 'days' in (workWeekRes.data.value as any)) {
        setWorkWeekDays((workWeekRes.data.value as any).days);
      }
      if (aiRes.data?.value && typeof aiRes.data.value === 'object') {
        setGlobalAiEnabled((aiRes.data.value as any).enabled ?? true);
      }
      if (autoApiRes.data?.value && typeof autoApiRes.data.value === 'object') {
        setGlobalAutoApiEnabled((autoApiRes.data.value as any).enabled ?? true);
      }
    });
  }, []);

  // Sync settings from DB — only on first load
  useEffect(() => {
    if (!settingsLoading && !settingsInitialized) {
      setApiKey(settings.clockify_api_key || '');
      setGoogleClientId(settings.google_client_id || '');
      setMicrosoftClientId(settings.microsoft_client_id || '');
      setCalendarTarget((settings.calendar_target || 'microsoft') as CalendarTarget);
      setSyncMode(settings.sync_mode as SyncMode);
      setAiEnabled(settings.ai_enabled);
      setIncludeProjectInDescription(settings.include_project_in_description);
      setTheme(settings.dark_mode ? 'dark' : 'light');
      setDefaultLastWeek(settings.default_last_week);

      // Auto-set date range: this week normally, last week on Mon/Tue
      if (settings.default_last_week) {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, 2=Tue...
        const isEarlyWeek = dayOfWeek === 1 || dayOfWeek === 2; // Monday or Tuesday

        const thisMonday = new Date(now);
        thisMonday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

        if (isEarlyWeek) {
          // Load last week (Mon–Fri)
          const lastMonday = new Date(thisMonday);
          lastMonday.setDate(thisMonday.getDate() - 7);
          const lastFriday = new Date(lastMonday);
          lastFriday.setDate(lastMonday.getDate() + 4);
          setDateRange({
            start: lastMonday.toISOString().split('T')[0],
            end: lastFriday.toISOString().split('T')[0],
          });
        } else {
          // Load this week (Mon–today)
          setDateRange({
            start: thisMonday.toISOString().split('T')[0],
            end: now.toISOString().split('T')[0],
          });
        }
      }

      setSettingsInitialized(true);
    }
  }, [settingsLoading]);

  // Auto-fetch last week entries when workspace is ready and default is on
  const [autoFetched, setAutoFetched] = useState(false);
  useEffect(() => {
    if (defaultLastWeek && selectedWorkspace && clockifyUser && !autoFetched && entries.length === 0) {
      setAutoFetched(true);
      fetchEntriesWithRange(dateRange);
    }
  }, [defaultLastWeek, selectedWorkspace, clockifyUser]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Auto-load workspaces
  const clockify = useMemo(() => new ClockifyService(apiKey), [apiKey]);

  useEffect(() => {
    if (apiKey && apiKey.length > 20) {
      const timer = setTimeout(() => fetchWorkspaces(), 500);
      return () => clearTimeout(timer);
    }
  }, [apiKey]);

  const fetchWorkspaces = async () => {
    if (!apiKey) return;
    try {
      setSyncStatus({ status: 'loading', message: 'Connecting...' });
      const ws = await clockify.getWorkspaces();
      setWorkspaces(ws);
      const userData = await clockify.getCurrentUser();
      setClockifyUser(userData);

      // Auto-select if only one workspace
      if (ws.length === 1 && !selectedWorkspace) {
        setSelectedWorkspace(ws[0].id);
      }

      setSyncStatus({ status: 'success', message: 'Bridge Established' });
    } catch {
      setSyncStatus({ status: 'error', message: 'Connection failed' });
      setWorkspaces([]);
      setClockifyUser(null);
    }
  };

  const clearApiKey = () => {
    setApiKey('');
    setWorkspaces([]);
    setSelectedWorkspace('');
    setClockifyUser(null);
    setEntries([]);
    updateSettings({ clockify_api_key: null });
    setSyncStatus({ status: 'idle', message: 'API Key Cleared' });
  };

  const fetchEntriesWithRange = async (range: { start: string; end: string }) => {
    if (!selectedWorkspace || !clockifyUser) return;
    setIsFetching(true);
    try {
      const startDate = new Date(range.start);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(range.end);
      endDate.setHours(23, 59, 59, 999);

      const data = await clockify.getTimeEntries(
        selectedWorkspace,
        clockifyUser.id,
        startDate.toISOString(),
        endDate.toISOString()
      );
      setEntries(data);
      setSelectedEntries(new Set(data.map((e) => e.id)));
    } catch {
      setSyncStatus({ status: 'error', message: 'Data fetch failed' });
    } finally {
      setIsFetching(false);
    }
  };

  const fetchEntries = () => fetchEntriesWithRange(dateRange);

  // Filtering
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchesSearch =
        (e.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.projectName || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProject =
        selectedProjects.includes('all') || (e.projectName && selectedProjects.includes(e.projectName));
      let matchesDuration = true;
      if (hideShortEntries && e.timeInterval.duration) {
        const matches = e.timeInterval.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
        if (matches) {
          const h = parseInt(matches[1] || '0');
          const m = parseInt(matches[2] || '0');
          if (h === 0 && m < 5) matchesDuration = false;
        } else {
          matchesDuration = false;
        }
      }
      return matchesSearch && matchesProject && matchesDuration;
    });
  }, [entries, searchQuery, selectedProjects, hideShortEntries]);

  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const groupedEntries = useMemo(() => {
    const groups: Record<string, { key: string; date: Date; entries: ClockifyTimeEntry[] }[]> = {};
    const dateMap = new Map<string, { date: Date; entries: ClockifyTimeEntry[] }>();
    filteredEntries.forEach((e) => {
      const d = new Date(e.timeInterval.start);
      const label = d.toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
      if (!dateMap.has(label)) dateMap.set(label, { date: d, entries: [] });
      dateMap.get(label)!.entries.push(e);
    });
    const sorted = Array.from(dateMap.entries()).sort((a, b) =>
      sortOrder === 'newest'
        ? b[1].date.getTime() - a[1].date.getTime()
        : a[1].date.getTime() - b[1].date.getTime()
    );
    const result: Record<string, ClockifyTimeEntry[]> = {};
    sorted.forEach(([label, { entries }]) => {
      result[label] = sortOrder === 'newest'
        ? entries.sort((a, b) => new Date(b.timeInterval.start).getTime() - new Date(a.timeInterval.start).getTime())
        : entries.sort((a, b) => new Date(a.timeInterval.start).getTime() - new Date(b.timeInterval.start).getTime());
    });
    return result;
  }, [filteredEntries, sortOrder]);

  const projects = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => e.projectName && set.add(e.projectName));
    return Array.from(set).sort();
  }, [entries]);

  const calculateTotalDuration = (groupEntries: ClockifyTimeEntry[]) => {
    let totalSeconds = 0;
    groupEntries.forEach((e) => {
      const matches = (e.timeInterval.duration || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (matches) {
        totalSeconds += parseInt(matches[1] || '0') * 3600 + parseInt(matches[2] || '0') * 60 + parseInt(matches[3] || '0');
      }
    });
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const grandTotalDuration = useMemo(() => {
    const selectedData = filteredEntries.filter((e) => selectedEntries.has(e.id));
    return calculateTotalDuration(selectedData);
  }, [filteredEntries, selectedEntries]);

  const toggleProjectFilter = (projectName: string) => {
    setSelectedProjects((prev) => {
      if (projectName === 'all') return ['all'];
      const filtered = prev.filter((p) => p !== 'all');
      if (filtered.includes(projectName)) {
        const next = filtered.filter((p) => p !== projectName);
        return next.length === 0 ? ['all'] : next;
      }
      return [...filtered, projectName];
    });
  };

  const toggleSelection = (id: string) => {
    setSelectedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroupSelection = (groupEntries: ClockifyTimeEntry[]) => {
    const allSelected = groupEntries.every((e) => selectedEntries.has(e.id));
    setSelectedEntries((prev) => {
      const next = new Set(prev);
      groupEntries.forEach((e) => {
        if (allSelected) next.delete(e.id);
        else next.add(e.id);
      });
      return next;
    });
  };

  const getDisplayDescription = (entry: ClockifyTimeEntry) => {
    if (includeProjectInDescription && entry.projectName && entry.projectName !== 'No Project') {
      return `${entry.projectName} | ${entry.description}`;
    }
    return entry.description;
  };

  const connectGoogle = () => {
    if (!googleClientId) return;
    try {
      if (typeof (window as any).google === 'undefined') {
        setSyncStatus({ status: 'error', message: 'Auth SDK not available' });
        return;
      }
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'https://www.googleapis.com/auth/calendar.events',
        callback: (response: any) => {
          if (response.access_token) {
            setGoogleToken(response.access_token);
            setSyncStatus({ status: 'success', message: 'Cloud Connected' });
          }
        },
      });
      client.requestAccessToken();
    } catch {
      setSyncStatus({ status: 'error', message: 'Cloud auth failed' });
    }
  };

  const connectMicrosoft = async () => {
    if (!microsoftClientId) return;
    try {
      setSyncStatus({ status: 'loading', message: 'Connecting to Microsoft...' });
      const token = await MicrosoftCalendarService.login(microsoftClientId);
      setMicrosoftToken(token);
      setSyncStatus({ status: 'success', message: 'Microsoft Connected' });
    } catch {
      setSyncStatus({ status: 'error', message: 'Microsoft auth failed' });
    }
  };

  const handleSync = async () => {
    const selectedData = entries.filter((e) => selectedEntries.has(e.id));
    if (selectedData.length === 0) return;

    const isAutoMicrosoft = calendarTarget === 'microsoft' && syncMode === 'auto';
    const isAutoGoogle = calendarTarget === 'google' && syncMode === 'auto';

    if (isAutoMicrosoft) {
      if (!microsoftToken) {
        setSyncStatus({ status: 'error', message: 'Connect Microsoft account first' });
        return;
      }
      try {
        setSyncStatus({ status: 'syncing', message: 'Uploading to Outlook...', progress: { current: 0, total: selectedData.length } });
        const msCal = new MicrosoftCalendarService(microsoftToken);
        const formattedData = selectedData.map((e) => ({ ...e, description: getDisplayDescription(e) }));
        await msCal.syncEntries(formattedData, (current) => {
          setSyncStatus((prev) => ({ ...prev, progress: { current, total: selectedData.length } }));
        });
        setSyncStatus({ status: 'success', message: 'Sync Complete' });
      } catch (err: any) {
        setSyncStatus({ status: 'error', message: err.message });
      }
    } else if (isAutoGoogle) {
      if (!googleToken) {
        setSyncStatus({ status: 'error', message: 'Link Google account first' });
        return;
      }
      try {
        setSyncStatus({ status: 'syncing', message: 'Uploading...', progress: { current: 0, total: selectedData.length } });
        const gCal = new GoogleCalendarService(googleToken);
        const formattedData = selectedData.map((e) => ({ ...e, description: getDisplayDescription(e) }));
        await gCal.syncEntries(formattedData, (current) => {
          setSyncStatus((prev) => ({ ...prev, progress: { current, total: selectedData.length } }));
        });
        setSyncStatus({ status: 'success', message: 'Sync Complete' });
      } catch (err: any) {
        setSyncStatus({ status: 'error', message: err.message });
      }
    } else {
      // Manual mode — ICS download for both targets
      generateICS(selectedData);
    }
  };

  const generateICS = (selectedData: ClockifyTimeEntry[]) => {
    const escapeICS = (text: string) => text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    const lines: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'CALSCALE:GREGORIAN', 'PRODID:-//Syncly//EN'];
    selectedData.forEach((e) => {
      const fmt = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d+/, '').replace(/Z$/, '') + 'Z';
      const start = fmt(e.timeInterval.start);
      const end = fmt(e.timeInterval.end);
      const summary = escapeICS(getDisplayDescription(e) || e.projectName || 'Work Item');
      const uid = `${e.id}-${Date.now()}@syncly`;
      lines.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${start}`, `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:${summary}`, `DESCRIPTION:${escapeICS('Syncly Bridge Export')}`, 'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    const icsContent = lines.join('\r\n');
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const rangeLabel = `${new Date(dateRange.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} - ${new Date(dateRange.end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    link.setAttribute('download', `Calendar Export (${rangeLabel}).ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateCSV = () => {
    const selectedData = entries.filter((e) => selectedEntries.has(e.id));
    if (selectedData.length === 0) return;
    const headers = ['Date', 'Project', 'Description', 'Start Time', 'End Time', 'Duration'];
    const rows = selectedData.map((e) => {
      const date = new Date(e.timeInterval.start).toLocaleDateString();
      const start = new Date(e.timeInterval.start).toLocaleTimeString();
      const end = e.timeInterval.end ? new Date(e.timeInterval.end).toLocaleTimeString() : 'Running';
      const duration = calculateTotalDuration([e]);
      const description = getDisplayDescription(e);
      return [`"${date}"`, `"${e.projectName || ''}"`, `"${(description || '').replace(/"/g, '""')}"`, `"${start}"`, `"${end}"`, `"${duration}"`];
    });
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const rangeLabel = `${new Date(dateRange.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} - ${new Date(dateRange.end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    link.setAttribute('download', `Calendar Export (${rangeLabel}).csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Persist settings — debounce API key save until validated
  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    // Only persist once key looks valid (Clockify keys are 36+ chars)
    if (key.length > 20) {
      updateSettings({ clockify_api_key: key });
    }
  };

  const handleGoogleClientIdChange = (id: string) => {
    setGoogleClientId(id);
    updateSettings({ google_client_id: id });
  };

  const handleMicrosoftClientIdChange = (id: string) => {
    setMicrosoftClientId(id);
    updateSettings({ microsoft_client_id: id });
  };

  const handleCalendarTargetChange = (target: CalendarTarget) => {
    setCalendarTarget(target);
    updateSettings({ calendar_target: target });
  };

  const handleSyncModeChange = (mode: SyncMode) => {
    setSyncMode(mode);
    updateSettings({ sync_mode: mode });
  };

  const effectiveAiEnabled = globalAiEnabled && aiEnabled;

  const handleAiEnabledChange = (enabled: boolean) => {
    setAiEnabled(enabled);
    updateSettings({ ai_enabled: enabled });
  };

  const handleIncludeProjectChange = (include: boolean) => {
    setIncludeProjectInDescription(include);
    updateSettings({ include_project_in_description: include });
  };

  const handleToggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    updateSettings({ dark_mode: newTheme === 'dark' });
  };

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  const renderTimelineRange = () => (
    <div className="space-y-3">
      <div className="flex gap-1.5 flex-wrap">
        {[
          { label: 'Last Week', getRange: () => {
            const now = new Date();
            const dayOfWeek = now.getDay();
            const thisMonday = new Date(now);
            thisMonday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            const lastMonday = new Date(thisMonday);
            lastMonday.setDate(thisMonday.getDate() - 7);
            const lastFriday = new Date(lastMonday);
            lastFriday.setDate(lastMonday.getDate() + 4);
            return { start: lastMonday.toISOString().split('T')[0], end: lastFriday.toISOString().split('T')[0] };
          }},
          { label: 'This Week', getRange: () => {
            const now = new Date();
            const dayOfWeek = now.getDay();
            const monday = new Date(now);
            monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            const end = now < sunday ? now : sunday;
            return { start: monday.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
          }},
          { label: 'This Month', getRange: () => {
            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const d = String(now.getDate()).padStart(2, '0');
            return { start: `${y}-${m}-01`, end: `${y}-${m}-${d}` };
          }},
        ].map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            className="text-[9px] font-semibold uppercase tracking-wider flex-1 min-w-0 px-2 py-1 h-7"
            onClick={() => {
              const range = preset.getRange();
              setDateRange(range);
              fetchEntriesWithRange(range);
            }}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <div>
        <label className="block text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Start</label>
        <Input
          type="date"
          value={dateRange.start}
          onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
          className="bg-secondary/50"
        />
      </div>
      <div>
        <label className="block text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">End</label>
        <Input
          type="date"
          value={dateRange.end}
          onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
          className="bg-secondary/50"
        />
      </div>
      <Button
        onClick={fetchEntries}
        disabled={!selectedWorkspace || isFetching}
        className="w-full"
      >
        {isFetching ? (
          <><Clock className="w-4 h-4 animate-spin mr-2" />Processing</>
        ) : (
          <><Send className="w-4 h-4 mr-2" />Run Analysis</>
        )}
      </Button>
      <label className="flex items-center gap-2 cursor-pointer group px-1 py-1.5 rounded-lg hover:bg-secondary/50 transition-colors">
        <input
          type="checkbox"
          checked={defaultLastWeek}
          onChange={(e) => {
            setDefaultLastWeek(e.target.checked);
            updateSettings({ default_last_week: e.target.checked });
          }}
          className="w-3.5 h-3.5 rounded accent-primary"
        />
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest group-hover:text-foreground transition-colors">
          Auto-load This week
        </span>
      </label>
    </div>
  );

  if (!settingsLoading && settings.banned) {
    return (
      <div className="min-h-screen flex flex-col bg-background font-sans antialiased text-foreground animate-page-enter">
        <Header
          theme={theme}
          onToggleTheme={handleToggleTheme}
          selectedCount={0}
          totalDuration="00:00:00"
          onOpenReport={() => {}}
          hasEntries={false}
        />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-2xl flex items-center justify-center">
              <Clock className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold">Account Suspended</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your account has been suspended. Please contact an administrator for assistance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!settingsLoading && !settings.approved) {
    return (
      <div className="min-h-screen flex flex-col bg-background font-sans antialiased text-foreground animate-page-enter">
        <Header
          theme={theme}
          onToggleTheme={handleToggleTheme}
          selectedCount={0}
          totalDuration="00:00:00"
          onOpenReport={() => {}}
          hasEntries={false}
        />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Account Pending Approval</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your account is awaiting admin approval. You'll have full access once an administrator approves your account.
            </p>
            <p className="text-[10px] text-muted-foreground/60 italic">
              GoCanvas employees are approved automatically.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col bg-background font-sans antialiased text-foreground transition-colors duration-500 animate-page-enter"
    >
      <Header
        theme={theme}
        onToggleTheme={handleToggleTheme}
        selectedCount={selectedEntries.size}
        totalDuration={grandTotalDuration}
        onOpenReport={() => setReportOpen(true)}
        hasEntries={entries.length > 0}
        onOpenTeamReport={() => setTeamReportOpen(true)}
        isTeamLead={isTeamLead}
      />

      <main className={`mx-auto w-full flex-1 ${
        isMinimal ? 'max-w-[900px] px-6 py-6' :
        isCompact ? 'max-w-[1400px] px-2 py-2' :
        'max-w-[1400px] px-4 py-4'
      } ${isTopNav ? '' : 'grid grid-cols-1 lg:grid-cols-12'} ${isCompact ? 'gap-2' : 'gap-4'}`}>

        {/* TopNav layout: collapsible settings bar */}
        {isTopNav && (
          <div className="mb-4">
            <button
              onClick={() => setSettingsCollapsed(!settingsCollapsed)}
              className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              {settingsCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
              Settings & Range
            </button>
            {!settingsCollapsed && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-scale">
                <Settings
                  apiKey={apiKey}
                  onApiKeyChange={handleApiKeyChange}
                  onClearApiKey={clearApiKey}
                  workspaces={workspaces}
                  selectedWorkspace={selectedWorkspace}
                  onWorkspaceSelect={setSelectedWorkspace}
                  onRefreshWorkspaces={fetchWorkspaces}
                  syncMode={syncMode}
                  onSyncModeChange={handleSyncModeChange}
                  calendarTarget={calendarTarget}
                  onCalendarTargetChange={handleCalendarTargetChange}
                  googleClientId={googleClientId}
                  onGoogleClientIdChange={handleGoogleClientIdChange}
                  isGoogleConnected={!!googleToken}
                  onConnectGoogle={connectGoogle}
                  microsoftClientId={microsoftClientId}
                  onMicrosoftClientIdChange={handleMicrosoftClientIdChange}
                  isMicrosoftConnected={!!microsoftToken}
                  onConnectMicrosoft={connectMicrosoft}
                  aiEnabled={effectiveAiEnabled}
                  globalAiEnabled={globalAiEnabled}
                  globalAutoApiEnabled={globalAutoApiEnabled}
                  onAiEnabledChange={handleAiEnabledChange}
                  includeProjectInDescription={includeProjectInDescription}
                  onIncludeProjectInDescriptionChange={handleIncludeProjectChange}
                />
                <div className="bg-card rounded-lg p-4 border border-border shadow-sm">
                   <h2 className="text-[11px] font-bold uppercase tracking-widest text-foreground mb-3 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    Timeline Range
                  </h2>
                  {renderTimelineRange()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sidebar — for non-topnav layouts */}
        {!isTopNav && (
          <aside
            className={`${isMinimal ? 'lg:col-span-4' : 'lg:col-span-3'} lg:sticky lg:top-[60px] lg:self-start lg:max-h-[calc(100vh-80px)] lg:overflow-y-auto lg:overflow-x-hidden scrollbar-gutter-stable ${
              hasSidebarColor ? 'sidebar-solid' : (isCompact ? 'space-y-2' : 'space-y-4')
            }`}
            {...(hasSidebarColor ? {
              style: {
                '--background': sidebarPreset.bg,
                '--foreground': sidebarPreset.fg,
                '--card': sidebarPreset.bg,
                '--card-foreground': sidebarPreset.fg,
                '--popover': sidebarPreset.card,
                '--popover-foreground': sidebarPreset.fg,
                '--secondary': sidebarPreset.card,
                '--secondary-foreground': sidebarPreset.fg,
                '--muted': sidebarPreset.card,
                '--muted-foreground': sidebarPreset.mutedFg,
                '--border': sidebarPreset.border,
                '--input': sidebarPreset.border,
                '--accent': sidebarPreset.card,
                '--accent-foreground': sidebarPreset.fg,
                '--primary': sidebarPreset.primary,
                '--primary-foreground': sidebarPreset.primaryFg,
                '--ring': sidebarPreset.primary,
                backgroundColor: `hsl(${sidebarPreset.bg})`,
                color: `hsl(${sidebarPreset.fg})`,
              } as React.CSSProperties
            } : {})}
          >
            <Settings
              apiKey={apiKey}
              onApiKeyChange={handleApiKeyChange}
              onClearApiKey={clearApiKey}
              workspaces={workspaces}
              selectedWorkspace={selectedWorkspace}
              onWorkspaceSelect={setSelectedWorkspace}
              onRefreshWorkspaces={fetchWorkspaces}
              syncMode={syncMode}
              onSyncModeChange={handleSyncModeChange}
              calendarTarget={calendarTarget}
              onCalendarTargetChange={handleCalendarTargetChange}
              googleClientId={googleClientId}
              onGoogleClientIdChange={handleGoogleClientIdChange}
              isGoogleConnected={!!googleToken}
              onConnectGoogle={connectGoogle}
              microsoftClientId={microsoftClientId}
              onMicrosoftClientIdChange={handleMicrosoftClientIdChange}
              isMicrosoftConnected={!!microsoftToken}
              onConnectMicrosoft={connectMicrosoft}
              aiEnabled={effectiveAiEnabled}
              globalAiEnabled={globalAiEnabled}
              globalAutoApiEnabled={globalAutoApiEnabled}
              onAiEnabledChange={handleAiEnabledChange}
              includeProjectInDescription={includeProjectInDescription}
              onIncludeProjectInDescriptionChange={handleIncludeProjectChange}
            />

            {/* Timeline Range */}
            <div className={`bg-card rounded-lg border border-border shadow-sm ${isCompact ? 'p-3' : 'p-4'}`}>
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-foreground mb-3 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Timeline Range
              </h2>
              {renderTimelineRange()}
            </div>
          </aside>
        )}

        {/* Main Content */}
        <div className={`${isTopNav ? '' : isMinimal ? 'lg:col-span-8' : 'lg:col-span-9'} ${isCompact ? 'space-y-2' : 'space-y-4'}`}>
          <div className="flex flex-col gap-5">
            <div className="flex items-end justify-between border-b border-border pb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold tracking-tight">Timeline</h2>
                {entries.length > 0 && (
                  <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-widest">
                    {entries.length} items discovered
                  </Badge>
                )}
              </div>
              <div className="flex bg-secondary p-1 rounded-lg border border-border">
                {([
                  { mode: 'grouped' as ViewMode, label: 'Grouped', icon: LayoutList },
                  { mode: 'list' as ViewMode, label: 'List', icon: LayoutList },
                  { mode: 'week' as ViewMode, label: 'Week', icon: CalendarDays },
                  { mode: 'month' as ViewMode, label: 'Month', icon: CalendarRange },
                ]).map(({ mode: m, label, icon: Icon }) => (
                  <button
                    key={m}
                    onClick={() => setViewMode(m)}
                    className={`px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-1 ${
                      viewMode === m ? 'bg-card shadow-md text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {entries.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4 p-4 bg-card rounded-lg border border-border shadow-sm">
                  <div className="flex-1 min-w-[280px] relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Filter: descriptions, tags, tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-secondary border-none rounded-lg pl-11 pr-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                    />
                  </div>
                  <div className="h-6 w-px bg-border hidden sm:block" />
                  <label className="flex items-center gap-2 cursor-pointer group px-3 py-2 hover:bg-secondary rounded-lg transition-all border border-transparent hover:border-border">
                    <input
                      type="checkbox"
                      checked={hideShortEntries}
                      onChange={(e) => setHideShortEntries(e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-primary"
                    />
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest group-hover:text-foreground transition-colors">
                      Hide &lt; 5m
                    </span>
                  </label>
                </div>

                {/* Project Chips */}
                <div className="flex flex-wrap items-center gap-1.5 px-1">
                  <button
                    onClick={() => toggleProjectFilter('all')}
                    className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest border transition-all ${
                      selectedProjects.includes('all')
                        ? 'bg-primary border-primary text-primary-foreground shadow-md'
                        : 'bg-card border-border text-muted-foreground hover:border-foreground/20'
                    }`}
                  >
                    All Projects
                  </button>
                  {projects.map((projectName) => (
                    <button
                      key={projectName}
                      onClick={() => toggleProjectFilter(projectName)}
                      className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest border transition-all ${
                        selectedProjects.includes(projectName)
                          ? 'bg-foreground text-background border-foreground shadow-md'
                          : 'bg-card border-border text-muted-foreground hover:border-foreground/20'
                      }`}
                    >
                      {projectName}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="min-h-[400px] pb-28">
            {entries.length === 0 ? (
              <div className="h-[400px] border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground text-center p-12 bg-card/10 transition-all">
                <div className="w-14 h-14 bg-secondary rounded-lg flex items-center justify-center mb-6 shadow-inner">
                  <Calendar className="w-7 h-7 opacity-20" />
                </div>
                <p className="text-lg font-bold text-foreground/70 mb-2 tracking-tight">Timeline Empty</p>
                <p className="text-xs max-w-[280px] leading-relaxed opacity-60 font-medium uppercase tracking-widest">
                  Connect your workspace and run a query range to begin sync operations.
                </p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground bg-card rounded-lg border border-border transition-all">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-6 text-muted-foreground">Zero results</p>
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedProjects(['all']);
                    setHideShortEntries(false);
                  }}
                  variant="default"
                  size="sm"
                >
                  Reset Filters
                </Button>
              </div>
            ) : (viewMode === 'week' || viewMode === 'month') ? (
              <CalendarView
                entries={filteredEntries}
                selectedEntries={selectedEntries}
                onToggleSelection={toggleSelection}
                mode={viewMode}
                workWeekDays={workWeekDays}
                dateRange={dateRange}
                onDateRangeChange={(range) => {
                  setDateRange(range);
                  fetchEntriesWithRange(range);
                }}
              />
            ) : (
              <div className="space-y-6">
                <div className="flex justify-end px-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                    className="h-6 gap-1.5 text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    {sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}
                  </Button>
                </div>
                {Object.entries(groupedEntries).map(([date, groupEntries]) => (
                  <div key={date} className="space-y-3">
                    <div className="flex items-center justify-between sticky top-[60px] z-20 bg-background/80 py-2.5 px-4 backdrop-blur-xl border-b border-border rounded-t-lg shadow-sm transition-all">
                      <div className="flex items-center gap-3">
                        <h3 className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">{date}</h3>
                        <div className="flex items-center gap-2 px-2.5 py-1 bg-card border border-border rounded-md shadow-sm">
                          <Clock className="w-2.5 h-2.5 text-primary" />
                          <span className="text-[9px] font-black tabular-nums text-foreground uppercase tracking-widest">
                            {calculateTotalDuration(groupEntries.filter((e) => selectedEntries.has(e.id)))}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleGroupSelection(groupEntries)}
                        className={`text-[8px] font-bold uppercase tracking-[0.2em] px-3.5 py-1.5 rounded-full transition-all border ${
                          groupEntries.every((e) => selectedEntries.has(e.id))
                            ? 'bg-secondary border-border text-muted-foreground hover:bg-secondary/80'
                            : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'
                        }`}
                      >
                        {groupEntries.every((e) => selectedEntries.has(e.id)) ? 'Deselect Block' : 'Select Block'}
                      </button>
                    </div>
                    <div className="grid gap-2 grid-cols-1">
                      {groupEntries.map((entry) => (
                        <EntryCard
                          key={entry.id}
                          entry={entry}
                          selected={selectedEntries.has(entry.id)}
                          aiEnabled={effectiveAiEnabled}
                          includeProjectInDescription={includeProjectInDescription}
                          viewMode={viewMode}
                          onToggle={toggleSelection}
                          onUpdateDescription={(id, desc) =>
                            setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, description: desc } : e)))
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <ActionBar
        selectedCount={selectedEntries.size}
        totalCount={entries.length}
        syncMode={syncMode}
        syncStatus={syncStatus}
        calendarTarget={calendarTarget}
        onSync={handleSync}
        onExportCSV={generateCSV}
        onClearSelection={() => setSelectedEntries(new Set())}
        onOpenReport={() => setReportOpen(true)}
        hasEntries={entries.length > 0}
      />

      <SyncToast syncStatus={syncStatus} onDismiss={() => setSyncStatus({ status: 'idle', message: '' })} />

      <TimesheetReport
        open={reportOpen}
        onOpenChange={setReportOpen}
        entries={filteredEntries}
        dateRange={dateRange}
      />

      {isTeamLead && (
        <TeamReport open={teamReportOpen} onOpenChange={setTeamReportOpen} />
      )}
    </div>
  );
}
