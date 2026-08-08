/*
# Add bootstrap check function

## Problem
The AuthContext checks bootstrap mode by counting profiles, but the profiles
table only allows SELECT for authenticated users. Anon users (not yet signed in)
always get count=0, so isBootstrap is always true.

## Fix
Create a SECURITY DEFINER function that checks if any admin exists. This bypasses
RLS and can be called by anon users via RPC.
*/

CREATE OR REPLACE FUNCTION public.is_bootstrap_mode()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count int;
BEGIN
  SELECT count(*) INTO admin_count FROM public.profiles WHERE role = 'admin';
  RETURN admin_count = 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_bootstrap_mode() TO anon, authenticated;