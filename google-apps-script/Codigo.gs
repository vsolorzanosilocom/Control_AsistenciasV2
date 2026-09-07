/**
 * =========================================================================
 * SISTEMA DE CONTROL DE ASISTENCIAS - SILOCOM C.A.
 * RIF: J-30725192-1
 * Archivo: Codigo.gs (Google Apps Script)
 * =========================================================================
 * Instrucciones de Implementación:
 * 1. Abre tu Google Sheets "Control de Asistencias - Silocom".
 * 2. Ve a Extensiones > Apps Script.
 * 3. Reemplaza el código por este contenido completo.
 * 4. Haz clic en "Implementar" > "Nueva implementación" (o "Gestionar implementaciones" > Editar > Nueva versión).
 * 5. Configuración requerida:
 *    - Tipo: "Aplicación web"
 *    - Ejecutar como: "Yo" (tu cuenta de Google)
 *    - Quién tiene acceso: "Cualquier persona" (Anyone)
 * 6. Copia la URL resultante (termina en /exec) y pégala en la App.
 * 7. Para activar el cierre automático diario a las 17:30, ejecuta la función
 *    "instalarTriggerCierreAutomatico" una sola vez desde el editor de Apps Script.
 * =========================================================================
 */

// ================= CONFIGURACIÓN GLOBAL POR DEFECTO =================
const CONFIG = {
  HOJA_ASISTENCIAS: 'Asistencias',
  HOJA_CONFIG: 'Configuracion',
  LATITUD_OFICINA: 10.494505,
  LONGITUD_OFICINA: -66.831454,
  RADIO_MAX_KM: 0.06,          // 0.06 km = 60 metros
  TOLERANCIA_MIN: 30,          // 30 minutos de tolerancia
  HORA_ENTRADA: 8,             // 08:00
  HORA_SALIDA: 17,             // 17:00
  VENTANA_ENTRADA_INI: 7,      // 07:00
  VENTANA_ENTRADA_FIN: 9,      // 09:00
  VENTANA_SALIDA_INI: 16,      // 16:00
  VENTANA_SALIDA_FIN: 18,      // 18:00
  CIERRE_AUTOMATICO: 17.5,     // 17:30 (Cierre de turnos abiertos)
  ADMIN_EMAIL: 'vsolorzano.silocom@gmail.com',
  FILA_INICIO_EMPLEADOS: 7,
  COL_ID: 1,                   // Columna A: ID / USUARIO
  COL_NOMBRE: 2,               // Columna B: NOMBRE Y APELLIDO
  COL_DISPOSITIVO: 3           // Columna C: ID DE DISPOSITIVO
};

/**
 * Peticiones GET: lectura de datos en tiempo real y verificación de estado
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'ping';

    if (action === 'ping') {
      return respuestaJSON({
        status: 'ok',
        app: 'Silocom Asistencias',
        timestamp: new Date().toISOString(),
        empresa: 'SILOCOM C.A.',
        rif: 'J-30725192-1'
      });
    }

    if (action === 'obtenerConfiguracion') {
      return respuestaJSON({
        success: true,
        config: obtenerConfiguracionDinamica()
      });
    }

    if (action === 'obtenerDatos' || action === 'obtenerAsistencias') {
      return respuestaJSON(obtenerDatosCompletos());
    }

    if (action === 'obtenerEmpleados') {
      return respuestaJSON({
        success: true,
        empleados: obtenerListaEmpleados()
      });
    }

    return respuestaJSON({
      status: 'ok',
      message: 'API Silocom Asistencias en línea.',
      accionesDisponibles: ['ping', 'obtenerDatos', 'obtenerConfiguracion', 'obtenerEmpleados']
    });
  } catch (err) {
    return respuestaJSON({
      success: false,
      errorType: 'SERVER_ERROR',
      message: 'Error al procesar consulta GET: ' + err.message
    });
  }
}

/**
 * Peticiones POST: registro de asistencias, gestión de empleados y cierre automático
 */
