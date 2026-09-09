import {
  AsistenciaRecord,
  EmpleadoConfig,
  OfficeConfig,
  EstadoEmpleadoHoy,
  DiasAsistidosSummary,
} from '../types';
import {
  DEFAULT_OFFICE_LAT,
  DEFAULT_OFFICE_LNG,
  DEFAULT_RADIO_MAX_KM,
} from '../utils/geo';

const STORAGE_KEYS = {
  GAS_URL: 'silocom_gas_url',
  SHEET_ID: 'silocom_sheet_id',
  LAST_USER: 'silocom_last_user_id',
  REGISTROS: 'silocom_cached_records',
  EMPLEADOS: 'silocom_cached_roster',
};

// Initial data imported directly from the Google Sheets database provided by the user
export const SEED_REGISTROS: AsistenciaRecord[] = [
  {
    id: 'vsolorzano.silocom@gmail.com',
    nombre: 'Victor Solorzano',
    tipo: 'ENTRADA',
    fechaHora: '20/08/2026 10:56:18',
    ubicacion: '10.494761, -66.831337',
    estado: 'DENTRO DE RANGO (31m)',
    dia: '20',
    mes: 'agosto',
    timestamp: new Date(2026, 7, 20, 10, 56, 18).getTime(),
  },
  {
    id: 'vsolorzano.silocom@gmail.com',
    nombre: 'Victor Solorzano',
    tipo: 'SALIDA',
    fechaHora: '20/08/2026 17:01:54',
    ubicacion: '10.494749, -66.831389',
    estado: 'DENTRO DE RANGO (28m)',
    dia: '20',
    mes: 'agosto',
    timestamp: new Date(2026, 7, 20, 17, 1, 54).getTime(),
  },
  {
    id: 'vsolorzano.silocom@gmail.com',
    nombre: 'Victor Solorzano',
    tipo: 'ENTRADA',
    fechaHora: '21/08/2026 08:03:55',
    ubicacion: '10.494582, -66.831528',
    estado: 'DENTRO DE RANGO (12m)',
    dia: '21',
    mes: 'agosto',
    timestamp: new Date(2026, 7, 21, 8, 3, 55).getTime(),
  },
  {
    id: 'vsolorzano.silocom@gmail.com',
    nombre: 'Victor Solorzano',
    tipo: 'SALIDA',
    fechaHora: '21/08/2026 16:36:06',
    ubicacion: '10.494644, -66.831477',
    estado: 'DENTRO DE RANGO (16m)',
    dia: '21',
    mes: 'agosto',
    timestamp: new Date(2026, 7, 21, 16, 36, 6).getTime(),
  },
  {
    id: 'vsolorzano.silocom@gmail.com',
    nombre: 'Victor Solorzano',
    tipo: 'ENTRADA',
    fechaHora: '24/08/2026 11:52:11',
    ubicacion: '10.494752, -66.831360',
    estado: 'DENTRO DE RANGO (29m)',
    dia: '24',
    mes: 'agosto',
    timestamp: new Date(2026, 7, 24, 11, 52, 11).getTime(),
  },
  {
    id: 'vsolorzano.silocom@gmail.com',
    nombre: 'Victor Solorzano',
    tipo: 'SALIDA',
    fechaHora: '24/08/2026 17:07:00',
    ubicacion: '10.494758, -66.831332',
    estado: 'DENTRO DE RANGO (31m)',
    dia: '24',
    mes: 'agosto',
    timestamp: new Date(2026, 7, 24, 17, 7, 0).getTime(),
  },
  {
    id: 'vsolorzano.silocom@gmail.com',
    nombre: 'Victor Solorzano',
    tipo: 'ENTRADA',
    fechaHora: '25/08/2026 08:03:37',
    ubicacion: '10.494505, -66.831454',
    estado: 'DENTRO DE RANGO (0m)',
    dia: '25',
    mes: 'agosto',
    timestamp: new Date(2026, 7, 25, 8, 3, 37).getTime(),
  },
  {
    id: 'vsolorzano.silocom@gmail.com',
    nombre: 'Victor Solorzano',
    tipo: 'SALIDA',
    fechaHora: '25/08/2026 17:00:00',
    ubicacion: '10.494505, -66.831454',
    estado: 'DENTRO DE RANGO (0m)',
    dia: '25',
    mes: 'agosto',
    timestamp: new Date(2026, 7, 25, 17, 0, 0).getTime(),
  },
  {
    id: 'vsolorzano.silocom@gmail.com',
    nombre: 'Victor Solorzano',
    tipo: 'ENTRADA',
    fechaHora: '27/08/2026 11:39:59',
    ubicacion: '10.494761, -66.831344',
    estado: 'DENTRO DE RANGO (31m)',
    dia: '27',
    mes: 'agosto',
    timestamp: new Date(2026, 7, 27, 11, 39, 59).getTime(),
  },
  {
    id: 'vsolorzano.silocom@gmail.com',
    nombre: 'Victor Solorzano',
    tipo: 'SALIDA',
    fechaHora: '27/08/2026 16:57:10',
    ubicacion: '10.494580, -66.831453',
    estado: 'DENTRO DE RANGO (8m)',
    dia: '27',
    mes: 'agosto',
    timestamp: new Date(2026, 7, 27, 16, 57, 10).getTime(),
  },
  {
    id: 'vsolorzano.silocom@gmail.com',
    nombre: 'Victor Solorzano',
    tipo: 'ENTRADA',
    fechaHora: '28/08/2026 07:24:57',
    ubicacion: '10.494745, -66.831360',
    estado: 'DENTRO DE RANGO (29m)',
    dia: '28',
    mes: 'agosto',
    timestamp: new Date(2026, 7, 28, 7, 24, 57).getTime(),
  },
  {
    id: 'vsolorzano.silocom@gmail.com',
    nombre: 'Victor Solorzano',
    tipo: 'SALIDA',
    fechaHora: '28/08/2026 17:21:19',
    ubicacion: '10.494580, -66.831422',
    estado: 'DENTRO DE RANGO (9m)',
    dia: '28',
    mes: 'agosto',
    timestamp: new Date(2026, 7, 28, 17, 21, 19).getTime(),
  },
  {
    id: 'vsolorzano.silocom@gmail.com',
    nombre: 'Victor Solorzano',
    tipo: 'ENTRADA',
    fechaHora: '31/08/2026 11:25:00',
    ubicacion: '10.494763, -66.831343',
    estado: 'DENTRO DE RANGO (31m)',
    dia: '31',
    mes: 'agosto',
    timestamp: new Date(2026, 7, 31, 11, 25, 0).getTime(),
  },
  {
    id: 'vsolorzano.silocom@gmail.com',
    nombre: 'Victor Solorzano',
    tipo: 'SALIDA',
    fechaHora: '31/08/2026 17:05:33',
    ubicacion: '10.494531, -66.831993',
    estado: 'DENTRO DE RANGO (59m)',
    dia: '31',
    mes: 'agosto',
    timestamp: new Date(2026, 7, 31, 17, 5, 33).getTime(),
  },
  {
    id: 'vsolorzano.silocom@gmail.com',
    nombre: 'Victor Solorzano',
    tipo: 'ENTRADA',
    fechaHora: '01/09/2026 08:21:34',
    ubicacion: '10.494773, -66.831378',
    estado: 'DENTRO DE RANGO (31m)',
    dia: '01',
    mes: 'septiembre',
    timestamp: new Date(2026, 8, 1, 8, 21, 34).getTime(),
  },
  {
    id: 'vsolorzano.silocom@gmail.com',
    nombre: 'Victor Solorzano',
    tipo: 'SALIDA',
    fechaHora: '01/09/2026 16:45:53',
    ubicacion: '10.494748, -66.831382',
    estado: 'DENTRO DE RANGO (28m)',
    dia: '01',
    mes: 'septiembre',
    timestamp: new Date(2026, 8, 1, 16, 45, 53).getTime(),
  },
  {
    id: 'vsolorzano.silocom@gmail.com',
    nombre: 'Victor Solorzano',
    tipo: 'ENTRADA',
    fechaHora: '02/09/2026 07:51:33',
    ubicacion: '10.494754, -66.831347',
    estado: 'DENTRO DE RANGO (30m)',
    dia: '02',
    mes: 'septiembre',
    timestamp: new Date(2026, 8, 2, 7, 51, 33).getTime(),
  },
  {
    id: 'vsolorzano.silocom@gmail.com',
    nombre: 'Victor Solorzano',
    tipo: 'SALIDA',
    fechaHora: '02/09/2026 17:00:00',
    ubicacion: 'CIERRE AUTOMATICO / SISTEMA',
    estado: 'CIERRE X SISTEMA',
    dia: '02',
    mes: 'septiembre',
    timestamp: new Date(2026, 8, 2, 17, 0, 0).getTime(),
  },
  {
    id: 'vsolorzano.silocom@gmail.com',
    nombre: 'Victor Solorzano',
    tipo: 'ENTRADA',
    fechaHora: '03/09/2026 08:36:59',
    ubicacion: '10.494743, -66.831366',
    estado: 'DENTRO DE RANGO (28m)',
    dia: '03',
    mes: 'septiembre',
    timestamp: new Date(2026, 8, 3, 8, 36, 59).getTime(),
  },
  {
    id: 'vsolorzano.silocom@gmail.com',
    nombre: 'Victor Solorzano',
    tipo: 'SALIDA',
    fechaHora: '03/09/2026 17:00:00',
    ubicacion: 'CIERRE AUTOMATICO / SISTEMA',
    estado: 'CIERRE X SISTEMA',
    dia: '03',
    mes: 'septiembre',
    timestamp: new Date(2026, 8, 3, 17, 0, 0).getTime(),
  },
  {
    id: 'vsolorzano.silocom@gmail.com',
    nombre: 'Victor Solorzano',
    tipo: 'ENTRADA',
    fechaHora: '07/09/2026 09:11:37',
    ubicacion: '10.494605, -66.831354',
    estado: 'DENTRO DE RANGO',
    dia: '07',
    mes: 'septiembre',
    timestamp: new Date(2026, 8, 7, 9, 11, 37).getTime(),
  },
  {
    id: 'evalero.silocom@gmail.com',
    nombre: 'EVALERO SILOCOM',
    tipo: 'ENTRADA',
    fechaHora: '07/09/2026 13:07:54',
    ubicacion: '10.494763, -66.831408',
    estado: 'DENTRO DE RANGO',
    dia: '07',
    mes: 'septiembre',
    timestamp: new Date(2026, 8, 7, 13, 7, 54).getTime(),
  },
];

