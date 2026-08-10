
/*
# Invoice System - Core Tables

## Purpose
Support a hotel back-office invoice system that generates invoices, statements,
and council letters for hotel guests. Data is pulled from Google Sheets (In&Out)
and this database stores council letter templates, saved documents, and settings.

## Tables

### council_letters
Stores saved council letter drafts. Fields:
- id (uuid, PK)
- council_name, council_address, council_reference (text) — addressee info
- officer_name, officer_title (text) — officer receiving the letter
- letter_date (date) — date on the letter
- guest_name (text) — guest the letter is about
- hotel_name (text) — which hotel
- custom_notes (text) — any additional notes added to the letter
- booking_references (text[]) — array of booking refs included
- created_at, updated_at

### invoice_settings
Stores per-hotel display overrides (logo URL, footer, etc.) keyed by hotel name.

### document_history
Audit log of every generated document (invoice, statement, council letter).
*/

-- Council letter saved templates
CREATE TABLE IF NOT EXISTS council_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  council_name text NOT NULL DEFAULT '',
  council_address text NOT NULL DEFAULT '',
  council_reference text NOT NULL DEFAULT '',
  officer_name text NOT NULL DEFAULT '',
  officer_title text NOT NULL DEFAULT '',
  letter_date date NOT NULL DEFAULT CURRENT_DATE,
  guest_name text NOT NULL DEFAULT '',
  hotel_name text NOT NULL DEFAULT '',
  custom_notes text NOT NULL DEFAULT '',
  booking_references text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE council_letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_council_letters" ON council_letters;
CREATE POLICY "anon_select_council_letters" ON council_letters FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_council_letters" ON council_letters;
CREATE POLICY "anon_insert_council_letters" ON council_letters FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_council_letters" ON council_letters;
CREATE POLICY "anon_update_council_letters" ON council_letters FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_council_letters" ON council_letters;
CREATE POLICY "anon_delete_council_letters" ON council_letters FOR DELETE
  TO anon, authenticated USING (true);

-- Document history / audit log
CREATE TABLE IF NOT EXISTS document_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type text NOT NULL CHECK (doc_type IN ('invoice', 'statement', 'council_letter', 'combined')),
  guest_name text NOT NULL DEFAULT '',
  hotel_name text NOT NULL DEFAULT '',
  booking_references text[] NOT NULL DEFAULT '{}',
  booking_count int NOT NULL DEFAULT 0,
  council_letter_id uuid REFERENCES council_letters(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE document_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_doc_history" ON document_history;
CREATE POLICY "anon_select_doc_history" ON document_history FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_doc_history" ON document_history;
CREATE POLICY "anon_insert_doc_history" ON document_history FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_doc_history" ON document_history;
CREATE POLICY "anon_update_doc_history" ON document_history FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_doc_history" ON document_history;
CREATE POLICY "anon_delete_doc_history" ON document_history FOR DELETE
  TO anon, authenticated USING (true);
