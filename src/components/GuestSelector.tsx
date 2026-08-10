import { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { Search, User, Building2, ChevronDown } from 'lucide-react';
import type { Booking } from '@/lib/types';

export function GuestSelector({
  selectedGuest,
  onSelectGuest,
  selectedHotel,
  onSelectHotel,
}: {
  selectedGuest: string;
  onSelectGuest: (name: string) => void;
  selectedHotel: string;
  onSelectHotel: (hotel: string) => void;
}) {
  const { bookings } = useData();
  const [search, setSearch] = useState('');

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
      if (search && !name.toLowerCase().includes(search.toLowerCase())) return;
      if (!guestMap.has(name)) guestMap.set(name, []);
      guestMap.get(name)!.push(b);
    });
    return Array.from(guestMap.entries())
      .map(([name, bks]) => ({ name, count: bks.length }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [bookings, selectedHotel, search]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Hotel */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Hotel
          </label>
          <div className="relative">
            <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={selectedHotel}
              onChange={(e) => {
                onSelectHotel(e.target.value);
                onSelectGuest('');
              }}
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

        {/* Search */}
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Search Guest
          </label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type guest name…"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Guest list */}
      <div>
        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          Select Guest
        </label>
        <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white divide-y divide-gray-50">
          {filteredGuests.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <User size={24} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No guests found</p>
            </div>
          ) : (
            filteredGuests.map((g) => {
              const active = selectedGuest === g.name;
              return (
                <button
                  key={g.name}
                  onClick={() => onSelectGuest(g.name)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                    active ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="truncate">{g.name}</span>
                  <span className={`text-xs ml-2 shrink-0 ${active ? 'text-blue-500' : 'text-gray-400'}`}>
                    {g.count} {g.count === 1 ? 'booking' : 'bookings'}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export function getGuestBookings(bookings: Booking[], guestName: string, hotelName: string): Booking[] {
  return bookings.filter((b) => {
    const name = b.name;
    if (name !== guestName) return false;
    if (hotelName && b.hotelName !== hotelName) return false;
    return true;
  });
}

/** Always returns a hotel object — falls back to booking data if Autofill tab is missing */
export function getHotelDetails(
  hotels: { hotel: string; address: string; email: string; phone: string; vat: string; invoiceFooter: string; vatMessage: string }[],
  selectedHotel: string,
  fallbackName: string,
) {
  return (
    hotels.find((h) => h.hotel === selectedHotel) ||
    hotels.find((h) => h.hotel === fallbackName) ||
    { hotel: fallbackName || 'Hotel', address: '', email: '', phone: '', vat: '', invoiceFooter: '', vatMessage: '' }
  );
}
