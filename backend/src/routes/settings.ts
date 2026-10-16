import { Router, Request, Response } from 'express';
import { db, logActivity } from '../db';
import { seedDatabase } from '../db/seed';
import { broadcastEvent } from '../sockets';
import { processRobotEvent } from '../services/eventService';

const router = Router();

// GET all settings
router.get('/', (req: Request, res: Response) => {
  try {
    const rows = db.prepare('SELECT key, value FROM app_settings').all() as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    res.json({ success: true, data: settings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH update settings
router.patch('/', (req: Request, res: Response) => {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid settings object' });
    }

    for (const [key, value] of Object.entries(updates)) {
      db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)').run(key, String(value));
    }

    logActivity('system', 'Settings Updated', 'Application configuration parameters modified by staff.', null, null, 'info');

    const rows = db.prepare('SELECT key, value FROM app_settings').all() as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }

    broadcastEvent('settings.updated', settings);
    res.json({ success: true, data: settings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST reset demo database to clean initial seed
router.post('/reset-database', (req: Request, res: Response) => {
  try {
    // Development-only protection: check if demo_mode is enabled
    const row = db.prepare("SELECT value FROM app_settings WHERE key = 'demo_mode'").get() as { value: string } | undefined;
    if (row && row.value !== 'true') {
      return res.status(403).json({ success: false, error: 'Database reset is only permitted when Demo Mode is enabled.' });
    }

    seedDatabase(true);
    broadcastEvent('system.reset', { message: 'Database reset to initial demo state' });

    res.json({ success: true, message: 'Database successfully reset to pristine demo state!' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST trigger demo event (flows through standard processRobotEvent)
router.post('/demo/simulate', (req: Request, res: Response) => {
  try {
    const { scenario } = req.body;
    const now = new Date().toISOString();
    const eventId = 'demo-evt-' + Date.now();

    let payload: any = null;

    switch (scenario) {
      case 'table4_water':
        payload = {
          event_id: eventId,
          robot_id: 'robot-04',
          table_id: 'T04',
          type: 'service_request',
          request_type: 'water',
          message: 'Customer requested a refill of chilled drinking water',
          timestamp: now
        };
        break;

      case 'table2_waiter':
        payload = {
          event_id: eventId,
          robot_id: 'robot-02',
          table_id: 'T02',
          type: 'service_request',
          request_type: 'waiter',
          message: 'Customer called captain for chef recommendations',
          timestamp: now
        };
        break;

      case 'table3_bill':
        payload = {
          event_id: eventId,
          robot_id: 'robot-03',
          table_id: 'T03',
          type: 'bill_requested',
          timestamp: now
        };
        break;

      case 'table1_food_order':
        payload = {
          event_id: eventId,
          robot_id: 'robot-01',
          table_id: 'T01',
          type: 'food_order_submitted',
          items: [
            { menu_item_id: 'item-001', quantity: 2, notes: 'Crispy' },
            { menu_item_id: 'item-011', quantity: 3, notes: 'Hot butter' },
            { menu_item_id: 'item-018', quantity: 2 }
          ],
          special_instructions: 'Customer requested fast delivery',
          timestamp: now
        };
        break;

      case 'robot_online':
        payload = {
          event_id: eventId,
          robot_id: req.body.robot_id || 'robot-01',
          table_id: req.body.table_id || 'T01',
          type: 'robot_status',
          status: 'online',
          battery_level: 98,
          timestamp: now
        };
        break;

      case 'robot_offline':
        payload = {
          event_id: eventId,
          robot_id: req.body.robot_id || 'robot-02',
          table_id: req.body.table_id || 'T02',
          type: 'robot_status',
          status: 'offline',
          timestamp: now
        };
        break;

      case 'custom':
        payload = {
          ...req.body.payload,
          event_id: req.body.payload.event_id || eventId,
          timestamp: req.body.payload.timestamp || now
        };
        break;

      default:
        return res.status(400).json({ success: false, error: `Unknown scenario '${scenario}'` });
    }

    const result = processRobotEvent(payload, 'demo_mode');
    res.json({ success: true, scenario, event: payload, result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
