import { OfficeConfig } from '../types';

/**
 * Genera el código completo y actualizado de Google Apps Script (Codigo.gs) Versión 2.6
 * con Inteligencia Centralizada en Railway, Horarios Dinámicos y Protección de Fórmulas.
 */
export function getGasScriptCode(config: OfficeConfig): string {
  const lat = config?.latitud ?? 10.494505;
  const lng = config?.longitud ?? -66.831454;
  const radio = config?.radioMaxKm ?? 0.06;
  const adminEmail = config?.adminEmail || 'vsolorzano.silocom@gmail.com';

  return `/**
 * =========================================================================
 * SISTEMA DE CONTROL DE ASISTENCIAS - SILOCOM C.A.
 * RIF: J-30725192-1
 * Archivo: Codigo.gs (Google Apps Script)
 * Versión: 2.6 (Inteligencia Centralizada en Railway & Horarios Dinámicos)
 * =========================================================================
 * 🚀 NOVEDAD ARQUITECTÓNICA (Sin Triggers en Google Apps Script):
 * A partir de esta versión, YA NO ES NECESARIO instalar activadores/triggers
 * en el reloj de Google Apps Script.
 * 
 * El servidor persistente de Silocom en Railway (Node.js 24/7):
 * 1. Lee automáticamente tus horarios desde la hoja 'Configuracion' (7:45, 8:30, 16:30, 17:30).
 * 2. Si cambias los horarios en Sheets, Railway los detecta dinámicamente sin reinstalar código.
 * 3. Despacha todos los recordatorios Push a los celulares sin depender de la cuota de Google.
 * 4. Invoca el cierre automático diario de turnos a la hora fijada.
 * 
 * Pasos de Implementación:
 * 1. Abre tu Google Sheets "Control de Asistencias - Silocom".
 * 2. Ve a Extensiones > Apps Script.
 * 3. Selecciona todo (Ctrl + A), bórralo y pega este código completo.
 * 4. Guarda con el botón del Disquete (Ctrl + S).
 * 5. Haz clic en "Implementar > Gestionar implementaciones > Editar (lápiz) > Nueva versión > Implementar".
 * 6. (Opcional) Si tenías activadores viejos en Google, ejecuta la función
 *    "eliminarTriggersHorarios" para limpiarlos.
 * =========================================================================
 */

const CONFIG = {
  HOJA_ASISTENCIAS: 'Asistencias',
  HOJA_CONFIG: 'Configuracion',
  HOJA_PUSH: 'DispositivosPush',
  URL_PUSH_SERVER: 'https://silocom-production.up.railway.app/api/send-push', // Coloca aquí la URL pública de tu app en Railway (ej: https://silocom-production.up.railway.app/api/send-push)
  PUSH_SECRET: 'silocom_push_sec_2026',
  LATITUD_OFICINA: ${lat},
  LONGITUD_OFICINA: ${lng},
  RADIO_MAX_KM: ${radio},
  TOLERANCIA_MIN: 30,
  HORA_ENTRADA: 8,
  HORA_SALIDA: 17,
  RECORDATORIO_ENTRADA: '07:45',
  AVISO_OLVIDO_ENTRADA: '08:30',
  AVISO_PREVIO_SALIDA: '16:30',
  VENTANA_ENTRADA_INI: 7,
  VENTANA_ENTRADA_FIN: 9,
  VENTANA_SALIDA_INI: 16,
  VENTANA_SALIDA_FIN: 18,
  CIERRE_AUTOMATICO: 17.5,
  ADMIN_EMAIL: '${adminEmail}',
  FILA_INICIO_EMPLEADOS: 7,
  COL_ID: 1,
  COL_NOMBRE: 2,
  COL_DISPOSITIVO: 3
};

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

    if (action === 'probarPushRemoto' || action === 'probarPushDesdeGAS') {
      return respuestaJSON(probarPushDesdeGAS());
    }

    return respuestaJSON({
      status: 'ok',
      message: 'API Silocom Asistencias en línea (Versión 2.6 - Centralizada en Railway).'
    });
  } catch (err) {
    return respuestaJSON({
      success: false,
      errorType: 'SERVER_ERROR',
      message: err.message
    });
  }
}

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
        message: 'No se recibieron datos en el cuerpo de la petición.'
      });
    }

    const action = data.action || 'registrarAsistencia';

    if (action === 'registrarAsistencia') return respuestaJSON(procesarRegistroAsistencia(data));
    if (action === 'guardarEmpleado') return respuestaJSON(guardarEmpleadoEnConfig(data));
    if (action === 'vincularDispositivo') return respuestaJSON(vincularDispositivoEnConfig(data));
    if (action === 'ejecutarCierreAutomatico') return respuestaJSON(ejecutarCierreAutomatico());
    if (action === 'obtenerDatos') return respuestaJSON(obtenerDatosCompletos());
    if (action === 'obtenerConfiguracion') return respuestaJSON({ success: true, config: obtenerConfiguracionDinamica() });
    if (action === 'guardarSuscripcionPush') return respuestaJSON(guardarSuscripcionPush(data));
    if (action === 'enviarPushRemoto') return respuestaJSON(enviarPushRemoto(data.titulo, data.mensaje || data.cuerpo, data.tag, data.filtroUserId));
    if (action === 'instalarTriggersHorarios') return respuestaJSON(instalarTriggersHorarios());
    if (action === 'eliminarTriggersHorarios') return respuestaJSON(eliminarTriggersHorarios());

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

  const tz = Session.getScriptTimeZone() || 'America/Caracas';
  const fechaServidor = new Date();
  const formatoFecha = Utilities.formatDate(fechaServidor, tz, 'dd/MM/yyyy HH:mm:ss');
  const coordsStr = (!isNaN(latitud) && !isNaN(longitud))
    ? latitud.toFixed(6) + ', ' + longitud.toFixed(6)
    : 'Sede Silocom';

  const estadoStr = (datos.estado || 'DENTRO DE RANGO').toString().trim();

  // PROTECCIÓN DE FÓRMULAS: Inserción exclusiva en Columnas 1 a 6 (A a F)
  // Las Columnas G (DIA) y H (MES) conservan sus fórmulas nativas de Google Sheets
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
    message: '¡Registro guardado en Google Sheets!',
    fechaHora: formatoFecha,
    id: idUsuario,
    nombre: nombreEmpleado,
    tipo: tipoRegistro,
    ubicacion: coordsStr,
    estado: estadoStr,
    fila: proxFila
  };
}

function guardarEmpleadoEnConfig(datos) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaConfig = ss.getSheetByName(CONFIG.HOJA_CONFIG);
  if (!hojaConfig) return { success: false, message: 'Hoja Configuracion no encontrada.' };

  const id = (datos.id || '').toString().trim().toLowerCase();
  const nombre = (datos.nombre || '').toString().trim();
  const idDispositivo = (datos.idDispositivo || '').toString().trim();

  const esCabecera = !id || ['id', 'usuario', 'correo', 'email', 'id / correo', 'identificador', 'colaborador'].includes(id);
  if (esCabecera) {
    return { success: false, message: 'ID de colaborador inválido.' };
  }

  const data = hojaConfig.getDataRange().getValues();
  for (let r = CONFIG.FILA_INICIO_EMPLEADOS - 1; r < data.length; r++) {
    if ((data[r][0] || '').toString().trim().toLowerCase() === id) {
      if (nombre) hojaConfig.getRange(r + 1, 2).setValue(nombre);
      if (idDispositivo) hojaConfig.getRange(r + 1, 3).setValue(idDispositivo);
      return { success: true, message: 'Empleado actualizado en Sheets.', id, nombre, idDispositivo };
    }
  }

  const proxFila = hojaConfig.getLastRow() + 1;
  hojaConfig.getRange(proxFila, 1, 1, 3).setValues([[id, nombre || id, idDispositivo || '']]);
  return { success: true, message: 'Colaborador creado en Google Sheets.', id, nombre, idDispositivo };
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
      return { success: true, message: 'Dispositivo actualizado en Sheets.', id, idDispositivo };
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

    const esCabecera = !idUsuario || ['id', 'usuario', 'correo', 'email', 'id / correo'].includes(idUsuario.toLowerCase());
    if (!esCabecera) {
      const proxFila = hojaConfig.getLastRow() + 1;
      hojaConfig.getRange(proxFila, 1, 1, 3).setValues([[idUsuario, nombreEmpleado, idDispositivo]]);
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
    let fechaStr = (row[3] instanceof Date)
      ? Utilities.formatDate(row[3], tz, 'dd/MM/yyyy HH:mm:ss')
      : (row[3] || '').toString().trim();

    if (fechaStr.startsWith(diaHoyStr)) {
      if (tipo === 'ENTRADA') empleadosConEntrada[id] = nombre;
      if (tipo === 'SALIDA') empleadosConSalida[id] = true;
    }
  }

  const cerrados = [];
  for (const empId in empleadosConEntrada) {
    if (!empleadosConSalida[empId]) {
      const proxFila = hojaAsistencias.getLastRow() + 1;
      // PROTECCIÓN DE FÓRMULAS: Inserción en Columnas 1 a 6 (A a F)
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
      : 'No hay turnos abiertos pendientes.',
    totalCerrados: cerrados.length,
    cerrados: cerrados,
    fechaCierre: horaOficialSalida
  };
}

// ================= GESTIÓN DE NOTIFICACIONES PUSH REMOTAS =================

function guardarSuscripcionPush(datos) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let hojaPush = ss.getSheetByName(CONFIG.HOJA_PUSH);

    if (!hojaPush) {
      hojaPush = ss.insertSheet(CONFIG.HOJA_PUSH);
      hojaPush.appendRow(['FECHA_REGISTRO', 'ID_USUARIO', 'NOMBRE', 'ENDPOINT', 'P256DH', 'AUTH', 'ESTADO']);
      hojaPush.getRange('A1:G1').setBackground('#0f172a').setFontColor('#ffffff').setFontWeight('bold');
      hojaPush.setFrozenRows(1);
    }

    const endpoint = (datos.endpoint || (datos.subscription && datos.subscription.endpoint) || '').toString().trim();
    if (!endpoint) {
      return { success: false, message: 'Falta endpoint en la suscripción Push.' };
    }

    const p256dh = (datos.p256dh || (datos.subscription && datos.subscription.keys && datos.subscription.keys.p256dh) || '').toString().trim();
    const auth = (datos.auth || (datos.subscription && datos.subscription.keys && datos.subscription.keys.auth) || '').toString().trim();
    const empId = (datos.empId || datos.idUsuario || 'GENERAL').toString().trim();
    const empNombre = (datos.nombre || datos.empNombre || 'Colaborador Silocom').toString().trim();
    const fechaHora = Utilities.formatDate(new Date(), 'America/Caracas', 'dd/MM/yyyy HH:mm:ss');

    const filas = hojaPush.getDataRange().getValues();
    let filaExistente = -1;

    for (let i = 1; i < filas.length; i++) {
      if (filas[i][3] && filas[i][3].toString().trim() === endpoint) {
        filaExistente = i + 1;
        break;
      }
    }

    if (filaExistente > 0) {
      hojaPush.getRange(filaExistente, 1, 1, 7).setValues([[
        fechaHora, empId, empNombre, endpoint, p256dh, auth, 'ACTIVO'
      ]]);
    } else {
      hojaPush.appendRow([fechaHora, empId, empNombre, endpoint, p256dh, auth, 'ACTIVO']);
    }

    return { success: true, message: 'Suscripción Push registrada con éxito para ' + empNombre };
  } catch (err) {
    return { success: false, message: 'Error al registrar suscripción Push: ' + err.message };
  }
}

function obtenerSuscripcionesPushActivas(filtroUserId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaPush = ss.getSheetByName(CONFIG.HOJA_PUSH);
  if (!hojaPush) return [];

  const filas = hojaPush.getDataRange().getValues();
  const subs = [];

  for (let i = 1; i < filas.length; i++) {
    const estado = (filas[i][6] || '').toString().trim().toUpperCase();
    if (estado !== 'ACTIVO') continue;

    const empId = (filas[i][1] || '').toString().trim().toLowerCase();
    if (filtroUserId && empId !== filtroUserId.toString().trim().toLowerCase() && empId !== 'general') {
      continue;
    }

    const endpoint = (filas[i][3] || '').toString().trim();
    const p256dh = (filas[i][4] || '').toString().trim();
    const auth = (filas[i][5] || '').toString().trim();

    if (endpoint && p256dh && auth) {
      subs.push({
        endpoint: endpoint,
        keys: { p256dh: p256dh, auth: auth },
        empId: filas[i][1],
        nombre: filas[i][2]
      });
    }
  }

  return subs;
}

function enviarPushRemoto(titulo, cuerpo, tag, filtroUserId) {
  try {
    const subs = obtenerSuscripcionesPushActivas(filtroUserId);
    if (subs.length === 0) {
      return { success: true, message: 'No hay dispositivos suscritos para recibir push.', enviados: 0 };
    }

    const cfg = obtenerConfiguracionDinamica();
    const urlPushServer = cfg.urlPushServer || CONFIG.URL_PUSH_SERVER;

    const payload = {
      secret: CONFIG.PUSH_SECRET,
      subscriptions: subs,
      title: titulo || 'Silocom C.A. - Recordatorio',
      body: cuerpo || 'Recordatorio de asistencia de jornada laboral.',
      tag: tag || 'silocom-push-reminder',
      data: {
        url: '/',
        timestamp: new Date().getTime()
      }
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(urlPushServer, options);
    const code = response.getResponseCode();
    const text = response.getContentText();

    let jsonRes = {};
    try { jsonRes = JSON.parse(text); } catch (e) {}

    if (jsonRes && Array.isArray(jsonRes.expiredEndpoints) && jsonRes.expiredEndpoints.length > 0) {
      desactivarEndpointsCaducados(jsonRes.expiredEndpoints);
    }

    return {
      success: code >= 200 && code < 300,
      statusCode: code,
      enviados: jsonRes.sent || 0,
      fallidos: jsonRes.failed || 0,
      message: 'Despacho completado. Respuesta Servidor Push: ' + text
    };
  } catch (err) {
    return { success: false, message: 'Error en llamada a Servidor Push: ' + err.message };
  }
}

function enviarPushNotificacion(titulo, cuerpo, tag, filtroUserId) {
  return enviarPushRemoto(titulo, cuerpo, tag, filtroUserId);
}

function enviarPushRecordatorioEntrada() {
  return disparadorManana0745();
}

function enviarPushOlvidoEntrada() {
  return disparadorOlvido0830();
}

function enviarPushRecordatorioSalida() {
  return disparadorSalida1630();
}

function probarPushDesdeGAS() {
  return enviarPushRemoto(
    'Silocom C.A. - Notificación Remota de Prueba',
    'Prueba de despacho remoto ejecutada exitosamente desde Google Apps Script hacia el Servidor Push.',
    'silocom-test-remoto'
  );
}

function desactivarEndpointsCaducados(endpointsCaducados) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaPush = ss.getSheetByName(CONFIG.HOJA_PUSH);
    if (!hojaPush) return;

    const filas = hojaPush.getDataRange().getValues();
    for (let i = 1; i < filas.length; i++) {
      const ep = (filas[i][3] || '').toString().trim();
      if (endpointsCaducados.indexOf(ep) !== -1) {
        hojaPush.getRange(i + 1, 7).setValue('INACTIVO');
      }
    }
  } catch (e) {}
}

// ================= DISPARADORES PROGRAMADOS (TIME-DRIVEN TRIGGERS) =================

function disparadorManana0745() {
  const hoy = new Date();
  const diaSemana = hoy.getDay();
  if (diaSemana === 0 || diaSemana === 6) return;

  enviarPushRemoto(
    'Silocom C.A. - Recordatorio de Entrada (07:45 AM)',
    'Buenos días, recuerda registrar tu ENTRADA al ingresar a la sede Silocom.',
    'silocom-0745-entrada'
  );
}

function disparadorOlvido0830() {
  const hoy = new Date();
  const diaSemana = hoy.getDay();
  if (diaSemana === 0 || diaSemana === 6) return;

  const tz = Session.getScriptTimeZone() || 'America/Caracas';
  const fechaHoyStr = Utilities.formatDate(hoy, tz, 'dd/MM/yyyy');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaAsistencias = ss.getSheetByName(CONFIG.HOJA_ASISTENCIAS);
  if (!hojaAsistencias) return;

  const entradasHoy = {};
  const datos = hojaAsistencias.getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) {
    const id = (datos[i][0] || '').toString().trim().toLowerCase();
    const tipo = (datos[i][2] || '').toString().trim().toUpperCase();

    let fechaHora = (datos[i][3] instanceof Date)
      ? Utilities.formatDate(datos[i][3], tz, 'dd/MM/yyyy HH:mm:ss')
      : (datos[i][3] || '').toString().trim();

    const fechaParte = fechaHora.split(' ')[0] || '';
    const esHoy = fechaParte === fechaHoyStr ||
      (fechaParte.includes('/') &&
       parseInt(fechaParte.split('/')[0], 10) === hoy.getDate() &&
       parseInt(fechaParte.split('/')[1], 10) === (hoy.getMonth() + 1) &&
       parseInt(fechaParte.split('/')[2], 10) === hoy.getFullYear());

    if (esHoy && tipo === 'ENTRADA') {
      entradasHoy[id] = true;
    }
  }

  const empleados = obtenerListaEmpleados();
  for (let j = 0; j < empleados.length; j++) {
    const empId = empleados[j].id.toLowerCase();
    if (!entradasHoy[empId]) {
      enviarPushRemoto(
        'Silocom C.A. - Aviso de Asistencia (08:30 AM)',
        'Atención ' + empleados[j].nombre + ': Aún no has registrado tu ENTRADA el día de hoy. Recuerda marcar tu asistencia al estar en sede.',
        'silocom-0830-olvido',
        empId
      );
    }
  }
}

function disparadorSalida1630() {
  const hoy = new Date();
  const diaSemana = hoy.getDay();
  if (diaSemana === 0 || diaSemana === 6) return;

  enviarPushRemoto(
    'Silocom C.A. - Fin de Jornada Laboral (04:30 PM)',
    'Buenas tardes, recuerda registrar tu SALIDA al culminar tu jornada laboral en la sede Silocom.',
    'silocom-1630-salida'
  );
}

function instalarTriggersHorarios() {
  eliminarTriggersHorarios();

  ScriptApp.newTrigger('disparadorManana0745')
    .timeBased()
    .atHour(7)
    .nearMinute(45)
    .everyDays(1)
    .inTimezone('America/Caracas')
    .create();

  ScriptApp.newTrigger('disparadorOlvido0830')
    .timeBased()
    .atHour(8)
    .nearMinute(30)
    .everyDays(1)
    .inTimezone('America/Caracas')
    .create();

  ScriptApp.newTrigger('disparadorSalida1630')
    .timeBased()
    .atHour(16)
    .nearMinute(30)
    .everyDays(1)
    .inTimezone('America/Caracas')
    .create();

  ScriptApp.newTrigger('ejecutarCierreAutomatico')
    .timeBased()
    .atHour(17)
    .nearMinute(30)
    .everyDays(1)
    .inTimezone('America/Caracas')
    .create();

  return {
    success: true,
    message: 'Triggers horarios instalados con éxito para 07:45 AM, 08:30 AM, 16:30 PM y 17:30 PM (Hora Caracas).'
  };
}

function eliminarTriggersHorarios() {
  const triggers = ScriptApp.getProjectTriggers();
  let count = 0;
  for (let i = 0; i < triggers.length; i++) {
    const fnName = triggers[i].getHandlerFunction();
    if (
      fnName === 'disparadorManana0745' ||
      fnName === 'disparadorOlvido0830' ||
      fnName === 'disparadorSalida1630' ||
      fnName === 'ejecutarCierreAutomatico' ||
      fnName === 'ejecutarCierreAutomaticoEnHorario'
    ) {
      ScriptApp.deleteTrigger(triggers[i]);
      count++;
    }
  }
  return { success: true, message: 'Se eliminaron ' + count + ' triggers antiguos.' };
}

function instalarTriggerCierreAutomatico() {
  return instalarTriggersHorarios();
}

function desinstalarTriggerCierreAutomatico() {
  return eliminarTriggersHorarios();
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

      let fechaHora = (row[3] instanceof Date)
        ? Utilities.formatDate(row[3], tz, 'dd/MM/yyyy HH:mm:ss')
        : (row[3] || '').toString().trim();

      const ubicacion = (row[4] || '').toString().trim();
      const estado = (row[5] || 'DENTRO DE RANGO').toString().trim();

      const partesFecha = fechaHora.split(' ')[0] ? fechaHora.split(' ')[0].split('/') : [];
      const numMes = parseInt(partesFecha[1] || '0', 10);
      const meses = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

      const dia = (row[6] !== undefined && row[6] !== null && row[6] !== '')
        ? row[6].toString().trim()
        : (partesFecha[0] || '');

      const mes = (row[7] !== undefined && row[7] !== null && row[7] !== '')
        ? row[7].toString().trim()
        : (meses[numMes] || '');

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

  registros.reverse();

  return {
    success: true,
    totalRegistros: registros.length,
    registros: registros,
    empleados: empleados,
    config: obtenerConfiguracionDinamica()
  };
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

function formatearHoraCadena(val, fallback) {
  if (val === null || val === undefined || val === '') return fallback;
  if (val instanceof Date) {
    var h = val.getHours();
    var m = val.getMinutes();
    return (h < 10 ? '0' + h : '' + h) + ':' + (m < 10 ? '0' + m : '' + m);
  }
  var str = val.toString().trim();
  var match = str.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    var h = parseInt(match[1], 10);
    var m = match[2];
    return (h < 10 ? '0' + h : '' + h) + ':' + m;
  }
  var num = parseFloat(str);
  if (!isNaN(num) && num >= 0 && num < 24) {
    var h = Math.floor(num);
    var m = Math.round((num - h) * 60);
    return (h < 10 ? '0' + h : '' + h) + ':' + (m < 10 ? '0' + m : '' + m);
  }
  return fallback;
}

function obtenerConfiguracionDinamica() {
  const configDinamica = {
    latitud: CONFIG.LATITUD_OFICINA,
    longitud: CONFIG.LONGITUD_OFICINA,
    radioMaxKm: CONFIG.RADIO_MAX_KM,
    toleranciaAvisoEntradaMin: CONFIG.TOLERANCIA_MIN,
    horaEntrada: CONFIG.HORA_ENTRADA,
    horaSalida: CONFIG.HORA_SALIDA,
    recordatorioEntrada: CONFIG.RECORDATORIO_ENTRADA,
    avisoOlvidoEntrada: CONFIG.AVISO_OLVIDO_ENTRADA,
    avisoPrevioSalida: CONFIG.AVISO_PREVIO_SALIDA,
    ventanaEntradaInicio: CONFIG.VENTANA_ENTRADA_INI,
    ventanaEntradaFin: CONFIG.VENTANA_ENTRADA_FIN,
    ventanaSalidaInicio: CONFIG.VENTANA_SALIDA_INI,
    ventanaSalidaFin: CONFIG.VENTANA_SALIDA_FIN,
    cierreAutomatico: '17:30',
    adminEmail: CONFIG.ADMIN_EMAIL,
    urlPushServer: CONFIG.URL_PUSH_SERVER
  };

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaConfig = ss.getSheetByName(CONFIG.HOJA_CONFIG);
    if (!hojaConfig) return configDinamica;

    // 1. LECTURA DIRECTA POR CELDAS (Estructura oficial de Silocom C.A.)
    // Tabla Superior (Filas 1 y 2):
    // A2: Latitud (10.494505) | B2: Longitud (-66.831454) | C2: Radio (60 m) | D2: Administrador (silocomca)
    try {
      const valA2 = hojaConfig.getRange('A2').getValue();
      const valB2 = hojaConfig.getRange('B2').getValue();
      const valC2 = hojaConfig.getRange('C2').getValue();
      const valD2 = hojaConfig.getRange('D2').getValue();

      if (valA2 !== '' && !isNaN(parseFloat(valA2))) configDinamica.latitud = parseFloat(valA2);
      if (valB2 !== '' && !isNaN(parseFloat(valB2))) configDinamica.longitud = parseFloat(valB2);
      if (valC2 !== '' && !isNaN(parseFloat(valC2))) {
        const rNum = parseFloat(valC2);
        configDinamica.radioMaxKm = rNum > 1 ? rNum / 1000 : rNum;
      }
      if (valD2 !== '') configDinamica.adminEmail = valD2.toString().trim();
    } catch (e1) {}

    // Tabla de Horarios (Columnas E y F, Filas 4 a 9):
    // E4: HORA ENTRADA             -> F4: 8:00
    // E5: HORA SALIDA              -> F5: 17:00
    // E6: RECORDATORIO DE ENTRADA  -> F6: 7:45
    // E7: AVISO POR OLVIDO         -> F7: 8:30
    // E8: AVISO PREVIO DE SALIDA   -> F8: 16:30
    // E9: CIERRE AUTOMÁTICO (hora) -> F9: 17:30
    try {
      const valF4 = hojaConfig.getRange('F4').getValue();
      const valF5 = hojaConfig.getRange('F5').getValue();
      const valF6 = hojaConfig.getRange('F6').getValue();
      const valF7 = hojaConfig.getRange('F7').getValue();
      const valF8 = hojaConfig.getRange('F8').getValue();
      const valF9 = hojaConfig.getRange('F9').getValue();

      if (valF4 !== '') {
        const f4Str = formatearHoraCadena(valF4, '08:00');
        configDinamica.horaEntrada = parseInt(f4Str.split(':')[0], 10) || 8;
      }
      if (valF5 !== '') {
        const f5Str = formatearHoraCadena(valF5, '17:00');
        configDinamica.horaSalida = parseInt(f5Str.split(':')[0], 10) || 17;
      }
      if (valF6 !== '') {
        configDinamica.recordatorioEntrada = formatearHoraCadena(valF6, configDinamica.recordatorioEntrada);
      }
      if (valF7 !== '') {
        configDinamica.avisoOlvidoEntrada = formatearHoraCadena(valF7, configDinamica.avisoOlvidoEntrada);
      }
      if (valF8 !== '') {
        configDinamica.avisoPrevioSalida = formatearHoraCadena(valF8, configDinamica.avisoPrevioSalida);
      }
      if (valF9 !== '') {
        configDinamica.cierreAutomatico = formatearHoraCadena(valF9, configDinamica.cierreAutomatico);
      }
    } catch (e2) {}

    // 2. ESCANEO DINÁMICO DE RESPALDO (Por si se insertan o mueven filas/columnas)
    const maxFilas = Math.min(15, hojaConfig.getLastRow() || 10);
    const maxCols = Math.min(8, hojaConfig.getLastColumn() || 6);
    const datos = hojaConfig.getRange(1, 1, maxFilas, maxCols).getValues();

    for (let r = 0; r < datos.length; r++) {
      for (let c = 0; c < datos[r].length; c++) {
        const val = (datos[r][c] || '').toString().toLowerCase().trim();
        const valorDerecha = (c + 1 < datos[r].length) ? datos[r][c + 1] : '';
        const valorAbajo = (r + 1 < datos.length) ? datos[r + 1][c] : '';
        const valorParam = valorDerecha !== '' ? valorDerecha : valorAbajo;

        if (val.includes('latitud') && valorParam !== '') {
          const p = parseFloat(valorParam);
          if (!isNaN(p)) configDinamica.latitud = p;
        }
        if (val.includes('longitud') && valorParam !== '') {
          const p = parseFloat(valorParam);
          if (!isNaN(p)) configDinamica.longitud = p;
        }
        if (val.includes('radio') && valorParam !== '') {
          const p = parseFloat(valorParam);
          if (!isNaN(p)) configDinamica.radioMaxKm = p > 1 ? p / 1000 : p;
        }
        if ((val.includes('railway') || val.includes('push') || val.includes('servidor')) && valorParam !== '') {
          configDinamica.urlPushServer = valorParam.toString().trim();
        }
        if (val.includes('recordatorio') && val.includes('entrada') && valorParam !== '') {
          configDinamica.recordatorioEntrada = formatearHoraCadena(valorParam, configDinamica.recordatorioEntrada);
        }
        if (val.includes('olvido') && valorParam !== '') {
          configDinamica.avisoOlvidoEntrada = formatearHoraCadena(valorParam, configDinamica.avisoOlvidoEntrada);
        }
        if (val.includes('previo') && val.includes('salida') && valorParam !== '') {
          configDinamica.avisoPrevioSalida = formatearHoraCadena(valorParam, configDinamica.avisoPrevioSalida);
        }
        if (val.includes('cierre') && valorParam !== '') {
          configDinamica.cierreAutomatico = formatearHoraCadena(valorParam, configDinamica.cierreAutomatico);
        }
      }
    }
  } catch (e) {}

  return configDinamica;
}

function respuestaJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
}
