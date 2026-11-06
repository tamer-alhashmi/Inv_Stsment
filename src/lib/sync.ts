import { supabase } from './supabase';
import { fetchBookings, fetchHotelDetails, type SheetConfig } from './sheets';
import type { Booking, HotelDetails } from './types';

export interface SyncResult {
  rowsProcessed: number;
  guestsUpserted: number;
  propertiesUpserted: number;
  reservationsUpserted: number;
  unitsUpserted: number;
  errors: string[];
}

export interface SyncProgress {
  phase: string;
  current: number;
  total: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function parseDate(d: string): string | null {
  if (!d) return null;
  const m = d.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const day = m[1].padStart(2, '0');
    const month = m[2].padStart(2, '0');
    const year = m[3];
    return `${year}-${month}-${day}`;
  }
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
}

function toNum(v: string): number | null {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function bookingStatusFromRow(b: Booking): string {
  const check = (b.check || '').toLowerCase();
  const status = (b.status || '').toLowerCase();
  if (status.includes('block') || status.includes('cancel')) return 'cancelled';
  if (check === 'out') return 'checked_out';
  if (check === 'ready' || check === 'in') return 'checked_in';
  return 'confirmed';
}

function paymentStatusFromRow(b: Booking): string {
  const method = (b.methodOfPayment || '').trim().toLowerCase();
  const payment = (b.payment || '').trim().toLowerCase();
  if (method && method !== 'unpaid') return 'paid';
  if (payment.includes('prepaid')) return 'paid';
  return 'unpaid';
}

function sourceCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('booking.com') || n.includes('expedia') || n.includes('airbnb') || n.includes('ota')) return 'ota';
  if (n.includes('council')) return 'council';
  if (n.includes('corporate')) return 'corporate';
  if (n.includes('agent')) return 'agent';
  if (n.includes('walk')) return 'walk_in';
  if (n.includes('direct') || n.includes('website') || n.includes('telephone') || n.includes('email')) return 'direct';
  return 'other';
}

function guestKey(b: Booking): string {
  return (b.name || '').trim().toLowerCase() || b.email.trim().toLowerCase() || b.phone.trim();
}

// ── Upsert helpers ──────────────────────────────────────────────────────

