import React, { useState, useEffect } from 'react';
import { Bill, MenuItem } from '../types';
import { api } from '../services/api';
import {
  Printer,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  X,
  CreditCard,
  Banknote,
  QrCode,
  AlertTriangle,
  Receipt as ReceiptIcon
} from 'lucide-react';

interface ReceiptModalProps {
  billId: string | null;
  onClose: () => void;
  onBillUpdated?: () => void;
  restaurantName?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  billId,
  onClose,
  onBillUpdated,
  restaurantName = 'Spice Route & Robotics Cafe'
}) => {
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Add Item State
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedMenuItem, setSelectedMenuItem] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [isAddingItem, setIsAddingItem] = useState<boolean>(false);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card'>('UPI');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);

  // Cancel State
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  const fetchBill = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getBill(id);
      setBill(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (billId) {
      fetchBill(billId);
      // Load menu items for adding items
      api.getMenu().then(items => {
        setMenuItems(items);
        if (items.length > 0) setSelectedMenuItem(items[0].id);
      }).catch(console.error);
    }
  }, [billId]);

  if (!billId) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleAddItem = async () => {
    if (!bill || !selectedMenuItem) return;
    try {
      setIsAddingItem(true);
      const updated = await api.addItemToBill(bill.id, selectedMenuItem, itemQuantity);
      setBill(updated);
      setItemQuantity(1);
      if (onBillUpdated) onBillUpdated();
    } catch (err: any) {
      alert(`Could not add item: ${err.message}`);
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!bill) return;
    if (!window.confirm('Remove this item from the invoice?')) return;
    try {
      const updated = await api.removeItemFromBill(bill.id, itemId);
      setBill(updated);
      if (onBillUpdated) onBillUpdated();
    } catch (err: any) {
      alert(`Could not remove item: ${err.message}`);
    }
  };

  const handlePayBill = async () => {
    if (!bill) return;
    try {
      setIsProcessingPayment(true);
      const paid = await api.payBill(bill.id, paymentMethod, paymentReference);
      setBill(paid);
      if (onBillUpdated) onBillUpdated();
    } catch (err: any) {
      alert(`Payment recording failed: ${err.message}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleCancelBill = async () => {
    if (!bill) return;
    const reason = cancelReason.trim() || 'Staff voided';
    if (!window.confirm(`Are you sure you want to cancel Invoice #${bill.invoice_number}?`)) return;
    try {
      setIsCancelling(true);
      const cancelled = await api.cancelBill(bill.id, reason);
      setBill(cancelled);
      if (onBillUpdated) onBillUpdated();
    } catch (err: any) {
      alert(`Cancellation failed: ${err.message}`);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 no-print">
          <div className="flex items-center gap-2">
            <ReceiptIcon className="w-5 h-5 text-teal-600" />
            <h2 className="font-bold text-slate-900 text-base">
              Receipt & Invoice Details
            </h2>
            {bill && (
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                bill.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                bill.status === 'Cancelled' ? 'bg-rose-100 text-rose-800' :
                'bg-amber-100 text-amber-800'
              }`}>
                {bill.status.toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs transition"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content / Printable Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-16 text-center text-slate-400">Loading invoice details...</div>
          ) : error || !bill ? (
            <div className="py-16 text-center text-rose-600 font-medium">{error || 'Bill not found'}</div>
          ) : (
            <div>
              {/* Receipt Body */}
              <div id="printable-receipt" className="border border-slate-200 rounded-xl p-6 bg-white shadow-2xs font-mono text-xs">
                {/* Receipt Header */}
                <div className="text-center pb-4 border-b border-dashed border-slate-300">
                  <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider font-sans">
                    {restaurantName}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                    Powered by DineAssist · XiaoZhi Smart Robot System
                  </p>
                  <p className="text-[11px] text-slate-400 font-sans">
                    GSTIN: 07AAAAA0000A1Z5 (Demo Default)
                  </p>
                </div>

                {/* Metadata Row */}
                <div className="py-3 border-b border-dashed border-slate-300 grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="text-slate-400">Invoice: </span>
                    <strong className="text-slate-900 font-bold">{bill.invoice_number}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">Table: </span>
                    <strong className="text-slate-900 font-bold">{bill.table_id}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Date: </span>
                    <span>{new Date(bill.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">Status: </span>
                    <strong className={bill.status === 'Paid' ? 'text-emerald-700' : 'text-amber-700'}>
                      {bill.status}
                    </strong>
                  </div>
                  {bill.order_ids && bill.order_ids.length > 0 && (
                    <div className="col-span-2 text-[10px] text-slate-500">
                      <span>Orders Linked: </span>{bill.order_ids.join(', ')}
                    </div>
                  )}
                </div>

                {/* Items Table */}
                <div className="py-3 border-b border-dashed border-slate-300">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-400 text-[11px] border-b border-slate-200 pb-1">
                        <th className="py-1">ITEM</th>
                        <th className="text-center py-1">QTY</th>
                        <th className="text-right py-1">RATE</th>
                        <th className="text-right py-1">AMOUNT</th>
                        <th className="text-center py-1 no-print">ACT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bill.items && bill.items.map((it) => (
                        <tr key={it.id} className="text-slate-800">
                          <td className="py-1.5 font-sans font-medium text-[11px]">{it.item_name}</td>
                          <td className="text-center py-1.5">{it.quantity}</td>
                          <td className="text-right py-1.5">₹{it.unit_price.toFixed(2)}</td>
                          <td className="text-right py-1.5 font-semibold">₹{it.line_total.toFixed(2)}</td>
                          <td className="text-center py-1.5 no-print">
                            {bill.status !== 'Paid' && bill.status !== 'Cancelled' && (
                              <button
                                onClick={() => handleRemoveItem(it.id)}
                                className="text-slate-400 hover:text-rose-600 transition"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Subtotals & Taxes */}
                <div className="py-3 border-b border-dashed border-slate-300 space-y-1 text-slate-700">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{bill.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST / Tax ({bill.tax_rate}%):</span>
                    <span>₹{bill.tax_amount.toFixed(2)}</span>
                  </div>
                  {bill.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount ({bill.discount_rate}%):</span>
                      <span>-₹{bill.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200 font-sans">
                    <span>FINAL PAYABLE:</span>
                    <span className="text-teal-700">₹{bill.final_amount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Record */}
                <div className="pt-3 text-[11px] text-slate-500 font-sans">
                  {bill.status === 'Paid' ? (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <div>
                          <strong>PAID via {bill.payment_method}</strong>
                          <div className="text-[10px] text-emerald-700">Ref: {bill.payment_reference || 'N/A'}</div>
                        </div>
                      </div>
                      <div className="text-right text-[10px]">
                        {bill.paid_at && new Date(bill.paid_at).toLocaleString([], { timeStyle: 'short', dateStyle: 'short' })}
                      </div>
                    </div>
                  ) : bill.status === 'Cancelled' ? (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>{bill.notes || 'Invoice cancelled by staff.'}</span>
                    </div>
                  ) : (
                    <div className="text-center text-slate-400 py-1">
                      *** Please proceed to staff counter for settlement ***
                    </div>
                  )}
                </div>
              </div>

              {/* Add Item Row (Staff Edit before Finalization) */}
              {bill.status !== 'Paid' && bill.status !== 'Cancelled' && (
                <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 no-print">
                  <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-teal-600" />
                    <span>Add Item to Bill (Authoritative Menu Prices)</span>
                  </h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedMenuItem}
                      onChange={(e) => setSelectedMenuItem(e.target.value)}
                      className="flex-1 min-w-[200px] text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                    >
                      {menuItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} — ₹{item.price} ({item.category})
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1">
                      <span className="text-[11px] text-slate-500">Qty:</span>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={itemQuantity}
                        onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-12 text-xs font-semibold text-center focus:outline-hidden"
                      />
                    </div>

                    <button
                      disabled={isAddingItem}
                      onClick={handleAddItem}
                      className="px-3 py-2 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition disabled:opacity-50"
                    >
                      {isAddingItem ? 'Adding...' : 'Add to Bill'}
                    </button>
                  </div>
                </div>
              )}

              {/* Payment Recording Panel */}
              {bill.status !== 'Paid' && bill.status !== 'Cancelled' && (
                <div className="mt-4 p-4 rounded-xl bg-teal-50/60 border border-teal-200 no-print">
                  <h4 className="text-xs font-bold text-teal-900 mb-2">Record Settlement / Payment</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('UPI')}
                      className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                        paymentMethod === 'UPI'
                          ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      <span>UPI / QR</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('Cash')}
                      className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                        paymentMethod === 'Cash'
                          ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                      <span>Cash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('Card')}
                      className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                        paymentMethod === 'Card'
                          ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Card / POS</span>
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Optional reference / txn ID (e.g. UPI/20261016/123)"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="flex-1 text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                    />
                    <button
                      disabled={isProcessingPayment}
                      onClick={handlePayBill}
                      className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700 transition shadow-2xs disabled:opacity-50"
                    >
                      {isProcessingPayment ? 'Recording...' : `Mark Paid (₹${bill.final_amount.toFixed(2)})`}
                    </button>
                  </div>
                </div>
              )}

              {/* Void / Cancel Bill */}
              {bill.status !== 'Paid' && bill.status !== 'Cancelled' && (
                <div className="mt-3 flex items-center justify-between no-print pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 flex-1 mr-4">
                    <input
                      type="text"
                      placeholder="Reason for cancellation..."
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg w-full max-w-xs"
                    />
                    <button
                      disabled={isCancelling}
                      onClick={handleCancelBill}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1.5 rounded-lg transition"
                    >
                      {isCancelling ? 'Cancelling...' : 'Cancel Bill'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
