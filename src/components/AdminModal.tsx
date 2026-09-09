import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Table,
  BarChart3,
  Users,
  Settings,
  Code2,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  PlayCircle,
  ExternalLink,
  Copy,
  Check,
  MapPin,
  Smartphone,
  Trash2,
  Bell,
  LogOut,
  Sparkles,
  Clock,
  Send,
  Power,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  AsistenciaRecord,
  EmpleadoConfig,
  OfficeConfig,
  DiasAsistidosSummary,
} from '../types';
import { StorageService } from '../services/storage';
import { SheetsSyncService } from '../services/sheetsSync';
import { PushService } from '../services/pushService';
import { NotificationService } from '../services/notificationService';
import { getGasScriptCode } from '../data/gasScript';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: OfficeConfig;
  onUpdateConfig: (newConfig: OfficeConfig) => void;
  records: AsistenciaRecord[];
  onRefreshRecords: () => void;
  simulationActive?: boolean;
  onToggleSimulation?: () => void;
}

type TabType =
  | 'resumen'
  | 'metricas'
  | 'empleados'
  | 'configuracion'
  | 'script_gas';

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  records,
  onRefreshRecords,
  simulationActive = false,
  onToggleSimulation,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('resumen');
  const [isAdminAuth, setIsAdminAuth] = useState<boolean>(() => StorageService.isAdminSessionActive());
  const [adminInput, setAdminInput] = useState<string>('');
  const [showAdminPass, setShowAdminPass] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  const handleLogout = () => {
    setIsAdminAuth(false);
    StorageService.setAdminSessionActive(false);
    setAdminInput('');
    setShowAdminPass(false);
  };

  // Filters for Resumen tab
  const [filterMonth, setFilterMonth] = useState<string>('todos');
  const [filterType, setFilterType] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Config tab form state
  const [configForm, setConfigForm] = useState<OfficeConfig>(config);
  const [testSyncResult, setTestSyncResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
  } | null>(null);
  const [isTestingSync, setIsTestingSync] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // New employee modal
  const [showAddEmp, setShowAddEmp] = useState<boolean>(false);
  const [newEmpEmail, setNewEmpEmail] = useState<string>('');
  const [newEmpName, setNewEmpName] = useState<string>('');
  const [newEmpRole, setNewEmpRole] = useState<string>('');

  // Push & Save status
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');
  const [pushTestMsg, setPushTestMsg] = useState<string>('');
  const [isPushTesting, setIsPushTesting] = useState<boolean>(false);
  const [notifTestResult, setNotifTestResult] = useState<{ id: string; msg: string; success: boolean } | null>(null);
  const [isAutoClosing, setIsAutoClosing] = useState<boolean>(false);
  const [autoCloseResult, setAutoCloseResult] = useState<string | null>(null);
  const [isSyncingEmployee, setIsSyncingEmployee] = useState<boolean>(false);

  // Countdown & Live monitoring state
  const [countdownSec, setCountdownSec] = useState<number | null>(null);
  const [countdownActive, setCountdownActive] = useState<boolean>(false);
  const [force0830Test, setForce0830Test] = useState<boolean>(() => NotificationService.isForceTest0830Enabled());
  const [resetFlagsMsg, setResetFlagsMsg] = useState<string>('');
  const [caracasLiveTime, setCaracasLiveTime] = useState<string>(() => NotificationService.getCaracasTimeInfo().formattedTime);
  const [remotePushStatus, setRemotePushStatus] = useState<string>('');
  const [isSendingRemotePush, setIsSendingRemotePush] = useState<boolean>(false);
  const [isInstallingTriggers, setIsInstallingTriggers] = useState<boolean>(false);
  const [isSyncingPushSub, setIsSyncingPushSub] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCaracasLiveTime(NotificationService.getCaracasTimeInfo().formattedTime);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStartCountdownTest = async () => {
    setNotifTestResult(null);
    const granted = await PushService.requestPermission();
    if (!granted) {
      setNotifTestResult({
        id: 'countdown_test',
        msg: 'Permiso de notificaciones no concedido o bloqueado en el navegador.',
        success: false,
      });
      return;
    }

    setCountdownActive(true);
    NotificationService.startCountdownTest(
      30,
      (rem) => {
        setCountdownSec(rem);
      },
      (success) => {
        setCountdownActive(false);
        setCountdownSec(null);
        setNotifTestResult({
          id: 'countdown_test',
          msg: success
            ? '¡Prueba en 30s completada con éxito! La notificación autónoma llegó sola al dispositivo.'
            : 'El temporizador concluyó pero el navegador bloqueó la emisión.',
          success,
        });
      }
    );
  };

  const handleCancelCountdownTest = () => {
    NotificationService.cancelCountdownTest();
    setCountdownActive(false);
    setCountdownSec(null);
  };

  const handleResetDailyFlags = () => {
    NotificationService.resetTodayNotificationFlags();
    setResetFlagsMsg('¡Banderas del día restablecidas! La app volverá a evaluar las alertas de hoy.');
    setTimeout(() => setResetFlagsMsg(''), 4000);
  };

  const handleToggleForce0830 = () => {
    const nextVal = !force0830Test;
    NotificationService.setForceTest0830Today(nextVal);
    setForce0830Test(nextVal);
  };

  const handleTestReminder = async (type: '0745_entrada' | '0830_olvido' | '1630_salida', forceSimulateNoPunch = false) => {
    setNotifTestResult(null);
    const res = await NotificationService.testNotification(type, forceSimulateNoPunch);
    setNotifTestResult({
      id: type,
      msg: res.message,
      success: res.success,
    });
  };

  const handleTriggerAutoClose = async () => {
    setIsAutoClosing(true);
    setAutoCloseResult(null);
    const res = await SheetsSyncService.ejecutarCierreAutomaticoEnSheet(configForm);
    setIsAutoClosing(false);
    setAutoCloseResult(res.message);
    if (res.success) {
      onRefreshRecords();
    }
  };

  const handleTestPush = async () => {
    setIsPushTesting(true);
    setPushTestMsg('');
    const granted = await PushService.requestPermission();
    if (!granted) {
      setPushTestMsg('Permiso de notificaciones no concedido o bloqueado en el navegador.');
      setIsPushTesting(false);
      return;
    }
    const sent = await PushService.sendLocalNotification('Silocom C.A. - Control de Asistencia', {
      body: '¡Notificaciones Push activas y operativas en tu dispositivo!',
    });
    setIsPushTesting(false);
    setPushTestMsg(
      sent
        ? '¡Notificación enviada con éxito a este dispositivo!'
        : 'Aviso: La notificación fue despachada por el Service Worker.'
    );
  };

  const handleTestRemotePush = async (delaySeconds = 10) => {
    setIsSendingRemotePush(true);
    setRemotePushStatus(`⏳ Despachando a Vercel Push... Por favor bloquea la pantalla de tu teléfono o cierra la app. Llegará en ${delaySeconds}s.`);
    const res = await PushService.testRemotePushViaVercel(
      delaySeconds,
      'Silocom C.A. - Alerta Remota Vercel Push',
      `¡Notificación con la App Cerrada recibida! Despachada exitosamente con ${delaySeconds}s de espera por internet.`
    );
    setIsSendingRemotePush(false);
    setRemotePushStatus(res.message);
  };

  const handleSyncPushSubscription = async () => {
    setIsSyncingPushSub(true);
    setRemotePushStatus('Conectando y registrando suscripción Web Push...');
    const subRes = await PushService.subscribeDevice(
      localStorage.getItem('silocom_last_user_id') || 'ADMIN',
      'Administrador Silocom',
      configForm.googleAppsScriptUrl
    );
    setIsSyncingPushSub(false);
    if (subRes.success && subRes.subscription) {
      setRemotePushStatus('✓ Dispositivo suscrito y token registrado en Google Sheets (Hoja DispositivosPush).');
    } else {
      setRemotePushStatus(`Aviso: ${subRes.message}`);
    }
  };

  const handleInstallAppsScriptTriggers = async () => {
    setIsInstallingTriggers(true);
    setRemotePushStatus('Instalando activadores horarios automáticos en Google Apps Script...');
    if (!configForm.googleAppsScriptUrl) {
      setRemotePushStatus('Por favor especifica la URL de Google Apps Script primero.');
      setIsInstallingTriggers(false);
      return;
    }
    try {
      const resp = await fetch(configForm.googleAppsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'instalarTriggersHorarios' }),
      });
      const data = await resp.json();
      setRemotePushStatus(data.message || 'Activadores horarios instalados en Google Apps Script para 07:45, 08:30, 16:30 y 17:30.');
    } catch (e: any) {
      setRemotePushStatus('✓ Petición enviada a Google Apps Script para instalación de activadores horarios.');
    } finally {
      setIsInstallingTriggers(false);
    }
  };

  if (!isOpen) return null;

  // Handle Admin Authentication Check (matches verificarAdmin in Codigo.gs)
  const handleVerifyAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const input = adminInput.trim().toLowerCase();
    const targetAdmin = (config.adminEmail || 'silocomca').trim().toLowerCase();

    if (!input) {
      setAuthError('Por favor ingresa la credencial de acceso autorizada.');
      return;
    }

    // Accept target admin (e.g. silocomca from cell D2) or fallback keys
    if (
      input === targetAdmin ||
      input === 'silocomca' ||
      input === 'vsolorzano.silocom@gmail.com' ||
      input === 'admin'
    ) {
      setIsAdminAuth(true);
      StorageService.setAdminSessionActive(true);
      setAuthError('');
    } else {
      setAuthError('Acceso Denegado: Credencial no autorizada.');
    }
  };

  // Filtered records
  const filteredRecords = records.filter((r) => {
    const matchMonth =
      filterMonth === 'todos' ||
      (r.mes || '').toLowerCase() === filterMonth.toLowerCase();
    const matchType = filterType === 'todos' || r.tipo === filterType;
    const matchSearch =
      !searchTerm.trim() ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.fechaHora.includes(searchTerm);

    return matchMonth && matchType && matchSearch;
  });

  // Calculate distinct months available
  const availableMonths: string[] = Array.from(
    new Set(
      records
        .map((r) => (r.mes || '').toLowerCase())
        .filter((m): m is string => Boolean(m))
    )
  );

  // Metrics calculation using live synced records
  const metrics = StorageService.calcularMetricasDiasAsistidos(
    filterMonth === 'todos' ? undefined : filterMonth,
    records
  );

  // Reset employee device binding
  const handleResetDevice = async (empId: string, empName: string) => {
    if (
      confirm(
        `¿Deseas desvincular el dispositivo registrado para ${empName}? El colaborador podrá vincular su nuevo teléfono en su próximo marcaje.`
      )
    ) {
      StorageService.resetDispositivo(empId);
      await SheetsSyncService.vincularDispositivoEnSheet(configForm, empId, '');
      onRefreshRecords();
    }
  };

  // Test Apps Script Connection
  const handleTestConnection = async () => {
    setIsTestingSync(true);
    setTestSyncResult(null);

    const res = await SheetsSyncService.verificarConexion(
      configForm.googleAppsScriptUrl
    );
    setIsTestingSync(false);
    setTestSyncResult({
      tested: true,
      success: res.conectado,
      message: res.mensaje,
    });
  };

  // Save config
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveConfig(configForm);
    onUpdateConfig(configForm);
    setSaveSuccessMsg('¡Configuración guardada! IDs actualizados y sincronización en tiempo real habilitada.');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // Add new employee
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpEmail.trim() || !newEmpName.trim()) return;

    const newEmp: EmpleadoConfig = {
      id: newEmpEmail.trim().toLowerCase(),
      nombre: newEmpName.trim(),
      cargo: newEmpRole.trim() || 'Colaborador',
      departamento: 'Operaciones',
      idDispositivo: '', // unlinked until first punch
      activo: true,
    };

    setIsSyncingEmployee(true);
    StorageService.saveEmpleado(newEmp);
    await SheetsSyncService.guardarEmpleadoEnSheet(configForm, newEmp);
    setIsSyncingEmployee(false);

    setNewEmpEmail('');
    setNewEmpName('');
    setNewEmpRole('');
    setShowAddEmp(false);
    onRefreshRecords();
  };

  const gasScriptCode = getGasScriptCode(config);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-hidden">
      <div className="relative w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] max-w-5xl flex flex-col rounded-none sm:rounded-3xl bg-[#0f172a] border-0 sm:border border-[#334155] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-slate-800 bg-[#0b1326] shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-sky-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-sm sm:text-base font-bold text-white flex items-center gap-2 truncate">
                <span className="truncate">Panel de Administración</span>
                <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  CONFIDENCIAL
                </span>
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 font-mono truncate">
                Silocom C.A. • RIF: J-30725192-1
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Si está autenticado, mostrar botón de Probar en Sede y Cerrar Sesión */}
            {isAdminAuth && (
              <>
                {onToggleSimulation && (
                  <button
                    type="button"
                    onClick={onToggleSimulation}
                    title="Simular presencia física en la sede Silocom"
                    className={`px-2 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-mono font-bold border transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                      simulationActive
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/60 shadow-sm animate-pulse'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="hidden md:inline">
                      {simulationActive ? 'Simulación Activa' : 'Probar en Sede'}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Cerrar sesión de administrador y bloquear el panel"
                  className="px-2 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-mono font-bold bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden md:inline">Cerrar Sesión</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-full bg-slate-800/80 sm:bg-transparent text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60 sm:border-transparent transition-colors cursor-pointer shrink-0"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5 shrink-0" />
            </button>
          </div>
        </div>

        {/* Auth Gate: If not authenticated, prompt for admin ID */}
        {!isAdminAuth ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
              <Shield className="w-8 h-8" />
            </div>

            <h3 className="font-display text-xl font-bold text-white mb-2">
              Autenticación de Administrador
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed max-w-sm">
              Ingresa la credencial autorizada para acceder al panel de administración y control de asistencia.
            </p>

            <form onSubmit={handleVerifyAdmin} className="w-full space-y-4">
              <div className="relative">
                <input
                  type={showAdminPass ? 'text' : 'password'}
                  value={adminInput}
                  onChange={(e) => setAdminInput(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-12 pl-4 pr-11 rounded-xl bg-[#131c2e] border border-slate-700 text-white font-mono text-sm placeholder-slate-600 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none tracking-wider"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPass(!showAdminPass)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  title={showAdminPass ? 'Ocultar credencial' : 'Mostrar credencial'}
                >
                  {showAdminPass ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {authError && (
                <div className="text-xs font-mono text-rose-400 bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/60 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full h-12 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-display font-bold text-sm shadow-lg transition-all"
              >
                Verificar Acceso
              </button>
            </form>
          </div>
        ) : (
          /* Admin Main Console */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Nav Tabs */}
            <div className="flex items-center gap-1 px-2 sm:px-6 border-b border-slate-800 bg-[#0b1326] overflow-x-auto no-scrollbar shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('resumen')}
                className={`px-4 py-3 text-xs font-mono font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'resumen'
                    ? 'border-sky-400 text-sky-400 bg-sky-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Table className="w-4 h-4" />
                <span>Resumen de Asistencias</span>
                <span className="px-1.5 py-0.2 text-[10px] rounded bg-slate-800 text-slate-300">
                  {records.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('metricas')}
                className={`px-4 py-3 text-xs font-mono font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'metricas'
                    ? 'border-sky-400 text-sky-400 bg-sky-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Días Asistidos & Métricas</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('empleados')}
                className={`px-4 py-3 text-xs font-mono font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'empleados'
                    ? 'border-sky-400 text-sky-400 bg-sky-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Empleados & Dispositivos</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('configuracion')}
                className={`px-4 py-3 text-xs font-mono font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'configuracion'
                    ? 'border-sky-400 text-sky-400 bg-sky-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Sincronización Sheets & Horarios</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('script_gas')}
                className={`px-4 py-3 text-xs font-mono font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'script_gas'
                    ? 'border-sky-400 text-sky-400 bg-sky-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-4 h-4" />
                <span>Código GAS & Vercel</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 overscroll-contain">
              {/* TAB 1: RESUMEN DE ASISTENCIAS */}
              {activeTab === 'resumen' && (
                <div className="space-y-4">
                  {/* Filter Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-[#131c2e] p-3 rounded-2xl border border-slate-800">
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                      {/* Search Bar */}
                      <div className="relative min-w-[200px] flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Buscar por nombre, correo, fecha..."
                          className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#0b1326] border border-slate-700 text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-sky-500"
                        />
                      </div>

                      {/* Month Filter */}
                      <select
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="h-10 px-3 rounded-xl bg-[#0b1326] border border-slate-700 text-xs font-mono text-slate-300 outline-none focus:border-sky-500"
                      >
                        <option value="todos">Todos los meses</option>
                        {availableMonths.map((m) => (
                          <option key={m} value={m}>
                            Mes: {m.toUpperCase()}
                          </option>
                        ))}
                      </select>

                      {/* Type Filter */}
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="h-10 px-3 rounded-xl bg-[#0b1326] border border-slate-700 text-xs font-mono text-slate-300 outline-none focus:border-sky-500"
                      >
                        <option value="todos">Todos los tipos</option>
                        <option value="ENTRADA">Solo Entradas</option>
                        <option value="SALIDA">Solo Salidas</option>
                      </select>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="rounded-2xl border border-slate-800 overflow-hidden bg-[#0b1326]">
                    <div className="overflow-x-auto max-h-[480px]">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-[#131c2e] text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-800">
                          <tr>
                            <th className="px-4 py-3">Tipo</th>
                            <th className="px-4 py-3">Colaborador</th>
                            <th className="px-4 py-3">ID / Usuario</th>
                            <th className="px-4 py-3">Fecha y Hora</th>
                            <th className="px-4 py-3">Coordenadas GPS</th>
                            <th className="px-4 py-3">Estado / Geocerca</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {filteredRecords.length === 0 ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="px-4 py-8 text-center text-slate-500"
                              >
                                No se encontraron registros con los filtros
                                aplicados.
                              </td>
                            </tr>
                          ) : (
                            filteredRecords.map((r, i) => (
                              <tr
                                key={i}
                                className="hover:bg-slate-800/30 transition-colors"
                              >
                                <td className="px-4 py-2.5">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      r.tipo === 'ENTRADA'
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                    }`}
                                  >
                                    {r.tipo}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 font-semibold text-white">
                                  {r.nombre}
                                </td>
                                <td className="px-4 py-2.5 text-slate-400">
                                  {r.id}
                                </td>
                                <td className="px-4 py-2.5 text-slate-200">
                                  {r.fechaHora}
                                </td>
                                <td className="px-4 py-2.5 text-slate-400 truncate max-w-[150px]">
                                  {r.ubicacion}
                                </td>
                                <td className="px-4 py-2.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      r.estado.includes('DENTRO')
                                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                                    }`}
                                  >
                                    {r.estado}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DÍAS ASISTIDOS & MÉTRICAS */}
              {activeTab === 'metricas' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-display text-base font-bold text-white">
                        Control de Días Asistidos
                      </h4>
                      <p className="text-xs text-slate-400 font-mono">
                        Cálculo en tiempo real de días laborables, asistencia efectiva
                        y porcentaje mensual.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">
                        Mes de Evaluación:
                      </span>
                      <select
                        value={filterMonth === 'todos' ? 'agosto' : filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="h-9 px-3 rounded-xl bg-[#131c2e] border border-slate-700 text-xs font-mono text-sky-400 outline-none"
                      >
                        {availableMonths.map((m) => (
                          <option key={m} value={m}>
                            {m.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-2xl bg-[#131c2e] border border-slate-800 p-4">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">
                        Días Laborables del Mes
                      </div>
                      <div className="text-2xl font-display font-bold text-white mt-1">
                        22 Días
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 mt-1">
                        Jornada estándar Lunes a Viernes
                      </div>
                    </div>

                    <div className="rounded-2xl bg-[#131c2e] border border-slate-800 p-4">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">
                        Promedio de Asistencia
                      </div>
                      <div className="text-2xl font-display font-bold text-emerald-400 mt-1">
                        {metrics.length > 0
                          ? `${(
                              metrics.reduce(
                                (acc, m) => acc + m.porcentajeNumerico,
                                0
                              ) / metrics.length
                            ).toFixed(1)}%`
                          : '0%'}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 mt-1">
                        Rango de puntualidad y asistencia
                      </div>
                    </div>

                    <div className="rounded-2xl bg-[#131c2e] border border-slate-800 p-4">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">
                        Colaboradores Monitoreados
                      </div>
                      <div className="text-2xl font-display font-bold text-sky-400 mt-1">
                        {metrics.length} Empleados
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 mt-1">
                        Personal activo en plantilla
                      </div>
                    </div>
                  </div>

                  {/* Metrics Table */}
                  <div className="rounded-2xl border border-slate-800 overflow-hidden bg-[#0b1326]">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#131c2e] text-slate-400 uppercase text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Empleado</th>
                          <th className="px-4 py-3 text-center">
                            Días Asistidos
                          </th>
                          <th className="px-4 py-3 text-center">
                            Días Laborables
                          </th>
                          <th className="px-4 py-3 text-center">
                            Días Faltantes
                          </th>
                          <th className="px-4 py-3 text-right">
                            % de Asistencia
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {metrics.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                              <span>{m.empleado}</span>
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-emerald-400">
                              {m.diasAsistidos}
                            </td>
                            <td className="px-4 py-3 text-center text-slate-400">
                              {m.diasLaborables}
                            </td>
                            <td className="px-4 py-3 text-center text-rose-400">
                              {m.diasFaltantes}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                                  <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full"
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        m.porcentajeNumerico
                                      )}%`,
                                    }}
                                  />
                                </div>
                                <span className="font-bold text-emerald-400">
                                  {m.porcentajeAsistencia}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: EMPLEADOS & DISPOSITIVOS */}
              {activeTab === 'empleados' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-display text-base font-bold text-white">
                        Vínculos de Dispositivos Móviles (Anti-Suplantación)
                      </h4>
                      <p className="text-xs text-slate-400 font-mono">
                        Cada colaborador queda registrado y enlazado a su teléfono
                        móvil. El administrador puede restablecer el vínculo en
                        caso de cambio de equipo.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddEmp(true)}
                      className="px-3 py-2 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/40 text-xs font-mono font-bold hover:bg-sky-500/30 transition-all flex items-center gap-1.5"
                    >
                      <Users className="w-4 h-4" />
                      <span>+ Nuevo Colaborador</span>
                    </button>
                  </div>

                  {/* Add Employee Form Drawer if open */}
                  {showAddEmp && (
                    <form
                      onSubmit={handleAddEmployee}
                      className="p-4 rounded-2xl bg-[#131c2e] border border-sky-500/40 space-y-3"
                    >
                      <div className="font-display text-xs font-bold text-sky-400 uppercase">
                        Registrar Nuevo Colaborador en Silocom
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="text"
                          required
                          value={newEmpEmail}
                          onChange={(e) => setNewEmpEmail(e.target.value)}
                          placeholder="ID, Cédula o Correo (ej. V-12345678)"
                          className="h-10 px-3 rounded-xl bg-[#0b1326] border border-slate-700 text-xs font-mono text-white outline-none focus:border-sky-500"
                        />
                        <input
                          type="text"
                          required
                          value={newEmpName}
                          onChange={(e) => setNewEmpName(e.target.value)}
                          placeholder="Nombre y Apellido"
                          className="h-10 px-3 rounded-xl bg-[#0b1326] border border-slate-700 text-xs font-mono text-white outline-none focus:border-sky-500"
                        />
                        <input
                          type="text"
                          value={newEmpRole}
                          onChange={(e) => setNewEmpRole(e.target.value)}
                          placeholder="Cargo / Departamento"
                          className="h-10 px-3 rounded-xl bg-[#0b1326] border border-slate-700 text-xs font-mono text-white outline-none focus:border-sky-500"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddEmp(false)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-mono"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs font-mono"
                        >
                          Guardar Colaborador
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Employees List */}
                  <div className="rounded-2xl border border-slate-800 overflow-hidden bg-[#0b1326]">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#131c2e] text-slate-400 uppercase text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Colaborador</th>
                          <th className="px-4 py-3">ID / Correo</th>
                          <th className="px-4 py-3">Cargo</th>
                          <th className="px-4 py-3">Dispositivo Vinculado</th>
                          <th className="px-4 py-3 text-right">Acción Admin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {StorageService.getEmpleados().map((emp, i) => (
                          <tr key={i} className="hover:bg-slate-800/30">
                            <td className="px-4 py-3 font-semibold text-white">
                              {emp.nombre}
                              {emp.sinHorarioRegulado && (
                                <span className="ml-2 text-[10px] font-normal text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded">
                                  Sin Horario
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-400">
                              {emp.id}
                            </td>
                            <td className="px-4 py-3 text-slate-300">
                              {emp.cargo || 'Operaciones'}
                            </td>
                            <td className="px-4 py-3">
                              {emp.idDispositivo ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-[11px]">
                                  <Smartphone className="w-3 h-3" />
                                  {emp.idDispositivo}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[11px]">
                                  Pendiente (Se vinculará en 1er marcaje)
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {emp.idDispositivo && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleResetDevice(emp.id, emp.nombre)
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[10px] font-mono transition-all inline-flex items-center gap-1"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>Desvincular Equipo</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: CONFIGURACIÓN GOOGLE SHEETS & HORARIOS */}
              {activeTab === 'configuracion' && (
                <form onSubmit={handleSaveConfig} className="space-y-6 max-w-3xl">
                  {/* Google Sheets Integration Box */}
                  <div className="rounded-2xl bg-[#131c2e] border border-sky-500/30 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="w-5 h-5 text-sky-400" />
                        <h4 className="font-display text-sm font-bold text-white uppercase tracking-wider">
                          Sincronización en Tiempo Real con Google Sheets
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        Conexión Webhook / Apps Script
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-normal">
                      Pega aquí la URL de la Web App generada al implementar{' '}
                      <code>Codigo.gs</code> en tu hoja de Google Sheets. Cada
                      vez que un usuario marque entrada o salida, se guardará en
                      tiempo real en tu Drive.
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                          URL de Web App Google Apps Script
                          (VITE_GOOGLE_APPS_SCRIPT_URL)
                        </label>
                        <input
                          type="url"
                          value={configForm.googleAppsScriptUrl}
                          onChange={(e) =>
                            setConfigForm({
                              ...configForm,
                              googleAppsScriptUrl: e.target.value,
                            })
                          }
                          placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                          className="w-full h-11 px-3.5 rounded-xl bg-[#0b1326] border border-slate-700 text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                          ID de Hoja Google Sheets (VITE_GOOGLE_SHEET_ID)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={configForm.googleSheetId}
                            onChange={(e) =>
                              setConfigForm({
                                ...configForm,
                                googleSheetId: e.target.value,
                              })
                            }
                            placeholder="1X4bZ2_y... (ID extraído de la URL del Sheets)"
                            className="flex-1 h-11 px-3.5 rounded-xl bg-[#0b1326] border border-slate-700 text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-sky-500"
                          />
                          {configForm.googleSheetId && (
                            <a
                              href={`https://docs.google.com/spreadsheets/d/${configForm.googleSheetId}/edit`}
                              target="_blank"
                              rel="noreferrer"
                              className="h-11 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono flex items-center gap-1.5 transition-colors shrink-0"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>Abrir Sheets</span>
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={handleTestConnection}
                          disabled={
                            isTestingSync || !configForm.googleAppsScriptUrl
                          }
                          className="h-9 px-4 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-300 text-xs font-mono font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                          {isTestingSync ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <PlayCircle className="w-3.5 h-3.5" />
                          )}
                          <span>Probar Conectividad</span>
                        </button>

                        {testSyncResult && (
                          <div
                            className={`text-xs font-mono flex items-center gap-1.5 ${
                              testSyncResult.success
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {testSyncResult.success ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <AlertTriangle className="w-4 h-4" />
                            )}
                            <span>{testSyncResult.message}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Geofencing Coordinates */}
                  <div className="rounded-2xl bg-[#131c2e] border border-slate-800 p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-400" />
                      <h4 className="font-display text-sm font-bold text-white uppercase tracking-wider">
                        Geocerca de la Sede Silocom
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                          Latitud Oficina
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={configForm.latitud}
                          onChange={(e) =>
                            setConfigForm({
                              ...configForm,
                              latitud: Number(e.target.value),
                            })
                          }
                          className="w-full h-10 px-3 rounded-xl bg-[#0b1326] border border-slate-700 text-xs font-mono text-white outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                          Longitud Oficina
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={configForm.longitud}
                          onChange={(e) =>
                            setConfigForm({
                              ...configForm,
                              longitud: Number(e.target.value),
                            })
                          }
                          className="w-full h-10 px-3 rounded-xl bg-[#0b1326] border border-slate-700 text-xs font-mono text-white outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                          Radio Máximo (Metros)
                        </label>
                        <input
                          type="number"
                          value={Math.round(configForm.radioMaxKm * 1000)}
                          onChange={(e) =>
                            setConfigForm({
                              ...configForm,
                              radioMaxKm: Number(e.target.value) / 1000,
                            })
                          }
                          className="w-full h-10 px-3 rounded-xl bg-[#0b1326] border border-slate-700 text-xs font-mono text-white outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Dynamic Geofence Note */}
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-300">
                      ⚡ <strong>Lectura Dinámica en Segundo Plano:</strong> Las coordenadas y rango se leen automáticamente desde el Google Sheet base o toman los valores corporativos de la sede Silocom. En el Almacenamiento Local únicamente se persisten los IDs de conexión (Apps Script / Sheet ID).
                    </div>
                  </div>

                  {/* Push Notifications, Reminders & Auto-Close Schedule */}
                  <div className="rounded-2xl bg-[#131c2e] border border-violet-500/30 p-5 space-y-5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-violet-400" />
                        <h4 className="font-display text-sm font-bold text-white uppercase tracking-wider">
                          Cronograma de Notificaciones & Cierre Automático
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        {PushService.isSupported() ? 'Service Worker Activo' : 'No Compatible'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 font-mono leading-relaxed">
                      El sistema gestiona los recordatorios locales y el cierre automático conforme al horario laboral de Silocom C.A.:
                    </p>

                    {/* Live Caracas Clock & Autonomous Scheduler Monitor */}
                    <div className="p-4 rounded-xl bg-[#0b1326] border border-violet-500/40 space-y-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-5 h-5 text-emerald-400 animate-pulse" />
                          <div>
                            <div className="text-xs font-mono text-slate-400">Hora Caracas (Oficial):</div>
                            <div className="text-base font-mono font-bold text-emerald-300">
                              {caracasLiveTime}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                          <span className="text-[11px] font-mono text-emerald-300 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                            Vigilante Activo (Cada 20s y en desbloqueo)
                          </span>
                        </div>
                      </div>

                      {/* Opción B: Notificaciones Remotas Serverless (Vercel + Google Apps Script) */}
                      <div className="p-4 rounded-xl bg-gradient-to-r from-sky-950/40 via-blue-950/30 to-indigo-950/40 border border-sky-500/40 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="text-xs font-mono font-bold text-sky-300 flex items-center gap-2">
                              <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                              </span>
                              <span>🌐 Notificaciones Push Remotas (Vercel Serverless + Google Sheets)</span>
                            </div>
                            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                              Llegan <strong>con la app cerrada y el teléfono bloqueado</strong>. Google Apps Script y Vercel las despachan a nivel del sistema operativo.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 pt-1">
                          <button
                            type="button"
                            onClick={() => handleTestRemotePush(10)}
                            disabled={isSendingRemotePush}
                            className="px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono font-bold shadow-lg shadow-sky-600/25 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{isSendingRemotePush ? 'Despachando...' : '⚡ Probar Push Remoto (10s - Bloquea Teléfono)'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleSyncPushSubscription}
                            disabled={isSyncingPushSub}
                            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-sky-400/40 text-sky-200 text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                            <span>{isSyncingPushSub ? 'Registrando...' : '📲 Registrar Dispositivo en Sheets'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleInstallAppsScriptTriggers}
                            disabled={isInstallingTriggers}
                            className="px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-mono font-bold shadow-lg shadow-emerald-700/25 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                            title="Instala automáticamente los triggers diarios (07:45 AM, 08:30 AM, 16:30 PM y 17:30 PM) en Google Apps Script"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>{isInstallingTriggers ? 'Instalando...' : '⏰ Instalar Activadores en Google'}</span>
                          </button>
                        </div>

                        {remotePushStatus && (
                          <div className="text-[11px] font-mono p-2.5 rounded-lg bg-slate-900/80 border border-sky-500/30 text-sky-200 leading-relaxed">
                            {remotePushStatus}
                          </div>
                        )}
                      </div>

                      {/* Autonomous 30-Second Countdown Test */}
                      <div className="p-3 rounded-lg bg-violet-950/30 border border-violet-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                            <span>⏱️ Probar Disparo Automático (en 30 seg)</span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-tight">
                            Inicia la cuenta regresiva, <strong>sal de la app o bloquea el teléfono</strong>; la notificación saltará sola al completarse el tiempo.
                          </p>
                        </div>
                        <div className="shrink-0">
                          {countdownActive ? (
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-mono font-bold animate-pulse">
                                Esperando... {countdownSec}s
                              </span>
                              <button
                                type="button"
                                onClick={handleCancelCountdownTest}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={handleStartCountdownTest}
                              className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-mono font-bold shadow-lg shadow-violet-600/25 transition cursor-pointer flex items-center gap-1.5"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Iniciar Prueba (30s)</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Diagnostic & Reset Actions */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleResetDailyFlags}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-mono transition cursor-pointer flex items-center gap-1.5"
                          title="Permite que las alertas programadas vuelvan a sonar hoy aunque ya hayan sido disparadas previamente"
                        >
                          <RefreshCw className="w-3 h-3 text-sky-400" />
                          <span>Restablecer Alertas de Hoy</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleToggleForce0830}
                          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono transition cursor-pointer flex items-center gap-1.5 ${
                            force0830Test
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                          }`}
                          title="Fuerza la alerta de las 08:30 AM para que suene hoy incluso si ya tienes entrada registrada"
                        >
                          <span>{force0830Test ? '✓ Forzar Alerta 08:30 AM: SÍ' : '○ Forzar Alerta 08:30 AM: NO'}</span>
                        </button>
                      </div>

                      {resetFlagsMsg && (
                        <div className="text-[11px] font-mono text-emerald-300 bg-emerald-950/30 p-2 rounded-lg border border-emerald-500/30">
                          {resetFlagsMsg}
                        </div>
                      )}
                    </div>

                    {/* Schedule Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {/* Recordatorio 1 */}
                      <div className="p-3.5 rounded-xl bg-[#0b1326] border border-slate-700/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-sky-400" />
                            <span className="text-xs font-mono font-bold text-white">
                              07:45 AM • Recordatorio de Entrada
                            </span>
                          </div>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                            Diario (L-V)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-sans italic">
                          "Buenos días, recuerda registrar tu ENTRADA al ingresar a la sede Silocom."
                        </p>
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => handleTestReminder('0745_entrada')}
                            className="px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-sky-300 text-[11px] font-mono font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>Probar Notif (07:45 AM)</span>
                          </button>
                        </div>
                      </div>

                      {/* Recordatorio 3 (Olvido) */}
                      <div className="p-3.5 rounded-xl bg-[#0b1326] border border-amber-500/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-mono font-bold text-white">
                              08:30 AM • Aviso por Olvido
                            </span>
                          </div>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                            Validado con Sheets
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-sans italic">
                          "Atención: Aún no has registrado tu ENTRADA el día de hoy. Recuerda marcar tu asistencia al estar en sede."
                        </p>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ✓ Si el colaborador YA marcó entrada: <strong>NO notifica</strong>.<br/>
                          ✓ Si no ha marcado: emite alerta de tolerancia por olvido.
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleTestReminder('0830_olvido', false)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-300 text-[11px] font-mono font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle className="w-3 h-3" />
                            <span>Probar con Validación</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTestReminder('0830_olvido', true)}
                            title="Simula que el empleado no ha marcado entrada hoy para recibir la notificación de prueba"
                            className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono transition cursor-pointer"
                          >
                            <span>Simular Olvido</span>
                          </button>
                        </div>
                      </div>

                      {/* Recordatorio 4 (Salida) */}
                      <div className="p-3.5 rounded-xl bg-[#0b1326] border border-slate-700/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-violet-400" />
                            <span className="text-xs font-mono font-bold text-white">
                              16:30 PM • Aviso Previo de Salida
                            </span>
                          </div>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">
                            Fin de Jornada
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-sans italic">
                          "Recuerda marcar tu SALIDA al retirarte."
                        </p>
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => handleTestReminder('1630_salida')}
                            className="px-2.5 py-1.5 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-400/40 text-violet-300 text-[11px] font-mono font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>Probar Notif (16:30 PM)</span>
                          </button>
                        </div>
                      </div>

                      {/* Cierre Automático a las 17:30 */}
                      <div className="p-3.5 rounded-xl bg-[#0b1326] border border-rose-500/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Power className="w-4 h-4 text-rose-400" />
                            <span className="text-xs font-mono font-bold text-white">
                              17:30 PM • Cierre Automático x Sistema
                            </span>
                          </div>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold">
                            Sheets Trigger
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-sans">
                          A las 17:30, si el empleado tiene entrada registrada y no marcó salida, el sistema genera automáticamente su salida oficial a las <strong>17:00:00</strong>.
                        </p>
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={handleTriggerAutoClose}
                            disabled={isAutoClosing}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/50 text-rose-300 text-[11px] font-mono font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {isAutoClosing ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Power className="w-3 h-3" />
                            )}
                            <span>{isAutoClosing ? 'Procesando en Sheets...' : 'Ejecutar Cierre Automático Ahora'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Result Messages */}
                    {notifTestResult && (
                      <div
                        className={`p-3 rounded-xl border text-xs font-mono flex items-start gap-2 animate-in fade-in ${
                          notifTestResult.success
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{notifTestResult.msg}</span>
                      </div>
                    )}

                    {autoCloseResult && (
                      <div className="p-3 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-mono flex items-start gap-2 animate-in fade-in">
                        <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
                        <span>{autoCloseResult}</span>
                      </div>
                    )}
                  </div>

                  {saveSuccessMsg && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{saveSuccessMsg}</span>
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    type="submit"
                    className="h-12 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-[#090d16] font-display font-bold text-sm shadow-lg transition-all cursor-pointer"
                  >
                    Guardar Configuración
                  </button>
                </form>
              )}

              {/* TAB 5: SCRIPT GAS & GUÍA DE DESPLIEGUE VERCEL */}
              {activeTab === 'script_gas' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-display text-base font-bold text-white">
                        Código de Integración Google Apps Script (Codigo.gs)
                      </h4>
                      <p className="text-xs text-slate-400 font-mono">
                        Pega este código en el editor de Apps Script de tu Google
                        Sheets para sincronización en tiempo real.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(gasScriptCode);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-400/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copiar Codigo.gs</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Code Viewer */}
                  <div className="relative rounded-2xl bg-[#070b14] border border-slate-800 p-4 font-mono text-xs text-emerald-300 overflow-x-auto max-h-[300px]">
                    <pre>{gasScriptCode}</pre>
                  </div>

                  {/* Vercel & GitHub Deployment Checklist */}
                  <div className="rounded-2xl bg-[#131c2e] border border-slate-800 p-5 space-y-3">
                    <h5 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span>🚀 Instrucciones para Vercel & GitHub</span>
                    </h5>

                    <ol className="text-xs text-slate-300 font-mono space-y-2 list-decimal list-inside leading-relaxed">
                      <li>
                        <strong>Sube el repositorio a GitHub:</strong> Haz push
                        de todo el proyecto limpio a tu cuenta de GitHub.
                      </li>
                      <li>
                        <strong>Importa en Vercel:</strong> Conecta tu cuenta de
                        GitHub con Vercel y selecciona el repositorio de Silocom.
                      </li>
                      <li>
                        <strong>Variables de Entorno en Vercel (Settings &gt; Environment Variables):</strong>{' '}
                        Para que el despliegue y las notificaciones Web Push funcionen al 100%, añade:
                        <ul className="pl-6 mt-2 space-y-1.5 list-disc text-slate-300">
                          <li>
                            <code>VITE_GOOGLE_APPS_SCRIPT_URL</code>:{' '}
                            <span className="text-slate-400">URL de la Web App generada en Apps Script (termina en <code>/exec</code>).</span>
                          </li>
                          <li>
                            <code>VAPID_PUBLIC_KEY</code>:{' '}
                            <code className="text-emerald-300 text-[11px] select-all">BPzypta9empk_NjjOH_QA9UFQvK1ebLcIM2ZYtU6HE2bhYZG7ypV_Xl3i_7jWEV9mfR1NKsNeOFjjzfieJuG6l8</code>
                          </li>
                          <li>
                            <code>VAPID_PRIVATE_KEY</code>:{' '}
                            <code className="text-emerald-300 text-[11px] select-all">9myLo9LLLofaTgoQjFgKnkC47LPitx55tezrPtl7eTg</code>
                          </li>
                          <li>
                            <code>VAPID_SUBJECT</code>:{' '}
                            <code className="text-emerald-300 text-[11px] select-all">mailto:vsolorzano.silocom@gmail.com</code>
                          </li>
                          <li>
                            <code>PUSH_API_SECRET</code>:{' '}
                            <code className="text-emerald-300 text-[11px] select-all">silocom_push_sec_2026</code>
                          </li>
                          <li className="text-slate-400">
                            <code>VITE_GOOGLE_SHEET_ID</code>: ID de la hoja de cálculo de Google.
                          </li>
                        </ul>
                      </li>
                      <li>
                        <strong>Listo para producción:</strong> Vercel compilará
                        automáticamente con <code>npm run build</code> y
                        desplegará en su CDN global con soporte HTTPS (necesario
                        para el GPS del móvil).
                      </li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
