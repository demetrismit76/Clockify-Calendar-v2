
ALTER TABLE public.user_settings
ADD COLUMN banned boolean NOT NULL DEFAULT false;
