
-- Team leads can view profiles of their team members
CREATE POLICY "Team leads can view team member profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  user_id IN (SELECT public.get_team_member_ids(auth.uid()))
);

-- Admins can update team_members (for role changes)
CREATE POLICY "Admins can update team members" ON public.team_members
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
