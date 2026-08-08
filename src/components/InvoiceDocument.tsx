import type { Booking, HotelDetails } from '@/lib/types';
import { formatCurrency, formatDate, calcTotals, calcUnpaidTotals, getPaymentMethod, isPaid } from '@/lib/sheets';

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
  const { unpaidBookings, unpaidGrandTotal } = calcUnpaidTotals(bookings);
  const paidAmount = grandTotal - unpaidGrandTotal;
  const invNo = invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const hasVat = hotel.vat && hotel.vat.trim() !== '' && hotel.vat.trim().toLowerCase() !== 'not applicable';
  const netAmount = grandTotal / 1.2;
  const vatAmount = grandTotal - netAmount;
  const grossAmount = grandTotal;

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
            const net = gross / 1.2;
            const tax = gross - net;
            return (
              <tr key={b.bookingNumber} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                <td className="px-3 py-2.5 font-medium text-gray-800">{b.bookingNumber}</td>
                <td className="px-3 py-2.5 text-gray-600">{formatDate(b.checkIn || b.date)}</td>
                <td className="px-3 py-2.5 text-gray-600">{formatDate(b.checkOut)}</td>
                <td className="px-3 py-2.5 text-gray-600">{b.flat}</td>
                <td className="px-3 py-2.5 text-right text-gray-600">{b.nights}</td>
                <td className="px-3 py-2.5 text-right text-gray-600">{formatCurrency(b.roomRate)}</td>
                <td className="px-3 py-2.5 text-left">
                  {isPaid(b) ? (
                    <span className="text-gray-600">{getPaymentMethod(b)}</span>
                  ) : (
                    <span className="text-red-500 font-semibold">Unpaid</span>
                  )}
                </td>
                {hasVat ? (
                  <>
                    <td className="px-3 py-2.5 text-right text-gray-600">{formatCurrency(net)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">20%</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{formatCurrency(tax)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-gray-800">{formatCurrency(gross)}</td>
                  </>
                ) : (
                  <td className="px-3 py-2.5 text-right font-semibold text-gray-800">{formatCurrency(gross)}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-10">
        <div className="w-72 space-y-1.5">
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
          {hasVat ? (
            <>
              <div className="flex justify-between text-xs text-gray-600 py-1">
                <span>Net Amount</span>
                <span className="font-medium">{formatCurrency(netAmount)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600 py-1">
                <span>VAT (20%)</span>
                <span className="font-medium">{formatCurrency(vatAmount)}</span>
              </div>
              {paidAmount > 0 && (
                <div className="flex justify-between text-xs text-gray-600 py-1">
                  <span>Amount Paid</span>
                  <span className="font-medium text-green-600">{formatCurrency(paidAmount)}</span>
                </div>
              )}
              {unpaidGrandTotal > 0 ? (
                <div className="flex justify-between text-base font-bold text-red-600 pt-2 border-t-2 border-gray-900 mt-1">
                  <span>Outstanding Balance Due</span>
                  <span>{formatCurrency(unpaidGrandTotal)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t-2 border-gray-900 mt-1">
                  <span>Gross Total Due</span>
                  <span>{formatCurrency(grossAmount)}</span>
                </div>
              )}
            </>
          ) : (
            <>
              {paidAmount > 0 && (
                <div className="flex justify-between text-xs text-gray-600 py-1">
                  <span>Amount Paid</span>
                  <span className="font-medium text-green-600">{formatCurrency(paidAmount)}</span>
                </div>
              )}
              {unpaidGrandTotal > 0 ? (
                <div className="flex justify-between text-base font-bold text-red-600 pt-2 border-t-2 border-gray-900 mt-1">
                  <span>Outstanding Balance Due</span>
                  <span>{formatCurrency(unpaidGrandTotal)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t-2 border-gray-900 mt-1">
                  <span>Total Due</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Outstanding booking details */}
      {unpaidBookings.length > 0 && (
        <div className="mb-10">
          <div className="rounded-lg border border-red-200 bg-red-50/50 p-4">
            <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-3">
              Outstanding Bookings ({unpaidBookings.length})
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-red-600 text-[10px] uppercase tracking-wider">
                  <th className="px-2 py-1.5 text-left font-semibold">Booking Ref</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Check-in</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Check-out</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Room</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {unpaidBookings.map((b, i) => (
                  <tr key={b.bookingNumber} className={i % 2 === 1 ? 'bg-white/50' : ''}>
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
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-5 border-t border-gray-200">
        {hotel.vatMessage && <p className="text-[10px] text-gray-400 mb-1.5">{hotel.vatMessage}</p>}
        {hotel.invoiceFooter && <p className="text-[10px] text-gray-400">{hotel.invoiceFooter}</p>}
      </div>
    </div>
  );
}
