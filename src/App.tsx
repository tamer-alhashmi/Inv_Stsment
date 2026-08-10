import { useState, useEffect } from 'react';
import { DataProvider, useData } from '@/context/DataContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LoadingBarProvider, useLoadingBar } from '@/components/LoadingBar';
import { Sidebar, type TabId } from '@/components/Sidebar';
import { InvoicePage } from '@/pages/InvoicePage';
import { StatementPage } from '@/pages/StatementPage';
import { CouncilPage } from '@/pages/CouncilPage';
import { CombinedPage } from '@/pages/CombinedPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { UsersPage } from '@/pages/UsersPage';
import { LoginPage } from '@/pages/LoginPage';
import { ReservationsPage } from '@/pages/ReservationsPage';
import { GuestsPage } from '@/pages/GuestsPage';
import { PropertiesPage } from '@/pages/PropertiesPage';
import { RoomsPage } from '@/pages/RoomsPage';
import { CouncilCasesPage } from '@/pages/CouncilCasesPage';
import { AccountsPage } from '@/pages/AccountsPage';
import { TasksPage } from '@/pages/TasksPage';
import { ReportsPage } from '@/pages/ReportsPage';
import type { RestoreState, DocumentHistoryEntry, DocType } from '@/lib/types';
import { Loader2, RefreshCw, Menu } from 'lucide-react';

const PAGE_TITLES: Record<TabId, { title: string; desc: string }> = {
  dashboard:      { title: 'Dashboard',         desc: "Today's operations, financials, alerts, and KPIs" },
  reservations:   { title: 'Reservations',      desc: 'Manage bookings, check-ins, and check-outs' },
  guests:         { title: 'Guests',             desc: 'Guest profiles, history, and room movements' },
  properties:     { title: 'Properties',         desc: 'Manage hotels and accommodation types' },
  rooms:          { title: 'Rooms',              desc: 'Unit status, housekeeping, and maintenance' },
  council_cases:  { title: 'Council Cases',      desc: 'Council-funded guests, funding, and extensions' },
  accounts:       { title: 'Accounts',            desc: 'Invoices, payments, and outstanding balances' },
  tasks:          { title: 'Tasks',               desc: 'Follow-ups, reminders, and action items' },
  reports:        { title: 'Reports',             desc: 'Management, occupancy, and financial reports' },
  invoice:        { title: 'Invoice',             desc: 'Generate a professional invoice PDF' },
  statement:      { title: 'Receipt',             desc: 'Generate a full booking receipt' },
  council:        { title: 'Council Letter',      desc: 'Draft an official council letter' },
  combined:       { title: 'Combined Package',    desc: 'Invoice or receipt with council letter' },
  history:        { title: 'Document History',    desc: 'All documents generated through this system' },
  users:          { title: 'User Management',     desc: 'Add, edit, and remove users with role-based access' },
  settings:       { title: 'Settings',            desc: 'Configure properties, sources, and preferences' },
};

const DOC_TYPE_TO_TAB: Record<DocType, TabId> = {
  invoice: 'invoice',
  statement: 'statement',
  council_letter: 'council',
  combined: 'combined',
};

function TopBar({ title, desc, onMenuClick }: { title: string; desc: string; onMenuClick: () => void }) {
  const { refreshing, refresh, lastUpdated, loading } = useData();
  const { start, done } = useLoadingBar();

  useEffect(() => {
    if (loading || refreshing) start(); else done();
  }, [loading, refreshing, start, done]);
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight truncate">{title}</h1>
          <p className="text-xs text-gray-400 mt-0.5 truncate hidden sm:block">{desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {lastUpdated && !loading && (
          <span className="text-xs text-gray-400 hidden lg:inline">
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <button
          onClick={refresh}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">{refreshing ? 'Refreshing…' : 'Refresh Data'}</span>
        </button>
      </div>
    </header>
  );
}

function Content({ active, restore, onRestored, onReopen, isAdmin, onNavigate }: {
  active: TabId;
  restore: RestoreState | null;
  onRestored: () => void;
  onReopen: (entry: DocumentHistoryEntry) => void;
  isAdmin: boolean;
  onNavigate: (tab: TabId) => void;
}) {
  const { loading } = useData();
  const { start, done } = useLoadingBar();

  useEffect(() => {
    if (loading) start(); else done();
  }, [loading, start, done]);

  // Admin-only pages
  if ((active === 'settings' || active === 'users') && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-center">
        <div>
          <p className="text-sm font-medium text-gray-500">You don&apos;t have access to this page</p>
          <p className="text-xs text-gray-400 mt-1">Contact your administrator if you need access</p>
        </div>
      </div>
    );
  }

  // PMS pages that don't depend on Google Sheets loading
  if (active === 'reservations') return <ReservationsPage onNavigate={onNavigate} />;
  if (active === 'guests') return <GuestsPage onNavigate={onNavigate} />;
  if (active === 'properties') return <PropertiesPage />;
  if (active === 'rooms') return <RoomsPage />;
  if (active === 'council_cases') return <CouncilCasesPage onNavigate={onNavigate} />;
  if (active === 'accounts') return <AccountsPage onNavigate={onNavigate} />;
  if (active === 'tasks') return <TasksPage />;
  if (active === 'reports') return <ReportsPage />;
  if (active === 'settings') return <SettingsPage />;
  if (active === 'users') return <UsersPage />;

  // Legacy document pages that need Google Sheets data
  if (active === 'dashboard') return <DashboardPage onNavigate={onNavigate} />;
  if (active === 'history') return <HistoryPage onReopen={onReopen} isAdmin={isAdmin} />;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 size={36} className="mx-auto text-blue-600 animate-spin mb-3" />
          <p className="text-sm text-gray-500 font-medium">Loading data from Google Sheets…</p>
          <p className="text-xs text-gray-400 mt-1">Make sure the sheet is set to "Anyone with link can view"</p>
        </div>
      </div>
    );
  }

  switch (active) {
    case 'invoice':   return <InvoicePage restore={restore} onRestored={onRestored} />;
    case 'statement': return <StatementPage restore={restore} onRestored={onRestored} />;
    case 'council':   return <CouncilPage restore={restore} onRestored={onRestored} />;
    case 'combined':  return <CombinedPage restore={restore} onRestored={onRestored} />;
    default:          return null;
  }
}

function AppShell() {
  const { user, loading: authLoading } = useAuth();
  const { start, done } = useLoadingBar();
  const [active, setActive] = useState<TabId>('dashboard');
  const [restore, setRestore] = useState<RestoreState | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (authLoading) start(); else done();
  }, [authLoading, start, done]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const isAdmin = user.role === 'admin';
  const { title, desc } = PAGE_TITLES[active];

  const handleReopen = (entry: DocumentHistoryEntry) => {
    setRestore({
      guestName: entry.guest_name,
      hotelName: entry.hotel_name,
      bookingRefs: entry.booking_references ?? [],
      councilLetterId: entry.council_letter_id,
      docType: entry.doc_type,
    });
    setActive(DOC_TYPE_TO_TAB[entry.doc_type]);
    setMobileNavOpen(false);
  };

  return (
    <DataProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar
          active={active}
          onSelect={setActive}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar title={title} desc={desc} onMenuClick={() => setMobileNavOpen(true)} />
          <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            <Content
              active={active}
              restore={restore}
              onRestored={() => setRestore(null)}
              onReopen={handleReopen}
              isAdmin={isAdmin}
              onNavigate={setActive}
            />
          </main>
        </div>
      </div>
    </DataProvider>
  );
}

export default function App() {
  return (
    <LoadingBarProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </LoadingBarProvider>
  );
}
