/*
# Fix: prevent_profile_role_change function also needs search_path
*/
CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count int;
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND current_setting('role', true) != 'service_role' THEN
    SELECT count(*) INTO admin_count FROM public.profiles WHERE role = 'admin';
    IF admin_count = 0 THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Role changes are not allowed through the client. Use the user management function.';
  END IF;
  RETURN NEW;
END;
$$;