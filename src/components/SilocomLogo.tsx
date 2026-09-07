import React from 'react';

interface SilocomLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showRif?: boolean;
  className?: string;
}

export const SilocomLogo: React.FC<SilocomLogoProps> = ({
  size = 'md',
  showRif = true,
  className = '',
}) => {
  const sizeClasses = {
    sm: {
      text: 'text-2xl',
      dotSize: 'w-2 h-2',
      bodyWidth: 'w-2.5',
      bodyHeight: 'h-4',
      rif: 'text-[9px] tracking-[1.5px]',
    },
    md: {
      text: 'text-3xl sm:text-4xl',
      dotSize: 'w-2.5 h-2.5',
      bodyWidth: 'w-3 sm:w-3.5',
      bodyHeight: 'h-5 sm:h-6',
      rif: 'text-[10px] sm:text-[11px] tracking-[2px]',
    },
    lg: {
      text: 'text-4xl sm:text-5xl',
      dotSize: 'w-3 h-3',
      bodyWidth: 'w-4',
      bodyHeight: 'h-7',
      rif: 'text-xs sm:text-sm tracking-[2.5px]',
    },
  };

  const current = sizeClasses[size];

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* Silocom Wordmark with distinctive red cylinder 'i' */}
      <div className="flex items-center justify-center font-extrabold tracking-tight">
        <span
          className={`${current.text} font-display text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]`}
        >
          S
        </span>

        {/* Custom 3D styled 'i' matching corporate identity */}
        <div className="flex flex-col items-center mx-0.5 relative translate-y-0.5">
          {/* White Dot */}
          <span
            className={`${current.dotSize} rounded-full bg-gradient-to-b from-white to-slate-200 shadow-sm mb-[2px]`}
          />
          {/* Crimson Pill/Cylinder Body */}
          <span
            className={`${current.bodyWidth} ${current.bodyHeight} rounded-[4px] bg-gradient-to-b from-[#ef4444] via-[#dc2626] to-[#991b1b] shadow-[0_2px_6px_rgba(220,38,38,0.5)] border-t border-rose-300/40`}
          />
        </div>

        <span
          className={`${current.text} font-display text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]`}
        >
          locom
        </span>
      </div>

      {showRif && (
        <span
          className={`font-mono font-bold text-slate-400 mt-1 uppercase ${current.rif}`}
        >
          RIF: J-30725192-1
        </span>
      )}
    </div>
  );
};
