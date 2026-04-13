
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete user settings"
ON public.user_settings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete sync history"
ON public.sync_history
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
