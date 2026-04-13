
-- Drop the existing permissive INSERT policy
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;

-- Create a restrictive INSERT policy that only allows existing admins to insert
-- and prevents granting admin role to oneself
CREATE POLICY "restrict_user_roles_insert"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND user_id <> auth.uid()
);

-- Create a permissive INSERT policy for the security definer trigger (new user signup)
-- This allows the trigger function to insert the default 'user' role
CREATE POLICY "Allow admin insert roles"
ON public.user_roles
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
);
