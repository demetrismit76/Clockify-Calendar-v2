DROP POLICY IF EXISTS "restrict_user_roles_insert" ON public.user_roles;
DROP POLICY IF EXISTS "Allow admin insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;

CREATE POLICY "user_roles_insert_admin_only"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));