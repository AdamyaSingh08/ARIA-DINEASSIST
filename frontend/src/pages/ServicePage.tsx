import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ServiceRequest, RestaurantTable } from '../types';
import { useSocket } from '../context/SocketContext';
import {
  Bell,
  Droplets,
  Receipt,
  UserCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Play,
  RotateCcw,
  XCircle,
  Filter,
  Sparkles,
  ArrowRight,
  Bot
} from 'lucide-react';

interface ServicePageProps {
  onNavigateToBilling: (tableId?: string) => void;
}

export const ServicePage: React.FC<ServicePageProps> = ({ onNavigateToBilling }) => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTable, setFilterTable] = useState<string>('all');
  const [actingId, setActingId] = useState<string | null>(null);

  const { socket } = useSocket();

  const loadRequests = async () => {
    try {
      setLoading(true);
      const [reqData, tableData] = await Promise.all([
        api.getRequests(),
        api.getTables()
      ]);
      setRequests(reqData);
      setTables(tableData);
    } catch (err: any) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    if (socket) {
      const handleUpdate = () => loadRequests();
      socket.on('request.created', handleUpdate);
      socket.on('request.status_changed', handleUpdate);
      socket.on('system.reset', handleUpdate);

      return () => {
        socket.off('request.created', handleUpdate);
        socket.off('request.status_changed', handleUpdate);
        socket.off('system.reset', handleUpdate);
      };
    }
  }, [socket]);

  // Handle Action Lifecycle: New -> Acknowledged -> In Progress -> Completed
  const handleAdvanceStatus = async (request: ServiceRequest) => {
    let nextStatus = 'Acknowledged';
    if (request.status === 'New') nextStatus = 'Acknowledged';
    else if (request.status === 'Acknowledged') nextStatus = 'In Progress';
    else if (request.status === 'In Progress') nextStatus = 'Completed';

    try {
      setActingId(request.id);
      await api.updateRequestStatus(request.id, {
        status: nextStatus,
        assigned_staff: 'Waiter Console'
      });
      loadRequests();
    } catch (err: any) {
      alert(`Could not update request: ${err.message}`);
    } finally {
      setActingId(null);
    }
  };

  const handleCancelRequest = async (id: string) => {
    const reason = prompt('Cancellation reason:', 'Customer no longer requires assistance');
    if (!reason) return;
    try {
      setActingId(id);
      await api.updateRequestStatus(id, {
        status: 'Cancelled',
        cancel_reason: reason
      });
      loadRequests();
    } catch (err: any) {
      alert(`Could not cancel request: ${err.message}`);
    } finally {
      setActingId(null);
    }
  };

  // Helper to format elapsed time
  const getElapsed = (dateStr: string) => {
    const elapsedSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (elapsedSec < 60) return `${Math.max(1, elapsedSec)}s ago`;
    const min = Math.floor(elapsedSec / 60);
    if (min < 60) return `${min}m ago`;
    return `${Math.floor(min / 60)}h ago`;
  };

  // Filter requests
  const filtered = requests.filter(r => {
    // Only show active uncompleted requests in live queue
    if (r.status === 'Completed' || r.status === 'Cancelled') return false;
    if (filterType !== 'all' && r.request_type !== filterType) return false;
    if (filterTable !== 'all' && r.table_id !== filterTable) return false;
    return true;
  });

  const needsAttention = filtered.filter(r => r.status === 'New');
  const beingHandled = filtered.filter(r => r.status === 'Acknowledged' || r.status === 'In Progress');

  // Request icon
  const getRequestIcon = (type: string) => {
    switch (type) {
      case 'water':
        return <Droplets className="w-5 h-5 text-forest-700" />;
      case 'waiter':
        return <UserCheck className="w-5 h-5 text-terracotta" />;
      case 'bill':
        return <Receipt className="w-5 h-5 text-amber-dark" />;
      default:
        return <HelpCircle className="w-5 h-5 text-forest-800" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter and Overview Stats Bar */}
      <div className="bg-white p-4 rounded-2xl border border-borderLine shadow-ticket flex flex-wrap items-center justify-between gap-4">
        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition min-h-[40px] ${
              filterType === 'all'
                ? 'bg-forest-800 text-white shadow-xs'
                : 'bg-surface-warm hover:bg-warmBg text-ink-primary border border-borderLine'
            }`}
          >
            All Requests ({filtered.length})
          </button>
          <button
            onClick={() => setFilterType('water')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition min-h-[40px] ${
              filterType === 'water'
                ? 'bg-forest-800 text-white shadow-xs'
                : 'bg-surface-warm hover:bg-warmBg text-ink-primary border border-borderLine'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>Water</span>
          </button>
          <button
            onClick={() => setFilterType('waiter')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition min-h-[40px] ${
              filterType === 'waiter'
                ? 'bg-forest-800 text-white shadow-xs'
                : 'bg-surface-warm hover:bg-warmBg text-ink-primary border border-borderLine'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Call Waiter</span>
          </button>
          <button
            onClick={() => setFilterType('bill')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition min-h-[40px] ${
              filterType === 'bill'
                ? 'bg-forest-800 text-white shadow-xs'
                : 'bg-surface-warm hover:bg-warmBg text-ink-primary border border-borderLine'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Bill Requests</span>
          </button>
        </div>

        {/* Table Selector Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ink-secondary">Table:</span>
          <select
            value={filterTable}
            onChange={(e) => setFilterTable(e.target.value)}
            className="text-xs font-mono font-bold px-3 py-2 bg-surface-warm border border-borderLine rounded-xl text-ink-primary min-h-[40px] focus:outline-hidden focus:border-forest-800"
          >
            <option value="all">All Tables</option>
            {tables.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Operational Groups */}
      <div className="space-y-8">
        {/* SECTION 1: NEEDS ATTENTION (New unhandled requests) */}
        <div>
          <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-terracotta/40">
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full bg-terracotta beacon-pulse" />
              <h2 className="font-bold text-base sm:text-lg text-ink-primary font-sans uppercase tracking-tight">
                Needs Immediate Attention
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-terracotta-light text-terracotta-dark font-mono text-xs font-bold">
                {needsAttention.length} NEW
              </span>
            </div>
            <span className="text-xs text-ink-secondary font-mono">Touch button to acknowledge</span>
          </div>

          {needsAttention.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white border border-borderLine text-center shadow-xs">
              <CheckCircle2 className="w-8 h-8 text-completed-dark mx-auto mb-2" />
              <p className="font-bold text-sm text-ink-primary">No Unattended Service Calls</p>
              <p className="text-xs text-ink-secondary mt-0.5">All customer requests have been acknowledged by staff.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {needsAttention.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border-2 border-terracotta/60 shadow-ticket-hover overflow-hidden flex flex-col justify-between"
                >
                  {/* Urgent Accent Strip */}
                  <div className="bg-terracotta px-4 py-1.5 flex items-center justify-between text-white font-mono text-xs font-bold">
                    <span>ACTION REQUIRED</span>
                    <span>{getElapsed(req.created_at)}</span>
                  </div>

                  <div className="p-5 flex-1">
                    {/* Table & Request Type Header */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-borderLine">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-ink-secondary block font-bold">Station</span>
                        <h3 className="font-serif text-2xl font-bold text-ink-primary leading-tight">
                          TABLE {req.table_id.replace('T', '')}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 p-2 rounded-xl bg-terracotta-light">
                        {getRequestIcon(req.request_type)}
                        <span className="font-bold text-xs uppercase text-terracotta-dark tracking-wide">
                          {req.request_type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Customer Message */}
                    <div className="py-3">
                      <p className="text-xs font-medium text-ink-primary leading-relaxed bg-surface-warm p-3 rounded-xl border border-borderLine">
                        "{req.message || `Customer at Table ${req.table_id} requested ${req.request_type}`}"
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-ink-secondary font-mono mt-3">
                        <span className="flex items-center gap-1">
                          <Bot className="w-3.5 h-3.5 text-forest-800" />
                          <span>{req.robot_id || 'aria-robot-01'}</span>
                        </span>
                        <span>ID: {req.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Primary Touch Actions (48px height) */}
                  <div className="p-4 bg-surface-warm border-t border-borderLine flex items-center gap-2">
                    {req.request_type === 'bill' && (
                      <button
                        onClick={() => onNavigateToBilling(req.table_id)}
                        className="px-3 py-2.5 rounded-xl bg-amber hover:bg-amber-dark text-forest-950 font-bold text-xs flex items-center gap-1 min-h-[48px] shadow-xs transition"
                        title="Open bill directly"
                      >
                        <Receipt className="w-4 h-4" />
                        <span>Open Bill</span>
                      </button>
                    )}

                    <button
                      disabled={actingId === req.id}
                      onClick={() => handleAdvanceStatus(req)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-sm tracking-wide shadow-xs transition min-h-[48px] flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-lime-accent" />
                      <span>{actingId === req.id ? 'Updating...' : 'ACKNOWLEDGE'}</span>
                    </button>

                    <button
                      onClick={() => handleCancelRequest(req.id)}
                      className="p-2.5 rounded-xl text-ink-muted hover:text-terracotta hover:bg-terracotta-light border border-borderLine transition min-h-[48px] min-w-[48px] flex items-center justify-center"
                      title="Cancel Request"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2: BEING HANDLED (Acknowledged & In Progress) */}
        <div>
          <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-forest-800/30">
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full bg-forest-800" />
              <h2 className="font-bold text-base sm:text-lg text-ink-primary font-sans uppercase tracking-tight">
                Being Handled by Staff
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-forest-100 text-forest-900 font-mono text-xs font-bold">
                {beingHandled.length} ACTIVE
              </span>
            </div>
          </div>

          {beingHandled.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white border border-borderLine text-center shadow-xs">
              <p className="text-xs text-ink-secondary">No active tickets currently in progress.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {beingHandled.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border border-borderLine shadow-ticket overflow-hidden flex flex-col justify-between"
                >
                  {/* Status Strip */}
                  <div className="bg-forest-800 px-4 py-1.5 flex items-center justify-between text-white font-mono text-xs">
                    <span className="font-bold text-lime-accent uppercase">{req.status}</span>
                    <span className="text-forest-100/70">{getElapsed(req.created_at)}</span>
                  </div>

                  <div className="p-5 flex-1">
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-borderLine">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-ink-secondary block font-bold">Station</span>
                        <h3 className="font-serif text-2xl font-bold text-ink-primary leading-tight">
                          TABLE {req.table_id.replace('T', '')}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 p-2 rounded-xl bg-forest-50 border border-borderLine">
                        {getRequestIcon(req.request_type)}
                        <span className="font-bold text-xs uppercase text-forest-900 tracking-wide">
                          {req.request_type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="py-3">
                      <p className="text-xs text-ink-primary bg-surface-warm p-3 rounded-xl border border-borderLine">
                        "{req.message || `Customer requested ${req.request_type}`}"
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-ink-secondary font-mono mt-3">
                        <span>Staff: {req.assigned_staff || 'Waiter'}</span>
                        <span>ID: {req.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Primary Touch Actions (48px height) */}
                  <div className="p-4 bg-surface-warm border-t border-borderLine flex items-center gap-2">
                    {req.status === 'Acknowledged' ? (
                      <button
                        disabled={actingId === req.id}
                        onClick={() => handleAdvanceStatus(req)}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-amber-dark hover:bg-amber text-white font-bold text-sm tracking-wide shadow-xs transition min-h-[48px] flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        <span>{actingId === req.id ? 'Updating...' : 'START ATTENDING'}</span>
                      </button>
                    ) : (
                      <button
                        disabled={actingId === req.id}
                        onClick={() => handleAdvanceStatus(req)}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-sm tracking-wide shadow-xs transition min-h-[48px] flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4 text-lime-accent" />
                        <span>{actingId === req.id ? 'Completing...' : 'MARK COMPLETE'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleCancelRequest(req.id)}
                      className="p-2.5 rounded-xl text-ink-muted hover:text-terracotta hover:bg-terracotta-light border border-borderLine transition min-h-[48px] min-w-[48px] flex items-center justify-center"
                      title="Cancel Request"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
