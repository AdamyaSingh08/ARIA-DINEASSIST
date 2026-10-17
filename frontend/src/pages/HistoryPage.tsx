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
  Eye,
  RefreshCw
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
      {/* Title & Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-borderLine">
        <div>
          <h2 className="font-serif text-2xl font-normal text-charcoal tracking-tight">Audit & Archives</h2>
          <p className="text-xs text-muted mt-1 font-sans">
            Historical ledger of fulfilled service calls, completed kitchen orders, and settled invoices.
          </p>
        </div>

        {/* Tab Pills */}
        <div className="bg-forest-50 p-1 rounded-md border border-borderLine flex items-center text-xs font-medium self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'requests'
                ? 'bg-white text-charcoal font-semibold shadow-xs border border-borderLine'
                : 'text-muted hover:text-charcoal'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Requests ({data.requests?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'orders'
                ? 'bg-white text-charcoal font-semibold shadow-xs border border-borderLine'
                : 'text-muted hover:text-charcoal'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Orders ({data.orders?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('bills')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'bills'
                ? 'bg-white text-charcoal font-semibold shadow-xs border border-borderLine'
                : 'text-muted hover:text-charcoal'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Bills ({data.bills?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'bg-white text-charcoal font-semibold shadow-xs border border-borderLine'
                : 'text-muted hover:text-charcoal'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-borderLine shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search archive..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8.5 pr-3 py-1.5 bg-ivory border border-borderLine rounded-md text-charcoal placeholder:text-muted/60 focus:outline-hidden focus:border-forest-700"
          />
        </div>

        <select
          value={tableFilter}
          onChange={(e) => setTableFilter(e.target.value)}
          className="text-xs px-3 py-1.5 bg-ivory border border-borderLine rounded-md text-charcoal focus:outline-hidden focus:border-forest-700"
        >
          <option value="all">All Tables</option>
          {tables.map(t => (
            <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
          ))}
        </select>

        <button
          onClick={() => loadHistory()}
          className="p-1.5 rounded-md border border-borderLine text-muted hover:text-charcoal hover:bg-forest-50 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Historical Table */}
      <div className="bg-white rounded-lg border border-borderLine shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-muted font-mono">Loading archive...</div>
        ) : activeTab === 'requests' ? (
          (!data.requests || data.requests.length === 0) ? (
            <div className="py-20 text-center text-xs text-muted font-sans">No resolved or cancelled requests in archive.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-forest-50/70 border-b border-borderLine text-muted font-mono uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Req ID</th>
                    <th className="py-2.5 px-4 font-medium">Table</th>
                    <th className="py-2.5 px-4 font-medium">Type</th>
                    <th className="py-2.5 px-4 font-medium">Customer Verbal Message</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                    <th className="py-2.5 px-4 font-medium">Staff</th>
                    <th className="py-2.5 px-4 text-right font-medium">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderLine font-sans">
                  {data.requests.map((r) => (
                    <tr key={r.id} className="hover:bg-forest-50/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-charcoal">{r.id}</td>
                      <td className="py-3 px-4 font-mono text-xs">{r.table_name || r.table_id}</td>
                      <td className="py-3 px-4 capitalize text-charcoal">{r.request_type}</td>
                      <td className="py-3 px-4 text-muted max-w-xs truncate">{r.message || '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                          r.status === 'Completed'
                            ? 'bg-sage-100 text-forest-900 border border-sage-200'
                            : 'bg-terracotta/10 text-terracotta border border-terracotta/20'
                        }`}>
                          {r.status === 'Completed' ? <CheckCircle2 className="w-3 h-3 text-forest-800" /> : <XCircle className="w-3 h-3 text-terracotta" />}
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted">{r.assigned_staff || 'Staff'}</td>
                      <td className="py-3 px-4 text-right font-mono text-[11px] text-muted">
                        {new Date(r.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === 'orders' ? (
          (!data.orders || data.orders.length === 0) ? (
            <div className="py-20 text-center text-xs text-muted font-sans">No past orders in archive.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-forest-50/70 border-b border-borderLine text-muted font-mono uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Order ID</th>
                    <th className="py-2.5 px-4 font-medium">Table</th>
                    <th className="py-2.5 px-4 font-medium">Dishes Ordered</th>
                    <th className="py-2.5 px-4 text-right font-medium">Subtotal</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                    <th className="py-2.5 px-4 text-right font-medium">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderLine font-sans">
                  {data.orders.map((o) => (
                    <tr key={o.id} className="hover:bg-forest-50/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-charcoal">{o.id}</td>
                      <td className="py-3 px-4 font-mono text-xs">{o.table_name || o.table_id}</td>
                      <td className="py-3 px-4 text-charcoal font-medium">
                        {o.items ? o.items.map(i => `${i.quantity}x ${i.item_name}`).join(', ') : `${o.item_count} item(s)`}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-forest-900">₹{o.subtotal.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-sage-100 text-forest-900 border border-sage-200">
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[11px] text-muted">
                        {new Date(o.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === 'bills' ? (
          (!data.bills || data.bills.length === 0) ? (
            <div className="py-20 text-center text-xs text-muted font-sans">No settled bills in archive.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-forest-50/70 border-b border-borderLine text-muted font-mono uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Invoice #</th>
                    <th className="py-2.5 px-4 font-medium">Table</th>
                    <th className="py-2.5 px-4 font-medium">Payment Channel</th>
                    <th className="py-2.5 px-4 text-right font-medium">Settled Amount</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                    <th className="py-2.5 px-4 font-medium">Timestamp</th>
                    <th className="py-2.5 px-4 text-right font-medium">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderLine font-sans">
                  {data.bills.map((b) => (
                    <tr key={b.id} className="hover:bg-forest-50/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-charcoal">{b.invoice_number}</td>
                      <td className="py-3 px-4 font-mono text-xs">{b.table_name || b.table_id}</td>
                      <td className="py-3 px-4 text-charcoal">{b.payment_method || 'Cash'} {b.payment_reference ? `(${b.payment_reference})` : ''}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-forest-900">₹{b.final_amount.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                          b.status === 'Paid'
                            ? 'bg-sage-100 text-forest-900 border border-sage-200'
                            : 'bg-terracotta/10 text-terracotta border border-terracotta/20'
                        }`}>
                          {b.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-muted">
                        {b.paid_at ? new Date(b.paid_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : new Date(b.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onOpenReceipt(b.id)}
                          className="p-1 rounded text-muted hover:text-forest-800 hover:bg-forest-50 transition-colors"
                          title="View Receipt"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          (!data.activity || data.activity.length === 0) ? (
            <div className="py-20 text-center text-xs text-muted font-sans">No activity logs recorded.</div>
          ) : (
            <div className="divide-y divide-borderLine p-4 space-y-2">
              {data.activity.map((act) => (
                <div key={act.id} className="pt-2 flex items-start justify-between gap-4 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-charcoal">{act.title}</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-forest-50 text-muted border border-borderLine">
                        {act.type}
                      </span>
                    </div>
                    <p className="text-muted mt-0.5">{act.description}</p>
                  </div>
                  <span className="text-[11px] font-mono text-muted shrink-0">
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
