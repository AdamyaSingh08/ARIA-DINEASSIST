import { Router, Request, Response } from 'express';
import { db, logActivity } from '../db';
import { broadcastEvent } from '../sockets';
import { xiaozhiAdapter } from '../adapters/xiaozhiAdapter';

const router = Router();

// GET all service requests with filters
router.get('/', (req: Request, res: Response) => {
  try {
    const { status, table_id, request_type, search } = req.query;

    let query = `
      SELECT r.*, t.name as table_name, rob.name as robot_name
      FROM service_requests r
      LEFT JOIN restaurant_tables t ON r.table_id = t.id
      LEFT JOIN robots rob ON r.robot_id = rob.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'all') {
      query += ' AND r.status = ?';
      params.push(status);
    }
    if (table_id && table_id !== 'all') {
      query += ' AND r.table_id = ?';
      params.push(table_id);
    }
    if (request_type && request_type !== 'all') {
      query += ' AND r.request_type = ?';
      params.push(request_type);
    }
    if (search) {
      query += ' AND (r.id LIKE ? OR r.message LIKE ? OR r.table_id LIKE ? OR r.assigned_staff LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY CASE r.status WHEN \'New\' THEN 1 WHEN \'Acknowledged\' THEN 2 WHEN \'In Progress\' THEN 3 ELSE 4 END, r.created_at DESC';

    const requests = db.prepare(query).all(...params);
    res.json({ success: true, data: requests });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single request
router.get('/:id', (req: Request, res: Response) => {
  try {
    const request = db.prepare(`
      SELECT r.*, t.name as table_name, rob.name as robot_name
      FROM service_requests r
      LEFT JOIN restaurant_tables t ON r.table_id = t.id
      LEFT JOIN robots rob ON r.robot_id = rob.id
      WHERE r.id = ?
    `).get(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }
    res.json({ success: true, data: request });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create manual service request
router.post('/', (req: Request, res: Response) => {
  try {
    const { table_id, robot_id, request_type, message, assigned_staff } = req.body;
    if (!table_id || !request_type) {
      return res.status(400).json({ success: false, error: 'Table ID and request type are required.' });
    }

    const id = 'REQ-' + Date.now().toString().slice(-4) + Math.random().toString(36).substring(2, 5).toUpperCase();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO service_requests (id, table_id, robot_id, request_type, message, status, assigned_staff, created_at)
      VALUES (?, ?, ?, ?, ?, 'New', ?, ?)
    `).run(id, table_id, robot_id || null, request_type, message || null, assigned_staff || null, now);

    const created = db.prepare('SELECT * FROM service_requests WHERE id = ?').get(id) as any;
    logActivity('request', `Service Request: ${request_type.toUpperCase()}`, `${table_id} requested ${request_type} (Manual)`, table_id, robot_id, 'info');

    broadcastEvent('request.created', created);
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH update status (Acknowledge, Start handling, Mark completed, Cancel)
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status, assigned_staff, cancel_reason } = req.body;
    const reqId = req.params.id;

    const current = db.prepare('SELECT * FROM service_requests WHERE id = ?').get(reqId) as any;
    if (!current) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    const validStatuses = ['New', 'Acknowledged', 'In Progress', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const now = new Date().toISOString();
    let updates: string[] = ['status = ?'];
    let params: any[] = [status];

    if (assigned_staff !== undefined) {
      updates.push('assigned_staff = ?');
      params.push(assigned_staff);
    }

    if (status === 'Acknowledged' && !current.acknowledged_at) {
      updates.push('acknowledged_at = ?');
      params.push(now);
    } else if (status === 'Completed') {
      updates.push('completed_at = ?');
      params.push(now);
    } else if (status === 'Cancelled') {
      updates.push('cancelled_at = ?');
      params.push(now);
      if (cancel_reason) {
        updates.push('cancel_reason = ?');
        params.push(cancel_reason);
      }
    }

    params.push(reqId);
    db.prepare(`UPDATE service_requests SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare(`
      SELECT r.*, t.name as table_name, rob.name as robot_name
      FROM service_requests r
      LEFT JOIN restaurant_tables t ON r.table_id = t.id
      LEFT JOIN robots rob ON r.robot_id = rob.id
      WHERE r.id = ?
    `).get(reqId) as any;

    logActivity('request', `Request ${status}`, `Request ${reqId} for ${current.table_id} marked as ${status}${assigned_staff ? ' by ' + assigned_staff : ''}.`, current.table_id, current.robot_id, status === 'Completed' ? 'success' : status === 'Cancelled' ? 'danger' : 'info');

    broadcastEvent('request.updated', updated);

    // If robot is connected, notify it of staff acknowledgement or completion
    if (current.robot_id) {
      xiaozhiAdapter.sendOutboundAcknowledgement({
        robot_id: current.robot_id,
        table_id: current.table_id,
        event_type: 'acknowledgement',
        message: status === 'Completed' 
          ? `Your service request has been completed.` 
          : `Staff has ${status.toLowerCase()} your request.`
      });
    }

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
