import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { UserSettings } from '@/types/syncly';

const defaultSettings: UserSettings = {
  clockify_api_key: null,
  google_client_id: null,
  microsoft_client_id: null,
  calendar_target: 'microsoft',
  sync_mode: 'manual',
  ai_enabled: true,
  include_project_in_description: true,
  dark_mode: true,
  default_last_week: false,
  approved: false,
  banned: false,
};

export function useUserSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSettings(defaultSettings);
      setLoading(false);
      return;
    }

    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data && !error) {
        setSettings({
          clockify_api_key: data.clockify_api_key,
          google_client_id: data.google_client_id,
          microsoft_client_id: data.microsoft_client_id,
          calendar_target: data.calendar_target,
          sync_mode: data.sync_mode,
          ai_enabled: data.ai_enabled,
          include_project_in_description: data.include_project_in_description,
          dark_mode: data.dark_mode,
          default_last_week: data.default_last_week,
          approved: (data as any).approved ?? false,
          banned: (data as any).banned ?? false,
        });
      }
      setLoading(false);
    };

    fetchSettings();
  }, [user]);

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!user) return;

    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    await supabase
      .from('user_settings')
      .update(updates)
      .eq('user_id', user.id);
  };

  return { settings, updateSettings, loading };
}
