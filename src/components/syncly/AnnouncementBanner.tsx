import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Info, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, X } from 'lucide-react';

interface Announcement {
  id: string;
  message: string;
  type: string;
  active: boolean;
  created_at: string;
}

const typeConfig: Record<string, { icon: React.ReactNode; bg: string; border: string; text: string }> = {
  info: {
    icon: <Info className="w-4 h-4 shrink-0" />,
    bg: 'bg-primary/5',
    border: 'border-primary/20',
    text: 'text-primary',
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4 shrink-0" />,
    bg: 'bg-amber-500/5',
    border: 'border-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
  },
  success: {
    icon: <CheckCircle className="w-4 h-4 shrink-0" />,
    bg: 'bg-emerald-500/5',
    border: 'border-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
};

export default function AnnouncementBanner() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [annRes, readsRes] = await Promise.all([
        supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('notification_reads')
          .select('announcement_id')
          .eq('user_id', user.id),
      ]);

      if (annRes.data) setAnnouncements(annRes.data as any);
      if (readsRes.data) {
        setReadIds(new Set((readsRes.data as any[]).map((r) => r.announcement_id)));
      }
    };

    fetchData();
  }, [user]);

  const markAsRead = async (announcementId: string) => {
    if (!user) return;
    setReadIds((prev) => new Set(prev).add(announcementId));
    await supabase
      .from('notification_reads')
      .insert({ user_id: user.id, announcement_id: announcementId } as any);
  };

  const activeAnnouncements = announcements.filter((a) => a.active && !readIds.has(a.id));
  const pastAnnouncements = announcements.filter((a) => !a.active);

  if (announcements.length === 0) return null;

  return (
    <div className="space-y-2">
      {activeAnnouncements.map((a) => {
        const config = typeConfig[a.type] || typeConfig.info;
        return (
          <div
            key={a.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${config.bg} ${config.border} ${config.text} animate-fade-scale`}
          >
            {config.icon}
            <p className="text-xs font-semibold flex-1 leading-relaxed">{a.message}</p>
            <button
              onClick={() => markAsRead(a.id)}
              className="opacity-50 hover:opacity-100 transition-opacity shrink-0"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}

      {pastAnnouncements.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors px-1 py-1"
          >
            {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Previous Announcements ({pastAnnouncements.length})
          </button>
          {showHistory && (
            <div className="space-y-1.5 mt-1 animate-fade-scale">
              {pastAnnouncements.map((a) => {
                const config = typeConfig[a.type] || typeConfig.info;
                return (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 px-4 py-2.5 rounded-lg border border-border bg-secondary/20 opacity-70"
                  >
                    <span className={config.text}>{config.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-relaxed">{a.message}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        {new Date(a.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
