import { useEffect, useMemo, useState } from 'react';
import { ClockifyTimeEntry } from '@/types/syncly';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addDays, addWeeks, subWeeks, addMonths, subMonths, isSameDay, isSameMonth, isToday } from 'date-fns';

interface CalendarViewProps {
  entries: ClockifyTimeEntry[];
  selectedEntries: Set<string>;
  onToggleSelection: (id: string) => void;
  mode: 'week' | 'month';
  workWeekDays?: number;
  onDateRangeChange?: (range: { start: string; end: string }) => void;
  dateRange?: { start: string; end: string };
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6am to 9pm

function parseDurationSeconds(duration: string): number {
  const m = (duration || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] || '0') * 3600) + (parseInt(m[2] || '0') * 60) + (parseInt(m[3] || '0'));
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Hash a string to a hue value for consistent project colors
function projectHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

export default function CalendarView({ entries, selectedEntries, onToggleSelection, mode, workWeekDays = 5, onDateRangeChange, dateRange }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => {
    // Initialize from the sidebar's date range start if provided
    if (dateRange?.start) {
      const d = new Date(dateRange.start + 'T00:00:00');
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });

  // Sync with external dateRange changes (e.g. sidebar preset clicks)
  useEffect(() => {
    if (dateRange?.start) {
      const d = new Date(dateRange.start + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        if (mode === 'month') {
          setCurrentDate(startOfMonth(d));
        } else {
          // For week mode, use the exact start date from the range
          setCurrentDate(d);
        }
      }
    }
  }, [dateRange?.start, mode]);

  const navigate = (newDate: Date) => {
    setCurrentDate(newDate);
    if (onDateRangeChange) {
      let start: Date, end: Date;
      if (mode === 'week') {
        start = newDate;
        end = addDays(start, workWeekDays - 1);
      } else {
        start = startOfMonth(newDate);
        end = endOfMonth(newDate);
      }
      onDateRangeChange({
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd'),
      });
    }
  };

  const navigateBack = () => {
    navigate(mode === 'week' ? addDays(currentDate, -workWeekDays) : subMonths(currentDate, 1));
  };
  const navigateForward = () => {
    navigate(mode === 'week' ? addDays(currentDate, workWeekDays) : addMonths(currentDate, 1));
  };
  const goToday = () => navigate(new Date());

  // Group entries by date string
  const entriesByDate = useMemo(() => {
    const map: Record<string, ClockifyTimeEntry[]> = {};
    entries.forEach(e => {
      const key = format(new Date(e.timeInterval.start), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [entries]);

  if (mode === 'week') {
    return <WeekView currentDate={currentDate} entriesByDate={entriesByDate} selectedEntries={selectedEntries} onToggleSelection={onToggleSelection} onBack={navigateBack} onForward={navigateForward} onToday={goToday} workWeekDays={workWeekDays} />;
  }

  return <MonthView currentDate={currentDate} entriesByDate={entriesByDate} selectedEntries={selectedEntries} onToggleSelection={onToggleSelection} onBack={navigateBack} onForward={navigateForward} onToday={goToday} workWeekDays={workWeekDays} />;
}

// ─── WEEK VIEW ───────────────────────────────────────────────────
function WeekView({ currentDate, entriesByDate, selectedEntries, onToggleSelection, onBack, onForward, onToday, workWeekDays }: {
  currentDate: Date;
  entriesByDate: Record<string, ClockifyTimeEntry[]>;
  selectedEntries: Set<string>;
  onToggleSelection: (id: string) => void;
  onBack: () => void;
  onForward: () => void;
  onToday: () => void;
  workWeekDays: number;
}) {
  const weekStart = currentDate;
  const days = Array.from({ length: workWeekDays }, (_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-4 animate-fade-scale">
      <CalendarHeader
        title={`${format(days[0], 'MMM d')} — ${format(days[days.length - 1], 'MMM d, yyyy')}`}
        onBack={onBack}
        onForward={onForward}
        onToday={onToday}
      />

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        {/* Day headers */}
        <div className={`grid border-b border-border`} style={{ gridTemplateColumns: `60px repeat(${days.length}, 1fr)` }}>
          <div className="p-2" />
          {days.map(day => (
            <div
              key={day.toISOString()}
              className={`p-3 text-center border-l border-border ${isToday(day) ? 'bg-primary/5' : ''}`}
            >
              <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                {format(day, 'EEE')}
              </div>
              <div className={`text-lg font-bold mt-0.5 ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Hour grid */}
        <div className="relative max-h-[600px] overflow-y-auto" style={{ display: 'grid', gridTemplateColumns: `60px repeat(${days.length}, 1fr)` }}>
          {HOURS.map(hour => (
            <div key={hour} className="contents">
              <div className="h-16 flex items-start justify-end pr-2 pt-1 text-[10px] font-bold text-muted-foreground tracking-widest border-t border-border/50">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {days.map(day => (
                <div key={`${day.toISOString()}-${hour}`} className="h-16 border-l border-t border-border/50 relative" />
              ))}
            </div>
          ))}

          {/* Overlay entries */}
          {days.map((day, dayIdx) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayEntries = entriesByDate[key] || [];
            return dayEntries.map(entry => {
              const start = new Date(entry.timeInterval.start);
              const end = entry.timeInterval.end ? new Date(entry.timeInterval.end) : start;
              const startHour = start.getHours() + start.getMinutes() / 60;
              const endHour = end.getHours() + end.getMinutes() / 60;
              const topOffset = (Math.max(startHour, 6) - 6) * 64; // 64px per hour (h-16)
              const height = Math.max((endHour - startHour) * 64, 20);
              const totalCols = days.length + 1; // +1 for time column
              const leftPct = ((dayIdx + 1) / totalCols) * 100;
              const hue = projectHue(entry.projectName || 'default');
              const isSelected = selectedEntries.has(entry.id);

              return (
                <button
                  key={entry.id}
                  onClick={() => onToggleSelection(entry.id)}
                  className={`absolute rounded-lg px-1.5 py-1 text-left overflow-hidden transition-all hover:scale-[1.02] hover:z-30 cursor-pointer border ${
                    isSelected
                      ? 'ring-2 ring-primary shadow-lg border-primary/40'
                      : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    top: `${topOffset}px`,
                    height: `${height}px`,
                    left: `calc(${leftPct}% + 2px)`,
                    width: `calc(${100 / (days.length + 1)}% - 4px)`,
                    backgroundColor: `hsl(${hue} 60% ${isSelected ? '92%' : '95%'})`,
                    borderColor: isSelected ? undefined : `hsl(${hue} 50% 80%)`,
                  }}
                  title={`${entry.description || entry.projectName}\n${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`}
                >
                  <div className="text-[9px] font-bold truncate" style={{ color: `hsl(${hue} 50% 30%)` }}>
                    {entry.projectName || 'No Project'}
                  </div>
                  {height > 30 && (
                    <div className="text-[8px] truncate mt-0.5" style={{ color: `hsl(${hue} 40% 40%)` }}>
                      {entry.description}
                    </div>
                  )}
                </button>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}

// ─── MONTH VIEW ──────────────────────────────────────────────────
function MonthView({ currentDate, entriesByDate, selectedEntries, onToggleSelection, onBack, onForward, onToday, workWeekDays }: {
  currentDate: Date;
  entriesByDate: Record<string, ClockifyTimeEntry[]>;
  selectedEntries: Set<string>;
  onToggleSelection: (id: string) => void;
  onBack: () => void;
  onForward: () => void;
  onToday: () => void;
  workWeekDays: number;
}) {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const allDaysRaw = eachDayOfInterval({ start: calStart, end: calEnd });
  
  // Filter days based on work week setting
  const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const visibleWeekdays = workWeekDays >= 7 ? [0,1,2,3,4,5,6] : workWeekDays >= 5 ? [0,1,2,3,4] : [0,1,2,3]; // Mon=0 based
  const allDays = allDaysRaw.filter(d => {
    const dow = (d.getDay() + 6) % 7; // Convert to Mon=0
    return visibleWeekdays.includes(dow);
  });
  const colCount = visibleWeekdays.length;

  return (
    <div className="space-y-4 animate-fade-scale">
      <CalendarHeader
        title={format(currentDate, 'MMMM yyyy')}
        onBack={onBack}
        onForward={onForward}
        onToday={onToday}
      />

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        {/* Weekday headers */}
        <div className="grid border-b border-border" style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}>
          {visibleWeekdays.map(i => (
            <div key={i} className="p-3 text-center text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              {weekdayNames[i]}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid" style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}>
          {allDays.map(day => {
            const key = format(day, 'yyyy-MM-dd');
            const dayEntries = entriesByDate[key] || [];
            const totalSec = dayEntries.reduce((s, e) => s + parseDurationSeconds(e.timeInterval.duration), 0);
            const inMonth = isSameMonth(day, currentDate);
            const today = isToday(day);
            const isExpanded = expandedDay === key;

            return (
              <div
                key={key}
                onClick={() => dayEntries.length > 0 && setExpandedDay(isExpanded ? null : key)}
                className={`min-h-[100px] p-2 border-t border-r border-border transition-colors cursor-pointer ${
                  !inMonth ? 'bg-muted/20 opacity-40' : 'hover:bg-secondary/30'
                } ${today ? 'bg-primary/5' : ''} ${isExpanded ? 'bg-secondary/50 ring-1 ring-primary/20' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-bold ${today ? 'text-primary' : inMonth ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {format(day, 'd')}
                  </span>
                  {totalSec > 0 && (
                    <span className="text-[8px] font-bold text-muted-foreground flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDuration(totalSec)}
                    </span>
                  )}
                </div>

                {/* Entry dots / pills */}
                {!isExpanded && dayEntries.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {dayEntries.slice(0, 4).map(e => {
                      const hue = projectHue(e.projectName || 'default');
                      return (
                        <div
                          key={e.id}
                          className="h-1.5 rounded-full flex-1 min-w-[8px] max-w-[30px]"
                          style={{ backgroundColor: `hsl(${hue} 55% 60%)` }}
                          title={e.description || e.projectName}
                        />
                      );
                    })}
                    {dayEntries.length > 4 && (
                      <span className="text-[8px] font-bold text-muted-foreground">+{dayEntries.length - 4}</span>
                    )}
                  </div>
                )}

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="mt-2 space-y-1.5 animate-slide-up" onClick={e => e.stopPropagation()}>
                    {dayEntries.map(entry => {
                      const hue = projectHue(entry.projectName || 'default');
                      const isSelected = selectedEntries.has(entry.id);
                      const start = new Date(entry.timeInterval.start);
                      const end = entry.timeInterval.end ? new Date(entry.timeInterval.end) : start;
                      return (
                        <button
                          key={entry.id}
                          onClick={() => onToggleSelection(entry.id)}
                          className={`w-full text-left rounded-lg px-2 py-1.5 text-[9px] transition-all border ${
                            isSelected
                              ? 'ring-1 ring-primary border-primary/30 shadow-sm'
                              : 'border-transparent hover:border-border'
                          }`}
                          style={{ backgroundColor: `hsl(${hue} 55% ${isSelected ? '92%' : '96%'})` }}
                        >
                          <div className="font-bold truncate" style={{ color: `hsl(${hue} 50% 30%)` }}>
                            {entry.projectName}
                          </div>
                          <div className="truncate text-muted-foreground">
                            {entry.description} · {format(start, 'HH:mm')}–{format(end, 'HH:mm')}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── HEADER ──────────────────────────────────────────────────────
function CalendarHeader({ title, onBack, onForward, onToday }: {
  title: string; onBack: () => void; onForward: () => void; onToday: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-bold tracking-tight">{title}</h3>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onToday} className="text-[9px] font-bold uppercase tracking-widest h-8 px-3">
          Today
        </Button>
        <Button variant="ghost" size="icon" onClick={onForward} className="h-8 w-8">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
