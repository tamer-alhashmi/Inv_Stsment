import { Building2, Receipt, FileText, Mail, Layers, Clock, Settings, RefreshCw, AlertCircle, Users, X, LogOut, Shield, LayoutDashboard } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';

export type TabId = 'dashboard' | 'invoice' | 'statement' | 'council' | 'combined' | 'history' | 'users' | 'settings';

const NAV_ITEMS: { id: TabId; label: string; icon: typeof Receipt; sub: string; adminOnly?: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard',       icon: LayoutDashboard, sub: 'Overview & analytics' },
  { id: 'invoice',   label: 'Invoice',        icon: Receipt,   sub: 'Create invoice PDF' },
  { id: 'statement', label: 'Receipt',         icon: FileText,  sub: 'Booking receipt'    },
  { id: 'council',   label: 'Council Letter',  icon: Mail,      sub: 'Official letter'    },
  { id: 'combined',  label: 'Combined',        icon: Layers,    sub: 'All-in-one package' },
  { id: 'history',   label: 'History',         icon: Clock,     sub: 'Past documents'     },
  { id: 'users',     label: 'User Management', icon: Users,     sub: 'Manage users',       adminOnly: true },
  { id: 'settings',  label: 'Settings',        icon: Settings,  sub: 'Data source & config', adminOnly: true },
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

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden" onClick={onCloseMobile} />
      )}

      <aside className={`
        fixed lg:sticky top-0 left-0 z-50
        w-72 h-screen bg-gray-950 text-white flex flex-col shrink-0
        transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand + close */}
        <div className="px-6 pt-7 pb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <Building2 size={16} />
            </div>
            <div>
              <p className="font-bold text-sm tracking-tight leading-tight">InvoiceHub</p>
              <p className="text-gray-400 text-[11px]">Finance team</p>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-gray-400 hover:text-white p-1 -mr-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {visibleItems.map(({ id, label, icon: Icon, sub, adminOnly }) => {
            const active_ = active === id;
            return (
              <div key={id}>
                {adminOnly && id === visibleItems.find(i => i.adminOnly)?.id && (
                  <div className="my-2 mx-3 border-t border-gray-800/60" />
                )}
                <button
                  onClick={() => { onSelect(id); onCloseMobile(); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-150 group ${
                    active_
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon size={18} className={active_ ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium leading-tight ${active_ ? 'text-white' : ''}`}>{label}</p>
                    <p className={`text-[11px] leading-tight mt-0.5 ${active_ ? 'text-blue-200' : 'text-gray-600 group-hover:text-gray-500'}`}>{sub}</p>
                  </div>
                  {adminOnly && (
                    <Shield size={13} className={active_ ? 'text-blue-200' : 'text-gray-600'} />
                  )}
                </button>
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

          {/* User info + logout */}
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
