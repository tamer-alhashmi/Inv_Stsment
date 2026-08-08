import { useState, useEffect, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { getHotelDetails } from '@/components/GuestSelector';
import { CouncilLetterDocument } from '@/components/CouncilLetterDocument';
import { EmailModal } from '@/components/EmailModal';
import { downloadElementAsPdf } from '@/lib/pdf';
import { saveCouncilLetter, listCouncilLetters, deleteCouncilLetter, logDocument, getCouncilLetter } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import { Download, Save, Trash2, Mail, CheckCircle2, Loader2, FileText, ChevronDown, ChevronUp, Search, User, Building2 } from 'lucide-react';
import type { CouncilLetter, Booking, RestoreState } from '@/lib/types';

const EMPTY_LETTER: CouncilLetter = {
  councilName: '', councilAddress: '', councilReference: '',
  officerName: '', officerTitle: '',
  letterDate: new Date().toISOString().slice(0, 10),
  guestName: '', hotelName: '', customNotes: '', bookingReferences: [],
};

const ENCLOSURE_OPTIONS = [
  'Payment receipt',
  'Terms and conditions of occupancy',
  'Booking correspondence',
  'Anti-social behaviour records',
  'Vacate notice',
  'Arrears correspondence',
];

export function CouncilPage({ restore, onRestored }: { restore?: RestoreState | null; onRestored?: () => void }) {
  const { bookings, hotels } = useData();
  const { user } = useAuth();
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());
  const [selectedHotel, setSelectedHotel] = useState('');
  const [guestSearch, setGuestSearch] = useState('');
  const [letter, setLetter] = useState<CouncilLetter>(EMPTY_LETTER);
  const [enclosedItems, setEnclosedItems] = useState<string[]>(['Payment receipt']);
  const [tenancyType, setTenancyType] = useState('');
  const [vacateNoticeDate, setVacateNoticeDate] = useState('');
  const [vacateNoticeMethod, setVacateNoticeMethod] = useState('');
  const [antiSocialBehaviour, setAntiSocialBehaviour] = useState('');
  const [outstandingBalance, setOutstandingBalance] = useState('');
  const [savedLetters, setSavedLetters] = useState<CouncilLetter[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => { listCouncilLetters().then(setSavedLetters); }, []);

  useEffect(() => {
    if (!restore) return;
    if (restore.councilLetterId) {
      getCouncilLetter(restore.councilLetterId).then(savedLetter => {
        if (savedLetter) {
          setLetter(savedLetter);
          setSelectedGuests(new Set(savedLetter.guestName.split(' / ').filter(Boolean)));
          setSelectedHotel(savedLetter.hotelName);
        }
      });
    } else {
      setSelectedGuests(new Set(restore.guestName.split(' / ').filter(Boolean)));
      setSelectedHotel(restore.hotelName);
    }
    onRestored?.();
  }, [restore]);

  const guestBookings = useMemo(() => {
    if (selectedGuests.size === 0) return [];
    return bookings.filter((b) => {
      if (selectedHotel && b.hotelName !== selectedHotel) return false;
      for (const name of selectedGuests) {
        if (b.name === name) return true;
      }
      return false;
    });
  }, [bookings, selectedGuests, selectedHotel]);

  const hotelDetails = getHotelDetails(hotels, selectedHotel, guestBookings[0]?.hotelName || '');

  const sortedBookings = [...guestBookings].sort((a, b) => {
    const da = new Date(a.checkIn || a.date || 0).getTime();
    const db = new Date(b.checkIn || b.date || 0).getTime();
    return da - db;
  });
  const stayPeriodStart = sortedBookings[0] ? sortedBookings[0].checkIn || sortedBookings[0].date : '';
  const stayPeriodEnd = sortedBookings[sortedBookings.length - 1] ? sortedBookings[sortedBookings.length - 1].checkOut : '';

  const hotelNames = useMemo(() => {
    const names = new Set(bookings.map((b) => b.hotelName).filter(Boolean));
    return Array.from(names).sort();
  }, [bookings]);

  const filteredGuests = useMemo(() => {
    const guestMap = new Map<string, Booking[]>();
    bookings.forEach((b) => {
      const name = b.name;
      if (!name) return;
      if (selectedHotel && b.hotelName !== selectedHotel) return;
      if (guestSearch && !name.toLowerCase().includes(guestSearch.toLowerCase())) return;
      if (!guestMap.has(name)) guestMap.set(name, []);
      guestMap.get(name)!.push(b);
    });
    return Array.from(guestMap.entries())
      .map(([name, bks]) => ({ name, count: bks.length }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [bookings, selectedHotel, guestSearch]);

  const toggleGuest = (name: string) => {
    setSelectedGuests((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const toggleEnclosure = (item: string) => {
    setEnclosedItems(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const handleHotelSelect = (hotel: string) => {
    setSelectedHotel(hotel);
    setLetter(prev => ({ ...prev, hotelName: hotel }));
  };

  const handleSave = async () => {
    setSaving(true); setDone('');
    const id = await saveCouncilLetter({
      ...letter,
      bookingReferences: guestBookings.map(b => b.bookingNumber),
    });
    if (id) {
      setDone('saved');
      setSavedLetters(await listCouncilLetters());
      setTimeout(() => setDone(''), 3000);
    }
    setSaving(false);
  };

  const handleDownload = async () => {
    setDownloading(true); setDone('');
    try {
      const guestNameStr = Array.from(selectedGuests).join(' / ');
      await downloadElementAsPdf('council-doc', `CouncilLetter-${guestNameStr.replace(/\s+/g, '_')}.pdf`);
      const refs = guestBookings.map(b => b.bookingNumber);
      const councilId = await saveCouncilLetter({ ...letter, guestName: guestNameStr, bookingReferences: refs });
      await logDocument('council_letter', guestNameStr, letter.hotelName || hotelDetails.hotel, refs, councilId || undefined, user?.email);
      setDone('downloaded');
      setSavedLetters(await listCouncilLetters());
      setTimeout(() => setDone(''), 3000);
    } catch (e) { console.error(e); }
    finally { setDownloading(false); }
  };

  const handleDelete = async (id: string) => {
    await deleteCouncilLetter(id);
    setSavedLetters(await listCouncilLetters());
  };

  const loadSavedLetter = (l: CouncilLetter) => {
    setLetter(l);
    setSelectedGuests(new Set(l.guestName.split(' / ').filter(Boolean)));
    setSelectedHotel(l.hotelName);
    setShowSaved(false);
  };

  const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500';
  const labelCls = 'block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Form */}
      <div className="lg:col-span-7 space-y-5">
        {/* Saved letters */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <button onClick={() => setShowSaved(!showSaved)} className="w-full flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">Saved Letters</span>
              <span className="text-xs text-gray-400">({savedLetters.length})</span>
            </div>
            {showSaved ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </button>
          {showSaved && (
            <div className="px-6 pb-4 max-h-56 overflow-y-auto divide-y divide-gray-50">
              {savedLetters.length === 0 ? (
                <p className="py-4 text-sm text-gray-400 text-center">No saved letters yet</p>
              ) : savedLetters.map(l => (
                <div key={l.id} className="flex items-center justify-between py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{l.guestName || 'Unknown guest'}</p>
                    <p className="text-xs text-gray-400">{l.councilName} · {l.letterDate}</p>
                  </div>
                  <div className="flex gap-2 ml-3">
                    <button onClick={() => loadSavedLetter(l)} className="text-xs font-medium text-blue-600 hover:text-blue-700">Load</button>
                    <button onClick={() => handleDelete(l.id!)} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Guest selector — multi-select */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Hotel</label>
              <div className="relative">
                <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select
                  value={selectedHotel}
                  onChange={(e) => { handleHotelSelect(e.target.value); setSelectedGuests(new Set()); }}
                  className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
                >
                  <option value="">All Hotels</option>
                  {hotelNames.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Search Guest</label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  placeholder="Type guest name…"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Select Guest(s)</label>
              {selectedGuests.size > 0 && (
                <button onClick={() => setSelectedGuests(new Set())} className="text-xs font-medium text-gray-500 hover:text-gray-700">Clear selection</button>
              )}
            </div>
            <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white divide-y divide-gray-50">
              {filteredGuests.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <User size={24} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">No guests found</p>
                </div>
              ) : (
                filteredGuests.map((g) => {
                  const active = selectedGuests.has(g.name);
                  return (
                    <button
                      key={g.name}
                      onClick={() => toggleGuest(g.name)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                        active ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <input type="checkbox" checked={active} readOnly className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none" />
                        {g.name}
                      </span>
                      <span className={`text-xs ml-2 shrink-0 ${active ? 'text-blue-500' : 'text-gray-400'}`}>
                        {g.count} {g.count === 1 ? 'booking' : 'bookings'}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            {selectedGuests.size > 0 && (
              <p className="text-[11px] text-gray-400 mt-1.5">
                {selectedGuests.size} guest{selectedGuests.size !== 1 ? 's' : ''} selected — bookings from all selected guests will be included
              </p>
            )}
          </div>
        </div>

        {/* Council form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Mail size={15} className="text-gray-400" /> Council Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Council Name</label>
              <input type="text" value={letter.councilName} onChange={e => setLetter({ ...letter, councilName: e.target.value })}
                placeholder="e.g. Birmingham City Council" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Council Reference</label>
              <input type="text" value={letter.councilReference} onChange={e => setLetter({ ...letter, councilReference: e.target.value })}
                placeholder="e.g. REF-12345" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Council Address</label>
              <textarea value={letter.councilAddress} onChange={e => setLetter({ ...letter, councilAddress: e.target.value })}
                placeholder="Full council address" rows={2} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Officer Name</label>
              <input type="text" value={letter.officerName} onChange={e => setLetter({ ...letter, officerName: e.target.value })}
                placeholder="e.g. John Smith" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Officer Title</label>
              <input type="text" value={letter.officerTitle} onChange={e => setLetter({ ...letter, officerTitle: e.target.value })}
                placeholder="e.g. Housing Officer" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Letter Date</label>
              <input type="date" value={letter.letterDate} onChange={e => setLetter({ ...letter, letterDate: e.target.value })}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Tenancy Type</label>
              <input type="text" value={tenancyType} onChange={e => setTenancyType(e.target.value)}
                placeholder="e.g. short-term booking" className={inputCls} />
            </div>
          </div>

          {/* Enclosures */}
          <div>
            <label className={labelCls}>Enclosures (attached with this letter)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ENCLOSURE_OPTIONS.map(item => (
                <label key={item} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={enclosedItems.includes(item)} onChange={() => toggleEnclosure(item)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">{item}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Advanced */}
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

          {/* Custom notes */}
          <div>
            <label className={labelCls}>Additional Notes (optional)</label>
            <textarea value={letter.customNotes} onChange={e => setLetter({ ...letter, customNotes: e.target.value })}
              placeholder="Any extra information to include in the letter body" rows={3} className={inputCls} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleDownload} disabled={downloading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm">
              {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              {downloading ? 'Generating…' : 'Download PDF'}
            </button>
            <button onClick={() => setEmailOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
              <Mail size={15} /> Email
            </button>
            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            {done === 'downloaded' && <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium"><CheckCircle2 size={15} /> Downloaded & saved</span>}
            {done === 'saved' && <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium"><CheckCircle2 size={15} /> Saved</span>}
          </div>
        </div>
      </div>

      {/* Right: Preview */}
      <div className="lg:col-span-5">
        <div className="sticky top-0 space-y-3">
          <div className="flex items-center gap-2 text-gray-500">
            <Mail size={15} />
            <span className="text-xs font-semibold uppercase tracking-wider">Live Preview</span>
          </div>

          <div className="bg-gray-100 rounded-xl p-4 overflow-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
            <div className="mx-auto shadow-lg" style={{ width: 'fit-content' }}>
              <CouncilLetterDocument
                hotel={hotelDetails}
                guestName={letter.guestName || Array.from(selectedGuests).join(' / ') || 'Guest'}
                councilName={letter.councilName}
                councilAddress={letter.councilAddress}
                councilReference={letter.councilReference}
                officerName={letter.officerName}
                officerTitle={letter.officerTitle}
                letterDate={letter.letterDate}
                bookingCount={guestBookings.length}
                stayPeriodStart={stayPeriodStart}
                stayPeriodEnd={stayPeriodEnd}
                customNotes={letter.customNotes}
                enclosedItems={enclosedItems}
                tenancyType={tenancyType}
                vacateNoticeDate={vacateNoticeDate}
                vacateNoticeMethod={vacateNoticeMethod}
                antiSocialBehaviour={antiSocialBehaviour}
                outstandingBalance={outstandingBalance}
                bookings={guestBookings}
              />
            </div>
          </div>
        </div>
      </div>
      <EmailModal open={emailOpen} onClose={() => setEmailOpen(false)}
        docType="Council Letter" guestName={letter.guestName || Array.from(selectedGuests).join(' / ') || 'Guest'}
        hotelName={hotelDetails.hotel} />
    </div>
  );
}
