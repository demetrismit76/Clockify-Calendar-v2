export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  accent: string;
  sidebarAccent?: string;
  light: Record<string, string>;
  dark: Record<string, string>;
}

export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  icon: 'default' | 'sidebar' | 'topnav' | 'compact' | 'minimal';
}

export interface SidebarColorPreset {
  id: string;
  name: string;
  bg: string;
  fg: string;
  card: string;
  mutedFg: string;
  border: string;
  accent: string;
  primary: string;      // HSL for buttons/controls
  primaryFg: string;    // HSL for text on primary buttons
  preview: string;
  previewFg: string;
}

export const sidebarColorPresets: SidebarColorPreset[] = [
  {
    id: 'dark',
    name: 'Dark',
    bg: '220 40% 13%', fg: '210 40% 96%', card: '220 35% 16%',
    mutedFg: '215 20% 60%', border: '220 25% 22%', accent: '220 30% 24%',
    primary: '215 70% 55%', primaryFg: '0 0% 100%',
    preview: '#1e293b', previewFg: '#e2e8f0',
  },
  {
    id: 'white',
    name: 'White',
    bg: '0 0% 99%', fg: '220 20% 15%', card: '0 0% 96%',
    mutedFg: '220 10% 50%', border: '220 13% 90%', accent: '220 14% 94%',
    primary: '221 83% 53%', primaryFg: '0 0% 100%',
    preview: '#fcfcfc', previewFg: '#1e293b',
  },
  {
    id: 'slate',
    name: 'Slate',
    bg: '215 25% 27%', fg: '210 40% 96%', card: '215 22% 30%',
    mutedFg: '215 15% 60%', border: '215 18% 35%', accent: '215 20% 34%',
    primary: '210 60% 55%', primaryFg: '0 0% 100%',
    preview: '#334155', previewFg: '#e2e8f0',
  },
  {
    id: 'navy',
    name: 'Navy',
    bg: '222 47% 15%', fg: '213 31% 91%', card: '222 40% 18%',
    mutedFg: '217 20% 55%', border: '222 30% 22%', accent: '222 35% 24%',
    primary: '217 70% 58%', primaryFg: '0 0% 100%',
    preview: '#172554', previewFg: '#dbeafe',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    bg: '160 35% 14%', fg: '152 50% 90%', card: '160 28% 19%',
    mutedFg: '155 15% 55%', border: '160 20% 25%', accent: '160 25% 24%',
    primary: '160 70% 40%', primaryFg: '0 0% 100%',
    preview: '#064e3b', previewFg: '#d1fae5',
  },
  {
    id: 'wine',
    name: 'Wine',
    bg: '345 35% 15%', fg: '340 30% 92%', card: '345 30% 18%',
    mutedFg: '345 15% 55%', border: '345 22% 22%', accent: '345 25% 24%',
    primary: '345 65% 50%', primaryFg: '0 0% 100%',
    preview: '#4c0519', previewFg: '#fecdd3',
  },
  {
    id: 'cream',
    name: 'Cream',
    bg: '40 30% 95%', fg: '30 20% 20%', card: '40 25% 91%',
    mutedFg: '35 12% 50%', border: '38 18% 85%', accent: '38 20% 88%',
    primary: '38 70% 45%', primaryFg: '0 0% 100%',
    preview: '#faf5eb', previewFg: '#3d2e1c',
  },
  {
    id: 'charcoal',
    name: 'Charcoal',
    bg: '0 0% 12%', fg: '0 0% 90%', card: '0 0% 15%',
    mutedFg: '0 0% 55%', border: '0 0% 20%', accent: '0 0% 22%',
    primary: '0 0% 45%', primaryFg: '0 0% 100%',
    preview: '#1f1f1f', previewFg: '#e5e5e5',
  },
];

export const layoutPresets: LayoutPreset[] = [
  {
    id: 'default',
    name: 'Standard',
    description: 'Classic sidebar + content',
    icon: 'default',
  },
  {
    id: 'sidebar-colored',
    name: 'Pro Sidebar',
    description: 'Dark sidebar like Clockify',
    icon: 'sidebar',
  },
  {
    id: 'topnav',
    name: 'Full Width',
    description: 'No sidebar, top controls',
    icon: 'topnav',
  },
  {
    id: 'compact',
    name: 'Compact',
    description: 'Dense, data-heavy view',
    icon: 'compact',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Centered, clean focus',
    icon: 'minimal',
  },
];

