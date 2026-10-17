import React, { useState, useEffect } from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import { Header } from './components/Header';
import { Sidebar, OperationalTab } from './components/Sidebar';
import { ServicePage } from './pages/ServicePage';
import { KitchenPage } from './pages/KitchenPage';
import { BillingPage } from './pages/BillingPage';
import { DeviceSetupModal } from './components/DeviceSetupModal';
import { DemoSimulatorModal } from './components/DemoSimulatorModal';
import { NotificationToasts } from './components/NotificationToast';

import { api } from './services/api';

const MainApp: React.FC = () => {
  // Default landing view is SERVICE for waiters
  const [activeTab, setActiveTab] = useState<OperationalTab>('service');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [isDeviceSetupOpen, setIsDeviceSetupOpen] = useState<boolean>(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [selectedTableForBilling, setSelectedTableForBilling] = useState<string | null>(null);

  // Badge Counts for the 3 Primary Sections
  const [badgeCounts, setBadgeCounts] = useState({
    newRequests: 0,
    activeOrders: 0,
    openBills: 0
  });

  const { socket } = useSocket();

  const fetchBadgeCounts = async () => {
    try {
      const [reqs, orders, bills] = await Promise.all([
        api.getRequests({ status: 'New' }).catch(() => []),
        api.getOrders().catch(() => []),
        api.getBills({ status: 'Open' }).catch(() => [])
      ]);

      const activeOrdersCount = orders.filter(
        o => o.status === 'Received' || o.status === 'Confirmed' || o.status === 'Preparing'
      ).length;

      setBadgeCounts({
        newRequests: reqs.length,
        activeOrders: activeOrdersCount,
        openBills: bills.length
      });
    } catch (_) {}
  };

  useEffect(() => {
    fetchBadgeCounts();
  }, []);

  useEffect(() => {
    if (socket) {
      const handleRefresh = () => fetchBadgeCounts();
      socket.on('request.created', handleRefresh);
      socket.on('request.status_changed', handleRefresh);
      socket.on('order.created', handleRefresh);
      socket.on('order.status_changed', handleRefresh);
      socket.on('bill.created', handleRefresh);
      socket.on('bill.updated', handleRefresh);
      socket.on('system.reset', handleRefresh);

      return () => {
        socket.off('request.created', handleRefresh);
        socket.off('request.status_changed', handleRefresh);
        socket.off('order.created', handleRefresh);
        socket.off('order.status_changed', handleRefresh);
        socket.off('bill.created', handleRefresh);
        socket.off('bill.updated', handleRefresh);
        socket.off('system.reset', handleRefresh);
      };
    }
  }, [socket]);

  // Section Headers Meta
  const getSectionInfo = (): { title: string; subtitle: string } => {
    switch (activeTab) {
      case 'service':
        return {
          title: 'Service Console',
          subtitle: 'Live customer assistance and beverage requests from robot-connected tables'
        };
      case 'kitchen':
        return {
          title: 'Kitchen Display (KDS)',
          subtitle: 'Live food preparation queue and chef fulfillment workflow'
        };
      case 'billing':
        return {
          title: 'Billing & POS Cashier',
          subtitle: 'Review dining table invoices, preview receipts, and record settlement'
        };
      default:
        return { title: 'ARIA DineAssist', subtitle: '' };
    }
  };

  const sectionInfo = getSectionInfo();

  return (
    <div className="min-h-screen bg-warmBg text-ink-primary flex font-sans antialiased selection:bg-lime-accent selection:text-forest-900">
      {/* Toast Alert Notifications */}
      <NotificationToasts />

      {/* Primary Deep Green Operations Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        badgeCounts={badgeCounts}
        robotLocation="T04"
        isRobotOnline={true}
        onOpenDeviceSetup={() => setIsDeviceSetupOpen(true)}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Contextual Header */}
        <Header
          pageTitle={sectionInfo.title}
          pageSubtitle={sectionInfo.subtitle}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          robotLocation="T04"
          isRobotOnline={true}
          onOpenDeviceSetup={() => setIsDeviceSetupOpen(true)}
          onOpenSimulator={() => setIsSimulatorOpen(true)}
        />

        {/* Scrollable Operational Screen Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'service' && (
            <ServicePage
              onNavigateToBilling={(tableId) => {
                setSelectedTableForBilling(tableId || null);
                setActiveTab('billing');
              }}
            />
          )}

          {activeTab === 'kitchen' && <KitchenPage />}

          {activeTab === 'billing' && (
            <BillingPage initialTableId={selectedTableForBilling} />
          )}
        </main>
      </div>

      {/* XiaoZhi MCP Device Setup Modal */}
      <DeviceSetupModal
        isOpen={isDeviceSetupOpen}
        onClose={() => setIsDeviceSetupOpen(false)}
        onConfigSaved={() => fetchBadgeCounts()}
      />

      {/* Demo Interaction Simulator Modal */}
      <DemoSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onEventDispatched={() => fetchBadgeCounts()}
      />
    </div>
  );
};

export default function App() {
  return (
    <SocketProvider>
      <MainApp />
    </SocketProvider>
  );
}
