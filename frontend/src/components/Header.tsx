import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import {
  Volume2,
  VolumeX,
  Clock,
  Sparkles,
  Bot,
  Menu
} from 'lucide-react';

interface HeaderProps {
  pageTitle: string;
  pageSubtitle?: string;
  onToggleSidebar?: () => void;
  restaurantName?: string;
  robotLocation?: string;
  isRobotOnline?: boolean;
  onToggleSimulator: () => void;
  isSimulatorOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  pageTitle,
  pageSubtitle,
  onToggleSidebar,
  restaurantName = 'ARIA Dining Room',
  robotLocation = 'T04',
  isRobotOnline = true,
  onToggleSimulator,
  isSimulatorOpen
}) => {
  const { soundMuted, toggleSound } = useSocket();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-borderLine px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-subtle">
      {/* Left: Mobile Toggle & Page Context */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 -ml-1.5 rounded-md text-charcoal hover:bg-ivory lg:hidden"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div>
          <h1 className="text-base sm:text-lg font-serif font-normal text-charcoal leading-tight">
            {pageTitle}
          </h1>
          {pageSubtitle && (
            <p className="text-[11px] text-muted hidden sm:block">
              {pageSubtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: Operational Controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Date & Time Context */}
        <div className="hidden md:flex items-center gap-2 text-xs font-mono text-muted bg-ivory px-2.5 py-1 rounded-md border border-borderLine">
          <Clock className="w-3.5 h-3.5 text-muted" />
          <span className="text-charcoal font-medium">{currentTime}</span>
          <span className="text-borderLine">·</span>
          <span>{currentDate}</span>
        </div>

        {/* Robot Hardware Status Indicator */}
        <div className="flex items-center gap-2 text-xs font-mono bg-ivory px-2.5 py-1 rounded-md border border-borderLine">
          <span className={`w-2 h-2 rounded-full ${isRobotOnline ? 'bg-forest-800' : 'bg-terracotta'}`} />
          <span className="text-charcoal font-medium hidden sm:inline">ARIA:</span>
          <span className="text-forest-800 font-medium">Table {robotLocation}</span>
        </div>

        {/* Notification Sound Mute Toggle */}
        <button
          onClick={toggleSound}
          className={`p-1.5 rounded-md border transition-colors ${
            soundMuted
              ? 'bg-ivory text-muted border-borderLine hover:text-charcoal'
              : 'bg-sage-100 text-forest-800 border-sage-300 hover:bg-sage-200'
          }`}
          title={soundMuted ? 'Muted. Click to enable audio chime.' : 'Audio chime enabled. Click to mute.'}
        >
          {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Robot Event Simulator Button */}
        <button
          onClick={onToggleSimulator}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            isSimulatorOpen
              ? 'bg-forest-800 text-white border-forest-800 shadow-xs'
              : 'bg-white text-forest-800 border-borderLine hover:bg-ivory'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-citrus" />
          <span className="hidden sm:inline">Test Robot Event</span>
        </button>
      </div>
    </header>
  );
};
