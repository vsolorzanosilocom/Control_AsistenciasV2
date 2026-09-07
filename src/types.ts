export type RegistroTipo = 'ENTRADA' | 'SALIDA';

export interface AsistenciaRecord {
  id: string; // User ID / Email
  nombre: string;
  tipo: RegistroTipo;
  fechaHora: string; // dd/MM/yyyy HH:mm:ss
  ubicacion: string; // "10.494761, -66.831337"
  estado: string; // "DENTRO DE RANGO (31m)" | "CIERRE X SISTEMA"
  dia: string;
  mes: string;
  idDispositivo?: string;
  timestamp?: number;
}

export interface EmpleadoConfig {
  id: string;
  nombre: string;
  idDispositivo: string; // Device fingerprint bound to employee
  cargo?: string;
  departamento?: string;
  activo: boolean;
  sinHorarioRegulado?: boolean; // E.g. Maria Morillo in GAS code
}

export interface DiasAsistidosSummary {
  empleado: string;
  diasAsistidos: number;
  diasLaborables: number;
  diasFaltantes: number;
  porcentajeAsistencia: string;
  porcentajeNumerico: number;
}

export interface OfficeConfig {
  latitud: number;
  longitud: number;
  radioMaxKm: number; // 0.06 = 60m
  toleranciaAvisoEntradaMin: number;
  horaEntrada: number; // 8 = 08:00
  horaSalida: number; // 17 = 17:00
  ventanaEntradaInicio: number; // 7 = 07:00
  ventanaEntradaFin: number; // 9 = 09:00
  ventanaSalidaInicio: number; // 16 = 16:00
  ventanaSalidaFin: number; // 18 = 18:00
  cierreAutomatico: number; // 17.5 = 17:30
  adminEmail: string;
  googleAppsScriptUrl: string;
  googleSheetId: string;
}

export interface GPSPosition {
  lat: number;
  lng: number;
  accuracy?: number;
  distanceMetros: number;
  isWithinRange: boolean;
  timestamp: number;
}

export interface EstadoEmpleadoHoy {
  tieneEntradaHoy: boolean;
  tieneSalidaHoy: boolean;
  horaEntradaHoy?: string;
  horaSalidaHoy?: string;
  empleadoConHorario: boolean;
}
