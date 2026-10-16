import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ServiceRequest, FoodOrder, Bill, ActivityLog, RestaurantTable } from '../types';
import {
  History as HistoryIcon,
  Search,
  Filter,
  Receipt,
  Bell,
  UtensilsCrossed,
  Activity,
  CheckCircle2,
  XCircle,
  Eye
} from 'lucide-react';

interface HistoryPageProps {
  onOpenReceipt: (billId: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onOpenReceipt }) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'orders' | 'bills' | 'logs'>('requests');
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [data, setData] = useState<{
    requests?: ServiceRequest[];
    orders?: FoodOrder[];
    bills?: Bill[];
    activity?: ActivityLog[];
  }>({});
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await api.getHistory({
        type: activeTab === 'logs' ? 'all' : activeTab,
        table_id: tableFilter,
        search: searchQuery
      });
      setData(res);
    } catch (err: any) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.getTables().then(setTables).catch(console.error);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [activeTab, tableFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-900 tracking-tight">Request & Order History</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Permanent persistent archive of resolved requests, completed kitchen orders, and settled bills.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-200/80 p-1 rounded-xl flex items-center text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'requests' ? 'bg-white text-navy-900 shadow-2xs' : 'text-slate-600 hover:text-navy-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Requests ({data.requests?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'orders' ? 'bg-white text-navy-900 shadow-2xs' : 'text-slate-600 hover:text-navy-900'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Orders ({data.orders?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('bills')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'bills' ? 'bg-white text-navy-900 shadow-2xs' : 'text-slate-600 hover:text-navy-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Paid Bills ({data.bills?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'logs' ? 'bg-white text-navy-900 shadow-2xs' : 'text-slate-600 hover:text-navy-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search archive..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <select
          value={tableFilter}
          onChange={(e) => setTableFilter(e.target.value)}
          className="text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
        >
          <option value="all">All Tables</option>
          {tables.map(t => (
            <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
          ))}
        </select>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400">Loading history records...</div>
        ) : activeTab === 'requests' ? (
          /* Past Requests */
          (!data.requests || data.requests.length === 0) ? (
            <div className="py-20 text-center text-xs text-slate-400">No resolved or cancelled requests in archive.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3 px-4">REQ ID</th>
                  <th className="py-3 px-4">TABLE</th>
                  <th className="py-3 px-4">TYPE</th>
                  <th className="py-3 px-4">MESSAGE</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4">STAFF</th>
                  <th className="py-3 px-4 text-right">DATE / TIME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-navy-900">{r.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{r.table_name || r.table_id}</td>
                    <td className="py-3 px-4 capitalize">{r.request_type}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{r.message || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === 'Completed' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        {r.status === 'Completed' ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-rose-600" />}
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{r.assigned_staff || '-'}</td>
                    <td className="py-3 px-4 text-right text-slate-400">
                      {new Date(r.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : activeTab === 'orders' ? (
          /* Past Orders */
          (!data.orders || data.orders.length === 0) ? (
            <div className="py-20 text-center text-xs text-slate-400">No past orders in archive.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3 px-4">ORDER ID</th>
                  <th className="py-3 px-4">TABLE</th>
                  <th className="py-3 px-4">ITEMS</th>
                  <th className="py-3 px-4 text-right">SUBTOTAL</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4 text-right">DATE / TIME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-navy-900">{o.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{o.table_name || o.table_id}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {o.items ? o.items.map(i => `${i.quantity}x ${i.item_name}`).join(', ') : `${o.item_count} item(s)`}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">₹{o.subtotal.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">
                      {new Date(o.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : activeTab === 'bills' ? (
          /* Paid / Cancelled Bills */
          (!data.bills || data.bills.length === 0) ? (
            <div className="py-20 text-center text-xs text-slate-400">No settled bills in archive.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3 px-4">INVOICE #</th>
                  <th className="py-3 px-4">TABLE</th>
                  <th className="py-3 px-4">PAYMENT METHOD</th>
                  <th className="py-3 px-4 text-right">TOTAL (₹)</th>
                  <th className="py-3 px-4">SETTLEMENT STATUS</th>
                  <th className="py-3 px-4">SETTLED AT</th>
                  <th className="py-3 px-4 text-right">RECEIPT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.bills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-navy-900">{b.invoice_number}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{b.table_name || b.table_id}</td>
                    <td className="py-3 px-4 text-slate-600">{b.payment_method || 'Cash'} {b.payment_reference ? `(${b.payment_reference})` : ''}</td>
                    <td className="py-3 px-4 text-right font-bold text-teal-800">₹{b.final_amount.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.status === 'Paid' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        {b.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {b.paid_at ? new Date(b.paid_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : new Date(b.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onOpenReceipt(b.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-slate-100"
                        title="View Receipt"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          /* Activity Audit Logs */
          (!data.activity || data.activity.length === 0) ? (
            <div className="py-20 text-center text-xs text-slate-400">No activity logs recorded.</div>
          ) : (
            <div className="divide-y divide-slate-100 p-4 space-y-3">
              {data.activity.map((act) => (
                <div key={act.id} className="pt-2 flex items-start justify-between gap-4 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-navy-900">{act.title}</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        {act.type}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5">{act.description}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};
