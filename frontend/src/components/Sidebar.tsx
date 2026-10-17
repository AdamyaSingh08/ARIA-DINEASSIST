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
          className="fixed inset-0 bg-[#071612]/70 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Primary High-Contrast Deep Green Operations Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#0C241D] text-white flex flex-col border-r border-[#194539] shadow-2xl transition-transform duration-200 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 flex items-center justify-between px-5 border-b border-[#183E34] bg-[#071914] shrink-0">
          <div className="flex items-center gap-3">
            {/* Custom ARIA Monogram */}
            <div className="w-10 h-10 rounded-xl bg-[#143B30] border-2 border-[#205748] flex items-center justify-center text-lime-accent font-serif font-black text-xl shadow-md">
              A
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-serif text-lg font-bold tracking-tight text-white">ARIA</span>
                <span className="text-[11px] uppercase tracking-wider text-lime-accent font-mono font-bold">DineAssist</span>
              </div>
              <p className="text-[11px] text-[#A7C4B8] mt-1 font-medium">Smart Restaurant Operations</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A7C4B8] hover:text-white hover:bg-[#143B30] transition lg:hidden"
            title="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Operational Section Navigation */}
        <div className="px-4 py-4 flex-1 overflow-y-auto">
          <p className="px-3 text-[10px] uppercase font-mono font-bold tracking-wider text-[#7E9F92] mb-2.5">
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
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all text-left min-h-[56px] border ${
                    isActive
                      ? 'bg-[#194539] text-white shadow-lg border-lime-accent/80 border-l-4'
                      : 'border-transparent text-[#E2EBE7] hover:bg-[#13372E] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className={`shrink-0 ${isActive ? 'text-lime-accent' : 'text-[#97BDAE]'}`}>
                      {item.icon}
                    </span>
                    <div className="truncate">
                      <span className="block font-bold text-sm tracking-tight text-white">{item.label}</span>
                      <span className={`block text-xs truncate ${isActive ? 'text-[#C6DDD4]' : 'text-[#8FAFA2]'}`}>
                        {item.sublabel}
                      </span>
                    </div>
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold leading-none shrink-0 shadow-xs ${
                        item.badgeAlert
                          ? 'bg-terracotta text-white'
                          : isActive
                          ? 'bg-lime-accent text-[#0C241D]'
                          : 'bg-[#1A473B] text-lime-accent'
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
        <div className="px-4 py-3 space-y-2 border-t border-[#183E34] bg-[#071914]/60 shrink-0">
          <button
            onClick={onOpenDeviceSetup}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#D2E4DC] bg-[#0C241D] hover:bg-[#163E33] hover:text-white border border-[#194539] transition-all shadow-xs"
          >
            <Sliders className="w-4 h-4 text-[#A7C4B8] shrink-0" />
            <span className="truncate">XiaoZhi MCP Device Setup</span>
          </button>

          <button
            onClick={onOpenSimulator}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#D2E4DC] bg-[#0C241D] hover:bg-[#163E33] hover:text-white border border-[#194539] transition-all shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-lime-accent shrink-0" />
            <span className="truncate">Demo Trigger Simulator</span>
          </button>
        </div>

        {/* Robot Station Status Card at Base */}
        <div className="p-3.5 m-3 rounded-xl bg-[#071914] border border-[#194539] shadow-inner shrink-0">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                isRobotOnline ? 'bg-lime-accent beacon-pulse' : 'bg-terracotta'
              }`} />
              <div className="truncate">
                <p className="font-bold text-white text-xs truncate">ARIA Rover 01</p>
                <p className="text-[11px] text-[#A7C4B8] font-mono truncate">Stationed at {robotLocation}</p>
              </div>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
              isRobotOnline ? 'text-[#0C241D] bg-lime-accent' : 'text-white bg-terracotta'
            }`}>
              {isRobotOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
