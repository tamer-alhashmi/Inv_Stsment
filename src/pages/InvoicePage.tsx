import { useState, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { GuestSelector, getGuestBookings, getHotelDetails } from '@/components/GuestSelector';
import { BookingRefInput } from '@/components/BookingRefInput';
import { InvoiceDocument } from '@/components/InvoiceDocument';
import { downloadElementAsPdf } from '@/lib/pdf';
import { logDocument } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import { Download, CheckCircle2, Loader2, FileText, Receipt, User, Hash, Mail } from 'lucide-react';
import type { Booking, RestoreState } from '@/lib/types';
import { EmailModal } from '@/components/EmailModal';

type Mode = 'guest' | 'refs';

export function InvoicePage({ restore, onRestored }: { restore?: RestoreState | null; onRestored?: () => void }) {
  const { bookings, hotels } = useData();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('guest');
  const [selectedGuest, setSelectedGuest] = useState('');
  const [selectedHotel, setSelectedHotel] = useState('');
  const [selectedRefs, setSelectedRefs] = useState<Set<string>>(new Set());
  const [refBookings, setRefBookings] = useState<Booking[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  useEffect(() => {
    if (!restore) return;
    setMode('guest');
    setSelectedGuest(restore.guestName);
    setSelectedHotel(restore.hotelName);
    setSelectedRefs(new Set(restore.bookingRefs));
    onRestored?.();
  }, [restore]);

  const guestBookings = mode === 'guest' && selectedGuest
    ? getGuestBookings(bookings, selectedGuest, selectedHotel)
    : mode === 'refs' ? refBookings : [];

  const hotelDetails = getHotelDetails(hotels, selectedHotel, guestBookings[0]?.hotelName || '');
  const selectedBookings = guestBookings.filter((b) => selectedRefs.has(b.bookingNumber));

  const toggleRef = (ref: string) => {
    const next = new Set(selectedRefs);
    if (next.has(ref)) next.delete(ref); else next.add(ref);
    setSelectedRefs(next);
  };
  const selectAll = () => setSelectedRefs(new Set(guestBookings.map((b) => b.bookingNumber)));
  const clearAll = () => setSelectedRefs(new Set());

  const handleDownload = async () => {
    if (selectedBookings.length === 0) return;
    setDownloading(true);
    setDone(false);
    try {
      await downloadElementAsPdf('invoice-doc', `Invoice-${(selectedGuest || 'guest').replace(/\s+/g, '_')}.pdf`);
      await logDocument('invoice', selectedGuest || selectedBookings[0]?.name || 'Guest', hotelDetails.hotel, Array.from(selectedRefs), undefined, user?.email);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Controls */}
      <div className="lg:col-span-7 space-y-5">
        {/* Mode toggle */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
          <button
            onClick={() => { setMode('guest'); setSelectedRefs(new Set()); setRefBookings([]); }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              mode === 'guest' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <User size={15} /> Guest Search
          </button>
          <button
            onClick={() => { setMode('refs'); setSelectedRefs(new Set()); setSelectedGuest(''); }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              mode === 'refs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Hash size={15} /> Booking Refs
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          {mode === 'guest' ? (
            <GuestSelector
              selectedGuest={selectedGuest}
              onSelectGuest={(name) => { setSelectedGuest(name); setSelectedRefs(new Set()); }}
              selectedHotel={selectedHotel}
              onSelectHotel={setSelectedHotel}
            />
          ) : (
            <BookingRefInput
              selectedRefs={selectedRefs}
              onSelectBookings={(bks) => {
                setRefBookings(bks);
                setSelectedRefs(new Set(bks.map((b) => b.bookingNumber)));
              }}
            />
          )}
        </div>

        {guestBookings.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                {guestBookings.length} Booking{guestBookings.length !== 1 ? 's' : ''}
                {mode === 'guest' && selectedGuest && ` — ${selectedGuest}`}
              </h3>
              <div className="flex gap-3 text-xs">
                <button onClick={selectAll} className="font-medium text-blue-600 hover:text-blue-700">Select All</button>
                <span className="text-gray-300">|</span>
                <button onClick={clearAll} className="font-medium text-gray-500 hover:text-gray-700">Clear</button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-100 -mx-2">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2.5 text-left w-8"></th>
                    <th className="px-3 py-2.5 text-left">Booking Ref</th>
                    <th className="px-3 py-2.5 text-left">Guest</th>
                    <th className="px-3 py-2.5 text-left">Check-in</th>
                    <th className="px-3 py-2.5 text-left">Check-out</th>
                    <th className="px-3 py-2.5 text-left">Room</th>
                    <th className="px-3 py-2.5 text-right">Nights</th>
                    <th className="px-3 py-2.5 text-right">Rate</th>
                    <th className="px-3 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {guestBookings.map((b) => {
                    const checked = selectedRefs.has(b.bookingNumber);
                    return (
                      <tr key={b.bookingNumber} className={checked ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                        <td className="px-3 py-2.5">
                          <input type="checkbox" checked={checked} onChange={() => toggleRef(b.bookingNumber)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        </td>
                        <td className="px-3 py-2.5 font-medium text-gray-800">{b.bookingNumber}</td>
                        <td className="px-3 py-2.5 text-gray-600">{b.name}</td>
                        <td className="px-3 py-2.5 text-gray-600">{b.checkIn || b.date}</td>
                        <td className="px-3 py-2.5 text-gray-600">{b.checkOut}</td>
                        <td className="px-3 py-2.5 text-gray-600">{b.flat}</td>
                        <td className="px-3 py-2.5 text-right text-gray-600">{b.nights}</td>
                        <td className="px-3 py-2.5 text-right text-gray-600">{b.roomRate}</td>
                        <td className="px-3 py-2.5 text-right font-medium text-gray-800">{b.totalAmount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Right: Preview */}
      <div className="lg:col-span-5">
        <div className="sticky top-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-500">
              <Receipt size={15} />
              <span className="text-xs font-semibold uppercase tracking-wider">Live Preview</span>
            </div>
            {selectedBookings.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEmailOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <Mail size={15} /> Email
                </button>
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                  {downloading ? 'Generating…' : 'Download PDF'}
                </button>
              </div>
            )}
          </div>

          {done && (
            <div className="flex items-center gap-2 text-sm text-green-600 font-medium bg-green-50 px-3 py-2 rounded-lg">
              <CheckCircle2 size={15} /> Invoice downloaded successfully
            </div>
          )}

          {selectedBookings.length > 0 ? (
            <div className="bg-gray-100 rounded-xl p-4 overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              <div className="mx-auto shadow-lg" style={{ width: 'fit-content' }}>
                <InvoiceDocument
                  bookings={selectedBookings}
                  hotel={hotelDetails}
                  guestName={selectedGuest || selectedBookings[0]?.name || 'Guest'}
                />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
              <FileText size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-400 font-medium">
                {mode === 'guest' ? 'Select a guest and bookings' : 'Paste booking refs and load them'}
              </p>
              <p className="text-xs text-gray-400 mt-1">The invoice preview will appear here</p>
            </div>
          )}
        </div>
      </div>
      <EmailModal open={emailOpen} onClose={() => setEmailOpen(false)}
        docType="Invoice" guestName={selectedGuest || selectedBookings[0]?.name || 'Guest'}
        hotelName={hotelDetails.hotel} />
    </div>
  );
}
