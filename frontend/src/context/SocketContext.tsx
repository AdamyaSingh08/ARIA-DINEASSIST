import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { soundService } from '../services/sound';

export interface ToastNotification {
  id: string;
  type: 'request' | 'order' | 'bill' | 'robot' | 'info';
  title: string;
  message: string;
  time: string;
}

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  soundMuted: boolean;
  toggleSound: () => void;
  notifications: ToastNotification[];
  dismissNotification: (id: string) => void;
  triggerSoundAlert: (type: 'request' | 'order' | 'bill') => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  soundMuted: false,
  toggleSound: () => {},
  notifications: [],
  dismissNotification: () => {},
  triggerSoundAlert: () => {},
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [soundMuted, setSoundMuted] = useState<boolean>(soundService.getMuted());
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addNotification = useCallback((notif: Omit<ToastNotification, 'id' | 'time'>) => {
    const id = 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
    const newNotif: ToastNotification = {
      ...notif,
      id,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    setNotifications(prev => [newNotif, ...prev.slice(0, 4)]);

    // Auto dismiss after 6 seconds
    setTimeout(() => {
      dismissNotification(id);
    }, 6000);
  }, [dismissNotification]);

  const toggleSound = useCallback(() => {
    const next = soundService.toggleMute();
    setSoundMuted(next);
  }, []);

  const triggerSoundAlert = useCallback((type: 'request' | 'order' | 'bill') => {
    soundService.playAlert(type);
  }, []);

  useEffect(() => {
    // Connect to Socket.IO using origin (routed through Vite proxy in dev, or same host in prod)
    const newSocket = io(window.location.origin, {
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected to DineAssist gateway');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.warn('[Socket] Disconnected from gateway');
      setIsConnected(false);
    });

    // Real-time Event Listeners
    newSocket.on('request.created', (data: any) => {
      soundService.playAlert('request');
      addNotification({
        type: 'request',
        title: `New Service Request: ${data.request_type ? data.request_type.toUpperCase() : 'WATER'}`,
        message: `${data.table_id || 'Table'} — ${data.message || 'Requires assistance'}`
      });
    });

    newSocket.on('order.created', (data: any) => {
      soundService.playAlert('order');
      addNotification({
        type: 'order',
        title: `New Kitchen Order: #${data.id}`,
        message: `${data.table_id || 'Table'} — ${data.items ? data.items.length : 1} item(s) (₹${data.subtotal})`
      });
    });

    newSocket.on('bill.created', (data: any) => {
      soundService.playAlert('bill');
      addNotification({
        type: 'bill',
        title: `Bill Generated: ${data.invoice_number}`,
        message: `${data.table_id || 'Table'} — Total payable: ₹${data.final_amount}`
      });
    });

    newSocket.on('robot.status', (data: any) => {
      if (data.status === 'offline') {
        addNotification({
          type: 'robot',
          title: `Robot Offline: ${data.name || data.id}`,
          message: `Robot has disconnected or timed out.`
        });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [addNotification]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        soundMuted,
        toggleSound,
        notifications,
        dismissNotification,
        triggerSoundAlert
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
