import React, { useState, useEffect } from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { DemoBar } from './components/DemoBar';
import { NotificationToasts } from './components/NotificationToast';
import { ReceiptModal } from './components/ReceiptModal';

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
  const [activeBillModalId, setActiveBillModalId] = useState<string | null>(null);

  // App metrics for sidebar badges
  const [badgeCounts, setBadgeCounts] = useState({
    newRequests: 0,
    pendingOrders: 0,
    openBills: 0,
    connectedRobots: 0
  });

  const [restaurantName, setRestaurantName] = useState<string>('Spice Route & Robotics Cafe');
  const [demoMode, setDemoMode] = useState<boolean>(true);

  const { socket } = useSocket();

  const refreshBadges = async () => {
    try {
      const overview = await api.getOverview();
      setBadgeCounts({
        newRequests: overview.stats.newRequestsCount,
        pendingOrders: overview.stats.pendingOrdersCount,
        openBills: overview.stats.openBillsCount,
        connectedRobots: overview.stats.connectedRobotsCount
      });
      if (overview.meta.restaurant_name) {
        setRestaurantName(overview.meta.restaurant_name);
      }
      setDemoMode(overview.meta.demo_mode);
    } catch (err) {
      console.warn('Could not refresh badge counts:', err);
    }
  };

  useEffect(() => {
    refreshBadges();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('request.created', refreshBadges);
      socket.on('request.updated', refreshBadges);
      socket.on('order.created', refreshBadges);
      socket.on('order.updated', refreshBadges);
      socket.on('bill.created', refreshBadges);
      socket.on('bill.updated', refreshBadges);
      socket.on('robot.status', refreshBadges);
      socket.on('robot.heartbeat', refreshBadges);
      socket.on('system.reset', refreshBadges);

      return () => {
        socket.off('request.created', refreshBadges);
        socket.off('request.updated', refreshBadges);
        socket.off('order.created', refreshBadges);
        socket.off('order.updated', refreshBadges);
        socket.off('bill.created', refreshBadges);
        socket.off('bill.updated', refreshBadges);
        socket.off('robot.status', refreshBadges);
        socket.off('robot.heartbeat', refreshBadges);
        socket.off('system.reset', refreshBadges);
      };
    }
  }, [socket]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-teal-500 selection:text-white">
      {/* Toast Alert Notifications */}
      <NotificationToasts />

      {/* Top Header */}
      <Header
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        restaurantName={restaurantName}
        demoMode={demoMode}
        onOpenDemoBar={() => setActiveTab('overview')}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Persistent Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          badgeCounts={badgeCounts}
          demoMode={demoMode}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Hackathon Judge Interactive Demo Toolbar */}
            <DemoBar
              onEventSimulated={refreshBadges}
              onResetDatabase={refreshBadges}
            />

            {/* Active Section Router */}
            {activeTab === 'overview' && (
              <OverviewPage
                onNavigate={(tab) => setActiveTab(tab)}
                onOpenReceipt={(billId) => setActiveBillModalId(billId)}
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
          </div>
        </main>
      </div>

      {/* Global Receipt Inspection & Print Modal */}
      <ReceiptModal
        billId={activeBillModalId}
        onClose={() => setActiveBillModalId(null)}
        onBillUpdated={refreshBadges}
        restaurantName={restaurantName}
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
