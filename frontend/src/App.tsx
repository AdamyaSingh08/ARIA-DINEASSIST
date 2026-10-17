import React, { useState, useEffect } from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { RobotVoiceSimulator } from './components/RobotVoiceSimulator';
import { NotificationToasts } from './components/NotificationToast';
import { ReceiptModal } from './components/ReceiptModal';

// Pages
import { OverviewPage } from './pages/OverviewPage';
import { LiveRequestsPage } from './pages/LiveRequestsPage';
import { FoodOrdersPage } from './pages/FoodOrdersPage';
import { TablesRobotsPage } from './pages/TablesRobotsPage';
import { BillingReceiptsPage } from './pages/BillingReceiptsPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsIntegrationPage } from './pages/SettingsIntegrationPage';

import { api } from './services/api';

const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [showSimulator, setShowSimulator] = useState<boolean>(false);
  const [currentTable, setCurrentTable] = useState<string>('T04');
  const [activeBillModalId, setActiveBillModalId] = useState<string | null>(null);

  // Badge Counts for Navigation
  const [badgeCounts, setBadgeCounts] = useState({
    newRequests: 0,
    pendingOrders: 0,
    openBills: 0,
    connectedRobots: 1
  });

  const { socket } = useSocket();

  const fetchBadgeCounts = async () => {
    try {
      const [reqs, orders, bills] = await Promise.all([
        api.getRequests({ status: 'Pending' }),
        api.getOrders(),
        api.getBills({ status: 'Open' })
      ]);
      const pendingOrdersCount = orders.filter(
        o => o.status === 'Received' || o.status === 'Confirmed'
      ).length;

      setBadgeCounts({
        newRequests: reqs.length,
        pendingOrders: pendingOrdersCount,
        openBills: bills.length,
        connectedRobots: 1
      });
    } catch (err) {
      // Non-critical background telemetry
    }
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

  // Tab Title Metadata
  const getPageInfo = (): { title: string; subtitle: string } => {
    switch (activeTab) {
      case 'overview':
        return {
          title: 'Dining Room Overview',
          subtitle: 'Live restaurant shift operations and ARIA table monitoring'
        };
      case 'requests':
        return {
          title: 'Guest Service Requests',
          subtitle: 'Real-time staff assistance and beverage requests from tables'
        };
      case 'orders':
        return {
          title: 'Kitchen Food Orders',
          subtitle: 'Live kitchen display system and dish preparation pipeline'
        };
      case 'tables':
        return {
          title: 'Tables & Robot Fleet',
          subtitle: 'Dining room layout, table occupancy, and ARIA rover topology'
        };
      case 'billing':
        return {
          title: 'Billing & Receipts',
          subtitle: 'Invoices generated via ARIA table checkout and cashier settlement'
        };
      case 'history':
        return {
          title: 'Audit & Archives',
          subtitle: 'Historical record of fulfilled calls, orders, and settled bills'
        };
      case 'settings':
        return {
          title: 'ARIA Hardware Gateway',
          subtitle: 'ESP32-S3 rover telemetry parameters, API keys, and test harness'
        };
      default:
        return { title: 'ARIA DineAssist', subtitle: '' };
    }
  };

  const pageInfo = getPageInfo();

  return (
    <div className="min-h-screen bg-ivory text-charcoal flex font-sans antialiased selection:bg-sage-200 selection:text-forest-900">
      {/* Toast Alert Notifications */}
      <NotificationToasts />

      {/* Primary Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        badgeCounts={badgeCounts}
        robotLocation={currentTable}
        isRobotOnline={true}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Contextual Header */}
        <Header
          pageTitle={pageInfo.title}
          pageSubtitle={pageInfo.subtitle}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          robotLocation={currentTable}
          isRobotOnline={true}
          isSimulatorOpen={showSimulator}
          onToggleSimulator={() => setShowSimulator(!showSimulator)}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Collapsible Customer Interaction Simulator */}
          <RobotVoiceSimulator
            isOpen={showSimulator}
            onClose={() => setShowSimulator(false)}
            currentTable={currentTable}
            onTableChange={(tableId) => setCurrentTable(tableId)}
            onEventDispatched={() => fetchBadgeCounts()}
          />

          {/* View Router */}
          {activeTab === 'overview' && (
            <OverviewPage
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenReceipt={(billId) => setActiveBillModalId(billId)}
              currentRobotTable={currentTable}
            />
          )}

          {activeTab === 'requests' && <LiveRequestsPage />}

          {activeTab === 'orders' && <FoodOrdersPage />}

          {activeTab === 'tables' && <TablesRobotsPage />}

          {activeTab === 'billing' && (
            <BillingReceiptsPage
              onOpenReceipt={(billId) => setActiveBillModalId(billId)}
            />
          )}

          {activeTab === 'history' && (
            <HistoryPage
              onOpenReceipt={(billId) => setActiveBillModalId(billId)}
            />
          )}

          {activeTab === 'settings' && <SettingsIntegrationPage />}
        </main>
      </div>

      {/* Receipt & Payment Settlement Modal */}
      <ReceiptModal
        billId={activeBillModalId}
        onClose={() => setActiveBillModalId(null)}
        restaurantName="ARIA Dining Room"
        onBillUpdated={() => fetchBadgeCounts()}
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
