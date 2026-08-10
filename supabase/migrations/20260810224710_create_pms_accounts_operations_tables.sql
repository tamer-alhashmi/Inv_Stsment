/*
# Create PMS Accounts, Operations, and Email Templates Tables

## New Tables (creation order respects FK dependencies)
1. email_templates — configurable email templates (before emails table)
2. invoices — invoice records with VAT, totals, payment status
3. invoice_items — line items per invoice
4. payments — payment records
5. credit_notes — credit notes
6. tasks — follow-up tasks
7. notifications — system alerts
8. audit_logs — audit trail
9. documents — document metadata
10. emails — email log

## Security
- RLS enabled on all tables, scoped to authenticated users.
- Full CRUD for authenticated users (internal back-office tool).
*/

-- ============================================================================
-- EMAIL TEMPLATES (created first — emails table has FK to it)
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('reservations', 'council', 'accounts', 'guest', 'general')),
  subject text NOT NULL,
  body text NOT NULL,
  variables text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_email_templates" ON email_templates;
CREATE POLICY "auth_select_email_templates" ON email_templates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_email_templates" ON email_templates;
CREATE POLICY "auth_insert_email_templates" ON email_templates FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_email_templates" ON email_templates;
CREATE POLICY "auth_update_email_templates" ON email_templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_email_templates" ON email_templates;
CREATE POLICY "auth_delete_email_templates" ON email_templates FOR DELETE TO authenticated USING (true);

INSERT INTO email_templates (name, category, subject, body, variables) VALUES
('Funding Confirmation Request', 'council',
 'Funding Confirmation Required – {{GuestName}}',
 'Dear {{CouncilContact}},\n\nFor our records and billing purposes, please confirm the following:\n\nGuest: {{GuestName}}\nRoom/Unit: {{RoomNumber}}\nFirst Occupation: {{FirstOccupationDate}}\nCouncil Funding Start: {{FundingStartDate}}\nCouncil Funding End: {{FundingEndDate}}\nRate: £{{Rate}}\nCouncil Reference: {{CouncilReference}}\nPO/Authorisation: {{POReference}}\n\nPlease confirm that the Council accepts responsibility for the accommodation charges for the approved funding period.\n\nKind regards,\n{{StaffName}}\n{{HotelName}}',
 ARRAY['GuestName','CouncilContact','RoomNumber','FirstOccupationDate','FundingStartDate','FundingEndDate','Rate','CouncilReference','POReference','StaffName','HotelName']),
('Extension Request', 'council',
 'Extension Request – {{GuestName}}',
 'Dear {{CouncilContact}},\n\nThe current Council funding for {{GuestName}} at {{HotelName}} is due to expire on {{FundingEndDate}}.\n\nWe kindly request an extension of the funding period.\n\nCurrent Room/Unit: {{RoomNumber}}\nCurrent Funding End: {{FundingEndDate}}\nCouncil Reference: {{CouncilReference}}\n\nPlease advise if an extension can be approved.\n\nKind regards,\n{{StaffName}}\n{{HotelName}}',
 ARRAY['GuestName','CouncilContact','HotelName','FundingEndDate','RoomNumber','CouncilReference','StaffName']),
('Booking Confirmation', 'reservations',
 'Booking Confirmation – {{HotelName}} – {{GuestName}}',
 'Dear {{GuestName}},\n\nWe are pleased to confirm your booking at {{HotelName}}.\n\nBooking Reference: {{BookingReference}}\nCheck-in: {{CheckInDate}}\nCheck-out: {{CheckOutDate}}\nRoom/Unit: {{RoomNumber}}\nNumber of Nights: {{Nights}}\nRate: £{{Rate}}\nTotal: £{{TotalAmount}}\n\nWe look forward to welcoming you.\n\nKind regards,\n{{StaffName}}\n{{HotelName}}',
 ARRAY['GuestName','HotelName','BookingReference','CheckInDate','CheckOutDate','RoomNumber','Nights','Rate','TotalAmount','StaffName']),
('Invoice Submission', 'accounts',
 'Invoice {{InvoiceNumber}} – {{HotelName}}',
 'Dear {{GuestName}},\n\nPlease find attached invoice {{InvoiceNumber}} for your recent stay at {{HotelName}}.\n\nInvoice Amount: £{{InvoiceAmount}}\nOutstanding Balance: £{{OutstandingBalance}}\n\nPlease arrange payment at your earliest convenience.\n\nKind regards,\n{{StaffName}}\n{{HotelName}}',
 ARRAY['GuestName','HotelName','InvoiceNumber','InvoiceAmount','OutstandingBalance','StaffName']),
