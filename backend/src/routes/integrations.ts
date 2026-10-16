import { Router, Request, Response } from 'express';
import { db, logActivity } from '../db';
import { verifyRobotApiKey } from '../middleware/auth';
import { processRobotEvent } from '../services/eventService';
import { broadcastEvent } from '../sockets';

const router = Router();

/**
 * GET /api/integrations/robot/health
 * Public health check for IoT robots / bridges
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    system: 'DineAssist IoT Gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/integrations/robot/config
 * Provides integration parameters and schema endpoints for hardware clients
 */
router.get('/config', (req: Request, res: Response) => {
  const settingsRows = db.prepare('SELECT key, value FROM app_settings').all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const r of settingsRows) {
    if (r.key !== 'robot_api_key') { // Do not leak the secret key in config endpoint!
      settings[r.key] = r.value;
    }
  }

  res.json({
    success: true,
    data: {
      gateway_version: '1.0.0',
      supported_events: [
        'service_request',
        'food_order_submitted',
        'bill_requested',
        'robot_status',
        'heartbeat'
      ],
      supported_service_types: ['water', 'waiter', 'bill', 'assistance', 'custom'],
      settings,
      endpoints: {
        events: '/api/integrations/robot/events',
        heartbeat: '/api/integrations/robot/heartbeat',
        devices: '/api/integrations/robot/devices',
        health: '/api/integrations/robot/health'
      }
    }
  });
});

/**
 * GET /api/integrations/robot/devices
 * Lists connected robots and their assigned tables
 */
router.get('/devices', (req: Request, res: Response) => {
  try {
    const devices = db.prepare(`
      SELECT r.id, r.name, r.model, r.status, r.mode, r.battery_level, r.last_seen, r.last_event_type, r.assigned_table_id,
        t.name as table_name
      FROM robots r
      LEFT JOIN restaurant_tables t ON r.assigned_table_id = t.id
      ORDER BY r.id ASC
    `).all();

    res.json({ success: true, data: devices });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/integrations/robot/heartbeat
 * Authenticated heartbeat endpoint for physical robots
 */
router.post('/heartbeat', verifyRobotApiKey, (req: Request, res: Response) => {
  try {
    const { robot_id, battery_level, status } = req.body;
    if (!robot_id) {
      return res.status(400).json({ success: false, error: 'robot_id is required' });
    }

    const now = new Date().toISOString();
    const existing = db.prepare('SELECT id FROM robots WHERE id = ?').get(robot_id);

    if (existing) {
      let query = "UPDATE robots SET last_seen = ?, status = 'online', updated_at = ?";
      const params: any[] = [now, now];

      if (battery_level !== undefined) {
        query += ', battery_level = ?';
        params.push(battery_level);
      }
      query += ' WHERE id = ?';
      params.push(robot_id);
      db.prepare(query).run(...params);
    } else {
      db.prepare(`
        INSERT INTO robots (id, name, model, assigned_table_id, status, mode, battery_level, last_seen, firmware_version, created_at, updated_at)
        VALUES (?, ?, 'XiaoZhi V2 Pro', null, 'online', 'physical', ?, ?, '1.4.2-xiaozhi-esp32', ?, ?)
      `).run(robot_id, `XiaoZhi (${robot_id})`, battery_level || 100, now, now, now);
    }

    broadcastEvent('robot.heartbeat', { robot_id, last_seen: now, status: 'online', battery_level });

    res.json({
      success: true,
      message: `Heartbeat acknowledged for ${robot_id}`,
      timestamp: now
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/integrations/robot/events
 * Core authenticated endpoint for robot events:
 * - service_request
 * - food_order_submitted
 * - bill_requested
 * - robot_status
 * - heartbeat
 */
router.post('/events', verifyRobotApiKey, (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid JSON payload' });
    }

    const result = processRobotEvent(payload, 'robot_http');
    res.status(200).json(result);
  } catch (err: any) {
    console.error('[Robot Integration API Error]:', err.message);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

export default router;
