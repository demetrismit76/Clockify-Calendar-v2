
-- Add team_lead to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'team_lead';

-- Create teams table
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Create team_members table
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role_in_team text NOT NULL DEFAULT 'member' CHECK (role_in_team IN ('member', 'lead')),
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is lead of a specific team
CREATE OR REPLACE FUNCTION public.is_team_lead(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _user_id
      AND team_id = _team_id
      AND role_in_team = 'lead'
  )
$$;

-- Helper: get team members for a lead
CREATE OR REPLACE FUNCTION public.get_team_member_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tm2.user_id
  FROM public.team_members tm1
  JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
  WHERE tm1.user_id = _user_id
    AND tm1.role_in_team = 'lead'
$$;

-- Teams RLS
CREATE POLICY "Admins can manage teams" ON public.teams
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team leads can view their teams" ON public.teams
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = teams.id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their team" ON public.teams
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = teams.id
        AND team_members.user_id = auth.uid()
    )
  );

-- Team members RLS
CREATE POLICY "Admins can manage team members" ON public.team_members
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team leads can view their team members" ON public.team_members
  FOR SELECT TO authenticated
  USING (public.is_team_lead(auth.uid(), team_id));

CREATE POLICY "Team leads can add to their team" ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_team_lead(auth.uid(), team_id));

CREATE POLICY "Team leads can remove from their team" ON public.team_members
  FOR DELETE TO authenticated
  USING (public.is_team_lead(auth.uid(), team_id));

CREATE POLICY "Users can view own membership" ON public.team_members
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Team leads can view sync_history of their team members
CREATE POLICY "Team leads can view team sync history" ON public.sync_history
  FOR SELECT TO authenticated
  USING (
    user_id IN (SELECT public.get_team_member_ids(auth.uid()))
  );
