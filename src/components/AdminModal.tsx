import React, { useState } from 'react';
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

  const gasScriptCode = `/**
 * =========================================================================
 * SISTEMA DE CONTROL DE ASISTENCIAS - SILOCOM C.A.
 * RIF: J-30725192-1
 * Archivo: Codigo.gs (Google Apps Script)
 * =========================================================================
 * Instrucciones:
 * 1. Abre tu Google Sheets "Control de Asistencias - Silocom".
 * 2. Extensiones > Apps Script y pega este código completo.
 * 3. Implementar > Nueva implementación > Aplicación web:
 *    - Ejecutar como: "Yo"
 *    - Quién tiene acceso: "Cualquier persona" (Anyone)
 * 4. Pega la URL generada en la pestaña "Sincronización Sheets & Horarios".
 * 5. Para el Cierre Automático diario (17:30): ejecuta "instalarTriggerCierreAutomatico".
 * =========================================================================
 */

const CONFIG = {
  HOJA_ASISTENCIAS: 'Asistencias',
  HOJA_CONFIG: 'Configuracion',
  LATITUD_OFICINA: ${config.latitud},
  LONGITUD_OFICINA: ${config.longitud},
  RADIO_MAX_KM: ${config.radioMaxKm},
  TOLERANCIA_MIN: 30,
  HORA_ENTRADA: 8,
  HORA_SALIDA: 17,
  VENTANA_ENTRADA_INI: 7,
  VENTANA_ENTRADA_FIN: 9,
  VENTANA_SALIDA_INI: 16,
  VENTANA_SALIDA_FIN: 18,
  CIERRE_AUTOMATICO: 17.5,
  ADMIN_EMAIL: 'vsolorzano.silocom@gmail.com',
  FILA_INICIO_EMPLEADOS: 7,
  COL_ID: 1,
  COL_NOMBRE: 2,
  COL_DISPOSITIVO: 3
};

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'ping';
    if (action === 'ping') {
      return respuestaJSON({ status: 'ok', app: 'Silocom Asistencias', timestamp: new Date().toISOString() });
    }
    if (action === 'obtenerConfiguracion') {
      return respuestaJSON({ success: true, config: obtenerConfiguracionDinamica() });
    }
    if (action === 'obtenerDatos' || action === 'obtenerAsistencias') {
      return respuestaJSON(obtenerDatosCompletos());
    }
    if (action === 'obtenerEmpleados') {
      return respuestaJSON({ success: true, empleados: obtenerListaEmpleados() });
    }
    return respuestaJSON({ status: 'ok', message: 'API Silocom Asistencias en línea.' });
  } catch (err) {
    return respuestaJSON({ success: false, message: err.message });
  }
}

function doPost(e) {
  try {
    let data;
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      data = e.parameter;
    }
    const action = data.action || 'registrarAsistencia';
    if (action === 'registrarAsistencia') return respuestaJSON(procesarRegistroAsistencia(data));
    if (action === 'guardarEmpleado') return respuestaJSON(guardarEmpleadoEnConfig(data));
    if (action === 'vincularDispositivo') return respuestaJSON(vincularDispositivoEnConfig(data));
    if (action === 'ejecutarCierreAutomatico') return respuestaJSON(ejecutarCierreAutomatico());
    if (action === 'obtenerDatos') return respuestaJSON(obtenerDatosCompletos());
    return respuestaJSON({ success: false, message: 'Acción no reconocida: ' + action });
  } catch (err) {
    return respuestaJSON({ success: false, message: err.message });
  }
}

function procesarRegistroAsistencia(datos) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaAsistencias = ss.getSheetByName(CONFIG.HOJA_ASISTENCIAS);
  if (!hojaAsistencias) return { success: false, message: 'Hoja Asistencias no existe' };

  const idUsuario = (datos.id || '').toString().trim().toLowerCase();
  const tipoRegistro = (datos.tipo || 'ENTRADA').toUpperCase().trim();
  const nombreEmpleado = (datos.nombre || idUsuario).toString().trim();
  const latitud = parseFloat(datos.lat);
  const longitud = parseFloat(datos.lng);
  const idDispositivo = (datos.idDispositivo || '').toString().trim();

  const hojaConfig = ss.getSheetByName(CONFIG.HOJA_CONFIG);
  if (hojaConfig && idDispositivo) {
    sincronizarDispositivoEnConfig(hojaConfig, idUsuario, nombreEmpleado, idDispositivo);
  }

  const fechaServidor = new Date();
  const formatoFecha = Utilities.formatDate(fechaServidor, Session.getScriptTimeZone() || 'America/Caracas', 'dd/MM/yyyy HH:mm:ss');
  const coordsStr = (!isNaN(latitud) && !isNaN(longitud)) ? latitud.toFixed(6) + ', ' + longitud.toFixed(6) : 'Sede Silocom';

  // PROTECCIÓN DE FÓRMULAS: Escribe estrictamente en Columnas 1 a 6 (A a F).
  // Las Columnas G (DIA) y H (MES) quedan intactas con sus fórmulas automáticas.
  const proxFila = hojaAsistencias.getLastRow() + 1;
  hojaAsistencias.getRange(proxFila, 1, 1, 6).setValues([[
    idUsuario,
    nombreEmpleado,
    tipoRegistro,
    formatoFecha,
    coordsStr,
    'DENTRO DE RANGO'
  ]]);

  return { success: true, message: '¡Registro guardado en Google Sheets!', fechaHora: formatoFecha };
}

function guardarEmpleadoEnConfig(datos) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaConfig = ss.getSheetByName(CONFIG.HOJA_CONFIG);
  if (!hojaConfig) return { success: false, message: 'Hoja Configuracion no encontrada.' };

  const id = (datos.id || '').toString().trim().toLowerCase();
  const nombre = (datos.nombre || '').toString().trim();
  const idDispositivo = (datos.idDispositivo || '').toString().trim();

  const data = hojaConfig.getDataRange().getValues();
  for (let r = CONFIG.FILA_INICIO_EMPLEADOS - 1; r < data.length; r++) {
    if ((data[r][0] || '').toString().trim().toLowerCase() === id) {
      if (nombre) hojaConfig.getRange(r + 1, 2).setValue(nombre);
      if (idDispositivo) hojaConfig.getRange(r + 1, 3).setValue(idDispositivo);
      return { success: true, message: 'Empleado actualizado en Sheets.' };
    }
  }

  const proxFila = hojaConfig.getLastRow() + 1;
  hojaConfig.getRange(proxFila, 1, 1, 3).setValues([[id, nombre || id, idDispositivo || '']]);
  return { success: true, message: 'Colaborador creado en Google Sheets.' };
}

function vincularDispositivoEnConfig(datos) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaConfig = ss.getSheetByName(CONFIG.HOJA_CONFIG);
  if (!hojaConfig) return { success: false, message: 'Hoja no encontrada.' };

  const id = (datos.id || '').toString().trim().toLowerCase();
  const idDispositivo = (datos.idDispositivo !== undefined) ? datos.idDispositivo.toString().trim() : '';

  const data = hojaConfig.getDataRange().getValues();
  for (let r = CONFIG.FILA_INICIO_EMPLEADOS - 1; r < data.length; r++) {
    if ((data[r][0] || '').toString().trim().toLowerCase() === id) {
      hojaConfig.getRange(r + 1, 3).setValue(idDispositivo);
      return { success: true, message: 'Dispositivo actualizado en Sheets.' };
    }
  }
  return { success: false, message: 'Empleado no encontrado.' };
}

function sincronizarDispositivoEnConfig(hojaConfig, idUsuario, nombreEmpleado, idDispositivo) {
  try {
    const data = hojaConfig.getDataRange().getValues();
    for (let r = CONFIG.FILA_INICIO_EMPLEADOS - 1; r < data.length; r++) {
      if ((data[r][0] || '').toString().trim().toLowerCase() === idUsuario.toLowerCase()) {
        const dispActual = (data[r][2] || '').toString().trim();
        if (!dispActual && idDispositivo) {
          hojaConfig.getRange(r + 1, 3).setValue(idDispositivo);
        }
        return;
      }
    }
  } catch (e) {}
}

function ejecutarCierreAutomatico() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaAsistencias = ss.getSheetByName(CONFIG.HOJA_ASISTENCIAS);
  if (!hojaAsistencias) return { success: false, message: 'Hoja Asistencias no encontrada' };

  const tz = Session.getScriptTimeZone() || 'America/Caracas';
  const hoy = new Date();
  const diaHoyStr = Utilities.formatDate(hoy, tz, 'dd/MM/yyyy');
  const horaOficialSalida = diaHoyStr + ' 17:00:00';

  const data = hojaAsistencias.getDataRange().getValues();
  const empleadosConEntrada = {};
  const empleadosConSalida = {};

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const id = (row[0] || '').toString().trim().toLowerCase();
    const nombre = (row[1] || id).toString().trim();
    const tipo = (row[2] || '').toString().trim().toUpperCase();
    let fechaStr = (row[3] instanceof Date) ? Utilities.formatDate(row[3], tz, 'dd/MM/yyyy HH:mm:ss') : (row[3] || '').toString().trim();

    if (fechaStr.startsWith(diaHoyStr)) {
      if (tipo === 'ENTRADA') empleadosConEntrada[id] = nombre;
      if (tipo === 'SALIDA') empleadosConSalida[id] = true;
    }
  }

  const cerrados = [];
  for (const empId in empleadosConEntrada) {
    if (!empleadosConSalida[empId]) {
      const proxFila = hojaAsistencias.getLastRow() + 1;
      hojaAsistencias.getRange(proxFila, 1, 1, 6).setValues([[
        empId,
        empleadosConEntrada[empId],
        'SALIDA',
        horaOficialSalida,
        'CIERRE AUTOMATICO / SISTEMA',
        'CIERRE X SISTEMA'
      ]]);
      cerrados.push({ id: empId, nombre: empleadosConEntrada[empId] });
    }
  }

  return {
    success: true,
    message: cerrados.length > 0 ? 'Se cerraron ' + cerrados.length + ' jornada(s) pendientes.' : 'No hay turnos abiertos pendientes.',
    totalCerrados: cerrados.length
  };
}

function instalarTriggerCierreAutomatico() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'ejecutarCierreAutomatico') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('ejecutarCierreAutomatico')
    .timeBased()
    .everyDays(1)
    .atHour(17)
    .nearMinute(30)
    .inTimezone('America/Caracas')
    .create();
  return 'Activador instalado a las 17:30 (Caracas).';
}

function obtenerDatosCompletos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaAsistencias = ss.getSheetByName(CONFIG.HOJA_ASISTENCIAS);
  const registros = [];
  const empleados = obtenerListaEmpleados();

  if (hojaAsistencias) {
    const dataAsist = hojaAsistencias.getDataRange().getValues();
    const tz = Session.getScriptTimeZone() || 'America/Caracas';
    for (let i = 1; i < dataAsist.length; i++) {
      const row = dataAsist[i];
      if (!row[0] && !row[1]) continue;
      const id = (row[0] || '').toString().trim().toLowerCase();
      const nombre = (row[1] || id).toString().trim();
      const tipo = (row[2] || 'ENTRADA').toString().trim().toUpperCase();
      let fechaHora = (row[3] instanceof Date) ? Utilities.formatDate(row[3], tz, 'dd/MM/yyyy HH:mm:ss') : (row[3] || '').toString().trim();
      const ubicacion = (row[4] || '').toString().trim();
      const estado = (row[5] || 'DENTRO DE RANGO').toString().trim();
      const partesFecha = fechaHora.split(' ')[0] ? fechaHora.split(' ')[0].split('/') : [];
      const dia = partesFecha[0] || '';
      const numMes = parseInt(partesFecha[1] || '0', 10);
      const meses = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      const mes = meses[numMes] || '';
      registros.push({ id, nombre, tipo, fechaHora, ubicacion, estado, dia, mes });
    }
  }
  registros.reverse();
  return { success: true, registros, empleados, config: obtenerConfiguracionDinamica() };
}

function obtenerListaEmpleados() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaConfig = ss.getSheetByName(CONFIG.HOJA_CONFIG);
  const empleados = [];
  if (!hojaConfig) return empleados;
  const dataConfig = hojaConfig.getDataRange().getValues();
  for (let r = CONFIG.FILA_INICIO_EMPLEADOS - 1; r < dataConfig.length; r++) {
    const row = dataConfig[r];
    const rawId = (row[0] !== undefined && row[0] !== null) ? row[0].toString().trim() : '';
    const id = rawId.toLowerCase();
    const nombre = (row[1] || '').toString().trim();
    const dispositivo = (row[2] || '').toString().trim();
    const esCabecera = !id || ['id', 'usuario', 'correo', 'email', 'id / correo', 'identificador', 'colaborador', 'empleado', 'parametro'].includes(id);
    if (!esCabecera) {
      empleados.push({ id: rawId, nombre: nombre || rawId, idDispositivo: dispositivo, activo: true });
    }
  }
  return empleados;
}

function obtenerConfiguracionDinamica() {
  return {
    latitud: CONFIG.LATITUD_OFICINA,
    longitud: CONFIG.LONGITUD_OFICINA,
    radioMaxKm: CONFIG.RADIO_MAX_KM,
    horaEntrada: CONFIG.HORA_ENTRADA,
    horaSalida: CONFIG.HORA_SALIDA,
    cierreAutomatico: CONFIG.CIERRE_AUTOMATICO
  };
}

function respuestaJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}`;

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
                        <strong>Variables de Entorno (Environment Variables):</strong>{' '}
                        En los settings de Vercel, agrega:
                        <ul className="pl-6 mt-1 space-y-1 list-disc text-slate-400">
                          <li>
                            <code>VITE_GOOGLE_APPS_SCRIPT_URL</code>: La URL de
                            la Web App de Apps Script.
                          </li>
                          <li>
                            <code>VITE_GOOGLE_SHEET_ID</code>: El ID de tu
                            archivo de Google Sheets.
                          </li>
                          <li>
                            <code>VITE_ADMIN_EMAIL</code>:{' '}
                            vsolorzano.silocom@gmail.com
                          </li>
                          <li>
                            <code>VITE_OFFICE_LAT</code>: 10.494505
                          </li>
                          <li>
                            <code>VITE_OFFICE_LNG</code>: -66.831454
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
