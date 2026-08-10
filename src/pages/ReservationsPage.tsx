import { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays, Plus, Search, Filter, Download, ArrowRightLeft,
  LogIn, LogOut, Loader2, X, AlertCircle,
} from 'lucide-react';
import {
  fetchReservations, createReservation, updateReservation, deleteReservation,
  fetchProperties, fetchUnits, fetchGuests, fetchBookingSources,
} from '@/lib/pms';
import type { ReservationWithRelations, Property, Unit, Guest, BookingSource } from '@/lib/types';
import type { TabId } from '@/components/Sidebar';

const STATUS_COLORS: Record<string, string> = {
  enquiry: 'bg-gray-100 text-gray-700',
  tentative: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  checked_in: 'bg-green-100 text-green-700',
  checked_out: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-red-100 text-red-700',
  extended: 'bg-purple-100 text-purple-700',
  closed: 'bg-gray-100 text-gray-500',
};

const PAYMENT_COLORS: Record<string, string> = {
  unpaid: 'bg-red-100 text-red-700',
  part_paid: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  disputed: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-gray-100 text-gray-500',
  refunded: 'bg-gray-100 text-gray-500',
};

export function ReservationsPage({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const [reservations, setReservations] = useState<ReservationWithRelations[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [sources, setSources] = useState<BookingSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ReservationWithRelations | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, props, unts, gsts, srcs] = await Promise.all([
        fetchReservations(),
        fetchProperties(),
        fetchUnits(),
        fetchGuests(),
        fetchBookingSources(),
      ]);
      setReservations(res);
      setProperties(props);
      setUnits(unts);
      setGuests(gsts);
      setSources(srcs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = reservations.filter(r => {
    if (statusFilter && r.booking_status !== statusFilter) return false;
    if (propertyFilter && r.property_id !== propertyFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const guestName = r.guest?.full_name?.toLowerCase() ?? '';
      const ref = r.reservation_number?.toLowerCase() ?? '';
      const unitName = r.unit?.name?.toLowerCase() ?? '';
      return guestName.includes(q) || ref.includes(q) || unitName.includes(q);
    }
    return true;
  });

  const today = new Date().toISOString().slice(0, 10);
  const arrivals = filtered.filter(r => r.check_in === today && r.booking_status === 'confirmed');
  const departures = filtered.filter(r => r.check_out === today && r.booking_status === 'checked_in');
  const inHouse = filtered.filter(r => r.booking_status === 'checked_in');

  return (
    <div className="space-y-6">
      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Arrivals Today" value={arrivals.length} icon={LogIn} color="text-blue-600 bg-blue-50" />
        <StatCard label="Departures Today" value={departures.length} icon={LogOut} color="text-amber-600 bg-amber-50" />
        <StatCard label="In-House Guests" value={inHouse.length} icon={CalendarDays} color="text-green-600 bg-green-50" />
        <StatCard label="Total Reservations" value={filtered.length} icon={Filter} color="text-gray-600 bg-gray-50" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search guest, ref, or room…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="">All Statuses</option>
          <option value="enquiry">Enquiry</option>
          <option value="tentative">Tentative</option>
          <option value="confirmed">Confirmed</option>
          <option value="checked_in">Checked In</option>
          <option value="checked_out">Checked Out</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
          <option value="extended">Extended</option>
        </select>
        <select value={propertyFilter} onChange={e => setPropertyFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="">All Properties</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> New Reservation
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <CalendarDays size={36} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium">No reservations found</p>
            <p className="text-xs mt-1">Create a new reservation or adjust your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Guest</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Property</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Unit</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Check-in</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Check-out</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Nights</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Source</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Status</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Payment</th>
                  <th className="text-right font-medium text-gray-500 px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr
                    key={r.id}
                    onClick={() => { setEditing(r); setShowModal(true); }}
                    className="border-b border-gray-50 hover:bg-blue-50/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{r.guest?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{r.property?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{r.unit?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{r.check_in}</td>
                    <td className="px-4 py-3 text-gray-600">{r.check_out}</td>
                    <td className="px-4 py-3 text-gray-600">{r.nights}</td>
                    <td className="px-4 py-3 text-gray-600">{r.booking_source?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[r.booking_status] ?? ''}`}>
                        {r.booking_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${PAYMENT_COLORS[r.payment_status] ?? ''}`}>
                        {r.payment_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {r.total_value != null ? `£${r.total_value.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <ReservationModal
          editing={editing}
          properties={properties}
          units={units}
          guests={guests}
          sources={sources}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
          onNavigateGuests={() => onNavigate('guests')}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof LogIn; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{label}</p>
        </div>
      </div>
    </div>
  );
}

function ReservationModal({
  editing, properties, units, guests, sources, onClose, onSaved, onNavigateGuests,
}: {
  editing: ReservationWithRelations | null;
  properties: Property[];
  units: Unit[];
  guests: Guest[];
  sources: BookingSource[];
  onClose: () => void;
  onSaved: () => void;
  onNavigateGuests: () => void;
}) {
  const [form, setForm] = useState({
    guest_id: editing?.guest_id ?? '',
    property_id: editing?.property_id ?? '',
    unit_id: editing?.unit_id ?? '',
    booking_source_id: editing?.booking_source_id ?? '',
    check_in: editing?.check_in ?? '',
    check_out: editing?.check_out ?? '',
    guest_count: editing?.guest_count ?? 1,
    rate: editing?.rate ?? '',
    total_value: editing?.total_value ?? '',
    booking_status: editing?.booking_status ?? 'confirmed',
    payment_status: editing?.payment_status ?? 'unpaid',
    reservation_number: editing?.reservation_number ?? '',
    external_reference: editing?.external_reference ?? '',
    council_reference: editing?.council_reference ?? '',
    po_number: editing?.po_number ?? '',
    notes: editing?.notes ?? '',
    internal_notes: editing?.internal_notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filteredUnits = units.filter(u => !form.property_id || u.property_id === form.property_id);

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        ...form,
        rate: form.rate ? parseFloat(form.rate) : null,
        total_value: form.total_value ? parseFloat(form.total_value) : null,
        unit_id: form.unit_id || null,
        booking_source_id: form.booking_source_id || null,
      };
      if (editing) {
        await updateReservation(editing.id, payload);
      } else {
        await createReservation(payload);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!confirm('Delete this reservation? This cannot be undone.')) return;
    setSaving(true);
    try {
      await deleteReservation(editing.id);
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            {editing ? 'Edit Reservation' : 'New Reservation'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {err && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle size={16} /> {err}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Guest">
              <select value={form.guest_id} onChange={e => setForm(f => ({ ...f, guest_id: e.target.value }))}
                className="input">
                <option value="">Select guest…</option>
                {guests.map(g => <option key={g.id} value={g.id}>{g.full_name}</option>)}
              </select>
            </Field>
            <div className="flex items-end">
              <button onClick={onNavigateGuests} className="text-xs text-blue-600 hover:underline">
                Need to create a guest first?
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Property">
              <select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value, unit_id: '' }))}
                className="input">
                <option value="">Select property…</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Unit / Room">
              <select value={form.unit_id} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))}
                className="input">
                <option value="">Auto-assign</option>
                {filteredUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Check-in">
              <input type="date" value={form.check_in} onChange={e => setForm(f => ({ ...f, check_in: e.target.value }))} className="input" />
            </Field>
            <Field label="Check-out">
              <input type="date" value={form.check_out} onChange={e => setForm(f => ({ ...f, check_out: e.target.value }))} className="input" />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Guests">
              <input type="number" min="1" value={form.guest_count} onChange={e => setForm(f => ({ ...f, guest_count: parseInt(e.target.value) || 1 }))} className="input" />
            </Field>
            <Field label="Rate (£/night)">
              <input type="number" step="0.01" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} className="input" />
            </Field>
            <Field label="Total (£)">
              <input type="number" step="0.01" value={form.total_value} onChange={e => setForm(f => ({ ...f, total_value: e.target.value }))} className="input" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Booking Source">
              <select value={form.booking_source_id} onChange={e => setForm(f => ({ ...f, booking_source_id: e.target.value }))} className="input">
                <option value="">Select source…</option>
                {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Reservation #">
              <input value={form.reservation_number} onChange={e => setForm(f => ({ ...f, reservation_number: e.target.value }))} className="input" placeholder="Auto-generated" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Booking Status">
              <select value={form.booking_status} onChange={e => setForm(f => ({ ...f, booking_status: e.target.value }))} className="input">
                <option value="enquiry">Enquiry</option>
                <option value="tentative">Tentative</option>
                <option value="confirmed">Confirmed</option>
                <option value="checked_in">Checked In</option>
                <option value="checked_out">Checked Out</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
                <option value="extended">Extended</option>
                <option value="closed">Closed</option>
              </select>
            </Field>
            <Field label="Payment Status">
              <select value={form.payment_status} onChange={e => setForm(f => ({ ...f, payment_status: e.target.value }))} className="input">
                <option value="unpaid">Unpaid</option>
                <option value="part_paid">Part Paid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="disputed">Disputed</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="External Ref">
              <input value={form.external_reference} onChange={e => setForm(f => ({ ...f, external_reference: e.target.value }))} className="input" />
            </Field>
            <Field label="Council Ref">
              <input value={form.council_reference} onChange={e => setForm(f => ({ ...f, council_reference: e.target.value }))} className="input" />
            </Field>
            <Field label="PO Number">
              <input value={form.po_number} onChange={e => setForm(f => ({ ...f, po_number: e.target.value }))} className="input" />
            </Field>
          </div>

          <Field label="Notes (visible internally)">
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input" rows={2} />
          </Field>
          <Field label="Internal Notes (private)">
            <textarea value={form.internal_notes} onChange={e => setForm(f => ({ ...f, internal_notes: e.target.value }))} className="input" rows={2} />
          </Field>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-4 flex items-center justify-between">
          {editing ? (
            <button onClick={handleDelete} disabled={saving} className="text-sm text-red-600 hover:underline disabled:opacity-50">
              Delete
            </button>
          ) : <span />}
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={15} className="animate-spin" /> : null}
              {editing ? 'Save Changes' : 'Create Reservation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
