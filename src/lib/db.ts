import { supabase } from './supabase';
import type { CouncilLetter, DocumentHistoryEntry, DocType, AppSettings, ManagedUser, UserHistoryEntry, UserRole } from './types';

export async function saveCouncilLetter(letter: CouncilLetter): Promise<string | null> {
  const { data, error } = await supabase
    .from('council_letters')
    .insert({
      council_name: letter.councilName,
      council_address: letter.councilAddress,
      council_reference: letter.councilReference,
      officer_name: letter.officerName,
      officer_title: letter.officerTitle,
      letter_date: letter.letterDate,
      guest_name: letter.guestName,
      hotel_name: letter.hotelName,
      custom_notes: letter.customNotes,
      booking_references: letter.bookingReferences,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Save council letter error:', error);
    return null;
  }
  return data.id;
}

export async function listCouncilLetters(): Promise<CouncilLetter[]> {
  const { data, error } = await supabase
    .from('council_letters')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((r) => ({
    id: r.id,
    councilName: r.council_name,
    councilAddress: r.council_address,
    councilReference: r.council_reference,
    officerName: r.officer_name,
    officerTitle: r.officer_title,
    letterDate: r.letter_date,
    guestName: r.guest_name,
    hotelName: r.hotel_name,
    customNotes: r.custom_notes,
    bookingReferences: r.booking_references ?? [],
    createdAt: r.created_at,
  }));
}

export async function getCouncilLetter(id: string): Promise<CouncilLetter | null> {
  const { data, error } = await supabase
    .from('council_letters')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    councilName: data.council_name,
    councilAddress: data.council_address,
    councilReference: data.council_reference,
    officerName: data.officer_name,
    officerTitle: data.officer_title,
    letterDate: data.letter_date,
    guestName: data.guest_name,
    hotelName: data.hotel_name,
    customNotes: data.custom_notes,
    bookingReferences: data.booking_references ?? [],
    createdAt: data.created_at,
  };
}

export async function deleteCouncilLetter(id: string): Promise<boolean> {
  const { error } = await supabase.from('council_letters').delete().eq('id', id);
  return !error;
}

export async function logDocument(
  docType: DocType,
  guestName: string,
  hotelName: string,
  bookingRefs: string[],
  councilLetterId?: string,
  createdByEmail?: string,
): Promise<void> {
  const { error } = await supabase.from('document_history').insert({
    doc_type: docType,
    guest_name: guestName,
    hotel_name: hotelName,
    booking_references: bookingRefs,
    booking_count: bookingRefs.length,
    council_letter_id: councilLetterId ?? null,
    created_by_email: createdByEmail || 'system',
  });
  if (error) console.error('Log document error:', error);
}

export async function listDocumentHistory(): Promise<DocumentHistoryEntry[]> {
  const { data, error } = await supabase
    .from('document_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data as DocumentHistoryEntry[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  sheetId: '17X2k4MgxDLx8-L30MPmUJL6EVUY6s6xsOQGtj4XkJ1w',
  inOutGid: '2014952458',
  autofillSheetName: 'Autofill',
};

export async function getSettings(): Promise<AppSettings> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) return DEFAULT_SETTINGS;

  return {
    sheetId: data.sheet_id || DEFAULT_SETTINGS.sheetId,
    inOutGid: data.in_out_gid || DEFAULT_SETTINGS.inOutGid,
    autofillSheetName: data.autofill_sheet_name || DEFAULT_SETTINGS.autofillSheetName,
  };
}

export async function updateSettings(settings: AppSettings): Promise<boolean> {
  const { error } = await supabase
    .from('app_settings')
    .upsert({
      id: 1,
      sheet_id: settings.sheetId,
      in_out_gid: settings.inOutGid,
      autofill_sheet_name: settings.autofillSheetName,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Update settings error:', error);
    return false;
  }
  return true;
}

// ============================================================
// User management — calls edge function with service role
// ============================================================

function getFunctionUrl(action: string) {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-management${action ? `?action=${action}` : ''}`;
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

export async function listUsers(): Promise<ManagedUser[]> {
  const res = await fetch(getFunctionUrl(''), { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to load users');
  const data = await res.json();
  return data.users || [];
}

export async function createUser(email: string, password: string, role: UserRole): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(getFunctionUrl('create'), {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ email, password, role }),
  });
  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error || 'Failed to create user' };
  return { success: true };
}

export async function updateUser(userId: string, email: string, role?: UserRole, password?: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(getFunctionUrl('update'), {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ user_id: userId, email, role, password }),
  });
  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error || 'Failed to update user' };
  return { success: true };
}

export async function deleteUser(userId: string, email: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(getFunctionUrl(''), {
    method: 'DELETE',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ user_id: userId, email }),
  });
  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error || 'Failed to delete user' };
  return { success: true };
}

export async function listUserHistory(): Promise<UserHistoryEntry[]> {
  const { data, error } = await supabase
    .from('user_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !data) return [];
  return data as UserHistoryEntry[];
}
