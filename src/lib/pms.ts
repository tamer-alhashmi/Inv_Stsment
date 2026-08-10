import { supabase } from './supabase';
import type {
  Property, RoomType, Unit, BookingSource, Guest, Reservation,
  RoomMove, Council, CouncilContact, CouncilCase, FundingPeriod,
  Invoice, InvoiceItem, Payment, CreditNote, Task, Notification,
  AuditLog, DocumentRecord, EmailRecord, EmailTemplate,
  ReservationWithRelations, CouncilCaseWithRelations, InvoiceWithRelations,
} from './types';

// ============================================================================
// PROPERTIES
// ============================================================================
export async function fetchProperties(): Promise<Property[]> {
  const { data, error } = await supabase.from('properties').select('*').order('name');
  if (error) throw error;
  return data as Property[];
}

export async function createProperty(p: Partial<Property>): Promise<Property> {
  const { data, error } = await supabase.from('properties').insert(p).select().single();
  if (error) throw error;
  return data as Property;
}

export async function updateProperty(id: string, updates: Partial<Property>): Promise<Property> {
  const { data, error } = await supabase.from('properties').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as Property;
}

export async function deleteProperty(id: string): Promise<void> {
  const { error } = await supabase.from('properties').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================================
// ROOM TYPES
// ============================================================================
export async function fetchRoomTypes(propertyId?: string): Promise<RoomType[]> {
  let q = supabase.from('room_types').select('*').order('name');
  if (propertyId) q = q.eq('property_id', propertyId);
  const { data, error } = await q;
  if (error) throw error;
  return data as RoomType[];
}

export async function createRoomType(rt: Partial<RoomType>): Promise<RoomType> {
  const { data, error } = await supabase.from('room_types').insert(rt).select().single();
  if (error) throw error;
  return data as RoomType;
}

export async function updateRoomType(id: string, updates: Partial<RoomType>): Promise<RoomType> {
  const { data, error } = await supabase.from('room_types').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as RoomType;
}

export async function deleteRoomType(id: string): Promise<void> {
  const { error } = await supabase.from('room_types').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================================
// UNITS
// ============================================================================
export async function fetchUnits(propertyId?: string): Promise<Unit[]> {
  let q = supabase.from('units').select('*').order('name');
  if (propertyId) q = q.eq('property_id', propertyId);
  const { data, error } = await q;
  if (error) throw error;
  return data as Unit[];
}

export async function createUnit(u: Partial<Unit>): Promise<Unit> {
  const { data, error } = await supabase.from('units').insert(u).select().single();
  if (error) throw error;
  return data as Unit;
}

export async function updateUnit(id: string, updates: Partial<Unit>): Promise<Unit> {
  const { data, error } = await supabase.from('units').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as Unit;
}

export async function deleteUnit(id: string): Promise<void> {
  const { error } = await supabase.from('units').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================================
// BOOKING SOURCES
// ============================================================================
export async function fetchBookingSources(): Promise<BookingSource[]> {
  const { data, error } = await supabase.from('booking_sources').select('*').order('name');
  if (error) throw error;
  return data as BookingSource[];
}

export async function createBookingSource(bs: Partial<BookingSource>): Promise<BookingSource> {
  const { data, error } = await supabase.from('booking_sources').insert(bs).select().single();
  if (error) throw error;
  return data as BookingSource;
}

export async function updateBookingSource(id: string, updates: Partial<BookingSource>): Promise<BookingSource> {
  const { data, error } = await supabase.from('booking_sources').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as BookingSource;
}

export async function deleteBookingSource(id: string): Promise<void> {
  const { error } = await supabase.from('booking_sources').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================================
// GUESTS
// ============================================================================
export async function fetchGuests(search?: string): Promise<Guest[]> {
  let q = supabase.from('guests').select('*').order('full_name');
  if (search) {
    q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data as Guest[];
}

export async function fetchGuest(id: string): Promise<Guest | null> {
  const { data, error } = await supabase.from('guests').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Guest | null;
}

export async function createGuest(g: Partial<Guest>): Promise<Guest> {
  const { data, error } = await supabase.from('guests').insert(g).select().single();
  if (error) throw error;
  return data as Guest;
}

export async function updateGuest(id: string, updates: Partial<Guest>): Promise<Guest> {
  const { data, error } = await supabase.from('guests').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as Guest;
}

export async function deleteGuest(id: string): Promise<void> {
  const { error } = await supabase.from('guests').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================================
// RESERVATIONS
// ============================================================================
export async function fetchReservations(filters?: {
  propertyId?: string;
  guestId?: string;
  status?: string;
  checkInFrom?: string;
  checkInTo?: string;
}): Promise<ReservationWithRelations[]> {
  let q = supabase.from('reservations').select(`
    *,
    guest:guests(*),
    property:properties(*),
    unit:units(*),
    booking_source:booking_sources(*),
    council_case:council_cases(*)
  `).order('check_in', { ascending: false });

  if (filters?.propertyId) q = q.eq('property_id', filters.propertyId);
  if (filters?.guestId) q = q.eq('guest_id', filters.guestId);
  if (filters?.status) q = q.eq('booking_status', filters.status);
  if (filters?.checkInFrom) q = q.gte('check_in', filters.checkInFrom);
  if (filters?.checkInTo) q = q.lte('check_in', filters.checkInTo);

  const { data, error } = await q;
  if (error) throw error;
  return data as ReservationWithRelations[];
}

export async function fetchReservation(id: string): Promise<ReservationWithRelations | null> {
  const { data, error } = await supabase.from('reservations').select(`
    *,
    guest:guests(*),
    property:properties(*),
    unit:units(*),
    booking_source:booking_sources(*),
    council_case:council_cases(*)
  `).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as ReservationWithRelations | null;
}

export async function createReservation(r: Partial<Reservation>): Promise<Reservation> {
  const { data, error } = await supabase.from('reservations').insert(r).select().single();
  if (error) throw error;
  return data as Reservation;
}

export async function updateReservation(id: string, updates: Partial<Reservation>): Promise<Reservation> {
  const { data, error } = await supabase.from('reservations').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as Reservation;
}

export async function deleteReservation(id: string): Promise<void> {
  const { error } = await supabase.from('reservations').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================================
// ROOM MOVES
// ============================================================================
export async function fetchRoomMoves(guestId?: string): Promise<RoomMove[]> {
  let q = supabase.from('room_moves').select('*').order('effective_date', { ascending: false });
  if (guestId) q = q.eq('guest_id', guestId);
  const { data, error } = await q;
  if (error) throw error;
  return data as RoomMove[];
}

export async function createRoomMove(rm: Partial<RoomMove>): Promise<RoomMove> {
  const { data, error } = await supabase.from('room_moves').insert(rm).select().single();
  if (error) throw error;
  return data as RoomMove;
}

// ============================================================================
// COUNCILS
// ============================================================================
export async function fetchCouncils(): Promise<Council[]> {
  const { data, error } = await supabase.from('councils').select('*').order('name');
  if (error) throw error;
  return data as Council[];
}

export async function createCouncil(c: Partial<Council>): Promise<Council> {
  const { data, error } = await supabase.from('councils').insert(c).select().single();
  if (error) throw error;
  return data as Council;
}

export async function updateCouncil(id: string, updates: Partial<Council>): Promise<Council> {
  const { data, error } = await supabase.from('councils').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as Council;
}

export async function deleteCouncil(id: string): Promise<void> {
  const { error } = await supabase.from('councils').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================================
// COUNCIL CONTACTS
// ============================================================================
export async function fetchCouncilContacts(councilId?: string): Promise<CouncilContact[]> {
  let q = supabase.from('council_contacts').select('*').order('name');
  if (councilId) q = q.eq('council_id', councilId);
  const { data, error } = await q;
  if (error) throw error;
  return data as CouncilContact[];
}

export async function createCouncilContact(cc: Partial<CouncilContact>): Promise<CouncilContact> {
  const { data, error } = await supabase.from('council_contacts').insert(cc).select().single();
  if (error) throw error;
  return data as CouncilContact;
}

export async function deleteCouncilContact(id: string): Promise<void> {
  const { error } = await supabase.from('council_contacts').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================================
// COUNCIL CASES
// ============================================================================
export async function fetchCouncilCases(filters?: { status?: string; councilId?: string }): Promise<CouncilCaseWithRelations[]> {
  let q = supabase.from('council_cases').select(`
    *,
    guest:guests(*),
    council:councils(*),
    council_contact:council_contacts(*),
    property:properties(*),
    funding_periods:funding_periods(*)
  `).order('created_at', { ascending: false });

  if (filters?.status) q = q.eq('status', filters.status);
  if (filters?.councilId) q = q.eq('council_id', filters.councilId);

  const { data, error } = await q;
  if (error) throw error;
  return data as CouncilCaseWithRelations[];
}

export async function fetchCouncilCase(id: string): Promise<CouncilCaseWithRelations | null> {
  const { data, error } = await supabase.from('council_cases').select(`
    *,
    guest:guests(*),
    council:councils(*),
    council_contact:council_contacts(*),
    property:properties(*),
    funding_periods:funding_periods(*),
    reservations:reservations(*)
  `).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as CouncilCaseWithRelations | null;
}

export async function createCouncilCase(cc: Partial<CouncilCase>): Promise<CouncilCase> {
  const { data, error } = await supabase.from('council_cases').insert(cc).select().single();
  if (error) throw error;
  return data as CouncilCase;
}

export async function updateCouncilCase(id: string, updates: Partial<CouncilCase>): Promise<CouncilCase> {
  const { data, error } = await supabase.from('council_cases').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as CouncilCase;
}

export async function deleteCouncilCase(id: string): Promise<void> {
  const { error } = await supabase.from('council_cases').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================================
// FUNDING PERIODS
// ============================================================================
export async function fetchFundingPeriods(councilCaseId?: string): Promise<FundingPeriod[]> {
  let q = supabase.from('funding_periods').select('*').order('funding_start', { ascending: false });
  if (councilCaseId) q = q.eq('council_case_id', councilCaseId);
  const { data, error } = await q;
  if (error) throw error;
  return data as FundingPeriod[];
}

export async function createFundingPeriod(fp: Partial<FundingPeriod>): Promise<FundingPeriod> {
  const { data, error } = await supabase.from('funding_periods').insert(fp).select().single();
  if (error) throw error;
  return data as FundingPeriod;
}

export async function updateFundingPeriod(id: string, updates: Partial<FundingPeriod>): Promise<FundingPeriod> {
  const { data, error } = await supabase.from('funding_periods').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as FundingPeriod;
}

export async function deleteFundingPeriod(id: string): Promise<void> {
  const { error } = await supabase.from('funding_periods').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================================
// INVOICES
// ============================================================================
export async function fetchInvoices(filters?: { propertyId?: string; guestId?: string; status?: string }): Promise<InvoiceWithRelations[]> {
  let q = supabase.from('invoices').select(`
    *,
    guest:guests(*),
    property:properties(*),
    council_case:council_cases(*),
    reservation:reservations(*),
    items:invoice_items(*),
    payments:payments(*)
  `).order('invoice_date', { ascending: false });

  if (filters?.propertyId) q = q.eq('property_id', filters.propertyId);
  if (filters?.guestId) q = q.eq('guest_id', filters.guestId);
  if (filters?.status) q = q.eq('status', filters.status);

  const { data, error } = await q;
  if (error) throw error;
  return data as InvoiceWithRelations[];
}

export async function fetchInvoice(id: string): Promise<InvoiceWithRelations | null> {
  const { data, error } = await supabase.from('invoices').select(`
    *,
    guest:guests(*),
    property:properties(*),
    council_case:council_cases(*),
    reservation:reservations(*),
    items:invoice_items(*),
    payments:payments(*)
  `).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as InvoiceWithRelations | null;
}

export async function createInvoice(inv: Partial<Invoice>): Promise<Invoice> {
  const { data, error } = await supabase.from('invoices').insert(inv).select().single();
  if (error) throw error;
  return data as Invoice;
}

export async function updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
  const { data, error } = await supabase.from('invoices').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as Invoice;
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================================
// INVOICE ITEMS
// ============================================================================
export async function createInvoiceItem(item: Partial<InvoiceItem>): Promise<InvoiceItem> {
  const { data, error } = await supabase.from('invoice_items').insert(item).select().single();
  if (error) throw error;
  return data as InvoiceItem;
}

export async function updateInvoiceItem(id: string, updates: Partial<InvoiceItem>): Promise<InvoiceItem> {
  const { data, error } = await supabase.from('invoice_items').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as InvoiceItem;
}

export async function deleteInvoiceItem(id: string): Promise<void> {
  const { error } = await supabase.from('invoice_items').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================================
// PAYMENTS
// ============================================================================
export async function fetchPayments(filters?: { invoiceId?: string; guestId?: string }): Promise<Payment[]> {
  let q = supabase.from('payments').select('*').order('payment_date', { ascending: false });
  if (filters?.invoiceId) q = q.eq('invoice_id', filters.invoiceId);
  if (filters?.guestId) q = q.eq('guest_id', filters.guestId);
  const { data, error } = await q;
  if (error) throw error;
  return data as Payment[];
}

export async function createPayment(p: Partial<Payment>): Promise<Payment> {
  const { data, error } = await supabase.from('payments').insert(p).select().single();
  if (error) throw error;
  return data as Payment;
}

export async function updatePayment(id: string, updates: Partial<Payment>): Promise<Payment> {
  const { data, error } = await supabase.from('payments').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as Payment;
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase.from('payments').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================================
// CREDIT NOTES
// ============================================================================
export async function fetchCreditNotes(invoiceId?: string): Promise<CreditNote[]> {
  let q = supabase.from('credit_notes').select('*').order('credit_date', { ascending: false });
  if (invoiceId) q = q.eq('invoice_id', invoiceId);
  const { data, error } = await q;
  if (error) throw error;
  return data as CreditNote[];
}

export async function createCreditNote(cn: Partial<CreditNote>): Promise<CreditNote> {
  const { data, error } = await supabase.from('credit_notes').insert(cn).select().single();
  if (error) throw error;
  return data as CreditNote;
}

// ============================================================================
// TASKS
// ============================================================================
export async function fetchTasks(filters?: { status?: string; assignedTo?: string }): Promise<Task[]> {
  let q = supabase.from('tasks').select('*').order('due_date', { ascending: true, nullsFirst: false });
  if (filters?.status) q = q.eq('status', filters.status);
  if (filters?.assignedTo) q = q.eq('assigned_to', filters.assignedTo);
  const { data, error } = await q;
  if (error) throw error;
  return data as Task[];
}

export async function createTask(t: Partial<Task>): Promise<Task> {
  const { data, error } = await supabase.from('tasks').insert(t).select().single();
  if (error) throw error;
  return data as Task;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as Task;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================
export async function fetchNotifications(unreadOnly = false): Promise<Notification[]> {
  let q = supabase.from('notifications').select('*').order('created_at', { ascending: false });
  if (unreadOnly) q = q.eq('is_read', false);
  const { data, error } = await q;
  if (error) throw error;
  return data as Notification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
  if (error) throw error;
}

export async function createNotification(n: Partial<Notification>): Promise<Notification> {
  const { data, error } = await supabase.from('notifications').insert(n).select().single();
  if (error) throw error;
  return data as Notification;
}

// ============================================================================
// AUDIT LOGS
// ============================================================================
export async function fetchAuditLogs(filters?: { entityType?: string; entityId?: string }): Promise<AuditLog[]> {
  let q = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
  if (filters?.entityType) q = q.eq('entity_type', filters.entityType);
  if (filters?.entityId) q = q.eq('entity_id', filters.entityId);
  const { data, error } = await q;
  if (error) throw error;
  return data as AuditLog[];
}

export async function createAuditLog(log: Partial<AuditLog>): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert(log);
  if (error) throw error;
}

// ============================================================================
// DOCUMENTS
// ============================================================================
export async function fetchDocuments(filters?: { guestId?: string; councilCaseId?: string }): Promise<DocumentRecord[]> {
  let q = supabase.from('documents').select('*').order('created_at', { ascending: false });
  if (filters?.guestId) q = q.eq('guest_id', filters.guestId);
  if (filters?.councilCaseId) q = q.eq('council_case_id', filters.councilCaseId);
  const { data, error } = await q;
  if (error) throw error;
  return data as DocumentRecord[];
}

export async function createDocument(d: Partial<DocumentRecord>): Promise<DocumentRecord> {
  const { data, error } = await supabase.from('documents').insert(d).select().single();
  if (error) throw error;
  return data as DocumentRecord;
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================================
// EMAILS
// ============================================================================
export async function fetchEmails(filters?: { guestId?: string; councilCaseId?: string }): Promise<EmailRecord[]> {
  let q = supabase.from('emails').select('*').order('created_at', { ascending: false });
  if (filters?.guestId) q = q.eq('guest_id', filters.guestId);
  if (filters?.councilCaseId) q = q.eq('council_case_id', filters.councilCaseId);
  const { data, error } = await q;
  if (error) throw error;
  return data as EmailRecord[];
}

export async function createEmail(e: Partial<EmailRecord>): Promise<EmailRecord> {
  const { data, error } = await supabase.from('emails').insert(e).select().single();
  if (error) throw error;
  return data as EmailRecord;
}

export async function deleteEmail(id: string): Promise<void> {
  const { error } = await supabase.from('emails').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================
export async function fetchEmailTemplates(category?: string): Promise<EmailTemplate[]> {
  let q = supabase.from('email_templates').select('*').order('name');
  if (category) q = q.eq('category', category);
  const { data, error } = await q;
  if (error) throw error;
  return data as EmailTemplate[];
}

export async function createEmailTemplate(t: Partial<EmailTemplate>): Promise<EmailTemplate> {
  const { data, error } = await supabase.from('email_templates').insert(t).select().single();
  if (error) throw error;
  return data as EmailTemplate;
}

export async function updateEmailTemplate(id: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate> {
  const { data, error } = await supabase.from('email_templates').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as EmailTemplate;
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('email_templates').delete().eq('id', id);
  if (error) throw error;
}