export const SEED_EMPLEADOS: EmpleadoConfig[] = [
  {
    id: 'vsolorzano.silocom@gmail.com',
    nombre: 'Victor Solorzano',
    idDispositivo: '', // Empty: will bind to user's phone on first punch
    cargo: 'Coordinador General / IT',
    departamento: 'Operaciones',
    activo: true,
    sinHorarioRegulado: false,
  },
  {
    id: 'evalero.silocom@gmail.com',
    nombre: 'EVALERO SILOCOM',
    idDispositivo: '',
    cargo: 'Colaborador',
    departamento: 'Operaciones',
    activo: true,
    sinHorarioRegulado: false,
  },
];

export const DEFAULT_CONFIG: OfficeConfig = {
  latitud: Number(import.meta.env.VITE_OFFICE_LAT) || DEFAULT_OFFICE_LAT,
  longitud: Number(import.meta.env.VITE_OFFICE_LNG) || DEFAULT_OFFICE_LNG,
  radioMaxKm:
    (Number(import.meta.env.VITE_OFFICE_RADIUS_METERS) || 60) / 1000 ||
    DEFAULT_RADIO_MAX_KM,
  toleranciaAvisoEntradaMin: 30,
  horaEntrada: 8,
  horaSalida: 17,
  recordatorioEntrada: '07:45',
  avisoOlvidoEntrada: '08:30',
  avisoPrevioSalida: '16:30',
  ventanaEntradaInicio: 7,
  ventanaEntradaFin: 9,
  ventanaSalidaInicio: 16,
  ventanaSalidaFin: 18,
  cierreAutomatico: 17.5,
  adminEmail:
    import.meta.env.VITE_ADMIN_EMAIL || 'vsolorzano.silocom@gmail.com',
  googleAppsScriptUrl: import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || '',
  googleSheetId: import.meta.env.VITE_GOOGLE_SHEET_ID || '',
};

