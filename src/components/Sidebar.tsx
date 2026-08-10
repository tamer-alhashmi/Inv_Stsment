import {
  Building2, LayoutDashboard, CalendarDays, Users, Hotel, BedDouble,
  Landmark, PoundSterling, CheckSquare, BarChart3, FileText,
  Settings, RefreshCw, AlertCircle, X, LogOut, Shield, Mail, Clock, Layers,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';

export type TabId =
  | 'dashboard' | 'reservations' | 'guests' | 'properties' | 'rooms'
  | 'council_cases' | 'accounts' | 'tasks' | 'reports'
  | 'invoice' | 'statement' | 'council' | 'combined' | 'history'
  | 'users' | 'settings';

interface NavItem {
  id: TabId;
  label: string;
  icon: typeof LayoutDashboard;
  sub: string;
  adminOnly?: boolean;
  group?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',    label: 'Dashboard',       icon: LayoutDashboard, sub: "Today's operations & KPIs", group: 'Operations' },
  { id: 'reservations', label: 'Reservations',    icon: CalendarDays,   sub: 'Bookings, check-in/out',     group: 'Operations' },
  { id: 'guests',       label: 'Guests',           icon: Users,          sub: 'Profiles & history',         group: 'Operations' },
  { id: 'properties',  label: 'Properties',        icon: Hotel,          sub: 'Hotels & units',             group: 'Operations' },
  { id: 'rooms',        label: 'Rooms',             icon: BedDouble,      sub: 'Unit status & housekeeping', group: 'Operations' },

  { id: 'council_cases', label: 'Council Cases',   icon: Landmark,       sub: 'Funding & extensions',       group: 'Council' },

  { id: 'accounts',     label: 'Accounts',          icon: PoundSterling,  sub: 'Invoices & payments',       group: 'Finance' },
  { id: 'tasks',        label: 'Tasks',             icon: CheckSquare,    sub: 'Follow-ups & actions',       group: 'Finance' },
  { id: 'reports',      label: 'Reports',            icon: BarChart3,      sub: 'Management & financial',    group: 'Finance' },

  { id: 'invoice',      label: 'Invoice',            icon: FileText,       sub: 'Create invoice PDF',        group: 'Documents' },
  { id: 'statement',    label: 'Receipt',            icon: FileText,       sub: 'Booking receipt',           group: 'Documents' },
  { id: 'council',      label: 'Council Letter',     icon: Mail,           sub: 'Official letter',           group: 'Documents' },
  { id: 'combined',     label: 'Combined',           icon: Layers,         sub: 'All-in-one package',        group: 'Documents' },
  { id: 'history',      label: 'History',            icon: Clock,          sub: 'Past documents',           group: 'Documents' },

  { id: 'users',        label: 'User Management',    icon: Users,           sub: 'Manage users',              adminOnly: true,  group: 'Admin' },
  { id: 'settings',     label: 'Settings',           icon: Settings,       sub: 'Configuration',             adminOnly: true,  group: 'Admin' },
];


export function Sidebar({
  active,
  onSelect,
  mobileOpen,
  onCloseMobile,
}: {
  active: TabId;
  onSelect: (id: TabId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const { loading, refreshing, error, refresh, bookings, lastUpdated } = useData();
  const { user, signOut } = useAuth();
  const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || user?.role === 'admin');

  // Group items
  const groups: { [key: string]: NavItem[] } = {};
  for (const item of visibleItems) {
    const g = item.group || 'Other';
    if (!groups[g]) groups[g] = [];
    groups[g].push(item);
  }
  const groupOrder = ['Operations', 'Council', 'Finance', 'Documents', 'Admin'];

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden" onClick={onCloseMobile} />
      )}

      <aside className={`
        fixed lg:sticky top-0 left-0 z-50
        w-72 h-screen bg-gray-950 text-white flex flex-col shrink-0
        transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand */}
        <div className="px-6 pt-7 pb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <Building2 size={18} />
            </div>
            <div>
              <p className="font-bold text-sm tracking-tight leading-tight">PMS Hub</p>
              <p className="text-gray-400 text-[11px]">Hotel Management</p>
            </div>
          </div>
          <button onClick={onCloseMobile} className="lg:hidden text-gray-400 hover:text-white p-1 -mr-1">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 overflow-y-auto pb-2">
          {groupOrder.map(groupName => {
            const items = groups[groupName];
            if (!items) return null;
            return (
              <div key={groupName}>
                <p className="px-3.5 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-600">{groupName}</p>
                <div className="space-y-0.5">
                  {items.map(({ id, label, icon: Icon, sub, adminOnly }) => {
                    const active_ = active === id;
                    return (
                      <button
                        key={id}
                        onClick={() => { onSelect(id); onCloseMobile(); }}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all duration-150 group ${
                          active_
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                        }`}
                      >
                        <Icon size={17} className={active_ ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium leading-tight ${active_ ? 'text-white' : ''}`}>{label}</p>
                          <p className={`text-[11px] leading-tight mt-0.5 ${active_ ? 'text-blue-200' : 'text-gray-600 group-hover:text-gray-500'}`}>{sub}</p>
                        </div>
                        {adminOnly && <Shield size={13} className={active_ ? 'text-blue-200' : 'text-gray-600'} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-gray-800 space-y-3">
          {error && (
            <div className="flex gap-2 px-3 py-2.5 rounded-lg bg-red-900/30 border border-red-800/40 text-red-300 text-xs">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              <span className="leading-snug">{error}</span>
            </div>
          )}
          <div className="px-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-500">Google Sheets</p>
              {!loading && !error && (
                <p className="text-[11px] text-gray-600">{bookings.length} bookings loaded</p>
              )}
            </div>
            <button
              onClick={refresh}
              disabled={loading || refreshing}
              title={lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : 'Refresh from Sheets'}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors disabled:opacity-40"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          {user && (
            <div className="px-3 pt-2 border-t border-gray-800/60">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-xs font-semibold text-gray-300 shrink-0">
                  {user.email.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-200 truncate">{user.email}</p>
                  <p className="text-[10px] text-gray-500 flex items-center gap-1">
                    {user.role === 'admin' && <Shield size={9} />}
                    {user.role === 'admin' ? 'Administrator' : 'User'}
                  </p>
                </div>
                <button
                  onClick={signOut}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-800 hover:text-red-400 transition-colors"
                  title="Sign out"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
