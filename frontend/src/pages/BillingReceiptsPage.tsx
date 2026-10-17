import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Bill } from '../types';
import { useSocket } from '../context/SocketContext';
import {
  Receipt,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Bot,
  Filter,
  RefreshCw,
  Printer
} from 'lucide-react';

interface BillingReceiptsPageProps {
  onOpenReceipt: (billId: string) => void;
}

export const BillingReceiptsPage: React.FC<BillingReceiptsPageProps> = ({ onOpenReceipt }) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { socket } = useSocket();

  const loadBills = async () => {
    try {
      setLoading(true);
      const billsData = await api.getBills({ status: statusFilter, search: searchQuery });
      setBills(billsData);
    } catch (err: any) {
      console.error('Failed to load bills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    if (socket) {
      const handleUpdate = () => loadBills();
      socket.on('bill.created', handleUpdate);
      socket.on('bill.updated', handleUpdate);
      socket.on('system.reset', handleUpdate);

      return () => {
        socket.off('bill.created', handleUpdate);
        socket.off('bill.updated', handleUpdate);
        socket.off('system.reset', handleUpdate);
      };
    }
  }, [socket, statusFilter, searchQuery]);

  // Quick stats
  const totalInvoiced = bills
    .filter(b => b.status === 'Paid')
    .reduce((sum, b) => sum + b.final_amount, 0);
  const openCount = bills.filter(b => b.status === 'Open').length;

  return (
    <div className="space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-borderLine">
        <div>
          <h2 className="font-serif text-2xl font-normal text-charcoal tracking-tight">Billing & Receipts</h2>
          <p className="text-xs text-muted mt-1 font-sans">
            Invoices generated through ARIA table-side vocal checkout or cashier dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] uppercase font-mono tracking-wider text-muted">Settled Today</span>
            <p className="font-mono text-sm font-bold text-forest-900">₹{totalInvoiced.toFixed(2)}</p>
          </div>
          <button
            onClick={() => loadBills()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-borderLine text-xs font-medium text-charcoal hover:bg-forest-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-3.5 rounded-lg border border-borderLine shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search invoice #, table or amount..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8.5 pr-3 py-1.5 bg-ivory border border-borderLine rounded-md text-charcoal placeholder:text-muted/60 focus:outline-hidden focus:border-forest-700"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-1.5 bg-ivory border border-borderLine rounded-md text-charcoal focus:outline-hidden focus:border-forest-700"
          >
            <option value="all">All Invoices ({bills.length})</option>
            <option value="Open">Open ({openCount})</option>
            <option value="Paid">Paid / Settled</option>
            <option value="Cancelled">Cancelled / Void</option>
          </select>
        </div>
      </div>

      {/* Invoices Ledger Table */}
      <div className="bg-white rounded-lg border border-borderLine shadow-2xs overflow-hidden">
        {loading && bills.length === 0 ? (
          <div className="py-20 text-center text-muted text-xs font-mono">Loading invoices...</div>
        ) : bills.length === 0 ? (
          <div className="py-20 text-center p-8">
            <div className="w-10 h-10 rounded-full bg-forest-50 text-forest-700 mx-auto mb-2 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-base font-normal text-charcoal">No Invoices Found</h3>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
              Invoices are automatically created when guests ask ARIA at their table: "Please bring the bill", or when kitchen orders are finalized.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-forest-50/70 border-b border-borderLine text-muted font-mono uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Invoice #</th>
                  <th className="py-2.5 px-4 font-medium">Table</th>
                  <th className="py-2.5 px-4 font-medium">Timestamp</th>
                  <th className="py-2.5 px-4 font-medium">Items</th>
                  <th className="py-2.5 px-4 text-right font-medium">Subtotal</th>
                  <th className="py-2.5 px-4 text-right font-medium">GST (5%)</th>
                  <th className="py-2.5 px-4 text-right font-medium">Payable</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderLine font-sans">
                {bills.map((b) => (
                  <tr key={b.id} className="hover:bg-forest-50/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-charcoal">
                      {b.invoice_number}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-forest-50 border border-borderLine text-forest-900 font-medium">
                        {b.table_id}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-muted font-mono text-[11px]">
                      {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>

                    <td className="py-3 px-4 text-muted">
                      {b.item_count || 0} item{b.item_count !== 1 ? 's' : ''}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-muted">
                      ₹{b.subtotal.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-muted">
                      ₹{b.tax_amount.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="font-mono font-bold text-forest-900 text-sm">
                        ₹{b.final_amount.toFixed(2)}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                        b.status === 'Paid'
                          ? 'bg-sage-100 text-forest-900 border border-sage-200'
                          : b.status === 'Cancelled'
                          ? 'bg-terracotta/10 text-terracotta border border-terracotta/20'
                          : 'bg-amber-50 text-amber-900 border border-amber-200'
                      }`}>
                        {b.status === 'Paid' && <CheckCircle2 className="w-3 h-3 text-forest-700" />}
                        {b.status === 'Open' && <Clock className="w-3 h-3 text-amber-600" />}
                        {b.status === 'Cancelled' && <XCircle className="w-3 h-3 text-terracotta" />}
                        <span>{b.status.toUpperCase()}</span>
                        {b.payment_method && <span className="opacity-75">· {b.payment_method}</span>}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onOpenReceipt(b.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-borderLine text-xs font-medium text-forest-900 hover:bg-forest-50 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-forest-700" />
                        <span>Inspect & Pay</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
