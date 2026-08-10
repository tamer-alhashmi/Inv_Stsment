export interface Booking {
  date: string;
  flat: string;
  flats1: string;
  check: string;
  out: string;
  in: string;
  notes: string;
  phone: string;
  name: string;          // Column I — guest name
  guestCount: string;    // Column J — number of guests / capacity
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
