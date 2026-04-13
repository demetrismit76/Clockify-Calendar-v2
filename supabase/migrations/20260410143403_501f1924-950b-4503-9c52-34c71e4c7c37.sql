
CREATE POLICY "Admins can update all user settings"
ON public.user_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
