INSERT INTO public.app_settings (key, value)
VALUES ('ai_refinement_enabled', '{"enabled": true}'::jsonb)
ON CONFLICT DO NOTHING;