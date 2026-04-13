import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Clock, Activity, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';

interface TeamMemberSummary {
  user_id: string;
  display_name: string | null;
  email: string | null;
  role_in_team: string;
  total_syncs: number;
  total_entries: number;
  last_sync: string | null;
  history: { created_at: string; entries_count: number; status: string; sync_mode: string }[];
}

interface TeamReportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TeamReport({ open, onOpenChange }: TeamReportProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMemberSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('');

  const fetchTeamData = useCallback(async () => {
    if (!user || !open) return;
    setLoading(true);

    // Get teams the user leads
    const { data: myMemberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .eq('role_in_team', 'lead');

    if (!myMemberships?.length) {
      setMembers([]);
      setLoading(false);
      return;
    }

    const teamIds = myMemberships.map((m: any) => m.team_id);

    // Get team names
    const { data: teams } = await supabase.from('teams').select('id, name').in('id', teamIds);
    if (teams?.length) setTeamName(teams.map((t: any) => t.name).join(', '));

    // Get team members
    const { data: teamMembers } = await supabase
      .from('team_members')
      .select('user_id, role_in_team')
      .in('team_id', teamIds);

    if (!teamMembers?.length) {
      setMembers([]);
      setLoading(false);
      return;
    }

    const memberIds = teamMembers.map((m: any) => m.user_id);

    // Get profiles and sync history in parallel
    const [profilesRes, historyRes] = await Promise.all([
      supabase.from('profiles').select('user_id, display_name, email').in('user_id', memberIds),
      supabase.from('sync_history').select('*').in('user_id', memberIds).order('created_at', { ascending: false }),
    ]);

    const profileMap: Record<string, any> = {};
    (profilesRes.data || []).forEach((p: any) => { profileMap[p.user_id] = p; });

    const historyMap: Record<string, any[]> = {};
    (historyRes.data || []).forEach((h: any) => {
      if (!historyMap[h.user_id]) historyMap[h.user_id] = [];
      historyMap[h.user_id].push(h);
    });

    const roleMap: Record<string, string> = {};
    teamMembers.forEach((m: any) => { roleMap[m.user_id] = m.role_in_team; });

    const summaries: TeamMemberSummary[] = memberIds.map((uid: string) => {
      const history = historyMap[uid] || [];
      const profile = profileMap[uid] || {};
      return {
        user_id: uid,
        display_name: profile.display_name,
        email: profile.email,
        role_in_team: roleMap[uid] || 'member',
        total_syncs: history.length,
        total_entries: history.reduce((acc: number, h: any) => acc + (h.entries_count || 0), 0),
        last_sync: history.length > 0 ? history[0].created_at : null,
        history: history.slice(0, 20),
      };
    });

    // Sort: leads first, then by name
    summaries.sort((a, b) => {
      if (a.role_in_team === 'lead' && b.role_in_team !== 'lead') return -1;
      if (b.role_in_team === 'lead' && a.role_in_team !== 'lead') return 1;
      return (a.display_name || a.email || '').localeCompare(b.display_name || b.email || '');
    });

    setMembers(summaries);
    setLoading(false);
  }, [user, open]);

  useEffect(() => { fetchTeamData(); }, [fetchTeamData]);

  const totalEntries = members.reduce((s, m) => s + m.total_entries, 0);
  const totalSyncs = members.reduce((s, m) => s + m.total_syncs, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Team Report — {teamName || 'My Team'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading team data...</div>
        ) : members.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No team members found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-secondary/30 rounded-xl p-4 border border-border text-center">
                <p className="text-2xl font-black tabular-nums">{members.length}</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">Members</p>
              </div>
              <div className="bg-secondary/30 rounded-xl p-4 border border-border text-center">
                <p className="text-2xl font-black tabular-nums">{totalSyncs}</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">Total Syncs</p>
              </div>
              <div className="bg-secondary/30 rounded-xl p-4 border border-border text-center">
                <p className="text-2xl font-black tabular-nums">{totalEntries}</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">Entries Synced</p>
              </div>
            </div>

            {/* Member list */}
            <div className="space-y-2">
              {members.map((member) => {
                const isExpanded = expandedMember === member.user_id;
                return (
                  <Card key={member.user_id} className={`transition-all ${isExpanded ? 'ring-1 ring-primary/20' : ''}`}>
                    <CardContent className="p-0">
                      <button
                        onClick={() => setExpandedMember(isExpanded ? null : member.user_id)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/30 transition-colors rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black ${
                            member.role_in_team === 'lead' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                          }`}>
                            {(member.display_name || member.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold">{member.display_name || 'No name'}</p>
                            <p className="text-[10px] text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right mr-2">
                            <p className="text-xs font-bold tabular-nums">{member.total_entries} entries</p>
                            <p className="text-[10px] text-muted-foreground">{member.total_syncs} syncs</p>
                          </div>
                          {member.role_in_team === 'lead' && (
                            <Badge variant="default" className="text-[8px] font-bold uppercase tracking-widest">Lead</Badge>
                          )}
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                        </div>
                      </button>

                      {isExpanded && member.history.length > 0 && (
                        <div className="px-4 pb-4 border-t border-border pt-3">
                          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Recent Sync History</p>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {member.history.map((h, i) => (
                              <div key={i} className="flex items-center justify-between px-3 py-2 bg-secondary/20 rounded-lg text-[10px]">
                                <span className="text-muted-foreground">
                                  {new Date(h.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className="font-semibold tabular-nums">{h.entries_count} entries</span>
                                  <Badge variant={h.status === 'success' ? 'secondary' : 'destructive'} className="text-[8px]">
                                    {h.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                          {member.last_sync && (
                            <p className="text-[9px] text-muted-foreground mt-2 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Last sync: {new Date(member.last_sync).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      )}

                      {isExpanded && member.history.length === 0 && (
                        <div className="px-4 pb-4 border-t border-border pt-3">
                          <p className="text-xs text-muted-foreground text-center py-2">No sync history yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
