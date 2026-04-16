import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Shield, Users, Activity, Settings, Search,
  Crown, UserCheck, UserX, RefreshCw, Bell, BarChart3,
  Globe, Clock, Zap, ChevronDown, ChevronUp, CalendarDays, Palette,
  Ban, Trash2, AlertTriangle, Eye, Briefcase, Rss, Mail, MailOpen
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import ThemeGrid from '@/components/syncly/ThemeGrid';
import TeamManagement from '@/components/syncly/TeamManagement';

interface UserProfile {
  user_id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
  bio: string | null;
  last_sign_in_at: string | null;
}

interface TeamInfo {
  team_id: string;
  team_name: string;
  role_in_team: string;
}

interface UserWithRole extends UserProfile {
  roles: string[];
  approved: boolean;
  banned: boolean;
  teams: TeamInfo[];
}

interface AppSetting {
  id: string;
  key: string;
  value: any;
  updated_at: string;
}

type AdminTab = 'overview' | 'users' | 'teams' | 'settings' | 'activity' | 'themes' | 'notifications' | 'feed-test';

interface ParsedEvent {
  uid: string;
  summary: string;
  dtstart: string;
  dtend: string;
  date: string;
  time: string;
  duration: string;
}

function parseDtToReadable(dt: string): { date: string; time: string } {
  const m = dt.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (!m) return { date: dt, time: '' };
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
  return {
    date: d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  };
}

