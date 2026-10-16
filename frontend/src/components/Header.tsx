import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import {
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  Clock,
  Sparkles,
  Bot,
  Radio,
  Cpu
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebar?: () => void;
  robotLocation?: string;
  isRobotOnline?: boolean;
  onOpenSimulator: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  robotLocation = 'T04',
  isRobotOnline = true,
  onOpenSimulator
}) => {
  const { isConnected, soundMuted, toggleSound } = useSocket();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-[#0B132B]/90 backdrop-blur-md border-b border-cyan-500/20 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-lg shadow-black/40">
      {/* Left: Branding & Single Robot Status Badge */}
      <div className="flex items-center gap-3 sm:gap-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-400 text-black flex items-center justify-center font-black shadow-md shadow-cyan-500/30">
            <Bot className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-wider bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent uppercase font-mono">
                DineAssist
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                XiaoZhi IoT
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono tracking-tight">
              Single-Robot Smart Dining Assistant
            </p>
          </div>
        </div>

        {/* Live Robot HUD Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-cyan-500/25">
          <span className={`w-2 h-2 rounded-full ${isRobotOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
          <span className="text-xs font-semibold text-slate-200">
            XiaoZhi Rover:
          </span>
          <span className="text-xs font-mono font-bold text-cyan-300">
            {isRobotOnline ? 'CONNECTED' : 'OFFLINE'}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-[11px] text-slate-400">At</span>
          <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
            {robotLocation}
          </span>

          {/* Voice Wave Visualizer */}
          {isRobotOnline && (
            <div className="flex items-center gap-0.5 ml-2 h-4">
              <span className="w-1 bg-cyan-400 rounded-full wave-1"></span>
              <span className="w-1 bg-cyan-400 rounded-full wave-2"></span>
              <span className="w-1 bg-cyan-400 rounded-full wave-3"></span>
              <span className="w-1 bg-cyan-400 rounded-full wave-4"></span>
              <span className="w-1 bg-cyan-400 rounded-full wave-5"></span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Audio Toggle, Clock, Simulator Button, Gateway Status */}
      <div className="flex items-center gap-3">
        {/* Clock */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-black/40 px-2.5 py-1.5 rounded-lg border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{currentTime}</span>
        </div>

        {/* Sound Toggle */}
        <button
          onClick={toggleSound}
          className={`p-2 rounded-xl border transition-all ${
            soundMuted
              ? 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
              : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20'
          }`}
          title={soundMuted ? 'Muted. Click to enable audio chime.' : 'Audio chime enabled. Click to mute.'}
        >
          {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Quick Simulator Trigger */}
        <button
          onClick={onOpenSimulator}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 hover:brightness-110 active:scale-95 transition shadow-md shadow-cyan-500/20"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Robot Voice Sim</span>
        </button>

        {/* Gateway Connection Indicator */}
        <div className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800">
          {isConnected ? (
            <>
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-semibold hidden lg:inline">LIVE</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-rose-400" />
              <span className="text-rose-400 font-semibold hidden lg:inline">DISCONNECTED</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
