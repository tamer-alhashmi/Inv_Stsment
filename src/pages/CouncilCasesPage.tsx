import { useState, useEffect, useCallback } from 'react';
import {
  Landmark, Plus, Search, X, Loader2, AlertCircle, Clock, PoundSterling,
  Calendar, FileText, Mail,
} from 'lucide-react';
import {
  fetchCouncilCases, createCouncilCase, updateCouncilCase, deleteCouncilCase,
  fetchCouncils, fetchCouncilContacts, fetchProperties, fetchGuests,
  fetchFundingPeriods, createFundingPeriod, updateFundingPeriod, deleteFundingPeriod,
} from '@/lib/pms';
import type {
  CouncilCaseWithRelations, Council, CouncilContact, Property, Guest, FundingPeriod,
} from '@/lib/types';
import type { TabId } from '@/components/Sidebar';

const CASE_STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  awaiting_council: 'bg-amber-100 text-amber-700',
  funding_expiring: 'bg-orange-100 text-orange-700',
  extended: 'bg-teal-100 text-teal-700',
  funding_ended: 'bg-red-100 text-red-700',
  guest_self_funded: 'bg-gray-100 text-gray-600',
  closed: 'bg-gray-100 text-gray-500',
};

const FUNDING_STATUS_STYLES: Record<string, string> = {
  awaiting_confirmation: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  active: 'bg-teal-100 text-teal-700',
  expiring: 'bg-orange-100 text-orange-700',
  extension_requested: 'bg-blue-100 text-blue-700',
  extension_approved: 'bg-teal-100 text-teal-700',
  expired: 'bg-red-100 text-red-700',
  terminated: 'bg-red-100 text-red-700',
  guest_responsible: 'bg-gray-100 text-gray-600',
  other_payer: 'bg-gray-100 text-gray-600',
  disputed: 'bg-orange-100 text-orange-700',
};

