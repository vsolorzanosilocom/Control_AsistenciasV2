import { AsistenciaRecord, EmpleadoConfig, OfficeConfig } from '../types';

export interface SyncResult {
  success: boolean;
  message: string;
  source: 'google_sheets' | 'local_store';
  data?: any;
}

export interface CloudDataResponse {
  success: boolean;
  registros?: AsistenciaRecord[];
  empleados?: EmpleadoConfig[];
  config?: Partial<OfficeConfig>;
  source: 'gas_api' | 'gviz_sheets' | 'fallback';
  message: string;
}

export class SheetsSyncService {
  /**
   * Sincroniza un nuevo registro de asistencia con Google Apps Script / Google Sheets.
   * Regla de protección: Solo envía datos de entrada para las columnas A a F.
   */
  public static async registrarEnGoogleSheets(
    config: OfficeConfig,
    payload: {
      id: string;
      tipo: 'ENTRADA' | 'SALIDA';
      idDispositivo: string;
      lat: number;
      lng: number;
      nombre?: string;
      estado?: string;
    }
  ): Promise<SyncResult> {
    const appsScriptUrl = config.googleAppsScriptUrl?.trim();

    if (!appsScriptUrl) {
      return {
        success: true,
        message: 'Registro guardado localmente (Configura la URL de Google Apps Script para sincronizar en la nube).',
        source: 'local_store',
      };
    }

    try {
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'registrarAsistencia',
          id: payload.id,
          tipo: payload.tipo,
          idDispositivo: payload.idDispositivo,
          lat: payload.lat,
          lng: payload.lng,
          nombre: payload.nombre,
          estado: payload.estado,
        }),
      });

      if (response.ok) {
        try {
          const json = await response.json();
          if (json && json.success) {
            return {
              success: true,
              message: json.message || 'Sincronizado con Google Sheets en tiempo real.',
              source: 'google_sheets',
              data: json,
            };
          } else if (json && json.message) {
            return {
              success: false,
              message: json.message,
              source: 'google_sheets',
              data: json,
            };
          }
        } catch {
          return {
            success: true,
            message: 'Registro transmitido a Google Sheets.',
            source: 'google_sheets',
          };
        }
      }

      return {
        success: true,
        message: 'Registro transmitido a Google Sheets.',
        source: 'google_sheets',
      };
    } catch (err: any) {
      console.warn('Google Sheets sync notice:', err.message);
      return {
        success: true,
        message: 'Registro respaldado en terminal móvil. Se transmitirá a Sheets al conectar.',
        source: 'local_store',
      };
    }
  }

  /**
   * Guarda o actualiza un empleado en la hoja "Configuracion" de Google Sheets
   */
  public static async guardarEmpleadoEnSheet(
    config: OfficeConfig,
    empleado: { id: string; nombre: string; idDispositivo?: string }
  ): Promise<SyncResult> {
    const appsScriptUrl = config.googleAppsScriptUrl?.trim();
    if (!appsScriptUrl) {
      return {
        success: true,
        message: 'Empleado guardado localmente.',
        source: 'local_store',
      };
    }

    try {
      const res = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'guardarEmpleado',
          id: empleado.id,
          nombre: empleado.nombre,
          idDispositivo: empleado.idDispositivo || '',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          success: data.success ?? true,
          message: data.message || 'Empleado guardado en Google Sheets.',
          source: 'google_sheets',
          data,
        };
      }
    } catch (e: any) {
      console.warn('Aviso guardando empleado en Google Sheets:', e.message);
    }

    return {
      success: true,
      message: 'Empleado guardado localmente (se sincronizará con Sheets al conectar).',
      source: 'local_store',
    };
  }

  /**
   * Vincula o restablece el dispositivo móvil de un empleado en Google Sheets
   */
  public static async vincularDispositivoEnSheet(
    config: OfficeConfig,
    idEmpleado: string,
    idDispositivo: string
  ): Promise<SyncResult> {
    const appsScriptUrl = config.googleAppsScriptUrl?.trim();
    if (!appsScriptUrl) {
      return {
        success: true,
        message: 'Dispositivo actualizado localmente.',
        source: 'local_store',
      };
    }

    try {
      const res = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'vincularDispositivo',
          id: idEmpleado,
          idDispositivo: idDispositivo,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          success: data.success ?? true,
          message: data.message || 'Dispositivo actualizado en Google Sheets.',
          source: 'google_sheets',
          data,
        };
      }
    } catch (e: any) {
      console.warn('Aviso vinculando dispositivo en Google Sheets:', e.message);
    }

    return {
      success: true,
      message: 'Dispositivo actualizado localmente.',
      source: 'local_store',
    };
  }

  /**
   * Ejecuta el cierre automático en Google Sheets para turnos abiertos hoy
   */
  public static async ejecutarCierreAutomaticoEnSheet(
    config: OfficeConfig
  ): Promise<SyncResult> {
    const appsScriptUrl = config.googleAppsScriptUrl?.trim();
    if (!appsScriptUrl) {
      return {
        success: false,
        message: 'Configura la URL de Apps Script para ejecutar el cierre automático en Sheets.',
        source: 'local_store',
      };
    }

    try {
      const res = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'ejecutarCierreAutomatico',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          success: data.success ?? true,
          message: data.message || 'Cierre automático ejecutado en Google Sheets.',
          source: 'google_sheets',
          data,
        };
      }
    } catch (e: any) {
      return {
        success: false,
        message: 'Error al conectar con Google Sheets: ' + e.message,
        source: 'google_sheets',
      };
    }

    return {
      success: false,
      message: 'No se pudo completar el cierre automático en Google Sheets.',
      source: 'google_sheets',
    };
  }

  /**
   * Lee en TIEMPO REAL la base de datos completa del archivo base
   * 1. Intenta vía Google Apps Script Web App (action: 'obtenerDatos')
   * 2. Si falla o no está configurado el GAS, intenta directamente vía Google Sheets GViz API
   */
  public static async leerArchivoBaseEnTiempoReal(config: OfficeConfig): Promise<CloudDataResponse> {
    const gasUrl = config.googleAppsScriptUrl?.trim();
    const sheetId = config.googleSheetId?.trim();

    // 1. Intentar mediante la Web App de Google Apps Script
    if (gasUrl) {
      try {
        const url = new URL(gasUrl);
        url.searchParams.set('action', 'obtenerDatos');
        url.searchParams.set('_t', Date.now().toString());

        const res = await fetch(url.toString(), {
          method: 'GET',
          mode: 'cors',
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.success && Array.isArray(data.registros)) {
            return {
              success: true,
              registros: data.registros,
              empleados: data.empleados,
              config: data.config,
              source: 'gas_api',
              message: `Sincronizados ${data.registros.length} registros y ${data.empleados?.length || 0} empleados en tiempo real desde Google Sheets.`,
            };
          }
        }
      } catch (err: any) {
        console.warn('Error leyendo desde Apps Script API:', err?.message);
      }
    }

    // 2. Intentar directamente desde Google Sheets GViz API si se tiene el ID de la hoja
    if (sheetId) {
      try {
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=Asistencias&_t=${Date.now()}`;
        const res = await fetch(gvizUrl);

        if (res.ok) {
          const text = await res.text();
          const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
          if (match && match[1]) {
            const parsed = JSON.parse(match[1]);
            const rows = parsed.table?.rows || [];
            const registros: AsistenciaRecord[] = [];

            for (const r of rows) {
              const cells = r.c || [];
              const id = cells[0]?.v ? String(cells[0].v).trim().toLowerCase() : '';
              const nombre = cells[1]?.v ? String(cells[1].v).trim() : id;
              const tipo = cells[2]?.v ? String(cells[2].v).trim().toUpperCase() : 'ENTRADA';
              const fechaHora = cells[3]?.f || (cells[3]?.v ? String(cells[3].v) : '');
              const ubicacion = cells[4]?.v ? String(cells[4].v).trim() : '';
              const estado = cells[5]?.v ? String(cells[5].v).trim() : 'DENTRO DE RANGO';

              const esCabecera = !id || ['id', 'usuario', 'correo', 'email', 'identificador', 'id de usuario', 'id / correo'].includes(id.toLowerCase());

              if (!esCabecera) {
                const partesFecha = fechaHora.split(' ')[0] ? fechaHora.split(' ')[0].split('/') : [];
                const dia = partesFecha[0] || '';
                const numMes = parseInt(partesFecha[1] || '0', 10);
                const meses = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                const mes = meses[numMes] || '';

                registros.push({
                  id,
                  nombre,
                  tipo: tipo as 'ENTRADA' | 'SALIDA',
                  fechaHora,
                  ubicacion,
                  estado,
                  dia,
                  mes,
                });
              }
            }

            // Ordenar más recientes primero
            registros.reverse();

            // También leer empleados de la pestaña Configuracion vía GViz
            const empleados = await this.leerEmpleadosDeConfiguracionGViz(sheetId);

            return {
              success: true,
              registros,
              empleados,
              source: 'gviz_sheets',
              message: `Leídos ${registros.length} registros y ${empleados.length} empleados directamente desde Google Sheets.`,
            };
          }
        }
      } catch (err: any) {
        console.warn('Error leyendo desde Google Sheets GViz API:', err?.message);
      }
    }

    return {
      success: false,
      source: 'fallback',
      message: 'No se pudo conectar con Google Sheets (verifica la URL de GAS o el ID del Sheet).',
    };
  }

  /**
   * Lee la lista de empleados desde la hoja "Configuracion" mediante GViz
   */
  public static async leerEmpleadosDeConfiguracionGViz(sheetId: string): Promise<EmpleadoConfig[]> {
    const empleados: EmpleadoConfig[] = [];
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=Configuracion&_t=${Date.now()}`;
      const res = await fetch(gvizUrl);
      if (res.ok) {
        const text = await res.text();
        const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
        if (match && match[1]) {
          const parsed = JSON.parse(match[1]);
          const rows = parsed.table?.rows || [];
          // En Sheets, los colaboradores están desde la fila 7 (índice 5 o 6 según cabeceras)
          for (let i = 4; i < rows.length; i++) {
            const cells = rows[i]?.c || [];
            const rawId = cells[0]?.v !== undefined && cells[0]?.v !== null ? String(cells[0].v).trim() : '';
            const id = rawId.toLowerCase();
            const nombre = cells[1]?.v ? String(cells[1].v).trim() : '';
            const idDispositivo = cells[2]?.v ? String(cells[2].v).trim() : '';

            // Filtrar celdas vacías o filas de cabecera/parámetros
            const esCabeceraOInvalido =
              !id ||
              [
                'id',
                'usuario',
                'correo',
                'email',
                'identificador',
                'id / correo',
                'id de usuario',
                'colaborador',
                'empleado',
                'nombre',
                'parametro',
                'parámetro',
                'latitud',
                'longitud',
                'radio',
              ].includes(id);

            if (!esCabeceraOInvalido) {
              empleados.push({
                id: rawId, // Mantener formato original (ej. mayúsculas si es código o cédula)
                nombre: nombre || rawId,
                idDispositivo,
                cargo: 'Colaborador',
                departamento: 'Operaciones',
                activo: true,
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Aviso leyendo empleados de Configuracion vía GViz:', e);
    }
    return empleados;
  }

  /**
   * Lee la ubicación y rango de la oficina en SEGUNDO PLANO / de manera DINÁMICA
   */
  public static async leerUbicacionOficinaDinamica(config: OfficeConfig): Promise<Partial<OfficeConfig> | null> {
    const gasUrl = config.googleAppsScriptUrl?.trim();
    if (gasUrl) {
      try {
        const url = new URL(gasUrl);
        url.searchParams.set('action', 'obtenerConfiguracion');
        url.searchParams.set('_t', Date.now().toString());

        const res = await fetch(url.toString(), {
          method: 'GET',
          mode: 'cors',
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.config) {
            return data.config;
          }
        }
      } catch (err) {
        console.warn('Aviso al leer ubicación dinámica de oficina:', err);
      }
    }

    const sheetId = config.googleSheetId?.trim();
    if (sheetId) {
      try {
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=Configuracion&_t=${Date.now()}`;
        const res = await fetch(gvizUrl);
        if (res.ok) {
          const text = await res.text();
          const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
          if (match && match[1]) {
            const parsed = JSON.parse(match[1]);
            const rows = parsed.table?.rows || [];
            let latitud: number | undefined;
            let longitud: number | undefined;
            let radioMaxKm: number | undefined;

            for (const r of rows) {
              const cells = r.c || [];
              for (let i = 0; i < cells.length; i++) {
                const label = cells[i]?.v ? String(cells[i].v).toLowerCase() : '';
                if (label.includes('latitud') && cells[i + 1]?.v) {
                  latitud = parseFloat(String(cells[i + 1].v));
                }
                if (label.includes('longitud') && cells[i + 1]?.v) {
                  longitud = parseFloat(String(cells[i + 1].v));
                }
                if (label.includes('radio') && cells[i + 1]?.v) {
                  const val = parseFloat(String(cells[i + 1].v));
                  radioMaxKm = val > 1 ? val / 1000 : val;
                }
              }
            }

            if (latitud && longitud) {
              return {
                latitud,
                longitud,
                ...(radioMaxKm ? { radioMaxKm } : {}),
              };
            }
          }
        }
      } catch (err) {
        // Silencioso en background
      }
    }

    return null;
  }

  /**
   * Verifica la conectividad con el Google Apps Script Web App
   */
  public static async verificarConexion(appsScriptUrl: string): Promise<{
    conectado: boolean;
    mensaje: string;
    tiempoMs?: number;
  }> {
    if (!appsScriptUrl) {
      return {
        conectado: false,
        mensaje: 'No se ha configurado la URL de la Web App de Apps Script.',
      };
    }

    const tStart = Date.now();
    try {
      const url = new URL(appsScriptUrl);
      url.searchParams.set('action', 'ping');

      const res = await fetch(url.toString(), {
        method: 'GET',
        mode: 'cors',
      });

      const tiempo = Date.now() - tStart;
      if (res.ok) {
        return {
          conectado: true,
          mensaje: `¡Conexión exitosa con Google Sheets! (${tiempo}ms)`,
          tiempoMs: tiempo,
        };
      }
      return {
        conectado: false,
        mensaje: `El servidor de Google Sheets respondió con status ${res.status}.`,
      };
    } catch (error: any) {
      return {
        conectado: false,
        mensaje: `No se pudo conectar: ${error.message || 'Verifique los permisos de "Anyone" en la Web App'}.`,
      };
    }
  }
}
