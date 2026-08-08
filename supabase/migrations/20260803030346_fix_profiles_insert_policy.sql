/*
# Fix: Add INSERT policy on profiles table

## Problem
The handle_new_user trigger fires AFTER INSERT on auth.users to create a profile
row. But the profiles table has no INSERT policy, so RLS blocks the insert and
signup fails with "Database error saving new user".

The trigger function is SECURITY DEFINER, but SECURITY DEFINER bypasses the
*function* owner's permissions — it does NOT bypass RLS unless the table's
owner executes the function. Since Supabase's auth schema triggers run in a
context where RLS still applies, we need an explicit INSERT policy.

## Fix
Add an INSERT policy allowing anyone to insert into profiles (the trigger
controls what gets inserted — only the new user's id/email). This is safe
because:
1. The trigger only fires on auth.users INSERT (managed by Supabase Auth)
2. Direct client INSERTs would need to match the id to an existing auth.users id
   (FK constraint), which a client can't fabricate.
*/

-- Allow the signup trigger to insert profile rows
DROP POLICY IF EXISTS "profiles_insert_signup" ON profiles;
CREATE POLICY "profiles_insert_signup" ON profiles FOR INSERT
  TO anon, authenticated WITH CHECK (true);