import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { fetchBookings, fetchHotelDetails } from '@/lib/sheets';
import { getSettings } from '@/lib/db';
import type { Booking, HotelDetails, AppSettings } from '@/lib/types';

interface DataContextType {
  bookings: Booking[];
  hotels: HotelDetails[];
  settings: AppSettings | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hotels, setHotels] = useState<HotelDetails[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = async () => {
    const isInitial = !lastUpdated;
    if (isInitial) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const s = await getSettings();
      setSettings(s);
      const config = {
        sheetId: s.sheetId,
        inOutGid: s.inOutGid,
        autofillSheetName: s.autofillSheetName,
      };
      const [b, h] = await Promise.all([fetchBookings(config), fetchHotelDetails(config)]);
      setBookings(b);
      setHotels(h);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <DataContext.Provider value={{ bookings, hotels, settings, loading, refreshing, error, lastUpdated, refresh }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
