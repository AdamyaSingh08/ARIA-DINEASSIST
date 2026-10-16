import React, { useState } from 'react';
import { api } from '../services/api';
import {
  Mic,
  Droplets,
  BellRing,
  Receipt,
  UtensilsCrossed,
  RotateCcw,
  Sparkles,
  Bot,
  Volume2,
  CheckCircle2,
  Radio,
  ChevronDown,
  ChevronUp,
  MapPin
} from 'lucide-react';

interface RobotVoiceControllerProps {
  currentTable: string;
  onTableChange: (tableId: string) => void;
  onEventDispatched: () => void;
}

export const RobotVoiceController: React.FC<RobotVoiceControllerProps> = ({
  currentTable,
  onTableChange,
  onEventDispatched
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeSpeech, setActiveSpeech] = useState<string | null>(null);
  const [robotResponse, setRobotResponse] = useState<string | null>(
    'XiaoZhi is listening at ' + currentTable + '. What would you like to request?'
  );
  const [loading, setLoading] = useState<boolean>(false);

  const simulateCustomerSpeech = async (
    speechText: string,
    action: () => Promise<any>,
    responseTts: string
  ) => {
    try {
      setLoading(true);
      setActiveSpeech(speechText);
      setRobotResponse(`XiaoZhi processing: "${speechText}"...`);

      const res = await action();

      setRobotResponse(`🤖 XiaoZhi Spoke: "${responseTts}"`);
      onEventDispatched();
    } catch (err: any) {
      setRobotResponse(`⚠️ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleWaterRequest = () => {
    simulateCustomerSpeech(
      `"XiaoZhi, can you bring a bottle of cold water to ${currentTable}?"`,
      () =>
        fetch('/api/integrations/robot/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'xiaozhi_secret_key_innotech2026'
          },
          body: JSON.stringify({
            event_id: 'evt-speech-' + Date.now(),
            robot_id: 'robot-01',
            table_id: currentTable,
            type: 'service_request',
            request_type: 'water',
            message: `Customer asked robot for fresh drinking water at ${currentTable}`,
            timestamp: new Date().toISOString()
          })
        }).then(r => r.json()),
      `Right away! I've notified our staff to bring fresh water to your table.`
    );
  };

  const handleWaiterCall = () => {
    simulateCustomerSpeech(
      `"XiaoZhi, please call the waiter / captain for ${currentTable}."`,
      () =>
        fetch('/api/integrations/robot/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'xiaozhi_secret_key_innotech2026'
          },
          body: JSON.stringify({
            event_id: 'evt-speech-' + Date.now(),
            robot_id: 'robot-01',
            table_id: currentTable,
            type: 'service_request',
            request_type: 'waiter',
            message: `Customer requested captain attendance via XiaoZhi at ${currentTable}`,
            timestamp: new Date().toISOString()
          })
        }).then(r => r.json()),
      `Calling the captain now. Someone will be with you in just a moment.`
    );
  };

  const handleFoodOrder = () => {
    simulateCustomerSpeech(
      `"XiaoZhi, we want to order 2 Paneer Tikka and 2 Butter Naan."`,
      () =>
        fetch('/api/integrations/robot/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'xiaozhi_secret_key_innotech2026'
          },
          body: JSON.stringify({
            event_id: 'evt-speech-' + Date.now(),
            robot_id: 'robot-01',
            table_id: currentTable,
            type: 'food_order_submitted',
            items: [
              { menu_item_id: 'item-001', quantity: 2, notes: 'Charred crisp' },
              { menu_item_id: 'item-006', quantity: 2 }
            ],
            special_instructions: 'Customer ordered via XiaoZhi robot voice',
            timestamp: new Date().toISOString()
          })
        }).then(r => r.json()),
      `Got it! 2 Paneer Tikka and 2 Butter Naan (Total ₹580). Kitchen has received your order!`
    );
  };

  const handleBillRequest = () => {
    simulateCustomerSpeech(
      `"XiaoZhi, can you please bring the final bill for ${currentTable}?"`,
      () =>
        fetch('/api/integrations/robot/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'xiaozhi_secret_key_innotech2026'
          },
          body: JSON.stringify({
            event_id: 'evt-speech-' + Date.now(),
            robot_id: 'robot-01',
            table_id: currentTable,
            type: 'bill_requested',
            timestamp: new Date().toISOString()
          })
        }).then(r => r.json()),
      `Certainly! I've requested your bill from the counter. Staff will present your invoice shortly.`
    );
  };

  const handleHeartbeat = async () => {
    try {
      setLoading(true);
      await fetch('/api/integrations/robot/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'xiaozhi_secret_key_innotech2026'
        },
        body: JSON.stringify({
          robot_id: 'robot-01',
          battery_level: 95
        })
      });
      setRobotResponse('XiaoZhi sent keep-alive heartbeat ping to gateway.');
      onEventDispatched();
    } catch (err: any) {
      setRobotResponse(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset database to clean initial state?')) return;
    try {
      setLoading(true);
      await api.resetDatabase();
      setRobotResponse('Database reset to clean state. Ready for new demonstration.');
      onEventDispatched();
    } catch (err: any) {
      setRobotResponse(`Reset error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0B132B]/90 backdrop-blur-md rounded-2xl border border-cyan-500/30 p-4 shadow-xl shadow-cyan-950/20">
      {/* Top Banner */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Mic className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white font-mono tracking-wide">
                XiaoZhi Customer Speech Controller
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 uppercase tracking-wider border border-cyan-500/30">
                Live Simulator
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulates voice commands spoken by a customer to the physical XiaoZhi robot at their table.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Table Selector */}
          <div className="flex items-center gap-1.5 bg-black/50 border border-cyan-500/30 px-2.5 py-1.5 rounded-xl text-xs font-mono">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Robot At:</span>
            <select
              value={currentTable}
              onChange={(e) => onTableChange(e.target.value)}
              className="bg-transparent text-amber-300 font-bold focus:outline-hidden"
            >
              <option value="T01" className="bg-slate-900 text-white">Table 1</option>
              <option value="T02" className="bg-slate-900 text-white">Table 2</option>
              <option value="T03" className="bg-slate-900 text-white">Table 3</option>
              <option value="T04" className="bg-slate-900 text-white">Table 4</option>
              <option value="T05" className="bg-slate-900 text-white">Table 5</option>
              <option value="T06" className="bg-slate-900 text-white">Table 6</option>
            </select>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3.5 pt-3 border-t border-slate-800 space-y-3">
          {/* Voice Prompt Action Triggers */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              disabled={loading}
              onClick={handleWaterRequest}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/30 hover:bg-sky-500/20 active:scale-95 transition disabled:opacity-50"
            >
              <Droplets className="w-3.5 h-3.5 text-sky-400" />
              <span>"XiaoZhi, Bring Water"</span>
            </button>

            <button
              disabled={loading}
              onClick={handleWaiterCall}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 active:scale-95 transition disabled:opacity-50"
            >
              <BellRing className="w-3.5 h-3.5 text-amber-400" />
              <span>"XiaoZhi, Call Waiter"</span>
            </button>

            <button
              disabled={loading}
              onClick={handleFoodOrder}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 active:scale-95 transition disabled:opacity-50"
            >
              <UtensilsCrossed className="w-3.5 h-3.5 text-purple-400" />
              <span>"XiaoZhi, Order Food (₹580)"</span>
            </button>

            <button
              disabled={loading}
              onClick={handleBillRequest}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 active:scale-95 transition disabled:opacity-50"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
              <span>"XiaoZhi, Request Bill"</span>
            </button>

            <button
              disabled={loading}
              onClick={handleHeartbeat}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 active:scale-95 transition disabled:opacity-50"
              title="Send Heartbeat keep-alive"
            >
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ping Heartbeat</span>
            </button>

            <button
              disabled={loading}
              onClick={handleReset}
              className="ml-auto flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 active:scale-95 transition disabled:opacity-50"
              title="Reset DB"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>Reset State</span>
            </button>
          </div>

          {/* XiaoZhi Real-Time Voice Audio Feedback Pill */}
          {robotResponse && (
            <div className="p-2.5 rounded-xl bg-black/60 border border-cyan-500/25 flex items-center gap-2.5 text-xs text-cyan-200 font-mono">
              <Volume2 className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
              <span className="truncate">{robotResponse}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
