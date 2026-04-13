import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { applyTheme } from '@/lib/themes';

interface ThemeContextType {
  themePreset: string;
  setThemePreset: (id: string) => void;
  layoutPreset: string;
  setLayoutPreset: (id: string) => void;
  sidebarColor: string;
  setSidebarColor: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function getIsDark() {
  return document.documentElement.classList.contains('dark');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [themePreset, setThemePresetState] = useState('default');
  const [layoutPreset, setLayoutPresetState] = useState('default');
  const [sidebarColor, setSidebarColorState] = useState('dark');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_settings')
      .select('theme_preset, layout_preset')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.theme_preset) {
          setThemePresetState(data.theme_preset);
          applyTheme(data.theme_preset, getIsDark());
        }
        if (data?.layout_preset) {
          setLayoutPresetState(data.layout_preset);
        }
      });

    // Load global sidebar color from app_settings
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'sidebar_color')
      .single()
      .then(({ data }) => {
        if (data?.value) {
          setSidebarColorState(data.value as string);
        }
      });
  }, [user]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      applyTheme(themePreset, getIsDark());
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [themePreset]);

  const setThemePreset = useCallback(async (id: string) => {
    setThemePresetState(id);
    applyTheme(id, getIsDark());
    if (user) {
      await supabase
        .from('user_settings')
        .update({ theme_preset: id } as any)
        .eq('user_id', user.id);
    }
  }, [user]);

  const setLayoutPreset = useCallback(async (id: string) => {
    setLayoutPresetState(id);
    if (user) {
      await supabase
        .from('user_settings')
        .update({ layout_preset: id } as any)
        .eq('user_id', user.id);
    }
  }, [user]);

  const setSidebarColor = useCallback(async (id: string) => {
    setSidebarColorState(id);
    if (user) {
      // Upsert into app_settings (admin-level global setting)
      await supabase
        .from('app_settings')
        .upsert({ key: 'sidebar_color', value: id, updated_by: user.id } as any, { onConflict: 'key' });
    }
  }, [user]);

  return (
    <ThemeContext.Provider value={{ themePreset, setThemePreset, layoutPreset, setLayoutPreset, sidebarColor, setSidebarColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemePreset() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemePreset must be used within ThemeProvider');
  return ctx;
}
