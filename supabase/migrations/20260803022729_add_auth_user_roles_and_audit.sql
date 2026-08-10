/*
# Add authentication, user roles, and audit history

## Purpose
Transform the app from single-tenant (no auth) to multi-user with email/password
sign-in. Introduces admin/user roles, a profiles table synced with auth.users,
user management audit log, and tracks who created each document.

## Changes

### 1. New table: profiles
- id (uuid, PK, FK to auth.users) — one row per auth user
- email (text) — cached email for display
- role (text, CHECK in 'admin','user') — admin can access Settings + User Management
- created_at (timestamptz)
- RLS: authenticated users can read all profiles (needed for user lists).
  Self-update allowed but role column is protected via a trigger — only the
  edge function (service role) can change roles.

### 2. New table: user_history
- Audit log of user management actions (create/update/delete)
- action_type, target_email, target_role, performed_by_email, details, created_at
- RLS: admin-only read via authenticated + role check

### 3. Altered table: document_history
- Added created_by_email (text) column to track who generated each document
- Backfilled existing rows with 'system'

### 4. RLS policy changes
- app_settings, council_letters, document_history: changed from anon+authenticated
  to authenticated-only. Now requires sign-in.
- app_settings UPDATE/DELETE: admin-only (role check via profiles table)

### 5. Trigger: enforce role changes via service role only
- prevent_profile_role_change trigger blocks direct UPDATE of role column
  unless the connection uses service_role (bypasses RLS)

### 6. Trigger: auto-create profile on signup
- handle_new_user trigger on auth.users inserts a profiles row on new signup
*/

-- ============================================================
-- 1. profiles table
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;
CREATE POLICY "profiles_select_authenticated" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_self" ON profiles;
CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- 2. user_history table
-- ============================================================
CREATE TABLE IF NOT EXISTS user_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL CHECK (action_type IN ('create', 'update', 'delete', 'role_change')),
  target_email text NOT NULL DEFAULT '',
  target_role text,
  performed_by_email text NOT NULL DEFAULT '',
  details text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_history ENABLE ROW LEVEL SECURITY;

-- Only admins can read user history (role check via profiles join)
DROP POLICY IF EXISTS "user_history_select_admin" ON user_history;
CREATE POLICY "user_history_select_admin" ON user_history FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "user_history_insert_authenticated" ON user_history;
CREATE POLICY "user_history_insert_authenticated" ON user_history FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================================
-- 3. Add created_by_email to document_history
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document_history' AND column_name = 'created_by_email') THEN
    ALTER TABLE document_history ADD COLUMN created_by_email text NOT NULL DEFAULT 'system';
  END IF;
END $$;

-- ============================================================
-- 4. Update RLS on existing tables: require authentication
-- ============================================================

-- app_settings: admin-only write, authenticated read
DROP POLICY IF EXISTS "anon_select_settings" ON app_settings;
DROP POLICY IF EXISTS "anon_insert_settings" ON app_settings;
DROP POLICY IF EXISTS "anon_update_settings" ON app_settings;
DROP POLICY IF EXISTS "anon_delete_settings" ON app_settings;

DROP POLICY IF EXISTS "auth_select_settings" ON app_settings;
CREATE POLICY "auth_select_settings" ON app_settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_update_settings" ON app_settings;
CREATE POLICY "admin_update_settings" ON app_settings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_insert_settings" ON app_settings;
CREATE POLICY "admin_insert_settings" ON app_settings FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- council_letters: authenticated CRUD
DROP POLICY IF EXISTS "anon_select_council_letters" ON council_letters;
DROP POLICY IF EXISTS "anon_insert_council_letters" ON council_letters;
DROP POLICY IF EXISTS "anon_update_council_letters" ON council_letters;
DROP POLICY IF EXISTS "anon_delete_council_letters" ON council_letters;

DROP POLICY IF EXISTS "auth_select_council_letters" ON council_letters;
CREATE POLICY "auth_select_council_letters" ON council_letters FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_council_letters" ON council_letters;
CREATE POLICY "auth_insert_council_letters" ON council_letters FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_council_letters" ON council_letters;
CREATE POLICY "auth_update_council_letters" ON council_letters FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_council_letters" ON council_letters;
CREATE POLICY "auth_delete_council_letters" ON council_letters FOR DELETE
  TO authenticated USING (true);

-- document_history: authenticated read + insert
DROP POLICY IF EXISTS "anon_select_doc_history" ON document_history;
DROP POLICY IF EXISTS "anon_insert_doc_history" ON document_history;
DROP POLICY IF EXISTS "anon_update_doc_history" ON document_history;
DROP POLICY IF EXISTS "anon_delete_doc_history" ON document_history;

DROP POLICY IF EXISTS "auth_select_doc_history" ON document_history;
CREATE POLICY "auth_select_doc_history" ON document_history FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_doc_history" ON document_history;
CREATE POLICY "auth_insert_doc_history" ON document_history FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_doc_history" ON document_history;
CREATE POLICY "auth_update_doc_history" ON document_history FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_doc_history" ON document_history;
CREATE POLICY "auth_delete_doc_history" ON document_history FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- 5. Trigger: prevent direct role changes (only service_role bypasses)
-- ============================================================
CREATE OR REPLACE FUNCTION prevent_profile_role_change()
RETURNS trigger AS $$
BEGIN
  -- When role is being changed and the current role is not service_role,
  -- block the change. service_role bypasses RLS and this check.
  IF NEW.role IS DISTINCT FROM OLD.role AND current_setting('role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Role changes are not allowed through the client. Use the user management function.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_role_change ON profiles;
CREATE TRIGGER trg_prevent_role_change
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_profile_role_change();

-- ============================================================
-- 6. Trigger: auto-create profile on new signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();