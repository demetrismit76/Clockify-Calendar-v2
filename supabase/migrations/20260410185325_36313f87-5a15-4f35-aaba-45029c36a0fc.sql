CREATE OR REPLACE FUNCTION public.user_settings_flags_unchanged(_settings_id uuid, _approved boolean, _banned boolean)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_settings us
    WHERE us.id = _settings_id
      AND us.approved IS NOT DISTINCT FROM _approved
      AND us.banned IS NOT DISTINCT FROM _banned
  );
$$;

DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings"
ON public.user_settings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND public.user_settings_flags_unchanged(id, approved, banned)
);

DROP POLICY IF EXISTS "Admins can update all user settings" ON public.user_settings;
CREATE POLICY "Admins can update all user settings"
ON public.user_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS protect_user_settings_flags_before_update ON public.user_settings;
CREATE TRIGGER protect_user_settings_flags_before_update
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.protect_user_settings_flags();