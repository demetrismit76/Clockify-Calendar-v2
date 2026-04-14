import { useMemo } from 'react';
import { ClockifyTimeEntry } from '@/types/syncly';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Download, FileText } from 'lucide-react';

interface IcsExportPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: ClockifyTimeEntry[];
  dateRange: { start: string; end: string };
  onConfirmExport: () => void;
}

function parseDurationSeconds(duration?: string | null): number {
  if (!duration) return 0;
  const matches = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!matches) return 0;
  return (parseInt(matches[1] || '0') * 3600) + (parseInt(matches[2] || '0') * 60) + (parseInt(matches[3] || '0'));
}

function formatTime(seconds: number): string {
  if (seconds === 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function IcsExportPreview({ open, onOpenChange, entries, dateRange, onConfirmExport }: IcsExportPreviewProps) {
  const { rows, dayColumns, dayTotals, grandTotal } = useMemo(() => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);

    const daysPresent = new Set<number>();
    const dateMap = new Map<string, number>();
    const d = new Date(start);
    while (d <= end) {
      const dow = d.getDay();
      const dayIdx = dow === 0 ? 6 : dow - 1;
      daysPresent.add(dayIdx);
      dateMap.set(d.toISOString().split('T')[0], dayIdx);
      d.setDate(d.getDate() + 1);
    }

    const dayColumns = Array.from(daysPresent).sort((a, b) => a - b);

    const taskMap = new Map<string, { project: string; byDay: number[] }>();

    entries.forEach((e) => {
      const entryDate = new Date(e.timeInterval.start).toISOString().split('T')[0];
      const dayIdx = dateMap.get(entryDate);
      if (dayIdx === undefined) return;

      const desc = e.description || '(No description)';
      const key = `${e.projectName || 'No Project'}|||${desc}`;

      if (!taskMap.has(key)) {
        taskMap.set(key, { project: e.projectName || 'No Project', byDay: new Array(7).fill(0) });
      }
      const row = taskMap.get(key)!;
      row.byDay[dayIdx] += parseDurationSeconds(e.timeInterval.duration);
    });

    const rows = Array.from(taskMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => {
        const [project, description] = key.split('|||');
        const rowTotal = dayColumns.reduce((sum, di) => sum + data.byDay[di], 0);
        return { project, description, byDay: data.byDay, total: rowTotal };
      });

    const dayTotals = dayColumns.map((di) =>
      rows.reduce((sum, r) => sum + r.byDay[di], 0)
    );

    const grandTotal = dayTotals.reduce((a, b) => a + b, 0);

    return { rows, dayColumns, dayTotals, grandTotal };
  }, [entries, dateRange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] w-[1100px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">Export Preview</DialogTitle>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {new Date(dateRange.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                {' — '}
                {new Date(dateRange.end).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                <span className="ml-3 text-foreground font-bold">{formatTime(grandTotal)} total</span>
                <span className="ml-2 text-muted-foreground">· {entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
              </p>
            </div>
            <Button size="sm" onClick={() => { onConfirmExport(); onOpenChange(false); }} className="gap-2">
              <Download className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">Export .ICS</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto mt-4 rounded-lg border border-border">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <FileText className="w-8 h-8 mb-3 opacity-30" />
              <p className="text-sm font-medium">No entries selected</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest w-[200px] sticky left-0 bg-secondary/50 z-10">Project</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest min-w-[250px]">Description</TableHead>
                  {dayColumns.map((di) => (
                    <TableHead key={di} className="text-[10px] font-bold uppercase tracking-widest text-center w-[80px]">
                      {DAY_NAMES[di]}
                    </TableHead>
                  ))}
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-center w-[80px] bg-primary/5">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i} className="group hover:bg-secondary/30">
                    <TableCell className="text-xs font-semibold text-primary sticky left-0 bg-background group-hover:bg-secondary/30 z-10 transition-colors">
                      {row.project}
                    </TableCell>
                    <TableCell className="text-xs text-foreground font-medium">{row.description}</TableCell>
                    {dayColumns.map((di) => (
                      <TableCell key={di} className="text-xs text-center tabular-nums font-medium text-muted-foreground">
                        {row.byDay[di] > 0 ? formatTime(row.byDay[di]) : <span className="opacity-20">—</span>}
                      </TableCell>
                    ))}
                    <TableCell className="text-xs text-center tabular-nums font-bold text-foreground bg-primary/5">
                      {formatTime(row.total)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 border-border bg-secondary/40 font-bold">
                  <TableCell className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground sticky left-0 bg-secondary/40 z-10" />
                  <TableCell className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total</TableCell>
                  {dayTotals.map((t, i) => (
                    <TableCell key={i} className="text-xs text-center tabular-nums font-bold text-foreground">
                      {t > 0 ? formatTime(t) : '—'}
                    </TableCell>
                  ))}
                  <TableCell className="text-xs text-center tabular-nums font-black text-primary bg-primary/10">
                    {formatTime(grandTotal)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
