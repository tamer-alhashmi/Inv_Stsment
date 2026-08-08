/*
# Fix bootstrap admin: allow first user to self-promote when no admins exist

## Purpose
The prevent_profile_role_change trigger blocks all direct role changes via the
client. This breaks the bootstrap flow where the first user needs to set
themselves as admin. This migration updates the trigger function to allow
role changes when no admins exist yet (bootstrap mode).

## Changes
- Updated prevent_profile_role_change() function: checks if any admin exists.
  If zero admins, allows the role change (bootstrap). Otherwise blocks it
  unless the caller is service_role.
*/

CREATE OR REPLACE FUNCTION prevent_profile_role_change()
RETURNS trigger AS $$
DECLARE
  admin_count int;
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND current_setting('role', true) != 'service_role' THEN
    SELECT count(*) INTO admin_count FROM profiles WHERE role = 'admin';
    IF admin_count = 0 THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Role changes are not allowed through the client. Use the user management function.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;