import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ServiceRequest, RestaurantTable } from '../types';
import { useSocket } from '../context/SocketContext';
import {
  Bell,
  Search,
  Filter,
  CheckCircle,
  Play,
  XCircle,
  Clock,
  User,
  AlertCircle
} from 'lucide-react';

export const LiveRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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

  const handleUpdateStatus = async (id: string, status: string, assignedStaff?: string) => {
    try {
      await api.updateRequestStatus(id, { status, assigned_staff: assignedStaff });
      loadRequests();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    }
  };

  const handleCancel = async (id: string) => {
    const reason = prompt('Please enter cancellation reason:', 'Guest requirement resolved');
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
      {/* Page Context Description */}
      <div>
        <h2 className="text-xl font-serif text-charcoal">Live Service Requests</h2>
        <p className="text-xs text-muted mt-0.5">
          Real-time customer signals received through ARIA table-side units.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-borderLine shadow-subtle flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by table, request type, or note..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-1.5 bg-ivory border border-borderLine rounded-md text-charcoal focus:outline-hidden focus:border-forest-800"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted">
          <span>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 bg-ivory border border-borderLine rounded-md text-charcoal"
          >
            <option value="all">All Statuses</option>
            <option value="New">New (Unattended)</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Resolved</option>
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

      {/* Requests List */}
      <div className="bg-white rounded-lg border border-borderLine shadow-subtle overflow-hidden">
        {loading && requests.length === 0 ? (
          <div className="py-20 text-center text-xs font-mono text-muted">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-serif text-charcoal">No service calls in this view</p>
            <p className="text-xs text-muted mt-1">Use the event simulator to transmit a sample customer call from ARIA.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-ivory border-b border-borderLine text-muted font-medium font-mono text-[11px]">
              <tr>
                <th className="py-3 px-4">TABLE</th>
                <th className="py-3 px-4">REQUEST</th>
                <th className="py-3 px-4">DETAILS</th>
                <th className="py-3 px-4">WAITING TIME</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4">ASSIGNED</th>
                <th className="py-3 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderLine">
              {requests.map((req) => {
                const elapsedMin = getElapsedMinutes(req.created_at);
                const isOverdue = elapsedMin >= 5 && req.status === 'New';

                return (
                  <tr
                    key={req.id}
                    className={`transition-colors ${
                      req.status === 'New'
                        ? 'bg-sage-50/40 hover:bg-sage-50/70'
                        : 'hover:bg-ivory/50'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-charcoal">
                      {req.table_id}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-charcoal capitalize">
                        {req.request_type === 'water' ? 'Water Refill' :
                         req.request_type === 'waiter' ? 'Call Waiter' :
                         req.request_type === 'bill' ? 'Bill Request' :
                         req.request_type}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-muted max-w-xs truncate">
                      {req.message || `Customer signaled robot`}
                      {req.cancel_reason && (
                        <span className="block text-[11px] text-terracotta mt-0.5">
                          Reason: {req.cancel_reason}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-muted">
                      {elapsedMin === 0 ? 'Just now' : `${elapsedMin}m ago`}
                      {isOverdue && (
                        <span className="ml-1 text-[10px] text-terracotta font-semibold">
                          (Overdue)
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono ${
                        req.status === 'New'
                          ? 'bg-terracotta-light text-terracotta-dark font-semibold'
                          : req.status === 'Acknowledged'
                          ? 'bg-sage-100 text-forest-800'
                          : req.status === 'In Progress'
                          ? 'bg-forest-50 text-forest-800'
                          : req.status === 'Completed'
                          ? 'bg-ivory text-forest-800'
                          : 'bg-ivory text-muted'
                      }`}>
                        {req.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-muted font-mono">
                      {req.assigned_staff || '—'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {req.status === 'New' && (
                          <button
                            onClick={() => handleUpdateStatus(req.id, 'Acknowledged', 'Captain')}
                            className="px-2.5 py-1 rounded text-xs font-medium bg-forest-800 hover:bg-forest-900 text-white transition-colors"
                          >
                            Acknowledge
                          </button>
                        )}
                        {req.status === 'Acknowledged' && (
                          <button
                            onClick={() => handleUpdateStatus(req.id, 'In Progress')}
                            className="px-2.5 py-1 rounded text-xs font-medium bg-sage-200 hover:bg-sage-300 text-forest-900 transition-colors"
                          >
                            Start
                          </button>
                        )}
                        {req.status === 'In Progress' && (
                          <button
                            onClick={() => handleUpdateStatus(req.id, 'Completed')}
                            className="px-2.5 py-1 rounded text-xs font-medium bg-forest-800 hover:bg-forest-900 text-white transition-colors"
                          >
                            Complete
                          </button>
                        )}
                        {req.status !== 'Completed' && req.status !== 'Cancelled' && (
                          <button
                            onClick={() => handleCancel(req.id)}
                            className="px-2 py-1 rounded text-xs font-medium text-muted hover:text-terracotta transition-colors"
                            title="Cancel Request"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
