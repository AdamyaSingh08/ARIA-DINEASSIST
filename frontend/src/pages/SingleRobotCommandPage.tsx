import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ServiceRequest, FoodOrder, Bill, RestaurantTable, Robot } from '../types';
import { useSocket } from '../context/SocketContext';
import {
  Bot,
  Battery,
  Wifi,
  Droplets,
  BellRing,
  Receipt,
  UtensilsCrossed,
  CheckCircle,
  Clock,
  Sparkles,
  MapPin,
  ExternalLink,
  Radio,
  Flame,
  Check,
  Eye,
  Activity,
  Layers,
  ArrowRight
} from 'lucide-react';

interface SingleRobotCommandPageProps {
  currentTable: string;
  onTableChange: (tableId: string) => void;
  onOpenReceipt: (billId: string) => void;
  onViewBilling: () => void;
}

export const SingleRobotCommandPage: React.FC<SingleRobotCommandPageProps> = ({
  currentTable,
  onTableChange,
  onOpenReceipt,
  onViewBilling
}) => {
  const [robot, setRobot] = useState<Robot | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const { socket } = useSocket();

  const loadData = async () => {
    try {
      const [robotsData, reqsData, ordersData, billsData, tablesData] = await Promise.all([
        api.getRobots(),
        api.getRequests(),
        api.getOrders(),
        api.getBills(),
        api.getTables()
      ]);

      if (robotsData.length > 0) {
        setRobot(robotsData[0]);
      }
      setRequests(reqsData);
      setOrders(ordersData);
      setBills(billsData);
      setTables(tablesData);
    } catch (err: any) {
      console.error('Failed to load command data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (socket) {
      const handleRefresh = () => loadData();
      socket.on('request.created', handleRefresh);
      socket.on('request.updated', handleRefresh);
      socket.on('order.created', handleRefresh);
      socket.on('order.updated', handleRefresh);
      socket.on('bill.created', handleRefresh);
      socket.on('bill.updated', handleRefresh);
      socket.on('robot.status', handleRefresh);
      socket.on('robot.heartbeat', handleRefresh);
      socket.on('table.updated', handleRefresh);
      socket.on('system.reset', handleRefresh);

      return () => {
        socket.off('request.created', handleRefresh);
        socket.off('request.updated', handleRefresh);
        socket.off('order.created', handleRefresh);
        socket.off('order.updated', handleRefresh);
        socket.off('bill.created', handleRefresh);
        socket.off('bill.updated', handleRefresh);
        socket.off('robot.status', handleRefresh);
        socket.off('robot.heartbeat', handleRefresh);
        socket.off('table.updated', handleRefresh);
        socket.off('system.reset', handleRefresh);
      };
    }
  }, [socket]);

  // Request actions
  const handleAcknowledge = async (id: string) => {
    try {
      await api.updateRequestStatus(id, { status: 'Acknowledged', assigned_staff: 'Captain' });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await api.updateRequestStatus(id, { status: 'Completed' });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Order workflow
  const handleAdvanceOrder = async (orderId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Received' ? 'Confirmed' :
                       currentStatus === 'Confirmed' ? 'Preparing' :
                       currentStatus === 'Preparing' ? 'Ready' : 'Served';
    try {
      await api.updateOrderStatus(orderId, nextStatus);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getElapsedMinutes = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    return Math.max(0, diff);
  };

  const activeRequests = requests.filter(r => r.status !== 'Completed' && r.status !== 'Cancelled');
  const activeOrders = orders.filter(o => o.status !== 'Served' && o.status !== 'Cancelled');
  const openBills = bills.filter(b => b.status === 'Open' || b.status === 'Unpaid');

  return (
    <div className="space-y-6">
      {/* SECTION 1: Single Robot Telemetry HUD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Rover Identity Card */}
        <div className="md:col-span-2 bg-[#0B132B]/90 backdrop-blur-md rounded-2xl border border-cyan-500/30 p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-teal-400 p-0.5 shadow-md shadow-cyan-500/20">
                <div className="w-full h-full bg-[#070D18] rounded-[14px] flex items-center justify-center">
                  <Bot className="w-6 h-6 text-cyan-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    {robot?.name || 'XiaoZhi Robot (ARIA)'}
                  </h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-xs text-cyan-300 font-mono mt-0.5">
                  ESP32-S3 AI Voice Engine · v1.4.2
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              PHYSICAL GATEWAY
            </span>
          </div>

          {/* Telemetry specs grid */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800 text-xs">
            <div className="bg-black/30 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-mono block">LOCATION</span>
              <div className="flex items-center gap-1.5 mt-1 font-bold text-amber-300 font-mono">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>{currentTable}</span>
              </div>
            </div>

            <div className="bg-black/30 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-mono block">BATTERY</span>
              <div className="flex items-center gap-1.5 mt-1 font-bold text-emerald-300 font-mono">
                <Battery className="w-3.5 h-3.5 text-emerald-400" />
                <span>{robot?.battery_level || 94}%</span>
              </div>
            </div>

            <div className="bg-black/30 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-mono block">SIGNAL RSSI</span>
              <div className="flex items-center gap-1.5 mt-1 font-bold text-cyan-300 font-mono">
                <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                <span>-58 dBm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Active Counters */}
        <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-2xl border border-rose-500/20 p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-rose-300 uppercase tracking-wider">
              Pending Calls
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <BellRing className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white font-mono">{activeRequests.length}</div>
            <p className="text-[11px] text-slate-400 mt-1">Robot assistance calls</p>
          </div>
        </div>

        <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-2xl border border-purple-500/20 p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-purple-300 uppercase tracking-wider">
              Robot Orders
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white font-mono">{activeOrders.length}</div>
            <p className="text-[11px] text-slate-400 mt-1">Submitted from table</p>
          </div>
        </div>
      </div>

      {/* SECTION 2: Split View — Live Robot Event Feed & Floor Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Feed of Calls & Orders transmitted by the Robot */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Live Robot Transmission Stream
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Events delivered via /api/integrations/robot/events
            </span>
          </div>

          {activeRequests.length === 0 && activeOrders.length === 0 ? (
            <div className="p-12 text-center bg-[#0B132B]/60 border border-slate-800 rounded-2xl">
              <Bot className="w-10 h-10 text-cyan-500/40 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-300 font-mono">No Active Robot Calls</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                The robot is waiting at {currentTable}. Use the speech controller above to simulate customer requests.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Service Requests */}
              {activeRequests.map((req) => {
                const elapsed = getElapsedMinutes(req.created_at);
                const isOverdue = elapsed >= 3;

                return (
                  <div
                    key={req.id}
                    className={`p-4 rounded-2xl bg-[#0B132B]/95 border transition-all shadow-md ${
                      req.status === 'New'
                        ? 'border-rose-500/40 bg-gradient-to-r from-rose-950/20 to-[#0B132B] call-alert'
                        : 'border-cyan-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-xl shrink-0 ${
                          req.request_type === 'water' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30' :
                          req.request_type === 'waiter' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {req.request_type === 'water' && <Droplets className="w-5 h-5" />}
                          {req.request_type === 'waiter' && <BellRing className="w-5 h-5" />}
                          {req.request_type === 'bill' && <Receipt className="w-5 h-5" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white font-mono">{req.table_id}</span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                              ROBOT CALL: {req.request_type.toUpperCase()}
                            </span>
                            {isOverdue && (
                              <span className="text-[10px] font-bold text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded">
                                WAITING {elapsed}m
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 mt-1 font-medium">
                            {req.message}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2 font-mono">
                            <span>Via: XiaoZhi Robot</span>
                            <span>·</span>
                            <span>{elapsed === 0 ? 'Just now' : `${elapsed}m ago`}</span>
                            {req.assigned_staff && (
                              <span className="text-cyan-400 font-semibold">Assigned: {req.assigned_staff}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        {req.status === 'New' && (
                          <button
                            onClick={() => handleAcknowledge(req.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition active:scale-95 shadow-sm shadow-cyan-500/20"
                          >
                            Acknowledge
                          </button>
                        )}
                        {req.status === 'Acknowledged' && (
                          <button
                            onClick={() => handleComplete(req.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition active:scale-95 shadow-sm shadow-emerald-500/20"
                          >
                            Mark Completed
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Food Orders Sent by Robot */}
              {activeOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-4 rounded-2xl bg-[#0B132B]/95 border border-purple-500/30 shadow-md"
                >
                  <div className="flex items-start justify-between pb-2.5 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
                        <UtensilsCrossed className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white font-mono">{ord.table_id}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            VOICE ORDER: #{ord.id}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Calculated Authoritatively: ₹{ord.subtotal.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 uppercase">
                      {ord.status}
                    </span>
                  </div>

                  <div className="py-2.5 space-y-1.5">
                    {ord.items && ord.items.map((it) => (
                      <div key={it.id} className="flex justify-between text-xs font-mono">
                        <span className="text-slate-300">{it.quantity}x {it.item_name} {it.notes && <span className="text-amber-400">({it.notes})</span>}</span>
                        <span className="text-cyan-300 font-bold">₹{it.total_price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                    <span className="text-[11px] text-slate-400 font-mono">Kitchen Pipeline</span>
                    <button
                      onClick={() => handleAdvanceOrder(ord.id, ord.status)}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-purple-500 hover:bg-purple-400 text-slate-950 transition"
                    >
                      {ord.status === 'Received' && 'Confirm Order'}
                      {ord.status === 'Confirmed' && 'Start Cooking'}
                      {ord.status === 'Preparing' && 'Mark Ready'}
                      {ord.status === 'Ready' && 'Mark Delivered'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Floor Plan & Where XiaoZhi Is Parked */}
        <div className="bg-[#0B132B]/90 backdrop-blur-md rounded-2xl border border-cyan-500/30 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm text-white font-mono">Floor Map & Rover Dock</h3>
              </div>
              <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded">
                6 Tables
              </span>
            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-2 gap-3">
              {tables.map((t) => {
                const hasRobot = t.id === currentTable;
                const tableCalls = activeRequests.filter(r => r.table_id === t.id).length;

                return (
                  <div
                    key={t.id}
                    onClick={() => onTableChange(t.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      hasRobot
                        ? 'bg-cyan-500/10 border-cyan-400 shadow-md shadow-cyan-500/20'
                        : tableCalls > 0
                        ? 'bg-rose-500/10 border-rose-500/40'
                        : 'bg-black/30 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white font-mono">{t.name}</span>
                      {hasRobot && (
                        <span className="p-1 rounded-md bg-cyan-400 text-slate-950" title="Robot Parked Here">
                          <Bot className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-[11px] font-mono flex items-center justify-between">
                      <span className="text-slate-400">{t.capacity} Seats</span>
                      {tableCalls > 0 && (
                        <span className="text-rose-400 font-bold">{tableCalls} Call!</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <button
              onClick={onViewBilling}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold flex items-center justify-center gap-2 transition"
            >
              <Receipt className="w-4 h-4" />
              <span>View Table Invoices & Receipts</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
