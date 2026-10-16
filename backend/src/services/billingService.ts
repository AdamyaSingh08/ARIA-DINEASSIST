import { db, logActivity } from '../db';
import { Bill, BillItem } from '../types';
import { broadcastEvent } from '../sockets';

function getSetting(key: string, defaultValue: string): string {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? row.value : defaultValue;
}

export function getBillDetails(billId: string): Bill | null {
  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId) as any;
  if (!bill) return null;

  const items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(billId) as BillItem[];
  const orderRows = db.prepare('SELECT order_id FROM bill_orders WHERE bill_id = ?').all(billId) as { order_id: string }[];

  return {
    ...bill,
    items,
    order_ids: orderRows.map(r => r.order_id)
  };
}

export function recalculateBill(billId: string): Bill | null {
  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId) as any;
  if (!bill) return null;

  const items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(billId) as BillItem[];

  let subtotal = 0;
  for (const item of items) {
    subtotal += item.unit_price * item.quantity;
  }
  subtotal = Number(subtotal.toFixed(2));

  const taxRate = Number(bill.tax_rate || 5.0);
  const taxAmount = Number(((subtotal * taxRate) / 100).toFixed(2));

  const discountRate = Number(bill.discount_rate || 0.0);
  const discountAmount = Number(((subtotal * discountRate) / 100).toFixed(2));

  const finalAmount = Number(Math.max(0, subtotal + taxAmount - discountAmount).toFixed(2));
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE bills
    SET subtotal = ?, tax_amount = ?, discount_amount = ?, final_amount = ?, updated_at = ?
    WHERE id = ?
  `).run(subtotal, taxAmount, discountAmount, finalAmount, now, billId);

  const updatedBill = getBillDetails(billId);
  if (updatedBill) {
    broadcastEvent('bill.updated', updatedBill);
  }
  return updatedBill;
}

export function createBillForTable(tableId: string, customNotes?: string): { bill: Bill; created: boolean; message: string } {
  // Check if there is an active Open or Unpaid bill for this table
  const existingBill = db.prepare(`
    SELECT * FROM bills WHERE table_id = ? AND status IN ('Open', 'Unpaid') ORDER BY created_at DESC LIMIT 1
  `).get(tableId) as any;

  // Find confirmed/preparing/ready/served food orders for this table not yet attached to any bill
  const unbilledOrders = db.prepare(`
    SELECT fo.* FROM food_orders fo
    LEFT JOIN bill_orders bo ON fo.id = bo.order_id
    WHERE fo.table_id = ? 
      AND fo.status IN ('Confirmed', 'Preparing', 'Ready', 'Served')
      AND bo.order_id IS NULL
  `).all(tableId) as any[];

  if (existingBill) {
    // If there are newly completed unbilled orders, attach them to the existing open bill
    if (unbilledOrders.length > 0) {
      for (const ord of unbilledOrders) {
        db.prepare('INSERT OR IGNORE INTO bill_orders (bill_id, order_id) VALUES (?, ?)').run(existingBill.id, ord.id);
        const orderItems = db.prepare('SELECT * FROM food_order_items WHERE order_id = ?').all(ord.id) as any[];
        for (const oi of orderItems) {
          const itemId = 'bi-' + existingBill.id + '-' + Math.random().toString(36).substring(2, 7);
          db.prepare(`
            INSERT INTO bill_items (id, bill_id, order_id, menu_item_id, item_name, unit_price, quantity, line_total, added_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'system')
          `).run(itemId, existingBill.id, ord.id, oi.menu_item_id, oi.item_name, oi.unit_price, oi.quantity, oi.total_price);
        }
      }
      const recalculated = recalculateBill(existingBill.id);
      return {
        bill: recalculated!,
        created: false,
        message: `Attached ${unbilledOrders.length} unbilled order(s) to existing open bill #${existingBill.invoice_number}`
      };
    }

    const fullExisting = getBillDetails(existingBill.id);
    return {
      bill: fullExisting!,
      created: false,
      message: `Open bill #${existingBill.invoice_number} already active for ${tableId}`
    };
  }

  // If no existing bill, generate a new one
  if (unbilledOrders.length === 0) {
    // Check if there are ANY orders at all for this table
    const anyOrders = db.prepare('SELECT COUNT(*) as count FROM food_orders WHERE table_id = ?').get(tableId) as { count: number };
    if (anyOrders.count === 0) {
      throw new Error(`Table ${tableId} has no food orders to generate a bill from.`);
    }
    throw new Error(`Table ${tableId} has no pending or unbilled food orders.`);
  }

  const billCount = (db.prepare('SELECT COUNT(*) as count FROM bills').get() as { count: number }).count + 1;
  const year = new Date().getFullYear();
  const invoiceNumber = `INV-${year}-${String(billCount).padStart(3, '0')}`;
  const billId = 'BILL-' + year + '-' + String(billCount).padStart(3, '0');
  const now = new Date().toISOString();
  const taxRate = parseFloat(getSetting('tax_rate', '5.0'));

  db.prepare(`
    INSERT INTO bills (id, invoice_number, table_id, status, subtotal, tax_rate, tax_amount, discount_rate, discount_amount, final_amount, created_at, updated_at, notes)
    VALUES (?, ?, ?, 'Open', 0.0, ?, 0.0, 0.0, 0.0, 0.0, ?, ?, ?)
  `).run(billId, invoiceNumber, tableId, taxRate, now, now, customNotes || `Bill generated for table ${tableId}`);

  // Link orders and order items
  for (const ord of unbilledOrders) {
    db.prepare('INSERT INTO bill_orders (bill_id, order_id) VALUES (?, ?)').run(billId, ord.id);
    const orderItems = db.prepare('SELECT * FROM food_order_items WHERE order_id = ?').all(ord.id) as any[];
    for (const oi of orderItems) {
      const itemId = 'bi-' + billId + '-' + Math.random().toString(36).substring(2, 7);
      db.prepare(`
        INSERT INTO bill_items (id, bill_id, order_id, menu_item_id, item_name, unit_price, quantity, line_total, added_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'system')
      `).run(itemId, billId, ord.id, oi.menu_item_id, oi.item_name, oi.unit_price, oi.quantity, oi.total_price);
    }
  }

  const finalBill = recalculateBill(billId)!;

  // Update table status
  db.prepare("UPDATE restaurant_tables SET status = 'bill_requested', updated_at = ? WHERE id = ?").run(now, tableId);

  logActivity('bill', 'Bill Created', `Generated invoice ${invoiceNumber} for ${tableId} (₹${finalBill.final_amount}).`, tableId, null, 'info');

  broadcastEvent('bill.created', finalBill);
  broadcastEvent('table.updated', { table_id: tableId, status: 'bill_requested' });

  return {
    bill: finalBill,
    created: true,
    message: `New bill ${invoiceNumber} generated for ${tableId} with ${unbilledOrders.length} order(s)`
  };
}

