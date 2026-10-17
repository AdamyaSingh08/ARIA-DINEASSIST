import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FoodOrder } from '../types';
import { useSocket } from '../context/SocketContext';
import {
  UtensilsCrossed,
  Clock,
  Play,
  CheckCircle2,
  BellRing,
  Bot,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export const KitchenPage: React.FC = () => {
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const { socket } = useSocket();

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await api.getOrders();
      setOrders(data);
    } catch (err: any) {
      console.error('Failed to load kitchen orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (socket) {
      const handleUpdate = () => loadOrders();
      socket.on('order.created', handleUpdate);
      socket.on('order.status_changed', handleUpdate);
      socket.on('system.reset', handleUpdate);

      return () => {
        socket.off('order.created', handleUpdate);
        socket.off('order.status_changed', handleUpdate);
        socket.off('system.reset', handleUpdate);
      };
    }
  }, [socket]);

  // Status Lifecycle: Received/Confirmed -> Preparing -> Ready -> Served
  const handleUpdateStatus = async (orderId: string, currentStatus: string) => {
    let nextStatus = 'Preparing';
    if (currentStatus === 'Received' || currentStatus === 'Confirmed') {
      nextStatus = 'Preparing';
    } else if (currentStatus === 'Preparing') {
      nextStatus = 'Ready';
    } else if (currentStatus === 'Ready') {
      nextStatus = 'Served';
    }

    try {
      setActingId(orderId);
      await api.updateOrderStatus(orderId, nextStatus);
      loadOrders();
    } catch (err: any) {
      alert(`Could not update kitchen order: ${err.message}`);
    } finally {
      setActingId(null);
    }
  };

  const getElapsed = (dateStr: string) => {
    const elapsedSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (elapsedSec < 60) return `${Math.max(1, elapsedSec)}s ago`;
    const min = Math.floor(elapsedSec / 60);
    if (min < 60) return `${min}m ago`;
    return `${Math.floor(min / 60)}h ago`;
  };

  // Group into KDS 3 columns
  const newOrders = orders.filter(o => o.status === 'Received' || o.status === 'Confirmed');
  const preparingOrders = orders.filter(o => o.status === 'Preparing');
  const readyOrders = orders.filter(o => o.status === 'Ready');

  return (
    <div className="space-y-6">
      {/* KDS Header Context */}
      <div className="bg-white p-4 rounded-2xl border border-borderLine shadow-ticket flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-ink-primary font-sans flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-forest-800" />
            <span>Kitchen Display System (KDS)</span>
          </h2>
          <p className="text-xs text-ink-secondary mt-0.5">
            Active preparation tickets dispatched from table-side ARIA robot interactions
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-surface-warm border border-borderLine">
            <span className="text-ink-secondary mr-1.5">Active Tickets:</span>
            <span className="font-bold text-forest-800">{newOrders.length + preparingOrders.length + readyOrders.length}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-lime-light border border-lime-accent text-forest-900 font-bold">
            <span>Ready for Waiter Pickup: {readyOrders.length}</span>
          </div>
        </div>
      </div>

      {/* 3-Column KDS Workflow Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* COLUMN 1: NEW ORDERS */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-2 border-b-2 border-terracotta">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-terracotta beacon-pulse" />
              <h3 className="font-bold text-sm uppercase text-ink-primary font-sans tracking-wide">
                1. New Orders
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-terracotta-light text-terracotta-dark font-mono text-xs font-bold">
              {newOrders.length}
            </span>
          </div>

          <div className="space-y-4 flex-1">
            {newOrders.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white border border-borderLine text-center shadow-xs">
                <p className="text-xs text-ink-secondary">No new incoming orders</p>
              </div>
            ) : (
              newOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-2xl border-2 border-terracotta/50 shadow-ticket-hover overflow-hidden flex flex-col justify-between"
                >
                  {/* Ticket Header */}
                  <div className="bg-terracotta px-4 py-2 flex items-center justify-between text-white font-mono text-xs font-bold">
                    <span>{ord.table_name || `TABLE ${ord.table_id.replace('T', '')}`}</span>
                    <span>{getElapsed(ord.created_at)}</span>
                  </div>

                  <div className="p-5 flex-1">
                    <div className="flex items-center justify-between pb-3 border-b border-borderLine text-xs font-mono text-ink-secondary">
                      <span className="font-bold text-ink-primary">#{ord.id}</span>
                      <span>Total ₹{ord.subtotal}</span>
                    </div>

                    {/* Food Items Checklist */}
                    <div className="py-3 space-y-2">
                      {ord.items && ord.items.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between text-sm">
                          <div className="flex items-start gap-2">
                            <span className="font-mono font-bold text-base text-forest-800 shrink-0">
                              {item.quantity}×
                            </span>
                            <div>
                              <span className="font-bold text-ink-primary">{item.item_name}</span>
                              {item.notes && (
                                <p className="text-xs font-medium text-terracotta-dark mt-0.5">
                                  "{item.notes}"
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Special Instructions Callout */}
                    {ord.special_instructions && (
                      <div className="mt-2 p-2.5 rounded-xl bg-amber-light border border-amber/40 text-xs text-ink-primary font-medium">
                        <span className="font-bold text-amber-dark uppercase text-[10px] block font-mono">Chef Note:</span>
                        {ord.special_instructions}
                      </div>
                    )}
                  </div>

                  {/* Primary Touch Action Button (48px height) */}
                  <div className="p-3 bg-surface-warm border-t border-borderLine">
                    <button
                      disabled={actingId === ord.id}
                      onClick={() => handleUpdateStatus(ord.id, ord.status)}
                      className="w-full py-3 px-4 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white font-bold text-sm tracking-wide shadow-xs transition min-h-[48px] flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 text-white" />
                      <span>{actingId === ord.id ? 'Updating...' : 'START PREPARING'}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 2: PREPARING */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-2 border-b-2 border-amber">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber" />
              <h3 className="font-bold text-sm uppercase text-ink-primary font-sans tracking-wide">
                2. In Preparation
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-light text-amber-dark font-mono text-xs font-bold">
              {preparingOrders.length}
            </span>
          </div>

          <div className="space-y-4 flex-1">
            {preparingOrders.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white border border-borderLine text-center shadow-xs">
                <p className="text-xs text-ink-secondary">No orders currently on the grill</p>
              </div>
            ) : (
              preparingOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-2xl border-2 border-amber/60 shadow-ticket overflow-hidden flex flex-col justify-between"
                >
                  <div className="bg-amber px-4 py-2 flex items-center justify-between text-forest-950 font-mono text-xs font-bold">
                    <span>{ord.table_name || `TABLE ${ord.table_id.replace('T', '')}`}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {getElapsed(ord.created_at)}
                    </span>
                  </div>

                  <div className="p-5 flex-1">
                    <div className="flex items-center justify-between pb-3 border-b border-borderLine text-xs font-mono text-ink-secondary">
                      <span className="font-bold text-ink-primary">#{ord.id}</span>
                      <span>Total ₹{ord.subtotal}</span>
                    </div>

                    <div className="py-3 space-y-2">
                      {ord.items && ord.items.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between text-sm">
                          <div className="flex items-start gap-2">
                            <span className="font-mono font-bold text-base text-forest-800 shrink-0">
                              {item.quantity}×
                            </span>
                            <div>
                              <span className="font-bold text-ink-primary">{item.item_name}</span>
                              {item.notes && (
                                <p className="text-xs font-medium text-terracotta-dark mt-0.5">
                                  "{item.notes}"
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {ord.special_instructions && (
                      <div className="mt-2 p-2.5 rounded-xl bg-amber-light border border-amber/40 text-xs text-ink-primary font-medium">
                        <span className="font-bold text-amber-dark uppercase text-[10px] block font-mono">Chef Note:</span>
                        {ord.special_instructions}
                      </div>
                    )}
                  </div>

                  {/* Primary Touch Action Button (48px height) */}
                  <div className="p-3 bg-surface-warm border-t border-borderLine">
                    <button
                      disabled={actingId === ord.id}
                      onClick={() => handleUpdateStatus(ord.id, ord.status)}
                      className="w-full py-3 px-4 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-sm tracking-wide shadow-xs transition min-h-[48px] flex items-center justify-center gap-2"
                    >
                      <BellRing className="w-4 h-4 text-lime-accent" />
                      <span>{actingId === ord.id ? 'Updating...' : 'MARK READY TO SERVE'}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 3: READY TO SERVE */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-2 border-b-2 border-completed-dark">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-completed-dark beacon-pulse" />
              <h3 className="font-bold text-sm uppercase text-ink-primary font-sans tracking-wide">
                3. Ready to Serve
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-completed-light text-completed-dark font-mono text-xs font-bold">
              {readyOrders.length}
            </span>
          </div>

          <div className="space-y-4 flex-1">
            {readyOrders.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white border border-borderLine text-center shadow-xs">
                <p className="text-xs text-ink-secondary">All ready dishes have been delivered</p>
              </div>
            ) : (
              readyOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-2xl border-2 border-completed-dark shadow-ticket overflow-hidden flex flex-col justify-between"
                >
                  <div className="bg-completed-dark px-4 py-2 flex items-center justify-between text-white font-mono text-xs font-bold">
                    <span>{ord.table_name || `TABLE ${ord.table_id.replace('T', '')}`}</span>
                    <span className="flex items-center gap-1">
                      <BellRing className="w-3.5 h-3.5 text-lime-accent" />
                      READY FOR WAITER
                    </span>
                  </div>

                  <div className="p-5 flex-1">
                    <div className="flex items-center justify-between pb-3 border-b border-borderLine text-xs font-mono text-ink-secondary">
                      <span className="font-bold text-ink-primary">#{ord.id}</span>
                      <span>Total ₹{ord.subtotal}</span>
                    </div>

                    <div className="py-3 space-y-2">
                      {ord.items && ord.items.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between text-sm">
                          <div className="flex items-start gap-2">
                            <span className="font-mono font-bold text-base text-completed-dark shrink-0">
                              {item.quantity}×
                            </span>
                            <span className="font-bold text-ink-primary">{item.item_name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Primary Touch Action Button (48px height) */}
                  <div className="p-3 bg-surface-warm border-t border-borderLine">
                    <button
                      disabled={actingId === ord.id}
                      onClick={() => handleUpdateStatus(ord.id, ord.status)}
                      className="w-full py-3 px-4 rounded-xl bg-forest-900 hover:bg-forest-950 text-lime-accent font-bold text-sm tracking-wide shadow-xs transition min-h-[48px] flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-lime-accent" />
                      <span>{actingId === ord.id ? 'Updating...' : 'MARK AS SERVED'}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
