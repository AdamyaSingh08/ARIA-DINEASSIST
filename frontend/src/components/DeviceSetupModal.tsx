import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  X,
  Sliders,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Server,
  ShieldCheck,
  Bot,
  Terminal,
  ExternalLink
} from 'lucide-react';

interface DeviceSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

export const DeviceSetupModal: React.FC<DeviceSetupModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved
}) => {
  const [activeTab, setActiveTab] = useState<'endpoint' | 'server'>('endpoint');
  const [loading, setLoading] = useState<boolean>(true);
  const [testing, setTesting] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Form State
  const [endpointUrl, setEndpointUrl] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [transport, setTransport] = useState<'auto' | 'sse' | 'websocket' | 'http'>('auto');
  const [robotId, setRobotId] = useState<string>('aria-robot-01');
  const [enabled, setEnabled] = useState<boolean>(true);

  // Diagnostics State
  const [diagnostics, setDiagnostics] = useState<{
    status: string;
    message: string;
    transportUsed?: string;
    latencyMs?: number;
    lastChecked?: string;
  } | null>(null);

  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await api.getXiaozhiStatus();
      if (res && res.config) {
        setEndpointUrl(res.config.endpointUrl || '');
        setTransport((res.config.transport as any) || 'auto');
        setRobotId(res.config.robotId || 'aria-robot-01');
        setEnabled(res.config.enabled);
      }
      if (res && res.diagnostics) {
        setDiagnostics(res.diagnostics);
      }
    } catch (err: any) {
      console.error('Failed to load XiaoZhi config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      const res = await api.testXiaozhiConnection({
        endpointUrl: endpointUrl.trim(),
        transport,
        token: token.trim(),
        robotId: robotId.trim()
      });
      setDiagnostics(res.diagnostics);
    } catch (err: any) {
      setDiagnostics({
        status: 'error',
        message: err.message || 'Connection test failed',
        lastChecked: new Date().toISOString()
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.saveXiaozhiConfig({
        endpointUrl: endpointUrl.trim(),
        transport,
        token: token.trim() || undefined,
        robotId: robotId.trim(),
        enabled
      });
      // Run quick verification test on save
      await handleTestConnection();
      if (onConfigSaved) onConfigSaved();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const lanEndpointUrl = `${window.location.protocol}//${window.location.hostname}:5000/api/mcp`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-forest-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-modal max-w-2xl w-full border border-borderLine overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-borderLine flex items-center justify-between bg-surface-warm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-forest-800 text-lime-accent flex items-center justify-center shadow-xs">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-ink-primary font-sans">
                XiaoZhi MCP Device Setup
              </h2>
              <p className="text-xs text-ink-secondary">
                Configure table-side robot hardware connection and MCP tool binding
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-warmBg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-borderLine bg-warmBg px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('endpoint')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'endpoint'
                ? 'border-forest-800 text-forest-800'
                : 'border-transparent text-ink-secondary hover:text-ink-primary'
            }`}
          >
            XiaoZhi Connection Settings
          </button>
          <button
            onClick={() => setActiveTab('server')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'server'
                ? 'border-forest-800 text-forest-800'
                : 'border-transparent text-ink-secondary hover:text-ink-primary'
            }`}
          >
            Exposed ARIA MCP Tools Server
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'endpoint' ? (
            <form onSubmit={handleSaveConfig} className="space-y-4">
              {/* Endpoint URL Input */}
              <div>
                <label className="block text-xs font-bold text-ink-primary mb-1">
                  XiaoZhi MCP Endpoint URL
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. ws://192.168.1.105:8080/mcp or http://192.168.1.105:5000/api/mcp"
                    value={endpointUrl}
                    onChange={(e) => setEndpointUrl(e.target.value)}
                    className="w-full text-xs font-mono px-3.5 py-3 bg-surface-warm border border-borderLine rounded-xl text-ink-primary focus:outline-hidden focus:border-forest-800 focus:ring-1 focus:ring-forest-800"
                  />
                </div>
                <p className="text-[11px] text-ink-secondary mt-1">
                  Supports WebSocket (<code>ws://</code>, <code>wss://</code>) and Streamable HTTP (<code>http://</code>, <code>https://</code>).
                </p>
              </div>

              {/* Authentication Token & Robot Identifier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink-primary mb-1">
                    Authentication Token (Optional)
                  </label>
                  <input
                    type="password"
                    placeholder="Bearer token or secret key..."
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full text-xs font-mono px-3.5 py-2.5 bg-surface-warm border border-borderLine rounded-xl text-ink-primary focus:outline-hidden focus:border-forest-800"
                  />
                  <p className="text-[10px] text-ink-muted mt-1">Stored securely on server. Never exposed to browser bundles.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-primary mb-1">
                    Primary Robot Station ID
                  </label>
                  <input
                    type="text"
                    value={robotId}
                    onChange={(e) => setRobotId(e.target.value)}
                    className="w-full text-xs font-mono px-3.5 py-2.5 bg-surface-warm border border-borderLine rounded-xl text-ink-primary focus:outline-hidden focus:border-forest-800"
                  />
                  <p className="text-[10px] text-ink-muted mt-1">Physical hardware identifier (e.g. <code>aria-robot-01</code>).</p>
                </div>
              </div>

              {/* Transport Protocol & Integration Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink-primary mb-1">
                    Transport Protocol
                  </label>
                  <select
                    value={transport}
                    onChange={(e) => setTransport(e.target.value as any)}
                    className="w-full text-xs font-mono px-3.5 py-2.5 bg-surface-warm border border-borderLine rounded-xl text-ink-primary focus:outline-hidden focus:border-forest-800"
                  >
                    <option value="auto">Auto-negotiate (Recommended)</option>
                    <option value="websocket">WebSocket (MCP / Stream)</option>
                    <option value="sse">Server-Sent Events (SSE)</option>
                    <option value="http">Streamable HTTP (JSON-RPC 2.0)</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <input
                    type="checkbox"
                    id="enableIntegration"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-forest-800 focus:ring-forest-800"
                  />
                  <label htmlFor="enableIntegration" className="text-xs font-bold text-ink-primary cursor-pointer">
                    Enable XiaoZhi MCP Integration
                  </label>
                </div>
              </div>

              {/* Diagnostics Box */}
              {diagnostics && (
                <div className={`p-4 rounded-xl border text-xs font-sans ${
                  diagnostics.status === 'connected'
                    ? 'bg-completed-light border-completed/40 text-forest-900'
                    : diagnostics.status === 'connecting'
                    ? 'bg-amber-light border-amber/40 text-amber-dark'
                    : 'bg-surface-warm border-borderLine text-ink-primary'
                }`}>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-borderLine/50 font-mono text-[11px] font-bold">
                    <span className="flex items-center gap-1.5 uppercase">
                      {diagnostics.status === 'connected' && <CheckCircle2 className="w-4 h-4 text-completed-dark" />}
                      {diagnostics.status === 'error' && <AlertCircle className="w-4 h-4 text-terracotta" />}
                      STATUS: {diagnostics.status.toUpperCase()}
                    </span>
                    {diagnostics.latencyMs !== undefined && (
                      <span className="text-ink-secondary">{diagnostics.latencyMs}ms latency</span>
                    )}
                  </div>
                  <p className="font-mono text-xs">{diagnostics.message}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-end gap-3 border-t border-borderLine">
                <button
                  type="button"
                  disabled={testing}
                  onClick={handleTestConnection}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-surface-warm hover:bg-warmBg text-ink-primary border border-borderLine transition shadow-xs min-h-[44px] disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 text-forest-800 ${testing ? 'animate-spin' : ''}`} />
                  <span>{testing ? 'Testing Handshake...' : 'Test Connection'}</span>
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-forest-800 hover:bg-forest-900 text-white transition shadow-sm min-h-[44px] disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4 text-lime-accent" />
                  <span>{saving ? 'Saving...' : 'Save & Connect'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* Tab 2: ARIA MCP Tool Server Reference */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-surface-warm border border-borderLine">
                <h4 className="text-xs font-bold text-ink-primary mb-1 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-forest-800" />
                  <span>ARIA Built-In MCP Tool Server Endpoint</span>
                </h4>
                <p className="text-[11px] text-ink-secondary mb-3">
                  If your XiaoZhi agent platform or LLM gateway registers external MCP tool servers, provide this endpoint:
                </p>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-borderLine font-mono text-xs text-ink-primary">
                  <span className="truncate">{lanEndpointUrl}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(lanEndpointUrl);
                      setCopiedUrl(true);
                      setTimeout(() => setCopiedUrl(false), 2000);
                    }}
                    className="ml-2 px-2.5 py-1 rounded bg-forest-50 hover:bg-forest-100 text-forest-800 font-bold text-[11px] flex items-center gap-1 transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Registered Tools List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-ink-primary">Exposed MCP Tools:</h4>
                <div className="grid grid-cols-1 gap-2 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-surface-warm border border-borderLine">
                    <span className="font-bold text-forest-800 block">aria_create_service_request</span>
                    <span className="text-[11px] text-ink-secondary block font-sans mt-0.5">
                      Customer asks for water, waiter, or help. Inserts real-time ticket on waiter console.
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-surface-warm border border-borderLine">
                    <span className="font-bold text-forest-800 block">aria_submit_food_order</span>
                    <span className="text-[11px] text-ink-secondary block font-sans mt-0.5">
                      Dispatches kitchen order items to KDS screen. Authoritatively verifies database pricing.
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-surface-warm border border-borderLine">
                    <span className="font-bold text-forest-800 block">aria_request_bill</span>
                    <span className="text-[11px] text-ink-secondary block font-sans mt-0.5">
                      Generates or links open table bill and alerts the service and cashier staff.
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-surface-warm border border-borderLine">
                    <span className="font-bold text-forest-800 block">aria_get_table_status</span>
                    <span className="text-[11px] text-ink-secondary block font-sans mt-0.5">
                      Returns live table occupancy, active food orders, and unpaid balance to the AI agent.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
