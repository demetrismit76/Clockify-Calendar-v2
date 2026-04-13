import { useState } from 'react';
import { ClockifyTimeEntry, ViewMode } from '@/types/syncly';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EntryCardProps {
  entry: ClockifyTimeEntry;
  onUpdateDescription: (id: string, newDesc: string) => void;
  selected: boolean;
  onToggle: (id: string) => void;
  aiEnabled: boolean;
  includeProjectInDescription: boolean;
  viewMode: ViewMode;
}

export default function EntryCard({
  entry, onUpdateDescription, selected, onToggle,
  aiEnabled, includeProjectInDescription, viewMode,
}: EntryCardProps) {
  const [isRefining, setIsRefining] = useState(false);
  const { toast } = useToast();

  const startTime = new Date(entry.timeInterval.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTime = entry.timeInterval.end
    ? new Date(entry.timeInterval.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Running';

  const getDurationParts = (isoDuration: string) => {
    if (!isoDuration) return { h: '', m: '', s: '' };
    const matches = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!matches) return { h: '', m: '', s: '' };
    return { h: matches[1] || '', m: matches[2] || '', s: matches[3] || '' };
  };

  const { h, m, s } = getDurationParts(entry.timeInterval.duration);

  const handleRefine = async () => {
    setIsRefining(true);
    try {
      const { data, error } = await supabase.functions.invoke('refine-description', {
        body: {
          description: entry.description,
          projectName: entry.projectName || 'Unassigned',
        },
      });

      if (error) throw error;
      if (data?.refinedTitle) {
        onUpdateDescription(entry.id, data.refinedTitle);
      }
    } catch (error: any) {
      toast({
        title: 'AI Refinement Failed',
        description: error.message || 'Could not refine description',
        variant: 'destructive',
      });
    } finally {
      setIsRefining(false);
    }
  };

  const getProjectAccent = (name: string = '') => {
    const colors = [
      'bg-blue-500', 'bg-indigo-500', 'bg-purple-500',
      'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
    ];
    return colors[name.length % colors.length];
  };

  const DurationBadge = () => (
    <div className="flex items-center justify-center bg-secondary text-muted-foreground px-2.5 h-[22px] min-w-[44px] rounded border border-border flex-shrink-0 whitespace-nowrap">
      <span className="text-[9px] font-bold tabular-nums leading-none">
        {h ? `${h}h ` : ''}{m ? `${m}m` : (!h && !m ? `${s}s` : '0m')}
      </span>
    </div>
  );

  const RefineButton = () =>
    aiEnabled ? (
      <button
        onClick={handleRefine}
        disabled={isRefining}
        className="p-1.5 rounded-lg text-primary hover:bg-primary/10 disabled:opacity-50 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
        title="Refine with AI"
      >
        {isRefining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
      </button>
    ) : null;

  const Checkbox = () => (
    <input
      type="checkbox"
      checked={selected}
      onChange={() => onToggle(entry.id)}
      className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer transition-transform group-hover:scale-105 flex-shrink-0 accent-primary"
    />
  );

  const ProjectTag = (className: string = '') => (
    <div className={`h-[22px] min-w-[100px] max-w-[140px] inline-flex items-center justify-center rounded shadow-sm overflow-hidden ${getProjectAccent(entry.projectName)} ${className}`}>
      <span className="text-[8px] font-extrabold uppercase tracking-[0.12em] text-white px-3 whitespace-nowrap leading-none text-center truncate w-full">
        {entry.projectName}
      </span>
    </div>
  );

  // List view
  if (viewMode === 'list') {
    return (
      <div className={`group relative transition-all duration-200 rounded-md flex items-center gap-4 border px-4 py-2 ${
        selected
          ? 'bg-primary/5 border-primary/30 shadow-sm ring-1 ring-primary/10'
          : 'bg-card border-border hover:border-border/80 shadow-sm'
      }`}>
        <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${selected ? 'bg-primary' : 'bg-primary/60'} rounded-l-md`} />
        <Checkbox />
        <div className="flex items-center gap-3 flex-shrink-0 text-xs font-bold text-muted-foreground tabular-nums">
          <span>{startTime}</span>
          <span className="text-border font-normal">—</span>
          <span>{endTime}</span>
        </div>
        <DurationBadge />
        <div className="flex-1 flex items-center gap-1.5 min-w-0 overflow-hidden">
          {includeProjectInDescription && entry.projectName && entry.projectName !== 'No Project' && (
            <span className="text-sm font-bold text-muted-foreground whitespace-nowrap flex-shrink-0 max-w-[40%] truncate">
              {entry.projectName} |
            </span>
          )}
          <input
            type="text"
            value={entry.description || ''}
            onChange={(e) => onUpdateDescription(entry.id, e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-sm font-bold text-foreground outline-none truncate text-left placeholder:text-muted-foreground/50"
            placeholder="No description recorded"
            title={entry.description || ''}
          />
          <RefineButton />
        </div>
        <div className="flex-shrink-0">{ProjectTag()}</div>
      </div>
    );
  }

  // Grouped view
  return (
    <div className={`group relative transition-all duration-200 rounded-md flex items-center gap-5 border px-5 py-3.5 ${
      selected
        ? 'bg-primary/5 border-primary/30 shadow-sm ring-1 ring-primary/10'
        : 'bg-card border-border hover:border-border/80 shadow-sm'
    }`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${selected ? 'bg-primary' : 'bg-primary/60'} rounded-l-md`} />
      <Checkbox />
      <div className="flex-1 flex flex-col min-w-0 gap-1.5">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {includeProjectInDescription && entry.projectName && entry.projectName !== 'No Project' && (
            <span className="text-base font-bold text-muted-foreground whitespace-nowrap flex-shrink-0 max-w-[40%] truncate">
              {entry.projectName} |
            </span>
          )}
          <input
            type="text"
            value={entry.description || ''}
            onChange={(e) => onUpdateDescription(entry.id, e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-base font-bold text-foreground outline-none truncate text-left tracking-tight"
            placeholder="Record description..."
            title={entry.description || ''}
          />
          <RefineButton />
        </div>
        <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground tabular-nums">
          <span>{startTime} — {endTime}</span>
          <DurationBadge />
        </div>
      </div>
      <div className="flex-shrink-0 text-right">{ProjectTag('h-[24px] rounded')}</div>
    </div>
  );
}
