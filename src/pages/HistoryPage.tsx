import { useState, useEffect } from 'react';
import { listDocumentHistory, listUserHistory } from '@/lib/db';
import { EmailModal } from '@/components/EmailModal';
import { useLoadingBar } from '@/components/LoadingBar';
import { Receipt, FileText, Mail, Layers, Clock, ExternalLink, UserCircle, Shield, UserPlus, Trash2, Edit3 } from 'lucide-react';
import type { DocumentHistoryEntry, DocType, UserHistoryEntry } from '@/lib/types';

const ICONS: Record<DocType, typeof Receipt> = {
  invoice: Receipt,
  statement: FileText,
  council_letter: Mail,
  combined: Layers,
};

const LABELS: Record<DocType, string> = {
  invoice: 'Invoice',
  statement: 'Receipt',
  council_letter: 'Council Letter',
  combined: 'Combined',
};

const STYLES: Record<DocType, string> = {
  invoice: 'bg-blue-50 text-blue-700',
  statement: 'bg-emerald-50 text-emerald-700',
  council_letter: 'bg-amber-50 text-amber-700',
  combined: 'bg-violet-50 text-violet-700',
};

const ACTION_META: Record<string, { icon: typeof Receipt; label: string; color: string }> = {
  create:      { icon: UserPlus, label: 'Created',   color: 'text-emerald-600 bg-emerald-50' },
  update:      { icon: Edit3,    label: 'Updated',   color: 'text-blue-600 bg-blue-50' },
  delete:      { icon: Trash2,   label: 'Deleted',   color: 'text-red-500 bg-red-50' },
  role_change: { icon: Shield,   label: 'Role Changed', color: 'text-amber-600 bg-amber-50' },
};

