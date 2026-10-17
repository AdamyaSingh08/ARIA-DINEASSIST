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
          className="pointer-events-auto bg-white border border-borderLine rounded-lg shadow-lg p-3 flex items-start gap-3 transition-all transform animate-in slide-in-from-top-2 duration-200"
        >
          <div className={`p-1.5 rounded flex-shrink-0 ${
            n.type === 'request' ? 'bg-amber-100 text-amber-800' :
            n.type === 'order' ? 'bg-forest-100 text-forest-900' :
            n.type === 'bill' ? 'bg-sage-100 text-forest-900' :
            n.type === 'robot' ? 'bg-forest-800 text-citrus' :
            'bg-ivory text-charcoal'
          }`}>
            {n.type === 'request' && <Bell className="w-4 h-4" />}
            {n.type === 'order' && <UtensilsCrossed className="w-4 h-4" />}
            {n.type === 'bill' && <Receipt className="w-4 h-4" />}
            {n.type === 'robot' && <Bot className="w-4 h-4" />}
            {n.type === 'info' && <Info className="w-4 h-4" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold text-charcoal truncate">{n.title}</h4>
              <span className="text-[10px] font-mono text-muted flex-shrink-0">{n.time}</span>
            </div>
            <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.message}</p>
          </div>

          <button
            onClick={() => dismissNotification(n.id)}
            className="text-muted hover:text-charcoal p-1 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
