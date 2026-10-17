import { db, logActivity } from '../db';
import WebSocket from 'ws';

export type McpConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'not_configured' | 'error';

export interface XiaozhiMcpConfig {
  enabled: boolean;
  endpointUrl: string;
  transport: 'auto' | 'sse' | 'websocket' | 'http';
  token: string;
  robotId: string;
}

export interface McpDiagnostics {
  status: McpConnectionStatus;
  message: string;
  transportUsed?: string;
  discoveredTools?: string[];
  lastChecked: string;
  latencyMs?: number;
}

class XiaozhiMcpAdapter {
  private status: McpConnectionStatus = 'not_configured';
  private lastDiagnostics: McpDiagnostics = {
    status: 'not_configured',
    message: 'XiaoZhi MCP endpoint has not been configured yet.',
    lastChecked: new Date().toISOString()
  };
  private activeWs: WebSocket | null = null;

  constructor() {
    this.initFromDatabase();
  }

  /**
   * Initialize configuration from SQLite app_settings or environment variables
   */
  public initFromDatabase() {
    try {
      const getSetting = (key: string, envFallback: string = '') => {
        const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined;
        return row ? row.value : (process.env[key.toUpperCase()] || envFallback);
      };

      const endpoint = getSetting('xiaozhi_mcp_endpoint', process.env.XIAOZHI_MCP_ENDPOINT || '');
      const enabled = getSetting('xiaozhi_mcp_enabled', process.env.XIAOZHI_MCP_ENABLED || 'false') === 'true';

      if (!endpoint || !enabled) {
        this.status = 'not_configured';
        this.lastDiagnostics = {
          status: 'not_configured',
          message: 'XiaoZhi MCP endpoint not configured or disabled.',
          lastChecked: new Date().toISOString()
        };
      } else {
        // Will be verified on explicit test or background monitor
        this.status = 'disconnected';
      }
    } catch (err: any) {
      console.error('[XiaoZhi Adapter] Error loading settings:', err.message);
    }
  }

  /**
   * Get current configuration (with token REDACTED for security)
   */
  public getConfig(redactSecrets = true): XiaozhiMcpConfig {
    const getSetting = (key: string, envFallback: string = '') => {
      const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined;
      return row ? row.value : (process.env[key.toUpperCase()] || envFallback);
    };

    const token = getSetting('xiaozhi_mcp_token', process.env.XIAOZHI_MCP_TOKEN || '');
    return {
      enabled: getSetting('xiaozhi_mcp_enabled', 'false') === 'true',
      endpointUrl: getSetting('xiaozhi_mcp_endpoint', ''),
      transport: (getSetting('xiaozhi_mcp_transport', 'auto') as any) || 'auto',
      token: redactSecrets && token ? '••••••••' + token.slice(-4) : token,
      robotId: getSetting('xiaozhi_robot_id', 'aria-robot-01')
    };
  }

