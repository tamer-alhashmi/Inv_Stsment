/*
# Create PMS Core Tables — Properties, Rooms, Guests, Reservations, Council

Creates the foundational schema for a multi-property hotel management system.

## Table Creation Order (respecting FK dependencies)
1. properties — hotel/property master records
2. room_types — configurable unit types per property
3. units — individual accommodation units
4. booking_sources — configurable booking channels
5. guests — central guest master profiles
6. councils — council organisations
7. council_contacts — contacts within councils
8. council_cases — council-funded guest cases
9. reservations — booking records (FK to council_cases)
10. funding_periods — council funding periods (FK to reservations + council_cases)
11. room_moves — room movement history

## Security
- RLS enabled on all tables, scoped to authenticated users.
- Full CRUD for authenticated users (internal back-office tool).

## Notes
- All tables use uuid primary keys with gen_random_uuid() defaults.
- Booking/funding statuses use CHECK constraints.
- updated_at triggers on all tables with that column.
- Default booking sources seeded.
*/

-- ============================================================================
-- PROPERTIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  email text,
  phone text,
  property_code text,
  vat_number text,
  vat_rate numeric DEFAULT 0.20,
  invoice_footer text,
  vat_message text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_properties" ON properties;
CREATE POLICY "auth_select_properties" ON properties FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_properties" ON properties;
CREATE POLICY "auth_insert_properties" ON properties FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_properties" ON properties;
CREATE POLICY "auth_update_properties" ON properties FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_properties" ON properties;
CREATE POLICY "auth_delete_properties" ON properties FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- ROOM TYPES
-- ============================================================================
CREATE TABLE IF NOT EXISTS room_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  capacity integer DEFAULT 2,
  bed_config text,
  base_rate numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_room_types" ON room_types;
CREATE POLICY "auth_select_room_types" ON room_types FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_room_types" ON room_types;
CREATE POLICY "auth_insert_room_types" ON room_types FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_room_types" ON room_types;
CREATE POLICY "auth_update_room_types" ON room_types FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_room_types" ON room_types;
CREATE POLICY "auth_delete_room_types" ON room_types FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- UNITS
-- ============================================================================
CREATE TABLE IF NOT EXISTS units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_type_id uuid REFERENCES room_types(id) ON DELETE SET NULL,
  name text NOT NULL,
  floor text,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'dirty', 'clean', 'inspected', 'out_of_order', 'out_of_service', 'reserved')),
  housekeeping_status text DEFAULT 'clean' CHECK (housekeeping_status IN ('clean', 'dirty', 'inspected', 'out_of_service')),
  maintenance_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_units" ON units;
CREATE POLICY "auth_select_units" ON units FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_units" ON units;
CREATE POLICY "auth_insert_units" ON units FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_units" ON units;
CREATE POLICY "auth_update_units" ON units FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_units" ON units;
CREATE POLICY "auth_delete_units" ON units FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_units_property ON units(property_id);

