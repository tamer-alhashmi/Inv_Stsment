import { useState, useEffect, useCallback } from 'react';
import {
  PoundSterling, Plus, Search, X, Loader2, AlertCircle, FileText,
} from 'lucide-react';
import {
  fetchInvoices, createInvoice, updateInvoice, deleteInvoice,
  fetchProperties, fetchGuests, createPayment, deletePayment,
} from '@/lib/pms';
import type { InvoiceWithRelations, Property, Guest, Payment } from '@/lib/types';
import type { TabId } from '@/components/Sidebar';

const STATUS_COLORS: Record<string, string> = {
  unpaid: 'bg-red-100 text-red-700',
  part_paid: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  disputed: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-gray-100 text-gray-500',
  refunded: 'bg-gray-100 text-gray-500',
};

export function AccountsPage({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<InvoiceWithRelations | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithRelations | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [inv, props, gsts] = await Promise.all([fetchInvoices(), fetchProperties(), fetchGuests()]);
      setInvoices(inv);
      setProperties(props);
      setGuests(gsts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = invoices.filter(inv => {
    if (statusFilter && inv.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (inv.invoice_number?.toLowerCase().includes(q) ?? false) ||
             (inv.guest?.full_name?.toLowerCase().includes(q) ?? false);
    }
    return true;
  });

  const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((sum, inv) => sum + (inv.balance || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.payments_total || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Total Outstanding" value={`£${totalOutstanding.toFixed(2)}`} color="text-amber-600 bg-amber-50" />
        <SummaryCard label="Overdue" value={`£${totalOverdue.toFixed(2)}`} color="text-red-600 bg-red-50" />
        <SummaryCard label="Payments Received" value={`£${totalPaid.toFixed(2)}`} color="text-green-600 bg-green-50" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search invoice # or guest…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="">All Statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="part_paid">Part Paid</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="disputed">Disputed</option>
        </select>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> New Invoice
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
            <PoundSterling size={36} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium">No invoices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Invoice #</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Guest</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Property</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Date</th>
                  <th className="text-right font-medium text-gray-500 px-4 py-3">Total</th>
                  <th className="text-right font-medium text-gray-500 px-4 py-3">Paid</th>
                  <th className="text-right font-medium text-gray-500 px-4 py-3">Balance</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className="border-b border-gray-50 hover:bg-blue-50/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-gray-600">{inv.guest?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{inv.property?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{inv.invoice_date}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">£{inv.total.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-green-600">£{inv.payments_total.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-medium text-amber-600">£{inv.balance.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[inv.status] ?? ''}`}>
                        {inv.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedInvoice && (
        <InvoiceDetailDrawer
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onEdit={() => { setEditing(selectedInvoice); setShowModal(true); setSelectedInvoice(null); }}
          onNavigate={onNavigate}
          onChanged={load}
        />
      )}

      {showModal && (
        <InvoiceModal
          editing={editing}
          properties={properties}
          guests={guests}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}

function InvoiceDetailDrawer({
  invoice, onClose, onEdit, onNavigate, onChanged,
}: {
  invoice: InvoiceWithRelations;
  onClose: () => void;
  onEdit: () => void;
  onNavigate: (tab: TabId) => void;
  onChanged: () => void;
}) {
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentRef, setPaymentRef] = useState('');
  const [saving, setSaving] = useState(false);

  const payments = invoice.payments ?? [];

  const handleAddPayment = async () => {
    if (!paymentAmount) return;
    setSaving(true);
    try {
      await createPayment({
        invoice_id: invoice.id,
        guest_id: invoice.guest_id,
        property_id: invoice.property_id,
        amount: parseFloat(paymentAmount),
        method: paymentMethod as Payment['method'],
        reference: paymentRef,
      });
      // Update invoice payments_total
      const newTotal = (invoice.payments_total || 0) + parseFloat(paymentAmount);
      const newStatus = newTotal >= invoice.total ? 'paid' : 'part_paid';
      await updateInvoice(invoice.id, { payments_total: newTotal, status: newStatus });
      setShowPayment(false);
      setPaymentAmount('');
      setPaymentRef('');
      onChanged();
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{invoice.invoice_number}</h2>
            <p className="text-xs text-gray-500">{invoice.guest?.full_name} · {invoice.property?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg">Edit</button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-400">Subtotal</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">£{invoice.subtotal.toFixed(2)}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-400">VAT ({(invoice.vat_rate * 100).toFixed(0)}%)</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">£{invoice.vat_amount.toFixed(2)}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-400">Total</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">£{invoice.total.toFixed(2)}</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
              <p className="text-xs text-amber-600">Balance</p>
              <p className="text-sm font-bold text-amber-700 mt-0.5">£{invoice.balance.toFixed(2)}</p>
            </div>
          </div>

          {/* Payments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Payments</h3>
              <button
                onClick={() => setShowPayment(!showPayment)}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                + Add Payment
              </button>
            </div>
            {showPayment && (
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 mb-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" step="0.01" placeholder="Amount £" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="input" />
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="input">
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="online">Online</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <input placeholder="Reference" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} className="input" />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowPayment(false)} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                  <button onClick={handleAddPayment} disabled={saving}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {saving ? <Loader2 size={12} className="animate-spin" /> : null} Record Payment
                  </button>
                </div>
              </div>
            )}
            {payments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No payments recorded</p>
            ) : (
              <div className="space-y-2">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">£{p.amount.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{p.payment_date} · {p.method ?? '—'} {p.reference ? `· Ref: ${p.reference}` : ''}</p>
                    </div>
                    <button onClick={async () => {
                      if (!confirm('Delete this payment?')) return;
                      await deletePayment(p.id);
                      const newTotal = (invoice.payments_total || 0) - p.amount;
                      const newStatus = newTotal <= 0 ? 'unpaid' : 'part_paid';
                      await updateInvoice(invoice.id, { payments_total: Math.max(0, newTotal), status: newStatus });
                      onChanged();
                    }} className="text-xs text-red-600 hover:underline">Delete</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => onNavigate('invoice')} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100">
            <FileText size={15} /> Generate PDF Invoice
          </button>
        </div>
      </div>
    </div>
  );
}

function InvoiceModal({
  editing, properties, guests, onClose, onSaved,
}: {
  editing: InvoiceWithRelations | null;
  properties: Property[];
  guests: Guest[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    invoice_number: editing?.invoice_number ?? `INV-${Date.now().toString().slice(-6)}`,
    invoice_date: editing?.invoice_date ?? new Date().toISOString().slice(0, 10),
    due_date: editing?.due_date ?? '',
    property_id: editing?.property_id ?? '',
    guest_id: editing?.guest_id ?? '',
    subtotal: editing ? String(editing.subtotal) : '',
    vat_rate: editing ? String(editing.vat_rate) : '0.20',
    total: editing ? String(editing.total) : '',
    status: editing?.status ?? 'unpaid',
    notes: editing?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      const sub = parseFloat(form.subtotal) || 0;
      const vatRate = parseFloat(form.vat_rate) || 0;
      const vatAmount = sub * vatRate;
      const total = sub + vatAmount;
      const payload = {
        invoice_number: form.invoice_number,
        invoice_date: form.invoice_date,
        due_date: form.due_date || null,
        property_id: form.property_id,
        guest_id: form.guest_id,
        subtotal: sub,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        total,
        status: form.status,
        notes: form.notes,
      };
      if (editing) {
        await updateInvoice(editing.id, payload);
      } else {
        await createInvoice(payload);
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
    if (!confirm('Delete this invoice? This cannot be undone.')) return;
    setSaving(true);
    try {
      await deleteInvoice(editing.id);
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
          <h2 className="text-base font-semibold text-gray-900">{editing ? 'Edit Invoice' : 'New Invoice'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {err && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"><AlertCircle size={16} /> {err}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Invoice #</label>
              <input value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Invoice Date</label>
              <input type="date" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Property</label>
              <select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} className="input">
                <option value="">Select…</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Guest</label>
              <select value={form.guest_id} onChange={e => setForm(f => ({ ...f, guest_id: e.target.value }))} className="input">
                <option value="">Select…</option>
                {guests.map(g => <option key={g.id} value={g.id}>{g.full_name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Subtotal £</label>
              <input type="number" step="0.01" value={form.subtotal} onChange={e => setForm(f => ({ ...f, subtotal: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">VAT Rate</label>
              <input type="number" step="0.01" value={form.vat_rate} onChange={e => setForm(f => ({ ...f, vat_rate: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input">
                <option value="unpaid">Unpaid</option>
                <option value="part_paid">Part Paid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="disputed">Disputed</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Due Date</label>
            <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input" rows={2} />
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
              {editing ? 'Save Changes' : 'Create Invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <PoundSterling size={18} />
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900 leading-none">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{label}</p>
        </div>
      </div>
    </div>
  );
}
