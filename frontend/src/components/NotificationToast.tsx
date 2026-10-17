import React from 'react';
import { useSocket, ToastNotification } from '../context/SocketContext';
import { Bell, UtensilsCrossed, Receipt, Bot, Info, X } from 'lucide-react';

export const NotificationToasts: React.FC = () => {
  const { notifications, dismissNotification } = useSocket();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-24 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="pointer-events-auto bg-white border-2 border-borderLine rounded-2xl shadow-ticket-hover p-4 flex items-start gap-3 transition-all transform animate-in slide-in-from-top-2 duration-200"
        >
          <div className={`p-2 rounded-xl flex-shrink-0 ${
            n.type === 'request' ? 'bg-terracotta-light text-terracotta-dark' :
            n.type === 'order' ? 'bg-amber-light text-amber-dark' :
            n.type === 'bill' ? 'bg-forest-100 text-forest-800' :
            n.type === 'robot' ? 'bg-lime-light text-forest-900 border border-lime-accent' :
            'bg-surface-warm text-ink-primary'
          }`}>
            {n.type === 'request' && <Bell className="w-5 h-5" />}
            {n.type === 'order' && <UtensilsCrossed className="w-5 h-5" />}
            {n.type === 'bill' && <Receipt className="w-5 h-5" />}
            {n.type === 'robot' && <Bot className="w-5 h-5" />}
            {n.type === 'info' && <Info className="w-5 h-5" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-ink-primary truncate font-sans">{n.title}</h4>
              <span className="text-[10px] font-mono font-bold text-ink-secondary flex-shrink-0">{n.time}</span>
            </div>
            <p className="text-xs text-ink-secondary mt-0.5 line-clamp-2">{n.message}</p>
          </div>

          <button
            onClick={() => dismissNotification(n.id)}
            className="text-ink-muted hover:text-ink-primary p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
