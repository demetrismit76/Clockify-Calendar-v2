CREATE TABLE public.admin_notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_key text NOT NULL,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, notification_key)
);

CREATE INDEX idx_admin_notification_reads_user_key
  ON public.admin_notification_reads (user_id, notification_key);

ALTER TABLE public.admin_notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own admin notification reads"
  ON public.admin_notification_reads
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own admin notification reads"
  ON public.admin_notification_reads
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own admin notification reads"
  ON public.admin_notification_reads
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);