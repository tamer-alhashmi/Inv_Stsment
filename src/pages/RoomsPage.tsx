import { useState, useEffect, useCallback } from 'react';
import { BedDouble, Plus, X, Loader2, AlertCircle, Wrench, Sparkles } from 'lucide-react';
import {
  fetchUnits, createUnit, updateUnit, deleteUnit,
  fetchProperties, fetchRoomTypes,
} from '@/lib/pms';
import type { Unit, Property, RoomType } from '@/lib/types';

const STATUS_STYLES: Record<string, { bg: string; dot: string; label: string }> = {
  available:    { bg: 'bg-green-50 border-green-200',  dot: 'bg-green-500',  label: 'Available' },
  occupied:     { bg: 'bg-blue-50 border-blue-200',    dot: 'bg-blue-500',   label: 'Occupied' },
  dirty:        { bg: 'amber-50 border-amber-200',     dot: 'bg-amber-500',  label: 'Dirty' },
  clean:        { bg: 'bg-teal-50 border-teal-200',    dot: 'bg-teal-500',   label: 'Clean' },
  inspected:    { bg: 'bg-cyan-50 border-cyan-200',    dot: 'bg-cyan-500',   label: 'Inspected' },
  out_of_order: { bg: 'bg-red-50 border-red-200',      dot: 'bg-red-500',    label: 'Out of Order' },
  out_of_service:{ bg: 'bg-gray-50 border-gray-200',   dot: 'bg-gray-500',   label: 'Out of Service' },
  reserved:     { bg: 'bg-purple-50 border-purple-200',dot: 'bg-purple-500', label: 'Reserved' },
};

const HK_STYLES: Record<string, string> = {
  clean: 'bg-teal-100 text-teal-700',
  dirty: 'bg-amber-100 text-amber-700',
  inspected: 'bg-cyan-100 text-cyan-700',
  out_of_service: 'bg-gray-100 text-gray-600',
};

export function RoomsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [propertyFilter, setPropertyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, p, rt] = await Promise.all([fetchUnits(), fetchProperties(), fetchRoomTypes()]);
      setUnits(u);
      setProperties(p);
      setRoomTypes(rt);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load units');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = units.filter(u => {
    if (propertyFilter && u.property_id !== propertyFilter) return false;
    if (statusFilter && u.status !== statusFilter) return false;
    return true;
  });

  const statusCounts = units.reduce((acc, u) => {
    acc[u.status] = (acc[u.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Status legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_STYLES).map(([key, style]) => (
          <div key={key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs">
            <span className={`w-2 h-2 rounded-full ${style.dot}`} />
            <span className="text-gray-600">{style.label}</span>
            <span className="text-gray-400 font-medium">{statusCounts[key] ?? 0}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
        <select value={propertyFilter} onChange={e => setPropertyFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="">All Properties</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="">All Statuses</option>
          {Object.entries(STATUS_STYLES).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
        </select>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors ml-auto"
        >
          <Plus size={16} /> New Unit
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BedDouble size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium">No units found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(u => {
            const style = STATUS_STYLES[u.status] ?? STATUS_STYLES.available;
            const prop = properties.find(p => p.id === u.property_id);
            const rt = roomTypes.find(t => t.id === u.room_type_id);
            return (
              <div
                key={u.id}
                onClick={() => { setEditing(u); setShowModal(true); }}
                className={`p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all ${style.bg}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{prop?.name ?? '—'}</p>
                  </div>
                  <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                </div>
                {rt && <p className="text-xs text-gray-400 mt-2">{rt.name} · Cap {rt.capacity}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${HK_STYLES[u.housekeeping_status] ?? ''}`}>
                    <Sparkles size={9} className="inline -mt-0.5 mr-0.5" />{u.housekeeping_status}
                  </span>
                  {u.maintenance_notes && (
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                      <Wrench size={9} className="inline -mt-0.5 mr-0.5" />Maintenance
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <UnitModal
          editing={editing}
          properties={properties}
          roomTypes={roomTypes}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}

function UnitModal({
  editing, properties, roomTypes, onClose, onSaved,
}: {
  editing: Unit | null;
  properties: Property[];
  roomTypes: RoomType[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    property_id: editing?.property_id ?? '',
    room_type_id: editing?.room_type_id ?? '',
    name: editing?.name ?? '',
    floor: editing?.floor ?? '',
    status: editing?.status ?? 'available',
    housekeeping_status: editing?.housekeeping_status ?? 'clean',
    maintenance_notes: editing?.maintenance_notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filteredRoomTypes = roomTypes.filter(rt => !form.property_id || rt.property_id === form.property_id);

  const handleSave = async () => {
    if (!form.name.trim()) { setErr('Unit name is required'); return; }
    if (!form.property_id) { setErr('Property is required'); return; }
    setSaving(true);
    setErr(null);
    try {
      const payload = { ...form, room_type_id: form.room_type_id || null };
      if (editing) {
        await updateUnit(editing.id, payload);
      } else {
        await createUnit(payload);
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
    if (!confirm('Delete this unit? This cannot be undone.')) return;
    setSaving(true);
    try {
      await deleteUnit(editing.id);
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
          <h2 className="text-base font-semibold text-gray-900">{editing ? 'Edit Unit' : 'New Unit'}</h2>
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
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Property *</label>
              <select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value, room_type_id: '' }))} className="input">
                <option value="">Select…</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Room Type</label>
              <select value={form.room_type_id} onChange={e => setForm(f => ({ ...f, room_type_id: e.target.value }))} className="input">
                <option value="">None</option>
                {filteredRoomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Unit Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" placeholder="e.g. Room 10, Flat A, Cottage 1" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Floor</label>
              <input value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input">
                {Object.entries(STATUS_STYLES).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Housekeeping</label>
              <select value={form.housekeeping_status} onChange={e => setForm(f => ({ ...f, housekeeping_status: e.target.value }))} className="input">
                <option value="clean">Clean</option>
                <option value="dirty">Dirty</option>
                <option value="inspected">Inspected</option>
                <option value="out_of_service">Out of Service</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Maintenance Notes</label>
            <textarea value={form.maintenance_notes} onChange={e => setForm(f => ({ ...f, maintenance_notes: e.target.value }))} className="input" rows={2} />
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
              {editing ? 'Save Changes' : 'Create Unit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
