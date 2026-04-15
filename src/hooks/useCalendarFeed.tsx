import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type FeedRange = 'day' | 'week' | 'month';

export function useCalendarFeed() {
  const { user } = useAuth();
  const [feedToken, setFeedToken] = useState<string | null>(null);
  const [feedRange, setFeedRange] = useState<FeedRange>('week');
  const [loading, setLoading] = useState(true);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const feedUrl = feedToken
    ? `${supabaseUrl}/functions/v1/calendar-feed?token=${feedToken}`
    : null;

  const webcalUrl = feedUrl?.replace(/^https:\/\//, 'webcal://') ?? null;

  useEffect(() => {
    if (!user) {
      setFeedToken(null);
      setLoading(false);
      return;
    }

    const fetch = async () => {
      const { data } = await supabase
        .from('calendar_feeds')
        .select('feed_token, feed_range')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setFeedToken(data.feed_token);
        setFeedRange((data.feed_range as FeedRange) || 'week');
      }
      setLoading(false);
    };

    fetch();
  }, [user]);

  const enableFeed = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('calendar_feeds')
      .insert({ user_id: user.id })
      .select('feed_token, feed_range')
      .single();

    if (data && !error) {
      setFeedToken(data.feed_token);
      setFeedRange((data.feed_range as FeedRange) || 'week');
    }
  }, [user]);

  const updateFeedRange = useCallback(async (range: FeedRange) => {
    if (!user) return;
    setFeedRange(range);
    await supabase
      .from('calendar_feeds')
      .update({ feed_range: range })
      .eq('user_id', user.id);
  }, [user]);

  const updateFeedContent = useCallback(async (icsContent: string) => {
    if (!user || !feedToken) return;
    await supabase
      .from('calendar_feeds')
      .update({ ics_content: icsContent })
      .eq('user_id', user.id);
  }, [user, feedToken]);

  return { feedToken, feedUrl, webcalUrl, feedRange, loading, enableFeed, updateFeedRange, updateFeedContent };
}
