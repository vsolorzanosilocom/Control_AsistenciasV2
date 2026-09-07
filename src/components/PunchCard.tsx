import React, { useState, useEffect } from 'react';
import {
  LogIn,
  LogOut,
  User,
  Fingerprint,
  Sparkles,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Clock,
  History,
} from 'lucide-react';
import { GPSPosition, OfficeConfig, RegistroTipo, AsistenciaRecord } from '../types';
import { StorageService } from '../services/storage';
import { SheetsSyncService } from '../services/sheetsSync';
import { getDeviceId } from '../utils/device';
import { ModalData } from './FeedbackModal';

interface PunchCardProps {
  config: OfficeConfig;
  currentPosition: GPSPosition | null;
  onRecordAdded: (record: AsistenciaRecord) => void;
  onShowModal: (modal: ModalData) => void;
}

export const PunchCard: React.FC<PunchCardProps> = ({
  config,
  currentPosition,
  onRecordAdded,
  onShowModal,
}) => {
  const [userId, setUserId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [deviceId, setDeviceId] = useState<string>('');
  const [identifiedUser, setIdentifiedUser] = useState<any>(null);
  const [userStatusToday, setUserStatusToday] = useState<{
    tieneEntradaHoy: boolean;
    tieneSalidaHoy: boolean;
    horaEntradaHoy?: string;
    horaSalidaHoy?: string;
  } | null>(null);

  // Load last user ID & device ID
  useEffect(() => {
    const devId = getDeviceId();
    setDeviceId(devId);

    const lastUser = StorageService.getLastUserId();
    if (lastUser) {
      setUserId(lastUser);
      checkUserStatus(lastUser);
    }
  }, []);

  // Update status when userId changes
  const checkUserStatus = (id: string) => {
    if (!id.trim()) {
      setIdentifiedUser(null);
      setUserStatusToday(null);
      return;
    }

    const emp = StorageService.findEmpleado(id);
    setIdentifiedUser(emp || null);

    const status = StorageService.getEstadoHoy(id);
    setUserStatusToday(status);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUserId(val);
    checkUserStatus(val);
  };

  // Perform Clock-in (Entrada) or Clock-out (Salida)
  const handlePunch = async (tipo: RegistroTipo) => {
    const trimmedId = userId.trim();

    // 1. Validate ID entered
    if (!trimmedId) {
      onShowModal({
        isOpen: true,
        type: 'warning',
        title: 'Identificación Requerida',
        message: 'Por favor ingresa tu ID de usuario o correo corporativo para registrar la jornada.',
      });
      return;
    }

    // 2. Validate GPS signal
    if (!currentPosition) {
      onShowModal({
        isOpen: true,
        type: 'error',
        title: 'Señal GPS no disponible',
        message: 'No se detectaron coordenadas GPS. Activa la ubicación en tu dispositivo o pulsa "Probar en Sede" para pruebas.',
      });
      return;
    }

    // 3. Validate Geofence (<= 60 meters as per Codigo.gs)
    const maxMeters = Math.round(config.radioMaxKm * 1000);
    if (!currentPosition.isWithinRange) {
      onShowModal({
        isOpen: true,
        type: 'warning',
        title: 'Fuera del Perímetro de Silocom',
        message: `Te encuentras a ${currentPosition.distanceMetros} metros de la sede. Para registrar asistencia debes estar a menos de ${maxMeters}m.`,
        details: {
          distancia: currentPosition.distanceMetros,
        },
      });
      return;
    }

    setIsProcessing(true);

    try {
      // 4. Device Fingerprint validation
      const deviceCheck = StorageService.bindDispositivo(trimmedId, deviceId);
      if (!deviceCheck.success) {
        setIsProcessing(false);
        onShowModal({
          isOpen: true,
          type: 'device_alert',
          title: 'Dispositivo no Autorizado',
          message: deviceCheck.message,
          details: {
            dispositivo: deviceId,
          },
        });
        return;
      }

      // 5. Generate formatted Caracas timestamp (dd/MM/yyyy HH:mm:ss)
      const now = new Date();
      const caracasDate = new Date(
        now.toLocaleString('en-US', { timeZone: 'America/Caracas' })
      );

      const pad = (n: number) => (n < 10 ? '0' + n : n);
      const diaStr = pad(caracasDate.getDate()).toString();
      const meses = [
        'enero',
        'febrero',
        'marzo',
        'abril',
        'mayo',
        'junio',
        'julio',
        'agosto',
        'septiembre',
        'octubre',
        'noviembre',
        'diciembre',
      ];
      const mesStr = meses[caracasDate.getMonth()];

      const fechaHoraStr = `${diaStr}/${pad(
        caracasDate.getMonth() + 1
      )}/${caracasDate.getFullYear()} ${pad(caracasDate.getHours())}:${pad(
        caracasDate.getMinutes()
      )}:${pad(caracasDate.getSeconds())}`;

      const coordsStr = `${currentPosition.lat.toFixed(6)}, ${currentPosition.lng.toFixed(6)}`;
      const estadoStr = `DENTRO DE RANGO (${currentPosition.distanceMetros}m)`;

      const emp = StorageService.findEmpleado(trimmedId);
      const nombreEmpleado =
        emp?.nombre ||
        (trimmedId.includes('@')
          ? trimmedId.split('@')[0].replace('.', ' ').toUpperCase()
          : trimmedId.toUpperCase());

      const nuevoRegistro: AsistenciaRecord = {
        id: trimmedId,
        nombre: nombreEmpleado,
        tipo: tipo,
        fechaHora: fechaHoraStr,
        ubicacion: coordsStr,
        estado: estadoStr,
        dia: diaStr,
        mes: mesStr,
        idDispositivo: deviceId,
        timestamp: Date.now(),
      };

      // Save locally
      StorageService.saveRegistro(nuevoRegistro);
      onRecordAdded(nuevoRegistro);

      // 6. Synchronize with Google Sheets via Apps Script Web App
      const syncResult = await SheetsSyncService.registrarEnGoogleSheets(config, {
        id: trimmedId,
        tipo: tipo,
        idDispositivo: deviceId,
        lat: currentPosition.lat,
        lng: currentPosition.lng,
        nombre: nombreEmpleado,
      });

      // Clear input ID and employee status to leave screen 100% clean for next user
      setUserId('');
      setIdentifiedUser(null);
      setUserStatusToday(null);

      // Play subtle confirmation vibration if supported
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 60, 40]);
      }

      setIsProcessing(false);

      // Display Success Modal
      onShowModal({
        isOpen: true,
        type: 'success',
        title: `¡Marcaje de ${tipo} Exitoso!`,
        message: `Tu registro de ${tipo.toLowerCase()} ha sido validado satisfactoriamente y respaldado en tiempo real.`,
        details: {
          empleado: nombreEmpleado,
          tipo: tipo,
          hora: fechaHoraStr,
          distancia: currentPosition.distanceMetros,
          dispositivo: deviceId,
          syncStatus: syncResult.message,
        },
      });
    } catch (err: any) {
      setIsProcessing(false);
      onShowModal({
        isOpen: true,
        type: 'error',
        title: 'Error de Procesamiento',
        message: err.message || 'Ocurrió un error inesperado al procesar el registro.',
      });
    }
  };

  return (
    <div className="w-full rounded-3xl bg-[#0f172a] border border-[#334155] p-5 sm:p-6 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.5)] relative overflow-hidden">
      {/* Top micro-accent line as described in DESIGN.md */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-sky-500 to-emerald-500" />

      {/* Form Title & Scanner Notice */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-5 h-5 text-sky-400" />
          <h2 className="font-display text-sm sm:text-base font-bold text-white tracking-wide uppercase">
            Marcaje de Asistencia
          </h2>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#131c2e] border border-slate-700/60 text-[10px] font-mono text-slate-400">
          <Smartphone className="w-3 h-3 text-emerald-400" />
          <span className="truncate max-w-[100px]">{deviceId}</span>
        </div>
      </div>

      {/* User Input Group */}
      <div className="space-y-2 mb-5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="userIdInput"
            className="text-[11px] font-mono font-bold tracking-wider text-slate-300 uppercase"
          >
            ID / USUARIO CORPORATIVO
          </label>
          {identifiedUser && (
            <span className="text-[11px] font-semibold text-emerald-400 truncate max-w-[180px]">
              ✓ {identifiedUser.nombre}
            </span>
          )}
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <User className="w-5 h-5 text-slate-400" />
          </div>
          <input
            id="userIdInput"
            type="text"
            value={userId}
            onChange={handleInputChange}
            placeholder="ej. vsolorzano.silocom@gmail.com o V-12345678"
            disabled={isProcessing}
            className="w-full h-14 pl-11 pr-4 rounded-2xl bg-[#131c2e] border-2 border-[#334155] text-white placeholder-slate-500 font-mono text-sm sm:text-base font-semibold outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/20 shadow-inner"
          />
        </div>
      </div>

      {/* User Current Shift Telemetry Status */}
      {userStatusToday && (
        <div className="mb-5 rounded-2xl bg-[#131c2e] border border-slate-800 p-3 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <span className="text-slate-400">Jornada de Hoy:</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                userStatusToday.tieneEntradaHoy
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {userStatusToday.tieneEntradaHoy
                ? `Entrada: ${userStatusToday.horaEntradaHoy}`
                : 'Sin Entrada'}
            </span>

            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                userStatusToday.tieneSalidaHoy
                  ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {userStatusToday.tieneSalidaHoy
                ? `Salida: ${userStatusToday.horaSalidaHoy}`
                : 'Sin Salida'}
            </span>
          </div>
        </div>
      )}

      {/* Processing Biometric Pulse Indicator (Mandated by DESIGN.md) */}
      {isProcessing && (
        <div className="mb-5 rounded-2xl bg-sky-950/40 border border-sky-500/50 p-3.5 text-center flex items-center justify-center gap-3 animate-pulse">
          <div className="w-3 h-3 rounded-full bg-sky-400 animate-ping" />
          <span className="font-mono text-xs font-bold text-sky-300 uppercase tracking-wider">
            Validando Geocerca y Transmitiendo a Google Sheets...
          </span>
        </div>
      )}

      {/* Primary Action Buttons: ENTRADA & SALIDA */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* Botón Entrada */}
        <button
          type="button"
          onClick={() => handlePunch('ENTRADA')}
          disabled={isProcessing}
          className="relative group h-20 rounded-2xl bg-gradient-to-b from-[#10b981] to-[#059669] text-[#090d16] font-display font-extrabold flex flex-col items-center justify-center gap-1 shadow-[0_4px_20px_rgba(16,185,129,0.35)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] hover:brightness-110 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <div className="flex items-center gap-1.5 text-sm sm:text-base tracking-wider uppercase">
            <LogIn className="w-5 h-5 text-[#090d16] stroke-[2.5]" />
            <span>🟢 ENTRADA</span>
          </div>
          <span className="text-[11px] font-body font-semibold text-[#003824] tracking-tight">
            Iniciar Jornada
          </span>
        </button>

        {/* Botón Salida */}
        <button
          type="button"
          onClick={() => handlePunch('SALIDA')}
          disabled={isProcessing}
          className="relative group h-20 rounded-2xl bg-gradient-to-b from-[#0284c7] to-[#0369a1] text-white font-display font-extrabold flex flex-col items-center justify-center gap-1 shadow-[0_4px_20px_rgba(2,132,199,0.35)] hover:shadow-[0_0_25px_rgba(56,189,248,0.6)] hover:brightness-110 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <div className="flex items-center gap-1.5 text-sm sm:text-base tracking-wider uppercase">
            <LogOut className="w-5 h-5 text-white stroke-[2.5]" />
            <span>🔵 SALIDA</span>
          </div>
          <span className="text-[11px] font-body font-semibold text-sky-100 tracking-tight">
            Finalizar Jornada
          </span>
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>Radio de Seguridad: {Math.round(config.radioMaxKm * 1000)}m</span>
        </div>
        <span>Silocom Telemetry v2.4</span>
      </div>
    </div>
  );
};