-- ============================================================================
-- BOOKING SOURCES
-- ============================================================================
CREATE TABLE IF NOT EXISTS booking_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('direct', 'ota', 'council', 'corporate', 'agent', 'walk_in', 'other')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE booking_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_booking_sources" ON booking_sources;
CREATE POLICY "auth_select_booking_sources" ON booking_sources FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_booking_sources" ON booking_sources;
CREATE POLICY "auth_insert_booking_sources" ON booking_sources FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_booking_sources" ON booking_sources;
CREATE POLICY "auth_update_booking_sources" ON booking_sources FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_booking_sources" ON booking_sources;
CREATE POLICY "auth_delete_booking_sources" ON booking_sources FOR DELETE TO authenticated USING (true);
INSERT INTO booking_sources (name, category) VALUES
  ('Direct', 'direct'), ('Website', 'direct'), ('Telephone', 'direct'), ('Email', 'direct'),
  ('Walk-in', 'walk_in'), ('Booking.com', 'ota'), ('Expedia', 'ota'), ('Airbnb', 'ota'),
  ('Council', 'council'), ('Corporate', 'corporate'), ('Travel Agent', 'agent'), ('Other OTA', 'ota')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- GUESTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  preferred_name text,
  email text,
  phone text,
  address text,
  country text,
  date_of_birth date,
  id_number text,
  id_type text,
  communication_prefs text,
  notes text,
  tags text[],
  emergency_contact_name text,
  emergency_contact_phone text,
  corporate_affiliation text,
  council_affiliation text,
  duplicate_of uuid REFERENCES guests(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_guests" ON guests;
CREATE POLICY "auth_select_guests" ON guests FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_guests" ON guests;
CREATE POLICY "auth_insert_guests" ON guests FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_guests" ON guests;
CREATE POLICY "auth_update_guests" ON guests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_guests" ON guests;
CREATE POLICY "auth_delete_guests" ON guests FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_guests_name ON guests(full_name);
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests(phone);

-- ============================================================================
-- COUNCILS
-- ============================================================================
CREATE TABLE IF NOT EXISTS councils (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department text,
  address text,
  payment_terms text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE councils ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_councils" ON councils;
CREATE POLICY "auth_select_councils" ON councils FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_councils" ON councils;
CREATE POLICY "auth_insert_councils" ON councils FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_councils" ON councils;
CREATE POLICY "auth_update_councils" ON councils FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_councils" ON councils;
CREATE POLICY "auth_delete_councils" ON councils FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- COUNCIL CONTACTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS council_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  council_id uuid NOT NULL REFERENCES councils(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  email text,
  phone text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE council_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_council_contacts" ON council_contacts;
CREATE POLICY "auth_select_council_contacts" ON council_contacts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_council_contacts" ON council_contacts;
CREATE POLICY "auth_insert_council_contacts" ON council_contacts FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_council_contacts" ON council_contacts;
CREATE POLICY "auth_update_council_contacts" ON council_contacts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_council_contacts" ON council_contacts;
CREATE POLICY "auth_delete_council_contacts" ON council_contacts FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- COUNCIL CASES
-- ============================================================================
CREATE TABLE IF NOT EXISTS council_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text UNIQUE,
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
  council_id uuid NOT NULL REFERENCES councils(id) ON DELETE RESTRICT,
  council_contact_id uuid REFERENCES council_contacts(id) ON DELETE SET NULL,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  council_reference text,
  po_number text,
  approved_rate numeric,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'active', 'awaiting_council', 'funding_expiring', 'extended', 'funding_ended', 'guest_self_funded', 'closed')),
  outcome text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);
ALTER TABLE council_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_council_cases" ON council_cases;
CREATE POLICY "auth_select_council_cases" ON council_cases FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_council_cases" ON council_cases;
CREATE POLICY "auth_insert_council_cases" ON council_cases FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_council_cases" ON council_cases;
CREATE POLICY "auth_update_council_cases" ON council_cases FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_council_cases" ON council_cases;
CREATE POLICY "auth_delete_council_cases" ON council_cases FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_council_cases_guest ON council_cases(guest_id);
CREATE INDEX IF NOT EXISTS idx_council_cases_council ON council_cases(council_id);
CREATE INDEX IF NOT EXISTS idx_council_cases_status ON council_cases(status);