export class StorageService {
  public static getRegistros(): AsistenciaRecord[] {
    if (typeof window === 'undefined') return SEED_REGISTROS;
    const stored = localStorage.getItem(STORAGE_KEYS.REGISTROS);
    if (!stored) {
      localStorage.setItem(
        STORAGE_KEYS.REGISTROS,
        JSON.stringify(SEED_REGISTROS)
      );
      return SEED_REGISTROS;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return SEED_REGISTROS;
    }
  }

  public static saveRegistro(record: AsistenciaRecord): AsistenciaRecord[] {
    const list = this.getRegistros();
    const updated = [record, ...list];
    localStorage.setItem(STORAGE_KEYS.REGISTROS, JSON.stringify(updated));
    return updated;
  }

  public static getEmpleados(): EmpleadoConfig[] {
    if (typeof window === 'undefined') return SEED_EMPLEADOS;
    const stored = localStorage.getItem(STORAGE_KEYS.EMPLEADOS);
    if (!stored) {
      localStorage.setItem(
        STORAGE_KEYS.EMPLEADOS,
        JSON.stringify(SEED_EMPLEADOS)
      );
      return SEED_EMPLEADOS;
    }
    try {
      const parsed: EmpleadoConfig[] = JSON.parse(stored);
      const filtered = parsed.filter(
        (e) => !e.id.includes('mmorillo') && !e.id.includes('cmendez')
      );
      if (filtered.length === 0) {
        localStorage.setItem(
          STORAGE_KEYS.EMPLEADOS,
          JSON.stringify(SEED_EMPLEADOS)
        );
        return SEED_EMPLEADOS;
      }
      return filtered;
    } catch {
      return SEED_EMPLEADOS;
    }
  }

