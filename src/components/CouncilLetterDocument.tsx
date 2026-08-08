import { useMemo } from 'react';
import type { HotelDetails, Booking } from '@/lib/types';
import { formatDate, getPayerName, getPaymentMethod, isCouncilPaid, isPaid, calcUnpaidTotals, formatCurrency } from '@/lib/sheets';

const A4_WIDTH = 794;

export interface CouncilLetterData {
  hotel: HotelDetails;
  guestName: string;
  councilName: string;
  councilAddress: string;
  councilReference: string;
  officerName: string;
  officerTitle: string;
  letterDate: string;
  bookingCount: number;
  stayPeriodStart: string;
  stayPeriodEnd: string;
  customNotes: string;
  // Council requirements from the image
  enclosedItems: string[];
  tenancyType: string;
  vacateNoticeDate: string;
  vacateNoticeMethod: string;
  antiSocialBehaviour: string;
  outstandingBalance: string;
  bookings?: Booking[];
}

const DEFAULT_ENCLOSURES = [
  'Payment receipt',
  'Terms and conditions of occupancy',
  'Booking correspondence',
];

export function CouncilLetterDocument({
  hotel,
  guestName,
  councilName,
  councilAddress,
  councilReference,
  officerName,
  officerTitle,
  letterDate,
  bookingCount,
  stayPeriodStart,
  stayPeriodEnd,
  customNotes,
  enclosedItems,
  tenancyType,
  vacateNoticeDate,
  vacateNoticeMethod,
  antiSocialBehaviour,
  outstandingBalance,
  bookings,
}: CouncilLetterData) {
  const formattedDate = letterDate ? formatDate(letterDate) : formatDate(new Date().toISOString());
  const enclosures = enclosedItems.length > 0 ? enclosedItems : DEFAULT_ENCLOSURES;

  const paymentSummary = useMemo(() => {
    if (!bookings || bookings.length === 0) return null;
    const sorted = [...bookings].sort((a, b) => {
      const da = new Date(a.checkIn || a.date || 0).getTime();
      const db = new Date(b.checkIn || b.date || 0).getTime();
      return da - db;
    });
    const groups: { period: string; entries: { text: string; unpaid: boolean }[] }[] = [];
    for (const b of sorted) {
      const ci = b.checkIn || b.date || '';
      const co = b.checkOut || '';
      const period = `${formatDate(ci)} to ${formatDate(co)}`;
      const payer = getPayerName(b);
      const council = isCouncilPaid(b.notes);
      const method = getPaymentMethod(b);
      const paid = isPaid(b);
      let text: string;
      if (council) {
        text = paid
          ? `paid ${method} by ${payer} (Council-funded)`
          : `unpaid — Council-funded (${payer})`;
      } else {
        text = paid
          ? `paid ${method} by ${payer} (self-funded)`
          : `unpaid — ${payer} (self-funded)`;
      }
      let grp = groups.find(g => g.period === period);
      if (!grp) { grp = { period, entries: [] }; groups.push(grp); }
      grp.entries.push({ text, unpaid: !paid });
    }
    return groups;
  }, [bookings]);

  const unpaidInfo = useMemo(() => {
    if (!bookings || bookings.length === 0) return null;
    const { unpaidBookings, unpaidGrandTotal } = calcUnpaidTotals(bookings);
    return { unpaidBookings, unpaidGrandTotal };
  }, [bookings]);

  const effectiveOutstanding = unpaidInfo && unpaidInfo.unpaidGrandTotal > 0
    ? formatCurrency(unpaidInfo.unpaidGrandTotal)
    : outstandingBalance;
  const hasOutstanding = effectiveOutstanding && effectiveOutstanding !== '0' && effectiveOutstanding !== '£0.00';

  return (
    <div
      id="council-doc"
      className="bg-white text-gray-800"
      style={{ width: A4_WIDTH, minHeight: 1123, padding: '60px 56px', fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* Letterhead */}
      <div className="mb-10 pb-5 border-b border-gray-300">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{hotel.hotel}</h1>
        <p className="text-xs text-gray-500 mt-1.5 whitespace-pre-line leading-relaxed">{hotel.address}</p>
        <p className="text-xs text-gray-500 mt-1.5">
          {hotel.email && <span>{hotel.email}</span>}
          {hotel.email && hotel.phone && <span> · </span>}
          {hotel.phone && <span>{hotel.phone}</span>}
        </p>
        {hotel.vat && <p className="text-xs text-gray-500 mt-0.5">VAT: {hotel.vat}</p>}
      </div>

      {/* Date */}
      <div className="mb-5">
        <p className="text-sm text-gray-700">{formattedDate}</p>
      </div>

      {/* Addressee */}
      <div className="mb-5">
        {councilReference && <p className="text-sm text-gray-600 mb-2">Ref: {councilReference}</p>}
        <p className="text-sm font-semibold text-gray-900">{councilName || 'Council Name'}</p>
        <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{councilAddress}</p>
      </div>

      {/* Subject */}
      <div className="mb-5">
        <p className="text-sm font-bold text-gray-900 underline">
          RE: Confirmation of Residence — {guestName || '[Guest Name]'}
        </p>
      </div>

      {/* Salutation */}
      <div className="mb-4">
        <p className="text-sm text-gray-700">
          Dear {officerTitle || 'Sir/Madam'}{officerName ? `, ${officerName}` : ''},
        </p>
      </div>

      {/* Body */}
      <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
        <p>
          We write in response to your enquiry regarding the above-named individual. We can confirm
          that <strong>{guestName || '[Guest Name]'}</strong> has been residing at our premises,
          <strong> {hotel.hotel}</strong>, {hotel.address && <span>located at {hotel.address}. </span>}
          The accommodation is provided on a <strong>{tenancyType || 'short-term booking basis'}</strong>.
        </p>

        <p>
          The above-named individual has been accommodated with us for a period spanning from{' '}
          <strong>{stayPeriodStart || '[Start Date]'}</strong> to{' '}
          <strong>{stayPeriodEnd || '[End Date]'}</strong>, during which time there{' '}
          {bookingCount === 1 ? 'has been 1 booking' : `have been ${bookingCount} bookings`}{' '}
          registered under their name. A full payment receipt is enclosed with this letter
          {hasOutstanding && (
            <span>, showing an outstanding balance of <strong>{effectiveOutstanding}</strong></span>
          )}.
        </p>

        {/* Payment summary grouped by stay period */}
        {paymentSummary && paymentSummary.length > 0 && (
          <div className="my-4">
            <p className="font-semibold text-gray-900 mb-2">Payment Details</p>
            <p className="mb-3">The following payments were made during the above period:</p>
            <div className="space-y-3">
              {paymentSummary.map((grp, gi) => (
                <div key={gi}>
                  <p className="font-medium text-gray-800 underline">{grp.period}</p>
                  <ul className="mt-1 space-y-0.5 pl-4">
                    {grp.entries.map((e, ei) => (
                      <li key={ei} className={e.unpaid ? 'text-red-600' : 'text-gray-700'}>
                        &bull; {e.text}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outstanding balance details */}
        {unpaidInfo && unpaidInfo.unpaidBookings.length > 0 && (
          <div className="my-4">
            <p className="font-semibold text-gray-900 mb-2">Outstanding Balance Details</p>
            <p className="mb-3">
              The following {unpaidInfo.unpaidBookings.length} booking{unpaidInfo.unpaidBookings.length !== 1 ? 's' : ''} remain
              unpaid, with a total outstanding balance of <strong>{formatCurrency(unpaidInfo.unpaidGrandTotal)}</strong>:
            </p>
            <table className="w-full text-xs border border-gray-200">
              <thead className="bg-gray-50">
                <tr className="text-gray-600 text-[10px] uppercase tracking-wider">
                  <th className="px-2 py-1.5 text-left font-semibold">Booking Ref</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Check-in</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Check-out</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Room</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {unpaidInfo.unpaidBookings.map((b) => (
                  <tr key={b.bookingNumber}>
                    <td className="px-2 py-2 font-medium text-gray-800">{b.bookingNumber}</td>
                    <td className="px-2 py-2 text-gray-600">{formatDate(b.checkIn || b.date)}</td>
                    <td className="px-2 py-2 text-gray-600">{formatDate(b.checkOut)}</td>
                    <td className="px-2 py-2 text-gray-600">{b.flat}</td>
                    <td className="px-2 py-2 text-right font-semibold text-red-600">{formatCurrency(parseFloat(b.totalAmount) || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Vacate notice */}
        {vacateNoticeDate && (
          <p>
            We confirm that the occupier was notified to vacate the premises on{' '}
            <strong>{vacateNoticeDate}</strong>
            {vacateNoticeMethod && <span>, via {vacateNoticeMethod}</span>}. The contractual
            provision for requiring immediate vacancy is outlined in our standard terms and
            conditions of occupancy, a copy of which is enclosed.
          </p>
        )}

        {/* Anti-social behaviour */}
        {antiSocialBehaviour && (
          <p>
            Regarding incidents of anti-social, threatening, or aggressive behaviour, we confirm
            that {antiSocialBehaviour}.
          </p>
        )}

        {/* Custom notes */}
        {customNotes && <p>{customNotes}</p>}

        <p>
          Should you require any further information or clarification, please do not hesitate to
          contact us at {hotel.email || hotel.phone}.
        </p>

        <p className="mt-8">Yours faithfully,</p>

        <div className="mt-10">
          <p className="text-sm text-gray-400">_____________________________</p>
          <p className="text-sm font-semibold text-gray-900 mt-1.5">Finance team</p>
          <p className="text-sm text-gray-600">{hotel.hotel}</p>
        </div>
      </div>

      {/* Enclosures */}
      {enclosures.length > 0 && (
        <div className="mt-12 pt-5 border-t border-gray-200">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Enclosures</p>
          <ul className="space-y-1">
            {enclosures.map((item, i) => (
              <li key={i} className="text-xs text-gray-500 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-gray-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