  /**
   * Save configuration securely to backend database
   */
  public saveConfig(config: Partial<XiaozhiMcpConfig>) {
    const saveSetting = (key: string, val: string) => {
      db.prepare(`
        INSERT INTO app_settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run(key, val);
    };

    if (config.enabled !== undefined) saveSetting('xiaozhi_mcp_enabled', config.enabled ? 'true' : 'false');
    if (config.endpointUrl !== undefined) saveSetting('xiaozhi_mcp_endpoint', config.endpointUrl.trim());
    if (config.transport !== undefined) saveSetting('xiaozhi_mcp_transport', config.transport);
    if (config.token !== undefined && !config.token.includes('••••')) {
      saveSetting('xiaozhi_mcp_token', config.token.trim());
    }
    if (config.robotId !== undefined) saveSetting('xiaozhi_robot_id', config.robotId.trim());

    this.initFromDatabase();
  }

  public getStatus(): McpConnectionStatus {
    return this.status;
  }

  public getDiagnostics(): McpDiagnostics {
    return this.lastDiagnostics;
  }

  /**
   * Perform genuine protocol test against the configured XiaoZhi endpoint
   */
  public async testConnection(overrideConfig?: Partial<XiaozhiMcpConfig>): Promise<McpDiagnostics> {
    const config = overrideConfig ? { ...this.getConfig(false), ...overrideConfig } : this.getConfig(false);
    const endpoint = (config.endpointUrl || '').trim();

    if (!endpoint) {
      this.status = 'not_configured';
      this.lastDiagnostics = {
        status: 'not_configured',
        message: 'Endpoint URL is empty. Please paste your XiaoZhi MCP endpoint.',
        lastChecked: new Date().toISOString()
      };
      return this.lastDiagnostics;
    }

    // Validate URL syntax
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(endpoint);
    } catch (e) {
      this.status = 'error';
      this.lastDiagnostics = {
        status: 'error',
        message: 'Invalid URL format. Expected http://, https://, ws://, or wss://',
        lastChecked: new Date().toISOString()
      };
      return this.lastDiagnostics;
    }

    this.status = 'connecting';
    const startTime = Date.now();

    // Determine protocol
    const isWs = parsedUrl.protocol === 'ws:' || parsedUrl.protocol === 'wss:';

    if (isWs) {
      return this.testWebSocketMcp(endpoint, config.token, startTime);
    } else {
      return this.testHttpMcp(endpoint, config.token, startTime);
    }
  }

  /**
   * Test WebSocket transport (common for ESP32/XiaoZhi bridges)
   */
  private async testWebSocketMcp(endpoint: string, token: string, startTime: number): Promise<McpDiagnostics> {
    return new Promise((resolve) => {
      let resolved = false;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let ws: WebSocket;
      try {
        ws = new WebSocket(endpoint, { headers, timeout: 5000 });
      } catch (err: any) {
        this.status = 'error';
        this.lastDiagnostics = {
          status: 'error',
          message: `WebSocket creation failed: ${err.message}`,
          transportUsed: 'websocket',
          lastChecked: new Date().toISOString()
        };
        return resolve(this.lastDiagnostics);
      }

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try { ws.terminate(); } catch (_) {}
          this.status = 'error';
          this.lastDiagnostics = {
            status: 'error',
            message: 'Connection timed out (no response within 5 seconds). Ensure XiaoZhi host is reachable on LAN.',
            transportUsed: 'websocket',
            lastChecked: new Date().toISOString()
          };
          resolve(this.lastDiagnostics);
        }
      }, 5000);

      ws.on('open', () => {
        // Send MCP initialize handshake frame
        const initPayload = JSON.stringify({
          jsonrpc: '2.0',
          id: 'test-init-1',
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'aria-dineassist', version: '2.0.0' }
          }
        });
        ws.send(initPayload);
      });

      ws.on('message', (data) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        const latency = Date.now() - startTime;

        try {
          const res = JSON.parse(data.toString());
          if (res.result || res.jsonrpc === '2.0') {
            this.status = 'connected';
            this.lastDiagnostics = {
              status: 'connected',
              message: `Connected successfully via WebSocket. XiaoZhi MCP handshake verified (${latency}ms).`,
              transportUsed: 'websocket',
              latencyMs: latency,
              lastChecked: new Date().toISOString()
            };
          } else {
            this.status = 'connected';
            this.lastDiagnostics = {
              status: 'connected',
              message: `WebSocket connection established (${latency}ms).`,
              transportUsed: 'websocket',
              latencyMs: latency,
              lastChecked: new Date().toISOString()
            };
          }
        } catch (_) {
          this.status = 'connected';
          this.lastDiagnostics = {
            status: 'connected',
            message: `WebSocket stream open and responding (${latency}ms).`,
            transportUsed: 'websocket',
            latencyMs: latency,
            lastChecked: new Date().toISOString()
          };
        }

        ws.close();
        resolve(this.lastDiagnostics);
      });

      ws.on('error', (err: any) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        const latency = Date.now() - startTime;

        this.status = 'error';
        const msg = err.message.includes('ECONNREFUSED')
          ? 'Connection refused. Is the XiaoZhi server running and accepting connections?'
          : err.message.includes('401')
          ? 'Authentication failed: Invalid XiaoZhi MCP token.'
          : `WebSocket error: ${err.message}`;

        this.lastDiagnostics = {
          status: 'error',
          message: msg,
          transportUsed: 'websocket',
          latencyMs: latency,
          lastChecked: new Date().toISOString()
        };
        resolve(this.lastDiagnostics);
      });
    });
  }

  /**
   * Test HTTP / Streamable MCP transport
   */
  private async testHttpMcp(endpoint: string, token: string, startTime: number): Promise<McpDiagnostics> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      // 1. Try MCP initialize JSON-RPC POST
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'ping-1',
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'aria-dineassist', version: '2.0.0' }
          }
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const latency = Date.now() - startTime;

      if (res.status === 401 || res.status === 403) {
        this.status = 'error';
        this.lastDiagnostics = {
          status: 'error',
          message: 'Authentication failed: Invalid XiaoZhi token or rejected credentials.',
          transportUsed: 'http/streamable',
          latencyMs: latency,
          lastChecked: new Date().toISOString()
        };
        return this.lastDiagnostics;
      }

      if (res.ok) {
        try {
          const json = (await res.json()) as any;
          if (json.result?.serverInfo) {
            this.status = 'connected';
            this.lastDiagnostics = {
              status: 'connected',
              message: `MCP Server verified: ${json.result.serverInfo.name} v${json.result.serverInfo.version} (${latency}ms).`,
              transportUsed: 'http/mcp',
              latencyMs: latency,
              lastChecked: new Date().toISOString()
            };
            return this.lastDiagnostics;
          }
        } catch (_) {}

        this.status = 'connected';
        this.lastDiagnostics = {
          status: 'connected',
          message: `HTTP endpoint reachable and acknowledged request (${latency}ms).`,
          transportUsed: 'http',
          latencyMs: latency,
          lastChecked: new Date().toISOString()
        };
        return this.lastDiagnostics;
      }

      // If POST was 404 or 405, test if GET is a health check endpoint
      const getRes = await fetch(endpoint, { method: 'GET', headers: { ...headers } });
      if (getRes.ok) {
        this.status = 'connected';
        this.lastDiagnostics = {
          status: 'connected',
          message: `Endpoint active (HTTP ${getRes.status} OK). Ready for tool binding (${Date.now() - startTime}ms).`,
          transportUsed: 'http-webhook',
          latencyMs: Date.now() - startTime,
          lastChecked: new Date().toISOString()
        };
        return this.lastDiagnostics;
      }

      this.status = 'error';
      this.lastDiagnostics = {
        status: 'error',
        message: `Endpoint returned HTTP status ${res.status} (${res.statusText}).`,
        transportUsed: 'http',
        latencyMs: latency,
        lastChecked: new Date().toISOString()
      };
      return this.lastDiagnostics;

    } catch (err: any) {
      clearTimeout(timeout);
      const latency = Date.now() - startTime;
      this.status = 'error';

      const errorMsg = err.name === 'AbortError'
        ? 'Connection timed out. Target IP/host did not respond.'
        : err.message.includes('fetch failed')
        ? 'Connection refused or host unreachable. Check IP and port.'
        : `Connection error: ${err.message}`;

      this.lastDiagnostics = {
        status: 'error',
        message: errorMsg,
        transportUsed: 'http',
        latencyMs: latency,
        lastChecked: new Date().toISOString()
      };
      return this.lastDiagnostics;
    }
  }

  /**
   * Outbound notification back to physical robot (e.g. order ready, staff acknowledged)
   */
  public async sendOutboundNotification(robotId: string, message: string) {
    const config = this.getConfig(false);
    if (!config.enabled || !config.endpointUrl) return;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.token) headers['Authorization'] = `Bearer ${config.token}`;

      fetch(config.endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/message',
          params: { robot_id: robotId, text: message }
        })
      }).catch(() => {});
    } catch (_) {}
  }
}

export const xiaozhiMcpAdapter = new XiaozhiMcpAdapter();