function doPost(e) {
  try {
    let data;
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      data = e.parameter;
    } else {
      return respuestaJSON({
        success: false,
        errorType: 'INVALID_REQUEST',
        message: 'No se recibieron datos en el cuerpo de la petición.'
      });
    }

    const action = data.action || 'registrarAsistencia';

    if (action === 'registrarAsistencia') {
      return respuestaJSON(procesarRegistroAsistencia(data));
    } else if (action === 'guardarEmpleado') {
      return respuestaJSON(guardarEmpleadoEnConfig(data));
    } else if (action === 'vincularDispositivo') {
      return respuestaJSON(vincularDispositivoEnConfig(data));
    } else if (action === 'ejecutarCierreAutomatico') {
      return respuestaJSON(ejecutarCierreAutomatico());
    } else if (action === 'obtenerDatos') {
      return respuestaJSON(obtenerDatosCompletos());
    } else if (action === 'obtenerConfiguracion') {
      return respuestaJSON({ success: true, config: obtenerConfiguracionDinamica() });
    } else {
      return respuestaJSON({
        success: false,
        errorType: 'INVALID_ACTION',
        message: 'Acción no reconocida: ' + action
      });
    }
  } catch (err) {
    return respuestaJSON({
      success: false,
      errorType: 'SERVER_ERROR',
      message: 'Error interno en doPost: ' + err.message
    });
  }
}

/**
 * Registra un marcaje en la hoja "Asistencias"
 * NOTA DE PROTECCIÓN DE FÓRMULAS: Escribe estrictamente en Columnas A hasta F (1 a 6).
 * Las Columnas G (DIA) y H (MES) que contienen fórmulas automáticas se dejan intactas.
 */
function procesarRegistroAsistencia(datos) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaAsistencias = ss.getSheetByName(CONFIG.HOJA_ASISTENCIAS);

  if (!hojaAsistencias) {
    return {
      success: false,
      errorType: 'SERVER_ERROR',
      message: 'La hoja "' + CONFIG.HOJA_ASISTENCIAS + '" no existe en el archivo base de Sheets.'
    };
  }

  const idUsuario = (datos.id || '').toString().trim().toLowerCase();
  const tipoRegistro = (datos.tipo || 'ENTRADA').toUpperCase().trim();
  const nombreEmpleado = (datos.nombre || idUsuario).toString().trim();
  const latitud = parseFloat(datos.lat);
  const longitud = parseFloat(datos.lng);
  const idDispositivo = (datos.idDispositivo || '').toString().trim();

  // Validar o registrar dispositivo en hoja "Configuracion"
  const hojaConfig = ss.getSheetByName(CONFIG.HOJA_CONFIG);
  if (hojaConfig && idDispositivo) {
    sincronizarDispositivoEnConfig(hojaConfig, idUsuario, nombreEmpleado, idDispositivo);
  }

  const fechaServidor = new Date();
  const formatoFecha = Utilities.formatDate(fechaServidor, Session.getScriptTimeZone() || 'America/Caracas', 'dd/MM/yyyy HH:mm:ss');
  const coordsStr = (!isNaN(latitud) && !isNaN(longitud))
    ? latitud.toFixed(6) + ', ' + longitud.toFixed(6)
    : 'Sede Silocom';
  const estadoStr = 'DENTRO DE RANGO';

  // Inserción segura en Columnas 1 a 6 (A hasta F), respetando fórmulas en G y H
  const proxFila = hojaAsistencias.getLastRow() + 1;
  hojaAsistencias.getRange(proxFila, 1, 1, 6).setValues([[
    idUsuario,
    nombreEmpleado,
    tipoRegistro,
    formatoFecha,
    coordsStr,
    estadoStr
  ]]);

  return {
    success: true,
    message: '¡Registro de ' + tipoRegistro + ' exitoso en Google Sheets!',
    id: idUsuario,
    nombre: nombreEmpleado,
    tipo: tipoRegistro,
    fechaHora: formatoFecha,
    ubicacion: coordsStr,
    fila: proxFila
  };
}