  public static findEmpleado(idOrEmail: string): EmpleadoConfig | undefined {
    const query = idOrEmail.trim().toLowerCase();
    if (!query) return undefined;
    const cleanQuery = query.replace(/[^a-z0-9]/g, '');
    const list = this.getEmpleados();
    return list.find((e) => {
      const eId = e.id.toLowerCase();
      const eName = e.nombre.toLowerCase();
      const cleanEId = eId.replace(/[^a-z0-9]/g, '');
      return (
        eId === query ||
        (cleanQuery.length >= 3 && cleanEId === cleanQuery) ||
        eName === query ||
        (query.length >= 3 && eName.includes(query)) ||
        eId.startsWith(query)
      );
    });
  }

  public static saveEmpleado(empleado: EmpleadoConfig): EmpleadoConfig[] {
    const list = this.getEmpleados();
    const index = list.findIndex(
      (e) => e.id.toLowerCase() === empleado.id.toLowerCase()
    );
    let updated: EmpleadoConfig[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = empleado;
    } else {
      updated = [...list, empleado];
    }
    localStorage.setItem(STORAGE_KEYS.EMPLEADOS, JSON.stringify(updated));
    return updated;
  }

  public static bindDispositivo(
    empleadoId: string,
    deviceId: string
  ): { success: boolean; message: string } {
    const list = this.getEmpleados();
    const index = list.findIndex(
      (e) => e.id.toLowerCase() === empleadoId.toLowerCase()
    );
    if (index < 0) {
      // Auto register employee if they don't exist yet!
      const nuevo: EmpleadoConfig = {
        id: empleadoId,
        nombre: empleadoId.split('@')[0].replace('.', ' ').toUpperCase(),
        idDispositivo: deviceId,
        cargo: 'Colaborador',
        departamento: 'General',
        activo: true,
      };
      this.saveEmpleado(nuevo);
      return {
        success: true,
        message: 'Nuevo colaborador registrado y dispositivo vinculado.',
      };
    }

    const emp = list[index];
    if (!emp.idDispositivo) {
      emp.idDispositivo = deviceId;
      this.saveEmpleado(emp);
      return { success: true, message: 'Dispositivo vinculado con éxito.' };
    }

    if (emp.idDispositivo !== deviceId) {
      return {
        success: false,
        message: `Dispositivo no Autorizado: Tu cuenta está vinculada a otro celular (${emp.idDispositivo}). Contacta al administrador para restablecerlo.`,
      };
    }

    return { success: true, message: 'Dispositivo verificado.' };
  }

  public static resetDispositivo(empleadoId: string): void {
    const list = this.getEmpleados();
    const emp = list.find(
      (e) => e.id.toLowerCase() === empleadoId.toLowerCase()
    );
    if (emp) {
      emp.idDispositivo = '';
      this.saveEmpleado(emp);
    }
  }

  public static getConfig(): OfficeConfig {
    if (typeof window === 'undefined') return DEFAULT_CONFIG;

    // Solo se guardan y leen los IDs del GAS y del Sheets en LocalStorage
    const storedGasUrl = localStorage.getItem(STORAGE_KEYS.GAS_URL);
    const storedSheetId = localStorage.getItem(STORAGE_KEYS.SHEET_ID);

    return {
      ...DEFAULT_CONFIG,
      googleAppsScriptUrl: storedGasUrl !== null ? storedGasUrl : (import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || ''),
      googleSheetId: storedSheetId !== null ? storedSheetId : (import.meta.env.VITE_GOOGLE_SHEET_ID || ''),
    };
  }