export function addItemToBill(billId: string, menuItemId: string, quantity: number, addedBy = 'staff'): Bill {
  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId) as any;
  if (!bill) throw new Error('Bill not found');
  if (bill.status === 'Paid' || bill.status === 'Cancelled') {
    throw new Error(`Cannot modify bill in ${bill.status} status.`);
  }

  const menuItem = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(menuItemId) as any;
  if (!menuItem) throw new Error('Menu item not found');

  const itemId = 'bi-' + billId + '-' + Math.random().toString(36).substring(2, 7);
  const lineTotal = Number((menuItem.price * quantity).toFixed(2));

  db.prepare(`
    INSERT INTO bill_items (id, bill_id, order_id, menu_item_id, item_name, unit_price, quantity, line_total, added_by)
    VALUES (?, ?, null, ?, ?, ?, ?, ?, ?)
  `).run(itemId, billId, menuItem.id, menuItem.name, menuItem.price, quantity, lineTotal, addedBy);

  logActivity('bill', 'Item Added to Bill', `Added ${quantity}x ${menuItem.name} to bill ${bill.invoice_number}`, bill.table_id, null, 'info');

  return recalculateBill(billId)!;
}

export function removeItemFromBill(billId: string, billItemId: string): Bill {
  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId) as any;
  if (!bill) throw new Error('Bill not found');
  if (bill.status === 'Paid' || bill.status === 'Cancelled') {
    throw new Error(`Cannot modify bill in ${bill.status} status.`);
  }

  const item = db.prepare('SELECT * FROM bill_items WHERE id = ? AND bill_id = ?').get(billItemId, billId) as any;
  if (!item) throw new Error('Bill item not found');

  db.prepare('DELETE FROM bill_items WHERE id = ?').run(billItemId);

  logActivity('bill', 'Item Removed from Bill', `Removed ${item.item_name} from bill ${bill.invoice_number}`, bill.table_id, null, 'warning');

  return recalculateBill(billId)!;
}

export function markBillPaid(billId: string, paymentMethod: 'Cash' | 'UPI' | 'Card', paymentReference?: string): Bill {
  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId) as any;
  if (!bill) throw new Error('Bill not found');
  if (bill.status === 'Paid') throw new Error('Bill is already marked as paid');

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE bills
    SET status = 'Paid', payment_method = ?, payment_reference = ?, paid_at = ?, updated_at = ?
    WHERE id = ?
  `).run(paymentMethod, paymentReference || `${paymentMethod}-${Date.now()}`, now, now, billId);

  // Mark all linked orders as Served/Completed if not already
  const linkedOrders = db.prepare('SELECT order_id FROM bill_orders WHERE bill_id = ?').all(billId) as { order_id: string }[];
  for (const ord of linkedOrders) {
    db.prepare("UPDATE food_orders SET status = 'Served', updated_at = ? WHERE id = ? AND status != 'Served'").run(now, ord.order_id);
  }

  // Check if there are any other open bills or active orders for this table; if none, free the table!
  const otherOpenBills = db.prepare("SELECT COUNT(*) as count FROM bills WHERE table_id = ? AND status IN ('Open', 'Unpaid')").get(bill.table_id) as { count: number };
  if (otherOpenBills.count === 0) {
    db.prepare("UPDATE restaurant_tables SET status = 'available', updated_at = ? WHERE id = ?").run(now, bill.table_id);
    broadcastEvent('table.updated', { table_id: bill.table_id, status: 'available' });
  }

  logActivity('bill', 'Bill Paid', `Bill ${bill.invoice_number} marked as Paid via ${paymentMethod} (Amount: ₹${bill.final_amount}).`, bill.table_id, null, 'success');

  const updated = getBillDetails(billId)!;
  broadcastEvent('bill.updated', updated);
  return updated;
}
