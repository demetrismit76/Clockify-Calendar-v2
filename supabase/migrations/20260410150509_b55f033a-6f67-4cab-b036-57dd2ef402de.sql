INSERT INTO public.app_settings (key, value)
VALUES ('auto_api_enabled', '{"enabled": true}'::jsonb)
ON CONFLICT DO NOTHING;