// ============================================================================
// Legacy Google Sheets Booking Types (kept for backward compatibility)
// ============================================================================
export interface Booking {
  date: string;
  flat: string;
  flats1: string;
  check: string;
  out: string;
  in: string;
  notes: string;
  phone: string;
  name: string;
  guestCount: string;
  nights: string;
  source: string;
  payment: string;
  roomRate: string;
  status: string;
  otherRev: string;
  totalAmount: string;
  bookingNumber: string;
  methodOfPayment: string;
  email: string;
  checkIn: string;
  checkOut: string;
  hotelName: string;
}

export interface HotelDetails {
  hotel: string;
  address: string;
  email: string;
  phone: string;
  vat: string;
  invoiceFooter: string;
  vatMessage: string;
}

// ============================================================================
// Document Types
// ============================================================================
export interface CouncilLetter {
  id?: string;
  councilName: string;
  councilAddress: string;
  councilReference: string;
  officerName: string;
  officerTitle: string;
  letterDate: string;
  guestName: string;
  hotelName: string;
  customNotes: string;
  bookingReferences: string[];
  createdAt?: string;
}

export type DocType = 'invoice' | 'statement' | 'council_letter' | 'combined';

export interface DocumentHistoryEntry {
  id: string;
  doc_type: DocType;
  guest_name: string;
  hotel_name: string;
  booking_references: string[];
  booking_count: number;
  council_letter_id?: string;
  created_by_email?: string;
  created_at: string;
}

export interface RestoreState {
  guestName: string;
  hotelName: string;
  bookingRefs: string[];
  councilLetterId?: string;
  docType: DocType;
}

// ============================================================================
// Settings & User Types
// ============================================================================
export interface AppSettings {
  sheetId: string;
  inOutGid: string;
  autofillSheetName: string;
}

export type UserRole = 'admin' | 'user';