async function upsertProperties(hotels: HotelDetails[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let count = 0;
  for (const h of hotels) {
    if (!h.hotel.trim()) continue;
    const { data, error } = await supabase
      .from('properties')
      .upsert({ name: h.hotel, address: h.address, email: h.email, phone: h.phone, vat_number: h.vat, invoice_footer: h.invoiceFooter, vat_message: h.vatMessage }, { onConflict: 'name' })
      .select('id')
      .maybeSingle();
    if (error) { console.error('Property upsert error:', h.hotel, error); continue; }
    if (data) { map.set(h.hotel, data.id); count++; }
  }
  return map;
}

async function upsertGuests(bookings: Booking[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let count = 0;
  const seen = new Set<string>();

  for (const b of bookings) {
    const key = guestKey(b);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const { data, error } = await supabase
      .from('guests')
      .upsert({ full_name: b.name, email: b.email || null, phone: b.phone || null }, { onConflict: 'full_name' })
      .select('id')
      .maybeSingle();
    if (error) { console.error('Guest upsert error:', b.name, error); continue; }
    if (data) { map.set(key, data.id); count++; }
  }
  return map;
}

async function upsertBookingSources(bookings: Booking[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const sources = new Set<string>();
  bookings.forEach(b => { const s = (b.source || '').trim(); if (s) sources.add(s); });

  for (const name of sources) {
    const { data, error } = await supabase
      .from('booking_sources')
      .upsert({ name, category: sourceCategory(name), is_active: true }, { onConflict: 'name' })
      .select('id')
      .maybeSingle();
    if (error) { console.error('Source upsert error:', name, error); continue; }
    if (data) map.set(name, data.id);
  }
  return map;
}

async function upsertUnits(bookings: Booking[], propertyMap: Map<string, string>): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const units = new Map<string, { name: string; property: string }>();

  bookings.forEach(b => {
    const flat = (b.flat || '').trim();
    const hotel = (b.hotelName || '').trim();
    if (!flat || !hotel || !propertyMap.has(hotel)) return;
    const key = `${hotel}::${flat}`;
    if (!units.has(key)) units.set(key, { name: flat, property: hotel });
  });

  let count = 0;
  for (const [key, u] of units) {
    const propId = propertyMap.get(u.property);
    if (!propId) continue;
    const { data, error } = await supabase
      .from('units')
      .upsert({ name: u.name, property_id: propId, status: 'available', housekeeping_status: 'clean' }, { onConflict: 'name' })
      .select('id')
      .maybeSingle();
    if (error) { console.error('Unit upsert error:', u.name, error); continue; }
    if (data) { map.set(key, data.id); count++; }
  }
  return map;
}

async function upsertReservations(
  bookings: Booking[],
  guestMap: Map<string, string>,
  propertyMap: Map<string, string>,
  sourceMap: Map<string, string>,
  unitMap: Map<string, string>,
): Promise<number> {
  let count = 0;
  const errors: string[] = [];

  for (const b of bookings) {
    const guestKey = guestKey(b);
    const guestId = guestMap.get(guestKey);
    const hotelName = (b.hotelName || '').trim();
    const propertyId = propertyMap.get(hotelName);

    if (!guestId || !propertyId) continue;

    const checkIn = parseDate(b.checkIn || b.date);
    const nightsNum = parseInt(b.nights) || 1;
    const checkOut = checkIn
      ? new Date(new Date(checkIn).getTime() + nightsNum * 86400000).toISOString().slice(0, 10)
      : null;

    if (!checkIn || !checkOut) continue;

    const unitKey = `${hotelName}::${(b.flat || '').trim()}`;
    const unitId = unitMap.get(unitKey) || null;
    const sourceId = sourceMap.get((b.source || '').trim()) || null;
    const ref = (b.bookingNumber || '').trim();

    const row: Record<string, unknown> = {
      guest_id: guestId,
      property_id: propertyId,
      unit_id: unitId,
      booking_source_id: sourceId,
      check_in: checkIn,
      check_out: checkOut,
      guest_count: parseInt(b.guestCount) || 1,
      rate: toNum(b.roomRate),
      total_value: toNum(b.totalAmount),
      payment_status: paymentStatusFromRow(b),
      booking_status: bookingStatusFromRow(b),
      external_reference: ref || null,
      notes: b.notes || null,
    };

    if (ref) {
      const { error } = await supabase
        .from('reservations')
        .upsert(row, { onConflict: 'external_reference' });
      if (error) errors.push(`Reservation ${ref}: ${error.message}`);
      else count++;
    } else {
      const { error } = await supabase
        .from('reservations')
        .insert(row);
      if (error) errors.push(`Reservation (no ref, ${b.name}): ${error.message}`);
      else count++;
    }
  }

  return count;
}

// ── Main sync function ───────────────────────────────────────────────────

export async function syncSheetToDatabase(
  config: SheetConfig,
  onProgress?: (p: SyncProgress) => void,
): Promise<SyncResult> {
  const errors: string[] = [];
  const { data: importLog } = await supabase
    .from('sheet_imports')
    .insert({ status: 'running', started_at: new Date().toISOString() })
    .select('id')
    .single();

  const importId = importLog?.id;

  try {
    onProgress?.({ phase: 'Fetching sheet data', current: 0, total: 0 });
    const [bookings, hotels] = await Promise.all([fetchBookings(config), fetchHotelDetails(config)]);

    onProgress?.({ phase: 'Syncing properties', current: 0, total: hotels.length });
    const propertyMap = await upsertProperties(hotels);

    onProgress?.({ phase: 'Syncing guests', current: 0, total: bookings.length });
    const guestMap = await upsertGuests(bookings);

    onProgress?.({ phase: 'Syncing booking sources', current: 0, total: bookings.length });
    const sourceMap = await upsertBookingSources(bookings);

    onProgress?.({ phase: 'Syncing rooms', current: 0, total: bookings.length });
    const unitMap = await upsertUnits(bookings, propertyMap);

    onProgress?.({ phase: 'Syncing reservations', current: 0, total: bookings.length });
    const reservationCount = await upsertReservations(bookings, guestMap, propertyMap, sourceMap, unitMap);

    const result: SyncResult = {
      rowsProcessed: bookings.length,
      guestsUpserted: guestMap.size,
      propertiesUpserted: propertyMap.size,
      reservationsUpserted: reservationCount,
      unitsUpserted: unitMap.size,
      errors,
    };

    if (importId) {
      await supabase.from('sheet_imports').update({
        status: 'success',
        rows_processed: result.rowsProcessed,
        guests_upserted: result.guestsUpserted,
        properties_upserted: result.propertiesUpserted,
        reservations_upserted: result.reservationsUpserted,
        units_upserted: result.unitsUpserted,
        completed_at: new Date().toISOString(),
      }).eq('id', importId);
    }

    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown sync error';
    errors.push(msg);

    if (importId) {
      await supabase.from('sheet_imports').update({
        status: 'failed',
        error_message: msg,
        completed_at: new Date().toISOString(),
      }).eq('id', importId);
    }

    return {
      rowsProcessed: 0,
      guestsUpserted: 0,
      propertiesUpserted: 0,
      reservationsUpserted: 0,
      unitsUpserted: 0,
      errors,
    };
  }
}

export async function fetchImportHistory(limit = 10) {
  const { data, error } = await supabase
    .from('sheet_imports')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data;
}
