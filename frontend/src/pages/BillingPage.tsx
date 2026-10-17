import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Bill, RestaurantTable } from '../types';
import { useSocket } from '../context/SocketContext';
import {
  Receipt,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  CreditCard,
  Banknote,
  QrCode,
  Plus,
  XCircle,
  AlertCircle,
  Eye,
  RefreshCw
} from 'lucide-react';

interface BillingPageProps {
  initialTableId?: string | null;
}

export const BillingPage: React.FC<BillingPageProps> = ({ initialTableId }) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Payment Settlement State
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'UPI'>('UPI');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [settling, setSettling] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Generate Bill for Table
  const [selectedTableForBill, setSelectedTableForBill] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);

  const { socket } = useSocket();

  const loadData = async () => {
    try {
      setLoading(true);
      const [billsData, tablesData] = await Promise.all([
        api.getBills({ status: statusFilter, search: searchQuery }),
        api.getTables()
      ]);
      setBills(billsData);
      setTables(tablesData);

      // Select bill based on initialTableId if supplied
      if (initialTableId) {
        const matching = billsData.find(b => b.table_id === initialTableId && b.status === 'Open');
        if (matching) setSelectedBill(matching);
      } else if (!selectedBill && billsData.length > 0) {
        setSelectedBill(billsData[0]);
      } else if (selectedBill) {
        // Refresh selected bill state
        const refreshed = billsData.find(b => b.id === selectedBill.id);
        if (refreshed) setSelectedBill(refreshed);
      }
    } catch (err: any) {
      console.error('Failed to load bills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, searchQuery, initialTableId]);

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
  }, [socket, statusFilter, searchQuery]);

  // Handle Generate Bill for a table with active orders
  const handleGenerateBill = async () => {
    if (!selectedTableForBill) return;
    try {
      setGenerating(true);
      const newBill = await api.generateBill(selectedTableForBill);
      setSelectedBill(newBill);
      setSelectedTableForBill('');
      loadData();
    } catch (err: any) {
      alert(`Could not generate bill: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Handle Payment Settlement
  const handleConfirmPayment = async () => {
    if (!selectedBill) return;
    try {
      setSettling(true);
      const updated = await api.payBill(selectedBill.id, paymentMethod, paymentRef.trim() || undefined);
      setSelectedBill(updated);
      setShowConfirmModal(false);
      setPaymentRef('');
      loadData();
    } catch (err: any) {
      alert(`Payment recording failed: ${err.message}`);
    } finally {
      setSettling(false);
    }
  };

  // Cancel bill
  const handleCancelBill = async (billId: string) => {
    const reason = prompt('Cancellation / Void Reason:', 'Cashier void');
    if (!reason) return;
    try {
      await api.cancelBill(billId, reason);
      loadData();
    } catch (err: any) {
      alert(`Cancellation failed: ${err.message}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const openBills = bills.filter(b => b.status === 'Open');

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Bill Generation Bar */}
      <div className="bg-white p-4 rounded-2xl border border-borderLine shadow-ticket flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-ink-primary font-sans flex items-center gap-2">
            <Receipt className="w-5 h-5 text-forest-800" />
            <span>Point of Sale Billing & Invoices</span>
          </h2>
          <p className="text-xs text-ink-secondary mt-0.5">
            Review guest invoices, preview receipts, and record payment settlement
          </p>
        </div>

        {/* Quick Bill Generator from Active Orders */}
        <div className="flex items-center gap-2">
          <select
            value={selectedTableForBill}
            onChange={(e) => setSelectedTableForBill(e.target.value)}
            className="text-xs font-mono font-bold px-3 py-2 bg-surface-warm border border-borderLine rounded-xl text-ink-primary min-h-[44px] focus:outline-hidden focus:border-forest-800"
          >
            <option value="">-- Generate Bill for Table --</option>
            {tables.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} [{t.id}]
              </option>
            ))}
          </select>

          <button
            disabled={!selectedTableForBill || generating}
            onClick={handleGenerateBill}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs shadow-xs transition min-h-[44px] disabled:opacity-50"
          >
            <Plus className="w-4 h-4 text-lime-accent" />
            <span>{generating ? 'Calculating...' : 'Create Invoice'}</span>
          </button>
        </div>
      </div>

      {/* Main 2-Panel POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL (5 cols): Table Bills Ledger */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-borderLine shadow-ticket overflow-hidden">
          {/* Filter Bar */}
          <div className="p-3.5 border-b border-borderLine bg-surface-warm flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search invoice or table..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-mono pl-8.5 pr-3 py-2 bg-white border border-borderLine rounded-xl text-ink-primary focus:outline-hidden focus:border-forest-800"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-mono font-bold px-2.5 py-2 bg-white border border-borderLine rounded-xl text-ink-primary focus:outline-hidden"
            >
              <option value="all">All ({bills.length})</option>
              <option value="Open">Open ({openBills.length})</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          {/* Bills List */}
          <div className="divide-y divide-borderLine max-h-[640px] overflow-y-auto">
            {bills.length === 0 ? (
              <div className="p-12 text-center text-xs text-ink-secondary">
                No invoices match current filter.
              </div>
            ) : (
              bills.map((bill) => {
                const isSelected = selectedBill?.id === bill.id;
                const isOpen = bill.status === 'Open';

                return (
                  <button
                    key={bill.id}
                    onClick={() => setSelectedBill(bill)}
                    className={`w-full text-left p-4 transition flex items-center justify-between min-h-[72px] ${
                      isSelected
                        ? 'bg-forest-50/80 border-l-4 border-forest-800'
                        : 'hover:bg-warmBg/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-lg font-bold text-ink-primary">
                          TABLE {bill.table_id.replace('T', '')}
                        </span>
                        <span className="font-mono text-xs text-ink-secondary">
                          #{bill.invoice_number}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-muted font-mono mt-0.5">
                        {bill.items?.length || bill.item_count || 0} item(s) · {new Date(bill.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-base font-bold text-forest-900">
                        ₹{bill.final_amount.toFixed(2)}
                      </div>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                        isOpen
                          ? 'bg-amber-light text-amber-dark border border-amber/40'
                          : bill.status === 'Paid'
                          ? 'bg-completed-light text-completed-dark border border-completed/40'
                          : 'bg-surface-warm text-ink-muted'
                      }`}>
                        {isOpen && <Clock className="w-2.5 h-2.5" />}
                        {bill.status === 'Paid' && <CheckCircle2 className="w-2.5 h-2.5" />}
                        {bill.status}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL (7 cols): Selected Bill Detail & POS Receipt Preview */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-borderLine shadow-ticket p-6 flex flex-col justify-between">
          {!selectedBill ? (
            <div className="py-24 text-center text-ink-secondary">
              <Receipt className="w-10 h-10 text-ink-muted mx-auto mb-2" />
              <p className="text-sm font-bold text-ink-primary">Select a Bill to Inspect</p>
              <p className="text-xs text-ink-secondary mt-1">Choose an open table invoice from the left panel.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Receipt Action Top Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-borderLine no-print">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full font-mono text-xs font-bold ${
                    selectedBill.status === 'Paid'
                      ? 'bg-completed-light text-completed-dark border border-completed/40'
                      : 'bg-amber-light text-amber-dark border border-amber/40'
                  }`}>
                    {selectedBill.status.toUpperCase()}
                  </span>
                  <span className="font-mono text-xs text-ink-secondary">
                    Invoice: <strong>{selectedBill.invoice_number}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-warm hover:bg-warmBg text-ink-primary border border-borderLine text-xs font-bold transition min-h-[40px]"
                  >
                    <Printer className="w-4 h-4 text-forest-800" />
                    <span>Print Receipt</span>
                  </button>

                  {selectedBill.status !== 'Paid' && selectedBill.status !== 'Cancelled' && (
                    <button
                      onClick={() => handleCancelBill(selectedBill.id)}
                      className="px-2.5 py-2 rounded-xl text-ink-muted hover:text-terracotta hover:bg-terracotta-light text-xs font-bold transition min-h-[40px]"
                      title="Void Bill"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Printable Thermal Receipt Box */}
              <div
                id="printable-receipt"
                className="bg-surface-warm p-6 rounded-2xl border border-borderLine font-mono text-xs space-y-4"
              >
                {/* Brand Header */}
                <div className="text-center pb-4 border-b border-dashed border-borderLine">
                  <h3 className="font-serif text-xl font-bold text-ink-primary uppercase tracking-wider">
                    ARIA Dining Room
                  </h3>
                  <p className="text-[11px] text-ink-secondary font-sans mt-0.5">
                    Autonomous Table-Side Robot Hospitality · Table {selectedBill.table_id}
                  </p>
                  <p className="text-[10px] text-ink-muted mt-0.5">
                    GSTIN: 07ARIA9876K1Z9 · INNOTECH 2026
                  </p>
                </div>

                {/* Metadata Row */}
                <div className="grid grid-cols-2 gap-2 text-[11px] pb-3 border-b border-dashed border-borderLine text-ink-secondary">
                  <div>
                    <span>Station: </span>
                    <strong className="text-ink-primary font-bold">{selectedBill.table_id}</strong>
                  </div>
                  <div className="text-right">
                    <span>Date: </span>
                    <span>{new Date(selectedBill.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                  <div>
                    <span>Invoice #: </span>
                    <strong className="text-ink-primary font-bold">{selectedBill.invoice_number}</strong>
                  </div>
                  <div className="text-right">
                    <span>Status: </span>
                    <strong className={selectedBill.status === 'Paid' ? 'text-completed-dark' : 'text-amber-dark'}>
                      {selectedBill.status}
                    </strong>
                  </div>
                </div>

                {/* Items Table */}
                <div className="pb-3 border-b border-dashed border-borderLine">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-ink-muted text-[10px] uppercase font-mono tracking-wider border-b border-borderLine pb-1">
                        <th className="py-1">ITEM</th>
                        <th className="text-center py-1">QTY</th>
                        <th className="text-right py-1">RATE</th>
                        <th className="text-right py-1">AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-borderLine/50 font-sans">
                      {selectedBill.items && selectedBill.items.map((item) => (
                        <tr key={item.id} className="text-ink-primary text-xs">
                          <td className="py-1.5 font-bold">{item.item_name}</td>
                          <td className="text-center py-1.5 font-mono">{item.quantity}</td>
                          <td className="text-right py-1.5 font-mono text-ink-secondary">₹{item.unit_price.toFixed(2)}</td>
                          <td className="text-right py-1.5 font-mono font-bold">₹{item.line_total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Subtotals & Taxes */}
                <div className="space-y-1.5 text-xs pb-3 border-b border-dashed border-borderLine">
                  <div className="flex justify-between text-ink-secondary">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹{selectedBill.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-ink-secondary">
                    <span>GST (5% SGST + CGST):</span>
                    <span className="font-mono">₹{selectedBill.tax_amount.toFixed(2)}</span>
                  </div>
                  {selectedBill.discount_amount > 0 && (
                    <div className="flex justify-between text-forest-800">
                      <span>Discount ({selectedBill.discount_rate}%):</span>
                      <span className="font-mono">-₹{selectedBill.discount_amount.toFixed(2)}</span>
                    </div>
                  )}

                  {/* High Visual Emphasis Final Total */}
                  <div className="flex justify-between items-center text-lg font-bold text-ink-primary pt-2 border-t border-borderLine">
                    <span className="font-serif text-xl">TOTAL PAYABLE:</span>
                    <span className="font-mono text-2xl text-forest-900 bg-lime-light px-3 py-1 rounded-xl border border-lime-accent">
                      ₹{selectedBill.final_amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Paid Confirmation Record */}
                {selectedBill.status === 'Paid' && (
                  <div className="p-3 rounded-xl bg-completed-light border border-completed/40 text-forest-900 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-completed-dark shrink-0" />
                      <div>
                        <strong className="block">SETTLED VIA {selectedBill.payment_method?.toUpperCase()}</strong>
                        <span className="text-[10px] text-ink-secondary font-mono">
                          Ref: {selectedBill.payment_reference || 'Counter Settlement'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-ink-secondary">
                      {selectedBill.paid_at && new Date(selectedBill.paid_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>

              {/* Payment Settlement Recording Controls */}
              {selectedBill.status === 'Open' && (
                <div className="p-5 rounded-2xl bg-surface-warm border border-borderLine space-y-4 no-print">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-primary font-mono">
                    Record Customer Settlement
                  </h4>

                  {/* Payment Method Switcher (min 48px height) */}
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('UPI')}
                      className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition min-h-[48px] ${
                        paymentMethod === 'UPI'
                          ? 'bg-forest-800 text-white border-forest-800 shadow-xs'
                          : 'bg-white text-ink-primary border-borderLine hover:bg-warmBg'
                      }`}
                    >
                      <QrCode className="w-4 h-4 text-lime-accent" />
                      <span>UPI / QR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('Cash')}
                      className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition min-h-[48px] ${
                        paymentMethod === 'Cash'
                          ? 'bg-forest-800 text-white border-forest-800 shadow-xs'
                          : 'bg-white text-ink-primary border-borderLine hover:bg-warmBg'
                      }`}
                    >
                      <Banknote className="w-4 h-4 text-lime-accent" />
                      <span>CASH</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('Card')}
                      className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition min-h-[48px] ${
                        paymentMethod === 'Card'
                          ? 'bg-forest-800 text-white border-forest-800 shadow-xs'
                          : 'bg-white text-ink-primary border-borderLine hover:bg-warmBg'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-lime-accent" />
                      <span>CARD / POS</span>
                    </button>
                  </div>

                  {/* Reference ID input & Primary Settle Action */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="Optional reference / txn ID..."
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      className="flex-1 text-xs font-mono px-3.5 py-3 bg-white border border-borderLine rounded-xl text-ink-primary focus:outline-hidden focus:border-forest-800"
                    />

                    <button
                      onClick={() => setShowConfirmModal(true)}
                      className="px-6 py-3 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-sm tracking-wide shadow-md transition min-h-[48px] flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-lime-accent" />
                      <span>RECORD PAID (₹{selectedBill.final_amount.toFixed(2)})</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Explicit Payment Confirmation Modal */}
      {showConfirmModal && selectedBill && (
        <div className="fixed inset-0 z-50 bg-forest-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal max-w-md w-full p-6 border border-borderLine space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-completed-light text-completed-dark flex items-center justify-center font-bold">
                ✓
              </div>
              <div>
                <h3 className="font-bold text-base text-ink-primary font-sans">
                  Confirm Payment Settlement
                </h3>
                <p className="text-xs text-ink-secondary">
                  Please verify customer payment has been received before marking paid.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-warm border border-borderLine space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-ink-secondary">Table:</span>
                <strong className="text-ink-primary">{selectedBill.table_id}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-secondary">Invoice:</span>
                <strong className="text-ink-primary">#{selectedBill.invoice_number}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-secondary">Method:</span>
                <strong className="text-forest-800">{paymentMethod.toUpperCase()}</strong>
              </div>
              <div className="flex justify-between text-base font-bold text-forest-900 pt-2 border-t border-borderLine font-sans">
                <span>Total Amount:</span>
                <span className="font-mono">₹{selectedBill.final_amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-ink-secondary hover:bg-warmBg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={settling}
                onClick={handleConfirmPayment}
                className="px-5 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs shadow-sm transition min-h-[44px] flex items-center gap-1.5"
              >
                <span>{settling ? 'Settling...' : 'Confirm & Mark Paid'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
