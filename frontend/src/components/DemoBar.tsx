import React, { useState } from 'react';
import { api } from '../services/api';
import {
  Sparkles,
  Droplets,
  BellRing,
  Receipt,
  UtensilsCrossed,
  Radio,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface DemoBarProps {
  onEventSimulated?: () => void;
  onResetDatabase?: () => void;
}

export const DemoBar: React.FC<DemoBarProps> = ({ onEventSimulated, onResetDatabase }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const runSimulation = async (scenario: string, label: string) => {
    try {
      setLoadingAction(scenario);
      setStatusMessage(null);
      await api.simulateDemo(scenario);
      setStatusMessage({ text: `Simulated: ${label} (Passed through backend validation & broadcasted)` });
      if (onEventSimulated) onEventSimulated();
    } catch (err: any) {
      setStatusMessage({ text: `Simulation error: ${err.message}`, isError: true });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleResetDb = async () => {
    if (!window.confirm('Reset database to clean initial demo state? This will reseed sample tables, robots, orders, and bills.')) {
      return;
    }
    try {
      setLoadingAction('reset');
      await api.resetDatabase();
      setStatusMessage({ text: 'Database successfully reset to pristine demo state!' });
      if (onResetDatabase) onResetDatabase();
    } catch (err: any) {
      setStatusMessage({ text: `Reset error: ${err.message}`, isError: true });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-slate-900 text-white rounded-2xl p-4 shadow-lg border border-teal-500/30 mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight text-white">
                INNOTech Judge Demonstration Toolbar
              </h3>
              <span className="text-[10px] font-semibold bg-amber-400 text-navy-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Live Simulator
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Simulates XiaoZhi robot events through authenticated backend endpoint <code className="text-teal-300 font-mono text-[11px]">/api/integrations/robot/events</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-700/60 transition"
            title={isExpanded ? 'Collapse toolbar' : 'Expand toolbar'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3.5 pt-3 border-t border-slate-700/60">
          <div className="flex flex-wrap items-center gap-2">
            {/* Table 4 Water */}
            <button
              disabled={loadingAction !== null}
              onClick={() => runSimulation('table4_water', 'Table 4 Water Request')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-sky-500/20 text-sky-200 border border-sky-500/40 hover:bg-sky-500/30 active:scale-95 transition disabled:opacity-50"
            >
              <Droplets className="w-3.5 h-3.5 text-sky-400" />
              <span>Table 4 Requests Water</span>
            </button>

            {/* Table 2 Waiter */}
            <button
              disabled={loadingAction !== null}
              onClick={() => runSimulation('table2_waiter', 'Table 2 Call Waiter')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500/20 text-amber-200 border border-amber-500/40 hover:bg-amber-500/30 active:scale-95 transition disabled:opacity-50"
            >
              <BellRing className="w-3.5 h-3.5 text-amber-400" />
              <span>Table 2 Calls Waiter</span>
            </button>

            {/* Table 3 Bill */}
            <button
              disabled={loadingAction !== null}
              onClick={() => runSimulation('table3_bill', 'Table 3 Request Bill')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 hover:bg-emerald-500/30 active:scale-95 transition disabled:opacity-50"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
              <span>Table 3 Requests Bill</span>
            </button>

            {/* Table 1 Food Order */}
            <button
              disabled={loadingAction !== null}
              onClick={() => runSimulation('table1_food_order', 'Table 1 Food Order')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-purple-500/20 text-purple-200 border border-purple-500/40 hover:bg-purple-500/30 active:scale-95 transition disabled:opacity-50"
            >
              <UtensilsCrossed className="w-3.5 h-3.5 text-purple-400" />
              <span>Table 1 Places Food Order</span>
            </button>

            {/* Robot Online / Offline */}
            <button
              disabled={loadingAction !== null}
              onClick={() => runSimulation('robot_online', 'Robot 1 Online Heartbeat')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-teal-500/20 text-teal-200 border border-teal-500/40 hover:bg-teal-500/30 active:scale-95 transition disabled:opacity-50"
            >
              <Radio className="w-3.5 h-3.5 text-teal-400" />
              <span>Robot 1 Online</span>
            </button>

            {/* Reset Database */}
            <button
              disabled={loadingAction !== null}
              onClick={handleResetDb}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 active:scale-95 transition disabled:opacity-50"
              title="Reset database back to clean demo state"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-rose-400 ${loadingAction === 'reset' ? 'animate-spin' : ''}`} />
              <span>Reset Demo DB</span>
            </button>
          </div>

          {/* Feedback banner */}
          {statusMessage && (
            <div className={`mt-2.5 p-2 rounded-lg text-xs flex items-center gap-2 ${
              statusMessage.isError
                ? 'bg-rose-950/80 text-rose-200 border border-rose-500/40'
                : 'bg-emerald-950/80 text-emerald-200 border border-emerald-500/40'
            }`}>
              {statusMessage.isError ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span className="truncate">{statusMessage.text}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
