import React, { useState } from 'react';
import { api } from '../services/api';
import {
  Droplets,
  Bell,
  UtensilsCrossed,
  Receipt,
  Radio,
  RotateCcw,
  Sparkles,
  MapPin,
  Bot,
  X
} from 'lucide-react';

interface RobotVoiceSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  currentTable: string;
  onTableChange: (tableId: string) => void;
  onEventDispatched: () => void;
}

export const RobotVoiceSimulator: React.FC<RobotVoiceSimulatorProps> = ({
  isOpen,
  onClose,
  currentTable,
  onTableChange,
  onEventDispatched
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(
    `ARIA is standing by at ${currentTable}. Select an interaction to test the physical event flow.`
  );

  if (!isOpen) return null;

  const dispatchEvent = async (
    speechLabel: string,
    action: () => Promise<any>,
    spokenResponse: string
  ) => {
    try {
      setLoading(true);
      setFeedback(`Transmitting to gateway: "${speechLabel}"...`);
      await action();
      setFeedback(`ARIA Spoke: "${spokenResponse}"`);
      onEventDispatched();
    } catch (err: any) {
      setFeedback(`Failed: ${err.message}`);
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
            robot_id: 'robot-01',
            table_id: currentTable,
            type: 'service_request',
            request_type: 'water',
            message: `Customer requested fresh chilled water at ${currentTable}`,
            timestamp: new Date().toISOString()
          })
        }).then(r => r.json()),
      `Water has been requested for ${currentTable}. Staff has been notified.`
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
            robot_id: 'robot-01',
            table_id: currentTable,
            type: 'service_request',
            request_type: 'waiter',
            message: `Customer requested captain attendance at ${currentTable}`,
            timestamp: new Date().toISOString()
          })
        }).then(r => r.json()),
      `The captain has been notified and is on the way to ${currentTable}.`
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
            robot_id: 'robot-01',
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
      `Order confirmed for ${currentTable}: 2 Paneer Tikka, 2 Butter Naan (₹580). Kitchen ticket dispatched.`
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
            robot_id: 'robot-01',
            table_id: currentTable,
            type: 'bill_requested',
            timestamp: new Date().toISOString()
          })
        }).then(r => r.json()),
      `Invoice generated for ${currentTable}. Staff will present your receipt shortly.`
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
        body: JSON.stringify({ robot_id: 'robot-01', battery_level: 95 })
      });
      setFeedback(`Heartbeat ping confirmed from ARIA at ${currentTable}.`);
      onEventDispatched();
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset database to clean initial state?')) return;
    try {
      setLoading(true);
      await api.resetDatabase();
      setFeedback('Database reseeded to clean demo state.');
      onEventDispatched();
    } catch (err: any) {
      setFeedback(`Reset failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-borderLine rounded-lg p-4 shadow-subtle mb-6">
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-borderLine">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-sage-100 text-forest-800 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-charcoal">
                ARIA Robot Interaction Simulator
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sage-100 text-forest-800">
                Hardware Tool
              </span>
            </div>
            <p className="text-[11px] text-muted">
              Simulates customer verbal interactions with ARIA and tests backend event normalization.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Active Table Selector */}
          <div className="flex items-center gap-1.5 text-xs font-mono bg-ivory px-2 py-1 rounded-md border border-borderLine">
            <MapPin className="w-3.5 h-3.5 text-forest-800" />
            <span className="text-muted text-[11px]">Table:</span>
            <select
              value={currentTable}
              onChange={(e) => onTableChange(e.target.value)}
              className="bg-transparent text-charcoal font-semibold focus:outline-hidden"
            >
              <option value="T01">Table 1</option>
              <option value="T02">Table 2</option>
              <option value="T03">Table 3</option>
              <option value="T04">Table 4 (Default)</option>
              <option value="T05">Table 5</option>
              <option value="T06">Table 6</option>
            </select>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted hover:text-charcoal hover:bg-ivory"
            title="Close Simulator"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="pt-3 flex flex-wrap items-center gap-2">
        <button
          disabled={loading}
          onClick={handleWater}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-ivory hover:bg-sage-100 text-charcoal border border-borderLine transition disabled:opacity-50"
        >
          <Droplets className="w-3.5 h-3.5 text-forest-800" />
          <span>Request Water</span>
        </button>

        <button
          disabled={loading}
          onClick={handleWaiter}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-ivory hover:bg-sage-100 text-charcoal border border-borderLine transition disabled:opacity-50"
        >
          <Bell className="w-3.5 h-3.5 text-forest-800" />
          <span>Call Waiter</span>
        </button>

        <button
          disabled={loading}
          onClick={handleOrder}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-ivory hover:bg-sage-100 text-charcoal border border-borderLine transition disabled:opacity-50"
        >
          <UtensilsCrossed className="w-3.5 h-3.5 text-forest-800" />
          <span>Place Food Order (₹580)</span>
        </button>

        <button
          disabled={loading}
          onClick={handleBill}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-ivory hover:bg-sage-100 text-charcoal border border-borderLine transition disabled:opacity-50"
        >
          <Receipt className="w-3.5 h-3.5 text-forest-800" />
          <span>Request Bill</span>
        </button>

        <button
          disabled={loading}
          onClick={handleHeartbeat}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-mono text-muted hover:text-charcoal hover:bg-ivory transition disabled:opacity-50"
        >
          <Radio className="w-3 h-3 text-forest-800" />
          <span>Heartbeat</span>
        </button>

        <button
          disabled={loading}
          onClick={handleReset}
          className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs text-muted hover:text-terracotta hover:bg-terracotta-light transition disabled:opacity-50"
          title="Reset database to demo baseline"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Demo</span>
        </button>
      </div>

      {feedback && (
        <div className="mt-3 px-3 py-2 bg-ivory rounded-md border border-borderLine text-xs font-mono text-charcoal flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-forest-800"></span>
          <span>{feedback}</span>
        </div>
      )}
    </div>
  );
};
