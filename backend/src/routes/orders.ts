import { Router, Request, Response } from 'express';
import { db, logActivity } from '../db';
import { broadcastEvent } from '../sockets';
import { OrderStatus } from '../types';

const router = Router();

// GET menu items
router.get('/menu', (req: Request, res: Response) => {
  try {
    const { category, is_veg } = req.query;
    let query = 'SELECT * FROM menu_items WHERE 1=1';
    const params: any[] = [];

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }
    if (is_veg !== undefined && is_veg !== 'all') {
      query += ' AND is_veg = ?';
      params.push(is_veg === 'true' || is_veg === '1' ? 1 : 0);
    }

    query += ' ORDER BY category, name';
    const items = db.prepare(query).all(...params);
    res.json({ success: true, data: items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all food orders
router.get('/', (req: Request, res: Response) => {
  try {
    const { status, table_id } = req.query;
    let query = `
      SELECT o.*, t.name as table_name, rob.name as robot_name
      FROM food_orders o
      LEFT JOIN restaurant_tables t ON o.table_id = t.id
      LEFT JOIN robots rob ON o.robot_id = rob.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'all') {
      query += ' AND o.status = ?';
      params.push(status);
    }
    if (table_id && table_id !== 'all') {
      query += ' AND o.table_id = ?';
      params.push(table_id);
    }

    query += `
      ORDER BY 
        CASE o.status 
          WHEN 'Received' THEN 1 
          WHEN 'Confirmed' THEN 2 
          WHEN 'Preparing' THEN 3 
          WHEN 'Ready' THEN 4 
          WHEN 'Served' THEN 5 
          ELSE 6 
        END, 
        o.created_at DESC
    `;

    const orders = db.prepare(query).all(...params) as any[];

    // Attach items for each order
    for (const order of orders) {
      order.items = db.prepare('SELECT * FROM food_order_items WHERE order_id = ?').all(order.id);
    }

    res.json({ success: true, data: orders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single order with full details
router.get('/:id', (req: Request, res: Response) => {
  try {
    const order = db.prepare(`
      SELECT o.*, t.name as table_name, rob.name as robot_name
      FROM food_orders o
      LEFT JOIN restaurant_tables t ON o.table_id = t.id
      LEFT JOIN robots rob ON o.robot_id = rob.id
      WHERE o.id = ?
    `).get(req.params.id) as any;

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    order.items = db.prepare('SELECT * FROM food_order_items WHERE order_id = ?').all(order.id);
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create manual order
router.post('/', (req: Request, res: Response) => {
  try {
    const { table_id, robot_id, items, special_instructions } = req.body;
    if (!table_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Table ID and at least one item are required.' });
    }

    const ordId = 'ORD-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-5);
    const now = new Date().toISOString();

    let subtotal = 0;
    const itemsToInsert: any[] = [];

    // Calculate prices strictly from database menu items
    for (const it of items) {
      const menuItem = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(it.menu_item_id) as any;
      if (!menuItem) {
        return res.status(400).json({ success: false, error: `Invalid menu item '${it.menu_item_id}'` });
      }
      const qty = Math.max(1, Number(it.quantity) || 1);
      const lineTotal = Number((menuItem.price * qty).toFixed(2));
      subtotal += lineTotal;

      itemsToInsert.push({
        id: 'oi-' + ordId + '-' + (itemsToInsert.length + 1),
        order_id: ordId,
        menu_item_id: menuItem.id,
        item_name: menuItem.name,
        unit_price: menuItem.price,
        quantity: qty,
        notes: it.notes || null,
        total_price: lineTotal
      });
    }

    subtotal = Number(subtotal.toFixed(2));

    db.prepare(`
      INSERT INTO food_orders (id, table_id, robot_id, status, subtotal, special_instructions, created_at, updated_at)
      VALUES (?, ?, ?, 'Received', ?, ?, ?, ?)
    `).run(ordId, table_id, robot_id || null, subtotal, special_instructions || null, now, now);

    for (const oi of itemsToInsert) {
      db.prepare(`
        INSERT INTO food_order_items (id, order_id, menu_item_id, item_name, unit_price, quantity, notes, total_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(oi.id, oi.order_id, oi.menu_item_id, oi.item_name, oi.unit_price, oi.quantity, oi.notes, oi.total_price);
    }

    db.prepare("UPDATE restaurant_tables SET status = 'occupied', updated_at = ? WHERE id = ?").run(now, table_id);

    const fullOrder = {
      id: ordId,
      table_id,
      robot_id: robot_id || null,
      status: 'Received',
      subtotal,
      special_instructions: special_instructions || null,
      created_at: now,
      updated_at: now,
      items: itemsToInsert
    };

    logActivity('order', 'Manual Order Placed', `Table ${table_id} ordered ${itemsToInsert.length} items (Total: ₹${subtotal}).`, table_id, robot_id, 'info');

    broadcastEvent('order.created', fullOrder);
    broadcastEvent('table.updated', { table_id, status: 'occupied' });

    res.status(201).json({ success: true, data: fullOrder });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH advance order status: Received -> Confirmed -> Preparing -> Ready -> Served (or Cancelled)
router.patch('/:id/status', (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const ordId = req.params.id;

    const current = db.prepare('SELECT * FROM food_orders WHERE id = ?').get(ordId) as any;
    if (!current) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const validStatuses: OrderStatus[] = ['Received', 'Confirmed', 'Preparing', 'Ready', 'Served', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid order status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE food_orders SET status = ?, updated_at = ? WHERE id = ?').run(status, now, ordId);

    const updated = db.prepare(`
      SELECT o.*, t.name as table_name, rob.name as robot_name
      FROM food_orders o
      LEFT JOIN restaurant_tables t ON o.table_id = t.id
      LEFT JOIN robots rob ON o.robot_id = rob.id
      WHERE o.id = ?
    `).get(ordId) as any;

    updated.items = db.prepare('SELECT * FROM food_order_items WHERE order_id = ?').all(ordId);

    logActivity('order', `Order ${status}`, `Order ${ordId} for ${current.table_id} updated to ${status}.`, current.table_id, current.robot_id, status === 'Served' ? 'success' : status === 'Cancelled' ? 'danger' : 'info');

    broadcastEvent('order.updated', updated);

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
