import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import {
  Volume2,
  VolumeX,
  Clock,
  Sparkles,
  Sliders,
  Menu,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';

interface HeaderProps {
  pageTitle: string;
  pageSubtitle?: string;
  onToggleSidebar?: () => void;
  robotLocation?: string;
  isRobotOnline?: boolean;
  onOpenDeviceSetup: () => void;
  onOpenSimulator: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  pageTitle,
  pageSubtitle,
  onToggleSidebar,
  robotLocation = 'T04',
  isRobotOnline = true,
  onOpenDeviceSetup,
  onOpenSimulator
}) => {
  const { soundMuted, toggleSound, socket } = useSocket();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [mcpStatus, setMcpStatus] = useState<string>('not_configured');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);

  const fetchStatus = async () => {
    try {
      const [xiaozhiRes, settingsRes] = await Promise.all([
        api.getXiaozhiStatus().catch(() => null),
        api.getSettings().catch(() => null)
      ]);

      if (xiaozhiRes) {
        setMcpStatus(xiaozhiRes.status);
      }
      if (settingsRes && settingsRes.demo_mode !== undefined) {
        setIsDemoMode(settingsRes.demo_mode === 'true');
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Truthful Status Indicator
  const renderConnectionPill = () => {
    if (mcpStatus === 'connected') {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-completed-light border border-completed/40 text-completed-dark font-mono text-xs font-bold shadow-xs">
          <span className="w-2 h-2 rounded-full bg-completed-dark beacon-pulse" />
          <span>XIAOZHI MCP: CONNECTED</span>
        </div>
      );
    }
    if (mcpStatus === 'connecting') {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-light border border-amber/40 text-amber-dark font-mono text-xs font-bold">
          <RefreshCw className="w-3 h-3 animate-spin text-amber" />
          <span>XIAOZHI: CONNECTING</span>
        </div>
      );
    }
    if (mcpStatus === 'disconnected') {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-terracotta-light border border-terracotta/40 text-terracotta-dark font-mono text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-terracotta" />
          <span>XIAOZHI: DISCONNECTED</span>
        </div>
      );
    }
    // Default when no physical MCP URL is configured
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-warm border border-borderLine text-ink-secondary font-mono text-xs font-semibold">
        <span className="w-2 h-2 rounded-full bg-lime-accent border border-forest-800" />
        <span>{isDemoMode ? 'DEMO MODE' : 'NOT CONFIGURED'}</span>
      </div>
    );
  };

  return (
    <header className="h-20 bg-white border-b border-borderLine px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-ticket">
      {/* Left: Mobile Menu & Screen Hierarchy */}
      <div className="flex items-center gap-3.5">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 -ml-2 rounded-lg text-ink-primary hover:bg-warmBg lg:hidden"
            title="Toggle Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}

        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-primary leading-tight font-sans">
            {pageTitle}
          </h1>
          {pageSubtitle && (
            <p className="text-xs text-ink-secondary hidden sm:block mt-0.5">
              {pageSubtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: Operational Status & Quick Actions */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Clock Context */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-ink-secondary bg-warmBg px-3 py-1.5 rounded-lg border border-borderLine">
          <Clock className="w-3.5 h-3.5 text-forest-700" />
          <span className="text-ink-primary font-bold">{currentTime}</span>
          <span className="text-borderLine">|</span>
          <span>{currentDate}</span>
        </div>

        {/* Truthful Connection Pill */}
        <button
          onClick={onOpenDeviceSetup}
          className="focus:outline-hidden hover:opacity-90 transition-opacity"
          title="Click to view XiaoZhi connection diagnostics"
        >
          {renderConnectionPill()}
        </button>

        {/* Device Setup Button */}
        <button
          onClick={onOpenDeviceSetup}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-warm hover:bg-warmBg text-ink-primary border border-borderLine text-xs font-bold transition shadow-xs min-h-[44px]"
          title="Configure XiaoZhi Robot and MCP Integration"
        >
          <Sliders className="w-4 h-4 text-forest-800" />
          <span className="hidden md:inline">Device Setup</span>
        </button>

        {/* Demo Simulator Drawer Button */}
        <button
          onClick={onOpenSimulator}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-lime-light hover:bg-lime-accent/40 text-forest-900 border border-lime-accent text-xs font-bold transition shadow-xs min-h-[44px]"
          title="Open table voice trigger simulator"
        >
          <Sparkles className="w-4 h-4 text-forest-800" />
          <span className="hidden sm:inline">Simulate Event</span>
        </button>

        {/* Chime Mute Button */}
        <button
          onClick={toggleSound}
          className={`p-2.5 rounded-lg border transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
            soundMuted
              ? 'bg-surface-warm text-ink-muted border-borderLine hover:text-ink-primary'
              : 'bg-forest-100 text-forest-800 border-forest-600/30 hover:bg-forest-100'
          }`}
          title={soundMuted ? 'Audio chime muted. Click to enable alerts.' : 'Chime enabled. Click to mute.'}
        >
          {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