export const themePresets: ThemePreset[] = [
  {
    id: 'default',
    name: 'Syncly Blue',
    description: 'Clean blue, the original',
    accent: '#3b82f6',
    light: {},
    dark: {},
  },
  {
    id: 'ocean',
    name: 'Ocean Depth',
    description: 'Deep teal & cyan tones',
    accent: '#06b6d4',
    sidebarAccent: '#164e63',
    light: {
      '--primary': '188 85% 42%',
      '--primary-foreground': '0 0% 100%',
      '--accent': '192 90% 55%',
      '--accent-foreground': '0 0% 100%',
      '--ring': '188 85% 42%',
      '--sidebar-primary': '188 85% 42%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-ring': '188 85% 42%',
    },
    dark: {
      '--primary': '188 80% 48%',
      '--primary-foreground': '0 0% 100%',
      '--accent': '192 85% 55%',
      '--accent-foreground': '0 0% 100%',
      '--ring': '188 80% 48%',
      '--sidebar-background': '200 50% 6%',
      '--sidebar-primary': '188 80% 48%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '200 40% 14%',
      '--sidebar-ring': '188 80% 48%',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Rich emerald & green',
    accent: '#10b981',
    sidebarAccent: '#064e3b',
    light: {
      '--primary': '160 84% 39%',
      '--primary-foreground': '0 0% 100%',
      '--accent': '152 76% 50%',
      '--accent-foreground': '0 0% 100%',
      '--ring': '160 84% 39%',
      '--sidebar-primary': '160 84% 39%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-ring': '160 84% 39%',
    },
    dark: {
      '--primary': '160 80% 44%',
      '--primary-foreground': '0 0% 100%',
      '--accent': '152 76% 50%',
      '--accent-foreground': '0 0% 100%',
      '--ring': '160 80% 44%',
      '--sidebar-background': '160 40% 6%',
      '--sidebar-primary': '160 80% 44%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '160 30% 14%',
      '--sidebar-ring': '160 80% 44%',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm amber & coral',
    accent: '#f59e0b',
    sidebarAccent: '#78350f',
    light: {
      '--primary': '38 92% 50%',
      '--primary-foreground': '0 0% 100%',
      '--accent': '14 90% 60%',
      '--accent-foreground': '0 0% 100%',
      '--ring': '38 92% 50%',
      '--sidebar-primary': '38 92% 50%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-ring': '38 92% 50%',
    },
    dark: {
      '--primary': '38 90% 52%',
      '--primary-foreground': '0 0% 5%',
      '--accent': '14 85% 58%',
      '--accent-foreground': '0 0% 100%',
      '--ring': '38 90% 52%',
      '--sidebar-background': '25 45% 6%',
      '--sidebar-primary': '38 90% 52%',
      '--sidebar-primary-foreground': '0 0% 5%',
      '--sidebar-accent': '25 35% 14%',
      '--sidebar-ring': '38 90% 52%',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep purple & violet',
    accent: '#8b5cf6',
    sidebarAccent: '#3b0764',
    light: {
      '--primary': '262 83% 58%',
      '--primary-foreground': '0 0% 100%',
      '--accent': '270 76% 65%',
      '--accent-foreground': '0 0% 100%',
      '--ring': '262 83% 58%',
      '--sidebar-primary': '262 83% 58%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-ring': '262 83% 58%',
    },
    dark: {
      '--primary': '262 80% 62%',
      '--primary-foreground': '0 0% 100%',
      '--accent': '270 76% 65%',
      '--accent-foreground': '0 0% 100%',
      '--ring': '262 80% 62%',
      '--background': '270 40% 6%',
      '--card': '270 35% 9%',
      '--popover': '270 35% 9%',
      '--secondary': '270 30% 15%',
      '--muted': '270 30% 15%',
      '--border': '270 25% 18%',
      '--input': '270 25% 18%',
      '--sidebar-background': '270 45% 5%',
      '--sidebar-primary': '262 80% 62%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '270 30% 14%',
      '--sidebar-ring': '262 80% 62%',
    },
  },
  {
    id: 'rose',
    name: 'Rosé',
    description: 'Elegant pink & rose',
    accent: '#f43f5e',
    sidebarAccent: '#881337',
    light: {
      '--primary': '347 77% 50%',
      '--primary-foreground': '0 0% 100%',
      '--accent': '330 80% 60%',
      '--accent-foreground': '0 0% 100%',
      '--ring': '347 77% 50%',
      '--sidebar-primary': '347 77% 50%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-ring': '347 77% 50%',
    },
    dark: {
      '--primary': '347 77% 55%',
      '--primary-foreground': '0 0% 100%',
      '--accent': '330 75% 58%',
      '--accent-foreground': '0 0% 100%',
      '--ring': '347 77% 55%',
      '--sidebar-background': '340 40% 6%',
      '--sidebar-primary': '347 77% 55%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '340 30% 14%',
      '--sidebar-ring': '347 77% 55%',
    },
  },
];

export function applyTheme(presetId: string, isDark: boolean) {
  const preset = themePresets.find((t) => t.id === presetId);
  if (!preset) return;

  const root = document.documentElement;
  const vars = isDark ? preset.dark : preset.light;

  const allVarKeys = new Set<string>();
  themePresets.forEach((p) => {
    Object.keys(p.light).forEach((k) => allVarKeys.add(k));
    Object.keys(p.dark).forEach((k) => allVarKeys.add(k));
  });
  allVarKeys.forEach((key) => root.style.removeProperty(key));

  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}
