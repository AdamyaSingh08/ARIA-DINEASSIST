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
  UserCheck,
  ChevronRight,
  Sparkles
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
  demoMode: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  badgeCounts,
  demoMode
}) => {
  const navItems: Array<{
    id: NavTab;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    badge?: number;
    badgeColor?: string;
  }> = [
    {
      id: 'overview',
      label: 'Overview',
      sublabel: 'Command Center',
      icon: <LayoutDashboard className="w-5 h-5" />
    },
    {
      id: 'requests',
      label: 'Live Requests',
      sublabel: 'Customer Robot Calls',
      icon: <Bell className="w-5 h-5" />,
      badge: badgeCounts.newRequests,
      badgeColor: 'bg-rose-500 text-white'
    },
    {
      id: 'orders',
      label: 'Food Orders',
      sublabel: 'Kitchen Pipeline',
      icon: <UtensilsCrossed className="w-5 h-5" />,
      badge: badgeCounts.pendingOrders,
      badgeColor: 'bg-blue-600 text-white'
    },
    {
      id: 'tables',
      label: 'Tables & Robots',
      sublabel: 'Floor & Hardware State',
      icon: <LayoutGrid className="w-5 h-5" />,
      badge: badgeCounts.connectedRobots,
      badgeColor: 'bg-teal-600 text-white'
    },
    {
      id: 'billing',
      label: 'Billing & Receipts',
      sublabel: 'POS & Tax Invoices',
      icon: <Receipt className="w-5 h-5" />,
      badge: badgeCounts.openBills,
      badgeColor: 'bg-amber-600 text-white'
    },
    {
      id: 'history',
      label: 'History & Logs',
      sublabel: 'Audit & Records',
      icon: <History className="w-5 h-5" />
    },
    {
      id: 'settings',
      label: 'Robot Integration',
      sublabel: 'XiaoZhi API & Gateway',
      icon: <Cpu className="w-5 h-5" />
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-navy-950/50 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-navy-900 text-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-navy-800 bg-navy-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-teal-400 text-navy-950 flex items-center justify-center font-black text-lg shadow-md shadow-teal-500/20">
              <Bot className="w-5 h-5 text-navy-950" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-white">DineAssist</span>
                <span className="text-[10px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 px-1.5 py-0.2 rounded">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400">INNOTech Hackathon</p>
            </div>
          </div>
        </div>

        {/* Demo Mode Notice in Sidebar */}
        {demoMode && (
          <div className="mx-4 mt-3 p-2.5 rounded-lg bg-teal-950/60 border border-teal-500/30 text-teal-200 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
            <div className="text-[11px] leading-tight">
              <span className="font-semibold text-white">Hardware Bridge Active</span>
              <p className="text-teal-300/80">XiaoZhi simulator & REST ready</p>
            </div>
          </div>
        )}

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
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all group ${
                  isActive
                    ? 'bg-teal-600 text-white font-semibold shadow-sm shadow-teal-600/30'
                    : 'text-slate-300 hover:bg-navy-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-teal-400 transition-colors'}`}>
                    {item.icon}
                  </span>
                  <div className="truncate">
                    <div className="text-xs font-medium leading-none">{item.label}</div>
                    <div className={`text-[10px] mt-0.5 ${isActive ? 'text-teal-100' : 'text-slate-500 group-hover:text-slate-400'}`}>
                      {item.sublabel}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-4 h-4 text-teal-200" />}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Staff & Session Footer */}
        <div className="p-4 border-t border-navy-800 bg-navy-950/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-navy-800 border border-navy-700 flex items-center justify-center text-teal-400">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">Staff Operator</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <p className="text-[11px] text-slate-400">Shift Active · Counter 1</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