export function CouncilCasesPage({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const [cases, setCases] = useState<CouncilCaseWithRelations[]>([]);
  const [councils, setCouncils] = useState<Council[]>([]);
  const [contacts, setContacts] = useState<CouncilContact[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CouncilCaseWithRelations | null>(null);
  const [selectedCase, setSelectedCase] = useState<CouncilCaseWithRelations | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, cl, ct, p, g] = await Promise.all([
        fetchCouncilCases(),
        fetchCouncils(),
        fetchCouncilContacts(),
        fetchProperties(),
        fetchGuests(),
      ]);
      setCases(c);
      setCouncils(cl);
      setContacts(ct);
      setProperties(p);
      setGuests(g);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load council cases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = cases.filter(c => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (c.guest?.full_name?.toLowerCase().includes(q) ?? false) ||
             (c.council?.name?.toLowerCase().includes(q) ?? false) ||
             (c.case_number?.toLowerCase().includes(q) ?? false) ||
             (c.council_reference?.toLowerCase().includes(q) ?? false);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search guest, council, or reference…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="active">Active</option>
          <option value="awaiting_council">Awaiting Council</option>
          <option value="funding_expiring">Funding Expiring</option>
          <option value="extended">Extended</option>
          <option value="funding_ended">Funding Ended</option>
          <option value="guest_self_funded">Guest Self-Funded</option>
          <option value="closed">Closed</option>
        </select>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> New Case
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Cases grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Landmark size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium">No council cases found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => {
            const funding = c.funding_periods ?? [];
            const activeFunding = funding.find(f => f.status === 'active' || f.status === 'approved');
            const expiringSoon = funding.find(f => {
              if (f.status !== 'expiring') return false;
              const days = Math.ceil((new Date(f.funding_end).getTime() - Date.now()) / 86400000);
              return days <= 30 && days >= 0;
            });
            return (
              <div
                key={c.id}
                onClick={() => setSelectedCase(c)}
                className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{c.guest?.full_name ?? '—'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{c.council?.name ?? '—'}</p>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${CASE_STATUS_STYLES[c.status] ?? ''}`}>
                    {c.status.replace(/_/g, ' ')}
                  </span>
                </div>
                {c.case_number && <p className="text-xs text-gray-400 mb-2">Case: {c.case_number}</p>}
                {activeFunding && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <Calendar size={12} />
                    <span>Funding: {activeFunding.funding_start} → {activeFunding.funding_end}</span>
                  </div>
                )}
                {expiringSoon && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-orange-50 border border-orange-100 text-xs text-orange-700">
                    <Clock size={11} /> Funding expires soon
                  </div>
                )}
                {c.po_number && <p className="text-xs text-gray-400 mt-2">PO: {c.po_number}</p>}
              </div>
            );
          })}
        </div>
      )}

      {selectedCase && (
        <CaseDetailDrawer
          caseData={selectedCase}
          onClose={() => setSelectedCase(null)}
          onEdit={() => { setEditing(selectedCase); setShowModal(true); setSelectedCase(null); }}
          onNavigate={onNavigate}
          onChanged={load}
        />
      )}

      {showModal && (
        <CaseModal
          editing={editing}
          councils={councils}
          contacts={contacts}
          properties={properties}
          guests={guests}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}

function CaseDetailDrawer({
  caseData, onClose, onEdit, onNavigate, onChanged,
}: {
  caseData: CouncilCaseWithRelations;
  onClose: () => void;
  onEdit: () => void;
  onNavigate: (tab: TabId) => void;
  onChanged: () => void;
}) {
  const [funding, setFunding] = useState<FundingPeriod[]>(caseData.funding_periods ?? []);
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [editingFunding, setEditingFunding] = useState<FundingPeriod | null>(null);

  const loadFunding = async () => {
    const data = await fetchFundingPeriods(caseData.id);
    setFunding(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{caseData.guest?.full_name ?? '—'}</h2>
            <p className="text-xs text-gray-500">{caseData.council?.name ?? '—'} · {caseData.case_number ?? 'No case #'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg">Edit</button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Overview */}
          <div className="grid grid-cols-2 gap-3">
            <InfoBox label="Council" value={caseData.council?.name} />
            <InfoBox label="Department" value={caseData.council?.department} />
            <InfoBox label="Council Ref" value={caseData.council_reference} />
            <InfoBox label="PO Number" value={caseData.po_number} />
            <InfoBox label="Approved Rate" value={caseData.approved_rate ? `£${caseData.approved_rate.toFixed(2)}` : null} />
            <InfoBox label="Property" value={caseData.property?.name} />
          </div>

          {/* Funding Periods */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Funding Periods</h3>
              <button
                onClick={() => { setEditingFunding(null); setShowFundingModal(true); }}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                + Add Period
              </button>
            </div>
            {funding.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No funding periods recorded</p>
            ) : (
              <div className="space-y-2">
                {funding.map(fp => (
                  <div key={fp.id} className="p-3 rounded-lg border border-gray-100 hover:border-gray-200">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {fp.funding_start} → {fp.funding_end}
                      </p>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${FUNDING_STATUS_STYLES[fp.status] ?? ''}`}>
                        {fp.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {fp.approved_rate != null && (
                      <p className="text-xs text-gray-500 mt-1">Rate: £{fp.approved_rate.toFixed(2)}/night</p>
                    )}
                    {fp.notes && <p className="text-xs text-gray-400 mt-1">{fp.notes}</p>}
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => { setEditingFunding(fp); setShowFundingModal(true); }}
                        className="text-xs text-blue-600 hover:underline">Edit</button>
                      <button onClick={async () => {
                        if (!confirm('Delete this funding period?')) return;
                        await deleteFundingPeriod(fp.id);
                        loadFunding();
                        onChanged();
                      }} className="text-xs text-red-600 hover:underline">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => onNavigate('council')} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <Mail size={13} /> Send Letter
            </button>
            <button onClick={() => onNavigate('accounts')} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <PoundSterling size={13} /> View Invoices
            </button>
          </div>

          {caseData.notes && (
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700">{caseData.notes}</p>
            </div>
          )}
        </div>
      </div>

      {showFundingModal && (
        <FundingPeriodModal
          editing={editingFunding}
          caseId={caseData.id}
          onClose={() => setShowFundingModal(false)}
          onSaved={() => { setShowFundingModal(false); loadFunding(); onChanged(); }}
        />
      )}
    </div>
  );
}

function FundingPeriodModal({
  editing, caseId, onClose, onSaved,
}: {
  editing: FundingPeriod | null;
  caseId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    funding_start: editing?.funding_start ?? '',
    funding_end: editing?.funding_end ?? '',
    approved_rate: editing?.approved_rate ? String(editing.approved_rate) : '',
    status: editing?.status ?? 'approved',
    notes: editing?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        council_case_id: caseId,
        funding_start: form.funding_start,
        funding_end: form.funding_end,
        approved_rate: form.approved_rate ? parseFloat(form.approved_rate) : null,
        status: form.status,
        notes: form.notes,
      };
      if (editing) {
        await updateFundingPeriod(editing.id, payload);
      } else {
        await createFundingPeriod(payload);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{editing ? 'Edit Funding Period' : 'Add Funding Period'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {err && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"><AlertCircle size={16} /> {err}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Funding Start</label>
              <input type="date" value={form.funding_start} onChange={e => setForm(f => ({ ...f, funding_start: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Funding End</label>
              <input type="date" value={form.funding_end} onChange={e => setForm(f => ({ ...f, funding_end: e.target.value }))} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Approved Rate (£)</label>
              <input type="number" step="0.01" value={form.approved_rate} onChange={e => setForm(f => ({ ...f, approved_rate: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input">
                <option value="awaiting_confirmation">Awaiting Confirmation</option>
                <option value="approved">Approved</option>
                <option value="active">Active</option>
                <option value="expiring">Expiring</option>
                <option value="extension_requested">Extension Requested</option>
                <option value="extension_approved">Extension Approved</option>
                <option value="expired">Expired</option>
                <option value="terminated">Terminated</option>
                <option value="guest_responsible">Guest Responsible</option>
                <option value="other_payer">Other Payer</option>
                <option value="disputed">Disputed</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input" rows={2} />
          </div>
        </div>
        <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? <Loader2 size={15} className="animate-spin" /> : null}
            {editing ? 'Save' : 'Add Period'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CaseModal({
  editing, councils, contacts, properties, guests, onClose, onSaved,
}: {
  editing: CouncilCaseWithRelations | null;
  councils: Council[];
  contacts: CouncilContact[];
  properties: Property[];
  guests: Guest[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    guest_id: editing?.guest_id ?? '',
    council_id: editing?.council_id ?? '',
    council_contact_id: editing?.council_contact_id ?? '',
    property_id: editing?.property_id ?? '',
    case_number: editing?.case_number ?? '',
    council_reference: editing?.council_reference ?? '',
    po_number: editing?.po_number ?? '',
    approved_rate: editing?.approved_rate ? String(editing.approved_rate) : '',
    status: editing?.status ?? 'new',
    notes: editing?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filteredContacts = contacts.filter(c => !form.council_id || c.council_id === form.council_id);

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        ...form,
        approved_rate: form.approved_rate ? parseFloat(form.approved_rate) : null,
        council_contact_id: form.council_contact_id || null,
      };
      if (editing) {
        await updateCouncilCase(editing.id, payload);
      } else {
        await createCouncilCase(payload);
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
    if (!confirm('Delete this council case? This cannot be undone.')) return;
    setSaving(true);
    try {
      await deleteCouncilCase(editing.id);
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
          <h2 className="text-base font-semibold text-gray-900">{editing ? 'Edit Council Case' : 'New Council Case'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {err && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"><AlertCircle size={16} /> {err}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Guest *</label>
              <select value={form.guest_id} onChange={e => setForm(f => ({ ...f, guest_id: e.target.value }))} className="input">
                <option value="">Select guest…</option>
                {guests.map(g => <option key={g.id} value={g.id}>{g.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Property *</label>
              <select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} className="input">
                <option value="">Select property…</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Council *</label>
              <select value={form.council_id} onChange={e => setForm(f => ({ ...f, council_id: e.target.value, council_contact_id: '' }))} className="input">
                <option value="">Select council…</option>
                {councils.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Council Contact</label>
              <select value={form.council_contact_id} onChange={e => setForm(f => ({ ...f, council_contact_id: e.target.value }))} className="input">
                <option value="">None</option>
                {filteredContacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Case #</label>
              <input value={form.case_number} onChange={e => setForm(f => ({ ...f, case_number: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Council Ref</label>
              <input value={form.council_reference} onChange={e => setForm(f => ({ ...f, council_reference: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">PO Number</label>
              <input value={form.po_number} onChange={e => setForm(f => ({ ...f, po_number: e.target.value }))} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Approved Rate (£)</label>
              <input type="number" step="0.01" value={form.approved_rate} onChange={e => setForm(f => ({ ...f, approved_rate: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input">
                <option value="new">New</option>
                <option value="active">Active</option>
                <option value="awaiting_council">Awaiting Council</option>
                <option value="funding_expiring">Funding Expiring</option>
                <option value="extended">Extended</option>
                <option value="funding_ended">Funding Ended</option>
                <option value="guest_self_funded">Guest Self-Funded</option>
                <option value="closed">Closed</option>
              </select>
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
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? <Loader2 size={15} className="animate-spin" /> : null}
              {editing ? 'Save Changes' : 'Create Case'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm text-gray-700 mt-0.5">{value ?? '—'}</p>
    </div>
  );
}
