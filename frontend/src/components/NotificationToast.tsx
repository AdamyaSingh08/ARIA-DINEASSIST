import React from 'react';
import { useSocket, ToastNotification } from '../context/SocketContext';
import { Bell, UtensilsCrossed, Receipt, Bot, Info, X } from 'lucide-react';

export const NotificationToasts: React.FC = () => {
  const { notifications, dismissNotification } = useSocket();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="pointer-events-auto bg-white/95 backdrop-blur border border-slate-200/80 rounded-xl shadow-xl p-3.5 flex items-start gap-3 transition-all transform translate-y-0 animate-in slide-in-from-top-2 duration-200"
        >
          <div className={`p-2 rounded-lg flex-shrink-0 ${
            n.type === 'request' ? 'bg-amber-100 text-amber-700' :
            n.type === 'order' ? 'bg-blue-100 text-blue-700' :
            n.type === 'bill' ? 'bg-emerald-100 text-emerald-700' :
            n.type === 'robot' ? 'bg-rose-100 text-rose-700' :
            'bg-slate-100 text-slate-700'
          }`}>
            {n.type === 'request' && <Bell className="w-4 h-4" />}
            {n.type === 'order' && <UtensilsCrossed className="w-4 h-4" />}
            {n.type === 'bill' && <Receipt className="w-4 h-4" />}
            {n.type === 'robot' && <Bot className="w-4 h-4" />}
            {n.type === 'info' && <Info className="w-4 h-4" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-900 truncate">{n.title}</h4>
              <span className="text-[10px] text-slate-600 flex-shrink-0">{n.time}</span>
            </div>
            <p className="text-xs text-slate-700 mt-0.5 line-clamp-2">{n.message}</p>
          </div>

          <button
            onClick={() => dismissNotification(n.id)}
            className="text-slate-500 hover:text-slate-800 p-1 rounded-md transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
