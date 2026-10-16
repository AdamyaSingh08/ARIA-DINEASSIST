import {
  OverviewData,
  ServiceRequest,
  FoodOrder,
  MenuItem,
  RestaurantTable,
  Robot,
  Bill,
  ActivityLog
} from '../types';

const API_BASE = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Request failed with status ${res.status}`);
  }
  return json.data !== undefined ? json.data : json;
}

export const api = {
  // Overview
  getOverview: () => request<OverviewData>('/overview'),

  // Requests
  getRequests: (params?: { status?: string; table_id?: string; request_type?: string; search?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<ServiceRequest[]>(`/requests${q ? `?${q}` : ''}`);
  },
  createRequest: (data: { table_id: string; robot_id?: string; request_type: string; message?: string; assigned_staff?: string }) =>
    request<ServiceRequest>('/requests', { method: 'POST', body: JSON.stringify(data) }),
  updateRequestStatus: (id: string, data: { status: string; assigned_staff?: string; cancel_reason?: string }) =>
    request<ServiceRequest>(`/requests/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Orders
  getOrders: (params?: { status?: string; table_id?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<FoodOrder[]>(`/orders${q ? `?${q}` : ''}`);
  },
  getOrder: (id: string) => request<FoodOrder>(`/orders/${id}`),
  getMenu: (params?: { category?: string; is_veg?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<MenuItem[]>(`/orders/menu${q ? `?${q}` : ''}`);
  },
  createOrder: (data: { table_id: string; robot_id?: string; items: Array<{ menu_item_id: string; quantity: number; notes?: string }>; special_instructions?: string }) =>
    request<FoodOrder>('/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateOrderStatus: (id: string, status: string) =>
    request<FoodOrder>(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Tables
  getTables: () => request<RestaurantTable[]>('/tables'),
  getTable: (id: string) => request<{ table: RestaurantTable; activeRequests: ServiceRequest[]; activeOrders: FoodOrder[]; openBill?: Bill }>(`/tables/${id}`),
  assignRobot: (tableId: string, robot_id: string | null) =>
    request<RestaurantTable>(`/tables/${tableId}/assign-robot`, { method: 'PATCH', body: JSON.stringify({ robot_id }) }),
  updateTableStatus: (tableId: string, status: string) =>
    request<RestaurantTable>(`/tables/${tableId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Robots
  getRobots: () => request<Robot[]>('/robots'),
  registerRobot: (data: { id: string; name: string; model?: string; mode?: string; assigned_table_id?: string }) =>
    request<Robot>('/robots', { method: 'POST', body: JSON.stringify(data) }),
  updateRobot: (id: string, data: Partial<Robot>) =>
    request<Robot>(`/robots/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Bills
  getBills: (params?: { status?: string; table_id?: string; search?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<Bill[]>(`/bills${q ? `?${q}` : ''}`);
  },
  getBill: (id: string) => request<Bill>(`/bills/${id}`),
  generateBill: (tableId: string, notes?: string) =>
    request<Bill>('/bills/generate', { method: 'POST', body: JSON.stringify({ table_id: tableId, notes }) }),
  addItemToBill: (billId: string, menuItemId: string, quantity: number) =>
    request<Bill>(`/bills/${billId}/items`, { method: 'POST', body: JSON.stringify({ menu_item_id: menuItemId, quantity }) }),
  removeItemFromBill: (billId: string, itemId: string) =>
    request<Bill>(`/bills/${billId}/items/${itemId}`, { method: 'DELETE' }),
  recalculateBill: (billId: string) =>
    request<Bill>(`/bills/${billId}/recalculate`, { method: 'POST' }),
  payBill: (billId: string, paymentMethod: 'Cash' | 'UPI' | 'Card', paymentReference?: string) =>
    request<Bill>(`/bills/${billId}/pay`, { method: 'POST', body: JSON.stringify({ payment_method: paymentMethod, payment_reference: paymentReference }) }),
  cancelBill: (billId: string, reason?: string) =>
    request<Bill>(`/bills/${billId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // History
  getHistory: (params?: { type?: string; table_id?: string; search?: string; from_date?: string; to_date?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<{ requests?: ServiceRequest[]; orders?: FoodOrder[]; bills?: Bill[]; activity?: ActivityLog[] }>(`/history${q ? `?${q}` : ''}`);
  },

  // Settings & Demo Mode
  getSettings: () => request<Record<string, string>>('/settings'),
  updateSettings: (settings: Record<string, any>) =>
    request<Record<string, string>>('/settings', { method: 'PATCH', body: JSON.stringify(settings) }),
  resetDatabase: () =>
    request<{ success: boolean; message: string }>('/settings/reset-database', { method: 'POST' }),
  simulateDemo: (scenario: string, extra?: any) =>
    request<any>('/settings/demo/simulate', { method: 'POST', body: JSON.stringify({ scenario, ...extra }) }),
};
