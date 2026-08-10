import { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Search, X, Loader2, AlertCircle, Mail, Phone, MapPin,
  Calendar, Building2, ArrowRightLeft, FileText, PoundSterling,
} from 'lucide-react';
import {
  fetchGuests, createGuest, updateGuest, deleteGuest,
  fetchReservations, fetchRoomMoves,
} from '@/lib/pms';
import type { Guest, ReservationWithRelations, RoomMove } from '@/lib/types';
import type { TabId } from '@/components/Sidebar';

export function GuestsPage({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Guest | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGuests(search || undefined);
      setGuests(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load guests');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> New Guest
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-blue-600" />
          </div>
        ) : guests.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Users size={36} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium">No guests found</p>
            <p className="text-xs mt-1">Add a new guest to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Name</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Email</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Phone</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Council</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Corporate</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {guests.map(g => (
                  <tr
                    key={g.id}
                    onClick={() => setSelectedGuest(g)}
                    className="border-b border-gray-50 hover:bg-blue-50/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{g.full_name}</td>
                    <td className="px-4 py-3 text-gray-600">{g.email ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{g.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{g.council_affiliation ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{g.corporate_affiliation ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(g.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedGuest && (
        <GuestProfileDrawer
          guest={selectedGuest}
          onClose={() => setSelectedGuest(null)}
          onEdit={() => { setEditing(selectedGuest); setShowModal(true); setSelectedGuest(null); }}
          onNavigate={onNavigate}
        />
      )}

      {showModal && (
        <GuestModal
          editing={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}

function GuestProfileDrawer({
  guest, onClose, onEdit, onNavigate,
}: {
  guest: Guest;
  onClose: () => void;
  onEdit: () => void;
  onNavigate: (tab: TabId) => void;
}) {
  const [reservations, setReservations] = useState<ReservationWithRelations[]>([]);
  const [roomMoves, setRoomMoves] = useState<RoomMove[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'bookings' | 'history' | 'moves'>('overview');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [res, moves] = await Promise.all([
          fetchReservations({ guestId: guest.id }),
          fetchRoomMoves(guest.id),
        ]);
        setReservations(res);
        setRoomMoves(moves);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, [guest.id]);

  const totalNights = reservations.reduce((sum, r) => sum + (r.nights || 0), 0);
  const totalSpend = reservations.reduce((sum, r) => sum + (r.total_value || 0), 0);
  const firstStay = reservations.length > 0
    ? reservations.reduce((min, r) => r.check_in < min ? r.check_in : min, reservations[0].check_in)
    : null;
  const properties = [...new Set(reservations.map(r => r.property?.name).filter(Boolean))];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-semibold">
              {guest.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">{guest.full_name}</h2>
              <p className="text-xs text-gray-500">{guest.preferred_name ?? ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              Edit
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-[65px] bg-white border-b border-gray-100 px-6 flex gap-1 z-10">
          {([
            ['overview', 'Overview'], ['bookings', 'Bookings'], ['history', 'History'], ['moves', 'Room Moves'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-blue-600" />
            </div>
          ) : tab === 'overview' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <InfoRow icon={Mail} label="Email" value={guest.email} />
                <InfoRow icon={Phone} label="Phone" value={guest.phone} />
                <InfoRow icon={MapPin} label="Address" value={guest.address} />
                <InfoRow icon={MapPin} label="Country" value={guest.country} />
                <InfoRow icon={Building2} label="Corporate" value={guest.corporate_affiliation} />
                <InfoRow icon={Building2} label="Council" value={guest.council_affiliation} />
              </div>
              {guest.notes && (
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{guest.notes}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <StatBox label="Total Stays" value={String(reservations.length)} />
                <StatBox label="Total Nights" value={String(totalNights)} />
                <StatBox label="Total Spend" value={`£${totalSpend.toFixed(2)}`} />
              </div>
              {firstStay && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-xs font-medium text-blue-700">First Stay</p>
                  <p className="text-sm text-blue-900 mt-0.5">{new Date(firstStay).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          ) : tab === 'bookings' ? (
            <div className="space-y-2">
              {reservations.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No bookings yet</p>
              ) : reservations.map(r => (
                <div key={r.id} className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 cursor-pointer"
                  onClick={() => onNavigate('reservations')}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{r.property?.name ?? '—'}</p>
                    <span className="text-xs text-gray-500">{r.booking_status.replace('_', ' ')}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {r.check_in} → {r.check_out} · {r.nights} nights · {r.unit?.name ?? 'No unit'}
                  </p>
                </div>
              ))}
            </div>
          ) : tab === 'history' ? (
            <div className="space-y-2">
              {properties.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No accommodation history yet</p>
              ) : (
                <div className="space-y-3">
                  {properties.map(propName => {
                    const propRes = reservations.filter(r => r.property?.name === propName);
                    const propUnits = [...new Set(propRes.map(r => r.unit?.name).filter(Boolean))];
                    return (
                      <div key={propName} className="p-3 rounded-lg border border-gray-100">
                        <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          <Building2 size={14} /> {propName}
                        </p>
                        <div className="ml-6 mt-1 space-y-0.5">
                          {propUnits.map(u => (
                            <p key={u} className="text-xs text-gray-500">↳ {u}</p>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : tab === 'moves' ? (
            <div className="space-y-2">
              {roomMoves.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No room movements recorded</p>
              ) : roomMoves.map(m => (
                <div key={m.id} className="p-3 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft size={14} className="text-gray-400" />
                    <p className="text-sm text-gray-900">
                      Moved on {new Date(m.effective_date).toLocaleDateString()}
                    </p>
                  </div>
                  {m.reason && <p className="text-xs text-gray-500 mt-1 ml-6">Reason: {m.reason}</p>}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function GuestModal({ editing, onClose, onSaved }: { editing: Guest | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    full_name: editing?.full_name ?? '',
    preferred_name: editing?.preferred_name ?? '',
    email: editing?.email ?? '',
    phone: editing?.phone ?? '',
    address: editing?.address ?? '',
    country: editing?.country ?? '',
    corporate_affiliation: editing?.corporate_affiliation ?? '',
    council_affiliation: editing?.council_affiliation ?? '',
    notes: editing?.notes ?? '',
    emergency_contact_name: editing?.emergency_contact_name ?? '',
    emergency_contact_phone: editing?.emergency_contact_phone ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.full_name.trim()) { setErr('Full name is required'); return; }
    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        await updateGuest(editing.id, form);
      } else {
        await createGuest(form);
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
    if (!confirm('Delete this guest? This cannot be undone.')) return;
    setSaving(true);
    try {
      await deleteGuest(editing.id);
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{editing ? 'Edit Guest' : 'New Guest'}</h2>
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
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Full Name *</label>
              <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Preferred Name</label>
              <input value={form.preferred_name} onChange={e => setForm(f => ({ ...f, preferred_name: e.target.value }))} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Phone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Address</label>
            <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Country</label>
              <input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Corporate Affiliation</label>
              <input value={form.corporate_affiliation} onChange={e => setForm(f => ({ ...f, corporate_affiliation: e.target.value }))} className="input" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Council Affiliation</label>
            <input value={form.council_affiliation} onChange={e => setForm(f => ({ ...f, council_affiliation: e.target.value }))} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Emergency Contact Name</label>
              <input value={form.emergency_contact_name} onChange={e => setForm(f => ({ ...f, emergency_contact_name: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Emergency Contact Phone</label>
              <input value={form.emergency_contact_phone} onChange={e => setForm(f => ({ ...f, emergency_contact_phone: e.target.value }))} className="input" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input" rows={3} />
          </div>
        </div>
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-4 flex items-center justify-between">
          {editing ? (
            <button onClick={handleDelete} disabled={saving} className="text-sm text-red-600 hover:underline disabled:opacity-50">Delete</button>
          ) : <span />}
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={15} className="animate-spin" /> : null}
              {editing ? 'Save Changes' : 'Create Guest'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string | null }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-700 truncate">{value ?? '—'}</p>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-center">
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
