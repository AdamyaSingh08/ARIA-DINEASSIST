import React from 'react';
import {
  Bell,
  UtensilsCrossed,
  Receipt,
  Bot,
  Menu,
  X,
  Sliders,
  Sparkles
} from 'lucide-react';

export type OperationalTab = 'service' | 'kitchen' | 'billing';

interface SidebarProps {
  activeTab: OperationalTab;
  onSelectTab: (tab: OperationalTab) => void;
  isOpen: boolean;
  onClose: () => void;
  badgeCounts: {
    newRequests: number;
    activeOrders: number;
    openBills: number;
  };
  robotLocation?: string;
  isRobotOnline?: boolean;
  onOpenDeviceSetup: () => void;
  onOpenSimulator: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  badgeCounts,
  robotLocation = 'T04',
  isRobotOnline = true,
  onOpenDeviceSetup,
  onOpenSimulator
}) => {
  const navItems = [
    {
      id: 'service' as OperationalTab,
      label: 'Service',
      sublabel: 'Waiters · Table Requests',
      icon: <Bell className="w-5 h-5" />,
      badge: badgeCounts.newRequests,
      badgeAlert: badgeCounts.newRequests > 0
    },
    {
      id: 'kitchen' as OperationalTab,
      label: 'Kitchen',
      sublabel: 'Chefs · Order Pipeline',
      icon: <UtensilsCrossed className="w-5 h-5" />,
      badge: badgeCounts.activeOrders,
      badgeAlert: false
    },
    {
      id: 'billing' as OperationalTab,
      label: 'Billing',
      sublabel: 'Cashier · Invoices & POS',
      icon: <Receipt className="w-5 h-5" />,
      badge: badgeCounts.openBills,
      badgeAlert: false
    }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-forest-950/60 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Primary Deep Green Operations Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-forest-900 text-white flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-forest-800 bg-forest-950/70">
          <div className="flex items-center gap-3">
            {/* Custom ARIA Monogram */}
            <div className="w-10 h-10 rounded-xl bg-forest-800 border-2 border-forest-700 flex items-center justify-center text-lime-accent font-serif font-bold text-lg shadow-xs">
              A
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-serif text-lg font-bold tracking-tight text-white">ARIA</span>
                <span className="text-[11px] uppercase tracking-wider text-lime-accent font-mono font-bold">DineAssist</span>
              </div>
              <p className="text-[11px] text-forest-100/70 mt-1">Smart Restaurant Operations</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-forest-100/60 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Operational Section Navigation */}
        <div className="px-4 py-3">
          <p className="px-3 text-[10px] uppercase font-mono font-bold tracking-wider text-forest-100/50 mb-2">
            Operations Console
          </p>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all text-left min-h-[52px] ${
                    isActive
                      ? 'bg-forest-800 text-white shadow-md border-l-4 border-lime-accent'
                      : 'text-forest-100/80 hover:bg-forest-850 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={isActive ? 'text-lime-accent' : 'text-forest-100/60'}>
                      {item.icon}
                    </span>
                    <div className="truncate">
                      <span className="block font-bold text-sm tracking-tight">{item.label}</span>
                      <span className="block text-[11px] text-forest-100/60 truncate">{item.sublabel}</span>
                    </div>
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold leading-none ${
                        item.badgeAlert
                          ? 'bg-terracotta text-white'
                          : 'bg-forest-700 text-lime-accent'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick Tools & Secondary Actions */}
        <div className="px-4 mt-auto space-y-1.5 pt-4 border-t border-forest-800/80">
          <button
            onClick={onOpenDeviceSetup}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-medium text-forest-100/70 hover:bg-forest-850 hover:text-white transition-colors"
          >
            <Sliders className="w-4 h-4 text-forest-100/50" />
            <span>XiaoZhi MCP Device Setup</span>
          </button>

          <button
            onClick={onOpenSimulator}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-medium text-forest-100/70 hover:bg-forest-850 hover:text-white transition-colors"
          >
            <Sparkles className="w-4 h-4 text-lime-accent" />
            <span>Demo Trigger Simulator</span>
          </button>
        </div>

        {/* Robot Station Status Card at Base */}
        <div className="p-4 m-3 rounded-xl bg-forest-950/80 border border-forest-800/80">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isRobotOnline ? 'bg-lime-accent' : 'bg-terracotta'}`} />
              <div className="truncate">
                <p className="font-semibold text-white text-xs truncate">ARIA Rover 01</p>
                <p className="text-[11px] text-forest-100/60 font-mono truncate">Stationed at {robotLocation}</p>
              </div>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
              isRobotOnline ? 'text-forest-900 bg-lime-accent' : 'text-terracotta bg-terracotta/15'
            }`}>
              {isRobotOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
