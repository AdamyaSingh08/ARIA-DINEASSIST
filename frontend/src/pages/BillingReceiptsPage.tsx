import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Bill, RestaurantTable } from '../types';
import { useSocket } from '../context/SocketContext';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Printer,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  FileText
} from 'lucide-react';

interface BillingReceiptsPageProps {
  onOpenReceipt: (billId: string) => void;
}

export const BillingReceiptsPage: React.FC<BillingReceiptsPageProps> = ({ onOpenReceipt }) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Generate Bill for Table Modal
  const [isGenerateOpen, setIsGenerateOpen] = useState<boolean>(false);
  const [generateTableId, setGenerateTableId] = useState<string>('T01');
  const [generateNotes, setGenerateNotes] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const { socket } = useSocket();

  const loadData = async () => {
    try {
      setLoading(true);
      const [billsData, tablesData] = await Promise.all([
        api.getBills({ status: statusFilter, table_id: tableFilter, search: searchQuery }),
        api.getTables()
      ]);
      setBills(billsData);
      setTables(tablesData);
    } catch (err: any) {
      console.error('Failed to load bills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, tableFilter, searchQuery]);

  useEffect(() => {
    if (socket) {
      const handleUpdate = () => loadData();
      socket.on('bill.created', handleUpdate);
      socket.on('bill.updated', handleUpdate);
      socket.on('system.reset', handleUpdate);

      return () => {
        socket.off('bill.created', handleUpdate);
        socket.off('bill.updated', handleUpdate);
        socket.off('system.reset', handleUpdate);
      };
    }
  }, [socket, statusFilter, tableFilter, searchQuery]);

  const handleGenerateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsGenerating(true);
      const result = await api.generateBill(generateTableId, generateNotes.trim() || undefined);
      setIsGenerateOpen(false);
      setGenerateNotes('');
      loadData();
      onOpenReceipt(result.id);
    } catch (err: any) {
      alert(`Could not generate bill: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-900 tracking-tight">Billing & Receipts</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            GST compliant invoices, thermal print receipts, and payment settlements.
          </p>
        </div>

        <button
          onClick={() => setIsGenerateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Generate Table Bill</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search invoice number, table, or reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">All Payment Statuses</option>
            <option value="Open">Open (In Progress)</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Paid">Paid (Settled)</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

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
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading && bills.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs">Loading billing invoices...</div>
        ) : bills.length === 0 ? (
          <div className="py-20 text-center p-8">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h3 className="font-bold text-slate-700 text-sm">No bills found</h3>
            <p className="text-xs text-slate-400 mt-1">Generate a bill from confirmed table food orders.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="py-3 px-4">INVOICE #</th>
                <th className="py-3 px-4">TABLE</th>
                <th className="py-3 px-4">ITEMS</th>
                <th className="py-3 px-4 text-right">SUBTOTAL</th>
                <th className="py-3 px-4 text-right">GST (5%)</th>
                <th className="py-3 px-4 text-right">FINAL PAYABLE</th>
                <th className="py-3 px-4">PAYMENT STATUS</th>
                <th className="py-3 px-4">DATE & TIME</th>
                <th className="py-3 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bills.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4">
                    <span className="font-bold font-mono text-navy-900">{b.invoice_number}</span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {b.table_name || b.table_id}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {b.item_count || 0} item(s)
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600">
                    ₹{b.subtotal.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-500">
                    ₹{b.tax_amount.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-bold text-teal-800 text-sm">
                      ₹{b.final_amount.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      b.status === 'Paid'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : b.status === 'Cancelled'
                        ? 'bg-rose-50 text-rose-800 border border-rose-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {b.status === 'Paid' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                      {b.status === 'Open' && <Clock className="w-3 h-3 text-amber-600" />}
                      {b.status === 'Cancelled' && <XCircle className="w-3 h-3 text-rose-600" />}
                      <span>{b.status.toUpperCase()}</span>
                      {b.payment_method && <span className="ml-1 text-[9px]">({b.payment_method})</span>}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(b.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onOpenReceipt(b.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Receipt</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Generate Bill Modal */}
      {isGenerateOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base mb-1">Generate Bill for Table</h3>
            <p className="text-xs text-slate-500 mb-4">
              Gathers all confirmed & served food orders for this table without duplication.
            </p>

            <form onSubmit={handleGenerateBill} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Table</label>
                <select
                  value={generateTableId}
                  onChange={(e) => setGenerateTableId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                >
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.id}) — {t.status.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Optional Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Corporate discount requested, split bill, etc."
                  value={generateNotes}
                  onChange={(e) => setGenerateNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGenerateOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {isGenerating ? 'Generating...' : 'Create & View Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
