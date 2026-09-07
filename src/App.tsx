import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { SilocomLogo } from './components/SilocomLogo';
import { GPSIndicator } from './components/GPSIndicator';
import { PunchCard } from './components/PunchCard';
import { FeedbackModal, ModalData } from './components/FeedbackModal';
import { AdminModal } from './components/AdminModal';
import { StorageService } from './services/storage';
import { SheetsSyncService } from './services/sheetsSync';
import { AsistenciaRecord, GPSPosition, OfficeConfig } from './types';
import { ShieldCheck, Cloud, RefreshCw } from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<OfficeConfig>(StorageService.getConfig());
  const [records, setRecords] = useState<AsistenciaRecord[]>(
    StorageService.getRegistros()
  );
  const [currentPosition, setCurrentPosition] = useState<GPSPosition | null>(
    null
  );
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [isSimulationActive, setIsSimulationActive] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusText, setSyncStatusText] = useState<string>('');
  const [modalData, setModalData] = useState<ModalData>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  // Lectura en TIEMPO REAL del archivo base (Google Sheets) y ubicación dinámica en SEGUNDO PLANO
  const syncFromCloud = useCallback(async (currentCfg: OfficeConfig) => {
    setIsSyncing(true);
    try {
      // 1. Leer ubicación de oficina de manera dinámica / segundo plano
      const geoDinamica = await SheetsSyncService.leerUbicacionOficinaDinamica(currentCfg);
      if (geoDinamica) {
        setConfig((prev) => ({
          ...prev,
          ...geoDinamica,
        }));
      }

      // 2. Leer registros y empleados en tiempo real desde el archivo base
      const cloudData = await SheetsSyncService.leerArchivoBaseEnTiempoReal(currentCfg);
      if (cloudData.success) {
        if (cloudData.registros && cloudData.registros.length > 0) {
          setRecords(cloudData.registros);
          StorageService.setRegistros(cloudData.registros);
        }
        if (cloudData.empleados && cloudData.empleados.length > 0) {
          StorageService.setEmpleados(cloudData.empleados);
        }
        if (cloudData.config) {
          setConfig((prev) => ({
            ...prev,
            ...cloudData.config,
          }));
        }
        setSyncStatusText(cloudData.message);
      }
    } catch (err) {
      console.warn('Sincronización en segundo plano:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Cargar al montar la aplicación
  useEffect(() => {
    syncFromCloud(config);
  }, [syncFromCloud]);

  const handleRecordAdded = (newRecord: AsistenciaRecord) => {
    setRecords((prev) => [newRecord, ...prev]);
    StorageService.saveRegistro(newRecord);
    // Disparar sincronización para reflejar el estado más reciente
    setTimeout(() => syncFromCloud(config), 1500);
  };

  const handleRefreshRecords = () => {
    syncFromCloud(config);
  };

  const handleUpdateConfig = (newConfig: OfficeConfig) => {
    setConfig(newConfig);
    StorageService.saveConfig(newConfig);
    syncFromCloud(newConfig);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-[#f8fafc] flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Top Corporate Navigation Bar */}
      <Header
        config={config}
        onOpenAdmin={() => setIsAdminOpen(true)}
        isSyncing={isSyncing}
      />

      {/* Main Operational Container - Centrado exclusivamente en el registro de empleados */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6 sm:py-8 flex flex-col items-center gap-5">
        {/* Silocom Center Hero Header */}
        <div className="w-full flex flex-col items-center text-center pt-1">
          <SilocomLogo size="lg" showRif={true} />
          <h1 className="sr-only">Silocom - Control de Asistencia</h1>
          <p className="font-mono text-xs text-slate-400 mt-2 font-medium">
            Terminal Inteligente de Registro de Jornada Laboral
          </p>
        </div>

        {/* Live GPS & Geofencing Radar Indicator */}
        <div className="w-full">
          <GPSIndicator
            config={config}
            onPositionUpdate={setCurrentPosition}
            simulationActive={isSimulationActive}
          />
        </div>

        {/* Primary Attendance Punch Card (ENTRADA & SALIDA) */}
        <div className="w-full">
          <PunchCard
            config={config}
            currentPosition={currentPosition}
            onRecordAdded={handleRecordAdded}
            onShowModal={setModalData}
          />
        </div>

        {/* Estado sutil de sincronización en tiempo real con Google Sheets */}
        <div className="w-full flex items-center justify-between px-2 text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0" />
            <span className="truncate">
              {isSyncing
                ? 'Leyendo archivo base en tiempo real...'
                : syncStatusText || 'Sincronización satelital activa'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => syncFromCloud(config)}
            disabled={isSyncing}
            title="Recargar datos desde Google Sheets"
            className="flex items-center gap-1 text-sky-400 hover:text-sky-300 hover:underline cursor-pointer shrink-0 ml-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sincronizar Sheets</span>
          </button>
        </div>
      </main>

      {/* Corporate Footer */}
      <footer className="w-full border-t border-[#1e293b] bg-[#0b1326] py-6 px-4 text-center mt-auto">
        <div className="max-w-lg mx-auto space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
            <span className="font-bold text-slate-300">SILOCOM C.A.</span>
            <span>•</span>
            <span>RIF: J-30725192-1</span>
            <span>•</span>
            <span className="text-emerald-400">Caracas, Venezuela</span>
          </div>

          <p className="text-[11px] font-mono text-slate-500">
            Geofencing Activo • Sincronizado en Tiempo Real con Google Drive
          </p>

          <div className="pt-2 flex items-center justify-center gap-4 text-[10px] font-mono text-slate-400">
            <button
              type="button"
              onClick={() => setIsAdminOpen(true)}
              className="text-sky-400 hover:text-sky-300 hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Acceso Administrador</span>
            </button>
            <span>•</span>
            <span className="text-slate-500">PWA / Vercel Ready</span>
          </div>
        </div>
      </footer>

      {/* Action Feedback Modal */}
      <FeedbackModal
        data={modalData}
        onClose={() => setModalData((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Administrative and Audit Modal */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        config={config}
        onUpdateConfig={handleUpdateConfig}
        records={records}
        onRefreshRecords={handleRefreshRecords}
        simulationActive={isSimulationActive}
        onToggleSimulation={() => setIsSimulationActive((prev) => !prev)}
      />
    </div>
  );
}
