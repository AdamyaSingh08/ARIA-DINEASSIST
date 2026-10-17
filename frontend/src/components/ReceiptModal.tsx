import React, { useState, useEffect } from 'react';
import { Bill, MenuItem } from '../types';
import { api } from '../services/api';
import {
  Printer,
  CheckCircle2,
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
  restaurantName = 'ARIA Dining Room'
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
    if (!window.confirm('Remove this line item from the invoice?')) return;
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
    const reason = cancelReason.trim() || 'Voided by cashier';
    if (!window.confirm(`Cancel invoice ${bill.invoice_number}?`)) return;
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-charcoal/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-borderLine">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-borderLine flex items-center justify-between bg-forest-50/50 no-print">
          <div className="flex items-center gap-2">
            <ReceiptIcon className="w-4 h-4 text-forest-700" />
            <h2 className="font-serif text-base font-normal text-charcoal">
              Guest Invoice & Settlement
            </h2>
            {bill && (
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                bill.status === 'Paid'
                  ? 'bg-sage-100 text-forest-900 border border-sage-200'
                  : bill.status === 'Cancelled'
                  ? 'bg-terracotta/10 text-terracotta border border-terracotta/20'
                  : 'bg-amber-50 text-amber-900 border border-amber-200'
              }`}>
                {bill.status.toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-borderLine text-xs font-medium text-charcoal hover:bg-forest-50 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-muted" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-muted hover:text-charcoal hover:bg-forest-50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-muted font-mono text-xs">Loading invoice...</div>
          ) : error || !bill ? (
            <div className="py-16 text-center text-terracotta font-sans text-xs">{error || 'Invoice record not found'}</div>
          ) : (
            <div>
              {/* Thermal Receipt Style Box */}
              <div id="printable-receipt" className="border border-borderLine rounded-md p-5 bg-ivory/60 font-mono text-xs text-charcoal space-y-3">
                {/* Brand Header */}
                <div className="text-center pb-3 border-b border-dashed border-borderLine">
                  <h3 className="font-serif text-lg font-normal text-charcoal tracking-wide">
                    {restaurantName}
                  </h3>
                  <p className="text-[11px] text-muted font-sans mt-0.5">
                    ARIA Autonomous Dining Service · Table-side Station
                  </p>
                  <p className="text-[10px] text-muted font-mono mt-0.5">
                    GSTIN: 07ARIA9876K1Z9 · INNOTECH 2026
                  </p>
                </div>

                {/* Metadata Row */}
                <div className="grid grid-cols-2 gap-2 text-[11px] pb-3 border-b border-dashed border-borderLine text-muted">
                  <div>
                    <span>Invoice: </span>
                    <strong className="text-charcoal">{bill.invoice_number}</strong>
                  </div>
                  <div className="text-right">
                    <span>Station: </span>
                    <strong className="text-charcoal">{bill.table_id}</strong>
                  </div>
                  <div>
                    <span>Date: </span>
                    <span>{new Date(bill.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                  <div className="text-right">
                    <span>Status: </span>
                    <strong className={bill.status === 'Paid' ? 'text-forest-800' : 'text-amber-800'}>
                      {bill.status}
                    </strong>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="pb-3 border-b border-dashed border-borderLine">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-muted text-[10px] uppercase font-mono tracking-wider border-b border-borderLine pb-1">
                        <th className="py-1 font-medium">Item</th>
                        <th className="text-center py-1 font-medium">Qty</th>
                        <th className="text-right py-1 font-medium">Rate</th>
                        <th className="text-right py-1 font-medium">Amount</th>
                        <th className="text-center py-1 no-print"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-borderLine/50 font-sans">
                      {bill.items && bill.items.map((it) => (
                        <tr key={it.id} className="text-charcoal text-xs">
                          <td className="py-1.5 font-medium">{it.item_name}</td>
                          <td className="text-center py-1.5 font-mono">{it.quantity}</td>
                          <td className="text-right py-1.5 font-mono text-muted">₹{it.unit_price.toFixed(2)}</td>
                          <td className="text-right py-1.5 font-mono font-medium">₹{it.line_total.toFixed(2)}</td>
                          <td className="text-center py-1.5 no-print">
                            {bill.status !== 'Paid' && bill.status !== 'Cancelled' && (
                              <button
                                onClick={() => handleRemoveItem(it.id)}
                                className="text-muted hover:text-terracotta transition-colors ml-2"
                                title="Remove item"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Subtotal & Taxes */}
                <div className="space-y-1.5 text-xs pb-3 border-b border-dashed border-borderLine">
                  <div className="flex justify-between text-muted">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹{bill.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>GST (5% SGST/CGST):</span>
                    <span className="font-mono">₹{bill.tax_amount.toFixed(2)}</span>
                  </div>
                  {bill.discount_amount > 0 && (
                    <div className="flex justify-between text-forest-800">
                      <span>Discount ({bill.discount_rate}%):</span>
                      <span className="font-mono">-₹{bill.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-charcoal pt-2 border-t border-borderLine">
                    <span className="font-serif">Total Payable:</span>
                    <span className="font-mono text-forest-900 text-base">₹{bill.final_amount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Badge Footer */}
                <div className="pt-1 text-[11px] font-sans">
                  {bill.status === 'Paid' ? (
                    <div className="p-2.5 rounded bg-sage-100 border border-sage-200 text-forest-900 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-forest-800 shrink-0" />
                        <div>
                          <strong>Settled via {bill.payment_method}</strong>
                          <div className="text-[10px] text-muted font-mono">Ref: {bill.payment_reference || 'Counter Direct'}</div>
                        </div>
                      </div>
                      <div className="text-right text-[10px] font-mono text-muted">
                        {bill.paid_at && new Date(bill.paid_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ) : bill.status === 'Cancelled' ? (
                    <div className="p-2.5 rounded bg-terracotta/10 border border-terracotta/20 text-terracotta flex items-center gap-2">
                      <XCircle className="w-4 h-4 shrink-0" />
                      <span>{bill.notes || 'Voided by restaurant cashier.'}</span>
                    </div>
                  ) : (
                    <div className="text-center text-muted py-1 text-[10px] font-mono">
                      Please settle with cashier or scan ARIA table terminal
                    </div>
                  )}
                </div>
              </div>

              {/* Add Item to Bill (Cashier Adjustment) */}
              {bill.status !== 'Paid' && bill.status !== 'Cancelled' && (
                <div className="mt-4 p-3.5 rounded-lg border border-borderLine bg-white no-print space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-charcoal">
                    <Plus className="w-3.5 h-3.5 text-forest-700" />
                    <span>Add Item to Bill (Catalog Prices)</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedMenuItem}
                      onChange={(e) => setSelectedMenuItem(e.target.value)}
                      className="flex-1 min-w-[180px] text-xs px-2.5 py-1.5 bg-ivory border border-borderLine rounded-md text-charcoal focus:outline-hidden focus:border-forest-700"
                    >
                      {menuItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} — ₹{item.price}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1 bg-ivory border border-borderLine rounded-md px-2 py-1">
                      <span className="text-[10px] text-muted font-mono">Qty:</span>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={itemQuantity}
                        onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-10 text-xs font-mono font-bold text-center bg-transparent focus:outline-hidden"
                      />
                    </div>

                    <button
                      disabled={isAddingItem}
                      onClick={handleAddItem}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold bg-forest-800 text-white hover:bg-forest-900 transition-colors disabled:opacity-50"
                    >
                      {isAddingItem ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                </div>
              )}

              {/* Payment Settlement Recording */}
              {bill.status !== 'Paid' && bill.status !== 'Cancelled' && (
                <div className="mt-4 p-3.5 rounded-lg border border-borderLine bg-sage-50/50 no-print space-y-3">
                  <h4 className="text-xs font-semibold text-forest-900">Record Settlement</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('UPI')}
                      className={`p-2 rounded border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                        paymentMethod === 'UPI'
                          ? 'bg-forest-800 text-white border-forest-800'
                          : 'bg-white text-charcoal border-borderLine hover:bg-forest-50'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>UPI / QR</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('Cash')}
                      className={`p-2 rounded border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                        paymentMethod === 'Cash'
                          ? 'bg-forest-800 text-white border-forest-800'
                          : 'bg-white text-charcoal border-borderLine hover:bg-forest-50'
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      <span>Cash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('Card')}
                      className={`p-2 rounded border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                        paymentMethod === 'Card'
                          ? 'bg-forest-800 text-white border-forest-800'
                          : 'bg-white text-charcoal border-borderLine hover:bg-forest-50'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Card / POS</span>
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Transaction reference ID (e.g. UPI-2026-981)..."
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="flex-1 text-xs px-2.5 py-1.5 bg-white border border-borderLine rounded-md font-mono text-charcoal focus:outline-hidden focus:border-forest-700"
                    />
                    <button
                      disabled={isProcessingPayment}
                      onClick={handlePayBill}
                      className="px-4 py-1.5 rounded-md text-xs font-semibold bg-forest-800 text-white hover:bg-forest-900 transition-colors shadow-xs disabled:opacity-50"
                    >
                      {isProcessingPayment ? 'Recording...' : `Mark Settled (₹${bill.final_amount.toFixed(2)})`}
                    </button>
                  </div>
                </div>
              )}

              {/* Void / Cancel Bill */}
              {bill.status !== 'Paid' && bill.status !== 'Cancelled' && (
                <div className="mt-3 pt-3 border-t border-borderLine flex items-center justify-between no-print text-xs">
                  <div className="flex items-center gap-2 flex-1 mr-4">
                    <input
                      type="text"
                      placeholder="Reason for cancellation..."
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="text-xs px-2.5 py-1 bg-ivory border border-borderLine rounded-md w-full max-w-xs text-charcoal"
                    />
                    <button
                      disabled={isCancelling}
                      onClick={handleCancelBill}
                      className="text-xs font-medium text-terracotta hover:underline whitespace-nowrap"
                    >
                      {isCancelling ? 'Voiding...' : 'Void Invoice'}
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
