import { useState, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { GuestSelector, getGuestBookings, getHotelDetails } from '@/components/GuestSelector';
import { BookingRefInput } from '@/components/BookingRefInput';
import { InvoiceDocument } from '@/components/InvoiceDocument';
import { StatementDocument } from '@/components/StatementDocument';
import { CouncilLetterDocument } from '@/components/CouncilLetterDocument';
import { EmailModal } from '@/components/EmailModal';
import { downloadElementAsPdf } from '@/lib/pdf';
import { saveCouncilLetter, logDocument, getCouncilLetter } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import { Download, Layers, CheckCircle2, Loader2, FileText, Mail, Receipt, User, Hash, ChevronUp, ChevronDown, Send } from 'lucide-react';
import type { CouncilLetter, Booking, RestoreState } from '@/lib/types';

type DocChoice = 'invoice' | 'statement';
type Mode = 'guest' | 'refs';

const ENCLOSURE_OPTIONS = [
  'Payment receipt',
  'Terms and conditions of occupancy',
  'Booking correspondence',
  'Anti-social behaviour records',
  'Vacate notice',
  'Arrears correspondence',
];

export function CombinedPage({ restore, onRestored }: { restore?: RestoreState | null; onRestored?: () => void }) {
  const { bookings, hotels } = useData();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('guest');
  const [selectedGuest, setSelectedGuest] = useState('');
  const [selectedHotel, setSelectedHotel] = useState('');
  const [selectedRefs, setSelectedRefs] = useState<Set<string>>(new Set());
  const [refBookings, setRefBookings] = useState<Booking[]>([]);
  const [docChoice, setDocChoice] = useState<DocChoice>('invoice');

  // Council fields
  const [councilName, setCouncilName] = useState('');
  const [councilAddress, setCouncilAddress] = useState('');
  const [councilReference, setCouncilReference] = useState('');
  const [officerName, setOfficerName] = useState('');
  const [officerTitle, setOfficerTitle] = useState('');
  const [letterDate, setLetterDate] = useState(new Date().toISOString().slice(0, 10));
  const [customNotes, setCustomNotes] = useState('');
  const [enclosedItems, setEnclosedItems] = useState<string[]>(['Payment receipt']);
  const [tenancyType, setTenancyType] = useState('');
  const [vacateNoticeDate, setVacateNoticeDate] = useState('');
  const [vacateNoticeMethod, setVacateNoticeMethod] = useState('');
  const [antiSocialBehaviour, setAntiSocialBehaviour] = useState('');
  const [outstandingBalance, setOutstandingBalance] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [downloading, setDownloading] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    if (!restore) return;
    setMode('guest');
    setSelectedGuest(restore.guestName);
    setSelectedHotel(restore.hotelName);
    setSelectedRefs(new Set(restore.bookingRefs));
    if (restore.councilLetterId) {
      getCouncilLetter(restore.councilLetterId).then(savedLetter => {
        if (savedLetter) {
          setCouncilName(savedLetter.councilName);
          setCouncilAddress(savedLetter.councilAddress);
          setCouncilReference(savedLetter.councilReference);
          setOfficerName(savedLetter.officerName);
          setOfficerTitle(savedLetter.officerTitle);
          setLetterDate(savedLetter.letterDate);
          setCustomNotes(savedLetter.customNotes);
        }
      });
    }
    onRestored?.();
  }, [restore]);

  const guestBookings = mode === 'guest' && selectedGuest
    ? getGuestBookings(bookings, selectedGuest, selectedHotel)
    : mode === 'refs' ? refBookings : [];
  const hotelDetails = getHotelDetails(hotels, selectedHotel, guestBookings[0]?.hotelName || '');
  const selectedBookings = guestBookings.filter(b => selectedRefs.has(b.bookingNumber));

  const sortedBookings = [...selectedBookings].sort((a, b) => {
    const da = new Date(a.checkIn || a.date || 0).getTime();
    const db = new Date(b.checkIn || b.date || 0).getTime();
    return da - db;
  });
  const stayPeriodStart = sortedBookings[0] ? sortedBookings[0].checkIn || sortedBookings[0].date : '';
  const stayPeriodEnd = sortedBookings[sortedBookings.length - 1] ? sortedBookings[sortedBookings.length - 1].checkOut : '';

  const toggleRef = (ref: string) => {
    const next = new Set(selectedRefs);
    if (next.has(ref)) next.delete(ref); else next.add(ref);
    setSelectedRefs(next);
  };
  const selectAll = () => setSelectedRefs(new Set(guestBookings.map(b => b.bookingNumber)));
  const clearAll = () => setSelectedRefs(new Set());

  const toggleEnclosure = (item: string) => {
    setEnclosedItems(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const handleDownload = async () => {
    if (selectedBookings.length === 0) return;
    setDownloading(true); setDone([]);
    const completed: string[] = [];
    const refs = selectedBookings.map(b => b.bookingNumber);

    try {
      const docId = docChoice === 'invoice' ? 'invoice-doc' : 'statement-doc';
      const docLabel = docChoice === 'invoice' ? 'Invoice' : 'Receipt';
      const guestName = selectedGuest || selectedBookings[0]?.name || 'Guest';
      await downloadElementAsPdf(docId, `${docLabel}-${guestName.replace(/\s+/g, '_')}.pdf`);
      completed.push(docLabel);

      await downloadElementAsPdf('council-doc', `CouncilLetter-${guestName.replace(/\s+/g, '_')}.pdf`);
      completed.push('Council Letter');

      const letterData: CouncilLetter = {
        councilName, councilAddress, councilReference,
        officerName, officerTitle, letterDate,
        guestName: guestName, hotelName: hotelDetails.hotel,
        customNotes, bookingReferences: refs,
      };
      const councilId = await saveCouncilLetter(letterData);
      await logDocument('combined', guestName, hotelDetails.hotel, refs, councilId || undefined, user?.email);

      setDone(completed);
      setTimeout(() => setDone([]), 4000);
    } catch (e) { console.error(e); }
    finally { setDownloading(false); }
  };

  const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500';
  const labelCls = 'block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5';

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl max-w-md">
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

      {/* Top: Guest + Booking selection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-5">
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
                      <th className="px-3 py-2.5 text-left">Date</th>
                      <th className="px-3 py-2.5 text-left">Check-out</th>
                      <th className="px-3 py-2.5 text-left">Room</th>
                      <th className="px-3 py-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {guestBookings.map(b => {
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

        {/* Council form */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Mail size={15} className="text-gray-400" /> Council Letter Details
            </h3>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>Council Name</label>
                <input type="text" value={councilName} onChange={e => setCouncilName(e.target.value)}
                  placeholder="e.g. Birmingham City Council" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Council Reference</label>
                <input type="text" value={councilReference} onChange={e => setCouncilReference(e.target.value)}
                  placeholder="e.g. REF-12345" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Council Address</label>
                <textarea value={councilAddress} onChange={e => setCouncilAddress(e.target.value)}
                  placeholder="Full council address" rows={2} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Officer Name</label>
                  <input type="text" value={officerName} onChange={e => setOfficerName(e.target.value)}
                    placeholder="John Smith" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Officer Title</label>
                  <input type="text" value={officerTitle} onChange={e => setOfficerTitle(e.target.value)}
                    placeholder="Housing Officer" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Letter Date</label>
                  <input type="date" value={letterDate} onChange={e => setLetterDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Tenancy Type</label>
                  <input type="text" value={tenancyType} onChange={e => setTenancyType(e.target.value)}
                    placeholder="short-term booking" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Enclosures</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ENCLOSURE_OPTIONS.map(item => (
                    <label key={item} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={enclosedItems.includes(item)} onChange={() => toggleEnclosure(item)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-xs text-gray-700">{item}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700">
                  {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  Additional council requirements
                </button>
                {showAdvanced && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <label className={labelCls}>Vacate Notice Date</label>
                      <input type="text" value={vacateNoticeDate} onChange={e => setVacateNoticeDate(e.target.value)}
                        placeholder="e.g. 15 Jan 2025" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Notice Method</label>
                      <input type="text" value={vacateNoticeMethod} onChange={e => setVacateNoticeMethod(e.target.value)}
                        placeholder="e.g. written letter, email" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Outstanding Balance</label>
                      <input type="text" value={outstandingBalance} onChange={e => setOutstandingBalance(e.target.value)}
                        placeholder="e.g. £450.00" className={inputCls} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Anti-social Behaviour Incidents</label>
                      <textarea value={antiSocialBehaviour} onChange={e => setAntiSocialBehaviour(e.target.value)}
                        placeholder="Describe any incidents, or leave blank if none" rows={2} className={inputCls} />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className={labelCls}>Additional Notes</label>
                <textarea value={customNotes} onChange={e => setCustomNotes(e.target.value)}
                  placeholder="Any extra information" rows={2} className={inputCls} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Doc type + Download */}
      {selectedBookings.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Document:</span>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500">
              <input type="radio" checked={docChoice === 'invoice'} onChange={() => setDocChoice('invoice')}
                className="text-blue-600 focus:ring-blue-500" />
              <Receipt size={15} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Invoice</span>
            </label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500">
              <input type="radio" checked={docChoice === 'statement'} onChange={() => setDocChoice('statement')}
                className="text-blue-600 focus:ring-blue-500" />
              <FileText size={15} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Receipt</span>
            </label>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {done.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <CheckCircle2 size={15} /> Downloaded: {done.join(' + ')}
              </span>
            )}
            <button onClick={() => setEmailOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
              <Send size={15} /> Email
            </button>
            <button onClick={handleDownload} disabled={downloading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm">
              {downloading ? <Loader2 size={15} className="animate-spin" /> : <Layers size={15} />}
              {downloading ? 'Generating…' : `Download ${docChoice === 'invoice' ? 'Invoice' : 'Receipt'} + Council Letter`}
            </button>
          </div>
        </div>
      )}

      {/* Previews */}
      {selectedBookings.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-gray-500">
              {docChoice === 'invoice' ? <Receipt size={15} /> : <FileText size={15} />}
              <span className="text-xs font-semibold uppercase tracking-wider">{docChoice === 'invoice' ? 'Invoice' : 'Receipt'} Preview</span>
            </div>
            <div className="bg-gray-100 rounded-xl p-4 overflow-auto" style={{ maxHeight: '700px' }}>
              <div className="mx-auto shadow-lg" style={{ width: 'fit-content' }}>
                {docChoice === 'invoice' ? (
                  <InvoiceDocument bookings={selectedBookings} hotel={hotelDetails} guestName={selectedGuest || selectedBookings[0]?.name || 'Guest'} />
                ) : (
                  <StatementDocument bookings={selectedBookings} hotel={hotelDetails} guestName={selectedGuest || selectedBookings[0]?.name || 'Guest'} />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-gray-500">
              <Mail size={15} />
              <span className="text-xs font-semibold uppercase tracking-wider">Council Letter Preview</span>
            </div>
            <div className="bg-gray-100 rounded-xl p-4 overflow-auto" style={{ maxHeight: '700px' }}>
              <div className="mx-auto shadow-lg" style={{ width: 'fit-content' }}>
                <CouncilLetterDocument
                  hotel={hotelDetails}
                  guestName={selectedGuest || selectedBookings[0]?.name || 'Guest'}
                  councilName={councilName}
                  councilAddress={councilAddress}
                  councilReference={councilReference}
                  officerName={officerName}
                  officerTitle={officerTitle}
                  letterDate={letterDate}
                  bookingCount={selectedBookings.length}
                  stayPeriodStart={stayPeriodStart}
                  stayPeriodEnd={stayPeriodEnd}
                  customNotes={customNotes}
                  enclosedItems={enclosedItems}
                  tenancyType={tenancyType}
                  vacateNoticeDate={vacateNoticeDate}
                  vacateNoticeMethod={vacateNoticeMethod}
                  antiSocialBehaviour={antiSocialBehaviour}
                  outstandingBalance={outstandingBalance}
                  bookings={selectedBookings}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      <EmailModal open={emailOpen} onClose={() => setEmailOpen(false)}
        docType={docChoice === 'invoice' ? 'Invoice + Council Letter' : 'Receipt + Council Letter'}
        guestName={selectedGuest || selectedBookings[0]?.name || 'Guest'}
        hotelName={hotelDetails.hotel} />
    </div>
  );
}