-- ============================================================================
-- RESERVATIONS (before funding_periods — funding_periods has FK to reservations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_number text UNIQUE,
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  unit_id uuid REFERENCES units(id) ON DELETE SET NULL,
  booking_source_id uuid REFERENCES booking_sources(id) ON DELETE SET NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  nights integer GENERATED ALWAYS AS (check_out - check_in) STORED,
  guest_count integer DEFAULT 1,
  rate numeric,
  total_value numeric,
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'part_paid', 'paid', 'overdue', 'disputed', 'cancelled', 'refunded')),
  booking_status text NOT NULL DEFAULT 'confirmed' CHECK (booking_status IN ('enquiry', 'tentative', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show', 'extended', 'closed')),
  external_reference text,
  council_reference text,
  po_number text,
  notes text,
  internal_notes text,
  council_case_id uuid REFERENCES council_cases(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_reservations" ON reservations;
CREATE POLICY "auth_select_reservations" ON reservations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_reservations" ON reservations;
CREATE POLICY "auth_insert_reservations" ON reservations FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_reservations" ON reservations;
CREATE POLICY "auth_update_reservations" ON reservations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_reservations" ON reservations;
CREATE POLICY "auth_delete_reservations" ON reservations FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_reservations_guest ON reservations(guest_id);
CREATE INDEX IF NOT EXISTS idx_reservations_property ON reservations(property_id);
CREATE INDEX IF NOT EXISTS idx_reservations_unit ON reservations(unit_id);
CREATE INDEX IF NOT EXISTS idx_reservations_check_in ON reservations(check_in);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(booking_status);

-- ============================================================================
-- FUNDING PERIODS (after reservations — has FK to reservations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS funding_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  council_case_id uuid NOT NULL REFERENCES council_cases(id) ON DELETE CASCADE,
  reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL,
  funding_start date NOT NULL,
  funding_end date NOT NULL,
  approved_rate numeric,
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('awaiting_confirmation', 'approved', 'active', 'expiring', 'extension_requested', 'extension_approved', 'expired', 'terminated', 'guest_responsible', 'other_payer', 'disputed')),
  extension_of uuid REFERENCES funding_periods(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);
ALTER TABLE funding_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_funding_periods" ON funding_periods;
CREATE POLICY "auth_select_funding_periods" ON funding_periods FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_funding_periods" ON funding_periods;
CREATE POLICY "auth_insert_funding_periods" ON funding_periods FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_funding_periods" ON funding_periods;
CREATE POLICY "auth_update_funding_periods" ON funding_periods FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_funding_periods" ON funding_periods;
CREATE POLICY "auth_delete_funding_periods" ON funding_periods FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_funding_periods_case ON funding_periods(council_case_id);
CREATE INDEX IF NOT EXISTS idx_funding_periods_status ON funding_periods(status);

-- ============================================================================
-- ROOM MOVES
-- ============================================================================
CREATE TABLE IF NOT EXISTS room_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  from_unit_id uuid REFERENCES units(id) ON DELETE SET NULL,
  to_unit_id uuid NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  effective_date date NOT NULL,
  reason text,
  rate_impact text,
  funding_impact text,
  council_notified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);
ALTER TABLE room_moves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_room_moves" ON room_moves;
CREATE POLICY "auth_select_room_moves" ON room_moves FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_room_moves" ON room_moves;
CREATE POLICY "auth_insert_room_moves" ON room_moves FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_room_moves" ON room_moves;
CREATE POLICY "auth_update_room_moves" ON room_moves FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_room_moves" ON room_moves;
CREATE POLICY "auth_delete_room_moves" ON room_moves FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_room_moves_guest ON room_moves(guest_id);
CREATE INDEX IF NOT EXISTS idx_room_moves_reservation ON room_moves(reservation_id);

-- ============================================================================
-- UPDATED_AT triggers
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_properties_updated ON properties;
CREATE TRIGGER trg_properties_updated BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_room_types_updated ON room_types;
CREATE TRIGGER trg_room_types_updated BEFORE UPDATE ON room_types FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_units_updated ON units;
CREATE TRIGGER trg_units_updated BEFORE UPDATE ON units FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_guests_updated ON guests;
CREATE TRIGGER trg_guests_updated BEFORE UPDATE ON guests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_reservations_updated ON reservations;
CREATE TRIGGER trg_reservations_updated BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_councils_updated ON councils;
CREATE TRIGGER trg_councils_updated BEFORE UPDATE ON councils FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_council_cases_updated ON council_cases;
CREATE TRIGGER trg_council_cases_updated BEFORE UPDATE ON council_cases FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_funding_periods_updated ON funding_periods;
CREATE TRIGGER trg_funding_periods_updated BEFORE UPDATE ON funding_periods FOR EACH ROW EXECUTE FUNCTION update_updated_at();
