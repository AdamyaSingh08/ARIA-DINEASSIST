import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ServiceRequest, RestaurantTable } from '../types';
import { useSocket } from '../context/SocketContext';
import { ManualRequestModal } from '../components/ManualRequestModal';
import {
  Bell,
  CheckCircle,
  Clock,
  Play,
  XCircle,
  Plus,
  Search,
  Filter,
  Droplets,
  HelpCircle,
  Receipt,
  User,
  AlertTriangle
} from 'lucide-react';

export const LiveRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { socket } = useSocket();

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await api.getRequests({
        status: statusFilter,
        table_id: tableFilter,
        request_type: typeFilter,
        search: searchQuery
      });
      setRequests(data);
    } catch (err: any) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.getTables().then(setTables).catch(console.error);
  }, []);

  useEffect(() => {
    loadRequests();
  }, [statusFilter, tableFilter, typeFilter, searchQuery]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (socket) {
      const handleUpdate = () => loadRequests();
      socket.on('request.created', handleUpdate);
      socket.on('request.updated', handleUpdate);
      socket.on('system.reset', handleUpdate);

      return () => {
        socket.off('request.created', handleUpdate);
        socket.off('request.updated', handleUpdate);
        socket.off('system.reset', handleUpdate);
      };
    }
  }, [socket, statusFilter, tableFilter, typeFilter, searchQuery]);

  // Status Action Handlers
  const handleUpdateStatus = async (id: string, status: string, assignedStaff?: string) => {
    try {
      await api.updateRequestStatus(id, { status, assigned_staff: assignedStaff });
      loadRequests();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    }
  };

  const handleCancel = async (id: string) => {
    const reason = prompt('Please enter cancellation reason:', 'Customer no longer needs assistance');
    if (!reason) return;
    try {
      await api.updateRequestStatus(id, { status: 'Cancelled', cancel_reason: reason });
      loadRequests();
    } catch (err: any) {
      alert(`Cancel failed: ${err.message}`);
    }
  };

  const getElapsedMinutes = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    return Math.max(0, diff);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & New Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-900 tracking-tight">Live Service Requests</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Incoming robot requests from dining tables requiring staff response.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Manual Service Call</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by ID, table, or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">All Statuses</option>
            <option value="New">New (Unanswered)</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {/* Table Filter */}
        <select
          value={tableFilter}
          onChange={(e) => setTableFilter(e.target.value)}
          className="text-xs px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500"
        >
          <option value="all">All Tables</option>
          {tables.map(t => (
            <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
          ))}
        </select>

        {/* Request Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-xs px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500"
        >
          <option value="all">All Request Types</option>
          <option value="water">💧 Water</option>
          <option value="waiter">🛎️ Call Waiter</option>
          <option value="bill">🧾 Bill Request</option>
          <option value="assistance">🙋 Assistance</option>
          <option value="custom">💬 Custom</option>
        </select>
      </div>

      {/* Requests Grid */}
      {loading && requests.length === 0 ? (
        <div className="py-20 text-center text-slate-400 text-xs">
          Loading service requests...
        </div>
      ) : requests.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 p-8">
          <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-slate-700 text-sm">No service requests match the filter</h3>
          <p className="text-xs text-slate-400 mt-1">Try resetting the filters or use the demo bar to simulate a call.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map((req) => {
            const elapsed = getElapsedMinutes(req.created_at);
            const isOverdue = elapsed >= 5 && (req.status === 'New' || req.status === 'Acknowledged');

            return (
              <div
                key={req.id}
                className={`bg-white rounded-2xl p-5 border shadow-2xs flex flex-col justify-between transition-all ${
                  req.status === 'New'
                    ? isOverdue
                      ? 'border-rose-400 urgent-alert ring-1 ring-rose-300'
                      : 'border-rose-200 bg-rose-50/20'
                    : req.status === 'Acknowledged'
                    ? 'border-amber-200'
                    : req.status === 'In Progress'
                    ? 'border-blue-200'
                    : req.status === 'Completed'
                    ? 'border-emerald-200 bg-slate-50/50 opacity-80'
                    : 'border-slate-200 bg-slate-50/40 opacity-70'
                }`}
              >
                <div>
                  {/* Top Header of Card */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl ${
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

                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-sm text-navy-900">{req.table_name || req.table_id}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">({req.id})</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Robot: <strong className="text-slate-700">{req.robot_name || req.robot_id || 'Direct'}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        req.status === 'New' ? 'bg-rose-100 text-rose-800' :
                        req.status === 'Acknowledged' ? 'bg-amber-100 text-amber-800' :
                        req.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                        req.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {req.status}
                      </span>
                      {isOverdue && (
                        <span className="text-[9px] font-bold text-rose-600 mt-1 flex items-center gap-0.5">
                          <AlertTriangle className="w-3 h-3 text-rose-500" />
                          OVERDUE {elapsed}m
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Message Body */}
                  <div className="py-3">
                    <p className="text-xs text-slate-800 font-medium leading-relaxed">
                      {req.message || `Customer requested ${req.request_type}`}
                    </p>

                    {req.cancel_reason && (
                      <p className="text-[11px] text-rose-600 mt-1.5 bg-rose-50 p-1.5 rounded-md border border-rose-200">
                        Reason: {req.cancel_reason}
                      </p>
                    )}
                  </div>

                  {/* Metadata Row */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{elapsed === 0 ? 'Just now' : `${elapsed}m ago`}</span>
                    </div>

                    {req.assigned_staff ? (
                      <div className="flex items-center gap-1 text-slate-600">
                        <User className="w-3 h-3 text-teal-600" />
                        <span>{req.assigned_staff}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  {req.status === 'New' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(req.id, 'Acknowledged', 'Captain')}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-600 hover:text-white transition"
                      >
                        Acknowledge
                      </button>
                      <button
                        onClick={() => handleCancel(req.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Cancel Request"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {req.status === 'Acknowledged' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(req.id, 'In Progress')}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-600 hover:text-white transition flex items-center justify-center gap-1"
                      >
                        <Play className="w-3 h-3" />
                        <span>Start Handling</span>
                      </button>
                      <button
                        onClick={() => handleCancel(req.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {req.status === 'In Progress' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(req.id, 'Completed')}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <CheckCircle className="w-3 h-3" />
                        <span>Mark Resolved</span>
                      </button>
                      <button
                        onClick={() => handleCancel(req.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {(req.status === 'Completed' || req.status === 'Cancelled') && (
                    <span className="text-[11px] text-slate-400 font-medium py-1">
                      Archived in database history
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Request Modal */}
      <ManualRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tables={tables}
        onCreated={() => loadRequests()}
      />
    </div>
  );
};
