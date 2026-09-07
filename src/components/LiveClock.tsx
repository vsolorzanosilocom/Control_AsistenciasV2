import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, Calendar } from 'lucide-react';
import { OfficeConfig } from '../types';

interface LiveClockProps {
  config: OfficeConfig;
}

export const LiveClock: React.FC<LiveClockProps> = ({ config }) => {
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format date in America/Caracas timezone
  const caracasOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Caracas',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  };

  const timeOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Caracas',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };

  const dateString = new Intl.DateTimeFormat('es-VE', caracasOptions)
    .format(time)
    .toUpperCase();
  const timeString = new Intl.DateTimeFormat('es-VE', timeOptions).format(time);

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Digital Monospaced Caracas Clock */}
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#131c2e] border border-[#334155] shadow-inner">
        <Clock className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
        <span className="font-mono text-xs font-semibold text-slate-300 tracking-wider">
          {dateString}
        </span>
        <span className="text-slate-600 font-bold">•</span>
        <span className="font-mono text-sm font-bold text-white tracking-widest">
          {timeString}
        </span>
      </div>
    </div>
  );
};