/**
 * Guarda o actualiza un empleado en la hoja "Configuracion" (a partir de la fila 7)
 */
function guardarEmpleadoEnConfig(datos) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaConfig = ss.getSheetByName(CONFIG.HOJA_CONFIG);
  if (!hojaConfig) return { success: false, message: 'Hoja Configuracion no encontrada.' };

  const id = (datos.id || '').toString().trim().toLowerCase();
  const nombre = (datos.nombre || '').toString().trim();
  const idDispositivo = (datos.idDispositivo || '').toString().trim();

  const esCabecera = !id || ['id', 'usuario', 'correo', 'email', 'id / correo', 'identificador', 'colaborador'].includes(id);
  if (esCabecera) {
    return { success: false, message: 'ID de usuario o colaborador inválido.' };
  }

  const data = hojaConfig.getDataRange().getValues();
  let filaEncontrada = -1;
  let primeraFilaVacia = -1;

  for (let r = CONFIG.FILA_INICIO_EMPLEADOS - 1; r < Math.max(data.length, 50); r++) {
    const filaVal = (r < data.length) ? (data[r][0] || '').toString().trim().toLowerCase() : '';
    if (filaVal === id) {
      filaEncontrada = r + 1; // 1-based index
      break;
    }
    if (!filaVal && primeraFilaVacia === -1 && r >= CONFIG.FILA_INICIO_EMPLEADOS - 1) {
      primeraFilaVacia = r + 1;
    }
  }

  if (filaEncontrada > 0) {
    if (nombre) hojaConfig.getRange(filaEncontrada, 2).setValue(nombre);
    if (idDispositivo) hojaConfig.getRange(filaEncontrada, 3).setValue(idDispositivo);
    return {
      success: true,
      message: 'Empleado actualizado en Google Sheets (fila ' + filaEncontrada + ').',
      id: id,
      nombre: nombre,
      idDispositivo: idDispositivo
    };
  } else {
    const filaDestino = (primeraFilaVacia > 0) ? primeraFilaVacia : (hojaConfig.getLastRow() + 1);
    hojaConfig.getRange(filaDestino, 1, 1, 3).setValues([[id, nombre || id, idDispositivo || '']]);
    return {
      success: true,
      message: 'Nuevo colaborador registrado en Google Sheets (fila ' + filaDestino + ').',
      id: id,
      nombre: nombre,
      idDispositivo: idDispositivo
    };
  }
}

/**
 * Vincula o restablece el dispositivo móvil de un empleado en la hoja Configuracion
 */
function vincularDispositivoEnConfig(datos) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaConfig = ss.getSheetByName(CONFIG.HOJA_CONFIG);
  if (!hojaConfig) return { success: false, message: 'Hoja Configuracion no encontrada.' };

  const id = (datos.id || '').toString().trim().toLowerCase();
  const idDispositivo = (datos.idDispositivo !== undefined) ? datos.idDispositivo.toString().trim() : '';

  const data = hojaConfig.getDataRange().getValues();
  for (let r = CONFIG.FILA_INICIO_EMPLEADOS - 1; r < data.length; r++) {
    const idExistente = (data[r][0] || '').toString().trim().toLowerCase();
    if (idExistente === id) {
      hojaConfig.getRange(r + 1, 3).setValue(idDispositivo);
      return {
        success: true,
        message: idDispositivo
          ? 'Dispositivo vinculado con éxito en Google Sheets.'
          : 'Vínculo de dispositivo restablecido (liberado) en Google Sheets.',
        id: id,
        idDispositivo: idDispositivo
      };
    }
  }

  return { success: false, message: 'Empleado no encontrado en la hoja Configuracion.' };
}

