
-- Drop the existing permissive policy
DROP POLICY "Users can update own settings" ON public.user_settings;

-- Recreate with a WITH CHECK that ensures approved and banned remain unchanged
CREATE POLICY "Users can update own settings"
ON public.user_settings
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND approved = (SELECT approved FROM public.user_settings WHERE user_id = auth.uid())
  AND banned = (SELECT banned FROM public.user_settings WHERE user_id = auth.uid())
);
