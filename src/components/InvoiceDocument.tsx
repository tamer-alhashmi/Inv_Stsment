import type { Booking, HotelDetails } from '@/lib/types';
import { formatCurrency, formatDate, calcTotals, getPaymentMethod, calcVatBreakdown, hasHotelVat } from '@/lib/sheets';

const A4_WIDTH = 794; // px at 96dpi

export function InvoiceDocument({
  bookings,
  hotel,
  guestName,
  invoiceNumber,
}: {
  bookings: Booking[];
  hotel: HotelDetails;
  guestName: string;
  invoiceNumber?: string;
}) {
  const { roomTotal, otherTotal, grandTotal } = calcTotals(bookings);
  const invNo = invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const hasVat = hasHotelVat(hotel);
  const vatBreakdown = calcVatBreakdown(grandTotal);

  return (
    <div
      id="invoice-doc"
      className="bg-white text-gray-800"
      style={{ width: A4_WIDTH, minHeight: 1123, padding: '60px 56px', fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* Header */}
      <div className="flex justify-between items-start pb-6 mb-8 border-b-2 border-gray-900">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{hotel.hotel}</h1>
          <p className="text-xs text-gray-500 mt-2 whitespace-pre-line leading-relaxed">{hotel.address}</p>
          {hotel.email && <p className="text-xs text-gray-500 mt-1.5">{hotel.email}</p>}
          {hotel.phone && <p className="text-xs text-gray-500">{hotel.phone}</p>}
          {hotel.vat && <p className="text-xs text-gray-500 mt-1.5">VAT: {hotel.vat}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">INVOICE</h2>
          <div className="mt-3 space-y-0.5">
            <p className="text-xs text-gray-500"><span className="font-medium text-gray-700">Invoice No:</span> {invNo}</p>
            <p className="text-xs text-gray-500"><span className="font-medium text-gray-700">Date:</span> {today}</p>
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-8">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Bill To</h3>
        <p className="text-lg font-semibold text-gray-900">{guestName}</p>
        {bookings[0]?.email && <p className="text-xs text-gray-500 mt-1">{bookings[0].email}</p>}
        {bookings[0]?.phone && <p className="text-xs text-gray-500">{bookings[0].phone}</p>}
      </div>

      {/* Table */}
      <table className="w-full text-xs mb-6 border-collapse">
        <thead>
          <tr className="bg-gray-900 text-white">
            <th className="px-3 py-3 text-left font-semibold uppercase tracking-wider text-[10px]">Booking Ref</th>
            <th className="px-3 py-3 text-left font-semibold uppercase tracking-wider text-[10px]">Check-in</th>
            <th className="px-3 py-3 text-left font-semibold uppercase tracking-wider text-[10px]">Check-out</th>
            <th className="px-3 py-3 text-left font-semibold uppercase tracking-wider text-[10px]">Room</th>
            <th className="px-3 py-3 text-right font-semibold uppercase tracking-wider text-[10px]">Nights</th>
            <th className="px-3 py-3 text-right font-semibold uppercase tracking-wider text-[10px]">Rate</th>
            <th className="px-3 py-3 text-left font-semibold uppercase tracking-wider text-[10px]">Method</th>
            {hasVat ? (
              <>
                <th className="px-3 py-3 text-right font-semibold uppercase tracking-wider text-[10px]">Net</th>
                <th className="px-3 py-3 text-right font-semibold uppercase tracking-wider text-[10px]">VAT Rate</th>
                <th className="px-3 py-3 text-right font-semibold uppercase tracking-wider text-[10px]">Tax</th>
                <th className="px-3 py-3 text-right font-semibold uppercase tracking-wider text-[10px]">Gross</th>
              </>
            ) : (
              <th className="px-3 py-3 text-right font-semibold uppercase tracking-wider text-[10px]">Amount</th>
            )}
          </tr>
        </thead>
        <tbody>
          {bookings.map((b, i) => {
            const gross = parseFloat(b.totalAmount) || 0;
            const vb = calcVatBreakdown(gross);
            return (
              <tr key={b.bookingNumber} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                <td className="px-3 py-2.5 font-medium text-gray-800">{b.bookingNumber}</td>
                <td className="px-3 py-2.5 text-gray-600">{formatDate(b.checkIn || b.date)}</td>
                <td className="px-3 py-2.5 text-gray-600">{formatDate(b.checkOut)}</td>
                <td className="px-3 py-2.5 text-gray-600">{b.flat}</td>
                <td className="px-3 py-2.5 text-right text-gray-600">{b.nights}</td>
                <td className="px-3 py-2.5 text-right text-gray-600">{formatCurrency(b.roomRate)}</td>
                <td className="px-3 py-2.5 text-left text-gray-600">{getPaymentMethod(b)}</td>
                {hasVat ? (
                  <>
                    <td className="px-3 py-2.5 text-right text-gray-600">{formatCurrency(vb.net)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{vb.rate.toFixed(2)}%</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{formatCurrency(vb.tax)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-gray-800">{formatCurrency(vb.gross)}</td>
                  </>
                ) : (
                  <td className="px-3 py-2.5 text-right font-semibold text-gray-800">{formatCurrency(gross)}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals + Tax Summary */}
      <div className="flex justify-between mb-10 gap-8">
        {/* Tax Summary (only when VAT) */}
        {hasVat && (
          <div className="mt-1">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Tax Summary</h4>
            <div className="rounded-lg border border-gray-200 p-4 w-64 space-y-1.5">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Net</span>
                <span className="font-medium tabular-nums">{formatCurrency(vatBreakdown.net)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>Rate</span>
                <span className="font-medium tabular-nums">{vatBreakdown.rate.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>Tax</span>
                <span className="font-medium tabular-nums">{formatCurrency(vatBreakdown.tax)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600 pt-1.5 border-t border-gray-100">
                <span>Gross</span>
                <span className="font-semibold tabular-nums">{formatCurrency(vatBreakdown.gross)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="w-72 space-y-1.5 ml-auto">
          <div className="flex justify-between text-xs text-gray-600 py-1">
            <span>Room Total</span>
            <span className="font-medium">{formatCurrency(roomTotal)}</span>
          </div>
          {otherTotal > 0 && (
            <div className="flex justify-between text-xs text-gray-600 py-1">
              <span>Other Revenue</span>
              <span className="font-medium">{formatCurrency(otherTotal)}</span>
            </div>
          )}
          {hasVat && (
            <>
              <div className="flex justify-between text-xs text-gray-600 py-1">
                <span>Net Amount</span>
                <span className="font-medium">{formatCurrency(vatBreakdown.net)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600 py-1">
                <span>VAT ({vatBreakdown.rate.toFixed(2)}%)</span>
                <span className="font-medium">{formatCurrency(vatBreakdown.tax)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t-2 border-gray-900 mt-1">
            <span>Total Paid</span>
            <span>{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-5 border-t border-gray-200">
        {hotel.vatMessage && <p className="text-[10px] text-gray-400 mb-1.5">{hotel.vatMessage}</p>}
        {hotel.invoiceFooter && <p className="text-[10px] text-gray-400">{hotel.invoiceFooter}</p>}
      </div>
    </div>
  );
}