export function HistoryPage({ onReopen, isAdmin }: { onReopen?: (entry: DocumentHistoryEntry) => void; isAdmin?: boolean }) {
  const [tab, setTab] = useState<'documents' | 'users'>('documents');

  return (
    <div className="space-y-5">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-full sm:w-auto sm:inline-flex">
        <button
          onClick={() => setTab('documents')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'documents' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Clock size={14} /> Documents
          </span>
        </button>
        {isAdmin && (
          <button
            onClick={() => setTab('users')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'users' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <UserCircle size={14} /> User Activity
            </span>
          </button>
        )}
      </div>

      {tab === 'documents' ? <DocumentHistory onReopen={onReopen} /> : <UserHistory />}
    </div>
  );
}

// ============================================================
// Document History
// ============================================================
function DocumentHistory({ onReopen }: { onReopen?: (entry: DocumentHistoryEntry) => void }) {
  const [history, setHistory] = useState<DocumentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailEntry, setEmailEntry] = useState<DocumentHistoryEntry | null>(null);
  const { start, done } = useLoadingBar();

  useEffect(() => {
    if (loading) start(); else done();
  }, [loading, start, done]);

  useEffect(() => {
    listDocumentHistory().then(h => { setHistory(h); setLoading(false); });
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[300px] text-gray-400 text-sm">Loading…</div>;
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Clock size={28} className="text-gray-300" />
        </div>
        <p className="text-sm font-medium text-gray-500">No documents generated yet</p>
        <p className="text-xs text-gray-400 mt-1">Generated invoices, receipts, and letters will appear here</p>
      </div>
    );
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatTime = (d: string) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 text-left">Type</th>
                <th className="px-5 py-3.5 text-left">Guest</th>
                <th className="px-5 py-3.5 text-left">Hotel</th>
                <th className="px-5 py-3.5 text-left">Created By</th>
                <th className="px-5 py-3.5 text-right">Bookings</th>
                <th className="px-5 py-3.5 text-left">Date</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {history.map(h => {
                const Icon = ICONS[h.doc_type];
                return (
                  <tr key={h.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STYLES[h.doc_type]}`}>
                        <Icon size={11} />
                        {LABELS[h.doc_type]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-gray-800">{h.guest_name || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600">{h.hotel_name || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-gray-600 flex items-center gap-1.5">
                        <UserCircle size={13} className="text-gray-400" />
                        {h.created_by_email || 'system'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-600">{h.booking_count}</td>
                    <td className="px-5 py-3.5 text-gray-500">
                      {formatDate(h.created_at)}
                      <span className="text-gray-400 ml-1.5">{formatTime(h.created_at)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onReopen?.(h)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          <ExternalLink size={13} /> Reopen
                        </button>
                        <button
                          onClick={() => setEmailEntry(h)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                          title="Email document"
                        >
                          <Mail size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {history.map(h => {
          const Icon = ICONS[h.doc_type];
          return (
            <div key={h.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-start justify-between mb-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STYLES[h.doc_type]}`}>
                  <Icon size={11} />
                  {LABELS[h.doc_type]}
                </span>
                <span className="text-xs text-gray-400">{formatDate(h.created_at)}</span>
              </div>
              <p className="font-medium text-gray-800 text-sm mb-1">{h.guest_name || '—'}</p>
              <p className="text-xs text-gray-500 mb-2">{h.hotel_name || '—'}</p>
              <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-3">
                <UserCircle size={12} />
                <span>{h.created_by_email || 'system'}</span>
                <span className="mx-1">·</span>
                <span>{h.booking_count} bookings</span>
                <span className="mx-1">·</span>
                <span>{formatTime(h.created_at)}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onReopen?.(h)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  <ExternalLink size={13} /> Reopen
                </button>
                <button
                  onClick={() => setEmailEntry(h)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  <Mail size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <EmailModal
        open={!!emailEntry}
        onClose={() => setEmailEntry(null)}
        docType={emailEntry ? LABELS[emailEntry.doc_type] : ''}
        guestName={emailEntry?.guest_name || 'Guest'}
        hotelName={emailEntry?.hotel_name || ''}
      />
    </>
  );
}

// ============================================================
// User History
// ============================================================
function UserHistory() {
  const [history, setHistory] = useState<UserHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { start, done } = useLoadingBar();

  useEffect(() => {
    if (loading) start(); else done();
  }, [loading, start, done]);

  useEffect(() => {
    listUserHistory().then(h => { setHistory(h); setLoading(false); });
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[300px] text-gray-400 text-sm">Loading…</div>;
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <UserCircle size={28} className="text-gray-300" />
        </div>
        <p className="text-sm font-medium text-gray-500">No user activity recorded yet</p>
        <p className="text-xs text-gray-400 mt-1">User management actions will appear here</p>
      </div>
    );
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatTime = (d: string) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 text-left">Action</th>
                <th className="px-5 py-3.5 text-left">Target User</th>
                <th className="px-5 py-3.5 text-left">Role</th>
                <th className="px-5 py-3.5 text-left">Performed By</th>
                <th className="px-5 py-3.5 text-left">Details</th>
                <th className="px-5 py-3.5 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {history.map(h => {
                const meta = ACTION_META[h.action_type] || ACTION_META.update;
                const ActionIcon = meta.icon;
                return (
                  <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${meta.color}`}>
                        <ActionIcon size={11} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-gray-800">{h.target_email || '—'}</td>
                    <td className="px-5 py-3.5">
                      {h.target_role && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          h.target_role === 'admin' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {h.target_role === 'admin' && <Shield size={10} />}
                          {h.target_role}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 flex items-center gap-1.5">
                      <UserCircle size={13} className="text-gray-400" />
                      {h.performed_by_email}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{h.details}</td>
                    <td className="px-5 py-3.5 text-gray-500">
                      {formatDate(h.created_at)}
                      <span className="text-gray-400 ml-1.5">{formatTime(h.created_at)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {history.map(h => {
          const meta = ACTION_META[h.action_type] || ACTION_META.update;
          const ActionIcon = meta.icon;
          return (
            <div key={h.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-start justify-between mb-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${meta.color}`}>
                  <ActionIcon size={11} />
                  {meta.label}
                </span>
                <span className="text-xs text-gray-400">{formatDate(h.created_at)}</span>
              </div>
              <p className="font-medium text-gray-800 text-sm mb-1">{h.target_email || '—'}</p>
              {h.target_role && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium mb-2 ${
                  h.target_role === 'admin' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {h.target_role === 'admin' && <Shield size={10} />}
                  {h.target_role}
                </span>
              )}
              <p className="text-xs text-gray-500 mb-2">{h.details}</p>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <UserCircle size={12} />
                <span>by {h.performed_by_email}</span>
                <span className="mx-1">·</span>
                <span>{formatTime(h.created_at)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