('Payment Reminder', 'accounts',
 'Payment Reminder – Invoice {{InvoiceNumber}}',
 'Dear {{GuestName}},\n\nThis is a reminder that invoice {{InvoiceNumber}} for £{{InvoiceAmount}} is now overdue.\n\nOutstanding Balance: £{{OutstandingBalance}}\n\nPlease arrange payment as soon as possible.\n\nKind regards,\n{{StaffName}}\n{{HotelName}}',
 ARRAY['GuestName','InvoiceNumber','InvoiceAmount','OutstandingBalance','StaffName','HotelName']),
('Pre-arrival Information', 'guest',
 'Your Stay at {{HotelName}} – Arrival Information',
 'Dear {{GuestName}},\n\nWe look forward to welcoming you to {{HotelName}} on {{CheckInDate}}.\n\nCheck-in: {{CheckInDate}}\nCheck-out: {{CheckOutDate}}\nRoom/Unit: {{RoomNumber}}\n\nIf you have any special requirements, please do not hesitate to contact us.\n\nKind regards,\n{{StaffName}}\n{{HotelName}}',
 ARRAY['GuestName','HotelName','CheckInDate','CheckOutDate','RoomNumber','StaffName'])
ON CONFLICT DO NOTHING;

-- ============================================================================
-- INVOICES
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
  council_case_id uuid REFERENCES council_cases(id) ON DELETE SET NULL,
  reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL,
  accommodation_period_start date,
  accommodation_period_end date,
  unit_name text,
  nights integer,
  rate numeric,
  subtotal numeric NOT NULL DEFAULT 0,
  vat_rate numeric DEFAULT 0.20,
  vat_amount numeric DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  payments_total numeric DEFAULT 0,
  credits_total numeric DEFAULT 0,
  balance numeric GENERATED ALWAYS AS (total - payments_total - credits_total) STORED,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'part_paid', 'paid', 'overdue', 'disputed', 'cancelled', 'refunded')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_invoices" ON invoices;
CREATE POLICY "auth_select_invoices" ON invoices FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_invoices" ON invoices;
CREATE POLICY "auth_insert_invoices" ON invoices FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_invoices" ON invoices;
CREATE POLICY "auth_update_invoices" ON invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_invoices" ON invoices;
CREATE POLICY "auth_delete_invoices" ON invoices FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_invoices_guest ON invoices(guest_id);
CREATE INDEX IF NOT EXISTS idx_invoices_property ON invoices(property_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);

-- ============================================================================
-- INVOICE ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  line_total numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_invoice_items" ON invoice_items;
CREATE POLICY "auth_select_invoice_items" ON invoice_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_invoice_items" ON invoice_items;
CREATE POLICY "auth_insert_invoice_items" ON invoice_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_invoice_items" ON invoice_items;
CREATE POLICY "auth_update_invoice_items" ON invoice_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_invoice_items" ON invoice_items;
CREATE POLICY "auth_delete_invoice_items" ON invoice_items FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- ============================================================================
-- PAYMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL,
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  method text CHECK (method IN ('cash', 'card', 'bank_transfer', 'cheque', 'online', 'other')),
  reference text,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_payments" ON payments;
CREATE POLICY "auth_select_payments" ON payments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_payments" ON payments;
CREATE POLICY "auth_insert_payments" ON payments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_payments" ON payments;
CREATE POLICY "auth_update_payments" ON payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_payments" ON payments;
CREATE POLICY "auth_delete_payments" ON payments FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_guest ON payments(guest_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- ============================================================================
-- CREDIT NOTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_number text UNIQUE NOT NULL,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  reason text,
  credit_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_credit_notes" ON credit_notes;
CREATE POLICY "auth_select_credit_notes" ON credit_notes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_credit_notes" ON credit_notes;
CREATE POLICY "auth_insert_credit_notes" ON credit_notes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_credit_notes" ON credit_notes;
CREATE POLICY "auth_update_credit_notes" ON credit_notes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_credit_notes" ON credit_notes;
CREATE POLICY "auth_delete_credit_notes" ON credit_notes FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice ON credit_notes(invoice_id);

-- ============================================================================
-- TASKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  guest_id uuid REFERENCES guests(id) ON DELETE SET NULL,
  reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL,
  council_case_id uuid REFERENCES council_cases(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'completed', 'escalated')),
  due_date date,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  completed_at timestamptz,
  auto_generated boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_tasks" ON tasks;
