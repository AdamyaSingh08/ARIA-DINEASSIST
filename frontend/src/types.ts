export type ServiceRequestType = 'water' | 'waiter' | 'bill' | 'assistance' | 'custom';
export type ServiceRequestStatus = 'New' | 'Acknowledged' | 'In Progress' | 'Completed' | 'Cancelled';

export interface ServiceRequest {
  id: string;
  table_id: string;
  table_name?: string;
  robot_id: string | null;
  robot_name?: string;
  request_type: ServiceRequestType;
  message: string | null;
  status: ServiceRequestStatus;
  assigned_staff: string | null;
  created_at: string;
  acknowledged_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  idempotency_key: string | null;
}

export type OrderStatus = 'Received' | 'Confirmed' | 'Preparing' | 'Ready' | 'Served' | 'Cancelled';

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  notes: string | null;
  total_price: number;
}

export interface FoodOrder {
  id: string;
  table_id: string;
  table_name?: string;
  robot_id: string | null;
  robot_name?: string;
  status: OrderStatus;
  subtotal: number;
  special_instructions: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  item_count?: number;
}

export type BillStatus = 'Open' | 'Unpaid' | 'Paid' | 'Cancelled';
export type PaymentMethod = 'Cash' | 'UPI' | 'Card';

export interface BillItem {
  id: string;
  bill_id: string;
  order_id: string | null;
  menu_item_id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  added_by: 'robot' | 'staff' | 'system';
}

export interface Bill {
  id: string;
  invoice_number: string;
  table_id: string;
  table_name?: string;
  status: BillStatus;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_rate: number;
  discount_amount: number;
  final_amount: number;
  payment_method: PaymentMethod | null;
  payment_reference: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
  items?: BillItem[];
  order_ids?: string[];
  item_count?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  is_veg: number | boolean;
  is_available: number | boolean;
  image_url: string | null;
}

export interface RestaurantTable {
  id: string;
  name: string;
  capacity: number;
  status: 'available' | 'occupied' | 'bill_requested';
  active_robot_id: string | null;
  robot_name?: string;
  robot_status?: string;
  robot_mode?: string;
  robot_battery?: number;
  created_at: string;
  updated_at: string;
  pending_requests_count?: number;
  active_orders_count?: number;
  current_bill_amount?: number;
  current_bill_id?: string;
}

export interface Robot {
  id: string;
  name: string;
  model: string;
  assigned_table_id: string | null;
  table_name?: string;
  status: 'online' | 'offline' | 'unknown';
  mode: 'physical' | 'demo';
  battery_level: number;
  last_seen: string | null;
  last_event_type: string | null;
  last_error: string | null;
  firmware_version: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  type: 'request' | 'order' | 'bill' | 'robot' | 'system';
  title: string;
  description: string;
  table_id: string | null;
  robot_id: string | null;
  severity: 'info' | 'success' | 'warning' | 'danger';
  created_at: string;
}

export interface OverviewStats {
  newRequestsCount: number;
  inProgressRequestsCount: number;
  completedTodayCount: number;
  pendingOrdersCount: number;
  openBillsCount: number;
  connectedRobotsCount: number;
  totalRobotsCount: number;
}

export interface OverviewData {
  stats: OverviewStats;
  latestRequests: ServiceRequest[];
  recentOrders: FoodOrder[];
  tablesRequiringAttention: RestaurantTable[];
  robots: Robot[];
  activityFeed: ActivityLog[];
  meta: {
    demo_mode: boolean;
    restaurant_name: string;
    server_time: string;
  };
}
