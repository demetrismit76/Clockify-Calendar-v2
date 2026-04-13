
-- Add approved column to user_settings
ALTER TABLE public.user_settings
ADD COLUMN approved boolean NOT NULL DEFAULT false;

-- Auto-approve existing users
UPDATE public.user_settings SET approved = true;

-- Create trigger function to auto-approve gocanvas.com users
CREATE OR REPLACE FUNCTION public.handle_user_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;
  
  IF user_email LIKE '%@gocanvas.com' THEN
    NEW.approved := true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger on user_settings insert
CREATE TRIGGER auto_approve_gocanvas
BEFORE INSERT ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_user_approval();
