import React, { useState } from 'react';
import {
  Cpu,
  Key,
  Copy,
  Terminal,
  Send,
  Wifi,
  Radio,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const HardwareBridgePage: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [apiKey] = useState('xiaozhi_secret_key_innotech2026');
  const [gatewayUrl] = useState('http://10.21.221.165:5000/api/integrations/robot/events');

  const [testPayload, setTestPayload] = useState(JSON.stringify({
    event_id: 'test-evt-' + Date.now(),
    robot_id: 'robot-01',
    table_id: 'T04',
    type: 'service_request',
    request_type: 'water',
    message: 'Customer requested water via physical robot'
  }, null, 2));

  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const handleSendTest = async () => {
    try {
      setTesting(true);
      const res = await fetch('/api/integrations/robot/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: testPayload
      });
      const json = await res.json();
      setTestResult({ status: res.status, data: json });
    } catch (err: any) {
      setTestResult({ status: 500, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight font-mono">
          XiaoZhi Robot Hardware Gateway
        </h2>
        <p className="text-xs text-slate-400 mt-0.5 font-mono">
          ESP32-S3 live network parameters, authentication credentials, and packet dispatcher.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gateway URL Card */}
        <div className="bg-[#0B132B]/90 border border-cyan-500/30 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-[10px] uppercase font-mono font-bold text-cyan-400">
              Wi-Fi Ingestion Endpoint
            </span>
            <span className="text-xs font-mono text-emerald-400">PORT 5000</span>
          </div>
          <div className="mt-3 flex items-center justify-between bg-black/50 p-2.5 rounded-xl border border-slate-800 font-mono text-xs text-white break-all">
            <span>{gatewayUrl}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(gatewayUrl);
                setCopiedUrl(true);
                setTimeout(() => setCopiedUrl(false), 2000);
              }}
              className="ml-2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">
            Ensure your XiaoZhi ESP32 robot is connected to the same Wi-Fi and sends POST requests to this IP.
          </p>
        </div>

        {/* API Key Card */}
        <div className="bg-[#0B132B]/90 border border-cyan-500/30 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-[10px] uppercase font-mono font-bold text-cyan-400">
              Robot API Secret Key
            </span>
            <span className="text-xs font-mono text-amber-400">HEADER: X-API-Key</span>
          </div>
          <div className="mt-3 flex items-center justify-between bg-black/50 p-2.5 rounded-xl border border-slate-800 font-mono text-xs text-white">
            <span className="truncate">{apiKey}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(apiKey);
                setCopiedKey(true);
                setTimeout(() => setCopiedKey(false), 2000);
              }}
              className="ml-2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">
            Required in the <code className="text-cyan-300">X-API-Key</code> HTTP header for all robot transmissions.
          </p>
        </div>
      </div>

      {/* Interactive In-Browser Packet Dispatcher */}
      <div className="bg-[#0B132B]/90 border border-cyan-500/30 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm text-white font-mono">
              Live Hardware Packet Dispatcher
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">HTTP REST Gateway</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <textarea
              rows={8}
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              className="w-full text-xs font-mono p-3 bg-black/60 border border-slate-800 rounded-xl text-cyan-300 focus:outline-hidden"
            />
            <button
              disabled={testing}
              onClick={handleSendTest}
              className="mt-3 px-4 py-2 rounded-xl text-xs font-bold font-mono bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{testing ? 'Transmitting...' : 'Send Packet to Gateway'}</span>
            </button>
          </div>

          <div className="bg-black/60 border border-slate-800 rounded-xl p-3 font-mono text-xs overflow-y-auto max-h-56">
            <span className="text-[10px] text-slate-500 block mb-2">GATEWAY RESPONSE:</span>
            {testResult ? (
              <pre className="text-slate-300 whitespace-pre-wrap">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            ) : (
              <p className="text-slate-500 italic py-8 text-center">
                Click "Send Packet" to transmit and view gateway validation.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