CREATE POLICY "auth_select_tasks" ON tasks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_tasks" ON tasks;
CREATE POLICY "auth_insert_tasks" ON tasks FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_tasks" ON tasks;
CREATE POLICY "auth_update_tasks" ON tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_tasks" ON tasks;
CREATE POLICY "auth_delete_tasks" ON tasks FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('funding_expiring', 'funding_expired', 'invoice_overdue', 'extension_required', 'new_council_enquiry', 'missing_po', 'payment_received', 'task_due', 'general')),
  title text NOT NULL,
  message text,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical', 'success')),
  link text,
  is_read boolean DEFAULT false,
  related_guest_id uuid REFERENCES guests(id) ON DELETE CASCADE,
  related_case_id uuid REFERENCES council_cases(id) ON DELETE CASCADE,
  related_invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_notifications" ON notifications;
CREATE POLICY "auth_select_notifications" ON notifications FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_notifications" ON notifications;
CREATE POLICY "auth_insert_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_notifications" ON notifications;
CREATE POLICY "auth_update_notifications" ON notifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_notifications" ON notifications;
CREATE POLICY "auth_delete_notifications" ON notifications FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(is_read) WHERE is_read = false;

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_audit_logs" ON audit_logs;
CREATE POLICY "auth_select_audit_logs" ON audit_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_audit_logs" ON audit_logs;
CREATE POLICY "auth_insert_audit_logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_audit_logs" ON audit_logs;
CREATE POLICY "auth_update_audit_logs" ON audit_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_audit_logs" ON audit_logs;
CREATE POLICY "auth_delete_audit_logs" ON audit_logs FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ============================================================================
-- DOCUMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  doc_type text NOT NULL CHECK (doc_type IN ('registration_form', 'booking_confirmation', 'council_approval', 'funding_letter', 'po_document', 'invoice', 'payment_confirmation', 'guest_document', 'correspondence', 'other')),
  guest_id uuid REFERENCES guests(id) ON DELETE CASCADE,
  reservation_id uuid REFERENCES reservations(id) ON DELETE CASCADE,
  council_case_id uuid REFERENCES council_cases(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  file_url text,
  file_size bigint,
  mime_type text,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_documents" ON documents;
CREATE POLICY "auth_select_documents" ON documents FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_documents" ON documents;
CREATE POLICY "auth_insert_documents" ON documents FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_documents" ON documents;
CREATE POLICY "auth_update_documents" ON documents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_documents" ON documents;
CREATE POLICY "auth_delete_documents" ON documents FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_documents_guest ON documents(guest_id);
CREATE INDEX IF NOT EXISTS idx_documents_case ON documents(council_case_id);

-- ============================================================================
-- EMAILS
-- ============================================================================
CREATE TABLE IF NOT EXISTS emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_email text NOT NULL,
  to_email text NOT NULL,
  cc_email text,
  bcc_email text,
  subject text NOT NULL,
  body text,
  template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL,
  guest_id uuid REFERENCES guests(id) ON DELETE CASCADE,
  reservation_id uuid REFERENCES reservations(id) ON DELETE CASCADE,
  council_case_id uuid REFERENCES council_cases(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  attachments jsonb,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'draft')),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_emails" ON emails;
CREATE POLICY "auth_select_emails" ON emails FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_emails" ON emails;
CREATE POLICY "auth_insert_emails" ON emails FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_emails" ON emails;
CREATE POLICY "auth_update_emails" ON emails FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_emails" ON emails;
CREATE POLICY "auth_delete_emails" ON emails FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_emails_guest ON emails(guest_id);
CREATE INDEX IF NOT EXISTS idx_emails_case ON emails(council_case_id);
CREATE INDEX IF NOT EXISTS idx_emails_created ON emails(created_at);

-- ============================================================================
-- UPDATED_AT triggers for new tables
-- ============================================================================
DROP TRIGGER IF EXISTS trg_invoices_updated ON invoices;
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_tasks_updated ON tasks;
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_email_templates_updated ON email_templates;
CREATE TRIGGER trg_email_templates_updated BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
