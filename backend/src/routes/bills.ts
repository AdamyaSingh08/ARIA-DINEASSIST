import { Router, Request, Response } from 'express';
import { db, logActivity } from '../db';
import { broadcastEvent } from '../sockets';
import {
  getBillDetails,
  createBillForTable,
  addItemToBill,
  removeItemFromBill,
  recalculateBill,
  markBillPaid
} from '../services/billingService';

const router = Router();

// GET all bills with filters
router.get('/', (req: Request, res: Response) => {
  try {
    const { status, table_id, search } = req.query;
    let query = `
      SELECT b.*, t.name as table_name,
        (SELECT COUNT(*) FROM bill_items WHERE bill_id = b.id) as item_count
      FROM bills b
      LEFT JOIN restaurant_tables t ON b.table_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'all') {
      query += ' AND b.status = ?';
      params.push(status);
    }
    if (table_id && table_id !== 'all') {
      query += ' AND b.table_id = ?';
      params.push(table_id);
    }
    if (search) {
      query += ' AND (b.invoice_number LIKE ? OR b.table_id LIKE ? OR b.notes LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY CASE b.status WHEN \'Open\' THEN 1 WHEN \'Unpaid\' THEN 2 ELSE 3 END, b.created_at DESC';

    const bills = db.prepare(query).all(...params);
    res.json({ success: true, data: bills });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single bill details including receipt items and linked orders
router.get('/:id', (req: Request, res: Response) => {
  try {
    const bill = getBillDetails(req.params.id);
    if (!bill) {
      return res.status(404).json({ success: false, error: 'Bill not found' });
    }
    res.json({ success: true, data: bill });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST generate / create bill for a table
router.post('/generate', (req: Request, res: Response) => {
  try {
    const { table_id, notes } = req.body;
    if (!table_id) {
      return res.status(400).json({ success: false, error: 'Table ID is required' });
    }

    const result = createBillForTable(table_id, notes);
    res.json({ success: true, data: result.bill, message: result.message, created: result.created });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST add item to bill
router.post('/:id/items', (req: Request, res: Response) => {
  try {
    const { menu_item_id, quantity, added_by } = req.body;
    if (!menu_item_id || !quantity) {
      return res.status(400).json({ success: false, error: 'menu_item_id and quantity are required' });
    }

    const updated = addItemToBill(req.params.id, menu_item_id, Number(quantity), added_by || 'staff');
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE remove item from bill
router.delete('/:id/items/:itemId', (req: Request, res: Response) => {
  try {
    const updated = removeItemFromBill(req.params.id, req.params.itemId);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST recalculate bill
router.post('/:id/recalculate', (req: Request, res: Response) => {
  try {
    const updated = recalculateBill(req.params.id);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Bill not found' });
    }
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST mark bill as paid
router.post('/:id/pay', (req: Request, res: Response) => {
  try {
    const { payment_method, payment_reference } = req.body;
    if (!payment_method || !['Cash', 'UPI', 'Card'].includes(payment_method)) {
      return res.status(400).json({ success: false, error: 'Valid payment method (Cash, UPI, Card) is required.' });
    }

    const paidBill = markBillPaid(req.params.id, payment_method, payment_reference);
    res.json({ success: true, data: paidBill });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST cancel bill with reason
router.post('/:id/cancel', (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const billId = req.params.id;

    const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId) as any;
    if (!bill) {
      return res.status(404).json({ success: false, error: 'Bill not found' });
    }
    if (bill.status === 'Paid') {
      return res.status(400).json({ success: false, error: 'Cannot cancel an already paid bill.' });
    }

    const now = new Date().toISOString();
    const updatedNotes = (bill.notes ? bill.notes + ' | ' : '') + `Cancelled: ${reason || 'Staff decision'}`;

    db.prepare('UPDATE bills SET status = \'Cancelled\', notes = ?, updated_at = ? WHERE id = ?')
      .run(updatedNotes, now, billId);

    // If table has no other open bills, restore table status
    const openBillsCount = (db.prepare('SELECT COUNT(*) as count FROM bills WHERE table_id = ? AND status IN (\'Open\', \'Unpaid\')').get(bill.table_id) as any).count;
    if (openBillsCount === 0) {
      db.prepare("UPDATE restaurant_tables SET status = 'occupied', updated_at = ? WHERE id = ? AND status = 'bill_requested'").run(now, bill.table_id);
      broadcastEvent('table.updated', { table_id: bill.table_id, status: 'occupied' });
    }

    logActivity('bill', 'Bill Cancelled', `Bill ${bill.invoice_number} cancelled (${reason || 'No reason provided'}).`, bill.table_id, null, 'danger');

    const updated = getBillDetails(billId);
    broadcastEvent('bill.updated', updated);

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
