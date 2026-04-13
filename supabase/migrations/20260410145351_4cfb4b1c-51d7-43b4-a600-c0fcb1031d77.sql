CREATE POLICY "Managers can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can view all settings"
ON public.user_settings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can view all sync history"
ON public.sync_history FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can view all teams"
ON public.teams FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can view all team members"
ON public.team_members FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'manager'::app_role));
