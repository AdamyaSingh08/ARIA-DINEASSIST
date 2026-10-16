import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { MenuItem, RestaurantTable } from '../types';
import { UtensilsCrossed, Plus, Minus, Trash2, X, Leaf } from 'lucide-react';

interface ManualOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: RestaurantTable[];
  onOrderCreated: () => void;
}

export const ManualOrderModal: React.FC<ManualOrderModalProps> = ({
  isOpen,
  onClose,
  tables,
  onOrderCreated
}) => {
  const [tableId, setTableId] = useState<string>(tables[0]?.id || 'T01');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<Array<{ item: MenuItem; quantity: number; notes: string }>>([]);
  const [instructions, setInstructions] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      api.getMenu().then(items => setMenuItems(items)).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = ['all', ...Array.from(new Set(menuItems.map(m => m.category)))];

  const filteredMenu = selectedCategory === 'all'
    ? menuItems
    : menuItems.filter(m => m.category === selectedCategory);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const idx = prev.findIndex(c => c.item.id === item.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].quantity += 1;
        return copy;
      }
      return [...prev, { item, quantity: 1, notes: '' }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      return prev.map(c => {
        if (c.item.id === itemId) {
          const newQty = c.quantity + delta;
          return newQty > 0 ? { ...c, quantity: newQty } : null;
        }
        return c;
      }).filter(Boolean) as any;
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(c => c.item.id !== itemId));
  };

  const subtotal = cart.reduce((acc, c) => acc + c.item.price * c.quantity, 0);

  const handleSubmit = async () => {
    if (cart.length === 0) {
      alert('Please add at least one item to the order');
      return;
    }
    try {
      setLoading(true);
      await api.createOrder({
        table_id: tableId,
        items: cart.map(c => ({
          menu_item_id: c.item.id,
          quantity: c.quantity,
          notes: c.notes.trim() || undefined
        })),
        special_instructions: instructions.trim() || undefined
      });
      onOrderCreated();
      onClose();
    } catch (err: any) {
      alert(`Could not place order: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-900 text-base">New Food Order</h3>
            <span className="text-xs text-slate-500">· Trusted Menu Calculation</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Split View */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left: Menu Browser */}
          <div className="flex-1 flex flex-col p-4 border-r border-slate-200 overflow-hidden">
            {/* Table selector & Category tabs */}
            <div className="flex items-center gap-3 mb-3">
              <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">Table:</label>
              <select
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
              >
                {tables.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                ))}
              </select>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-2 border-b border-slate-100 mb-3">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-navy-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Menu Items Grid */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5 pr-1">
              {filteredMenu.map(item => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border border-slate-200 hover:border-teal-500/50 bg-white hover:bg-teal-50/20 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-xs font-bold text-slate-900">{item.name}</h4>
                      {item.is_veg ? (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded shrink-0">
                          <Leaf className="w-2.5 h-2.5 text-emerald-600" />
                          VEG
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded shrink-0">
                          NON-VEG
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{item.description}</p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-teal-700">₹{item.price}</span>
                    <button
                      onClick={() => addToCart(item)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-600 hover:text-white transition"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Order Cart & Summary */}
          <div className="w-full md:w-80 bg-slate-50 p-4 flex flex-col justify-between overflow-hidden">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
                <h4 className="text-xs font-bold text-slate-900">Order Items ({cart.length})</h4>
                <span className="text-xs font-bold text-slate-700">Table {tableId}</span>
              </div>

              {cart.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Select items from the menu on the left to build this order.
                </div>
              ) : (
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                  {cart.map(c => (
                    <div key={c.item.id} className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 truncate max-w-[140px]">{c.item.name}</span>
                        <span className="font-bold text-slate-700">₹{c.item.price * c.quantity}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateQuantity(c.item.id, -1)}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold px-1.5">{c.quantity}</span>
                          <button
                            onClick={() => updateQuantity(c.item.id, 1)}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(c.item.id)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom: Special instructions & Submit */}
            <div className="pt-4 border-t border-slate-200">
              <input
                type="text"
                placeholder="Special kitchen notes (e.g. less salt)..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg mb-3"
              />

              <div className="flex items-center justify-between mb-3 text-sm">
                <span className="font-medium text-slate-600">Subtotal:</span>
                <span className="font-bold text-slate-900">₹{subtotal.toFixed(2)}</span>
              </div>

              <button
                disabled={cart.length === 0 || loading}
                onClick={handleSubmit}
                className="w-full py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 active:scale-98 transition shadow-xs disabled:opacity-50"
              >
                {loading ? 'Sending to Kitchen...' : `Place Order (₹${subtotal.toFixed(2)})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
