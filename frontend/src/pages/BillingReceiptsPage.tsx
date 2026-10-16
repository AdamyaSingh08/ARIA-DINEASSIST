import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Bill } from '../types';
import { useSocket } from '../context/SocketContext';
import {
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Bot
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight font-mono">
            Table Billing & Invoices
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Automatically generated when customers request their bill via XiaoZhi Robot.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#0B132B]/90 p-4 rounded-2xl border border-cyan-500/25 shadow-lg flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search invoice number or table..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-black/50 border border-slate-800 rounded-xl text-white font-mono focus:outline-hidden focus:border-cyan-400"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs px-3 py-2 bg-black/50 border border-slate-800 rounded-xl text-slate-300 font-mono"
        >
          <option value="all">All Invoices</option>
          <option value="Open">Open (Pending)</option>
          <option value="Paid">Paid (Settled)</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* Bills Table */}
      <div className="bg-[#0B132B]/90 rounded-2xl border border-cyan-500/25 shadow-lg overflow-hidden">
        {loading && bills.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs font-mono">Loading invoices...</div>
        ) : bills.length === 0 ? (
          <div className="py-20 text-center p-8">
            <Receipt className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h3 className="font-bold text-slate-300 text-sm font-mono">No Invoices Generated Yet</h3>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Invoices will automatically generate when the customer asks XiaoZhi: "Please bring the bill".
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-black/40 border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-3 px-4">INVOICE #</th>
                <th className="py-3 px-4">TABLE</th>
                <th className="py-3 px-4">ITEMS</th>
                <th className="py-3 px-4 text-right">SUBTOTAL</th>
                <th className="py-3 px-4 text-right">GST (5%)</th>
                <th className="py-3 px-4 text-right">FINAL AMOUNT</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {bills.map((b) => (
                <tr key={b.id} className="hover:bg-slate-900/40">
                  <td className="py-3.5 px-4 font-bold text-white">{b.invoice_number}</td>
                  <td className="py-3.5 px-4 font-bold text-amber-300">{b.table_id}</td>
                  <td className="py-3.5 px-4 text-slate-400">{b.item_count || 0} item(s)</td>
                  <td className="py-3.5 px-4 text-right text-slate-300">₹{b.subtotal.toFixed(2)}</td>
                  <td className="py-3.5 px-4 text-right text-slate-400">₹{b.tax_amount.toFixed(2)}</td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="font-bold text-cyan-300 text-sm">
                      ₹{b.final_amount.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      b.status === 'Paid'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : b.status === 'Cancelled'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}>
                      {b.status === 'Paid' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      {b.status === 'Open' && <Clock className="w-3 h-3 text-amber-400" />}
                      {b.status === 'Cancelled' && <XCircle className="w-3 h-3 text-rose-400" />}
                      <span>{b.status.toUpperCase()}</span>
                      {b.payment_method && <span className="ml-1 text-[9px]">({b.payment_method})</span>}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onOpenReceipt(b.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Print / Pay</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
