import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Loader2, AlertCircle, TrendingUp, Building2,
  PoundSterling, Users, Calendar, Download,
} from 'lucide-react';
import {
  fetchReservations, fetchInvoices, fetchProperties, fetchCouncilCases, fetchGuests,
} from '@/lib/pms';
import type { ReservationWithRelations, InvoiceWithRelations, Property, CouncilCaseWithRelations, Guest } from '@/lib/types';

export function ReportsPage() {
  const [reservations, setReservations] = useState<ReservationWithRelations[]>([]);
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [councilCases, setCouncilCases] = useState<CouncilCaseWithRelations[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'management' | 'occupancy' | 'revenue' | 'council'>('management');
  const [propertyFilter, setPropertyFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, inv, props, cases, gsts] = await Promise.all([
        fetchReservations(),
        fetchInvoices(),
        fetchProperties(),
        fetchCouncilCases(),
        fetchGuests(),
      ]);
      setReservations(res);
      setInvoices(inv);
      setProperties(props);
      setCouncilCases(cases);
      setGuests(gsts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredReservations = propertyFilter ? reservations.filter(r => r.property_id === propertyFilter) : reservations;
  const filteredInvoices = propertyFilter ? invoices.filter(i => i.property_id === propertyFilter) : invoices;
  const filteredCases = propertyFilter ? councilCases.filter(c => c.property_id === propertyFilter) : councilCases;

  // Management report data
  const today = new Date().toISOString().slice(0, 10);
  const arrivals = filteredReservations.filter(r => r.check_in === today);
  const departures = filteredReservations.filter(r => r.check_out === today);
  const inHouse = filteredReservations.filter(r => r.booking_status === 'checked_in');
  const totalRevenue = filteredInvoices.reduce((s, i) => s + i.total, 0);
  const outstanding = filteredInvoices.reduce((s, i) => s + i.balance, 0);
  const overdue = filteredInvoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.balance, 0);
  const councilRevenue = filteredInvoices.filter(i => i.council_case_id).reduce((s, i) => s + i.total, 0);
  const councilOutstanding = filteredInvoices.filter(i => i.council_case_id).reduce((s, i) => s + i.balance, 0);
  const fundingExpiring = filteredCases.filter(c => c.status === 'funding_expiring');
  const extensionsPending = filteredCases.filter(c => c.status === 'awaiting_council');

  // Occupancy data
  const occupiedCount = inHouse.length;
  const totalRooms = properties.reduce((sum, p) => sum + 1, 0); // simplified
  const occupancyRate = totalRooms > 0 ? (occupiedCount / totalRooms * 100).toFixed(1) : '0';

  // Revenue by property
  const revenueByProperty = properties.map(p => {
    const propInvoices = invoices.filter(i => i.property_id === p.id);
    return {
      name: p.name,
      revenue: propInvoices.reduce((s, i) => s + i.total, 0),
      outstanding: propInvoices.reduce((s, i) => s + i.balance, 0),
      count: propInvoices.length,
    };
  }).filter(r => r.count > 0);

  // Revenue by booking source
  const sourceMap = new Map<string, number>();
  filteredReservations.forEach(r => {
    const source = r.booking_source?.name ?? 'Unknown';
    sourceMap.set(source, (sourceMap.get(source) ?? 0) + (r.total_value || 0));
  });
  const revenueBySource = Array.from(sourceMap.entries()).sort((a, b) => b[1] - a[1]);

  // Council report
  const activeCouncilGuests = filteredCases.filter(c => c.status === 'active' || c.status === 'extended');

  const exportCSV = () => {
    let csv = '';
    if (reportType === 'management') {
      csv = 'Metric,Value\n';
      csv += `Total Properties,${properties.length}\n`;
      csv += `Total Reservations,${filteredReservations.length}\n`;
      csv += `Arrivals Today,${arrivals.length}\n`;
      csv += `Departures Today,${departures.length}\n`;
      csv += `In-House Guests,${inHouse.length}\n`;
      csv += `Total Revenue,£${totalRevenue.toFixed(2)}\n`;
      csv += `Outstanding,£${outstanding.toFixed(2)}\n`;
      csv += `Overdue,£${overdue.toFixed(2)}\n`;
      csv += `Council Revenue,£${councilRevenue.toFixed(2)}\n`;
      csv += `Council Outstanding,£${councilOutstanding.toFixed(2)}\n`;
      csv += `Funding Expiring,${fundingExpiring.length}\n`;
      csv += `Extensions Pending,${extensionsPending.length}\n`;
    } else if (reportType === 'occupancy') {
      csv = 'Property,Guest,Check-in,Check-out,Nights,Unit,Status\n';
      filteredReservations.forEach(r => {
        csv += `${r.property?.name ?? ''},${r.guest?.full_name ?? ''},${r.check_in},${r.check_out},${r.nights},${r.unit?.name ?? ''},${r.booking_status}\n`;
      });
    } else if (reportType === 'revenue') {
      csv = 'Invoice #,Guest,Property,Date,Subtotal,VAT,Total,Paid,Balance,Status\n';
      filteredInvoices.forEach(i => {
        csv += `${i.invoice_number},${i.guest?.full_name ?? ''},${i.property?.name ?? ''},${i.invoice_date},£${i.subtotal.toFixed(2)},£${i.vat_amount.toFixed(2)},£${i.total.toFixed(2)},£${i.payments_total.toFixed(2)},£${i.balance.toFixed(2)},${i.status}\n`;
      });
    } else if (reportType === 'council') {
      csv = 'Case #,Guest,Council,Status,PO Number,Council Ref,Approved Rate\n';
      filteredCases.forEach(c => {
        csv += `${c.case_number ?? ''},${c.guest?.full_name ?? ''},${c.council?.name ?? ''},${c.status},${c.po_number ?? ''},${c.council_reference ?? ''},£${(c.approved_rate ?? 0).toFixed(2)}\n`;
      });
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-report-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-gray-50 rounded-lg p-1">
          {(['management', 'occupancy', 'revenue', 'council'] as const).map(t => (
            <button
              key={t}
              onClick={() => setReportType(t)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                reportType === t ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'management' ? 'Management' : t}
            </button>
          ))}
        </div>
        <select value={propertyFilter} onChange={e => setPropertyFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="">All Properties</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors ml-auto"
        >
          <Download size={15} /> Export CSV
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Management Report */}
      {reportType === 'management' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ReportCard icon={Building2} label="Properties" value={String(properties.length)} color="text-blue-600 bg-blue-50" />
            <ReportCard icon={Users} label="Total Guests" value={String(guests.length)} color="text-purple-600 bg-purple-50" />
            <ReportCard icon={Calendar} label="Arrivals Today" value={String(arrivals.length)} color="text-green-600 bg-green-50" />
            <ReportCard icon={Calendar} label="Departures Today" value={String(departures.length)} color="text-amber-600 bg-amber-50" />
            <ReportCard icon={PoundSterling} label="Total Revenue" value={`£${totalRevenue.toFixed(2)}`} color="text-green-600 bg-green-50" />
            <ReportCard icon={PoundSterling} label="Outstanding" value={`£${outstanding.toFixed(2)}`} color="text-amber-600 bg-amber-50" />
            <ReportCard icon={PoundSterling} label="Overdue" value={`£${overdue.toFixed(2)}`} color="text-red-600 bg-red-50" />
            <ReportCard icon={TrendingUp} label="Occupancy" value={`${occupancyRate}%`} color="text-teal-600 bg-teal-50" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Council summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Council Summary</h3>
              <div className="space-y-3">
                <ReportRow label="Active Council Guests" value={String(activeCouncilGuests.length)} />
                <ReportRow label="Council Revenue" value={`£${councilRevenue.toFixed(2)}`} />
                <ReportRow label="Council Outstanding" value={`£${councilOutstanding.toFixed(2)}`} />
                <ReportRow label="Funding Expiring" value={String(fundingExpiring.length)} badge={fundingExpiring.length > 0 ? 'warning' : undefined} />
                <ReportRow label="Extensions Pending" value={String(extensionsPending.length)} badge={extensionsPending.length > 0 ? 'info' : undefined} />
              </div>
            </div>

            {/* Revenue by property */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue by Property</h3>
              {revenueByProperty.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No revenue data</p>
              ) : (
                <div className="space-y-3">
                  {revenueByProperty.map(r => (
                    <div key={r.name}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{r.name}</span>
                        <span className="font-medium text-gray-900">£{r.revenue.toFixed(2)}</span>
                      </div>
                      <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${totalRevenue > 0 ? (r.revenue / totalRevenue * 100) : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Occupancy Report */}
      {reportType === 'occupancy' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
                </tr>
              </thead>
              <tbody>
                {filteredReservations.map(r => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.guest?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{r.property?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{r.unit?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{r.check_in}</td>
                    <td className="px-4 py-3 text-gray-500">{r.check_out}</td>
                    <td className="px-4 py-3 text-gray-600">{r.nights}</td>
                    <td className="px-4 py-3 text-gray-600">{r.booking_source?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{r.booking_status.replace('_', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revenue Report */}
      {reportType === 'revenue' && (
        <div className="space-y-6">
          {/* Revenue by source */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue by Booking Source</h3>
            {revenueBySource.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No revenue data</p>
            ) : (
              <div className="space-y-3">
                {revenueBySource.map(([source, amount]) => (
                  <div key={source}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{source}</span>
                      <span className="font-medium text-gray-900">£{amount.toFixed(2)}</span>
                    </div>
                    <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-full" style={{ width: `${revenueBySource[0][1] > 0 ? (amount / revenueBySource[0][1] * 100) : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invoice list */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left font-medium text-gray-500 px-4 py-3">Invoice #</th>
                    <th className="text-left font-medium text-gray-500 px-4 py-3">Guest</th>
                    <th className="text-left font-medium text-gray-500 px-4 py-3">Property</th>
                    <th className="text-right font-medium text-gray-500 px-4 py-3">Total</th>
                    <th className="text-right font-medium text-gray-500 px-4 py-3">Balance</th>
                    <th className="text-left font-medium text-gray-500 px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(i => (
                    <tr key={i.id} className="border-b border-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{i.invoice_number}</td>
                      <td className="px-4 py-3 text-gray-600">{i.guest?.full_name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{i.property?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-medium">£{i.total.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-amber-600">£{i.balance.toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-600">{i.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Council Report */}
      {reportType === 'council' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Case #</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Guest</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Council</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Status</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Council Ref</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">PO Number</th>
                  <th className="text-right font-medium text-gray-500 px-4 py-3">Rate</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map(c => (
                  <tr key={c.id} className="border-b border-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.case_number ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.guest?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.council?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.status.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-gray-600">{c.council_reference ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.po_number ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{c.approved_rate ? `£${c.approved_rate.toFixed(2)}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportCard({ icon: Icon, label, value, color }: { icon: typeof Building2; label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} />
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900 leading-none">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{label}</p>
        </div>
      </div>
    </div>
  );
}

function ReportRow({ label, value, badge }: { label: string; value: string; badge?: 'warning' | 'info' }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-medium text-gray-900">{value}</span>
        {badge === 'warning' && <span className="w-2 h-2 rounded-full bg-orange-500" />}
        {badge === 'info' && <span className="w-2 h-2 rounded-full bg-blue-500" />}
      </span>
    </div>
  );
}
