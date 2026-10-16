import React, { useState } from 'react';
import { api } from '../services/api';
import { RestaurantTable } from '../types';
import { Bell, X } from 'lucide-react';

interface ManualRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: RestaurantTable[];
  onCreated: () => void;
}

export const ManualRequestModal: React.FC<ManualRequestModalProps> = ({
  isOpen,
  onClose,
  tables,
  onCreated
}) => {
  const [tableId, setTableId] = useState<string>(tables[0]?.id || 'T01');
  const [requestType, setRequestType] = useState<string>('water');
  const [message, setMessage] = useState<string>('');
  const [assignedStaff, setAssignedStaff] = useState<string>('Rahul (Captain)');
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.createRequest({
        table_id: tableId,
        request_type: requestType,
        message: message.trim() || undefined,
        assigned_staff: assignedStaff.trim() || undefined
      });
      onCreated();
      onClose();
    } catch (err: any) {
      alert(`Error creating request: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
              <Bell className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">New Service Request</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Table</label>
            <select
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
            >
              {tables.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Request Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'water', label: '💧 Water' },
                { id: 'waiter', label: '🛎️ Call Waiter' },
                { id: 'bill', label: '🧾 Request Bill' },
                { id: 'assistance', label: '🙋 Assistance' },
              ].map(opt => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setRequestType(opt.id)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition ${
                    requestType === opt.id
                      ? 'bg-teal-50 border-teal-500 text-teal-800 ring-1 ring-teal-500'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Message / Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Needs high chair, extra warm water, etc."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Staff</label>
            <input
              type="text"
              value={assignedStaff}
              onChange={(e) => setAssignedStaff(e.target.value)}
              placeholder="Staff member handling"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Dispatch Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
