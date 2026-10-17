import React, { useState } from 'react';
import { api } from '../services/api';
import {
  X,
  Sparkles,
  Droplets,
  Bell,
  UtensilsCrossed,
  Receipt,
  Radio,
  RotateCcw,
  Bot,
  MapPin,
  CheckCircle2
} from 'lucide-react';

interface DemoSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventDispatched: () => void;
}

export const DemoSimulatorModal: React.FC<DemoSimulatorModalProps> = ({
  isOpen,
  onClose,
  onEventDispatched
}) => {
  const [currentTable, setCurrentTable] = useState<string>('T04');
  const [loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(
    `ARIA standing by at Table ${currentTable}. Select an interaction to simulate table-side customer speech.`
  );

  if (!isOpen) return null;

  const dispatchEvent = async (
    actionName: string,
    actionFn: () => Promise<any>,
    spokenResponse: string
  ) => {
    try {
      setLoading(true);
      setFeedback(`Transmitting "${actionName}" to restaurant engine...`);
      await actionFn();
      setFeedback(`ARIA Voice Confirmed: "${spokenResponse}"`);
      onEventDispatched();
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleWater = () => {
    dispatchEvent(
      `Water requested at ${currentTable}`,
      () =>
        fetch('/api/integrations/robot/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'aria_secret_key_innotech2026'
          },
          body: JSON.stringify({
            event_id: 'evt-aria-' + Date.now(),
            robot_id: 'aria-robot-01',
            table_id: currentTable,
            type: 'service_request',
            request_type: 'water',
            message: `Customer requested fresh chilled water at ${currentTable}`,
            timestamp: new Date().toISOString()
          })
        }).then(r => r.json()),
      `Water request received for ${currentTable}. Waiter alerted.`
    );
  };

  const handleWaiter = () => {
    dispatchEvent(
      `Waiter called at ${currentTable}`,
      () =>
        fetch('/api/integrations/robot/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'aria_secret_key_innotech2026'
          },
          body: JSON.stringify({
            event_id: 'evt-aria-' + Date.now(),
            robot_id: 'aria-robot-01',
            table_id: currentTable,
            type: 'service_request',
            request_type: 'waiter',
            message: `Customer asked for captain assistance at ${currentTable}`,
            timestamp: new Date().toISOString()
          })
        }).then(r => r.json()),
      `Staff has been notified and is on the way to ${currentTable}.`
    );
  };

  const handleOrder = () => {
    dispatchEvent(
      `Food order submitted from ${currentTable}`,
      () =>
        fetch('/api/integrations/robot/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'aria_secret_key_innotech2026'
          },
          body: JSON.stringify({
            event_id: 'evt-aria-' + Date.now(),
            robot_id: 'aria-robot-01',
            table_id: currentTable,
            type: 'food_order_submitted',
            items: [
              { menu_item_id: 'item-001', quantity: 2, notes: 'Crispy' },
              { menu_item_id: 'item-006', quantity: 2 }
            ],
            special_instructions: 'Customer ordered via ARIA table voice interaction',
            timestamp: new Date().toISOString()
          })
        }).then(r => r.json()),
      `Order confirmed for ${currentTable}: 2 Paneer Tikka, 2 Butter Naan (₹580). Dispatched to Kitchen Display.`
    );
  };

  const handleBill = () => {
    dispatchEvent(
      `Bill requested for ${currentTable}`,
      () =>
        fetch('/api/integrations/robot/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'aria_secret_key_innotech2026'
          },
          body: JSON.stringify({
            event_id: 'evt-aria-' + Date.now(),
            robot_id: 'aria-robot-01',
            table_id: currentTable,
            type: 'bill_requested',
            timestamp: new Date().toISOString()
          })
        }).then(r => r.json()),
      `Invoice prepared for ${currentTable}. Staff notified for settlement.`
    );
  };

  const handleHeartbeat = async () => {
    try {
      setLoading(true);
      await fetch('/api/integrations/robot/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'aria_secret_key_innotech2026'
        },
        body: JSON.stringify({ robot_id: 'aria-robot-01', battery_level: 96 })
      });
      setFeedback(`Heartbeat ping confirmed from ARIA at ${currentTable} (96% battery).`);
      onEventDispatched();
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset database to clean initial hackathon demo baseline?')) return;
    try {
      setLoading(true);
      await api.resetDatabase();
      setFeedback('Database successfully reseeded to clean demo baseline.');
      onEventDispatched();
    } catch (err: any) {
      setFeedback(`Reset failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-forest-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-modal max-w-lg w-full border border-borderLine overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-borderLine flex items-center justify-between bg-surface-warm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-lime-light border border-lime-accent text-forest-900 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4 text-forest-800" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-ink-primary font-sans">
                Demo Voice Interaction Simulator
              </h3>
              <p className="text-[11px] text-ink-secondary">
                Simulates customer verbal prompts spoken to ARIA
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-warmBg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Table Selector */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-warmBg border border-borderLine">
            <div className="flex items-center gap-2 text-xs font-bold text-ink-primary">
              <MapPin className="w-4 h-4 text-forest-800" />
              <span>Simulated Table:</span>
            </div>
            <select
              value={currentTable}
              onChange={(e) => {
                setCurrentTable(e.target.value);
                setFeedback(`ARIA re-assigned to ${e.target.value}. Ready for interaction.`);
              }}
              className="text-xs font-mono font-bold px-3 py-1.5 bg-white border border-borderLine rounded-lg text-ink-primary focus:outline-hidden"
            >
              <option value="T01">Table 1 (T01)</option>
              <option value="T02">Table 2 (T02)</option>
              <option value="T03">Table 3 (T03)</option>
              <option value="T04">Table 4 (T04 - Default)</option>
              <option value="T05">Table 5 (T05)</option>
              <option value="T06">Table 6 (T06)</option>
            </select>
          </div>

          {/* Trigger Buttons Grid */}
          <div className="grid grid-cols-2 gap-3">
            <button
              disabled={loading}
              onClick={handleWater}
              className="flex items-center gap-2.5 p-3.5 rounded-xl bg-surface-warm hover:bg-warmBg border border-borderLine text-xs font-bold text-ink-primary shadow-xs transition min-h-[48px] disabled:opacity-50"
            >
              <Droplets className="w-4 h-4 text-forest-800" />
              <span>Request Water</span>
            </button>

            <button
              disabled={loading}
              onClick={handleWaiter}
              className="flex items-center gap-2.5 p-3.5 rounded-xl bg-surface-warm hover:bg-warmBg border border-borderLine text-xs font-bold text-ink-primary shadow-xs transition min-h-[48px] disabled:opacity-50"
            >
              <Bell className="w-4 h-4 text-terracotta" />
              <span>Call Waiter</span>
            </button>

            <button
              disabled={loading}
              onClick={handleOrder}
              className="flex items-center gap-2.5 p-3.5 rounded-xl bg-surface-warm hover:bg-warmBg border border-borderLine text-xs font-bold text-ink-primary shadow-xs transition min-h-[48px] disabled:opacity-50"
            >
              <UtensilsCrossed className="w-4 h-4 text-forest-800" />
              <span>Order Food (₹580)</span>
            </button>

            <button
              disabled={loading}
              onClick={handleBill}
              className="flex items-center gap-2.5 p-3.5 rounded-xl bg-surface-warm hover:bg-warmBg border border-borderLine text-xs font-bold text-ink-primary shadow-xs transition min-h-[48px] disabled:opacity-50"
            >
              <Receipt className="w-4 h-4 text-amber-dark" />
              <span>Request Bill</span>
            </button>
          </div>

          {/* Heartbeat & Reset Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-borderLine">
            <button
              disabled={loading}
              onClick={handleHeartbeat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-ink-secondary hover:text-ink-primary hover:bg-warmBg transition"
            >
              <Radio className="w-3.5 h-3.5 text-forest-800" />
              <span>Send Heartbeat</span>
            </button>

            <button
              disabled={loading}
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-terracotta hover:bg-terracotta-light transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Baseline</span>
            </button>
          </div>

          {/* Feedback Display */}
          {feedback && (
            <div className="p-3 bg-surface-warm rounded-xl border border-borderLine text-xs font-mono text-ink-primary flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-forest-800 shrink-0 mt-1" />
              <span>{feedback}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
