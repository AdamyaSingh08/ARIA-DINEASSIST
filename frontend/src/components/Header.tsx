import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import {
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  Clock,
  Sparkles,
  Menu,
  ShieldCheck,
  Store
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  restaurantName: string;
  demoMode: boolean;
  onOpenDemoBar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  restaurantName,
  demoMode,
  onOpenDemoBar
}) => {
  const { isConnected, soundMuted, toggleSound } = useSocket();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
      {/* Left: Mobile Toggle & Restaurant Info */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-navy-900 text-white flex items-center justify-center font-bold text-base shadow-sm">
            <Store className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-navy-900 leading-none">
              {restaurantName || 'DineAssist'}
            </h1>
            <p className="text-[11px] text-teal-700 font-medium tracking-tight mt-0.5">
              Smart Restaurant Service System
            </p>
          </div>
        </div>

        {/* Demo Mode Badge */}
        {demoMode && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 ml-2">
            <Sparkles className="w-3 h-3 text-amber-500" />
            INNOTech Demo Mode
          </span>
        )}
      </div>

      {/* Right: Clock, Sound Toggle, Real-time Status */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Date & Time */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/70">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium text-slate-700">{currentTime}</span>
          <span className="text-slate-300">|</span>
          <span>{currentDate}</span>
        </div>

        {/* Sound Toggle */}
        <button
          onClick={toggleSound}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            soundMuted
              ? 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
              : 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
          }`}
          title={soundMuted ? 'Notification sounds are muted. Click to enable audio chime.' : 'Notification sounds enabled. Click to mute.'}
        >
          {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-teal-600" />}
          <span className="hidden sm:inline">{soundMuted ? 'Muted' : 'Sound On'}</span>
        </button>

        {/* Quick Demo Bar Trigger */}
        {onOpenDemoBar && (
          <button
            onClick={onOpenDemoBar}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-900 text-white rounded-lg text-xs font-semibold hover:bg-navy-800 transition shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Simulate Robot</span>
          </button>
        )}

        {/* WebSocket Connection Status */}
        <div className="flex items-center gap-1.5 pl-1 sm:pl-2">
          {isConnected ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Wifi className="w-3 h-3 text-emerald-600" />
              <span className="hidden lg:inline">Gateway Online</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <WifiOff className="w-3 h-3 text-rose-500" />
              <span className="hidden lg:inline">Reconnecting...</span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