  public static saveConfig(config: OfficeConfig): void {
    // Almacenamiento Local restringido estrictamente a los IDs/URLs de Google Apps Script y Google Sheets
    if (typeof window === 'undefined') return;
    if (config.googleAppsScriptUrl !== undefined) {
      localStorage.setItem(STORAGE_KEYS.GAS_URL, config.googleAppsScriptUrl.trim());
    }
    if (config.googleSheetId !== undefined) {
      localStorage.setItem(STORAGE_KEYS.SHEET_ID, config.googleSheetId.trim());
    }
  }

  public static setRegistros(records: AsistenciaRecord[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.REGISTROS, JSON.stringify(records));
  }

  public static setEmpleados(empleados: EmpleadoConfig[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.EMPLEADOS, JSON.stringify(empleados));
  }

  public static getLastUserId(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(STORAGE_KEYS.LAST_USER) || '';
  }

  public static setLastUserId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.LAST_USER, id);
  }

  public static getEstadoHoy(empleadoId: string): EstadoEmpleadoHoy {
    const idLimpio = empleadoId.trim().toLowerCase();
    const emp = this.findEmpleado(idLimpio);
    const esSinHorario =
      emp?.sinHorarioRegulado ||
      idLimpio.includes('maria.morillo') ||
      idLimpio.includes('morillo');

    const registros = this.getRegistros();
    const now = new Date();
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    const hoyStr = `${pad(now.getDate())}/${pad(
      now.getMonth() + 1
    )}/${now.getFullYear()}`;

    let tieneEntradaHoy = false;
    let tieneSalidaHoy = false;
    let horaEntradaHoy: string | undefined;
    let horaSalidaHoy: string | undefined;

    for (const reg of registros) {
      if (reg.id.toLowerCase() === idLimpio) {
        const fechaReg = reg.fechaHora.split(' ')[0];
        if (fechaReg === hoyStr) {
          if (reg.tipo === 'ENTRADA') {
            tieneEntradaHoy = true;
            horaEntradaHoy = reg.fechaHora.split(' ')[1] || '';
          } else if (reg.tipo === 'SALIDA') {
            tieneSalidaHoy = true;
            horaSalidaHoy = reg.fechaHora.split(' ')[1] || '';
          }
        }
      }
    }

    return {
      tieneEntradaHoy,
      tieneSalidaHoy,
      horaEntradaHoy,
      horaSalidaHoy,
      empleadoConHorario: !esSinHorario,
    };
  }

  public static calcularMetricasDiasAsistidos(
    filtroMes?: string,
    registrosCustom?: AsistenciaRecord[]
  ): DiasAsistidosSummary[] {
    const registros = registrosCustom || this.getRegistros();
    const empleados = this.getEmpleados();
    const mesObjetivo = filtroMes ? filtroMes.toLowerCase() : 'agosto';

    const countByEmp: Record<string, Set<string>> = {};

    for (const reg of registros) {
      const regMes = (reg.mes || '').toLowerCase();
      if (!filtroMes || regMes === mesObjetivo) {
        const empKey = reg.nombre || reg.id;
        if (!countByEmp[empKey]) {
          countByEmp[empKey] = new Set();
        }
        if (reg.tipo === 'ENTRADA') {
          countByEmp[empKey].add(reg.dia);
        }
      }
    }

    const diasLaborablesMes = 22; // Working days default for the month

    const resultado: DiasAsistidosSummary[] = [];

    // Ensure all employees are represented
    for (const emp of empleados) {
      const empName = emp.nombre;
      const asistidosSet = countByEmp[empName] || new Set();
      const diasAsist = asistidosSet.size;
      const diasFalt = Math.max(0, diasLaborablesMes - diasAsist);
      const porcentaje = Math.min(
        100,
        Math.round((diasAsist / diasLaborablesMes) * 10000) / 100
      );

      resultado.push({
        empleado: empName,
        diasAsistidos: diasAsist,
        diasLaborables: diasLaborablesMes,
        diasFaltantes: diasFalt,
        porcentajeAsistencia: `${porcentaje.toFixed(2).replace('.', ',')}%`,
        porcentajeNumerico: porcentaje,
      });
    }

    return resultado;
  }

  // Admin session authentication handling (in sessionStorage)
  public static isAdminSessionActive(): boolean {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('silocom_admin_auth') === 'true';
  }

  public static setAdminSessionActive(active: boolean): void {
    if (typeof window === 'undefined') return;
    if (active) sessionStorage.setItem('silocom_admin_auth', 'true');
    else sessionStorage.removeItem('silocom_admin_auth');
  }
}