function calcDuration(start: string, end: string): string {
  const parse = (v: string) => {
    const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : 0;
  };
  const diff = Math.max(0, parse(end) - parse(start));
  const h = Math.floor(diff / 3600000);
  const min = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

function parseIcsEvents(ics: string): ParsedEvent[] {
  const blocks = ics.split('BEGIN:VEVENT').slice(1);
  return blocks.map((block) => {
    const get = (key: string) => {
      const line = block.split(/\r?\n/).find((l) => l.startsWith(key + ':') || l.startsWith(key + ';'));
      const raw = line?.replace(new RegExp(`^${key}[^:]*:`), '').trim() || '';
      return raw.replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
    };
    const dtstart = get('DTSTART');
    const dtend = get('DTEND');
    const { date, time } = parseDtToReadable(dtstart);
    return {
      uid: get('UID'),
      summary: get('SUMMARY'),
      dtstart,
      dtend,
      date,
      time,
      duration: calcDuration(dtstart, dtend),
    };
  });
}

function FeedTestPanel({ userId }: { userId?: string }) {
  const [feedData, setFeedData] = useState<{ token: string; range: string } | null>(null);
  const [icsText, setIcsText] = useState<string | null>(null);
  const [events, setEvents] = useState<ParsedEvent[]>([]);
  const [testLoading, setTestLoading] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [rangeUpdating, setRangeUpdating] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('calendar_feeds')
      .select('feed_token, feed_range')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (data) setFeedData({ token: data.feed_token, range: data.feed_range });
      });
  }, [userId]);

  const updateRange = async (range: string) => {
    if (!userId || !feedData) return;
    setRangeUpdating(true);
    setFeedData({ ...feedData, range });
    await supabase
      .from('calendar_feeds')
      .update({ feed_range: range })
      .eq('user_id', userId);
    setRangeUpdating(false);
  };

  const fetchFeed = async () => {
    if (!feedData) return;
    setTestLoading(true);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/calendar-feed?token=${feedData.token}`);
      const text = await res.text();
      setIcsText(text);
      setEvents(parseIcsEvents(text));
      setFetchedAt(new Date().toLocaleTimeString());
    } catch {
      setIcsText('Error fetching feed');
      setEvents([]);
    }
    setTestLoading(false);
  };

  const rangeOptions = [
    { value: 'day', label: 'Today' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold">Calendar Feed Test</h2>
        <Badge variant="outline" className="text-[9px] uppercase tracking-widest">Temporary</Badge>
      </div>

      {!feedData ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">No calendar feed found for your account. Enable it from the Dashboard first.</CardContent></Card>
      ) : (
        <>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex bg-secondary p-1 rounded-lg border border-border">
              {rangeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateRange(opt.value)}
                  disabled={rangeUpdating}
                  className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${
                    feedData.range === opt.value
                      ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Badge variant="secondary" className="text-xs">Token: {feedData.token.slice(0, 8)}…</Badge>
            {fetchedAt && <span className="text-xs text-muted-foreground">Fetched at {fetchedAt}</span>}
            {fetchedAt && <span className="text-xs text-muted-foreground">Fetched at {fetchedAt}</span>}
            <Button size="sm" onClick={fetchFeed} disabled={testLoading} className="rounded-xl">
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${testLoading ? 'animate-spin' : ''}`} />
              {testLoading ? 'Fetching…' : 'Fetch Feed'}
            </Button>
          </div>

          {icsText !== null && (() => {
            const rangeLabel = feedData.range === 'day' ? 'Today' : feedData.range === 'week' ? 'This Week' : 'This Month';
            const dates = events.map(e => e.dtstart).filter(Boolean).sort();
            const earliest = dates.length > 0 ? parseDtToReadable(dates[0]).date : '—';
            const latest = dates.length > 0 ? parseDtToReadable(dates[dates.length - 1]).date : '—';
            return (
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-6 text-xs flex-wrap">
                    <div><span className="text-muted-foreground">Filter:</span> <strong>{rangeLabel}</strong></div>
                    <div><span className="text-muted-foreground">Entries returned:</span> <strong>{events.length}</strong></div>
                    {events.length > 0 && (
                      <div><span className="text-muted-foreground">Date span:</span> <strong>{earliest}</strong> → <strong>{latest}</strong></div>
                    )}
                    {events.length > 0 && dates.length === events.length && new Set(events.map(e => e.date)).size <= 2 && feedData.range === 'month' && (
                      <Badge variant="outline" className="text-[9px] text-amber-500 border-amber-500/30">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Stored data only covers {new Set(events.map(e => e.date)).size} day(s) — re-export a full month from Dashboard
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {icsText !== null && events.length === 0 && (
            <Card>
              <CardContent className="p-10 text-center">
                <CalendarDays className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm font-semibold mb-1">No entries for this range</p>
                <p className="text-xs text-muted-foreground">
                  The feed returned no events for <strong>{feedData.range === 'day' ? 'Today' : feedData.range === 'week' ? 'This Week' : 'This Month'}</strong>.
                  This means no exported entries fall within this period.
                </p>
              </CardContent>
            </Card>
          )}

          {events.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  Parsed Events
                  <Badge className="text-[9px]">{events.length} entries</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[400px]">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold">Date</th>
                        <th className="text-left px-4 py-2 font-semibold">Time</th>
                        <th className="text-left px-4 py-2 font-semibold">Summary</th>
                        <th className="text-left px-4 py-2 font-semibold">Duration</th>
                        <th className="text-left px-4 py-2 font-semibold">UID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((e, i) => (
                        <tr key={i} className="border-t border-border/50 hover:bg-muted/30">
                          <td className="px-4 py-2 whitespace-nowrap">{e.date}</td>
                          <td className="px-4 py-2 whitespace-nowrap">{e.time}</td>
                          <td className="px-4 py-2">{e.summary}</td>
                          <td className="px-4 py-2 whitespace-nowrap">{e.duration}</td>
                          <td className="px-4 py-2 text-muted-foreground truncate max-w-[150px]">{e.uid}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {icsText && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Raw ICS Output</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  readOnly
                  value={icsText}
                  className="font-mono text-[10px] min-h-[200px] max-h-[400px]"
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const { isAdmin, isManager, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const canAccess = isAdmin || isManager;

  // Allow navigating to a specific tab via location state
  const initialTab = (location.state as any)?.tab as AdminTab | undefined;
  const [tab, setTab] = useState<AdminTab>(initialTab || 'overview');
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [appSettings, setAppSettings] = useState<AppSetting[]>([]);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'ban' | 'delete'; userId: string; name: string } | null>(null);
  const [announcements, setAnnouncements] = useState<{ id: string; message: string; type: string; active: boolean; created_at: string }[]>([]);
  const [myReadIds, setMyReadIds] = useState<Set<string>>(new Set());
  const [newAnnouncementMsg, setNewAnnouncementMsg] = useState('');
  const [newAnnouncementType, setNewAnnouncementType] = useState('info');
  const [adminReadKeys, setAdminReadKeys] = useState<Set<string>>(new Set());
  const [adminAlerts, setAdminAlerts] = useState<{ id: string; label: string; count: number }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [profilesRes, rolesRes, settingsRes, historyRes, userSettingsRes, teamsRes, teamMembersRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('user_roles').select('*'),
      supabase.from('app_settings').select('*'),
      supabase.from('sync_history').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('user_settings').select('user_id, approved, banned'),
      supabase.from('teams').select('*'),
      supabase.from('team_members').select('*'),
    ]);

    // Build team lookup: user_id -> TeamInfo[]
    const teamMap: Record<string, TeamInfo[]> = {};
    if (teamsRes.data && teamMembersRes.data) {
      const teamsById: Record<string, string> = {};
      (teamsRes.data as any[]).forEach((t) => { teamsById[t.id] = t.name; });
      (teamMembersRes.data as any[]).forEach((m: any) => {
        if (!teamMap[m.user_id]) teamMap[m.user_id] = [];
        teamMap[m.user_id].push({ team_id: m.team_id, team_name: teamsById[m.team_id] || 'Unknown', role_in_team: m.role_in_team });
      });
    }

    if (profilesRes.data && rolesRes.data) {
      const rolesMap: Record<string, string[]> = {};
      (rolesRes.data as any[]).forEach((r) => {
        if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
        rolesMap[r.user_id].push(r.role);
      });

      const approvalMap: Record<string, { approved: boolean; banned: boolean }> = {};
      if (userSettingsRes.data) {
        (userSettingsRes.data as any[]).forEach((s: any) => {
          approvalMap[s.user_id] = { approved: s.approved, banned: s.banned ?? false };
        });
      }

      const enriched: UserWithRole[] = (profilesRes.data as any[]).map((p) => ({
        ...p,
        roles: rolesMap[p.user_id] || ['user'],
        approved: approvalMap[p.user_id]?.approved ?? false,
        banned: approvalMap[p.user_id]?.banned ?? false,
        teams: teamMap[p.user_id] || [],
      }));
      setUsers(enriched);
    }

    if (settingsRes.data) setAppSettings(settingsRes.data as any);
    if (historyRes.data) setSyncHistory(historyRes.data);
    setLoading(false);
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    const [annRes, readsRes] = await Promise.all([
      supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(50),
      user ? supabase.from('notification_reads').select('announcement_id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
    ]);
    if (annRes.data) setAnnouncements(annRes.data as any);
    if (readsRes.data) setMyReadIds(new Set((readsRes.data as any[]).map((r) => r.announcement_id)));
  }, [user]);

  const fetchAdminAlerts = useCallback(async () => {
    if (!user) return;
    // Fetch read keys
    const { data: readData } = await supabase
      .from('admin_notification_reads')
      .select('notification_key')
      .eq('user_id', user.id);
    if (readData) setAdminReadKeys(new Set(readData.map((r: any) => r.notification_key)));

    // Build alerts
    const alerts: { id: string; label: string; count: number }[] = [];
    const { count: pendingCount } = await supabase
      .from('user_settings')
      .select('*', { count: 'exact', head: true })
      .eq('approved', false)
      .eq('banned', false);
    if (pendingCount && pendingCount > 0) {
      alerts.push({ id: 'pending', label: `${pendingCount} user${pendingCount > 1 ? 's' : ''} pending approval`, count: pendingCount });
    }
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: newCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday);
    if (newCount && newCount > 0) {
      alerts.push({ id: 'new_registrations', label: `${newCount} new registration${newCount > 1 ? 's' : ''} today`, count: newCount });
    }
    const { data: allProfiles } = await supabase.from('profiles').select('user_id');
    const { data: teamedUsers } = await supabase.from('team_members').select('user_id');
    if (allProfiles && teamedUsers) {
      const teamedSet = new Set(teamedUsers.map((t: any) => t.user_id));
      const unteamedCount = allProfiles.filter((p: any) => !teamedSet.has(p.user_id)).length;
      if (unteamedCount > 0) {
        alerts.push({ id: 'unteamed', label: `${unteamedCount} user${unteamedCount > 1 ? 's' : ''} without a team`, count: unteamedCount });
      }
    }
    setAdminAlerts(alerts);
  }, [user]);

  const toggleAdminAlertRead = async (alertId: string) => {
    if (!user) return;
    const isRead = adminReadKeys.has(alertId);
    if (isRead) {
      await supabase.from('admin_notification_reads').delete().eq('user_id', user.id).eq('notification_key', alertId);
      setAdminReadKeys((prev) => { const next = new Set(prev); next.delete(alertId); return next; });
      toast({ title: 'Marked as unread', description: 'This alert will reappear in the bell.' });
    } else {
      await supabase.from('admin_notification_reads').insert({ user_id: user.id, notification_key: alertId } as any);
      setAdminReadKeys((prev) => new Set(prev).add(alertId));
      toast({ title: 'Marked as read' });
    }
  };

  useEffect(() => {
    if (canAccess) {
      fetchData();
      fetchAnnouncements();
      fetchAdminAlerts();
    }
  }, [canAccess, fetchData, fetchAnnouncements, fetchAdminAlerts]);

  const postAnnouncement = async () => {
    if (!newAnnouncementMsg.trim()) return;
    const { error } = await supabase.from('announcements').insert({
      message: newAnnouncementMsg.trim(),
      type: newAnnouncementType,
      active: true,
      created_by: user?.id,
    } as any);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Announcement posted' });
      setNewAnnouncementMsg('');
      fetchAnnouncements();
    }
  };

  const toggleAnnouncementActive = async (id: string, active: boolean) => {
    await supabase.from('announcements').update({ active: !active } as any).eq('id', id);
    fetchAnnouncements();
  };

  const deleteAnnouncement = async (id: string) => {
    await supabase.from('announcements').delete().eq('id', id);
    fetchAnnouncements();
  };

  const toggleMyRead = async (announcementId: string) => {
    if (!user) return;
    const isRead = myReadIds.has(announcementId);
    if (isRead) {
      await supabase.from('notification_reads').delete().eq('user_id', user.id).eq('announcement_id', announcementId);
      setMyReadIds((prev) => { const next = new Set(prev); next.delete(announcementId); return next; });
      toast({ title: 'Marked as unread', description: 'This notification will appear again.' });
    } else {
      await supabase.from('notification_reads').insert({ user_id: user.id, announcement_id: announcementId } as any);
      setMyReadIds((prev) => new Set(prev).add(announcementId));
      toast({ title: 'Marked as read' });
    }
  };

  const toggleAdminRole = async (targetUserId: string, currentRoles: string[]) => {
    if (targetUserId === user?.id) {
      toast({ title: 'Cannot modify', description: "You can't change your own admin role.", variant: 'destructive' });
      return;
    }

    const hasAdmin = currentRoles.includes('admin');

    if (hasAdmin) {
      await supabase.from('user_roles').delete().eq('user_id', targetUserId).eq('role', 'admin');
      toast({ title: 'Role updated', description: 'Admin role removed.' });
    } else {
      await supabase.from('user_roles').insert({ user_id: targetUserId, role: 'admin' } as any);
      toast({ title: 'Role updated', description: 'Admin role granted.' });
    }
    fetchData();
  };

  const toggleManagerRole = async (targetUserId: string, currentRoles: string[]) => {
    if (targetUserId === user?.id) {
      toast({ title: 'Cannot modify', description: "You can't change your own role.", variant: 'destructive' });
      return;
    }
    const hasManager = currentRoles.includes('manager');
    if (hasManager) {
      await supabase.from('user_roles').delete().eq('user_id', targetUserId).eq('role', 'manager');
      toast({ title: 'Role updated', description: 'Manager role removed.' });
    } else {
      await supabase.from('user_roles').insert({ user_id: targetUserId, role: 'manager' } as any);
      toast({ title: 'Role updated', description: 'Manager role granted.' });
    }
    fetchData();
  };

  const toggleApproval = async (targetUserId: string, currentlyApproved: boolean) => {
    const { error } = await supabase
      .from('user_settings')
      .update({ approved: !currentlyApproved } as any)
      .eq('user_id', targetUserId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: currentlyApproved ? 'Access revoked' : 'User approved', description: currentlyApproved ? 'User can no longer access the app.' : 'User now has full access.' });
      fetchData();
    }
  };

  const toggleBan = async (targetUserId: string, currentlyBanned: boolean) => {
    if (targetUserId === user?.id) {
      toast({ title: 'Cannot modify', description: "You can't ban yourself.", variant: 'destructive' });
      return;
    }
    const { error } = await supabase
      .from('user_settings')
      .update({ banned: !currentlyBanned, approved: false } as any)
      .eq('user_id', targetUserId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: currentlyBanned ? 'User unbanned' : 'User banned', description: currentlyBanned ? 'User can now request access again.' : 'User has been banned from the platform.' });
      fetchData();
    }
  };

  const deleteUser = async (targetUserId: string) => {
    if (targetUserId === user?.id) {
      toast({ title: 'Cannot delete', description: "You can't delete yourself.", variant: 'destructive' });
      return;
    }
    // Delete user data from all tables
    const results = await Promise.all([
      supabase.from('user_settings').delete().eq('user_id', targetUserId),
      supabase.from('user_roles').delete().eq('user_id', targetUserId),
      supabase.from('sync_history').delete().eq('user_id', targetUserId),
      supabase.from('profiles').delete().eq('user_id', targetUserId),
    ]);
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      toast({ title: 'Partial error', description: 'Some user data could not be removed.', variant: 'destructive' });
    } else {
      toast({ title: 'User deleted', description: 'All user data has been removed.' });
    }
    setConfirmAction(null);
    fetchData();
  };

  const updateAppSetting = async (key: string, value: any) => {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value, updated_by: user?.id } as any, { onConflict: 'key' });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Setting updated' });
      fetchData();
    }
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-80">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 mx-auto mb-6 text-destructive opacity-40" />
            <h2 className="text-2xl font-bold mb-3">Access Denied</h2>
            <p className="text-muted-foreground text-sm mb-6">You don't have admin privileges.</p>
            <Button onClick={() => navigate('/')} variant="outline">Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredUsers = users.filter((u) =>
    (u.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUsers = users.length;
  const totalAdmins = users.filter((u) => u.roles.includes('admin')).length;
  const totalSyncs = syncHistory.length;
  const totalEntries = syncHistory.reduce((acc: number, h: any) => acc + (h.entries_count || 0), 0);

  const announcementSetting = appSettings.find((s) => s.key === 'announcement');
  const registrationSetting = appSettings.find((s) => s.key === 'registration_enabled');
  const workWeekSetting = appSettings.find((s) => s.key === 'work_week_days');
  const aiRefinementSetting = appSettings.find((s) => s.key === 'ai_refinement_enabled');
  const autoApiSetting = appSettings.find((s) => s.key === 'auto_api_enabled');
  const calendarSubscribeSetting = appSettings.find((s) => s.key === 'calendar_subscribe_enabled');

  const unreadAdminAlerts = adminAlerts.filter((a) => !adminReadKeys.has(a.id));
  const notifBadgeCount = unreadAdminAlerts.length + announcements.filter((a) => a.active && !myReadIds.has(a.id)).length;

  const tabs: { key: AdminTab; label: string; icon: any; badge?: number }[] = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'notifications', label: 'Notifications', icon: Bell, badge: notifBadgeCount > 0 ? notifBadgeCount : undefined },
    { key: 'teams', label: 'Teams', icon: Users },
    { key: 'themes', label: 'Themes', icon: Palette },
    { key: 'activity', label: 'Activity', icon: Activity },
    { key: 'settings', label: 'Settings', icon: Settings },
    ...(isAdmin ? [{ key: 'feed-test' as AdminTab, label: 'Feed Test', icon: Rss }] : []),
  ];

  return (
    <div className="min-h-screen bg-background font-sans antialiased text-foreground animate-page-enter">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-background/75 backdrop-blur-2xl border-b border-border px-8 py-5">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-2xl" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight leading-none">Admin Panel</h1>
                <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-bold mt-0.5">System Management</p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={fetchData}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </nav>

      <main className="max-w-[1200px] mx-auto px-8 py-10">
        {/* Tabs */}
        <div className="flex bg-secondary p-1.5 rounded-xl border border-border mb-10 w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                tab === t.key
                  ? 'bg-card text-foreground shadow-lg ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {t.badge && (
                <span className="min-w-[16px] h-4 px-1 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {tab === 'overview' && (
              <div className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card className="border-border/50 shadow-lg">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-3xl font-black tabular-nums">{totalUsers}</p>
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">Total Users</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/50 shadow-lg">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 mx-auto mb-4 bg-accent/10 rounded-xl flex items-center justify-center">
                        <Crown className="w-6 h-6 text-accent" />
                      </div>
                      <p className="text-3xl font-black tabular-nums">{totalAdmins}</p>
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">Admins</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/50 shadow-lg">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 mx-auto mb-4 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                        <Activity className="w-6 h-6 text-emerald-500" />
                      </div>
                      <p className="text-3xl font-black tabular-nums">{totalSyncs}</p>
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">Total Syncs</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/50 shadow-lg">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 mx-auto mb-4 bg-orange-500/10 rounded-xl flex items-center justify-center">
                        <Zap className="w-6 h-6 text-orange-500" />
                      </div>
                      <p className="text-3xl font-black tabular-nums">{totalEntries}</p>
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">Entries Synced</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent users */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xs font-bold uppercase tracking-widest">Recent Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {users.slice(0, 5).map((u) => (
                        <div key={u.user_id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-sm font-black text-primary">
                              {(u.display_name || u.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{u.display_name || 'No name'}</p>
                              <p className="text-[10px] text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {u.roles.map((r) => (
                              <Badge key={r} variant={r === 'admin' ? 'default' : 'secondary'} className="text-[8px] font-bold uppercase tracking-widest">
                                {r}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Users Tab */}
            {tab === 'users' && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <Input
                      placeholder="Search users by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-14 bg-secondary/50 rounded-xl"
                    />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest px-4 py-2.5">
                    {filteredUsers.length} users
                  </Badge>
                </div>

                <div className="space-y-3">
                  {filteredUsers.map((u) => {
                    const isExpanded = expandedUser === u.user_id;
                    const isCurrentUser = u.user_id === user?.id;

                    return (
                      <Card key={u.user_id} className={`transition-all ${isExpanded ? 'ring-2 ring-primary/20' : ''}`}>
                        <CardContent className="p-0">
                          <button
                            onClick={() => setExpandedUser(isExpanded ? null : u.user_id)}
                            className="w-full flex items-center justify-between p-5 text-left hover:bg-secondary/30 transition-colors rounded-xl"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-base font-black shadow-lg ${
                                u.roles.includes('admin') ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                              }`}>
                                {(u.display_name || u.email || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold">{u.display_name || 'Anonymous'}</p>
                                  {isCurrentUser && (
                                    <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-widest">You</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">{u.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {u.banned ? (
                                <Badge variant="destructive" className="text-[8px] font-bold uppercase tracking-widest">
                                  <Ban className="w-2.5 h-2.5 mr-1" />Banned
                                </Badge>
                              ) : (
                                <Badge variant={u.approved ? 'outline' : 'destructive'} className="text-[8px] font-bold uppercase tracking-widest">
                                  {u.approved ? 'Approved' : 'Pending'}
                                </Badge>
                              )}
                              {u.roles.map((r) => (
                                <Badge key={r} variant={r === 'admin' ? 'default' : r === 'manager' ? 'default' : 'secondary'} className={`text-[8px] font-bold uppercase tracking-widest ${r === 'manager' ? 'bg-accent text-accent-foreground' : ''}`}>
                                  {r === 'admin' ? <Crown className="w-2.5 h-2.5 mr-1" /> : r === 'manager' ? <Eye className="w-2.5 h-2.5 mr-1" /> : <UserCheck className="w-2.5 h-2.5 mr-1" />}
                                  {r}
                                </Badge>
                              ))}
                              {u.teams.length > 0 && u.teams.map((t) => (
                                <HoverCard key={t.team_id} openDelay={200}>
                                  <HoverCardTrigger asChild>
                                    <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-widest cursor-pointer border-primary/30 hover:border-primary/60 transition-colors">
                                      <Users className="w-2.5 h-2.5 mr-1" />{t.team_name}
                                    </Badge>
                                  </HoverCardTrigger>
                                  <HoverCardContent className="w-64 p-4" align="end">
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-primary" />
                                        <p className="text-sm font-bold">{t.team_name}</p>
                                      </div>
                                      {(() => {
                                        const teamMembers = users.filter(u2 => u2.teams.some(t2 => t2.team_id === t.team_id));
                                        const lead = teamMembers.find(m => m.teams.find(t2 => t2.team_id === t.team_id)?.role_in_team === 'lead');
                                        const members = teamMembers.filter(m => m.teams.find(t2 => t2.team_id === t.team_id)?.role_in_team !== 'lead');
                                        return (
                                          <>
                                            {lead && (
                                              <div className="bg-primary/5 rounded-lg p-2 border border-primary/10">
                                                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">Team Lead</p>
                                                <p className="text-xs font-semibold">{lead.display_name || lead.email}</p>
                                              </div>
                                            )}
                                            <div>
                                              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5">Members ({members.length})</p>
                                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                                {members.map(m => (
                                                  <p key={m.user_id} className="text-xs text-muted-foreground">{m.display_name || m.email}</p>
                                                ))}
                                                {members.length === 0 && <p className="text-xs text-muted-foreground italic">No other members</p>}
                                              </div>
                                            </div>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                              ))}
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="px-5 pb-5 border-t border-border pt-5 space-y-5">
                              <div className="grid grid-cols-4 gap-4">
                                <div className="bg-secondary/30 rounded-xl p-4 border border-border">
                                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">Joined</p>
                                  <p className="text-sm font-semibold">{new Date(u.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                </div>
                                <div className="bg-secondary/30 rounded-xl p-4 border border-border">
                                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">Bio</p>
                                  <p className="text-sm font-semibold truncate">{u.bio || 'No bio'}</p>
                                </div>
                                <div className="bg-secondary/30 rounded-xl p-4 border border-border">
                                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">Roles</p>
                                  <p className="text-sm font-semibold">{u.roles.join(', ')}</p>
                                </div>
                                <div className="bg-secondary/30 rounded-xl p-4 border border-border">
                                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">Team</p>
                                  <p className="text-sm font-semibold truncate">{u.teams.length > 0 ? u.teams.map(t => t.team_name).join(', ') : 'No team'}</p>
                                </div>
                              </div>

                              {isAdmin && <div className="flex items-center gap-4 flex-wrap">
                                <Button
                                  variant={u.approved ? 'outline' : 'default'}
                                  size="sm"
                                  onClick={() => toggleApproval(u.user_id, u.approved)}
                                  className="rounded-xl"
                                >
                                  {u.approved ? (
                                    <><UserX className="w-3.5 h-3.5 mr-1.5" />Revoke Access</>
                                  ) : (
                                    <><UserCheck className="w-3.5 h-3.5 mr-1.5" />Approve User</>
                                  )}
                                </Button>
                                <Button
                                  variant={u.roles.includes('admin') ? 'destructive' : 'default'}
                                  size="sm"
                                  onClick={() => toggleAdminRole(u.user_id, u.roles)}
                                  disabled={isCurrentUser}
                                  className="rounded-xl"
                                >
                                  {u.roles.includes('admin') ? (
                                    <><UserX className="w-3.5 h-3.5 mr-1.5" />Revoke Admin</>
                                  ) : (
                                    <><Crown className="w-3.5 h-3.5 mr-1.5" />Grant Admin</>
                                  )}
                                </Button>
                                {isAdmin && (
                                  <Button
                                    variant={u.roles.includes('manager') ? 'outline' : 'secondary'}
                                    size="sm"
                                    onClick={() => toggleManagerRole(u.user_id, u.roles)}
                                    disabled={isCurrentUser}
                                    className="rounded-xl"
                                  >
                                    {u.roles.includes('manager') ? (
                                      <><Eye className="w-3.5 h-3.5 mr-1.5" />Revoke Manager</>
                                    ) : (
                                      <><Eye className="w-3.5 h-3.5 mr-1.5" />Grant Manager</>
                                    )}
                                  </Button>
                                )}
                                {!isCurrentUser && (
                                  <>
                                    <Button
                                      variant={u.banned ? 'outline' : 'destructive'}
                                      size="sm"
                                      onClick={() => toggleBan(u.user_id, u.banned)}
                                      className="rounded-xl"
                                    >
                                      {u.banned ? (
                                        <><Ban className="w-3.5 h-3.5 mr-1.5" />Unban</>
                                      ) : (
                                        <><Ban className="w-3.5 h-3.5 mr-1.5" />Ban User</>
                                      )}
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => setConfirmAction({ type: 'delete', userId: u.user_id, name: u.display_name || u.email || 'this user' })}
                                      className="rounded-xl"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />Delete
                                    </Button>
                                  </>
                                )}
                                {isCurrentUser && (
                                  <p className="text-[10px] text-muted-foreground italic">Cannot modify your own account</p>
                                )}
                              </div>}
                              {!isAdmin && isManager && (
                                <p className="text-[10px] text-muted-foreground italic flex items-center gap-1.5">
                                  <Eye className="w-3 h-3" />View-only access (Manager)
                                </p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Teams Tab */}
            {tab === 'teams' && (
              <TeamManagement />
            )}

            {/* Themes Tab */}
            {tab === 'themes' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                      <Palette className="w-4 h-4 text-primary" />
                      Theme Presets
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-4">
                      Choose a color theme. Your preference is saved automatically and applies instantly.
                    </p>
                    <ThemeGrid />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Activity Tab */}
            {tab === 'activity' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" />
                      Global Sync Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {syncHistory.length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground">
                        <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-sm font-medium">No activity yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {syncHistory.map((entry: any) => {
                          const entryUser = users.find((u) => u.user_id === entry.user_id);
                          return (
                            <div key={entry.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border hover:bg-secondary/50 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className={`w-2.5 h-2.5 rounded-full ${entry.status === 'success' ? 'bg-emerald-500' : 'bg-destructive'}`} />
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-black text-primary">
                                  {(entryUser?.display_name || entryUser?.email || '?').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold">{entryUser?.display_name || entryUser?.email || 'Unknown'}</p>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                                    {entry.entries_count} entries · {entry.sync_mode}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">
                                  {new Date(entry.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {new Date(entry.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Notifications Tab */}
            {tab === 'notifications' && (
              <div className="space-y-6">
                {/* Admin System Alerts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary" />
                      System Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {adminAlerts.length === 0 ? (
                      <p className="text-xs text-muted-foreground">All clear — no system alerts.</p>
                    ) : (
                      <>
                        {adminAlerts.filter((a) => !adminReadKeys.has(a.id)).length > 0 && (
                          <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                              Unread ({adminAlerts.filter((a) => !adminReadKeys.has(a.id)).length})
                            </label>
                            {adminAlerts.filter((a) => !adminReadKeys.has(a.id)).map((a) => (
                              <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border bg-primary/5 border-primary/20">
                                <Bell className="w-4 h-4 text-primary shrink-0" />
                                <span className="flex-1 text-xs font-medium text-foreground">{a.label}</span>
                                <Button variant="ghost" size="icon" className="w-7 h-7 shrink-0" onClick={() => toggleAdminAlertRead(a.id)} title="Mark as read">
                                  <MailOpen className="w-3.5 h-3.5 text-muted-foreground" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        {adminAlerts.filter((a) => adminReadKeys.has(a.id)).length > 0 && (
                          <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                              Read ({adminAlerts.filter((a) => adminReadKeys.has(a.id)).length})
                            </label>
                            {adminAlerts.filter((a) => adminReadKeys.has(a.id)).map((a) => (
                              <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-secondary/20 opacity-60">
                                <Bell className="w-4 h-4 text-muted-foreground shrink-0" />
                                <span className="flex-1 text-xs font-medium text-foreground">{a.label}</span>
                                <Button variant="ghost" size="icon" className="w-7 h-7 shrink-0" onClick={() => toggleAdminAlertRead(a.id)} title="Mark as unread">
                                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Announcement Notifications */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary" />
                      Announcement Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(() => {
                      const activeAnns = announcements.filter((a) => a.active);
                      const unread = activeAnns.filter((a) => !myReadIds.has(a.id));
                      const read = activeAnns.filter((a) => myReadIds.has(a.id));

                      if (activeAnns.length === 0) {
                        return <p className="text-xs text-muted-foreground">No active announcements.</p>;
                      }

                      return (
                        <div className="space-y-4">
                          {unread.length > 0 && (
                            <div className="space-y-2">
                              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                Unread ({unread.length})
                              </label>
                              {unread.map((a) => (
                                <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl border bg-primary/5 border-primary/20">
                                  <Mail className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-foreground">{a.message}</p>
                                    <p className="text-[9px] text-muted-foreground mt-1">
                                      {new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                      {' · '}
                                      <span className="capitalize">{a.type}</span>
                                    </p>
                                  </div>
                                  <Button variant="ghost" size="icon" className="w-7 h-7 shrink-0" onClick={() => toggleMyRead(a.id)} title="Mark as read">
                                    <MailOpen className="w-3.5 h-3.5 text-muted-foreground" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                          {read.length > 0 && (
                            <div className="space-y-2">
                              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                Read ({read.length})
                              </label>
                              {read.map((a) => (
                                <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-secondary/20 opacity-60">
                                  <MailOpen className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-foreground">{a.message}</p>
                                    <p className="text-[9px] text-muted-foreground mt-1">
                                      {new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                      {' · '}
                                      <span className="capitalize">{a.type}</span>
                                    </p>
                                  </div>
                                  <Button variant="ghost" size="icon" className="w-7 h-7 shrink-0" onClick={() => toggleMyRead(a.id)} title="Mark as unread">
                                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Settings Tab */}
            {tab === 'settings' && (
              <div className="space-y-6">
                {/* Feature Toggles */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                      <Settings className="w-4 h-4 text-primary" />
                      Feature Controls
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                      <div className="px-6 py-4 hover:bg-secondary/30 transition-colors">
                        <label className="flex items-center justify-between cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Zap className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">AI Refinement</p>
                              <p className="text-[10px] text-muted-foreground">Allow users to refine descriptions with AI</p>
                            </div>
                          </div>
                          <Switch
                            checked={aiRefinementSetting?.value?.enabled ?? true}
                            onCheckedChange={(checked) =>
                              updateAppSetting('ai_refinement_enabled', { ...aiRefinementSetting?.value, enabled: checked })
                            }
                          />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer ml-11 mt-2 px-3 py-2 rounded-lg bg-secondary/40">
                          <span className="text-[10px] font-medium text-muted-foreground">Admin Only</span>
                          <Switch
                            className="scale-75"
                            checked={aiRefinementSetting?.value?.admin_only ?? false}
                            onCheckedChange={(checked) =>
                              updateAppSetting('ai_refinement_enabled', { ...aiRefinementSetting?.value, admin_only: checked })
                            }
                          />
                        </label>
                      </div>
                      <div className="px-6 py-4 hover:bg-secondary/30 transition-colors">
                        <label className="flex items-center justify-between cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Activity className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">Auto API Sync</p>
                              <p className="text-[10px] text-muted-foreground">Show the Auto API sync mode option to users</p>
                            </div>
                          </div>
                          <Switch
                            checked={autoApiSetting?.value?.enabled ?? true}
                            onCheckedChange={(checked) =>
                              updateAppSetting('auto_api_enabled', { ...autoApiSetting?.value, enabled: checked })
                            }
                          />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer ml-11 mt-2 px-3 py-2 rounded-lg bg-secondary/40">
                          <span className="text-[10px] font-medium text-muted-foreground">Admin Only</span>
                          <Switch
                            className="scale-75"
                            checked={autoApiSetting?.value?.admin_only ?? false}
                            onCheckedChange={(checked) =>
                              updateAppSetting('auto_api_enabled', { ...autoApiSetting?.value, admin_only: checked })
                            }
                          />
                        </label>
                      </div>
                      <div className="px-6 py-4 hover:bg-secondary/30 transition-colors">
                        <label className="flex items-center justify-between cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Rss className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">Calendar Subscribe</p>
                              <p className="text-[10px] text-muted-foreground">Show the webcal subscribe feed option to users</p>
                            </div>
                          </div>
                          <Switch
                            checked={calendarSubscribeSetting?.value?.enabled ?? true}
                            onCheckedChange={(checked) =>
                              updateAppSetting('calendar_subscribe_enabled', { ...calendarSubscribeSetting?.value, enabled: checked })
                            }
                          />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer ml-11 mt-2 px-3 py-2 rounded-lg bg-secondary/40">
                          <span className="text-[10px] font-medium text-muted-foreground">Admin Only</span>
                          <Switch
                            className="scale-75"
                            checked={calendarSubscribeSetting?.value?.admin_only ?? false}
                            onCheckedChange={(checked) =>
                              updateAppSetting('calendar_subscribe_enabled', { ...calendarSubscribeSetting?.value, admin_only: checked })
                            }
                          />
                        </label>
                      </div>
                      <label className="flex items-center justify-between cursor-pointer px-6 py-4 hover:bg-secondary/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Globe className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">New Registrations</p>
                            <p className="text-[10px] text-muted-foreground">Control whether new users can sign up</p>
                          </div>
                        </div>
                        <Switch
                          checked={registrationSetting?.value?.enabled ?? true}
                          onCheckedChange={(checked) =>
                            updateAppSetting('registration_enabled', { enabled: checked })
                          }
                        />
                      </label>
                    </div>
                  </CardContent>
                </Card>

                {/* Defaults */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      Defaults
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Default Sync Mode</label>
                      <Select
                        value={appSettings.find((s) => s.key === 'default_sync_mode')?.value?.mode || 'manual'}
                        onValueChange={(value) =>
                          updateAppSetting('default_sync_mode', { mode: value })
                        }
                      >
                        <SelectTrigger className="bg-secondary/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual (ICS Export)</SelectItem>
                          <SelectItem value="auto">Auto (Google Calendar API)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground mt-1.5">Applied to new users on signup</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Calendar Work Week</label>
                      <div className="flex bg-secondary rounded-xl p-1">
                        {([
                          { value: '4', label: '4-Day', desc: 'Mon–Thu' },
                          { value: '5', label: '5-Day', desc: 'Mon–Fri' },
                          { value: '7', label: 'Full', desc: 'Mon–Sun' },
                        ] as const).map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => updateAppSetting('work_week_days', { days: parseInt(opt.value) })}
                            className={`flex-1 py-2.5 px-3 rounded-lg text-center transition-all ${
                              String(workWeekSetting?.value?.days ?? 5) === opt.value
                                ? 'bg-card text-foreground shadow-lg ring-1 ring-border'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <p className="text-xs font-bold">{opt.label}</p>
                            <p className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1.5">Days shown in the calendar week view for all users</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Announcement Banner */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary" />
                      Announcements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Post new announcement */}
                    <div className="space-y-3 p-4 bg-secondary/20 rounded-xl border border-border">
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest">New Announcement</label>
                      <Textarea
                        value={newAnnouncementMsg}
                        onChange={(e) => setNewAnnouncementMsg(e.target.value)}
                        placeholder="Enter announcement message..."
                        className="bg-secondary/50 min-h-[80px] resize-none"
                      />
                      <div className="flex items-center gap-3">
                        <Select value={newAnnouncementType} onValueChange={setNewAnnouncementType}>
                          <SelectTrigger className="bg-secondary/50 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="info">Info</SelectItem>
                            <SelectItem value="warning">Warning</SelectItem>
                            <SelectItem value="success">Success</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button onClick={postAnnouncement} disabled={!newAnnouncementMsg.trim()} size="sm" className="flex-1">
                          Post Announcement
                        </Button>
                      </div>
                    </div>

                    {/* Existing announcements */}
                    {announcements.length > 0 && (
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest">History</label>
                        {announcements.map((a) => (
                          <div key={a.id} className={`flex items-start gap-3 p-3 rounded-xl border ${a.active ? 'bg-primary/5 border-primary/20' : 'bg-secondary/20 border-border opacity-60'}`}>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground">{a.message}</p>
                              <p className="text-[9px] text-muted-foreground mt-1">
                                {new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                {' · '}
                                <span className="capitalize">{a.type}</span>
                                {' · '}
                                <span className={a.active ? 'text-emerald-500' : 'text-muted-foreground'}>{a.active ? 'Active' : 'Inactive'}</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => toggleAnnouncementActive(a.id, a.active)} title={a.active ? 'Deactivate' : 'Activate'}>
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => deleteAnnouncement(a.id)} title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Feed Test Tab */}
            {tab === 'feed-test' && isAdmin && <FeedTestPanel userId={user?.id} />}
          </>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete User
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to permanently delete <strong>{confirmAction?.name}</strong>? This will remove all their data and cannot be undone.
          </p>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => confirmAction && deleteUser(confirmAction.userId)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
