import { db, logActivity } from '../db';
import { broadcastEvent } from '../sockets';
import { createBillForTable } from './billingService';
import { xiaozhiAdapter } from '../adapters/xiaozhiAdapter';

export interface RobotEventPayload {
  event_id: string;
  robot_id: string;
  table_id: string;
  type: 'service_request' | 'food_order_submitted' | 'bill_requested' | 'robot_status' | 'heartbeat';
  request_type?: 'water' | 'waiter' | 'bill' | 'assistance' | 'custom';
  message?: string;
  items?: Array<{
    menu_item_id: string;
    quantity: number;
    notes?: string;
  }>;
  special_instructions?: string;
  battery_level?: number;
  mode?: 'physical' | 'demo';
  status?: 'online' | 'offline' | 'unknown';
  timestamp?: string;
}

export function processRobotEvent(payload: RobotEventPayload, source = 'robot_http') {
  const { event_id, robot_id, table_id, type } = payload;
  const timestamp = payload.timestamp || new Date().toISOString();

  if (!event_id) {
    throw new Error('Missing event_id in event payload');
  }
  if (!robot_id && type !== 'robot_status') {
    throw new Error('Missing robot_id in event payload');
  }

  // Idempotency / Duplicate Prevention Check
  const existingEvent = db.prepare('SELECT event_id FROM processed_events WHERE event_id = ?').get(event_id);
  if (existingEvent) {
    return {
      success: true,
      duplicate: true,
      message: `Event ${event_id} has already been processed previously. Duplicate ignored.`,
      event_id
    };
  }

  // Ensure robot exists or register automatically if new
  if (robot_id) {
    const robot = db.prepare('SELECT id FROM robots WHERE id = ?').get(robot_id);
    if (!robot) {
      db.prepare(`
        INSERT INTO robots (id, name, model, assigned_table_id, status, mode, battery_level, last_seen, last_event_type, firmware_version, created_at, updated_at)
        VALUES (?, ?, 'XiaoZhi V2 Pro', ?, 'online', 'physical', 100, ?, ?, '1.4.2-xiaozhi-esp32', ?, ?)
      `).run(robot_id, `XiaoZhi (${robot_id})`, table_id || null, timestamp, type, timestamp, timestamp);
    } else {
      db.prepare(`
        UPDATE robots 
        SET last_seen = ?, last_event_type = ?, status = 'online', updated_at = ?
        WHERE id = ?
      `).run(timestamp, type, timestamp, robot_id);
    }
  }

  // Ensure table exists if provided
  if (table_id) {
    const table = db.prepare('SELECT id FROM restaurant_tables WHERE id = ?').get(table_id);
    if (!table) {
      db.prepare(`
        INSERT INTO restaurant_tables (id, name, capacity, status, active_robot_id, created_at, updated_at)
        VALUES (?, ?, 4, 'occupied', ?, ?, ?)
      `).run(table_id, `Table ${table_id}`, robot_id || null, timestamp, timestamp);
    } else if (robot_id) {
      db.prepare(`
        UPDATE restaurant_tables 
        SET active_robot_id = ?, status = CASE WHEN status = 'available' THEN 'occupied' ELSE status END, updated_at = ?
        WHERE id = ?
      `).run(robot_id, timestamp, table_id);
    }
  }

  let resultData: any = null;

  switch (type) {
    case 'service_request': {
      const requestType = payload.request_type || 'assistance';
      const reqId = 'REQ-' + Date.now().toString().slice(-4) + Math.random().toString(36).substring(2, 5).toUpperCase();
      const message = payload.message || `Customer requested ${requestType} from robot ${robot_id}`;

      db.prepare(`
        INSERT INTO service_requests (id, table_id, robot_id, request_type, message, status, created_at, idempotency_key)
        VALUES (?, ?, ?, ?, ?, 'New', ?, ?)
      `).run(reqId, table_id, robot_id, requestType, message, timestamp, event_id);

      resultData = {
        id: reqId,
        table_id,
        robot_id,
        request_type: requestType,
        message,
        status: 'New',
        created_at: timestamp,
        idempotency_key: event_id
      };

      logActivity('request', `Service Request: ${requestType.toUpperCase()}`, `${table_id} requested ${requestType} via ${robot_id}`, table_id, robot_id, requestType === 'water' || requestType === 'waiter' ? 'warning' : 'info');

      broadcastEvent('request.created', resultData);

      // Trigger outbound acknowledgement to robot
      xiaozhiAdapter.sendOutboundAcknowledgement({
        robot_id,
        table_id,
        event_type: 'acknowledgement',
        message: `Your request for ${requestType} has been received by our staff.`
      });
      break;
    }

    case 'food_order_submitted': {
      if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
        throw new Error('Food order payload must contain at least one item');
      }

      const ordId = 'ORD-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-5);
      let calculatedSubtotal = 0;
      const orderItemsToInsert: any[] = [];

      // Validate items against authoritative database prices!
      for (const it of payload.items) {
        const menuItem = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(it.menu_item_id) as any;
        if (!menuItem) {
          throw new Error(`Menu item '${it.menu_item_id}' not found in database.`);
        }
        const qty = Math.max(1, Number(it.quantity) || 1);
        const itemTotal = Number((menuItem.price * qty).toFixed(2));
        calculatedSubtotal += itemTotal;

        orderItemsToInsert.push({
          id: 'oi-' + ordId + '-' + (orderItemsToInsert.length + 1),
          order_id: ordId,
          menu_item_id: menuItem.id,
          item_name: menuItem.name,
          unit_price: menuItem.price,
          quantity: qty,
          notes: it.notes || null,
          total_price: itemTotal
        });
      }

      calculatedSubtotal = Number(calculatedSubtotal.toFixed(2));

      db.prepare(`
        INSERT INTO food_orders (id, table_id, robot_id, status, subtotal, special_instructions, created_at, updated_at, idempotency_key)
        VALUES (?, ?, ?, 'Received', ?, ?, ?, ?, ?)
      `).run(ordId, table_id, robot_id, calculatedSubtotal, payload.special_instructions || null, timestamp, timestamp, event_id);

      for (const oi of orderItemsToInsert) {
        db.prepare(`
          INSERT INTO food_order_items (id, order_id, menu_item_id, item_name, unit_price, quantity, notes, total_price)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(oi.id, oi.order_id, oi.menu_item_id, oi.item_name, oi.unit_price, oi.quantity, oi.notes, oi.total_price);
      }

      // Update table occupancy
      db.prepare("UPDATE restaurant_tables SET status = 'occupied', updated_at = ? WHERE id = ?").run(timestamp, table_id);

      resultData = {
        id: ordId,
        table_id,
        robot_id,
        status: 'Received',
        subtotal: calculatedSubtotal,
        special_instructions: payload.special_instructions || null,
        created_at: timestamp,
        items: orderItemsToInsert
      };

      logActivity('order', 'Food Order Received', `${table_id} ordered ${orderItemsToInsert.length} items (Total: ₹${calculatedSubtotal}) via ${robot_id}`, table_id, robot_id, 'info');

      broadcastEvent('order.created', resultData);
      broadcastEvent('table.updated', { table_id, status: 'occupied' });

      // Outbound robot TTS confirmation
      xiaozhiAdapter.sendOutboundAcknowledgement({
        robot_id,
        table_id,
        event_type: 'tts_speak',
        message: `Order confirmed for ${table_id}. Total ₹${calculatedSubtotal}. The kitchen is now preparing your delicious food.`
      });
      break;
    }

    case 'bill_requested': {
      // Create or locate bill for this table
      let billResult: any;
      try {
        billResult = createBillForTable(table_id, `Bill requested by customer via robot ${robot_id}`);
      } catch (err: any) {
        // If table has no orders, create an informative service request so staff knows customer is asking for bill
        const reqId = 'REQ-' + Date.now().toString().slice(-4) + Math.random().toString(36).substring(2, 5).toUpperCase();
        const msg = `Customer at ${table_id} requested bill via robot, but no billable orders were found.`;
        db.prepare(`
          INSERT INTO service_requests (id, table_id, robot_id, request_type, message, status, created_at, idempotency_key)
          VALUES (?, ?, ?, 'bill', ?, 'New', ?, ?)
        `).run(reqId, table_id, robot_id, msg, timestamp, event_id);

        broadcastEvent('request.created', {
          id: reqId,
          table_id,
          robot_id,
          request_type: 'bill',
          message: msg,
          status: 'New',
          created_at: timestamp
        });

        xiaozhiAdapter.sendOutboundAcknowledgement({
          robot_id,
          table_id,
          event_type: 'tts_speak',
          message: 'Our staff has been notified of your bill request and will assist you shortly.'
        });

        resultData = { message: msg, no_orders: true };
        break;
      }

      // Also create an associated service request for tracking
      const reqId = 'REQ-' + Date.now().toString().slice(-4) + Math.random().toString(36).substring(2, 5).toUpperCase();
      const msg = `Bill requested at ${table_id}. Current invoice: ${billResult.bill.invoice_number} (₹${billResult.bill.final_amount})`;
      db.prepare(`
        INSERT INTO service_requests (id, table_id, robot_id, request_type, message, status, created_at, idempotency_key)
        VALUES (?, ?, ?, 'bill', ?, 'New', ?, ?)
      `).run(reqId, table_id, robot_id, msg, timestamp, `${event_id}-req`);

      broadcastEvent('request.created', {
        id: reqId,
        table_id,
        robot_id,
        request_type: 'bill',
        message: msg,
        status: 'New',
        created_at: timestamp
      });

      resultData = billResult;

      xiaozhiAdapter.sendOutboundAcknowledgement({
        robot_id,
        table_id,
        event_type: 'tts_speak',
        message: `Your bill has been generated. Total payable is ₹${billResult.bill.final_amount}. Staff will be with you shortly.`
      });
      break;
    }

    case 'robot_status': {
      const { battery_level, mode, status } = payload;
      const updates: string[] = ['updated_at = ?', 'last_seen = ?'];
      const params: any[] = [timestamp, timestamp];

      if (battery_level !== undefined) {
        updates.push('battery_level = ?');
        params.push(battery_level);
      }
      if (mode) {
        updates.push('mode = ?');
        params.push(mode);
      }
      if (status) {
        updates.push('status = ?');
        params.push(status);
      }
      if (table_id) {
        updates.push('assigned_table_id = ?');
        params.push(table_id);
      }

      params.push(robot_id);
      db.prepare(`UPDATE robots SET ${updates.join(', ')} WHERE id = ?`).run(...params);

      const updatedRobot = db.prepare('SELECT * FROM robots WHERE id = ?').get(robot_id);
      resultData = updatedRobot;
      broadcastEvent('robot.status', updatedRobot);
      break;
    }

    case 'heartbeat': {
      db.prepare(`
        UPDATE robots 
        SET last_seen = ?, status = 'online', updated_at = ?
        WHERE id = ?
      `).run(timestamp, timestamp, robot_id);

      const robot = db.prepare('SELECT * FROM robots WHERE id = ?').get(robot_id);
      resultData = robot;
      broadcastEvent('robot.heartbeat', { robot_id, last_seen: timestamp, status: 'online' });
      break;
    }

    default:
      throw new Error(`Unsupported event type: '${type}'`);
  }

  // Record into processed_events for idempotency audit
  db.prepare(`
    INSERT INTO processed_events (event_id, source, type, payload, processed_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(event_id, source, type, JSON.stringify(payload), timestamp);

  return {
    success: true,
    duplicate: false,
    message: `Event '${type}' successfully processed`,
    event_id,
    data: resultData
  };
}
