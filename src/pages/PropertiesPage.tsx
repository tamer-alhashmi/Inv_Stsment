import { useState, useEffect, useCallback } from 'react';
import { Hotel, Plus, X, Loader2, AlertCircle, Building2 } from 'lucide-react';
import {
  fetchProperties, createProperty, updateProperty, deleteProperty,
  fetchRoomTypes, createRoomType, deleteRoomType,
} from '@/lib/pms';
import type { Property, RoomType } from '@/lib/types';

export function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [props, types] = await Promise.all([fetchProperties(), fetchRoomTypes()]);
      setProperties(props);
      setRoomTypes(types);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{properties.length} properties in your group</p>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> New Property
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map(p => {
            const types = roomTypes.filter(rt => rt.property_id === p.id);
            const isExpanded = expanded === p.id;
            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : p.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Building2 size={18} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{p.address ?? 'No address'}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>{p.status}</span>
                        {p.vat_number && <span className="text-xs text-gray-400">VAT: {p.vat_number}</span>}
                      </div>
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-gray-400">Email:</span> <span className="text-gray-600">{p.email ?? '—'}</span></div>
                      <div><span className="text-gray-400">Phone:</span> <span className="text-gray-600">{p.phone ?? '—'}</span></div>
                      <div><span className="text-gray-400">Code:</span> <span className="text-gray-600">{p.property_code ?? '—'}</span></div>
                      <div><span className="text-gray-400">VAT Rate:</span> <span className="text-gray-600">{(p.vat_rate * 100).toFixed(0)}%</span></div>
                    </div>
                    {p.invoice_footer && (
                      <div className="text-xs text-gray-500 italic border-t border-gray-50 pt-2">{p.invoice_footer}</div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Room Types ({types.length})</p>
                      {types.length === 0 ? (
                        <p className="text-xs text-gray-400">No room types configured</p>
                      ) : (
                        <div className="space-y-1">
                          {types.map(t => (
                            <div key={t.id} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">{t.name}</span>
                              <span className="text-gray-400">Cap: {t.capacity} {t.base_rate ? `· £${t.base_rate}/night` : ''}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditing(p); setShowModal(true); }}
                      className="w-full text-xs font-medium text-blue-600 hover:bg-blue-50 py-2 rounded-lg transition-colors"
                    >
                      Edit Property
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <PropertyModal
          editing={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}

function PropertyModal({ editing, onClose, onSaved }: { editing: Property | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    address: editing?.address ?? '',
    email: editing?.email ?? '',
    phone: editing?.phone ?? '',
    property_code: editing?.property_code ?? '',
    vat_number: editing?.vat_number ?? '',
    vat_rate: editing ? String(editing.vat_rate) : '0.20',
    invoice_footer: editing?.invoice_footer ?? '',
    vat_message: editing?.vat_message ?? '',
    status: editing?.status ?? 'active',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.name.trim()) { setErr('Property name is required'); return; }
    setSaving(true);
    setErr(null);
    try {
      const payload = { ...form, vat_rate: parseFloat(form.vat_rate) || 0.20 };
      if (editing) {
        await updateProperty(editing.id, payload);
      } else {
        await createProperty(payload);
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
    if (!confirm('Delete this property and all its rooms? This cannot be undone.')) return;
    setSaving(true);
    try {
      await deleteProperty(editing.id);
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
          <h2 className="text-base font-semibold text-gray-900">{editing ? 'Edit Property' : 'New Property'}</h2>
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
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Property Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Address</label>
            <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="input" />
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Property Code</label>
              <input value={form.property_code} onChange={e => setForm(f => ({ ...f, property_code: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">VAT Number</label>
              <input value={form.vat_number} onChange={e => setForm(f => ({ ...f, vat_number: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">VAT Rate</label>
              <input type="number" step="0.01" value={form.vat_rate} onChange={e => setForm(f => ({ ...f, vat_rate: e.target.value }))} className="input" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Invoice Footer</label>
            <textarea value={form.invoice_footer} onChange={e => setForm(f => ({ ...f, invoice_footer: e.target.value }))} className="input" rows={2} />
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
              {editing ? 'Save Changes' : 'Create Property'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
