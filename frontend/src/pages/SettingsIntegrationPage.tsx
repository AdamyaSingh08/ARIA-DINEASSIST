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
  Wifi,
  ExternalLink,
  ShieldCheck,
  Bot
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
        table_id: 'T04',
        type: 'service_request',
        request_type: 'water',
        message: 'Customer requested fresh drinking water via ARIA rover',
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
          'X-API-Key': settings.robot_api_key || 'aria_secret_key_innotech2026'
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
    <div className="space-y-6 max-w-5xl">
      {/* Title Bar */}
      <div className="pb-4 border-b border-borderLine">
        <h2 className="font-serif text-2xl font-normal text-charcoal tracking-tight">ARIA Hardware Gateway & Integration</h2>
        <p className="text-xs text-muted mt-1 font-sans">
          ESP32-S3 rover endpoint configuration, authenticated API keys, and packet test harness.
        </p>
      </div>

      {/* Grid: Parameters Form & Hardware Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Configuration Form */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-borderLine shadow-2xs p-5">
          <div className="flex items-center justify-between pb-3 border-b border-borderLine mb-4">
            <h3 className="font-serif text-base font-normal text-charcoal">Hospitality & Gateway Parameters</h3>
            {savedSuccess && (
              <span className="flex items-center gap-1 text-[11px] font-mono font-medium text-forest-800 bg-sage-100 px-2 py-0.5 rounded border border-sage-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Saved
              </span>
            )}
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-charcoal mb-1">Restaurant Facility Name</label>
              <input
                type="text"
                value={settings.restaurant_name || ''}
                onChange={(e) => setSettings({ ...settings, restaurant_name: e.target.value })}
                className="w-full text-xs px-3 py-1.5 bg-ivory border border-borderLine rounded-md text-charcoal focus:outline-hidden focus:border-forest-700"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">GST Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.tax_rate || '5.0'}
                  onChange={(e) => setSettings({ ...settings, tax_rate: e.target.value })}
                  className="w-full text-xs px-3 py-1.5 bg-ivory border border-borderLine rounded-md font-mono text-charcoal focus:outline-hidden focus:border-forest-700"
                />
                <span className="text-[10px] text-muted font-sans mt-0.5 block">Standard GST rate: 5.0%</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">Currency Symbol</label>
                <input
                  type="text"
                  value={settings.currency_symbol || '₹'}
                  onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
                  className="w-full text-xs px-3 py-1.5 bg-ivory border border-borderLine rounded-md font-mono text-charcoal focus:outline-hidden focus:border-forest-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-charcoal mb-1">ARIA Rover Secret API Key</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.robot_api_key || ''}
                  onChange={(e) => setSettings({ ...settings, robot_api_key: e.target.value })}
                  className="flex-1 text-xs px-3 py-1.5 bg-ivory border border-borderLine rounded-md font-mono text-charcoal focus:outline-hidden focus:border-forest-700"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(settings.robot_api_key || '')}
                  className="px-3 py-1.5 rounded-md border border-borderLine bg-forest-50 text-xs font-medium text-charcoal hover:bg-forest-100 transition-colors flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-muted" />
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <span className="text-[10px] text-muted font-mono mt-1 block">
                Required in header <code className="text-forest-900 bg-forest-50 px-1 py-0.5 rounded border border-borderLine">X-API-Key</code> for ESP32 packet authentication.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">Heartbeat Timeout (sec)</label>
                <input
                  type="number"
                  value={settings.heartbeat_timeout_seconds || '90'}
                  onChange={(e) => setSettings({ ...settings, heartbeat_timeout_seconds: e.target.value })}
                  className="w-full text-xs px-3 py-1.5 bg-ivory border border-borderLine rounded-md font-mono text-charcoal focus:outline-hidden focus:border-forest-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">Fleet Ingestion Mode</label>
                <select
                  value={settings.demo_mode || 'true'}
                  onChange={(e) => setSettings({ ...settings, demo_mode: e.target.value })}
                  className="w-full text-xs px-3 py-1.5 bg-ivory border border-borderLine rounded-md text-charcoal focus:outline-hidden focus:border-forest-700"
                >
                  <option value="true">Hybrid (Physical ESP32 + Demo Simulator)</option>
                  <option value="false">Strict (Physical Hardware Only)</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-forest-800 hover:bg-forest-900 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5 text-citrus" />
                <span>Save Parameters</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Hardware Node Card */}
        <div className="bg-forest-900 text-white rounded-lg p-5 border border-forest-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Server className="w-4 h-4 text-citrus" />
              <h3 className="font-serif text-base font-normal text-white">ARIA Gateway Node</h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded bg-forest-850 border border-forest-800">
                <span className="text-[10px] uppercase font-mono tracking-wider text-sage-300 block">Events Ingestion</span>
                <code className="text-white font-mono text-[11px] block mt-0.5 break-all">
                  POST /api/integrations/robot/events
                </code>
              </div>

              <div className="p-2.5 rounded bg-forest-850 border border-forest-800">
                <span className="text-[10px] uppercase font-mono tracking-wider text-sage-300 block">Telemetry Ping</span>
                <code className="text-white font-mono text-[11px] block mt-0.5 break-all">
                  POST /api/integrations/robot/heartbeat
                </code>
              </div>

              <div className="p-2.5 rounded bg-forest-850 border border-forest-800">
                <span className="text-[10px] uppercase font-mono tracking-wider text-sage-300 block">Health Check</span>
                <code className="text-white font-mono text-[11px] block mt-0.5 break-all">
                  GET /api/integrations/robot/health
                </code>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-forest-800 text-[11px] text-sage-300 leading-relaxed font-sans">
            <strong className="text-white">Wi-Fi Gateway Notice:</strong>
            <p className="mt-1">
              Connect your ESP32-S3 ARIA rover to the same local Wi-Fi network and direct HTTP packets to this workstation's LAN IP address on port 5000.
            </p>
          </div>
        </div>
      </div>

      {/* Packet Test Harness */}
      <div className="bg-white rounded-lg border border-borderLine shadow-2xs p-5">
        <div className="flex items-center justify-between pb-3 border-b border-borderLine mb-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-forest-700" />
            <div>
              <h3 className="font-serif text-base font-normal text-charcoal">ARIA Packet Test Harness</h3>
              <p className="text-[11px] text-muted">
                Directly transmit test JSON payloads to verify schema validation, idempotency, and real-time dashboard propagation.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setTestPayload(JSON.stringify({
                  event_id: 'evt-water-' + Date.now(),
                  robot_id: 'robot-01',
                  table_id: 'T04',
                  type: 'service_request',
                  request_type: 'water',
                  message: 'Customer requested fresh drinking water',
                  timestamp: new Date().toISOString()
                }, null, 2));
              }}
              className="px-2.5 py-1 bg-forest-50 hover:bg-forest-100 rounded text-xs font-mono text-charcoal border border-borderLine transition-colors"
            >
              Water Call
            </button>
            <button
              onClick={() => {
                setTestPayload(JSON.stringify({
                  event_id: 'evt-food-' + Date.now(),
                  robot_id: 'robot-01',
                  table_id: 'T04',
                  type: 'food_order_submitted',
                  items: [
                    { menu_item_id: 'item-001', quantity: 2, notes: 'Crispy' },
                    { menu_item_id: 'item-011', quantity: 2 }
                  ],
                  special_instructions: 'Serve quickly',
                  timestamp: new Date().toISOString()
                }, null, 2));
              }}
              className="px-2.5 py-1 bg-forest-50 hover:bg-forest-100 rounded text-xs font-mono text-charcoal border border-borderLine transition-colors"
            >
              Food Order
            </button>
            <button
              onClick={() => {
                setTestPayload(JSON.stringify({
                  event_id: 'evt-bill-' + Date.now(),
                  robot_id: 'robot-01',
                  table_id: 'T04',
                  type: 'bill_requested',
                  timestamp: new Date().toISOString()
                }, null, 2));
              }}
              className="px-2.5 py-1 bg-forest-50 hover:bg-forest-100 rounded text-xs font-mono text-charcoal border border-borderLine transition-colors"
            >
              Bill Call
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">Payload Editor:</label>
            <textarea
              rows={9}
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              className="w-full text-xs font-mono p-3 bg-ivory text-charcoal border border-borderLine rounded-md focus:outline-hidden focus:border-forest-700"
            />
            <button
              disabled={isTesting}
              onClick={handleSendTestEvent}
              className="mt-2.5 px-3.5 py-1.5 bg-forest-800 hover:bg-forest-900 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5 text-citrus" />
              <span>{isTesting ? 'Sending...' : 'Transmit Packet'}</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">Gateway Ingestion Response:</label>
            <div className="h-[188px] bg-ivory border border-borderLine rounded-md p-3 overflow-y-auto font-mono text-xs">
              {testResult ? (
                <div>
                  <div className={`font-bold mb-1.5 ${testResult.ok ? 'text-forest-800' : 'text-terracotta'}`}>
                    HTTP {testResult.status} {testResult.ok ? 'SUCCESS' : 'FAILED'}
                  </div>
                  <pre className="text-[11px] whitespace-pre-wrap text-charcoal">
                    {JSON.stringify(testResult.data || testResult.error, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-muted/60 italic py-16 text-center font-sans">
                  Transmit a packet to inspect the JSON acknowledgement response.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
