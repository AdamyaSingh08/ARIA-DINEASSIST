import { Router, Request, Response } from 'express';
import { handleMcpJsonRpc, ARIA_MCP_TOOLS } from '../services/mcpService';
import { xiaozhiMcpAdapter } from '../adapters/xiaozhiMcpAdapter';

const router = Router();

/**
 * POST /api/mcp
 * Standard MCP JSON-RPC 2.0 Endpoint (Streamable HTTP)
 * Used by XiaoZhi agent platforms, local bots, or MCP clients to invoke ARIA tools.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32600, message: 'Invalid Request: Expected JSON-RPC object' }
      });
    }

    const response = await handleMcpJsonRpc(payload);
    if (response === null) {
      // Notification without response
      return res.status(204).end();
    }

    res.status(200).json(response);
  } catch (err: any) {
    console.error('[MCP Endpoint Error]:', err.message);
    res.status(500).json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: { code: -32603, message: `Internal server error: ${err.message}` }
    });
  }
});

/**
 * GET /api/mcp/sse
 * Server-Sent Events (SSE) endpoint for standard MCP SSE transport
 */
router.get('/sse', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial endpoint discovery message per MCP SSE specification
  const sessionId = 'session-' + Date.now();
  res.write(`event: endpoint\ndata: /api/mcp?session=${sessionId}\n\n`);

  const keepAlive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

/**
 * GET /api/mcp/tools
 * Public discovery of exposed ARIA restaurant operations tools
 */
router.get('/tools', (req: Request, res: Response) => {
  res.json({
    success: true,
    protocol: 'mcp-2024-11-05',
    server: 'aria-dineassist-mcp-server',
    tools: ARIA_MCP_TOOLS
  });
});

/**
 * GET /api/integrations/xiaozhi/status
 * Get current XiaoZhi MCP connection state and diagnostics
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    const config = xiaozhiMcpAdapter.getConfig(true); // Redact secret tokens
    const status = xiaozhiMcpAdapter.getStatus();
    const diagnostics = xiaozhiMcpAdapter.getDiagnostics();

    res.json({
      success: true,
      status,
      diagnostics,
      config: {
        enabled: config.enabled,
        endpointUrl: config.endpointUrl,
        transport: config.transport,
        robotId: config.robotId,
        hasToken: !!config.token
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/integrations/xiaozhi/configure
 * Save XiaoZhi MCP endpoint configuration securely
 */
router.post('/configure', (req: Request, res: Response) => {
  try {
    const { endpointUrl, transport, token, robotId, enabled } = req.body;

    xiaozhiMcpAdapter.saveConfig({
      endpointUrl,
      transport,
      token,
      robotId,
      enabled: enabled !== undefined ? enabled : true
    });

    res.json({
      success: true,
      message: 'XiaoZhi MCP configuration saved securely.'
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/integrations/xiaozhi/test
 * Perform real connection test against configured endpoint
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { endpointUrl, transport, token, robotId } = req.body;
    const diagnostics = await xiaozhiMcpAdapter.testConnection({
      endpointUrl,
      transport,
      token,
      robotId
    });

    res.json({
      success: diagnostics.status === 'connected',
      diagnostics
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      diagnostics: {
        status: 'error',
        message: err.message,
        lastChecked: new Date().toISOString()
      }
    });
  }
});

export default router;
