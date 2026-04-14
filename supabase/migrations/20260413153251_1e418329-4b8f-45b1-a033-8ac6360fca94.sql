
CREATE TABLE public.calendar_feeds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  feed_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  feed_name text NOT NULL DEFAULT 'My Calendar Feed',
  ics_content text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feed"
ON public.calendar_feeds FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feed"
ON public.calendar_feeds FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feed"
ON public.calendar_feeds FOR UPDATE
USING (auth.uid() = user_id);

CREATE TRIGGER update_calendar_feeds_updated_at
BEFORE UPDATE ON public.calendar_feeds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