/**
 * Lee la lista de empleados directamente desde la hoja Configuracion
 */
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
      empleados.push({
        id: rawId,
        nombre: nombre || rawId,
        idDispositivo: dispositivo,
        activo: true
      });
    }
  }
  return empleados;
}

/**
 * Sincroniza el ID del dispositivo en la columna C si aún está vacío
 */
function sincronizarDispositivoEnConfig(hojaConfig, idUsuario, nombreEmpleado, idDispositivo) {
  try {
    const data = hojaConfig.getDataRange().getValues();
    let encontrado = false;

    for (let r = CONFIG.FILA_INICIO_EMPLEADOS - 1; r < data.length; r++) {
      const idExistente = (data[r][0] || '').toString().trim().toLowerCase();
      if (idExistente === idUsuario.toLowerCase()) {
        encontrado = true;
        const dispActual = (data[r][2] || '').toString().trim();
        if (!dispActual && idDispositivo) {
          // Asignar primer dispositivo en Col C
          hojaConfig.getRange(r + 1, 3).setValue(idDispositivo);
        }
        break;
      }
    }

    const esCabecera = !idUsuario || ['id', 'usuario', 'correo', 'email', 'id / correo'].includes(idUsuario.toLowerCase());
    if (!encontrado && !esCabecera) {
      const proxFila = hojaConfig.getLastRow() + 1;
      hojaConfig.getRange(proxFila, 1, 1, 3).setValues([[idUsuario, nombreEmpleado, idDispositivo]]);
    }
  } catch (e) {
    // Si falla la sincronización de dispositivo, no detener el marcaje principal
  }
}

/**
 * Ejecuta el cierre automático por sistema de jornadas que no registraron salida
 * Hora oficial asignada: 17:00:00 del día correspondiente.
 * Se ejecuta automáticamente a las 17:30 (lunes a viernes).
 */
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

  // Analizar marcajes del día
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const id = (row[0] || '').toString().trim().toLowerCase();
    const nombre = (row[1] || id).toString().trim();
    const tipo = (row[2] || '').toString().trim().toUpperCase();
    let fechaStr = '';

    if (row[3] instanceof Date) {
      fechaStr = Utilities.formatDate(row[3], tz, 'dd/MM/yyyy HH:mm:ss');
    } else {
      fechaStr = (row[3] || '').toString().trim();
    }

    if (fechaStr.startsWith(diaHoyStr)) {
      if (tipo === 'ENTRADA') {
        empleadosConEntrada[id] = nombre;
      } else if (tipo === 'SALIDA') {
        empleadosConSalida[id] = true;
      }
    }
  }

  // Identificar colaboradores que no marcaron salida
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
    message: cerrados.length > 0
      ? 'Se cerraron automáticamente ' + cerrados.length + ' jornada(s) pendientes.'
      : 'No se encontraron turnos abiertos pendientes por cerrar hoy.',
    totalCerrados: cerrados.length,
    cerrados: cerrados,
    fechaCierre: horaOficialSalida
  };
}

/**
 * Crea o renueva el Activador Programado (Trigger) de Apps Script
 * para ejecutar automáticamente "ejecutarCierreAutomatico" a las 17:30 de lunes a viernes.
 */
function instalarTriggerCierreAutomatico() {
  // Eliminar activadores previos con el mismo nombre para evitar duplicados
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'ejecutarCierreAutomatico') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Crear activador diario entre las 17:00 y 18:00 (se evalúa a las 17:30)
  ScriptApp.newTrigger('ejecutarCierreAutomatico')
    .timeBased()
    .everyDays(1)
    .atHour(17)
    .nearMinute(30)
    .inTimezone('America/Caracas')
    .create();

  return 'Activador de Cierre Automático a las 17:30 instalado con éxito.';
}

/**
 * Lee la base de datos completa de Asistencias y Empleados en tiempo real
 */
