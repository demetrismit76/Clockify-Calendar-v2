
-- 1. Create a BEFORE UPDATE trigger that prevents non-admins from changing approved/banned
CREATE OR REPLACE FUNCTION public.protect_user_settings_flags()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If approved or banned is being changed, check if the caller is an admin
  IF (NEW.approved IS DISTINCT FROM OLD.approved OR NEW.banned IS DISTINCT FROM OLD.banned) THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      -- Silently revert the privileged fields
      NEW.approved := OLD.approved;
      NEW.banned := OLD.banned;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_settings_flags
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.protect_user_settings_flags();

-- 2. Simplify the user UPDATE policy (trigger handles protection now)
DROP POLICY "Users can update own settings" ON public.user_settings;

CREATE POLICY "Users can update own settings"
ON public.user_settings
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Fix manager API key exposure: create a security definer function 
-- that returns settings without sensitive credentials
CREATE OR REPLACE FUNCTION public.get_user_settings_safe()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  sync_mode text,
  ai_enabled boolean,
  include_project_in_description boolean,
  dark_mode boolean,
  theme_preset text,
  layout_preset text,
  calendar_target text,
  default_last_week boolean,
  approved boolean,
  banned boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id, user_id, sync_mode, ai_enabled, include_project_in_description,
    dark_mode, theme_preset, layout_preset, calendar_target, default_last_week,
    approved, banned, created_at, updated_at
  FROM public.user_settings;
$$;

-- 4. Replace manager SELECT policy to exclude sensitive columns
DROP POLICY "Managers can view all settings" ON public.user_settings;

CREATE POLICY "Managers can view own settings only"
ON public.user_settings
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND has_role(auth.uid(), 'manager')
);
