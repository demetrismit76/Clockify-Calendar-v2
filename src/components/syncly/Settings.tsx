import { useState } from 'react';
import { ClockifyWorkspace, SyncMode, CalendarTarget } from '@/types/syncly';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sparkles, Hash, RefreshCw, Eye, EyeOff, Calendar, KeyRound, CheckCircle2, Pencil, SlidersHorizontal, Rss, Copy, Check } from 'lucide-react';

interface SettingsProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  onClearApiKey: () => void;
  workspaces: ClockifyWorkspace[];
  selectedWorkspace: string;
  onWorkspaceSelect: (id: string) => void;
  onRefreshWorkspaces: () => void;
  syncMode: SyncMode;
  onSyncModeChange: (mode: SyncMode) => void;
  calendarTarget: CalendarTarget;
  onCalendarTargetChange: (target: CalendarTarget) => void;
  googleClientId: string;
  onGoogleClientIdChange: (id: string) => void;
  isGoogleConnected: boolean;
  onConnectGoogle: () => void;
  microsoftClientId: string;
  onMicrosoftClientIdChange: (id: string) => void;
  isMicrosoftConnected: boolean;
  onConnectMicrosoft: () => void;
  aiEnabled: boolean;
  onAiEnabledChange: (enabled: boolean) => void;
  globalAiEnabled?: boolean;
  globalAutoApiEnabled?: boolean;
  globalCalendarSubscribeEnabled?: boolean;
  includeProjectInDescription: boolean;
  onIncludeProjectInDescriptionChange: (include: boolean) => void;
  includeProjectPrefixIcs: boolean;
  onIncludeProjectPrefixIcsChange: (include: boolean) => void;
  feedUrl: string | null;
  webcalUrl: string | null;
  feedLoading: boolean;
  onEnableFeed: () => void;
  feedRange: 'day' | 'week' | 'month';
  onFeedRangeChange: (range: 'day' | 'week' | 'month') => void;
}

