import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

// Ensure data folder exists
const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'dineassist.db');
export const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS restaurant_tables (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 4,
      status TEXT NOT NULL DEFAULT 'available',
      active_robot_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS robots (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT 'XiaoZhi V2 Pro',
      assigned_table_id TEXT,
      status TEXT NOT NULL DEFAULT 'offline',
      mode TEXT NOT NULL DEFAULT 'demo',
      battery_level INTEGER NOT NULL DEFAULT 100,
      last_seen TEXT,
      last_event_type TEXT,
      last_error TEXT,
      firmware_version TEXT NOT NULL DEFAULT '1.4.2-xiaozhi-esp32',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      is_veg INTEGER NOT NULL DEFAULT 1,
      is_available INTEGER NOT NULL DEFAULT 1,
      image_url TEXT
    );

    CREATE TABLE IF NOT EXISTS service_requests (
      id TEXT PRIMARY KEY,
      table_id TEXT NOT NULL,
      robot_id TEXT,
      request_type TEXT NOT NULL,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'New',
      assigned_staff TEXT,
      created_at TEXT NOT NULL,
      acknowledged_at TEXT,
      completed_at TEXT,
      cancelled_at TEXT,
      cancel_reason TEXT,
      idempotency_key TEXT UNIQUE,
      FOREIGN KEY (table_id) REFERENCES restaurant_tables(id)
    );

    CREATE TABLE IF NOT EXISTS food_orders (
      id TEXT PRIMARY KEY,
      table_id TEXT NOT NULL,
      robot_id TEXT,
      status TEXT NOT NULL DEFAULT 'Received',
      subtotal REAL NOT NULL DEFAULT 0.0,
      special_instructions TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      idempotency_key TEXT UNIQUE,
      FOREIGN KEY (table_id) REFERENCES restaurant_tables(id)
    );

    CREATE TABLE IF NOT EXISTS food_order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      menu_item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      notes TEXT,
      total_price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES food_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
    );

    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL UNIQUE,
      table_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open',
      subtotal REAL NOT NULL DEFAULT 0.0,
      tax_rate REAL NOT NULL DEFAULT 5.0,
      tax_amount REAL NOT NULL DEFAULT 0.0,
      discount_rate REAL NOT NULL DEFAULT 0.0,
      discount_amount REAL NOT NULL DEFAULT 0.0,
      final_amount REAL NOT NULL DEFAULT 0.0,
      payment_method TEXT,
      payment_reference TEXT,
      paid_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (table_id) REFERENCES restaurant_tables(id)
    );

    CREATE TABLE IF NOT EXISTS bill_items (
      id TEXT PRIMARY KEY,
      bill_id TEXT NOT NULL,
      order_id TEXT,
      menu_item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      line_total REAL NOT NULL,
      added_by TEXT NOT NULL DEFAULT 'system',
      FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bill_orders (
      bill_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      PRIMARY KEY (bill_id, order_id),
      FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
      FOREIGN KEY (order_id) REFERENCES food_orders(id)
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      table_id TEXT,
      robot_id TEXT,
      severity TEXT NOT NULL DEFAULT 'info',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS processed_events (
      event_id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      type TEXT NOT NULL,
      payload TEXT,
      processed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

export function logActivity(
  type: 'request' | 'order' | 'bill' | 'robot' | 'system',
  title: string,
  description: string,
  table_id: string | null = null,
  robot_id: string | null = null,
  severity: 'info' | 'success' | 'warning' | 'danger' = 'info'
) {
  const id = 'act-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO activity_logs (id, type, title, description, table_id, robot_id, severity, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, type, title, description, table_id, robot_id, severity, now);
  return { id, type, title, description, table_id, robot_id, severity, created_at: now };
}
