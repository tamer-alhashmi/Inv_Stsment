import { useState, useEffect, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { listDocumentHistory } from '@/lib/db';
import { useLoadingBar } from '@/components/LoadingBar';
import { calcTotals, calcUnpaidTotals, formatCurrency, isPaid, getUniqueGuests, getUniqueHotels } from '@/lib/sheets';
import type { Booking, DocumentHistoryEntry, DocType } from '@/lib/types';
import {
  TrendingUp, AlertCircle, CalendarCheck, Users, Receipt, FileText, Mail,
  Layers, Clock, Building2, PoundSterling, CheckCircle2, XCircle,
  Filter, RotateCcw, ChevronDown,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (tab: 'invoice' | 'statement' | 'council' | 'combined') => void;
}

type DatePreset = 'all' | '7d' | '30d' | 'month' | 'year';

const PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'all',   label: 'All Time' },
  { id: '7d',    label: 'Last 7 Days' },
  { id: '30d',   label: 'Last 30 Days' },
  { id: 'month', label: 'This Month' },
  { id: 'year',  label: 'This Year' },
];

function getBookingDate(b: Booking): Date | null {
  const raw = b.checkIn || b.date;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function presetToRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case '7d': {
      const from = new Date(today);
      from.setDate(from.getDate() - 7);
      return { from: from.toISOString().slice(0, 10), to: '' };
    }
    case '30d': {
      const from = new Date(today);
      from.setDate(from.getDate() - 30);
      return { from: from.toISOString().slice(0, 10), to: '' };
    }
    case 'month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: from.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) };
    }
    case 'year': {
      const from = new Date(now.getFullYear(), 0, 1);
      return { from: from.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) };
    }
    default:
      return { from: '', to: '' };
  }
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { bookings, hotels, lastUpdated } = useData();
  const { user } = useAuth();
  const [recentDocs, setRecentDocs] = useState<DocumentHistoryEntry[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const { start, done } = useLoadingBar();

  useEffect(() => {
    if (docsLoading) start(); else done();
  }, [docsLoading, start, done]);

  // Filters
  const [preset, setPreset] = useState<DatePreset>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [hotelFilter, setHotelFilter] = useState('all');
  const [customRange, setCustomRange] = useState(false);

  useEffect(() => {
    listDocumentHistory().then(h => { setRecentDocs(h.slice(0, 5)); setDocsLoading(false); });
  }, []);

  // Sync date fields when preset changes (unless user is in custom mode)
  useEffect(() => {
    if (customRange) return;
    const r = presetToRange(preset);
    setDateFrom(r.from);
    setDateTo(r.to);
  }, [preset, customRange]);

  const hotelNames = useMemo(() => getUniqueHotels(bookings), [bookings]);

  const filteredBookings = useMemo(() => {
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo) : null;
    if (toDate) toDate.setHours(23, 59, 59, 999);

    return bookings.filter(b => {
      if (hotelFilter !== 'all' && b.hotelName !== hotelFilter) return false;
      const bd = getBookingDate(b);
      if (!bd) return false;
      if (fromDate && bd < fromDate) return false;
      if (toDate && bd > toDate) return false;
      return true;
    });
  }, [bookings, hotelFilter, dateFrom, dateTo]);

  const isFiltered = hotelFilter !== 'all' || dateFrom !== '' || dateTo !== '';

  const resetFilters = () => {
    setPreset('all');
    setHotelFilter('all');
    setCustomRange(false);
    setDateFrom('');
    setDateTo('');
  };

  const stats = useMemo(() => {
    const totals = calcTotals(filteredBookings);
    const unpaid = calcUnpaidTotals(filteredBookings);
    const guests = getUniqueGuests(filteredBookings);
    const filteredHotelNames = getUniqueHotels(filteredBookings);
    const paidCount = filteredBookings.filter(b => isPaid(b)).length;
    const unpaidCount = filteredBookings.length - paidCount;

    const byHotel = filteredHotelNames.map(name => {
      const hotelBookings = filteredBookings.filter(b => b.hotelName === name);
      const t = calcTotals(hotelBookings);
      return { name, revenue: t.grandTotal, count: hotelBookings.length };
    }).sort((a, b) => b.revenue - a.revenue);

    const maxRevenue = byHotel[0]?.revenue || 1;

    return {
      totalRevenue: totals.grandTotal,
      unpaidTotal: unpaid.unpaidGrandTotal,
      totalBookings: filteredBookings.length,
      guestCount: guests.length,
      hotelCount: filteredHotelNames.length,
      paidCount,
      unpaidCount,
      byHotel,
      maxRevenue,
    };
  }, [filteredBookings]);

  const paidPercent = stats.totalBookings > 0
    ? Math.round((stats.paidCount / stats.totalBookings) * 100)
    : 0;

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500';

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {lastUpdated
              ? `Data updated ${lastUpdated.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`
              : 'Loading data…'}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Filter size={16} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">Filters</span>
          </div>

          {/* Date presets */}
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => { setPreset(p.id); setCustomRange(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  preset === p.id && !customRange
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => setCustomRange(!customRange)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                customRange ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Custom
            </button>
          </div>

          <div className="hidden lg:block w-px h-6 bg-gray-200" />

          {/* Hotel dropdown */}
          <div className="relative lg:w-52 shrink-0">
            <select
              value={hotelFilter}
              onChange={e => setHotelFilter(e.target.value)}
              className={`${inputCls} appearance-none pr-9 cursor-pointer`}
            >
              <option value="all">All Hotels</option>
              {hotelNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Active filter count + reset */}
          {isFiltered && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0 ml-auto"
            >
              <RotateCcw size={13} /> Reset
            </button>
          )}
        </div>

        {/* Custom date range */}
        {customRange && (
          <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-4 border-t border-gray-100">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        )}
      </div>

      {/* Filtered indicator */}
      {isFiltered && (
        <div className="flex items-center gap-2 text-xs text-blue-600 -mt-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          Showing {stats.totalBookings} of {bookings.length} bookings
          {hotelFilter !== 'all' && <> · Hotel: <span className="font-medium">{hotelFilter}</span></>}
          {dateFrom && <> · From: <span className="font-medium">{new Date(dateFrom).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></>}
          {dateTo && <> · To: <span className="font-medium">{new Date(dateTo).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></>}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<PoundSterling size={18} />}
          label="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          accent="blue"
        />
        <KpiCard
          icon={<AlertCircle size={18} />}
          label="Outstanding"
          value={formatCurrency(stats.unpaidTotal)}
          sub={`${stats.unpaidCount} unpaid bookings`}
          accent="amber"
        />
        <KpiCard
          icon={<CalendarCheck size={18} />}
          label="Total Bookings"
          value={stats.totalBookings.toLocaleString()}
          sub={`${stats.hotelCount} hotels`}
          accent="emerald"
        />
        <KpiCard
          icon={<Users size={18} />}
          label="Unique Guests"
          value={stats.guestCount.toLocaleString()}
          accent="slate"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue by Hotel */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Building2 size={15} className="text-gray-400" />
              Revenue by Hotel
            </h3>
            <span className="text-xs text-gray-400">{stats.byHotel.length} hotels</span>
          </div>

          {stats.byHotel.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-400">
              No hotel data for the selected filters
            </div>
          ) : (
            <div className="space-y-4">
              {stats.byHotel.map((h, i) => {
                const widthPercent = Math.max((h.revenue / stats.maxRevenue) * 100, 2);
                const isTop = i === 0;
                return (
                  <div key={h.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {isTop && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full shrink-0">
                            <TrendingUp size={9} /> TOP
                          </span>
                        )}
                        <span className="text-sm font-medium text-gray-700 truncate">{h.name}</span>
                        <span className="text-xs text-gray-400 shrink-0">{h.count} bookings</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-800 tabular-nums">{formatCurrency(h.revenue)}</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          isTop ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment Status */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-5">Payment Status</h3>

          {/* Donut visual */}
          <div className="flex items-center justify-center mb-5">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#f3f4f6" strokeWidth="12" />
                <circle
                  cx="60" cy="60" r="50" fill="none" stroke="#3b82f6" strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(paidPercent / 100) * 314.16} 314.16`}
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{paidPercent}%</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Paid</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-500" />
                <span className="text-sm text-gray-600">Paid</span>
              </div>
              <span className="text-sm font-semibold text-gray-800 tabular-nums">{stats.paidCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle size={15} className="text-red-400" />
                <span className="text-sm text-gray-600">Unpaid</span>
              </div>
              <span className="text-sm font-semibold text-gray-800 tabular-nums">{stats.unpaidCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions + Recent Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction
              icon={<Receipt size={18} />}
              label="New Invoice"
              onClick={() => onNavigate('invoice')}
              color="blue"
            />
            <QuickAction
              icon={<FileText size={18} />}
              label="New Receipt"
              onClick={() => onNavigate('statement')}
              color="emerald"
            />
            <QuickAction
              icon={<Mail size={18} />}
              label="Council Letter"
              onClick={() => onNavigate('council')}
              color="amber"
            />
            <QuickAction
              icon={<Layers size={18} />}
              label="Combined"
              onClick={() => onNavigate('combined')}
              color="slate"
            />
          </div>
        </div>

        {/* Recent Documents */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Clock size={15} className="text-gray-400" />
              Recent Documents
            </h3>
          </div>

          {recentDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                <Clock size={22} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">No documents generated yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentDocs.map(doc => (
                <RecentDocRow key={doc.id} doc={doc} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// KPI Card
// ============================================================
const ACCENT_MAP: Record<string, { bg: string; text: string; ring: string }> = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-600',    ring: 'focus:ring-blue-500/20' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   ring: 'focus:ring-amber-500/20' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'focus:ring-emerald-500/20' },
  slate:   { bg: 'bg-slate-100',  text: 'text-slate-600',   ring: 'focus:ring-slate-500/20' },
};

function KpiCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  const a = ACCENT_MAP[accent] || ACCENT_MAP.blue;
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${a.bg} flex items-center justify-center ${a.text}`}>
          {icon}
        </div>
      </div>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ============================================================
// Quick Action Button
// ============================================================
const QA_COLOR_MAP: Record<string, string> = {
  blue:    'hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 text-gray-600',
  emerald: 'hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 text-gray-600',
  amber:   'hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 text-gray-600',
  slate:   'hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 text-gray-600',
};

function QuickAction({ icon, label, onClick, color }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 transition-all duration-150 ${QA_COLOR_MAP[color] || QA_COLOR_MAP.blue}`}
    >
      {icon}
      <span className="text-xs font-medium text-center leading-tight">{label}</span>
    </button>
  );
}

// ============================================================
// Recent Document Row
// ============================================================
const DOC_META: Record<DocType, { icon: typeof Receipt; label: string; color: string }> = {
  invoice:        { icon: Receipt,    label: 'Invoice',       color: 'bg-blue-50 text-blue-700' },
  statement:      { icon: FileText,   label: 'Receipt',       color: 'bg-emerald-50 text-emerald-700' },
  council_letter: { icon: Mail,       label: 'Council Letter', color: 'bg-amber-50 text-amber-700' },
  combined:       { icon: Layers,    label: 'Combined',       color: 'bg-slate-100 text-slate-700' },
};

function RecentDocRow({ doc }: { doc: DocumentHistoryEntry }) {
  const meta = DOC_META[doc.doc_type] || DOC_META.invoice;
  const Icon = meta.icon;
  const date = new Date(doc.created_at);
  const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-gray-50 transition-colors">
      <div className={`w-8 h-8 rounded-lg ${meta.color} flex items-center justify-center shrink-0`}>
        <Icon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-800 truncate">{doc.guest_name || '—'}</p>
        <p className="text-xs text-gray-400 truncate">
          {doc.hotel_name || '—'} · {doc.booking_count} {doc.booking_count === 1 ? 'booking' : 'bookings'}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs text-gray-500">{dateStr}</p>
        <p className="text-[10px] text-gray-400">{timeStr}</p>
      </div>
    </div>
  );
}
