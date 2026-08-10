/*
# Fix: handle_new_user function missing search_path

## Problem
The handle_new_user trigger function is SECURITY DEFINER but has no search_path
set. When Supabase Auth creates a new user, the trigger fires and tries to
INSERT INTO profiles (unqualified). In the auth trigger execution context, the
search_path may not include "public", causing the insert to fail with a generic
"Database error saving new user".

## Fix
Recreate the function with an explicit search_path = public, and schema-qualify
the table reference as public.profiles.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;