export interface ManagedUser {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface UserHistoryEntry {
  id: string;
  action_type: 'create' | 'update' | 'delete' | 'role_change';
  target_email: string;
  target_role: string | null;
  performed_by_email: string;
  details: string;
  created_at: string;
}

// ============================================================================
// PMS Core Entity Types
// ============================================================================
export interface Property {
  id: string;
  name: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  property_code: string | null;
  vat_number: string | null;
  vat_rate: number;
  invoice_footer: string | null;
  vat_message: string | null;
  status: 'active' | 'inactive' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface RoomType {
  id: string;
  property_id: string;
  name: string;
  description: string | null;
  capacity: number;
  bed_config: string | null;
  base_rate: number | null;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  property_id: string;
  room_type_id: string | null;
  name: string;
  floor: string | null;
  status: 'available' | 'occupied' | 'dirty' | 'clean' | 'inspected' | 'out_of_order' | 'out_of_service' | 'reserved';
  housekeeping_status: 'clean' | 'dirty' | 'inspected' | 'out_of_service';
  maintenance_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingSource {
  id: string;
  name: string;
  category: 'direct' | 'ota' | 'council' | 'corporate' | 'agent' | 'walk_in' | 'other';
  is_active: boolean;
  created_at: string;
}

export interface Guest {
  id: string;
  full_name: string;
  preferred_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  date_of_birth: string | null;
  id_number: string | null;
  id_type: string | null;
  communication_prefs: string | null;
  notes: string | null;
  tags: string[] | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  corporate_affiliation: string | null;
  council_affiliation: string | null;
  duplicate_of: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  reservation_number: string | null;
  guest_id: string;
  property_id: string;
  unit_id: string | null;
  booking_source_id: string | null;
  check_in: string;
  check_out: string;
  nights: number;
  guest_count: number;
  rate: number | null;
  total_value: number | null;
  payment_status: 'unpaid' | 'part_paid' | 'paid' | 'overdue' | 'disputed' | 'cancelled' | 'refunded';
  booking_status: 'enquiry' | 'tentative' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show' | 'extended' | 'closed';
  external_reference: string | null;
  council_reference: string | null;
  po_number: string | null;
  notes: string | null;
  internal_notes: string | null;
  council_case_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoomMove {
  id: string;
  guest_id: string;
  reservation_id: string | null;
  property_id: string;
  from_unit_id: string | null;
  to_unit_id: string;
  effective_date: string;
  reason: string | null;
  rate_impact: string | null;
  funding_impact: string | null;
  council_notified: boolean;
  created_at: string;
}

export interface Council {
  id: string;
  name: string;
  department: string | null;
  address: string | null;
  payment_terms: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CouncilContact {
  id: string;
  council_id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface CouncilCase {
  id: string;
  case_number: string | null;
  guest_id: string;
  council_id: string;
  council_contact_id: string | null;
  property_id: string;
  council_reference: string | null;
  po_number: string | null;
  approved_rate: number | null;
  status: 'new' | 'active' | 'awaiting_council' | 'funding_expiring' | 'extended' | 'funding_ended' | 'guest_self_funded' | 'closed';
  outcome: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FundingPeriod {
  id: string;
  council_case_id: string;
  reservation_id: string | null;
  funding_start: string;
  funding_end: string;
  approved_rate: number | null;
  status: 'awaiting_confirmation' | 'approved' | 'active' | 'expiring' | 'extension_requested' | 'extension_approved' | 'expired' | 'terminated' | 'guest_responsible' | 'other_payer' | 'disputed';
  extension_of: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Accounts Types
// ============================================================================
export interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  property_id: string;
  guest_id: string;
  council_case_id: string | null;
  reservation_id: string | null;
  accommodation_period_start: string | null;
  accommodation_period_end: string | null;
  unit_name: string | null;
  nights: number | null;
  rate: number | null;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  payments_total: number;
  credits_total: number;
  balance: number;
  status: 'unpaid' | 'part_paid' | 'paid' | 'overdue' | 'disputed' | 'cancelled' | 'refunded';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
  created_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string | null;
  reservation_id: string | null;
  guest_id: string;
  property_id: string | null;
  amount: number;
  payment_date: string;
  method: 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'online' | 'other' | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreditNote {
  id: string;
  credit_note_number: string;
  invoice_id: string | null;
  guest_id: string;
  property_id: string | null;
  amount: number;
  reason: string | null;
  credit_date: string;
  notes: string | null;
  created_at: string;
}

// ============================================================================
// Operations Types
// ============================================================================
export interface Task {
  id: string;
  title: string;
  guest_id: string | null;
  reservation_id: string | null;
  council_case_id: string | null;
  invoice_id: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting' | 'completed' | 'escalated';
  due_date: string | null;
  assigned_to: string | null;
  notes: string | null;
  completed_at: string | null;
  auto_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string | null;
  type: 'funding_expiring' | 'funding_expired' | 'invoice_overdue' | 'extension_required' | 'new_council_enquiry' | 'missing_po' | 'payment_received' | 'task_due' | 'general';
  title: string;
  message: string | null;
  severity: 'info' | 'warning' | 'critical' | 'success';
  link: string | null;
  is_read: boolean;
  related_guest_id: string | null;
  related_case_id: string | null;
  related_invoice_id: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
}

export interface DocumentRecord {
  id: string;
  name: string;
  doc_type: 'registration_form' | 'booking_confirmation' | 'council_approval' | 'funding_letter' | 'po_document' | 'invoice' | 'payment_confirmation' | 'guest_document' | 'correspondence' | 'other';
  guest_id: string | null;
  reservation_id: string | null;
  council_case_id: string | null;
  invoice_id: string | null;
  file_url: string | null;
  file_size: number | null;
  mime_type: string | null;
  notes: string | null;
  created_at: string;
}

export interface EmailRecord {
  id: string;
  from_email: string;
  to_email: string;
  cc_email: string | null;
  bcc_email: string | null;
  subject: string;
  body: string | null;
  template_id: string | null;
  guest_id: string | null;
  reservation_id: string | null;
  council_case_id: string | null;
  invoice_id: string | null;
  attachments: Record<string, unknown> | null;
  status: 'sent' | 'failed' | 'draft';
  created_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: 'reservations' | 'council' | 'accounts' | 'guest' | 'general';
  subject: string;
  body: string;
  variables: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Joined/Composite Types (for queries with relations)
// ============================================================================
export interface ReservationWithRelations extends Reservation {
  guest?: Guest;
  property?: Property;
  unit?: Unit;
  booking_source?: BookingSource;
  council_case?: CouncilCase;
}

export interface CouncilCaseWithRelations extends CouncilCase {
  guest?: Guest;
  council?: Council;
  council_contact?: CouncilContact;
  property?: Property;
  funding_periods?: FundingPeriod[];
  reservations?: Reservation[];
}

export interface InvoiceWithRelations extends Invoice {
  guest?: Guest;
  property?: Property;
  council_case?: CouncilCase;
  reservation?: Reservation;
  items?: InvoiceItem[];
  payments?: Payment[];
}
