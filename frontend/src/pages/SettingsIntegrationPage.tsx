import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Cpu,
  Key,
  Save,
  CheckCircle2,
  Copy,
  Terminal,
  Send,
  AlertCircle,
  HelpCircle,
  Server,
  Sparkles,
  Wifi,
  ExternalLink
} from 'lucide-react';

export const SettingsIntegrationPage: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);

  // Live Test Payload Runner State
  const [testPayload, setTestPayload] = useState<string>(
    JSON.stringify(
      {
        event_id: 'test-evt-' + Date.now(),
        robot_id: 'robot-01',
        table_id: 'T01',
        type: 'service_request',
        request_type: 'water',
        message: 'Customer requested fresh drinking water',
        timestamp: new Date().toISOString()
      },
      null,
      2
    )
  );
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSettings();
      setSettings(data);
    } catch (err: any) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(`Could not save settings: ${err.message}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleSendTestEvent = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      const parsed = JSON.parse(testPayload);

      const res = await fetch('/api/integrations/robot/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': settings.robot_api_key || 'xiaozhi_secret_key_innotech2026'
        },
        body: JSON.stringify(parsed)
      });

      const json = await res.json();
      setTestResult({ status: res.status, ok: res.ok, data: json });
    } catch (err: any) {
      setTestResult({ status: 500, ok: false, error: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold text-navy-900 tracking-tight">Robot Integration & System Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          XiaoZhi (Xhaizi) hardware gateway configuration, authenticated API keys, and event schemas.
        </p>
      </div>

      {/* Grid: Settings Form & Gateway Keys */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Settings Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
            <h3 className="font-bold text-sm text-slate-900">Application Parameters</h3>
            {savedSuccess && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Settings Saved
              </span>
            )}
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Restaurant Name</label>
              <input
                type="text"
                value={settings.restaurant_name || ''}
                onChange={(e) => setSettings({ ...settings, restaurant_name: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GST / Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.tax_rate || '5.0'}
                  onChange={(e) => setSettings({ ...settings, tax_rate: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500"
                />
                <span className="text-[10px] text-slate-400">Sample default for INNOTech demo: 5.0% GST</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Currency Symbol</label>
                <input
                  type="text"
                  value={settings.currency_symbol || '₹'}
                  onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Robot API Key (Secret)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.robot_api_key || ''}
                  onChange={(e) => setSettings({ ...settings, robot_api_key: e.target.value })}
                  className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-1 focus:ring-teal-500"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(settings.robot_api_key || '')}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <span className="text-[10px] text-slate-400">
                Required in header <code className="text-teal-700 font-mono">X-API-Key</code> for all robot device requests.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Heartbeat Timeout (Seconds)</label>
                <input
                  type="number"
                  value={settings.heartbeat_timeout_seconds || '90'}
                  onChange={(e) => setSettings({ ...settings, heartbeat_timeout_seconds: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500"
                />
                <span className="text-[10px] text-slate-400">Robots marked offline if no ping received</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Operation Mode</label>
                <select
                  value={settings.demo_mode || 'true'}
                  onChange={(e) => setSettings({ ...settings, demo_mode: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500"
                >
                  <option value="true">Demo Mode (Simulations + Hardware Allowed)</option>
                  <option value="false">Production Mode (Strict Physical Hardware)</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
              >
                <Save className="w-4 h-4" />
                <span>Save System Settings</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Col: Gateway Specs Card */}
        <div className="bg-gradient-to-br from-navy-900 to-navy-950 text-white rounded-2xl p-6 shadow-md border border-navy-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Server className="w-5 h-5 text-teal-400" />
              <h3 className="font-bold text-sm text-white">IoT Gateway Specs</h3>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-navy-800/80 border border-navy-700">
                <span className="text-[10px] uppercase text-teal-400 font-bold block">Robot Events Endpoint</span>
                <code className="text-white font-mono text-[11px] block mt-1 break-all">
                  POST /api/integrations/robot/events
                </code>
              </div>

              <div className="p-3 rounded-xl bg-navy-800/80 border border-navy-700">
                <span className="text-[10px] uppercase text-teal-400 font-bold block">Heartbeat Endpoint</span>
                <code className="text-white font-mono text-[11px] block mt-1 break-all">
                  POST /api/integrations/robot/heartbeat
                </code>
              </div>

              <div className="p-3 rounded-xl bg-navy-800/80 border border-navy-700">
                <span className="text-[10px] uppercase text-teal-400 font-bold block">Health & Discovery</span>
                <code className="text-white font-mono text-[11px] block mt-1 break-all">
                  GET /api/integrations/robot/health
                </code>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-navy-800 text-[11px] text-slate-400 leading-relaxed">
            <strong className="text-white">Physical Robot Wi-Fi Notice:</strong>
            <p className="mt-1">
              When running on your laptop, the robot cannot use <code className="text-amber-300">localhost</code>. 
              Find your laptop Wi-Fi IP (e.g. <code className="text-teal-300">192.168.1.100</code>) via <code className="text-teal-300">ipconfig</code> and point the robot there.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: Interactive Robot API Tester */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-teal-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-900">Live Robot Event Tester</h3>
              <p className="text-[11px] text-slate-500">
                POST raw JSON payloads directly to the backend to test idempotency, price verification, and real-time alerts.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setTestPayload(JSON.stringify({
                  event_id: 'evt-water-' + Date.now(),
                  robot_id: 'robot-04',
                  table_id: 'T04',
                  type: 'service_request',
                  request_type: 'water',
                  message: 'Customer requested chilled water',
                  timestamp: new Date().toISOString()
                }, null, 2));
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition"
            >
              Water Sample
            </button>
            <button
              onClick={() => {
                setTestPayload(JSON.stringify({
                  event_id: 'evt-food-' + Date.now(),
                  robot_id: 'robot-01',
                  table_id: 'T01',
                  type: 'food_order_submitted',
                  items: [
                    { menu_item_id: 'item-001', quantity: 2, notes: 'Extra spicy' },
                    { menu_item_id: 'item-011', quantity: 2 }
                  ],
                  special_instructions: 'Serve quickly',
                  timestamp: new Date().toISOString()
                }, null, 2));
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition"
            >
              Food Order Sample
            </button>
            <button
              onClick={() => {
                setTestPayload(JSON.stringify({
                  event_id: 'evt-bill-' + Date.now(),
                  robot_id: 'robot-03',
                  table_id: 'T03',
                  type: 'bill_requested',
                  timestamp: new Date().toISOString()
                }, null, 2));
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition"
            >
              Bill Request Sample
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">JSON Payload:</label>
            <textarea
              rows={10}
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              className="w-full text-xs font-mono p-3 bg-slate-900 text-teal-300 rounded-xl focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
            />
            <button
              disabled={isTesting}
              onClick={handleSendTestEvent}
              className="mt-3 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isTesting ? 'Dispatching...' : 'POST to /api/integrations/robot/events'}</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Backend HTTP Response:</label>
            <div className="h-[210px] bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-y-auto font-mono text-xs text-slate-800">
              {testResult ? (
                <div>
                  <div className={`font-bold mb-2 ${testResult.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
                    HTTP Status: {testResult.status} {testResult.ok ? 'OK' : 'ERROR'}
                  </div>
                  <pre className="text-[11px] whitespace-pre-wrap">
                    {JSON.stringify(testResult.data || testResult.error, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-slate-400 italic py-16 text-center">
                  Click dispatch to send payload and view backend response here.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: XiaoZhi (Xhaizi) Architecture Guide */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
        <h3 className="font-bold text-sm text-navy-900 mb-2 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-teal-600" />
          <span>XiaoZhi Hardware Architecture & Bridge Guide</span>
        </h3>
        <div className="text-xs text-slate-600 space-y-2.5 leading-relaxed">
          <p>
            <strong>1. Separation of Concerns:</strong> XiaoZhi's native protocol uses a WebSocket/UDP stream for bidirectional audio (microphone to ASR and TTS to speaker). DineAssist separates this voice audio stream from restaurant business events.
          </p>
          <p>
            <strong>2. Bridge Integration:</strong> When the voice model identifies an intent ("I want water", "Can you bring the bill?", or ordered dishes), the XiaoZhi backend or ESP-IDF firmware extension invokes an HTTP POST to:
            <code className="bg-white px-2 py-0.5 rounded border border-slate-300 text-teal-800 font-mono ml-1">
              POST http://&lt;LAPTOP_IP&gt;:5000/api/integrations/robot/events
            </code>
          </p>
          <p>
            <strong>3. Outbound Robot Voice:</strong> DineAssist returns an acknowledgement payload containing text which can be spoken back by XiaoZhi to confirm to the customer that kitchen staff has received the order.
          </p>
          <p>
            <strong>4. Idempotency:</strong> Every robot event must supply a unique <code className="font-mono text-slate-800">event_id</code>. Retried transmissions are automatically deduplicated.
          </p>
        </div>
      </div>
    </div>
  );
};
