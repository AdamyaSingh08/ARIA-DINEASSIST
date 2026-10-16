import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartIso = todayStart.toISOString();

    // Summary Statistics from real database
    const newRequestsCount = (db.prepare("SELECT COUNT(*) as count FROM service_requests WHERE status = 'New'").get() as any).count;
    const inProgressRequestsCount = (db.prepare("SELECT COUNT(*) as count FROM service_requests WHERE status IN ('Acknowledged', 'In Progress')").get() as any).count;
    const completedTodayCount = (db.prepare("SELECT COUNT(*) as count FROM service_requests WHERE status = 'Completed' AND completed_at >= ?").get(todayStartIso) as any).count;
    const pendingOrdersCount = (db.prepare("SELECT COUNT(*) as count FROM food_orders WHERE status NOT IN ('Served', 'Cancelled')").get() as any).count;
    const openBillsCount = (db.prepare("SELECT COUNT(*) as count FROM bills WHERE status IN ('Open', 'Unpaid')").get() as any).count;
    const connectedRobotsCount = (db.prepare("SELECT COUNT(*) as count FROM robots WHERE status = 'online'").get() as any).count;
    const totalRobotsCount = (db.prepare("SELECT COUNT(*) as count FROM robots").get() as any).count;

    // Latest incoming requests
    const latestRequests = db.prepare(`
      SELECT r.*, t.name as table_name
      FROM service_requests r
      LEFT JOIN restaurant_tables t ON r.table_id = t.id
      ORDER BY r.created_at DESC
      LIMIT 6
    `).all();

    // Recent food orders with items count
    const recentOrders = db.prepare(`
      SELECT o.*, t.name as table_name,
        (SELECT COUNT(*) FROM food_order_items WHERE order_id = o.id) as item_count
      FROM food_orders o
      LEFT JOIN restaurant_tables t ON o.table_id = t.id
      ORDER BY o.created_at DESC
      LIMIT 6
    `).all();

    // Tables requiring attention:
    // Has New/Acknowledged request OR status = 'bill_requested' OR active order waiting
    const tablesRequiringAttention = db.prepare(`
      SELECT t.*, 
        (SELECT COUNT(*) FROM service_requests sr WHERE sr.table_id = t.id AND sr.status IN ('New', 'Acknowledged', 'In Progress')) as active_requests,
        (SELECT COUNT(*) FROM food_orders fo WHERE fo.table_id = t.id AND fo.status NOT IN ('Served', 'Cancelled')) as active_orders,
        (SELECT final_amount FROM bills b WHERE b.table_id = t.id AND b.status IN ('Open', 'Unpaid') ORDER BY b.created_at DESC LIMIT 1) as outstanding_bill
      FROM restaurant_tables t
      WHERE t.status = 'bill_requested'
         OR (SELECT COUNT(*) FROM service_requests sr WHERE sr.table_id = t.id AND sr.status IN ('New', 'Acknowledged')) > 0
      ORDER BY t.id ASC
    `).all();

    // Robot connection statuses
    const robots = db.prepare(`
      SELECT r.*, t.name as table_name 
      FROM robots r
      LEFT JOIN restaurant_tables t ON r.assigned_table_id = t.id
      ORDER BY r.id ASC
    `).all();

    // Activity feed
    const activityFeed = db.prepare(`
      SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 10
    `).all();

    // Settings
    const demoModeRow = db.prepare("SELECT value FROM app_settings WHERE key = 'demo_mode'").get() as any;
    const restaurantNameRow = db.prepare("SELECT value FROM app_settings WHERE key = 'restaurant_name'").get() as any;

    res.json({
      success: true,
      data: {
        stats: {
          newRequestsCount,
          inProgressRequestsCount,
          completedTodayCount,
          pendingOrdersCount,
          openBillsCount,
          connectedRobotsCount,
          totalRobotsCount
        },
        latestRequests,
        recentOrders,
        tablesRequiringAttention,
        robots,
        activityFeed,
        meta: {
          demo_mode: demoModeRow ? demoModeRow.value === 'true' : true,
          restaurant_name: restaurantNameRow ? restaurantNameRow.value : 'DineAssist Restaurant',
          server_time: new Date().toISOString()
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
