import Papa from 'papaparse';
import type { Booking, HotelDetails } from './types';

export const DEFAULT_SHEET_ID = '17X2k4MgxDLx8-L30MPmUJL6EVUY6s6xsOQGtj4XkJ1w';
export const DEFAULT_IN_OUT_GID = '2014952458';
export const DEFAULT_AUTOFILL_SHEET = 'Autofill';

export interface SheetConfig {
  sheetId?: string;
  inOutGid?: string;
  autofillSheetName?: string;
}

function csvUrl(sheetId: string, gid: string) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

function sheetUrl(sheetId: string, sheetName: string) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

export function parseSheetUrl(url: string): { sheetId: string; gid: string | null } | null {
  const trimmed = url.trim();
  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (idMatch) {
    const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
    return { sheetId: idMatch[1], gid: gidMatch ? gidMatch[1] : null };
  }
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return { sheetId: trimmed, gid: null };
  }
  return null;
}

async function fetchCsv(url: string): Promise<string[][]> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Failed to fetch sheet (${res.status}). Make sure the Google Sheet is set to "Anyone with link can view".`);
  const text = await res.text();
  if (!text || text.trim().startsWith('<')) {
    throw new Error('Sheet returned HTML instead of CSV. Check that the sheet is publicly shared.');
  }
  const result = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy' });
  return result.data as string[][];
}

export async function fetchBookings(config?: SheetConfig): Promise<Booking[]> {
  const sheetId = config?.sheetId || DEFAULT_SHEET_ID;
  const gid = config?.inOutGid || DEFAULT_IN_OUT_GID;
  const rows = await fetchCsv(csvUrl(sheetId, gid));
  if (rows.length < 2) return [];

  // Skip header row (index 0)
  return rows.slice(1).map((r) => ({
    date: r[0] ?? '',
    flat: r[1] ?? '',
    flats1: r[2] ?? '',
    check: r[3] ?? '',
    out: r[4] ?? '',
    in: r[5] ?? '',
    notes: r[6] ?? '',
    phone: r[7] ?? '',
    name: r[8] ?? '',         // Column I — guest name
    guestCount: r[9] ?? '',    // Column J — guest capacity/count
    nights: r[10] ?? '',
    source: r[11] ?? '',
    payment: r[12] ?? '',
    roomRate: r[13] ?? '',
    status: r[14] ?? '',
    otherRev: r[15] ?? '',
    totalAmount: r[16] ?? '',
    bookingNumber: r[17] ?? '',
    methodOfPayment: r[18] ?? '',
    email: r[19] ?? '',
    checkIn: r[20] ?? '',
    checkOut: r[21] ?? '',
    hotelName: r[27] ?? '', // Column AB = index 27
  }));
}

export async function fetchHotelDetails(config?: SheetConfig): Promise<HotelDetails[]> {
  const sheetId = config?.sheetId || DEFAULT_SHEET_ID;
  const sheetName = config?.autofillSheetName || DEFAULT_AUTOFILL_SHEET;
  const rows = await fetchCsv(sheetUrl(sheetId, sheetName));
  if (rows.length < 2) return [];

  return rows.slice(1).map((r) => ({
    hotel: r[0] ?? '',
    address: r[1] ?? '',
    email: r[2] ?? '',
    phone: r[3] ?? '',
    vat: r[4] ?? '',
    invoiceFooter: r[5] ?? '',
    vatMessage: r[6] ?? '',
  })).filter((h) => h.hotel.trim() !== '');
}

export function filterBookingsByRefs(bookings: Booking[], refs: string[]): Booking[] {
  const refSet = new Set(refs.map((r) => r.trim().toLowerCase()));
  return bookings.filter((b) => refSet.has(b.bookingNumber.trim().toLowerCase()));
}

export function getUniqueGuests(bookings: Booking[]): string[] {
  const names = new Set(bookings.map((b) => b.name).filter(Boolean));
  return Array.from(names).sort();
}

export function getUniqueHotels(bookings: Booking[]): string[] {
  const hotels = new Set(bookings.map((b) => b.hotelName).filter(Boolean));
  return Array.from(hotels).sort();
}

export function calcTotals(bookings: Booking[]) {
  let roomTotal = 0;
  let otherTotal = 0;
  let grandTotal = 0;

  bookings.forEach((b) => {
    roomTotal += parseFloat(b.roomRate) || 0;
    otherTotal += parseFloat(b.otherRev) || 0;
    grandTotal += parseFloat(b.totalAmount) || 0;
  });

  return { roomTotal, otherTotal, grandTotal };
}

export function calcUnpaidTotals(bookings: Booking[]) {
  const unpaidBookings = bookings.filter((b) => !isPaid(b));
  let unpaidRoomTotal = 0;
  let unpaidOtherTotal = 0;
  let unpaidGrandTotal = 0;

  unpaidBookings.forEach((b) => {
    unpaidRoomTotal += parseFloat(b.roomRate) || 0;
    unpaidOtherTotal += parseFloat(b.otherRev) || 0;
    unpaidGrandTotal += parseFloat(b.totalAmount) || 0;
  });

  return { unpaidBookings, unpaidRoomTotal, unpaidOtherTotal, unpaidGrandTotal };
}

export function formatCurrency(val: number | string): string {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '£0.00';
  return `£${num.toFixed(2)}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const COUNCIL_KEYWORDS = ['council pay', 'council', 'torbay council', 'council pay.'];

export function isCouncilPaid(notes: string): boolean {
  const n = (notes || '').trim().toLowerCase();
  if (!n) return false;
  return COUNCIL_KEYWORDS.some(kw => n.includes(kw));
}

export function getPayerName(booking: Booking): string {
  if (isCouncilPaid(booking.notes)) {
    const match = booking.notes.match(/council[^,.\n]*/i);
    return match ? match[0].trim() : 'Council';
  }
  return booking.name || 'Guest';
}

export function getPaymentMethod(booking: Booking): string {
  const method = (booking.methodOfPayment || '').trim();
  if (!method) return 'Unpaid';
  return method;
}

export function isPaid(booking: Booking): boolean {
  return (booking.methodOfPayment || '').trim() !== '';
}
