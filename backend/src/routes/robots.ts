import { Router, Request, Response } from 'express';
import { db, logActivity } from '../db';
import { broadcastEvent } from '../sockets';

const router = Router();

// GET all robots
router.get('/', (req: Request, res: Response) => {
  try {
    const robots = db.prepare(`
      SELECT r.*, t.name as table_name
      FROM robots r
      LEFT JOIN restaurant_tables t ON r.assigned_table_id = t.id
      ORDER BY r.id ASC
    `).all();

    res.json({ success: true, data: robots });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST register new robot
router.post('/', (req: Request, res: Response) => {
  try {
    const { id, name, model, mode, assigned_table_id } = req.body;
    if (!id || !name) {
      return res.status(400).json({ success: false, error: 'Robot ID and Name are required.' });
    }

    const existing = db.prepare('SELECT id FROM robots WHERE id = ?').get(id);
    if (existing) {
      return res.status(400).json({ success: false, error: `Robot '${id}' already exists.` });
    }

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO robots (id, name, model, assigned_table_id, status, mode, battery_level, last_seen, last_event_type, firmware_version, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'offline', ?, 100, null, null, '1.4.2-xiaozhi-esp32', ?, ?)
    `).run(id, name, model || 'XiaoZhi V2 Pro (ESP32-S3)', assigned_table_id || null, mode || 'physical', now, now);

    if (assigned_table_id) {
      db.prepare('UPDATE restaurant_tables SET active_robot_id = ?, updated_at = ? WHERE id = ?').run(id, now, assigned_table_id);
    }

    const created = db.prepare('SELECT * FROM robots WHERE id = ?').get(id);
    logActivity('robot', 'Robot Registered', `Registered new robot ${name} (${id}) in ${mode || 'physical'} mode.`, assigned_table_id || null, id, 'info');

    broadcastEvent('robot.registered', created);
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH update robot
router.patch('/:id', (req: Request, res: Response) => {
  try {
    const robotId = req.params.id;
    const { name, model, mode, battery_level, status } = req.body;

    const current = db.prepare('SELECT * FROM robots WHERE id = ?').get(robotId);
    if (!current) {
      return res.status(404).json({ success: false, error: 'Robot not found' });
    }

    const now = new Date().toISOString();
    let updates: string[] = ['updated_at = ?'];
    let params: any[] = [now];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (model !== undefined) { updates.push('model = ?'); params.push(model); }
    if (mode !== undefined) { updates.push('mode = ?'); params.push(mode); }
    if (battery_level !== undefined) { updates.push('battery_level = ?'); params.push(battery_level); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }

    params.push(robotId);
    db.prepare(`UPDATE robots SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare('SELECT * FROM robots WHERE id = ?').get(robotId);
    broadcastEvent('robot.status', updated);

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
