import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users, Plus, Trash2, Crown, UserCheck, UserX, ChevronDown, ChevronUp, Pencil
} from 'lucide-react';

interface Team {
  id: string;
  name: string;
  created_at: string;
}

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role_in_team: string;
  joined_at: string;
}

interface UserProfile {
  user_id: string;
  display_name: string | null;
  email: string | null;
}

export default function TeamManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  
  // Create team
  const [createOpen, setCreateOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  
  // Add member
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addMemberTeamId, setAddMemberTeamId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'member' | 'lead'>('member');

  // Rename
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTeamId, setRenameTeamId] = useState('');
  const [renameValue, setRenameValue] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [teamsRes, membersRes, profilesRes] = await Promise.all([
      supabase.from('teams').select('*').order('created_at', { ascending: true }),
      supabase.from('team_members').select('*'),
      supabase.from('profiles').select('user_id, display_name, email'),
    ]);
    if (teamsRes.data) setTeams(teamsRes.data as any);
    if (membersRes.data) setMembers(membersRes.data as any);
    if (profilesRes.data) setProfiles(profilesRes.data as any);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getProfile = (userId: string) => profiles.find(p => p.user_id === userId);
  const getTeamMembers = (teamId: string) => members.filter(m => m.team_id === teamId);
  const assignedUserIds = new Set(members.map(m => m.user_id));
  const unassignedUsers = profiles.filter(p => !assignedUserIds.has(p.user_id));

  const createTeam = async () => {
    if (!newTeamName.trim()) return;
    const { error } = await supabase.from('teams').insert({ name: newTeamName.trim(), created_by: user?.id } as any);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Team created' });
      setCreateOpen(false);
      setNewTeamName('');
      fetchData();
    }
  };

  const deleteTeam = async (teamId: string) => {
    const { error } = await supabase.from('teams').delete().eq('id', teamId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Team deleted' });
      fetchData();
    }
  };

  const renameTeam = async () => {
    if (!renameValue.trim()) return;
    const { error } = await supabase.from('teams').update({ name: renameValue.trim() } as any).eq('id', renameTeamId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Team renamed' });
      setRenameOpen(false);
      fetchData();
    }
  };

  const addMember = async () => {
    if (!selectedUserId || !addMemberTeamId) return;
    
    // Insert team member
    const { error } = await supabase.from('team_members').insert({
      team_id: addMemberTeamId,
      user_id: selectedUserId,
      role_in_team: selectedRole,
    } as any);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    // If making them a lead, also grant team_lead role
    if (selectedRole === 'lead') {
      await supabase.from('user_roles').insert({ user_id: selectedUserId, role: 'team_lead' } as any);
    }

    toast({ title: 'Member added' });
    setAddMemberOpen(false);
    setSelectedUserId('');
    setSelectedRole('member');
    fetchData();
  };

  const removeMember = async (memberId: string, userId: string, roleInTeam: string) => {
    const { error } = await supabase.from('team_members').delete().eq('id', memberId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    // If they were a lead, remove team_lead role
    if (roleInTeam === 'lead') {
      await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'team_lead');
    }
    toast({ title: 'Member removed' });
    fetchData();
  };

  const toggleLeadRole = async (member: TeamMember) => {
    const newRole = member.role_in_team === 'lead' ? 'member' : 'lead';
    const { error } = await supabase.from('team_members').update({ role_in_team: newRole } as any).eq('id', member.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    if (newRole === 'lead') {
      // Check if they already have team_lead role
      const { data: existing } = await supabase.from('user_roles').select('id').eq('user_id', member.user_id).eq('role', 'team_lead' as any);
      if (!existing?.length) {
        await supabase.from('user_roles').insert({ user_id: member.user_id, role: 'team_lead' } as any);
      }
    } else {
      // Check if they lead any other teams
      const otherLeadTeams = members.filter(m => m.user_id === member.user_id && m.id !== member.id && m.role_in_team === 'lead');
      if (otherLeadTeams.length === 0) {
        await supabase.from('user_roles').delete().eq('user_id', member.user_id).eq('role', 'team_lead');
      }
    }

    toast({ title: `${newRole === 'lead' ? 'Promoted to lead' : 'Demoted to member'}` });
    fetchData();
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground text-sm">Loading teams...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest px-4 py-2.5">
          {teams.length} team{teams.length !== 1 ? 's' : ''}
        </Badge>
        <Button size="sm" className="rounded-xl" onClick={() => setCreateOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Create Team
        </Button>
      </div>

      {teams.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No teams yet. Create your first team to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {teams.map((team) => {
            const teamMembers = getTeamMembers(team.id);
            const leads = teamMembers.filter(m => m.role_in_team === 'lead');
            const isExpanded = expandedTeam === team.id;

            return (
              <Card key={team.id} className={`transition-all ${isExpanded ? 'ring-2 ring-primary/20' : ''}`}>
                <CardContent className="p-0">
                  <button
                    onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-secondary/30 transition-colors rounded-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-base font-black text-primary shadow-lg">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{team.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''} · {leads.length} lead{leads.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-border pt-5 space-y-4">
                      {/* Members list */}
                      {teamMembers.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">No members yet</p>
                      ) : (
                        <div className="space-y-2">
                          {teamMembers.map((member) => {
                            const profile = getProfile(member.user_id);
                            return (
                              <div key={member.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                                    member.role_in_team === 'lead' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                                  }`}>
                                    {(profile?.display_name || profile?.email || 'U').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold">{profile?.display_name || 'No name'}</p>
                                    <p className="text-[10px] text-muted-foreground">{profile?.email}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={member.role_in_team === 'lead' ? 'default' : 'secondary'}
                                    className="text-[8px] font-bold uppercase tracking-widest cursor-pointer"
                                    onClick={() => toggleLeadRole(member)}
                                  >
                                    {member.role_in_team === 'lead' ? <Crown className="w-2.5 h-2.5 mr-1" /> : <UserCheck className="w-2.5 h-2.5 mr-1" />}
                                    {member.role_in_team}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeMember(member.id, member.user_id, member.role_in_team)}
                                  >
                                    <UserX className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => {
                            setAddMemberTeamId(team.id);
                            setSelectedUserId('');
                            setSelectedRole('member');
                            setAddMemberOpen(true);
                          }}
                        >
                          <Plus className="w-3.5 h-3.5 mr-1.5" />
                          Add Member
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => {
                            setRenameTeamId(team.id);
                            setRenameValue(team.name);
                            setRenameOpen(true);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1.5" />
                          Rename
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="rounded-xl"
                          onClick={() => deleteTeam(team.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                          Delete Team
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Team Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Create Team</DialogTitle>
          </DialogHeader>
          <Input
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="Team name..."
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && createTeam()}
          />
          <DialogFooter>
            <Button size="sm" onClick={createTeam}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Team Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Rename Team</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="New name..."
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && renameTeam()}
          />
          <DialogFooter>
            <Button size="sm" onClick={renameTeam}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">User</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  {unassignedUsers.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.display_name || u.email || u.user_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {unassignedUsers.length === 0 && (
                <p className="text-[10px] text-muted-foreground mt-2 italic">All users are already assigned to a team</p>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Role</label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as 'member' | 'lead')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="lead">Team Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={addMember} disabled={!selectedUserId}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
