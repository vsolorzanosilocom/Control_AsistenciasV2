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
  HOJA_PUSH: 'DispositivosPush',
  URL_VERCEL_PUSH: 'https://silocom.vercel.app/api/send-push',
  PUSH_SECRET: 'silocom_push_sec_2026',
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

    if (action === 'probarPushRemoto') {
      return respuestaJSON(enviarPushRemoto(
        'Silocom C.A. - Notificación Remota',
        'Prueba de despacho remoto ejecutada desde Google Apps Script.',
        'silocom-test-remoto'
      ));
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
    } else if (action === 'guardarSuscripcionPush') {
      return respuestaJSON(guardarSuscripcionPush(data));
    } else if (action === 'enviarPushRemoto') {
      return respuestaJSON(enviarPushRemoto(data.titulo, data.mensaje || data.cuerpo, data.tag, data.filtroUserId));
    } else if (action === 'instalarTriggersHorarios') {
      return respuestaJSON(instalarTriggersHorarios());
    } else if (action === 'eliminarTriggersHorarios') {
      return respuestaJSON(eliminarTriggersHorarios());
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
        if (val.includes('vercel') && datos[r][c + 1]) {
          configDinamica.urlVercelPush = datos[r][c + 1].toString().trim();
        }
      }
    }
  } catch (e) {}

  return configDinamica;
}

// ================= GESTIÓN DE NOTIFICACIONES PUSH REMOTAS =================

/**
 * Registra o actualiza la suscripción Web Push de un dispositivo en la hoja "DispositivosPush"
 */
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

/**
 * Obtiene la lista de suscripciones activas registradas en la hoja DispositivosPush
 */
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

/**
 * Despacha una notificación Push remota hacia la API de Vercel (/api/send-push)
 */
function enviarPushRemoto(titulo, cuerpo, tag, filtroUserId) {
  try {
    const subs = obtenerSuscripcionesPushActivas(filtroUserId);
    if (subs.length === 0) {
      return { success: true, message: 'No hay dispositivos suscritos para recibir push.', enviados: 0 };
    }

    const cfg = obtenerConfiguracionDinamica();
    const urlVercel = cfg.urlVercelPush || CONFIG.URL_VERCEL_PUSH;

    const payload = {
      secret: CONFIG.PUSH_SECRET,
      subscriptions: subs,
      notification: {
        title: titulo || 'Silocom C.A. - Recordatorio',
        body: cuerpo || 'Recordatorio de asistencia de jornada laboral.',
        tag: tag || 'silocom-push-reminder'
      }
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(urlVercel, options);
    const code = response.getResponseCode();
    const text = response.getContentText();

    let jsonRes = {};
    try { jsonRes = JSON.parse(text); } catch (e) {}

    // Desactivar endpoints que hayan caducado en la red
    if (jsonRes && Array.isArray(jsonRes.expiredEndpoints) && jsonRes.expiredEndpoints.length > 0) {
      desactivarEndpointsCaducados(jsonRes.expiredEndpoints);
    }

    return {
      success: code >= 200 && code < 300,
      statusCode: code,
      enviados: jsonRes.sent || 0,
      fallidos: jsonRes.failed || 0,
      message: 'Despacho completado. Respuesta Vercel: ' + text
    };
  } catch (err) {
    return { success: false, message: 'Error en llamada a Vercel Push: ' + err.message };
  }
}

/**
 * Marca como INACTIVO cualquier endpoint caducado reportado por Vercel
 */
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

/**
 * 07:45 AM - Recordatorio diario de Entrada (Lunes a Viernes)
 */
function disparadorManana0745() {
  const hoy = new Date();
  const diaSemana = hoy.getDay();
  // 0 = Domingo, 6 = Sábado
  if (diaSemana === 0 || diaSemana === 6) return;

  enviarPushRemoto(
    'Silocom C.A. - Recordatorio de Entrada (07:45 AM)',
    'Buenos días, recuerda registrar tu ENTRADA al ingresar a la sede Silocom.',
    'silocom-0745-entrada'
  );
}

/**
 * 08:30 AM - Aviso por Olvido (Valida en tiempo real si el empleado YA marcó hoy)
 */
function disparadorOlvido0830() {
  const hoy = new Date();
  const diaSemana = hoy.getDay();
  if (diaSemana === 0 || diaSemana === 6) return;

  const fechaHoyStr = Utilities.formatDate(hoy, 'America/Caracas', 'dd/MM/yyyy');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaAsistencias = ss.getSheetByName(CONFIG.HOJA_ASISTENCIAS);
  if (!hojaAsistencias) return;

  // Empleados que ya marcaron entrada hoy
  const entradasHoy = {};
  const datos = hojaAsistencias.getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) {
    const id = (datos[i][0] || '').toString().trim().toLowerCase();
    const tipo = (datos[i][2] || '').toString().trim().toUpperCase();
    const fechaHora = (datos[i][3] || '').toString().trim();
    if (fechaHora.startsWith(fechaHoyStr) && tipo === 'ENTRADA') {
      entradasHoy[id] = true;
    }
  }

  // Lista de empleados activos
  const empleados = obtenerListaEmpleados();
  for (let j = 0; j < empleados.length; j++) {
    const empId = empleados[j].id.toLowerCase();
    // Si NO ha marcado entrada hoy, emitir la alerta a su teléfono
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

/**
 * 16:30 PM - Recordatorio de Salida (Lunes a Viernes)
 */
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

/**
 * Instala todos los activadores horarios en Google Apps Script en un solo clic
 */
function instalarTriggersHorarios() {
  eliminarTriggersHorarios();

  // 07:45 AM (Aproximado ventana 7 a 8 o nearMinute 45)
  ScriptApp.newTrigger('disparadorManana0745')
    .timeBased()
    .atHour(7)
    .nearMinute(45)
    .everyDays(1)
    .inTimezone('America/Caracas')
    .create();

  // 08:30 AM (Validación de olvido)
  ScriptApp.newTrigger('disparadorOlvido0830')
    .timeBased()
    .atHour(8)
    .nearMinute(30)
    .everyDays(1)
    .inTimezone('America/Caracas')
    .create();

  // 16:30 PM (Recordatorio de salida)
  ScriptApp.newTrigger('disparadorSalida1630')
    .timeBased()
    .atHour(16)
    .nearMinute(30)
    .everyDays(1)
    .inTimezone('America/Caracas')
    .create();

  // 17:30 PM (Cierre Automático de Turnos)
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

/**
 * Elimina los triggers horarios para evitar duplicidades
 */
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

/**
 * Responde formateando en JSON con encabezados MIME correctos
 */
function respuestaJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
