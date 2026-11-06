/*
# Create Sheet Import Log Table

## Purpose
Tracks each sync operation that imports data from the Google Sheets "In & Out" tab
into the Supabase database (guests, properties, booking sources, units, reservations).

## New Tables
- `sheet_imports` — log of each import run with status, row counts, and error details.

## Columns
- `id` (uuid, primary key)
- `status` (text: 'running', 'success', 'failed')
- `rows_processed` (integer, number of sheet rows handled)
- `guests_upserted` (integer)
- `properties_upserted` (integer)
- `reservations_upserted` (integer)
- `units_upserted` (integer)
- `error_message` (text, null on success)
- `started_at` (timestamptz)
- `completed_at` (timestamptz)

## Security
- RLS enabled, full CRUD for authenticated users (internal back-office tool).
*/

CREATE TABLE IF NOT EXISTS sheet_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  rows_processed integer DEFAULT 0,
  guests_upserted integer DEFAULT 0,
  properties_upserted integer DEFAULT 0,
  reservations_upserted integer DEFAULT 0,
  units_upserted integer DEFAULT 0,
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE sheet_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_sheet_imports" ON sheet_imports;
CREATE POLICY "auth_select_sheet_imports" ON sheet_imports FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_sheet_imports" ON sheet_imports;
CREATE POLICY "auth_insert_sheet_imports" ON sheet_imports FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_sheet_imports" ON sheet_imports;
CREATE POLICY "auth_update_sheet_imports" ON sheet_imports FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_sheet_imports" ON sheet_imports;
CREATE POLICY "auth_delete_sheet_imports" ON sheet_imports FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_sheet_imports_started ON sheet_imports(started_at DESC);
