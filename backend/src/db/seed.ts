import { db, initDatabase, logActivity } from './index';

export function seedDatabase(force = false) {
  initDatabase();

  const countTables = (db.prepare('SELECT COUNT(*) as count FROM restaurant_tables').get() as { count: number }).count;
  if (countTables > 0 && !force) {
    console.log('Database already initialized.');
    return;
  }

  console.log('Initializing clean single-robot DineAssist database...');
  db.exec(`
    DELETE FROM bill_items;
    DELETE FROM bill_orders;
    DELETE FROM bills;
    DELETE FROM food_order_items;
    DELETE FROM food_orders;
    DELETE FROM service_requests;
    DELETE FROM activity_logs;
    DELETE FROM processed_events;
    DELETE FROM robots;
    DELETE FROM restaurant_tables;
    DELETE FROM menu_items;
    DELETE FROM app_settings;
  `);

  const now = new Date();
  const isoNow = now.toISOString();

  // Settings
  const settings = [
    ['restaurant_name', 'DineAssist AI Restaurant'],
    ['tax_rate', '5.0'],
    ['currency_symbol', '₹'],
    ['robot_api_key', 'xiaozhi_secret_key_innotech2026'],
    ['active_robot_id', 'robot-01'],
    ['heartbeat_timeout_seconds', '90']
  ];
  for (const [key, value] of settings) {
    db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)').run(key, value);
  }

  // Restaurant Tables (T01 - T06)
  const tables = [
    { id: 'T01', name: 'Table 1', capacity: 4, status: 'available' },
    { id: 'T02', name: 'Table 2', capacity: 2, status: 'available' },
    { id: 'T03', name: 'Table 3', capacity: 6, status: 'available' },
    { id: 'T04', name: 'Table 4', capacity: 4, status: 'occupied' }, // Robot is currently here
    { id: 'T05', name: 'Table 5', capacity: 8, status: 'available' },
    { id: 'T06', name: 'Table 6', capacity: 4, status: 'available' }
  ];
  for (const t of tables) {
    db.prepare(`
      INSERT INTO restaurant_tables (id, name, capacity, status, active_robot_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(t.id, t.name, t.capacity, t.status, t.id === 'T04' ? 'robot-01' : null, isoNow, isoNow);
  }

  // Single Robot: XiaoZhi Robot
  db.prepare(`
    INSERT INTO robots (id, name, model, assigned_table_id, status, mode, battery_level, last_seen, last_event_type, last_error, firmware_version, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'online', 'physical', 94, ?, 'heartbeat', null, '1.4.2-xiaozhi-esp32', ?, ?)
  `).run('robot-01', 'XiaoZhi Robot (ARIA)', 'XiaoZhi ESP32-S3 Voice Rover', 'T04', isoNow, isoNow, isoNow);

  // Authoritative Menu Catalog (for pricing when robot sends customer food orders)
  const menu = [
    { id: 'item-001', name: 'Paneer Tikka Angara', category: 'Starters', description: 'Cottage cheese charred with tandoori spices', price: 240, is_veg: 1 },
    { id: 'item-002', name: 'Crispy Corn Salt & Pepper', category: 'Starters', description: 'Golden sweet corn with black pepper', price: 190, is_veg: 1 },
    { id: 'item-003', name: 'Chicken Malai Tikka', category: 'Starters', description: 'Creamy cardamom infused chicken morsels', price: 290, is_veg: 0 },
    { id: 'item-004', name: 'Dal Makhani Royal', category: 'Main Course', description: 'Overnight simmered creamy black lentils', price: 260, is_veg: 1 },
    { id: 'item-005', name: 'Butter Chicken Grand Trunk', category: 'Main Course', description: 'Smoked chicken in velvet tomato gravy', price: 360, is_veg: 0 },
    { id: 'item-006', name: 'Butter Naan', category: 'Breads', description: 'Crisp clay oven flatbread with butter', price: 50, is_veg: 1 },
    { id: 'item-007', name: 'Hyderabadi Dum Biryani', category: 'Rice', description: 'Fragrant basmati layered with spices', price: 320, is_veg: 0 },
    { id: 'item-008', name: 'Fresh Mint Lime Soda', category: 'Drinks', description: 'Pressed fresh limes, mint & chilled soda', price: 90, is_veg: 1 },
    { id: 'item-009', name: 'Mineral Water 1L', category: 'Drinks', description: 'Chilled sealed mineral water', price: 40, is_veg: 1 },
    { id: 'item-010', name: 'Gulab Jamun (2 pcs)', category: 'Dessert', description: 'Warm cardamom saffron milk dumplings', price: 110, is_veg: 1 }
  ];

  for (const m of menu) {
    db.prepare(`
      INSERT INTO menu_items (id, name, category, description, price, is_veg, is_available, image_url)
      VALUES (?, ?, ?, ?, ?, ?, 1, null)
    `).run(m.id, m.name, m.category, m.description, m.price, m.is_veg);
  }

  // 1 initial live service request from the robot at Table 4 so judges see how it looks
  const initialReqId = 'REQ-' + Date.now().toString().slice(-4);
  db.prepare(`
    INSERT INTO service_requests (id, table_id, robot_id, request_type, message, status, created_at)
    VALUES (?, 'T04', 'robot-01', 'water', 'Customer requested chilled drinking water', 'New', ?)
  `).run(initialReqId, isoNow);

  logActivity('robot', 'Robot Online', 'XiaoZhi Robot (ARIA) established link at Table 4.', 'T04', 'robot-01', 'success');
  logActivity('request', 'Water Request', 'Customer at Table 4 requested water via XiaoZhi Robot.', 'T04', 'robot-01', 'warning');

  console.log('Single-robot DineAssist database seeded successfully!');
}

if (require.main === module) {
  seedDatabase(true);
}
