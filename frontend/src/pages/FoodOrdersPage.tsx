import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FoodOrder, MenuItem, RestaurantTable } from '../types';
import { useSocket } from '../context/SocketContext';
import {
  UtensilsCrossed,
  Clock,
  Filter,
  Search,
  ChevronRight,
  Eye,
  CheckCircle2
} from 'lucide-react';

export const FoodOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');

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
      alert(`Could not update order: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
        <div>
          <h2 className="text-xl font-serif text-charcoal">Food Orders & Kitchen Pipeline</h2>
          <p className="text-xs text-muted mt-0.5">
            Orders placed through ARIA table rover and verified against menu prices.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-ivory p-1 rounded-md border border-borderLine text-xs font-mono self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'orders'
                ? 'bg-white font-medium text-charcoal shadow-xs'
                : 'text-muted hover:text-charcoal'
            }`}
          >
            Live Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'menu'
                ? 'bg-white font-medium text-charcoal shadow-xs'
                : 'text-muted hover:text-charcoal'
            }`}
          >
            Menu Catalog ({menuItems.length})
          </button>
        </div>
      </div>

      {activeTab === 'orders' ? (
        <>
          {/* Filter Bar */}
          <div className="bg-white p-3.5 rounded-lg border border-borderLine shadow-subtle flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-ivory border border-borderLine rounded-md text-charcoal"
              >
                <option value="all">All States</option>
                <option value="Received">Received</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Preparing">Preparing</option>
                <option value="Ready">Ready to Serve</option>
                <option value="Served">Served</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted">
              <span>Table:</span>
              <select
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-ivory border border-borderLine rounded-md text-charcoal"
              >
                <option value="all">All Tables</option>
                {tables.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-lg border border-borderLine shadow-subtle overflow-hidden">
            {loading && orders.length === 0 ? (
              <div className="py-20 text-center text-xs font-mono text-muted">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm font-serif text-charcoal">No food orders active</p>
                <p className="text-xs text-muted mt-1">Orders appear here when a customer speaks their order to ARIA.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-ivory border-b border-borderLine text-muted font-medium font-mono text-[11px]">
                  <tr>
                    <th className="py-3 px-4">ORDER ID</th>
                    <th className="py-3 px-4">TABLE</th>
                    <th className="py-3 px-4">ITEMS</th>
                    <th className="py-3 px-4 text-right">SUBTOTAL</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4">TIME</th>
                    <th className="py-3 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderLine">
                  {orders.map((ord) => {
                    const isFinal = ord.status === 'Served' || ord.status === 'Cancelled';

                    return (
                      <tr key={ord.id} className="hover:bg-ivory/50">
                        <td className="py-3.5 px-4 font-mono font-bold text-charcoal">
                          {ord.id}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-semibold text-charcoal">
                          {ord.table_id}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            {ord.items && ord.items.map((it) => (
                              <div key={it.id} className="text-charcoal font-medium">
                                <span className="font-mono text-muted mr-1.5">{it.quantity}x</span>
                                <span>{it.item_name}</span>
                                {it.notes && <span className="text-muted text-[11px] ml-1">({it.notes})</span>}
                              </div>
                            ))}
                          </div>
                          {ord.special_instructions && (
                            <p className="text-[11px] text-terracotta mt-1">
                              Note: {ord.special_instructions}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-forest-800">
                          ₹{ord.subtotal.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono ${
                            ord.status === 'Preparing' ? 'bg-sage-200 text-forest-900 font-medium' :
                            ord.status === 'Ready' ? 'bg-forest-800 text-citrus font-medium' :
                            ord.status === 'Served' ? 'bg-ivory text-muted' :
                            'bg-sage-100 text-forest-800'
                          }`}>
                            {ord.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-muted">
                          {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {!isFinal ? (
                            <button
                              onClick={() => handleAdvanceStatus(ord.id, ord.status)}
                              className="px-2.5 py-1 rounded text-xs font-medium bg-forest-800 hover:bg-forest-900 text-white transition-colors"
                            >
                              {ord.status === 'Received' && 'Confirm'}
                              {ord.status === 'Confirmed' && 'Start Cooking'}
                              {ord.status === 'Preparing' && 'Mark Ready'}
                              {ord.status === 'Ready' && 'Mark Served'}
                            </button>
                          ) : (
                            <span className="text-muted text-[11px] font-mono">Delivered</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        /* Menu Catalog View */
        <div className="bg-white rounded-lg border border-borderLine shadow-subtle overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-ivory border-b border-borderLine text-muted font-medium font-mono text-[11px]">
              <tr>
                <th className="py-3 px-4">ITEM NAME</th>
                <th className="py-3 px-4">CATEGORY</th>
                <th className="py-3 px-4">TYPE</th>
                <th className="py-3 px-4">DESCRIPTION</th>
                <th className="py-3 px-4 text-right">UNIT PRICE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderLine">
              {menuItems.map((item) => (
                <tr key={item.id} className="hover:bg-ivory/50">
                  <td className="py-3 px-4 font-medium text-charcoal font-sans">
                    {item.name}
                  </td>
                  <td className="py-3 px-4 font-mono text-muted text-[11px]">
                    {item.category}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      item.is_veg ? 'bg-sage-100 text-forest-800' : 'bg-terracotta-light text-terracotta-dark'
                    }`}>
                      {item.is_veg ? 'VEG' : 'NON-VEG'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted text-xs">
                    {item.description}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-forest-800">
                    ₹{item.price.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
