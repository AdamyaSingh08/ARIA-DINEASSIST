import React, { useState, useEffect } from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import { Header } from './components/Header';
import { RobotVoiceController } from './components/RobotVoiceController';
import { NotificationToasts } from './components/NotificationToast';
import { ReceiptModal } from './components/ReceiptModal';

import { SingleRobotCommandPage } from './pages/SingleRobotCommandPage';
import { BillingReceiptsPage } from './pages/BillingReceiptsPage';
import { HardwareBridgePage } from './pages/HardwareBridgePage';

import {
  Radio,
  Receipt,
  Cpu,
  Bot
} from 'lucide-react';

const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'command' | 'billing' | 'gateway'>('command');
  const [currentTable, setCurrentTable] = useState<string>('T04');
  const [activeBillModalId, setActiveBillModalId] = useState<string | null>(null);
  const [showSimulator, setShowSimulator] = useState<boolean>(true);

  return (
    <div className="min-h-screen bg-[#060B14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Toast Alert Notifications */}
      <NotificationToasts />

      {/* Futuristic Cyber Header */}
      <Header
        robotLocation={currentTable}
        isRobotOnline={true}
        onOpenSimulator={() => setShowSimulator(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Customer Voice Simulator to XiaoZhi */}
        {showSimulator && (
          <RobotVoiceController
            currentTable={currentTable}
            onTableChange={(tableId) => setCurrentTable(tableId)}
            onEventDispatched={() => {}}
          />
        )}

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 font-mono text-xs">
          <button
            onClick={() => setActiveTab('command')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition font-bold ${
              activeTab === 'command'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-[#0B132B] text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>ROBOT COMMAND CENTER</span>
          </button>

          <button
            onClick={() => setActiveTab('billing')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition font-bold ${
              activeTab === 'billing'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-[#0B132B] text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>TABLE INVOICES & BILLS</span>
          </button>

          <button
            onClick={() => setActiveTab('gateway')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition font-bold ${
              activeTab === 'gateway'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-[#0B132B] text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>ESP32 HARDWARE GATEWAY</span>
          </button>
        </div>

        {/* View Router */}
        {activeTab === 'command' && (
          <SingleRobotCommandPage
            currentTable={currentTable}
            onTableChange={(tableId) => setCurrentTable(tableId)}
            onOpenReceipt={(billId) => setActiveBillModalId(billId)}
            onViewBilling={() => setActiveTab('billing')}
          />
        )}

        {activeTab === 'billing' && (
          <BillingReceiptsPage
            onOpenReceipt={(billId) => setActiveBillModalId(billId)}
          />
        )}

        {activeTab === 'gateway' && <HardwareBridgePage />}
      </main>

      {/* Receipt & Payment Settlement Modal */}
      <ReceiptModal
        billId={activeBillModalId}
        onClose={() => setActiveBillModalId(null)}
        restaurantName="DineAssist AI Restaurant"
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
