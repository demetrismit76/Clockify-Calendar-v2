import { themePresets, layoutPresets, sidebarColorPresets } from '@/lib/themes';
import { useThemePreset } from '@/hooks/useThemePreset';
import { Check, LayoutDashboard, PanelLeft, Monitor, Minimize2, Grid3X3 } from 'lucide-react';

const layoutIcons: Record<string, typeof LayoutDashboard> = {
  default: LayoutDashboard,
  'sidebar-colored': PanelLeft,
  topnav: Monitor,
  compact: Grid3X3,
  minimal: Minimize2,
};

export default function ThemeGrid() {
  const { themePreset, setThemePreset, layoutPreset, setLayoutPreset, sidebarColor, setSidebarColor } = useThemePreset();

  return (
    <div className="space-y-6">
      {/* Layout Templates */}
      <div>
        <h3 className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-3">Layout</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {layoutPresets.map((layout) => {
            const isActive = layoutPreset === layout.id;
            const Icon = layoutIcons[layout.id] || LayoutDashboard;
            return (
              <button
                key={layout.id}
                onClick={() => setLayoutPreset(layout.id)}
                className={`group relative text-left p-2.5 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                  isActive
                    ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                    : 'border-border hover:border-muted-foreground/30 bg-card'
                }`}
              >
                <LayoutMiniPreview type={layout.id} isActive={isActive} />
                <div className="flex items-center gap-1.5 mt-2">
                  <Icon className={`w-3 h-3 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="text-[9px] font-bold text-foreground leading-none truncate">{layout.name}</p>
                </div>
                <p className="text-[7px] text-muted-foreground mt-0.5 leading-tight">{layout.description}</p>
                {isActive && (
                  <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-2 h-2 text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sidebar Color */}
      <div>
        <h3 className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-1">Sidebar Color</h3>
        <p className="text-[8px] text-muted-foreground mb-3">Applies to sidebar layouts (Standard, Pro Sidebar, Compact). Global setting for all users.</p>
        <div className="flex flex-wrap gap-2">
          {sidebarColorPresets.map((preset) => {
            const isActive = sidebarColor === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => setSidebarColor(preset.id)}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                  isActive
                    ? 'border-primary ring-1 ring-primary/20 shadow-sm'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div
                  className="w-5 h-5 rounded-md border border-black/10 shadow-inner flex items-center justify-center"
                  style={{ backgroundColor: preset.preview }}
                >
                  <span className="text-[6px] font-black" style={{ color: preset.previewFg }}>A</span>
                </div>
                <span className="text-[9px] font-bold text-foreground">{preset.name}</span>
                {isActive && (
                  <div className="w-3 h-3 bg-primary rounded-full flex items-center justify-center ml-0.5">
                    <Check className="w-2 h-2 text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Themes */}
      <div>
        <h3 className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-3">Color Theme</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {themePresets.map((preset) => {
            const isActive = themePreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => setThemePreset(preset.id)}
                className={`group relative text-left p-2.5 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                  isActive
                    ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                    : 'border-border hover:border-muted-foreground/30 bg-card'
                }`}
              >
                <div className="flex gap-1 mb-2">
                  <div className="h-5 flex-1 rounded-md" style={{ backgroundColor: preset.accent }} />
                  {preset.sidebarAccent && (
                    <div className="h-5 w-5 rounded-md" style={{ backgroundColor: preset.sidebarAccent }} />
                  )}
                </div>
                <p className="text-[10px] font-bold text-foreground leading-none">{preset.name}</p>
                <p className="text-[8px] text-muted-foreground mt-0.5">{preset.description}</p>
                {isActive && (
                  <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-2 h-2 text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LayoutMiniPreview({ type, isActive }: { type: string; isActive: boolean }) {
  const border = isActive ? 'border-primary/40' : 'border-border';
  const bar = isActive ? 'bg-primary/25' : 'bg-muted-foreground/15';
  const content = isActive ? 'bg-primary/10' : 'bg-muted-foreground/8';
  const sidebarBg = isActive ? 'bg-primary/15' : 'bg-muted';

  if (type === 'default') {
    return (
      <div className={`h-12 rounded border ${border} overflow-hidden flex bg-background`}>
        <div className={`w-[28%] ${sidebarBg} border-r ${border} p-1 space-y-0.5`}>
          <div className={`h-1 w-full rounded-sm ${bar}`} />
          <div className={`h-1 w-3/4 rounded-sm ${bar}`} />
          <div className={`h-1 w-full rounded-sm ${bar}`} />
        </div>
        <div className="flex-1 p-1 space-y-1">
          <div className={`h-1.5 w-2/3 rounded-sm ${bar}`} />
          <div className={`h-4 w-full rounded-sm ${content}`} />
        </div>
      </div>
    );
  }

  if (type === 'sidebar-colored') {
    return (
      <div className={`h-12 rounded border ${border} overflow-hidden flex bg-background`}>
        <div className="w-[28%] bg-[hsl(220,40%,13%)] p-1 space-y-0.5">
          <div className="h-1 w-full rounded-sm bg-white/20" />
          <div className="h-1 w-3/4 rounded-sm bg-white/15" />
          <div className="h-1 w-full rounded-sm bg-white/20" />
        </div>
        <div className="flex-1 p-1 space-y-1">
          <div className={`h-1.5 w-2/3 rounded-sm ${bar}`} />
          <div className={`h-4 w-full rounded-sm ${content}`} />
        </div>
      </div>
    );
  }

  if (type === 'topnav') {
    return (
      <div className={`h-12 rounded border ${border} overflow-hidden flex flex-col bg-background`}>
        <div className={`h-3 ${sidebarBg} border-b ${border} flex items-center px-1 gap-0.5`}>
          <div className={`h-0.5 w-3 rounded-full ${bar}`} />
          <div className={`h-0.5 w-3 rounded-full ${bar}`} />
          <div className={`h-0.5 w-3 rounded-full ${bar}`} />
        </div>
        <div className="flex-1 p-1 space-y-0.5">
          <div className={`h-1.5 w-1/2 rounded-sm ${bar}`} />
          <div className={`h-3 w-full rounded-sm ${content}`} />
        </div>
      </div>
    );
  }

  if (type === 'compact') {
    return (
      <div className={`h-12 rounded border ${border} overflow-hidden flex bg-background`}>
        <div className={`w-[22%] ${sidebarBg} border-r ${border} p-0.5 space-y-[2px]`}>
          <div className={`h-0.5 w-full rounded-sm ${bar}`} />
          <div className={`h-0.5 w-3/4 rounded-sm ${bar}`} />
          <div className={`h-0.5 w-full rounded-sm ${bar}`} />
          <div className={`h-0.5 w-3/4 rounded-sm ${bar}`} />
          <div className={`h-0.5 w-full rounded-sm ${bar}`} />
        </div>
        <div className="flex-1 p-0.5 space-y-[2px]">
          <div className={`h-1 w-1/3 rounded-sm ${bar}`} />
          <div className={`h-1 w-full rounded-sm ${content}`} />
          <div className={`h-1 w-full rounded-sm ${content}`} />
          <div className={`h-1 w-full rounded-sm ${content}`} />
        </div>
      </div>
    );
  }

  // minimal
  return (
    <div className={`h-12 rounded border ${border} overflow-hidden flex items-center justify-center bg-background`}>
      <div className="w-[55%] space-y-1 py-1">
        <div className={`h-1.5 w-2/3 mx-auto rounded-sm ${bar}`} />
        <div className={`h-3 w-full rounded-sm ${content}`} />
        <div className={`h-1 w-3/4 mx-auto rounded-sm ${content}`} />
      </div>
    </div>
  );
}
