import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { OverviewData, ServiceRequest } from '../types';
import { useSocket } from '../context/SocketContext';
import {
  Bell,
  Clock,
  UtensilsCrossed,
  Receipt,
  Bot,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Play
} from 'lucide-react';

interface OverviewPageProps {
  onNavigate: (tab: any) => void;
  onOpenReceipt: (billId: string) => void;
  currentRobotTable?: string;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  onNavigate,
  onOpenReceipt,
  currentRobotTable = 'T04'
}) => {
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
      const handler = () => loadData();
      socket.on('request.created', handler);
      socket.on('request.updated', handler);
      socket.on('order.created', handler);
      socket.on('order.updated', handler);
      socket.on('bill.created', handler);
      socket.on('bill.updated', handler);
      socket.on('robot.status', handler);
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
        socket.off('table.updated', handler);
        socket.off('system.reset', handler);
      };
    }
  }, [socket]);

  // Quick action from Overview queue
  const handleAcknowledge = async (reqId: string) => {
    try {
      await api.updateRequestStatus(reqId, { status: 'Acknowledged', assigned_staff: 'Captain' });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStart = async (reqId: string) => {
    try {
      await api.updateRequestStatus(reqId, { status: 'In Progress' });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleComplete = async (reqId: string) => {
    try {
      await api.updateRequestStatus(reqId, { status: 'Completed' });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getElapsedMinutes = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    return Math.max(0, diff);
  };

  if (loading && !data) {
    return (
      <div className="py-24 text-center">
        <p className="text-xs font-mono text-muted">Retrieving restaurant operations...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-white border border-borderLine rounded-lg text-center">
        <p className="text-sm font-medium text-charcoal">Unable to load operations data</p>
        <p className="text-xs text-muted mt-1">{error}</p>
        <button
          onClick={loadData}
          className="mt-3 px-3 py-1.5 bg-forest-800 text-white rounded text-xs font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  const { stats, latestRequests, tablesRequiringAttention, activityFeed } = data;

  return (
    <div className="space-y-6">
      {/* A. Welcome and Shift Context */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-borderLine pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif text-charcoal">
            Good afternoon.
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Here's what's happening across your tables right now.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-muted">
          <span>Active Shift: <strong className="text-charcoal font-medium">Dinner Service</strong></span>
          <span className="text-borderLine">·</span>
          <span>Station: <strong className="text-charcoal font-medium">Floor Counter 1</strong></span>
        </div>
      </div>

      {/* B. Operational Summary Metrics (Compact, purposeful row) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Incoming requests */}
        <div
          onClick={() => onNavigate('requests')}
          className={`p-4 rounded-lg border transition-all cursor-pointer bg-white ${
            stats.newRequestsCount > 0
              ? 'border-terracotta/40 ring-1 ring-terracotta/20'
              : 'border-borderLine hover:border-forest-700/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[11px] text-muted uppercase tracking-wider">Incoming Requests</span>
            <span className={`w-2 h-2 rounded-full ${stats.newRequestsCount > 0 ? 'bg-terracotta' : 'bg-muted/30'}`} />
          </div>
          <div className="text-2xl font-serif text-charcoal mt-2 font-normal">
            {stats.newRequestsCount}
          </div>
          <p className="text-[11px] text-muted mt-0.5">
            {stats.newRequestsCount === 1 ? '1 table waiting' : `${stats.newRequestsCount} tables waiting`}
          </p>
        </div>

        {/* Metric 2: Requests in progress */}
        <div
          onClick={() => onNavigate('requests')}
          className="p-4 rounded-lg border border-borderLine bg-white hover:border-forest-700/30 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[11px] text-muted uppercase tracking-wider">Being Handled</span>
            <span className="w-2 h-2 rounded-full bg-forest-800" />
          </div>
          <div className="text-2xl font-serif text-charcoal mt-2 font-normal">
            {stats.inProgressRequestsCount}
          </div>
          <p className="text-[11px] text-muted mt-0.5">Staff currently attending</p>
        </div>

        {/* Metric 3: Active food orders */}
        <div
          onClick={() => onNavigate('orders')}
          className="p-4 rounded-lg border border-borderLine bg-white hover:border-forest-700/30 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[11px] text-muted uppercase tracking-wider">Kitchen Queue</span>
            <span className="w-2 h-2 rounded-full bg-forest-700" />
          </div>
          <div className="text-2xl font-serif text-charcoal mt-2 font-normal">
            {stats.pendingOrdersCount}
          </div>
          <p className="text-[11px] text-muted mt-0.5">Orders in preparation</p>
        </div>

        {/* Metric 4: Outstanding bills */}
        <div
          onClick={() => onNavigate('billing')}
          className="p-4 rounded-lg border border-borderLine bg-white hover:border-forest-700/30 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[11px] text-muted uppercase tracking-wider">Open Bills</span>
            <span className="w-2 h-2 rounded-full bg-sage-600" />
          </div>
          <div className="text-2xl font-serif text-charcoal mt-2 font-normal">
            {stats.openBillsCount}
          </div>
          <p className="text-[11px] text-muted mt-0.5">Awaiting guest settlement</p>
        </div>
      </div>

      {/* Main Operational Split: Live Requests Queue (Primary Focus) & Floor Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* C. Live Requests Queue (Left 2 Columns — The Primary Focal Point) */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-borderLine shadow-subtle p-5">
          <div className="flex items-center justify-between pb-3 border-b border-borderLine">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-forest-800" />
              <h3 className="font-serif text-base text-charcoal">
                Active Table Service Queue
              </h3>
            </div>
            <button
              onClick={() => onNavigate('requests')}
              className="text-xs font-mono text-forest-800 hover:text-forest-900 flex items-center gap-1 font-medium"
            >
              <span>View full queue ({latestRequests.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-borderLine mt-1">
            {latestRequests.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted font-mono">
                No active service requests right now. Tables are all attended.
              </div>
            ) : (
              latestRequests.slice(0, 5).map((req) => {
                const elapsedMin = getElapsedMinutes(req.created_at);
                const isOverdue = elapsedMin >= 5 && req.status === 'New';

                return (
                  <div key={req.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="text-center pt-0.5 min-w-[50px]">
                        <span className="font-mono font-bold text-sm text-charcoal block">
                          {req.table_id}
                        </span>
                        <span className="text-[10px] font-mono text-muted block">
                          {elapsedMin === 0 ? 'Just now' : `${elapsedMin}m ago`}
                        </span>
                      </div>

                      <div className="border-l border-borderLine pl-3 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-charcoal capitalize">
                            {req.request_type === 'water' ? 'Water Refill' :
                             req.request_type === 'waiter' ? 'Staff Attendance' :
                             req.request_type === 'bill' ? 'Bill Requested' :
                             req.request_type}
                          </span>

                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            req.status === 'New'
                              ? 'bg-terracotta-light text-terracotta-dark font-medium'
                              : req.status === 'Acknowledged'
                              ? 'bg-sage-100 text-forest-800'
                              : req.status === 'In Progress'
                              ? 'bg-forest-50 text-forest-800'
                              : 'bg-ivory text-muted'
                          }`}>
                            {req.status}
                          </span>

                          {isOverdue && (
                            <span className="text-[10px] font-mono font-semibold text-terracotta">
                              · Overdue
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted mt-0.5 truncate">
                          {req.message || `Customer signaled robot at ${req.table_id}`}
                        </p>
                      </div>
                    </div>

                    {/* Operational Action Controls */}
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {req.status === 'New' && (
                        <button
                          onClick={() => handleAcknowledge(req.id)}
                          className="px-3 py-1.5 rounded text-xs font-medium bg-forest-800 hover:bg-forest-900 text-white transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}
                      {req.status === 'Acknowledged' && (
                        <button
                          onClick={() => handleStart(req.id)}
                          className="px-3 py-1.5 rounded text-xs font-medium bg-sage-200 hover:bg-sage-300 text-forest-900 transition-colors"
                        >
                          Start Attending
                        </button>
                      )}
                      {req.status === 'In Progress' && (
                        <button
                          onClick={() => handleComplete(req.id)}
                          className="px-3 py-1.5 rounded text-xs font-medium bg-forest-800 hover:bg-forest-900 text-white transition-colors"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* D. Restaurant Floor Overview (Right Column) */}
        <div className="bg-white rounded-lg border border-borderLine shadow-subtle p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-borderLine mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-forest-800" />
                <h3 className="font-serif text-base text-charcoal">Floor Map</h3>
              </div>
              <span className="text-[11px] font-mono text-muted">Tables 1–6</span>
            </div>

            <p className="text-xs text-muted mb-3">
              Current floor distribution and ARIA station point.
            </p>

            {/* Table tiles directory */}
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'T01', name: 'Table 1', seats: 4 },
                { id: 'T02', name: 'Table 2', seats: 2 },
                { id: 'T03', name: 'Table 3', seats: 6 },
                { id: 'T04', name: 'Table 4', seats: 4 },
                { id: 'T05', name: 'Table 5', seats: 8 },
                { id: 'T06', name: 'Table 6', seats: 4 },
              ].map((tbl) => {
                const hasAria = tbl.id === currentRobotTable;
                const hasAttention = tablesRequiringAttention.some(t => t.id === tbl.id);
                const activeReqs = latestRequests.filter(r => r.table_id === tbl.id && r.status !== 'Completed').length;

                return (
                  <div
                    key={tbl.id}
                    className={`p-3 rounded-md border text-xs transition-colors ${
                      hasAria
                        ? 'border-forest-800 bg-sage-50/60'
                        : hasAttention || activeReqs > 0
                        ? 'border-terracotta/40 bg-terracotta-light/30'
                        : 'border-borderLine bg-ivory/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-charcoal">{tbl.id}</span>
                      {hasAria && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-forest-800 text-citrus font-medium">
                          ARIA
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[11px] text-muted">
                      <span>{tbl.seats} seats</span>
                      {activeReqs > 0 ? (
                        <span className="text-terracotta font-mono font-semibold">{activeReqs} call</span>
                      ) : (
                        <span className="font-mono">{hasAria ? 'Attended' : 'Clear'}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-borderLine mt-4">
            <button
              onClick={() => onNavigate('tables')}
              className="w-full py-2 rounded text-xs font-medium bg-ivory hover:bg-sage-100 text-charcoal border border-borderLine transition-colors text-center"
            >
              Manage Floor & Station
            </button>
          </div>
        </div>
      </div>

      {/* E. Recent Activity Log */}
      <div className="bg-white rounded-lg border border-borderLine shadow-subtle p-5">
        <div className="flex items-center justify-between pb-3 border-b border-borderLine mb-3">
          <h3 className="font-serif text-base text-charcoal">Recent Service Activity</h3>
          <span className="text-xs font-mono text-muted">Real-time event stream</span>
        </div>

        <div className="divide-y divide-borderLine">
          {activityFeed.slice(0, 4).map((act) => (
            <div key={act.id} className="py-2.5 flex items-baseline justify-between text-xs">
              <div className="flex items-baseline gap-2 min-w-0 pr-4">
                <span className="font-medium text-charcoal shrink-0">{act.title}</span>
                <span className="text-borderLine">·</span>
                <span className="text-muted truncate">{act.description}</span>
              </div>
              <span className="font-mono text-[11px] text-muted shrink-0">
                {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