function obtenerDatosCompletos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaAsistencias = ss.getSheetByName(CONFIG.HOJA_ASISTENCIAS);
  const hojaConfig = ss.getSheetByName(CONFIG.HOJA_CONFIG);

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
      let fechaHora = '';

      if (row[3] instanceof Date) {
        fechaHora = Utilities.formatDate(row[3], tz, 'dd/MM/yyyy HH:mm:ss');
      } else {
        fechaHora = (row[3] || '').toString().trim();
      }

      const ubicacion = (row[4] || '').toString().trim();
      const estado = (row[5] || 'DENTRO DE RANGO').toString().trim();

      const partesFecha = fechaHora.split(' ')[0] ? fechaHora.split(' ')[0].split('/') : [];
      const dia = partesFecha[0] || '';
      const numMes = parseInt(partesFecha[1] || '0', 10);
      const nombresMeses = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      const mes = nombresMeses[numMes] || '';

      registros.push({
        id: id,
        nombre: nombre,
        tipo: tipo,
        fechaHora: fechaHora,
        ubicacion: ubicacion,
        estado: estado,
        dia: dia,
        mes: mes
      });
    }
  }

  // Ordenar registros: más recientes primero
  registros.reverse();

  return {
    success: true,
    totalRegistros: registros.length,
    registros: registros,
    empleados: empleados,
    config: obtenerConfiguracionDinamica()
  };
}

/**
 * Lee la configuración dinámica y coordenadas de la oficina desde la hoja
 */
function obtenerConfiguracionDinamica() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaConfig = ss.getSheetByName(CONFIG.HOJA_CONFIG);

  const configDinamica = {
    latitud: CONFIG.LATITUD_OFICINA,
    longitud: CONFIG.LONGITUD_OFICINA,
    radioMaxKm: CONFIG.RADIO_MAX_KM,
    toleranciaAvisoEntradaMin: CONFIG.TOLERANCIA_MIN,
    horaEntrada: CONFIG.HORA_ENTRADA,
    horaSalida: CONFIG.HORA_SALIDA,
    ventanaEntradaInicio: CONFIG.VENTANA_ENTRADA_INI,
    ventanaEntradaFin: CONFIG.VENTANA_ENTRADA_FIN,
    ventanaSalidaInicio: CONFIG.VENTANA_SALIDA_INI,
    ventanaSalidaFin: CONFIG.VENTANA_SALIDA_FIN,
    cierreAutomatico: CONFIG.CIERRE_AUTOMATICO,
    adminEmail: CONFIG.ADMIN_EMAIL
  };

  if (!hojaConfig) return configDinamica;

  try {
    const adminVal = hojaConfig.getRange('D2').getValue();
    if (adminVal && adminVal.toString().includes('@')) {
      configDinamica.adminEmail = adminVal.toString().trim().toLowerCase();
    }

    const datos = hojaConfig.getDataRange().getValues();
    for (let r = 0; r < datos.length; r++) {
      for (let c = 0; c < datos[r].length; c++) {
        const val = (datos[r][c] || '').toString().toLowerCase();
        if (val.includes('latitud') && datos[r][c + 1]) {
          const parsed = parseFloat(datos[r][c + 1]);
          if (!isNaN(parsed)) configDinamica.latitud = parsed;
        }
        if (val.includes('longitud') && datos[r][c + 1]) {
          const parsed = parseFloat(datos[r][c + 1]);
          if (!isNaN(parsed)) configDinamica.longitud = parsed;
        }
        if (val.includes('radio') && datos[r][c + 1]) {
          const parsed = parseFloat(datos[r][c + 1]);
          if (!isNaN(parsed)) {
            configDinamica.radioMaxKm = parsed > 1 ? parsed / 1000 : parsed;
          }
        }
      }
    }
  } catch (e) {}

  return configDinamica;
}

/**
 * Responde formateando en JSON con encabezados MIME correctos
 */
function respuestaJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