export default function Settings({
  apiKey, onApiKeyChange, onClearApiKey,
  workspaces, selectedWorkspace, onWorkspaceSelect, onRefreshWorkspaces,
  syncMode, onSyncModeChange,
  calendarTarget, onCalendarTargetChange,
  googleClientId, onGoogleClientIdChange, isGoogleConnected, onConnectGoogle,
  microsoftClientId, onMicrosoftClientIdChange, isMicrosoftConnected, onConnectMicrosoft,
  aiEnabled, onAiEnabledChange, globalAiEnabled = true, globalAutoApiEnabled = true, globalCalendarSubscribeEnabled = true,
  includeProjectInDescription, onIncludeProjectInDescriptionChange,
  includeProjectPrefixIcs, onIncludeProjectPrefixIcsChange,
  feedUrl, webcalUrl, feedLoading, onEnableFeed,
  feedRange, onFeedRangeChange,
}: SettingsProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editKey, setEditKey] = useState('');
  const [showEditKey, setShowEditKey] = useState(false);
  const [googleEditOpen, setGoogleEditOpen] = useState(false);
  const [editGoogleId, setEditGoogleId] = useState('');
  const [msEditOpen, setMsEditOpen] = useState(false);
  const [editMsId, setEditMsId] = useState('');
  const [copied, setCopied] = useState(false);
  const hasKey = apiKey.length > 10;
  const hasGoogleId = googleClientId.length > 10;
  const hasMsId = microsoftClientId.length > 10;

  const openEditDialog = () => {
    setEditKey(apiKey);
    setShowEditKey(false);
    setEditDialogOpen(true);
  };

  const saveKey = () => {
    onApiKeyChange(editKey);
    setEditDialogOpen(false);
  };

  const clearKey = () => {
    onClearApiKey();
    setEditDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Clockify */}
      <Card>
        <CardHeader className="pb-3">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-primary" />
            Clockify
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasKey ? (
            <>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                    Workspace
                  </label>
                  <Select value={selectedWorkspace} onValueChange={onWorkspaceSelect}>
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue placeholder="Choose workspace..." />
                    </SelectTrigger>
                    <SelectContent>
                      {workspaces.map((ws) => (
                        <SelectItem key={ws.id} value={ws.id}>
                          {ws.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onRefreshWorkspaces}
                  className="shrink-0"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <button
                onClick={openEditDialog}
                className="text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <KeyRound className="w-3 h-3" />
                Manage API Key
              </button>
            </>
          ) : (
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                API Key
              </label>
              <div className="relative">
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => onApiKeyChange(e.target.value)}
                  placeholder="Paste X-Api-Key..."
                  className="pr-10 bg-secondary/50"
                />
                <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Options */}
      <Card>
        <CardHeader className="pb-3">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
            Options
          </h2>
        </CardHeader>
        <CardContent className="space-y-3">
          {globalAutoApiEnabled && (
            <div className="flex bg-secondary rounded-xl p-1">
              <button
                onClick={() => onSyncModeChange('manual')}
                className={`flex-1 py-2 px-4 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all ${
                  syncMode === 'manual'
                    ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Manual
              </button>
              <button
                onClick={() => onSyncModeChange('auto')}
                className={`flex-1 py-2 px-4 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all ${
                  syncMode === 'auto'
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Auto API
              </button>
            </div>
          )}
          {syncMode === 'auto' && (
            <p className="text-[9px] text-muted-foreground/60 italic text-center mt-1">
              Auto sync is in early development — full support coming soon.
            </p>
          )}

          <div className="space-y-2">
            {globalAiEnabled && (
              <label className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-secondary/50 transition-colors">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                  AI Refinement
                </span>
                <Switch checked={aiEnabled} onCheckedChange={onAiEnabledChange} className="scale-90" />
              </label>
            )}

            <label className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-secondary/50 transition-colors">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-primary" />
                Project Name in Title
              </span>
              <Switch checked={includeProjectInDescription} onCheckedChange={onIncludeProjectInDescriptionChange} className="scale-90" />
            </label>

            <label className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-secondary/50 transition-colors">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                "Project:" Prefix in ICS
              </span>
              <Switch checked={includeProjectPrefixIcs} onCheckedChange={onIncludeProjectPrefixIcsChange} className="scale-90" />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Webcal Subscribe Feed */}
      {globalCalendarSubscribeEnabled && (
      <Card>
        <CardHeader className="pb-3">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
            <Rss className="w-3.5 h-3.5 text-primary" />
            Calendar Subscribe
          </h2>
        </CardHeader>
        <CardContent className="space-y-3">
          {feedLoading ? (
            <p className="text-xs text-muted-foreground">Loading...</p>
          ) : feedUrl ? (
            <>
              <p className="text-[10px] text-muted-foreground">
                Use this URL to subscribe in Outlook, Google Calendar, or Apple Calendar. It will auto-update when you export.
              </p>
              <div className="flex bg-secondary rounded-xl p-1 mt-2">
                {(['day', 'week', 'month'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => onFeedRangeChange(r)}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all ${
                      feedRange === r
                        ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {r === 'day' ? 'Today' : r === 'week' ? 'Week' : 'Month'}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 items-center mt-2">
                <Input
                  readOnly
                  value={webcalUrl || ''}
                  className="text-[10px] bg-secondary/50 font-mono"
                  onFocus={(e) => e.target.select()}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(webcalUrl || '');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  title="Copy URL"
                >
                  {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[10px] text-muted-foreground">
                Enable a live calendar feed URL that auto-updates when you export entries.
              </p>
              <Button size="sm" className="w-full" onClick={onEnableFeed}>
                Enable Calendar Feed
              </Button>
            </>
          )}
        </CardContent>
      </Card>
      )}

      {syncMode === 'auto' && (
        <Card>
          <CardHeader className="pb-3">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              Calendar Sync
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Google / Microsoft toggle */}
            <div className="flex bg-secondary rounded-xl p-1">
              <button
                onClick={() => onCalendarTargetChange('google')}
                className={`flex-1 py-2 px-4 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all ${
                  calendarTarget === 'google'
                    ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Google
              </button>
              <button
                onClick={() => onCalendarTargetChange('microsoft')}
                className={`flex-1 py-2 px-4 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all ${
                  calendarTarget === 'microsoft'
                    ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Microsoft
              </button>
            </div>

            {/* Google config */}
            {calendarTarget === 'google' && (
              <>
                {hasGoogleId ? (
                  <>
                    <Button
                      onClick={onConnectGoogle}
                      variant={isGoogleConnected ? 'outline' : 'default'}
                      className="w-full"
                    >
                      {isGoogleConnected ? '✓ Google Ready' : 'Connect Google'}
                    </Button>
                    <button
                      onClick={() => { setEditGoogleId(googleClientId); setGoogleEditOpen(true); }}
                      className="text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                    >
                      <KeyRound className="w-3 h-3" />
                      Manage Client ID
                    </button>
                  </>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                      Google Client ID
                    </label>
                    <Input
                      type="text"
                      value={googleClientId}
                      onChange={(e) => onGoogleClientIdChange(e.target.value)}
                      placeholder="Client ID..."
                      className="bg-secondary/50 text-xs"
                    />
                  </div>
                )}
              </>
            )}

            {/* Microsoft config */}
            {calendarTarget === 'microsoft' && (
              <>
                {hasMsId ? (
                  <>
                    <Button
                      onClick={onConnectMicrosoft}
                      variant={isMicrosoftConnected ? 'outline' : 'default'}
                      className="w-full"
                    >
                      {isMicrosoftConnected ? '✓ Microsoft Ready' : 'Connect Microsoft'}
                    </Button>
                    <button
                      onClick={() => { setEditMsId(microsoftClientId); setMsEditOpen(true); }}
                      className="text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                    >
                      <KeyRound className="w-3 h-3" />
                      Manage Client ID
                    </button>
                  </>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                      Azure Client ID
                    </label>
                    <Input
                      type="text"
                      value={microsoftClientId}
                      onChange={(e) => onMicrosoftClientIdChange(e.target.value)}
                      placeholder="Application (client) ID..."
                      className="bg-secondary/50 text-xs"
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit API Key Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Edit API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="relative">
              <Input
                type={showEditKey ? 'text' : 'password'}
                value={editKey}
                onChange={(e) => setEditKey(e.target.value)}
                placeholder="Paste X-Api-Key..."
                className="pr-10"
                autoFocus
              />
              <button
                onClick={() => setShowEditKey(!showEditKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showEditKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearKey} className="text-muted-foreground">
              Remove Key
            </Button>
            <Button size="sm" onClick={saveKey}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Google Client ID Dialog */}
      <Dialog open={googleEditOpen} onOpenChange={setGoogleEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Edit Google Client ID</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              type="text"
              value={editGoogleId}
              onChange={(e) => setEditGoogleId(e.target.value)}
              placeholder="Client ID..."
              autoFocus
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { onGoogleClientIdChange(''); setGoogleEditOpen(false); }} className="text-muted-foreground">
              Remove
            </Button>
            <Button size="sm" onClick={() => { onGoogleClientIdChange(editGoogleId); setGoogleEditOpen(false); }}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Microsoft Client ID Dialog */}
      <Dialog open={msEditOpen} onOpenChange={setMsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Edit Microsoft Client ID</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              type="text"
              value={editMsId}
              onChange={(e) => setEditMsId(e.target.value)}
              placeholder="Application (client) ID..."
              autoFocus
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { onMicrosoftClientIdChange(''); setMsEditOpen(false); }} className="text-muted-foreground">
              Remove
            </Button>
            <Button size="sm" onClick={() => { onMicrosoftClientIdChange(editMsId); setMsEditOpen(false); }}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
