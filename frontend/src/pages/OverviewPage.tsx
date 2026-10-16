import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { OverviewData, ServiceRequest } from '../types';
import { useSocket } from '../context/SocketContext';
import {
  Bell,
  Clock,
  CheckCircle2,
  UtensilsCrossed,
  Receipt,
  Bot,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Activity,
  Battery,
  Radio,
  Sparkles,
  Droplets,
  HelpCircle
} from 'lucide-react';

interface OverviewPageProps {
  onNavigate: (tab: any) => void;
  onOpenReceipt: (billId: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate, onOpenReceipt }) => {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { socket } = useSocket();

  const loadData = async () => {
    try {
      const res = await api.getOverview();
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    if (socket) {
      // Re-fetch overview when relevant events occur
      const handler = () => loadData();
      socket.on('request.created', handler);
      socket.on('request.updated', handler);
      socket.on('order.created', handler);
      socket.on('order.updated', handler);
      socket.on('bill.created', handler);
      socket.on('bill.updated', handler);
      socket.on('robot.status', handler);
      socket.on('robot.heartbeat', handler);
      socket.on('table.updated', handler);
      socket.on('system.reset', handler);

      return () => {
        socket.off('request.created', handler);
        socket.off('request.updated', handler);
        socket.off('order.created', handler);
        socket.off('order.updated', handler);
        socket.off('bill.created', handler);
        socket.off('bill.updated', handler);
        socket.off('robot.status', handler);
        socket.off('robot.heartbeat', handler);
        socket.off('table.updated', handler);
        socket.off('system.reset', handler);
      };
    }
  }, [socket]);

  // Quick Action on Request from Overview
  const handleAcknowledge = async (reqId: string) => {
    try {
      await api.updateRequestStatus(reqId, { status: 'Acknowledged', assigned_staff: 'Captain' });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading && !data) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Gathering restaurant telemetry...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-2xl text-rose-800">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="font-bold text-sm">Failed to load overview data</h3>
        <p className="text-xs mt-1 text-rose-600">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const { stats, latestRequests, recentOrders, tablesRequiringAttention, robots, activityFeed } = data;

  // Format Elapsed Time
  const getElapsedMinutes = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    return Math.max(0, diff);
  };

  return (
    <div className="space-y-6">
      {/* Overview Top Headline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl font-bold text-navy-900 tracking-tight">Operations Overview</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time floor telemetry, incoming robot alerts, and active orders.
          </p>
        </div>

        {/* Demo Mode / Hardware Status Indicator */}
        <div className="flex items-center gap-2">
          {data.meta.demo_mode ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Demo Mode Active (Simulated XiaoZhi)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-300 shadow-2xs">
              <Radio className="w-3.5 h-3.5 text-teal-600" />
              Physical XiaoZhi Mode
            </span>
          )}
        </div>
      </div>

      {/* 6 Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* 1. New Requests */}
        <div
          onClick={() => onNavigate('requests')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
            stats.newRequestsCount > 0
              ? 'bg-gradient-to-br from-rose-50 to-white border-rose-200 urgent-alert'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">New Calls</span>
            <div className={`p-2 rounded-xl ${stats.newRequestsCount > 0 ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-navy-900 mt-2">{stats.newRequestsCount}</div>
          <span className="text-[11px] text-slate-500">Unanswered</span>
        </div>

        {/* 2. Requests In Progress */}
        <div
          onClick={() => onNavigate('requests')}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">In Progress</span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-navy-900 mt-2">{stats.inProgressRequestsCount}</div>
          <span className="text-[11px] text-slate-500">Being attended</span>
        </div>

        {/* 3. Completed Today */}
        <div
          onClick={() => onNavigate('history')}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Resolved Today</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-navy-900 mt-2">{stats.completedTodayCount}</div>
          <span className="text-[11px] text-emerald-600 font-medium">Requests closed</span>
        </div>

        {/* 4. Pending Food Orders */}
        <div
          onClick={() => onNavigate('orders')}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Kitchen Queue</span>
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-navy-900 mt-2">{stats.pendingOrdersCount}</div>
          <span className="text-[11px] text-blue-600 font-medium">Orders active</span>
        </div>

        {/* 5. Open / Unpaid Bills */}
        <div
          onClick={() => onNavigate('billing')}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Open Bills</span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-navy-900 mt-2">{stats.openBillsCount}</div>
          <span className="text-[11px] text-slate-500">Pending settlement</span>
        </div>

        {/* 6. Connected Robots */}
        <div
          onClick={() => onNavigate('tables')}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Robots</span>
            <div className="p-2 rounded-xl bg-teal-100 text-teal-700">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-navy-900 mt-2">
            {stats.connectedRobotsCount}
            <span className="text-xs text-slate-400 font-normal"> / {stats.totalRobotsCount}</span>
          </div>
          <span className="text-[11px] text-teal-600 font-medium">Heartbeat online</span>
        </div>
      </div>

      {/* Main Grid: Incoming Calls & Tables Needing Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Latest Incoming Requests */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-teal-600" />
              <h3 className="font-bold text-slate-900 text-sm">Latest Service Requests</h3>
            </div>
            <button
              onClick={() => onNavigate('requests')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              <span>View all ({stats.newRequestsCount + stats.inProgressRequestsCount})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {latestRequests.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No active service requests right now. Use the demo bar to simulate a robot request!
              </div>
            ) : (
              latestRequests.map((req) => {
                const elapsedMin = getElapsedMinutes(req.created_at);
                const isUrgent = elapsedMin >= 5 && req.status === 'New';

                return (
                  <div key={req.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        req.request_type === 'water' ? 'bg-sky-100 text-sky-700' :
                        req.request_type === 'waiter' ? 'bg-amber-100 text-amber-700' :
                        req.request_type === 'bill' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {req.request_type === 'water' && <Droplets className="w-4 h-4" />}
                        {req.request_type === 'waiter' && <Bell className="w-4 h-4" />}
                        {req.request_type === 'bill' && <Receipt className="w-4 h-4" />}
                        {req.request_type !== 'water' && req.request_type !== 'waiter' && req.request_type !== 'bill' && <HelpCircle className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">
                            {req.table_name || req.table_id}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                            req.status === 'New' ? 'bg-rose-100 text-rose-700' :
                            req.status === 'Acknowledged' ? 'bg-amber-100 text-amber-700' :
                            req.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {req.status}
                          </span>
                          {isUrgent && (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 animate-pulse">
                              WAITING {elapsedMin}m
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 truncate mt-0.5">
                          {req.message || `Customer requested ${req.request_type}`}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                          <span>Via: <strong className="text-slate-600 font-medium">{req.robot_id || 'Direct'}</strong></span>
                          <span>·</span>
                          <span>{elapsedMin === 0 ? 'Just now' : `${elapsedMin} min ago`}</span>
                          {req.assigned_staff && (
                            <>
                              <span>·</span>
                              <span className="text-slate-600">Assigned: {req.assigned_staff}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {req.status === 'New' && (
                      <button
                        onClick={() => handleAcknowledge(req.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-600 hover:text-white transition shrink-0"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Col: Tables Requiring Attention */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-slate-900 text-sm">Tables Requiring Attention</h3>
              </div>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                {tablesRequiringAttention.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {tablesRequiringAttention.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  All tables running smoothly. No urgent requests.
                </div>
              ) : (
                tablesRequiringAttention.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onNavigate('tables')}
                    className="p-3 rounded-xl border border-slate-200 hover:border-teal-400 bg-slate-50/60 hover:bg-teal-50/20 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-navy-900">{t.name} ({t.id})</span>
                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded ${
                        t.status === 'bill_requested' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {t.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2">
                      {t.pending_requests_count! > 0 && (
                        <span className="text-rose-600 font-semibold">
                          {t.pending_requests_count} pending request(s)
                        </span>
                      )}
                      {t.current_bill_amount && (
                        <span className="text-teal-700 font-bold ml-auto">
                          Outstanding: ₹{t.current_bill_amount.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigate('tables')}
            className="mt-4 w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition text-center"
          >
            Manage Restaurant Floor Plan
          </button>
        </div>
      </div>

      {/* Bottom Grid: Recent Food Orders, Robot Statuses, Activity Feed */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recent Food Orders */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">Recent Food Orders</h3>
            </div>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Pipeline →
            </button>
          </div>

          <div className="space-y-2.5">
            {recentOrders.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">No recent food orders</div>
            ) : (
              recentOrders.map((ord) => (
                <div key={ord.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{ord.table_id}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                        ord.status === 'Served' ? 'bg-emerald-100 text-emerald-800' :
                        ord.status === 'Preparing' ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {ord.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {ord.item_count || 1} items · Total ₹{ord.subtotal.toFixed(2)}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Robot Hardware Status */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-teal-600" />
              <h3 className="font-bold text-slate-900 text-sm">Robots & Heartbeats</h3>
            </div>
            <button
              onClick={() => onNavigate('tables')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700"
            >
              Devices →
            </button>
          </div>

          <div className="space-y-2.5">
            {robots.map((rob) => (
              <div key={rob.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${
                    rob.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`} />
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">{rob.name}</h4>
                    <p className="text-[10px] text-slate-500">
                      Assigned: {rob.assigned_table_id || 'Standby'} · {rob.mode.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                    <Battery className="w-3.5 h-3.5 text-teal-600" />
                    <span>{rob.battery_level}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Audit Feed */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-600" />
              <h3 className="font-bold text-slate-900 text-sm">System Event Stream</h3>
            </div>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Audit Log →
            </button>
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {activityFeed.map((act) => (
              <div key={act.id} className="text-xs pb-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px]">{act.title}</span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{act.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
