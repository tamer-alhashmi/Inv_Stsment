/*
# Create app_settings table for configurable data source

## Purpose
Stores the Google Sheets data source configuration so the user can update
the sheet link from the Settings page without changing code.

## New Tables
- `app_settings` — single-row configuration table (id locked to 1 via CHECK)
  - `sheet_id` (text, NOT NULL) — Google Sheets document ID extracted from the permalink
  - `in_out_gid` (text, NOT NULL) — numeric GID of the In/Out tab containing booking rows
  - `autofill_sheet_name` (text, NOT NULL) — name of the tab holding hotel details (default 'Autofill')
  - `updated_at` (timestamptz) — last modification timestamp
- Seeded with the current hardcoded values so the app works out of the box.

## Security
- RLS enabled. Single-tenant app with no sign-in, so anon + authenticated
  get full CRUD with USING(true) / WITH CHECK(true). The data is intentionally
  shared — there is no per-user isolation.
*/

CREATE TABLE IF NOT EXISTS app_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  sheet_id text NOT NULL DEFAULT '17X2k4MgxDLx8-L30MPmUJL6EVUY6s6xsOQGtj4XkJ1w',
  in_out_gid text NOT NULL DEFAULT '2014952458',
  autofill_sheet_name text NOT NULL DEFAULT 'Autofill',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_settings" ON app_settings;
CREATE POLICY "anon_select_settings" ON app_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_settings" ON app_settings;
CREATE POLICY "anon_insert_settings" ON app_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_settings" ON app_settings;
CREATE POLICY "anon_update_settings" ON app_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_settings" ON app_settings;
CREATE POLICY "anon_delete_settings" ON app_settings FOR DELETE
  TO anon, authenticated USING (true);

INSERT INTO app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;