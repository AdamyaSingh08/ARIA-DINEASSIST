import { db, initDatabase, logActivity } from './index';

export function seedDatabase(force = false) {
  initDatabase();

  const countTables = (db.prepare('SELECT COUNT(*) as count FROM restaurant_tables').get() as { count: number }).count;
  if (countTables > 0 && !force) {
    console.log('Database already seeded. Skipping initial seed.');
    return;
  }

  if (force) {
    console.log('Resetting and re-seeding database...');
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
  }

  const now = new Date();
  const isoNow = now.toISOString();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60000).toISOString();
  const tenMinAgo = new Date(now.getTime() - 10 * 60000).toISOString();
  const twentyMinAgo = new Date(now.getTime() - 20 * 60000).toISOString();

  // App Settings
  const settings = [
    ['restaurant_name', 'Spice Route & Robotics Cafe'],
    ['tax_rate', '5.0'], // 5% GST
    ['currency_symbol', '₹'],
    ['robot_api_key', 'xiaozhi_secret_key_innotech2026'],
    ['demo_mode', 'true'],
    ['heartbeat_timeout_seconds', '90']
  ];
  for (const [key, value] of settings) {
    db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)').run(key, value);
  }

  // Restaurant Tables
  const tables = [
    { id: 'T01', name: 'Table 1 - Window Corner', capacity: 4, status: 'occupied', active_robot_id: 'robot-01' },
    { id: 'T02', name: 'Table 2 - Cozy Booth', capacity: 2, status: 'occupied', active_robot_id: 'robot-02' },
    { id: 'T03', name: 'Table 3 - Central Patio', capacity: 6, status: 'bill_requested', active_robot_id: 'robot-03' },
    { id: 'T04', name: 'Table 4 - Terrace View', capacity: 4, status: 'occupied', active_robot_id: 'robot-04' },
    { id: 'T05', name: 'Table 5 - Family Lounge', capacity: 8, status: 'available', active_robot_id: null },
    { id: 'T06', name: 'Table 6 - Quiet Alcove', capacity: 4, status: 'available', active_robot_id: null }
  ];
  for (const t of tables) {
    db.prepare(`
      INSERT INTO restaurant_tables (id, name, capacity, status, active_robot_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(t.id, t.name, t.capacity, t.status, t.active_robot_id, isoNow, isoNow);
  }

  // Robots
  const robots = [
    {
      id: 'robot-01',
      name: 'XiaoZhi Rover 1',
      model: 'XiaoZhi V2 Pro (ESP32-S3 AI Voice)',
      assigned_table_id: 'T01',
      status: 'online',
      mode: 'physical',
      battery_level: 94,
      last_seen: isoNow,
      last_event_type: 'food_order_submitted',
      firmware_version: '1.4.2-xiaozhi-esp32'
    },
    {
      id: 'robot-02',
      name: 'XiaoZhi Rover 2',
      model: 'XiaoZhi V2 Pro (ESP32-S3 AI Voice)',
      assigned_table_id: 'T02',
      status: 'online',
      mode: 'physical',
      battery_level: 81,
      last_seen: isoNow,
      last_event_type: 'service_request',
      firmware_version: '1.4.2-xiaozhi-esp32'
    },
    {
      id: 'robot-03',
      name: 'XiaoZhi Rover 3',
      model: 'XiaoZhi V2 Pro (ESP32-S3 AI Voice)',
      assigned_table_id: 'T03',
      status: 'online',
      mode: 'demo',
      battery_level: 76,
      last_seen: isoNow,
      last_event_type: 'bill_requested',
      firmware_version: '1.4.2-xiaozhi-esp32'
    },
    {
      id: 'robot-04',
      name: 'XiaoZhi Rover 4',
      model: 'XiaoZhi V2 Pro (ESP32-S3 AI Voice)',
      assigned_table_id: 'T04',
      status: 'online',
      mode: 'demo',
      battery_level: 63,
      last_seen: isoNow,
      last_event_type: 'service_request',
      firmware_version: '1.4.2-xiaozhi-esp32'
    }
  ];
  for (const r of robots) {
    db.prepare(`
      INSERT INTO robots (id, name, model, assigned_table_id, status, mode, battery_level, last_seen, last_event_type, last_error, firmware_version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, null, ?, ?, ?)
    `).run(r.id, r.name, r.model, r.assigned_table_id, r.status, r.mode, r.battery_level, r.last_seen, r.last_event_type, r.firmware_version, isoNow, isoNow);
  }

  // Menu Items
  const menu = [
    { id: 'item-001', name: 'Paneer Tikka Angara', category: 'Starters', description: 'Cottage cheese marinated in tandoori spices and charred over charcoal.', price: 240, is_veg: 1 },
    { id: 'item-002', name: 'Crispy Corn Salt & Pepper', category: 'Starters', description: 'Crisp golden sweet corn kernels tossed with crushed pepper and spring onion.', price: 190, is_veg: 1 },
    { id: 'item-003', name: 'Chicken Malai Tikka', category: 'Starters', description: 'Tender chicken morsels steeped in cream, hung curd, and aromatic cardamom.', price: 290, is_veg: 0 },
    { id: 'item-004', name: 'Tandoori Soya Chaap', category: 'Starters', description: 'Soy skewers roasted to perfection with spicy red marination.', price: 210, is_veg: 1 },
    { id: 'item-005', name: 'Amritsari Fish Fry', category: 'Starters', description: 'Carom seed scented river sole batter fried crisp, served with mint chutney.', price: 340, is_veg: 0 },

    { id: 'item-006', name: 'Dal Makhani Royal', category: 'Main Course', description: 'Slow cooked black lentils simmered overnight with butter and cream.', price: 260, is_veg: 1 },
    { id: 'item-007', name: 'Butter Chicken Grand Trunk', category: 'Main Course', description: 'Roasted chicken simmered in rich satin-smooth tomato gravy.', price: 360, is_veg: 0 },
    { id: 'item-008', name: 'Paneer Butter Masala', category: 'Main Course', description: 'Fresh paneer cubes in mildly sweet cashew and tomato gravy.', price: 280, is_veg: 1 },
    { id: 'item-009', name: 'Kadai Subz Medley', category: 'Main Course', description: 'Wok tossed bell peppers, beans, and carrots with crushed coriander.', price: 230, is_veg: 1 },
    { id: 'item-010', name: 'Mutton Rogan Josh', category: 'Main Course', description: 'Kashmiri delicacy of tender braised lamb infused with ratanjot.', price: 420, is_veg: 0 },

    { id: 'item-011', name: 'Butter Naan', category: 'Breads & Rice', description: 'Refined flour leavened flatbread glazed with melted butter.', price: 50, is_veg: 1 },
    { id: 'item-012', name: 'Garlic Chilli Naan', category: 'Breads & Rice', description: 'Crisp tandoor baked naan topped with crushed garlic and cilantro.', price: 65, is_veg: 1 },
    { id: 'item-013', name: 'Jeera Basmati Rice', category: 'Breads & Rice', description: 'Steamed long grain basmati rice tempered with toasted cumin seeds.', price: 140, is_veg: 1 },
    { id: 'item-014', name: 'Hyderabadi Chicken Biryani', category: 'Breads & Rice', description: 'Layered fragrant saffron rice with bone-in chicken and fried onions.', price: 320, is_veg: 0 },
    { id: 'item-015', name: 'Subz Handi Dum Biryani', category: 'Breads & Rice', description: 'Garden vegetables slow cooked in traditional earthen pot with aged basmati.', price: 250, is_veg: 1 },

    { id: 'item-016', name: 'Fresh Mint Lime Soda', category: 'Beverages', description: 'Chilled fizzy soda with pressed limes, mint leaves, and rock salt.', price: 90, is_veg: 1 },
    { id: 'item-017', name: 'Spiced Buttermilk (Chaas)', category: 'Beverages', description: 'Traditional churned yogurt drink with roasted cumin and ginger.', price: 70, is_veg: 1 },
    { id: 'item-018', name: 'Royal Kesar Mango Lassi', category: 'Beverages', description: 'Creamy thick sweet yogurt infused with Alphonso mango pulp.', price: 120, is_veg: 1 },
    { id: 'item-019', name: 'Himalayan Spring Water 1L', category: 'Beverages', description: 'Pure packaged mineral water.', price: 40, is_veg: 1 },

    { id: 'item-020', name: 'Gulab Jamun with Pista (2 pcs)', category: 'Desserts', description: 'Golden fried milk solids dipped in warm cardamom saffron syrup.', price: 110, is_veg: 1 },
    { id: 'item-021', name: 'Kesari Rasmalai Bowl', category: 'Desserts', description: 'Soft spongy cottage cheese dumplings submerged in saffron infused milk.', price: 140, is_veg: 1 },
    { id: 'item-022', name: 'Sizzling Walnut Brownie', category: 'Desserts', description: 'Hot fudge brownie on cast iron sizzler with vanilla bean gelato.', price: 190, is_veg: 1 }
  ];

  for (const m of menu) {
    db.prepare(`
      INSERT INTO menu_items (id, name, category, description, price, is_veg, is_available, image_url)
      VALUES (?, ?, ?, ?, ?, ?, 1, null)
    `).run(m.id, m.name, m.category, m.description, m.price, m.is_veg);
  }

  // Initial Service Requests
  const requests = [
    {
      id: 'REQ-1001',
      table_id: 'T04',
      robot_id: 'robot-04',
      request_type: 'water',
      message: 'Customer requested 2 extra glasses of chilled water',
      status: 'New',
      created_at: fiveMinAgo
    },
    {
      id: 'REQ-1002',
      table_id: 'T02',
      robot_id: 'robot-02',
      request_type: 'waiter',
      message: 'Customer called waiter for cutlery & napkin refill',
      status: 'Acknowledged',
      assigned_staff: 'Rahul (Captain)',
      created_at: tenMinAgo,
      acknowledged_at: fiveMinAgo
    },
    {
      id: 'REQ-1003',
      table_id: 'T03',
      robot_id: 'robot-03',
      request_type: 'bill',
      message: 'Customer finished dinner and requested final bill',
      status: 'In Progress',
      assigned_staff: 'Simran (Cashier)',
      created_at: twentyMinAgo,
      acknowledged_at: tenMinAgo
    }
  ];
  for (const req of requests) {
    db.prepare(`
      INSERT INTO service_requests (id, table_id, robot_id, request_type, message, status, assigned_staff, created_at, acknowledged_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.id, req.table_id, req.robot_id, req.request_type, req.message, req.status, req.assigned_staff || null, req.created_at, req.acknowledged_at || null);
  }

  // Initial Food Orders
  // Order 1 for Table 1
  const ord1Id = 'ORD-2026-001';
  db.prepare(`
    INSERT INTO food_orders (id, table_id, robot_id, status, subtotal, special_instructions, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(ord1Id, 'T01', 'robot-01', 'Preparing', 720.0, 'Make paneer tikka extra crisp; naan without butter on one piece', twentyMinAgo, tenMinAgo);

  const ord1Items = [
    { menu_id: 'item-001', name: 'Paneer Tikka Angara', price: 240, qty: 1, notes: 'Extra crisp' },
    { menu_id: 'item-008', name: 'Paneer Butter Masala', price: 280, qty: 1, notes: 'Medium spice' },
    { menu_id: 'item-011', name: 'Butter Naan', price: 50, qty: 2, notes: '' },
    { menu_id: 'item-012', name: 'Garlic Chilli Naan', price: 65, qty: 1, notes: '' },
    { menu_id: 'item-019', name: 'Himalayan Spring Water 1L', price: 40, qty: 1, notes: '' } // 240+280+100+65+40 = 725 -> adjust:
  ];
  let ord1Subtotal = 0;
  for (let i = 0; i < ord1Items.length; i++) {
    const it = ord1Items[i];
    const total = it.price * it.qty;
    ord1Subtotal += total;
    db.prepare(`
      INSERT INTO food_order_items (id, order_id, menu_item_id, item_name, unit_price, quantity, notes, total_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`oi-${ord1Id}-${i+1}`, ord1Id, it.menu_id, it.name, it.price, it.qty, it.notes, total);
  }
  db.prepare('UPDATE food_orders SET subtotal = ? WHERE id = ?').run(ord1Subtotal, ord1Id);

  // Order 2 for Table 3
  const ord2Id = 'ORD-2026-002';
  db.prepare(`
    INSERT INTO food_orders (id, table_id, robot_id, status, subtotal, special_instructions, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(ord2Id, 'T03', 'robot-03', 'Served', 1170.0, 'Kids at table, keep biryani mild', twentyMinAgo, fiveMinAgo);

  const ord2Items = [
    { menu_id: 'item-003', name: 'Chicken Malai Tikka', price: 290, qty: 1, notes: '' },
    { menu_id: 'item-007', name: 'Butter Chicken Grand Trunk', price: 360, qty: 1, notes: '' },
    { menu_id: 'item-014', name: 'Hyderabadi Chicken Biryani', price: 320, qty: 1, notes: 'Mild spice' },
    { menu_id: 'item-011', name: 'Butter Naan', price: 50, qty: 2, notes: '' },
    { menu_id: 'item-020', name: 'Gulab Jamun with Pista (2 pcs)', price: 110, qty: 1, notes: 'Served warm' }
  ];
  let ord2Subtotal = 0;
  for (let i = 0; i < ord2Items.length; i++) {
    const it = ord2Items[i];
    const total = it.price * it.qty;
    ord2Subtotal += total;
    db.prepare(`
      INSERT INTO food_order_items (id, order_id, menu_item_id, item_name, unit_price, quantity, notes, total_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`oi-${ord2Id}-${i+1}`, ord2Id, it.menu_id, it.name, it.price, it.qty, it.notes, total);
  }
  db.prepare('UPDATE food_orders SET subtotal = ? WHERE id = ?').run(ord2Subtotal, ord2Id);

  // Bill for Table 3 (Open / Unpaid with bill requested)
  const bill1Id = 'BILL-2026-001';
  const taxRate = 5.0;
  const taxAmount = Number(((ord2Subtotal * taxRate) / 100).toFixed(2));
  const finalAmount = Number((ord2Subtotal + taxAmount).toFixed(2));

  db.prepare(`
    INSERT INTO bills (id, invoice_number, table_id, status, subtotal, tax_rate, tax_amount, discount_rate, discount_amount, final_amount, created_at, updated_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(bill1Id, 'INV-2026-001', 'T03', 'Open', ord2Subtotal, taxRate, taxAmount, 0, 0, finalAmount, tenMinAgo, fiveMinAgo, 'Generated upon robot request from Table 3');

  for (let i = 0; i < ord2Items.length; i++) {
    const it = ord2Items[i];
    db.prepare(`
      INSERT INTO bill_items (id, bill_id, order_id, menu_item_id, item_name, unit_price, quantity, line_total, added_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`bi-${bill1Id}-${i+1}`, bill1Id, ord2Id, it.menu_id, it.name, it.price, it.qty, it.price * it.qty, 'system');
  }

  db.prepare(`
    INSERT INTO bill_orders (bill_id, order_id) VALUES (?, ?)
  `).run(bill1Id, ord2Id);

  // Past Paid Bill for Table 2 (from earlier today)
  const pastBillId = 'BILL-2026-000';
  const pastSubtotal = 490.0;
  const pastTax = 24.50;
  const pastTotal = 514.50;
  db.prepare(`
    INSERT INTO bills (id, invoice_number, table_id, status, subtotal, tax_rate, tax_amount, discount_rate, discount_amount, final_amount, payment_method, payment_reference, paid_at, created_at, updated_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(pastBillId, 'INV-2026-000', 'T02', 'Paid', pastSubtotal, 5.0, pastTax, 0, 0, pastTotal, 'UPI', 'UPI/20261016/994821', tenMinAgo, twentyMinAgo, tenMinAgo, 'Quick breakfast combo paid via GPay');

  // Activity logs
  logActivity('system', 'System Boot', 'DineAssist server online and connected to local SQLite database.', null, null, 'info');
  logActivity('robot', 'Robot Online', 'XiaoZhi Rover 1 established heartbeat and linked to Table 1.', 'T01', 'robot-01', 'success');
  logActivity('order', 'Order Placed', 'Table 1 submitted 5 items via XiaoZhi Rover 1 (Total: ₹' + ord1Subtotal + ').', 'T01', 'robot-01', 'info');
  logActivity('request', 'Water Request', 'Table 4 requested water via XiaoZhi Rover 4.', 'T04', 'robot-04', 'warning');
  logActivity('bill', 'Bill Requested', 'Table 3 asked for the bill via XiaoZhi Rover 3. Invoice INV-2026-001 generated.', 'T03', 'robot-03', 'info');

  console.log('Database seeded successfully with demo tables, robots, menu, orders, and bills!');
}

// If executed directly from CLI:
if (require.main === module) {
  seedDatabase(true);
}
