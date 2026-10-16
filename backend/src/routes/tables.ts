import { Router, Request, Response } from 'express';
import { db, logActivity } from '../db';
import { broadcastEvent } from '../sockets';

const router = Router();

// GET all tables with live statistics
router.get('/', (req: Request, res: Response) => {
  try {
    const tables = db.prepare(`
      SELECT t.*,
        r.name as robot_name,
        r.status as robot_status,
        r.mode as robot_mode,
        r.battery_level as robot_battery,
        (SELECT COUNT(*) FROM service_requests sr WHERE sr.table_id = t.id AND sr.status IN ('New', 'Acknowledged', 'In Progress')) as pending_requests_count,
        (SELECT COUNT(*) FROM food_orders fo WHERE fo.table_id = t.id AND fo.status NOT IN ('Served', 'Cancelled')) as active_orders_count,
        (SELECT final_amount FROM bills b WHERE b.table_id = t.id AND b.status IN ('Open', 'Unpaid') ORDER BY b.created_at DESC LIMIT 1) as current_bill_amount,
        (SELECT id FROM bills b WHERE b.table_id = t.id AND b.status IN ('Open', 'Unpaid') ORDER BY b.created_at DESC LIMIT 1) as current_bill_id
      FROM restaurant_tables t
      LEFT JOIN robots r ON t.active_robot_id = r.id
      ORDER BY t.id ASC
    `).all();

    res.json({ success: true, data: tables });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single table with orders and requests
router.get('/:id', (req: Request, res: Response) => {
  try {
    const tableId = req.params.id;
    const table = db.prepare(`
      SELECT t.*, r.name as robot_name, r.status as robot_status, r.mode as robot_mode
      FROM restaurant_tables t
      LEFT JOIN robots r ON t.active_robot_id = r.id
      WHERE t.id = ?
    `).get(tableId) as any;

    if (!table) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }

    const activeRequests = db.prepare(`
      SELECT * FROM service_requests 
      WHERE table_id = ? AND status IN ('New', 'Acknowledged', 'In Progress')
      ORDER BY created_at DESC
    `).all(tableId);

    const activeOrders = db.prepare(`
      SELECT * FROM food_orders 
      WHERE table_id = ? AND status NOT IN ('Served', 'Cancelled')
      ORDER BY created_at DESC
    `).all(tableId) as any[];

    for (const ord of activeOrders) {
      ord.items = db.prepare('SELECT * FROM food_order_items WHERE order_id = ?').all(ord.id);
    }

    const openBill = db.prepare(`
      SELECT * FROM bills 
      WHERE table_id = ? AND status IN ('Open', 'Unpaid')
      ORDER BY created_at DESC LIMIT 1
    `).get(tableId);

    res.json({
      success: true,
      data: {
        table,
        activeRequests,
        activeOrders,
        openBill
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH assign robot to table
router.patch('/:id/assign-robot', (req: Request, res: Response) => {
  try {
    const { robot_id } = req.body;
    const tableId = req.params.id;
    const now = new Date().toISOString();

    const table = db.prepare('SELECT * FROM restaurant_tables WHERE id = ?').get(tableId) as any;
    if (!table) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }

    if (robot_id) {
      const robot = db.prepare('SELECT * FROM robots WHERE id = ?').get(robot_id) as any;
      if (!robot) {
        return res.status(404).json({ success: false, error: 'Robot not found' });
      }

      // If robot was assigned to another table, clear that table's active robot
      if (robot.assigned_table_id && robot.assigned_table_id !== tableId) {
        db.prepare('UPDATE restaurant_tables SET active_robot_id = null, updated_at = ? WHERE id = ?')
          .run(now, robot.assigned_table_id);
      }

      // Assign to this table
      db.prepare('UPDATE restaurant_tables SET active_robot_id = ?, updated_at = ? WHERE id = ?').run(robot_id, now, tableId);
      db.prepare('UPDATE robots SET assigned_table_id = ?, updated_at = ? WHERE id = ?').run(tableId, now, robot_id);

      logActivity('robot', 'Robot Assigned', `Robot ${robot.name} assigned to Table ${tableId}.`, tableId, robot_id, 'info');
    } else {
      // Unassign robot
      const prevRobotId = table.active_robot_id;
      db.prepare('UPDATE restaurant_tables SET active_robot_id = null, updated_at = ? WHERE id = ?').run(now, tableId);
      if (prevRobotId) {
        db.prepare('UPDATE robots SET assigned_table_id = null, updated_at = ? WHERE id = ?').run(now, prevRobotId);
        logActivity('robot', 'Robot Unassigned', `Robot ${prevRobotId} unassigned from Table ${tableId}.`, tableId, prevRobotId, 'info');
      }
    }

    const updatedTable = db.prepare('SELECT * FROM restaurant_tables WHERE id = ?').get(tableId);
    broadcastEvent('table.updated', updatedTable);
    broadcastEvent('robot.assigned', { table_id: tableId, robot_id });

    res.json({ success: true, data: updatedTable });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH update table status directly (available, occupied, bill_requested)
router.patch('/:id/status', (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const tableId = req.params.id;
    const now = new Date().toISOString();

    if (!['available', 'occupied', 'bill_requested'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid table status' });
    }

    db.prepare('UPDATE restaurant_tables SET status = ?, updated_at = ? WHERE id = ?').run(status, now, tableId);
    const updated = db.prepare('SELECT * FROM restaurant_tables WHERE id = ?').get(tableId);

    broadcastEvent('table.updated', updated);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
