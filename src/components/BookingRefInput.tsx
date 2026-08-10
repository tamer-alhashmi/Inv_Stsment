import { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { Search, Hash, AlertCircle, CheckCircle2, X } from 'lucide-react';
import type { Booking } from '@/lib/types';

export function BookingRefInput({
  selectedRefs,
  onSelectBookings,
}: {
  selectedRefs: Set<string>;
  onSelectBookings: (bookings: Booking[]) => void;
}) {
  const { bookings } = useData();
  const [inputText, setInputText] = useState('');
  const [search, setSearch] = useState('');

  // Build a lookup map: lowercase ref -> booking
  const bookingMap = useMemo(() => {
    const map = new Map<string, Booking>();
    bookings.forEach((b) => {
      const key = b.bookingNumber.trim().toLowerCase();
      if (key) map.set(key, b);
    });
    return map;
  }, [bookings]);

  // Parse refs from the textarea — supports comma, newline, space separated
  const parsedRefs = useMemo(() => {
    if (!inputText.trim()) return [];
    return inputText
      .split(/[\s,;]+/)
      .map((r) => r.trim())
      .filter(Boolean);
  }, [inputText]);

  const matchedBookings = useMemo(() => {
    const found: Booking[] = [];
    const seen = new Set<string>();
    parsedRefs.forEach((ref) => {
      const key = ref.toLowerCase();
      const booking = bookingMap.get(key);
      if (booking && !seen.has(key)) {
        found.push(booking);
        seen.add(key);
      }
    });
    return found;
  }, [parsedRefs, bookingMap]);

  const unmatchedRefs = useMemo(() => {
    const matched = new Set(matchedBookings.map((b) => b.bookingNumber.toLowerCase()));
    return parsedRefs.filter((r) => !matched.has(r.toLowerCase()));
  }, [parsedRefs, matchedBookings]);

  const guestNames = useMemo(() => {
    const names = new Set(matchedBookings.map((b) => b.name.trim()));
    return Array.from(names);
  }, [matchedBookings]);

  const hasMultipleGuests = guestNames.length > 1;

  // Filter matched bookings by search
  const displayedBookings = useMemo(() => {
    if (!search.trim()) return matchedBookings;
    const q = search.toLowerCase();
    return matchedBookings.filter(
      (b) =>
        b.bookingNumber.toLowerCase().includes(q) ||
        (b.guestCount || '').toLowerCase().includes(q) ||
        b.flat.toLowerCase().includes(q)
    );
  }, [matchedBookings, search]);

  const handleLoadBookings = () => {
    if (hasMultipleGuests) return;
    onSelectBookings(matchedBookings);
  };

  const handleClear = () => {
    setInputText('');
    onSelectBookings([]);
  };

  return (
    <div className="space-y-5">
      {/* Input */}
      <div>
        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          Booking References
        </label>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste booking references here — separated by commas, spaces, or new lines&#10;e.g.&#10;BK-001, BK-002, BK-003&#10;or one per line"
          rows={6}
          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
        />
        <p className="text-[11px] text-gray-400 mt-1.5">
          Paste any number of booking references (even 50+). They'll be matched against the sheet data.
        </p>
      </div>

      {/* Match status */}
      {inputText.trim() && (
        <div className="flex items-center gap-2 flex-wrap">
          {matchedBookings.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
              <CheckCircle2 size={12} />
              {matchedBookings.length} matched
            </span>
          )}
          {unmatchedRefs.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
              <AlertCircle size={12} />
              {unmatchedRefs.length} not found
            </span>
          )}
          {matchedBookings.length > 0 && (
            <button
              onClick={handleLoadBookings}
              disabled={hasMultipleGuests}
              className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                hasMultipleGuests
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Hash size={12} />
              Load {matchedBookings.length} bookings
            </button>
          )}
          <button
            onClick={handleClear}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <X size={12} />
            Clear
          </button>
        </div>
      )}

      {/* Multiple guests error */}
      {hasMultipleGuests && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2">
          <AlertCircle size={14} className="text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700">
              All references must be for the same guest name (capital letters or small letters — no problem).
            </p>
            <p className="text-xs text-red-500 mt-1">
              Found {guestNames.length} different guests: {guestNames.join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Unmatched refs list */}
      {unmatchedRefs.length > 0 && (
        <div className="rounded-lg border border-red-100 bg-red-50/50 p-3">
          <p className="text-[11px] font-semibold text-red-600 uppercase tracking-wider mb-1.5">
            Not found in sheet
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unmatchedRefs.slice(0, 20).map((ref) => (
              <span key={ref} className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-600 font-mono">
                {ref}
              </span>
            ))}
            {unmatchedRefs.length > 20 && (
              <span className="px-2 py-0.5 text-xs text-red-400">
                +{unmatchedRefs.length - 20} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Matched bookings preview */}
      {matchedBookings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Matched Bookings ({matchedBookings.length})
            </label>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter…"
                className="pl-7 pr-2.5 py-1 rounded-lg border border-gray-200 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-40"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white divide-y divide-gray-50">
            {displayedBookings.map((b) => (
              <div
                key={b.bookingNumber}
                className={`flex items-center justify-between px-3 py-2.5 text-sm ${
                  selectedRefs.has(b.bookingNumber) ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono font-medium text-gray-800 shrink-0">{b.bookingNumber}</span>
                  <span className="text-gray-500 truncate">{b.name}{b.guestCount ? ` (${b.guestCount})` : ''}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0 ml-2">
                  <span>{b.checkIn || b.date}</span>
                  <span className="text-gray-300">→</span>
                  <span>{b.checkOut}</span>
                  <span className="text-gray-600 font-medium">{b.totalAmount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
