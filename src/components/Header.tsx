import React from 'react';
import { Shield, Cloud, CloudCheck, Wifi, ExternalLink } from 'lucide-react';
import { SilocomLogo } from './SilocomLogo';
import { LiveClock } from './LiveClock';
import { PWAInstallButton } from './PWAInstallButton';
import { OfficeConfig } from '../types';

interface HeaderProps {
  config: OfficeConfig;
  onOpenAdmin: () => void;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ config, onOpenAdmin, isSyncing }) => {
  const isSheetsConnected = Boolean(config.googleAppsScriptUrl?.trim() || config.googleSheetId?.trim());

  return (
    <header className="w-full border-b border-[#1e293b] bg-[#0b1326]/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        {/* Silocom Wordmark Logo */}
        <div className="flex items-center gap-3">
          <SilocomLogo size="sm" showRif={true} className="items-start text-left" />
        </div>

        {/* Live Clock (Hidden on very small screens, displayed in main area) */}
        <div className="hidden md:block">
          <LiveClock config={config} />
        </div>

        {/* Right Actions: Install PWA, Sync Status and Admin Trigger */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* PWA Install Button (if available) */}
          <PWAInstallButton />

          {/* Sheets Live Sync Badge */}
          <div
            title={
              isSheetsConnected
                ? 'Conectado con archivo base de Google Sheets en tiempo real'
                : 'Configura el ID de Sheet o URL de Apps Script en Admin'
            }
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border ${
              isSheetsConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            <Cloud className={`w-3 h-3 ${isSyncing ? 'animate-pulse text-sky-400' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : isSheetsConnected ? 'Sheets en Vivo' : 'Sin Configurar'}</span>
          </div>

          {/* Admin Button */}
          <button
            type="button"
            onClick={onOpenAdmin}
            title="Panel de Administración y Auditoría"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#131c2e] hover:bg-[#1e293b] border border-[#334155] text-slate-300 hover:text-white transition-all text-xs font-mono font-bold shadow-sm active:scale-95 cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Admin</span>
          </button>
        </div>
      </div>

      {/* Mobile Clock Row */}
      <div className="md:hidden mt-3 pt-2 border-t border-slate-800/60 flex justify-center">
        <LiveClock config={config} />
      </div>
    </header>
  );
};
