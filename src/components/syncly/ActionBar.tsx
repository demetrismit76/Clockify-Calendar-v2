import { SyncStatusState, SyncMode, CalendarTarget } from '@/types/syncly';
import { Download, Upload, FileText, Loader2, BookOpen, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ActionBarProps {
  selectedCount: number;
  totalCount: number;
  syncMode: SyncMode;
  syncStatus: SyncStatusState;
  calendarTarget: CalendarTarget;
  onSync: () => void;
  onExportCSV: () => void;
  onClearSelection: () => void;
  onOpenReport?: () => void;
  hasEntries?: boolean;
}

export default function ActionBar({
  selectedCount, totalCount, syncMode, syncStatus,
  calendarTarget,
  onSync, onExportCSV, onClearSelection,
  onOpenReport, hasEntries,
}: ActionBarProps) {
  const [showGuide, setShowGuide] = useState(false);

  if (totalCount === 0) return null;

  const isExportMode = syncMode === 'manual';

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-8">
      <div className="bg-card/90 backdrop-blur-3xl border border-border rounded-xl px-10 py-5 flex items-center justify-between gap-8 shadow-2xl ring-1 ring-foreground/5">
        <div className="flex flex-col">
          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.25em] mb-1.5">Action Workspace</p>
          <p className="text-2xl font-bold leading-none tracking-tight text-foreground">
            {selectedCount} <span className="text-sm font-medium text-muted-foreground">/ {totalCount} selected</span>
          </p>
        </div>
        <div className="flex gap-4 items-center">
          {/* Guide / Instructions */}
          <button
            onClick={() => setShowGuide(true)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            title="Import & Export Guide"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          {/* Timesheet Report shortcut */}
          {hasEntries && onOpenReport && (
            <button
              onClick={onOpenReport}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              title="Timesheet Report"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onClearSelection}
            className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors px-2"
          >
            Clear
          </button>

          <div className="flex items-center bg-secondary p-1 rounded-xl border border-border">
            <button
              onClick={onExportCSV}
              disabled={selectedCount === 0}
              className="p-3.5 rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-card transition-all disabled:opacity-40 group"
              title="Export to CSV"
            >
              <FileText className="w-[18px] h-[18px] group-hover:scale-110 transition-transform" />
            </button>
            <div className="w-px h-6 bg-border mx-1" />
            <button
              onClick={onSync}
              disabled={syncStatus.status === 'syncing' || selectedCount === 0}
              className={`px-8 py-3.5 rounded-lg font-bold flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 disabled:opacity-40 ${
                isExportMode
                  ? 'bg-foreground text-background'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {syncStatus.status === 'syncing' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isExportMode ? (
                    <Download className="w-4 h-4" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {isExportMode ? 'Export .ics' : `Upload to ${calendarTarget === 'google' ? 'Google' : 'Outlook'}`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Guide Dialog */}
      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Import & Export Guide
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-2">
            {/* Outlook / ICS */}
            <div className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
                <Download className="w-3.5 h-3.5 text-primary" />
                Import .ics into Outlook
              </h3>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-muted-foreground pl-1">
                <li>Download the <span className="font-medium text-foreground">.ics</span> file using <span className="font-medium text-foreground">Export .ics</span></li>
                <li>Open <span className="font-medium text-foreground">Outlook</span> → File → Open & Export → Import/Export</li>
                <li>Select <span className="font-medium text-foreground">"Import an iCalendar (.ics) file"</span></li>
                <li>Choose the downloaded file and click <span className="font-medium text-foreground">Import</span></li>
              </ol>
              <p className="text-[10px] text-muted-foreground/70 pl-1">Or simply double-click the .ics file to open it in Outlook.</p>
            </div>

            <div className="border-t border-border" />

            {/* Google Calendar */}
            <div className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
                <Upload className="w-3.5 h-3.5 text-primary" />
                Auto-sync to Google Calendar
              </h3>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-muted-foreground pl-1">
                <li>Switch to <span className="font-medium text-foreground">Auto API</span> mode in Settings</li>
                <li>Select <span className="font-medium text-foreground">Google</span> as your calendar target</li>
                <li>Paste your <span className="font-medium text-foreground">Google Client ID</span> and click <span className="font-medium text-foreground">Connect Google</span></li>
                <li>Select entries and click <span className="font-medium text-foreground">Upload to Google</span></li>
              </ol>
            </div>

            <div className="border-t border-border" />

            {/* Microsoft Calendar */}
            <div className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
                <Upload className="w-3.5 h-3.5 text-primary" />
                Auto-sync to Outlook (Microsoft)
              </h3>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-muted-foreground pl-1">
                <li>Switch to <span className="font-medium text-foreground">Auto API</span> mode in Settings</li>
                <li>Select <span className="font-medium text-foreground">Microsoft</span> as your calendar target</li>
                <li>Paste your <span className="font-medium text-foreground">Azure Client ID</span> and click <span className="font-medium text-foreground">Connect Microsoft</span></li>
                <li>Select entries and click <span className="font-medium text-foreground">Upload to Outlook</span></li>
              </ol>
            </div>

            <div className="border-t border-border" />

            {/* CSV */}
            <div className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-primary" />
                Export to CSV
              </h3>
              <p className="text-xs text-muted-foreground pl-1">
                Click the <span className="font-medium text-foreground">CSV icon</span> in the action bar to download a spreadsheet of your selected entries with date, project, description, times, and duration.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
