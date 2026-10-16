import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const { type, table_id, search, from_date, to_date } = req.query;

    const data: any = {};

    // 1. Requests History (Completed or Cancelled)
    if (!type || type === 'all' || type === 'requests') {
      let reqQuery = `
        SELECT r.*, t.name as table_name, rob.name as robot_name
        FROM service_requests r
        LEFT JOIN restaurant_tables t ON r.table_id = t.id
        LEFT JOIN robots rob ON r.robot_id = rob.id
        WHERE r.status IN ('Completed', 'Cancelled')
      `;
      const params: any[] = [];

      if (table_id && table_id !== 'all') {
        reqQuery += ' AND r.table_id = ?';
        params.push(table_id);
      }
      if (from_date) {
        reqQuery += ' AND r.created_at >= ?';
        params.push(from_date);
      }
      if (to_date) {
        reqQuery += ' AND r.created_at <= ?';
        params.push(to_date);
      }
      if (search) {
        reqQuery += ' AND (r.id LIKE ? OR r.message LIKE ? OR r.table_id LIKE ?)';
        const s = `%${search}%`;
        params.push(s, s, s);
      }

      reqQuery += ' ORDER BY r.created_at DESC LIMIT 100';
      data.requests = db.prepare(reqQuery).all(...params);
    }

    // 2. Orders History (Served or Cancelled)
    if (!type || type === 'all' || type === 'orders') {
      let ordQuery = `
        SELECT o.*, t.name as table_name, rob.name as robot_name,
          (SELECT COUNT(*) FROM food_order_items WHERE order_id = o.id) as item_count
        FROM food_orders o
        LEFT JOIN restaurant_tables t ON o.table_id = t.id
        LEFT JOIN robots rob ON o.robot_id = rob.id
        WHERE o.status IN ('Served', 'Cancelled')
      `;
      const params: any[] = [];

      if (table_id && table_id !== 'all') {
        ordQuery += ' AND o.table_id = ?';
        params.push(table_id);
      }
      if (from_date) {
        ordQuery += ' AND o.created_at >= ?';
        params.push(from_date);
      }
      if (to_date) {
        ordQuery += ' AND o.created_at <= ?';
        params.push(to_date);
      }
      if (search) {
        ordQuery += ' AND (o.id LIKE ? OR o.table_id LIKE ?)';
        const s = `%${search}%`;
        params.push(s, s);
      }

      ordQuery += ' ORDER BY o.created_at DESC LIMIT 100';
      const orders = db.prepare(ordQuery).all(...params) as any[];

      for (const ord of orders) {
        ord.items = db.prepare('SELECT * FROM food_order_items WHERE order_id = ?').all(ord.id);
      }
      data.orders = orders;
    }

    // 3. Bills History (Paid or Cancelled)
    if (!type || type === 'all' || type === 'bills') {
      let billQuery = `
        SELECT b.*, t.name as table_name,
          (SELECT COUNT(*) FROM bill_items WHERE bill_id = b.id) as item_count
        FROM bills b
        LEFT JOIN restaurant_tables t ON b.table_id = t.id
        WHERE b.status IN ('Paid', 'Cancelled')
      `;
      const params: any[] = [];

      if (table_id && table_id !== 'all') {
        billQuery += ' AND b.table_id = ?';
        params.push(table_id);
      }
      if (from_date) {
        billQuery += ' AND b.created_at >= ?';
        params.push(from_date);
      }
      if (to_date) {
        billQuery += ' AND b.created_at <= ?';
        params.push(to_date);
      }
      if (search) {
        billQuery += ' AND (b.invoice_number LIKE ? OR b.table_id LIKE ? OR b.payment_reference LIKE ?)';
        const s = `%${search}%`;
        params.push(s, s, s);
      }

      billQuery += ' ORDER BY b.created_at DESC LIMIT 100';
      data.bills = db.prepare(billQuery).all(...params);
    }

    // 4. Activity Logs
    let logQuery = 'SELECT * FROM activity_logs WHERE 1=1';
    const logParams: any[] = [];
    if (table_id && table_id !== 'all') {
      logQuery += ' AND table_id = ?';
      logParams.push(table_id);
    }
    logQuery += ' ORDER BY created_at DESC LIMIT 50';
    data.activity = db.prepare(logQuery).all(...logParams);

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
