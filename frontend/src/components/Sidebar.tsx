import React from 'react';
import {
  LayoutDashboard,
  Bell,
  UtensilsCrossed,
  LayoutGrid,
  Receipt,
  History,
  Cpu,
  Bot,
  Wifi,
  ChevronRight
} from 'lucide-react';

export type NavTab = 'overview' | 'requests' | 'orders' | 'tables' | 'billing' | 'history' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpen: boolean;
  onClose: () => void;
  badgeCounts: {
    newRequests: number;
    pendingOrders: number;
    openBills: number;
    connectedRobots: number;
  };
  robotLocation?: string;
  isRobotOnline?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  badgeCounts,
  robotLocation = 'T04',
  isRobotOnline = true
}) => {
  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    badgeAlert?: boolean;
  }> = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4" />
    },
    {
      id: 'requests',
      label: 'Live Requests',
      icon: <Bell className="w-4 h-4" />,
      badge: badgeCounts.newRequests,
      badgeAlert: badgeCounts.newRequests > 0
    },
    {
      id: 'orders',
      label: 'Food Orders',
      icon: <UtensilsCrossed className="w-4 h-4" />,
      badge: badgeCounts.pendingOrders
    },
    {
      id: 'tables',
      label: 'Tables & Robots',
      icon: <LayoutGrid className="w-4 h-4" />
    },
    {
      id: 'billing',
      label: 'Billing & Receipts',
      icon: <Receipt className="w-4 h-4" />,
      badge: badgeCounts.openBills
    },
    {
      id: 'history',
      label: 'History & Logs',
      icon: <History className="w-4 h-4" />
    },
    {
      id: 'settings',
      label: 'Robot Gateway',
      icon: <Cpu className="w-4 h-4" />
    }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-charcoal/30 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Slim, elegant sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-forest-900 text-slate-100 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 flex items-center px-5 border-b border-forest-800">
          <div className="flex items-center gap-2.5">
            {/* Custom ARIA monogram */}
            <div className="w-7 h-7 rounded-md bg-forest-700 border border-forest-600 flex items-center justify-center font-serif text-citrus font-bold text-sm tracking-wide shadow-xs">
              A
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-semibold text-sm tracking-tight text-white">ARIA</span>
                <span className="text-[10px] uppercase tracking-wider text-sage-300 font-mono">DineAssist</span>
              </div>
              <p className="text-[11px] text-sage-400/80 mt-0.5">Table-side Robot System</p>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-forest-800 text-white font-semibold'
                    : 'text-sage-200/80 hover:bg-forest-850 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={isActive ? 'text-citrus' : 'text-sage-400'}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold leading-none ${
                    item.badgeAlert
                      ? 'bg-terracotta text-white'
                      : 'bg-forest-700 text-sage-200'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Real Hardware Connection State at Bottom */}
        <div className="p-3.5 border-t border-forest-800 bg-forest-950/60">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isRobotOnline ? 'bg-citrus' : 'bg-terracotta'}`} />
              <div className="truncate">
                <p className="font-medium text-white text-[11px] truncate">ARIA Robot 1</p>
                <p className="text-[10px] text-sage-400 font-mono truncate">Stationed at {robotLocation}</p>
              </div>
            </div>
            <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${
              isRobotOnline ? 'text-citrus bg-forest-800' : 'text-terracotta bg-terracotta/10'
            }`}>
              {isRobotOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
