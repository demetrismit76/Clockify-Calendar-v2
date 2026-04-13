import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Shield, Clock, ArrowLeft, Save, Calendar, Activity, Palette } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ThemeGrid from '@/components/syncly/ThemeGrid';

interface ProfileData {
  display_name: string | null;
  email: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface SyncHistoryEntry {
  id: string;
  entries_count: number;
  sync_mode: string;
  status: string;
  created_at: string;
}

export default function Profile() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [profileRes, historyRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('sync_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      ]);
      if (profileRes.data) {
        setProfile(profileRes.data as any);
        setEditName(profileRes.data.display_name || '');
        setEditBio((profileRes.data as any).bio || '');
      }
      if (historyRes.data) {
        setSyncHistory(historyRes.data);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    
    // Update profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ display_name: editName, bio: editBio } as any)
      .eq('user_id', user.id);
    
    // Also update auth user metadata so Header picks it up
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: editName },
    });

    setSaving(false);
    const error = profileError || authError;
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated', description: 'Your changes have been saved.' });
      setProfile((prev) => prev ? { ...prev, display_name: editName, bio: editBio } : prev);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-80">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const totalSynced = syncHistory.reduce((acc, h) => acc + h.entries_count, 0);

  return (
    <div className="min-h-screen bg-background font-sans antialiased text-foreground animate-page-enter">
      {/* Header bar */}
      <nav className="sticky top-0 z-50 bg-background/75 backdrop-blur-2xl border-b border-border px-8 py-5">
        <div className="max-w-[900px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-2xl" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold tracking-tight">Profile</h1>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button variant="outline" size="sm" className="rounded-xl text-[10px] font-bold uppercase tracking-widest" onClick={() => navigate('/admin')}>
                <Shield className="w-3.5 h-3.5 mr-1.5" />
                Admin Panel
              </Button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-[900px] mx-auto px-8 py-12 space-y-10">
        {/* Profile Card */}
        <Card className="border-border/50 shadow-xl bg-card/80 backdrop-blur-xl overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/10" />
          <CardContent className="relative pt-0 pb-8 px-8">
            <div className="flex items-end gap-6 -mt-10">
              <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center text-3xl font-black text-primary-foreground shadow-xl border-4 border-card shrink-0">
                {(editName || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 pt-12">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold tracking-tight">{profile?.display_name || 'Anonymous'}</h2>
                  <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-widest">
                    {isAdmin ? 'Admin' : 'User'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mt-8">
              <div className="bg-secondary/50 rounded-xl p-5 text-center border border-border">
                <p className="text-2xl font-black tabular-nums text-foreground">{syncHistory.length}</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">Sync Sessions</p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-5 text-center border border-border">
                <p className="text-2xl font-black tabular-nums text-foreground">{totalSynced}</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">Entries Synced</p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-5 text-center border border-border">
                <p className="text-sm font-bold text-foreground leading-tight">{memberSince}</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">Member Since</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                <User className="w-3.5 h-3.5" />
              </div>
              Edit Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Display Name</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Your name" className="bg-secondary/50" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Bio</label>
              <Textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Tell us about yourself..." className="bg-secondary/50 min-h-[100px] resize-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Email</label>
              <Input value={user?.email || ''} disabled className="bg-secondary/30 opacity-60" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Theme */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                <Palette className="w-3.5 h-3.5" />
              </div>
              Theme
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ThemeGrid />
          </CardContent>
        </Card>

        {/* Sync History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <div className="p-1.5 bg-accent/10 rounded-lg text-accent">
                <Activity className="w-3.5 h-3.5" />
              </div>
              Recent Sync History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {syncHistory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-4 opacity-20" />
                <p className="text-sm font-medium">No sync history yet</p>
                <p className="text-xs opacity-60 mt-1">Start syncing to see your activity here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {syncHistory.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full ${entry.status === 'success' ? 'bg-emerald-500' : entry.status === 'error' ? 'bg-destructive' : 'bg-muted-foreground'}`} />
                      <div>
                        <p className="text-sm font-semibold">{entry.entries_count} entries</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{entry.sync_mode} sync</p>
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
