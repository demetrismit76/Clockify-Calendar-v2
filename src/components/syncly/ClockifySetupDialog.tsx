import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Key, ExternalLink, Eye, EyeOff } from 'lucide-react';

interface ClockifySetupDialogProps {
  open: boolean;
  onSave: (apiKey: string) => void;
}

export default function ClockifySetupDialog({ open, onSave }: ClockifySetupDialogProps) {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const isValid = key.trim().length > 20;

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-lg">Connect to Clockify</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            Syncly needs your Clockify API key to fetch your time entries. Without it, the app cannot load any data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Clockify API Key</label>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder="Paste your API key here..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="pr-10 font-mono text-sm"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground space-y-1.5">
            <p className="font-medium text-foreground text-sm">Where to find your key:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Go to <a href="https://app.clockify.me/user/preferences#advanced" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">Clockify Settings <ExternalLink className="h-3 w-3" /></a></li>
              <li>Scroll to the <strong>API</strong> section</li>
              <li>Click <strong>"Generate"</strong> if you don't have a key yet</li>
              <li>Copy and paste it above</li>
            </ol>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => onSave(key.trim())}
            disabled={!isValid}
            className="w-full"
          >
            Save & Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
