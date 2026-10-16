import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FoodOrder, MenuItem, RestaurantTable } from '../types';
import { useSocket } from '../context/SocketContext';
import { ManualOrderModal } from '../components/ManualOrderModal';
import {
  UtensilsCrossed,
  ChefHat,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  Leaf,
  ChevronRight,
  Flame,
  Check,
  AlertCircle
} from 'lucide-react';

export const FoodOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Tabs: Orders Pipeline vs Menu Card
  const [activeTab, setActiveTab] = useState<'pipeline' | 'menu'>('pipeline');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [menuCategory, setMenuCategory] = useState<string>('all');

  const { socket } = useSocket();

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersData, menuData, tablesData] = await Promise.all([
        api.getOrders({ status: statusFilter, table_id: tableFilter }),
        api.getMenu(),
        api.getTables()
      ]);
      setOrders(ordersData);
      setMenuItems(menuData);
      setTables(tablesData);
    } catch (err: any) {
      console.error('Failed to load food orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, tableFilter]);

  // Socket updates
  useEffect(() => {
    if (socket) {
      const handleUpdate = () => loadData();
      socket.on('order.created', handleUpdate);
      socket.on('order.updated', handleUpdate);
      socket.on('system.reset', handleUpdate);

      return () => {
        socket.off('order.created', handleUpdate);
        socket.off('order.updated', handleUpdate);
        socket.off('system.reset', handleUpdate);
      };
    }
  }, [socket, statusFilter, tableFilter]);

  // Advance Order Workflow: Received -> Confirmed -> Preparing -> Ready -> Served
  const handleAdvanceStatus = async (orderId: string, currentStatus: string) => {
    const sequence: Record<string, string> = {
      Received: 'Confirmed',
      Confirmed: 'Preparing',
      Preparing: 'Ready',
      Ready: 'Served'
    };
    const nextStatus = sequence[currentStatus];
    if (!nextStatus) return;

    try {
      await api.updateOrderStatus(orderId, nextStatus);
      loadData();
    } catch (err: any) {
      alert(`Could not update order status: ${err.message}`);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('Cancel this kitchen order?')) return;
    try {
      await api.updateOrderStatus(orderId, 'Cancelled');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const categories = ['all', ...Array.from(new Set(menuItems.map(m => m.category)))];
  const filteredMenu = menuCategory === 'all'
    ? menuItems
    : menuItems.filter(m => m.category === menuCategory);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-900 tracking-tight">Food Orders & Kitchen Pipeline</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Robot voice orders and manual kitchen tickets with backend price verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Switcher */}
          <div className="bg-slate-200/80 p-1 rounded-xl flex items-center text-xs font-semibold">
            <button
              onClick={() => setActiveTab('pipeline')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'pipeline' ? 'bg-white text-navy-900 shadow-2xs' : 'text-slate-600 hover:text-navy-900'
              }`}
            >
              Live Orders
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'menu' ? 'bg-white text-navy-900 shadow-2xs' : 'text-slate-600 hover:text-navy-900'
              }`}
            >
              Restaurant Menu
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Order</span>
          </button>
        </div>
      </div>

      {activeTab === 'pipeline' ? (
        <>
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500"
              >
                <option value="all">All States</option>
                <option value="Received">Received</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Preparing">Preparing</option>
                <option value="Ready">Ready for Serving</option>
                <option value="Served">Served</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span>Table:</span>
              <select
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500"
              >
                <option value="all">All Tables</option>
                {tables.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Orders Pipeline List */}
          {loading && orders.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-xs">Loading food orders...</div>
          ) : orders.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 p-8">
              <UtensilsCrossed className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h3 className="font-bold text-slate-700 text-sm">No food orders in this view</h3>
              <p className="text-xs text-slate-400 mt-1">Use the Demo Bar or click "New Order" to place a test kitchen ticket.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {orders.map((ord) => {
                const isFinal = ord.status === 'Served' || ord.status === 'Cancelled';
                return (
                  <div
                    key={ord.id}
                    className={`bg-white rounded-2xl border p-5 shadow-2xs flex flex-col justify-between transition ${
                      ord.status === 'Preparing' ? 'border-amber-300 ring-1 ring-amber-200 bg-amber-50/10' :
                      ord.status === 'Ready' ? 'border-teal-400 ring-1 ring-teal-200 bg-teal-50/10' :
                      ord.status === 'Served' ? 'border-slate-200 opacity-80' :
                      'border-slate-200'
                    }`}
                  >
                    <div>
                      {/* Order Header */}
                      <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-navy-900">{ord.table_name || ord.table_id}</h4>
                            <span className="text-[10px] text-slate-400 font-mono">({ord.id})</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Robot: <strong className="text-slate-700">{ord.robot_name || ord.robot_id || 'Staff Terminal'}</strong>
                          </p>
                        </div>

                        <div className="flex flex-col items-end">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            ord.status === 'Received' ? 'bg-blue-100 text-blue-800' :
                            ord.status === 'Confirmed' ? 'bg-sky-100 text-sky-800' :
                            ord.status === 'Preparing' ? 'bg-amber-100 text-amber-800' :
                            ord.status === 'Ready' ? 'bg-teal-100 text-teal-800' :
                            ord.status === 'Served' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-slate-200 text-slate-700'
                          }`}>
                            {ord.status}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-1">
                            {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="py-3 space-y-2">
                        {ord.items && ord.items.map((it) => (
                          <div key={it.id} className="flex items-start justify-between text-xs">
                            <div className="flex items-start gap-1.5">
                              <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                {it.quantity}x
                              </span>
                              <div>
                                <span className="font-medium text-slate-900">{it.item_name}</span>
                                {it.notes && (
                                  <p className="text-[10px] text-amber-700 italic">“{it.notes}”</p>
                                )}
                              </div>
                            </div>
                            <span className="font-semibold text-slate-700">₹{it.total_price.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Special Kitchen Instructions */}
                      {ord.special_instructions && (
                        <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 mb-3">
                          <strong>Note:</strong> {ord.special_instructions}
                        </div>
                      )}
                    </div>

                    {/* Order Footer & Status Progress Workflow */}
                    <div className="pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs mb-3 font-semibold">
                        <span className="text-slate-500">Order Subtotal:</span>
                        <span className="text-sm font-bold text-navy-900">₹{ord.subtotal.toFixed(2)}</span>
                      </div>

                      {!isFinal ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAdvanceStatus(ord.id, ord.status)}
                            className="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-2xs"
                          >
                            {ord.status === 'Received' && <span>Confirm Order</span>}
                            {ord.status === 'Confirmed' && <span>Send to Chef (Preparing)</span>}
                            {ord.status === 'Preparing' && <span>Mark Ready to Serve</span>}
                            {ord.status === 'Ready' && <span>Mark as Served</span>}
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleCancelOrder(ord.id)}
                            className="px-2.5 py-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs transition"
                            title="Cancel Order"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-1 text-xs text-slate-400 font-medium">
                          {ord.status === 'Served' ? 'Order delivered to table' : 'Order voided'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Restaurant Menu Card View */
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setMenuCategory(cat)}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition ${
                  menuCategory === cat
                    ? 'bg-navy-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMenu.map((item) => (
              <div key={item.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-xs text-slate-900">{item.name}</h4>
                    {item.is_veg ? (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded shrink-0">
                        <Leaf className="w-2.5 h-2.5 text-emerald-600" />
                        VEG
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded shrink-0">
                        NON-VEG
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                  <span className="text-xs font-bold text-teal-700">₹{item.price.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {item.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Order Modal */}
      <ManualOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tables={tables}
        onOrderCreated={() => loadData()}
      />
    </div>
  );
};
