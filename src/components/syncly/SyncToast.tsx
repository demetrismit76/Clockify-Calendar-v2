import { useEffect } from 'react';
import { SyncStatusState } from '@/types/syncly';
import { Loader2, X, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface SyncToastProps {
  syncStatus: SyncStatusState;
  onDismiss: () => void;
}

export default function SyncToast({ syncStatus, onDismiss }: SyncToastProps) {
  // Auto-dismiss success/idle messages after 3 seconds
  useEffect(() => {
    if (syncStatus.status === 'success' || (syncStatus.status === 'idle' && syncStatus.message)) {
      const timer = setTimeout(onDismiss, 3000);
      return () => clearTimeout(timer);
    }
  }, [syncStatus.status, syncStatus.message, onDismiss]);

  if (!syncStatus.message) return null;

  const statusColors = {
    error: 'bg-destructive/10 border-destructive/30 text-destructive',
    loading: 'bg-primary/10 border-primary/30 text-primary',
    syncing: 'bg-primary/10 border-primary/30 text-primary',
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    idle: 'bg-secondary border-border text-muted-foreground',
  };

  return (
    <div className={`fixed bottom-8 right-8 z-50 px-8 py-4 rounded-xl border flex flex-col gap-3 transition-all shadow-2xl max-w-sm ${statusColors[syncStatus.status]}`}>
      <div className="flex items-center gap-4">
        {(syncStatus.status === 'loading' || syncStatus.status === 'syncing') && (
          <Loader2 className="w-4 h-4 animate-spin" />
        )}
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] flex-1">{syncStatus.message}</span>
        <button onClick={onDismiss} className="opacity-30 hover:opacity-100 transition-opacity">
          <X className="w-4 h-4" />
        </button>
      </div>
      {syncStatus.progress && (
        <Progress
          value={(syncStatus.progress.current / syncStatus.progress.total) * 100}
          className="h-1.5"
        />
      )}
    </div>
  );
}
