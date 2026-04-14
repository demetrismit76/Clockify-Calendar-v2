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
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Shield, Users, Activity, Settings, Search,
  Crown, UserCheck, UserX, RefreshCw, Bell, BarChart3,
  Globe, Clock, Zap, ChevronDown, ChevronUp, CalendarDays, Palette,
  Ban, Trash2, AlertTriangle, Eye, Briefcase, Rss
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

type AdminTab = 'overview' | 'users' | 'teams' | 'settings' | 'activity' | 'themes';

export default function Admin() {
  const { user } = useAuth();
  const { isAdmin, isManager, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();
  const canAccess = isAdmin || isManager;

  const [tab, setTab] = useState<AdminTab>('overview');
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [appSettings, setAppSettings] = useState<AppSetting[]>([]);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'ban' | 'delete'; userId: string; name: string } | null>(null);

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

  useEffect(() => {
    if (canAccess) fetchData();
  }, [canAccess, fetchData]);

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

  const tabs: { key: AdminTab; label: string; icon: any }[] = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'teams', label: 'Teams', icon: Users },
    { key: 'themes', label: 'Themes', icon: Palette },
    { key: 'activity', label: 'Activity', icon: Activity },
    { key: 'settings', label: 'Settings', icon: Settings },
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
                      <label className="flex items-center justify-between cursor-pointer px-6 py-4 hover:bg-secondary/30 transition-colors">
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
                            updateAppSetting('ai_refinement_enabled', { enabled: checked })
                          }
                        />
                      </label>
                      <label className="flex items-center justify-between cursor-pointer px-6 py-4 hover:bg-secondary/30 transition-colors">
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
                            updateAppSetting('auto_api_enabled', { enabled: checked })
                          }
                        />
                      </label>
                      <label className="flex items-center justify-between cursor-pointer px-6 py-4 hover:bg-secondary/30 transition-colors">
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
                            updateAppSetting('calendar_subscribe_enabled', { enabled: checked })
                          }
                        />
                      </label>
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
                      Announcement Banner
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl hover:bg-secondary/30 transition-colors">
                      <span className="text-sm font-semibold">Show Banner</span>
                      <Switch
                        checked={announcementSetting?.value?.enabled || false}
                        onCheckedChange={(checked) =>
                          updateAppSetting('announcement', {
                            ...announcementSetting?.value,
                            enabled: checked,
                          })
                        }
                      />
                    </label>
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Message</label>
                      <Textarea
                        value={announcementSetting?.value?.message || ''}
                        onChange={(e) =>
                          updateAppSetting('announcement', {
                            ...announcementSetting?.value,
                            message: e.target.value,
                          })
                        }
                        placeholder="Enter announcement message..."
                        className="bg-secondary/50 min-h-[80px] resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Type</label>
                      <Select
                        value={announcementSetting?.value?.type || 'info'}
                        onValueChange={(value) =>
                          updateAppSetting('announcement', {
                            ...announcementSetting?.value,
                            type: value,
                          })
                        }
                      >
                        <SelectTrigger className="bg-secondary/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="success">Success</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
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
