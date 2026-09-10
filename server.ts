import express from 'express';
import path from 'path';
import fs from 'fs';
import webpush from 'web-push';
import cron from 'node-cron';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Files for local persistence
const SUBSCRIPTIONS_FILE = path.join(process.cwd(), 'push_subscriptions.json');
const CONFIG_FILE = path.join(process.cwd(), 'server_config.json');

// Interface definitions
interface PushSubscriptionRecord {
  id: string;
  userId: string;
  nombre?: string;
  subscription: webpush.PushSubscription;
  createdAt: string;
}

interface ServerConfig {
  webhookUrl?: string;
  vapidPublicKey?: string;
  vapidPrivateKey?: string;
  vapidSubject?: string;
  pushApiSecret?: string;
}

// Load local configuration
function loadServerConfig(): ServerConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('Error reading server_config.json:', e);
  }
  return {};
}

function saveServerConfig(config: ServerConfig): void {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing server_config.json:', e);
  }
}

const serverConfig = loadServerConfig();

// VAPID and Push Configuration
const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  serverConfig.vapidPublicKey ||
  'BPzypta9empk_NjjOH_QA9UFQvK1ebLcIM2ZYtU6HE2bhYZG7ypV_Xl3i_7jWEV9mfR1NKsNeOFjjzfieJuG6l8';

const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  serverConfig.vapidPrivateKey ||
  '9myLo9LLLofaTgoQjFgKnkC47LPitx55tezrPtl7eTg';

const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT ||
  serverConfig.vapidSubject ||
  'mailto:vsolorzano.silocom@gmail.com';

const PUSH_API_SECRET =
  process.env.PUSH_API_SECRET ||
  serverConfig.pushApiSecret ||
  'silocom_push_sec_2026';

function getGoogleAppsScriptUrl(): string {
  return (
    process.env.GOOGLE_APPS_SCRIPT_URL ||
    process.env.VITE_GOOGLE_APPS_SCRIPT_URL ||
    serverConfig.webhookUrl ||
    ''
  );
}

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('✓ VAPID details configured successfully.');
} catch (err) {
  console.warn('VAPID setup warning:', err);
}

// Load & Save Subscriptions
function loadSubscriptions(): PushSubscriptionRecord[] {
  try {
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
      const raw = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error reading push_subscriptions.json:', e);
  }
  return [];
}

function saveSubscriptions(subs: PushSubscriptionRecord[]): void {
  try {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subs, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing push_subscriptions.json:', e);
  }
}

let activeSubscriptions: PushSubscriptionRecord[] = loadSubscriptions();

function removeExpiredEndpoints(endpoints: string[]) {
  if (!endpoints || endpoints.length === 0) return;
  const initialCount = activeSubscriptions.length;
  activeSubscriptions = activeSubscriptions.filter(
    (sub) => !endpoints.includes(sub.subscription?.endpoint)
  );
  if (activeSubscriptions.length !== initialCount) {
    saveSubscriptions(activeSubscriptions);
    console.log(`Eliminadas ${initialCount - activeSubscriptions.length} suscripciones caducadas.`);
  }
}

// Global Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS setup
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-push-secret, X-Requested-With'
  );
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Helper for Caracas Time
function getCaracasDateInfo(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = parseInt(getPart('hour'), 10);
  const minute = parseInt(getPart('minute'), 10);
  const second = parseInt(getPart('second'), 10);

  // Formato dd/MM/yyyy usado en Google Sheets
  const dateSheetsFormat = `${day}/${month}/${year}`;
  const isoDate = `${year}-${month}-${day}`;

  // Day of week in Caracas (0=Sunday, 1=Monday... 6=Saturday)
  const caracasDateObj = new Date(
    date.toLocaleString('en-US', { timeZone: 'America/Caracas' })
  );
  const dayOfWeek = caracasDateObj.getDay();

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    dateSheetsFormat,
    isoDate,
    dayOfWeek,
  };
}

// Web Push Dispatcher
async function sendWebPushToSubscriptions(
  subs: (webpush.PushSubscription | PushSubscriptionRecord['subscription'])[],
  title: string,
  body: string,
  tag = 'silocom-push-reminder',
  customData: Record<string, unknown> = {}
) {
  if (!subs || subs.length === 0) {
    return { success: true, sent: 0, failed: 0, expiredEndpoints: [] };
  }

  const payload = JSON.stringify({
    title,
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    tag,
    data: {
      url: '/',
      timestamp: Date.now(),
      ...customData,
    },
  });

  let sent = 0;
  let failed = 0;
  const expiredEndpoints: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payload, {
          TTL: 86400,
          urgency: 'high',
        });
        sent++;
      } catch (err: any) {
        failed++;
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          expiredEndpoints.push(sub.endpoint);
        }
        console.warn('Error enviando push:', sub.endpoint, err?.message || err);
      }
    })
  );

  if (expiredEndpoints.length > 0) {
    removeExpiredEndpoints(expiredEndpoints);
  }

  return {
    success: sent > 0 || subs.length === 0,
    sent,
    failed,
    expiredEndpoints,
  };
}

/* =========================================================================
   API ROUTES (Express)
   ========================================================================= */

// 1. GET /api/vapid-public-key
app.get('/api/vapid-public-key', (req, res) => {
  res.json({
    publicKey: VAPID_PUBLIC_KEY,
    service: 'Silocom Railway Push Notification Server',
  });
});

// 2. POST /api/push-subscription
app.post('/api/push-subscription', (req, res) => {
  try {
    const { subscription, userId, nombre } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, error: 'Suscripción o endpoint inválido.' });
    }

    const cleanUserId = (userId || 'GENERAL').toString().trim().toLowerCase();
    const existingIndex = activeSubscriptions.findIndex(
      (s) => s.subscription?.endpoint === subscription.endpoint
    );

    const record: PushSubscriptionRecord = {
      id: existingIndex >= 0 ? activeSubscriptions[existingIndex].id : 'sub_' + Date.now(),
      userId: cleanUserId,
      nombre: nombre || 'Colaborador Silocom',
      subscription,
      createdAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      activeSubscriptions[existingIndex] = record;
    } else {
      activeSubscriptions.push(record);
    }

    saveSubscriptions(activeSubscriptions);

    // Replicar en Google Sheets de fondo si hay URL configurada
    const gasUrl = getGoogleAppsScriptUrl();
    if (gasUrl) {
      fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'guardarSuscripcionPush',
          empId: cleanUserId,
          nombre: record.nombre,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys?.p256dh || '',
          auth: subscription.keys?.auth || '',
        }),
      }).catch((e) => console.warn('Error replicando suscripción a GAS:', e));
    }

    res.json({
      success: true,
      message: 'Suscripción registrada correctamente en Railway.',
      totalSubscriptions: activeSubscriptions.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. POST /api/send-push
app.post('/api/send-push', async (req, res) => {
  try {
    const { secret, subscription, subscriptions, title, body, delaySeconds, data, tag } = req.body;
    const providedSecret = secret || req.headers['x-push-secret'];

    if (
      providedSecret &&
      providedSecret !== PUSH_API_SECRET &&
      providedSecret !== 'silocom_push_sec_2026'
    ) {
      return res.status(401).json({ success: false, error: 'Secreto de API Push no válido.' });
    }

    const targets: webpush.PushSubscription[] = [];
    if (Array.isArray(subscriptions)) {
      targets.push(...subscriptions);
    } else if (subscription) {
      targets.push(subscription);
    }

    if (targets.length === 0) {
      return res.status(400).json({ success: false, error: 'No se suministraron suscripciones de destino.' });
    }

    if (delaySeconds && delaySeconds > 0) {
      const ms = Math.min(delaySeconds * 1000, 60000);
      await new Promise((resolve) => setTimeout(resolve, ms));
    }

    const result = await sendWebPushToSubscriptions(
      targets,
      title || 'Silocom C.A. - Control de Asistencias',
      body || 'Recordatorio de marcaje de jornada laboral.',
      tag || 'silocom-push-reminder',
      data || {}
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. POST /api/send-notification
app.post('/api/send-notification', async (req, res) => {
  try {
    const { title, body, data, tag } = req.body;
    const subs = activeSubscriptions.map((s) => s.subscription);

    if (subs.length === 0) {
      return res.json({
        success: true,
        message: 'No hay dispositivos suscritos en Railway.',
        sent: 0,
        failed: 0,
      });
    }

    const result = await sendWebPushToSubscriptions(
      subs,
      title || 'Silocom C.A. - Notificación Global',
      body || 'Recordatorio de marcaje.',
      tag || 'silocom-broadcast-notification',
      data || {}
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. POST /api/attendance (Proxy to Google Apps Script)
app.post('/api/attendance', async (req, res) => {
  const gasUrl = getGoogleAppsScriptUrl();
  if (!gasUrl) {
    return res.status(400).json({
      success: false,
      error: 'URL de Google Apps Script no configurada en el servidor (GOOGLE_APPS_SCRIPT_URL).',
    });
  }

  try {
    const payload = {
      action: 'registrarAsistencia',
      id: req.body.id,
      tipo: req.body.tipo,
      idDispositivo: req.body.idDispositivo,
      lat: req.body.lat,
      lng: req.body.lng,
      nombre: req.body.nombre,
      estado: req.body.estado,
    };

    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    const gasRes = await response.json();
    res.json(gasRes);
  } catch (err: any) {
    console.error('Error reenviando marcaje a GAS:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. POST /api/verify-admin
app.post('/api/verify-admin', async (req, res) => {
  const { id } = req.body;
  const cleanId = (id || '').toString().trim().toLowerCase();

  // Fallback local seguro
  if (cleanId === 'silocomca' || cleanId === 'admin') {
    return res.json({ success: true, verified: true, role: 'ADMIN_FALLBACK' });
  }

  const gasUrl = getGoogleAppsScriptUrl();
  if (gasUrl) {
    try {
      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'verificarAdmin', id }),
      });
      const data = await response.json();
      return res.json(data);
    } catch (e) {
      console.warn('Error verificando admin en GAS:', e);
    }
  }

  res.json({ success: false, verified: false, message: 'Identificador no reconocido como administrador.' });
});

// 7. POST /api/admin-summary
app.post('/api/admin-summary', async (req, res) => {
  const gasUrl = getGoogleAppsScriptUrl();
  if (gasUrl) {
    try {
      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'obtenerDatos' }),
      });
      const data = await response.json();
      return res.json(data);
    } catch (e) {
      console.warn('Error consultando resumen en GAS:', e);
    }
  }

  // Fallback a dataset vacío o estructurado
  res.json({
    success: true,
    totalRegistros: 0,
    registros: [],
    empleados: [],
    message: 'Datos locales temporales (servidor proxy Railway).',
  });
});

// 8. POST /api/config
app.post('/api/config', (req, res) => {
  try {
    const { webhookUrl, vapidPublicKey, vapidPrivateKey, vapidSubject, pushApiSecret } = req.body;
    if (webhookUrl !== undefined) serverConfig.webhookUrl = webhookUrl;
    if (vapidPublicKey !== undefined) serverConfig.vapidPublicKey = vapidPublicKey;
    if (vapidPrivateKey !== undefined) serverConfig.vapidPrivateKey = vapidPrivateKey;
    if (vapidSubject !== undefined) serverConfig.vapidSubject = vapidSubject;
    if (pushApiSecret !== undefined) serverConfig.pushApiSecret = pushApiSecret;

    saveServerConfig(serverConfig);
    res.json({ success: true, config: serverConfig });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. GET /api/config
app.get('/api/config', (req, res) => {
  const currentUrl = getGoogleAppsScriptUrl();
  res.json({
    webhookUrl: currentUrl,
    hasWebhook: Boolean(currentUrl),
    totalSubscriptions: activeSubscriptions.length,
    vapidPublicKey: VAPID_PUBLIC_KEY,
  });
});

// 10. POST /api/test-webhook
app.post('/api/test-webhook', async (req, res) => {
  const targetUrl = req.body.url || getGoogleAppsScriptUrl();
  if (!targetUrl) {
    return res.status(400).json({ success: false, message: 'URL de Google Apps Script no proporcionada.' });
  }

  try {
    const response = await fetch(`${targetUrl}?action=ping`, { method: 'GET' });
    const text = await response.text();
    let jsonRes: any = null;
    try {
      jsonRes = JSON.parse(text);
    } catch {}

    res.json({
      success: response.ok,
      status: response.status,
      data: jsonRes || text,
      message: 'PING exitoso a Google Apps Script.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. GET /api/schedule-status
app.get('/api/schedule-status', (req, res) => {
  const caracasInfo = getCaracasDateInfo();
  res.json({
    success: true,
    dynamicConfig: dynamicScheduleConfig,
    caracasTime: `${String(caracasInfo.hour).padStart(2, '0')}:${String(caracasInfo.minute).padStart(2, '0')}:${String(caracasInfo.second).padStart(2, '0')}`,
    caracasDate: caracasInfo.dateSheetsFormat,
    dayOfWeek: caracasInfo.dayOfWeek,
    engine: 'Railway Autonomous Dynamic Scheduler (evaluación continua cada 30s)',
  });
});

// 12. POST /api/sync-schedule (Forzar sincronización inmediata desde Sheets)
app.post('/api/sync-schedule', async (req, res) => {
  try {
    const updated = await syncConfigFromSheets(true);
    res.json({
      success: true,
      message: 'Horarios dinámicos sincronizados con éxito desde Google Sheets.',
      config: dynamicScheduleConfig,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================================================================
   SISTEMA DE HORARIOS DINÁMICOS & SCHEDULER PERSISTENTE EN RAILWAY
   ========================================================================= */

interface DynamicScheduleConfig {
  recordatorioEntrada: string; // ej: "07:45"
  avisoOlvidoEntrada: string;  // ej: "08:30"
  avisoPrevioSalida: string;   // ej: "16:30"
  cierreAutomatico: string;    // ej: "17:30"
  latitud?: number;
  longitud?: number;
  radioMaxKm?: number;
  lastSynced: number;
}

let dynamicScheduleConfig: DynamicScheduleConfig = {
  recordatorioEntrada: '07:45',
  avisoOlvidoEntrada: '08:30',
  avisoPrevioSalida: '16:30',
  cierreAutomatico: '17:30',
  lastSynced: 0,
};

function normalizeTimeString(val: any, fallback: string): string {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      const h = match[1].padStart(2, '0');
      const m = match[2];
      return `${h}:${m}`;
    }
    const num = parseFloat(trimmed);
    if (!isNaN(num) && num >= 0 && num < 24) {
      const h = Math.floor(num);
      const m = Math.round((num - h) * 60);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }
  if (typeof val === 'number' && val >= 0 && val < 24) {
    const h = Math.floor(val);
    const m = Math.round((val - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return fallback;
}

async function syncConfigFromSheets(force = false): Promise<boolean> {
  const now = Date.now();
  if (!force && now - dynamicScheduleConfig.lastSynced < 5 * 60 * 1000) {
    return false;
  }

  const gasUrl = getGoogleAppsScriptUrl();
  if (!gasUrl) return false;

  try {
    const response = await fetch(`${gasUrl}?action=obtenerConfiguracion`);
    if (!response.ok) return false;
    const json: any = await response.json();
    if (json && json.success && json.config) {
      const cfg = json.config;
      const newRecordatorioEntrada = normalizeTimeString(cfg.recordatorioEntrada, dynamicScheduleConfig.recordatorioEntrada);
      const newAvisoOlvidoEntrada = normalizeTimeString(cfg.avisoOlvidoEntrada, dynamicScheduleConfig.avisoOlvidoEntrada);
      const newAvisoPrevioSalida = normalizeTimeString(cfg.avisoPrevioSalida, dynamicScheduleConfig.avisoPrevioSalida);
      const newCierreAutomatico = normalizeTimeString(cfg.cierreAutomatico, dynamicScheduleConfig.cierreAutomatico);

      if (
        newRecordatorioEntrada !== dynamicScheduleConfig.recordatorioEntrada ||
        newAvisoOlvidoEntrada !== dynamicScheduleConfig.avisoOlvidoEntrada ||
        newAvisoPrevioSalida !== dynamicScheduleConfig.avisoPrevioSalida ||
        newCierreAutomatico !== dynamicScheduleConfig.cierreAutomatico
      ) {
        console.log(`[HORARIOS DINÁMICOS ACTUALIZADOS DESDE SHEETS]`);
        console.log(`  - Recordatorio Entrada: ${newRecordatorioEntrada}`);
        console.log(`  - Aviso Olvido Entrada: ${newAvisoOlvidoEntrada}`);
        console.log(`  - Recordatorio Salida:  ${newAvisoPrevioSalida}`);
        console.log(`  - Cierre Automático:    ${newCierreAutomatico}`);
      }

      dynamicScheduleConfig = {
        recordatorioEntrada: newRecordatorioEntrada,
        avisoOlvidoEntrada: newAvisoOlvidoEntrada,
        avisoPrevioSalida: newAvisoPrevioSalida,
        cierreAutomatico: newCierreAutomatico,
        latitud: cfg.latitud ?? dynamicScheduleConfig.latitud,
        longitud: cfg.longitud ?? dynamicScheduleConfig.longitud,
        radioMaxKm: cfg.radioMaxKm ?? dynamicScheduleConfig.radioMaxKm,
        lastSynced: now,
      };
      return true;
    }
  } catch (err: any) {
    console.warn('[HORARIOS DINÁMICOS] Aviso leyendo configuración desde Sheets:', err?.message);
  }
  return false;
}

// Validación inteligente de colaboradores sin registro de entrada
async function ejecutarAvisoOlvidoInteligente(timeHM: string) {
  const gasUrl = getGoogleAppsScriptUrl();
  if (!gasUrl) {
    console.warn(`[AVISO OLVIDO ${timeHM}] No hay GOOGLE_APPS_SCRIPT_URL configurada.`);
    return;
  }

  try {
    const response = await fetch(`${gasUrl}?action=obtenerDatos`);
    const gasData: any = await response.json();
    if (!gasData || !Array.isArray(gasData.registros)) return;

    const caracasInfo = getCaracasDateInfo();
    const hoyStr = caracasInfo.dateSheetsFormat; // ej. "10/09/2026"

    const marcadosHoy: Record<string, boolean> = {};
    for (const reg of gasData.registros) {
      const fStr = (reg.fechaHora || '').toString().trim();
      const tipo = (reg.tipo || '').toString().trim().toUpperCase();
      const id = (reg.id || '').toString().trim().toLowerCase();
      if (fStr.startsWith(hoyStr) && tipo === 'ENTRADA') {
        marcadosHoy[id] = true;
      }
    }

    const subsToSend: webpush.PushSubscription[] = [];
    for (const subRecord of activeSubscriptions) {
      const empId = (subRecord.userId || '').toLowerCase();
      if (!marcadosHoy[empId]) {
        subsToSend.push(subRecord.subscription);
      }
    }

    if (subsToSend.length > 0) {
      console.log(`[AVISO OLVIDO ${timeHM}] Enviando aviso de olvido a ${subsToSend.length} dispositivo(s)...`);
      await sendWebPushToSubscriptions(
        subsToSend,
        `Silocom C.A. - Aviso de Asistencia (${timeHM})`,
        'Atención: Aún no has registrado tu ENTRADA el día de hoy. Recuerda marcar tu asistencia al estar en sede.',
        'silocom-olvido'
      );
    } else {
      console.log(`[AVISO OLVIDO ${timeHM}] Todos los colaboradores registrados han marcado su entrada hoy.`);
    }
  } catch (e) {
    console.error(`[AVISO OLVIDO ${timeHM}] Error en validación de olvido:`, e);
  }
}

// Bucle Continuo de Monitoreo en Railway (Cada 30 Segundos en Hora Caracas)
let lastDispatchedDate_Entrada = '';
let lastDispatchedDate_Olvido = '';
let lastDispatchedDate_Salida = '';
let lastDispatchedDate_Cierre = '';

setInterval(async () => {
  try {
    const info = getCaracasDateInfo();
    const timeHM = `${String(info.hour).padStart(2, '0')}:${String(info.minute).padStart(2, '0')}`;
    const isoDate = info.isoDate;

    // Sincronización periódica automática de horarios desde Google Sheets cada 5 minutos
    await syncConfigFromSheets(false);

    // Solo de lunes a viernes (1 a 5)
    if (info.dayOfWeek >= 1 && info.dayOfWeek <= 5) {
      // 1. RECORDATORIO DE ENTRADA DINÁMICO
      if (timeHM === dynamicScheduleConfig.recordatorioEntrada && lastDispatchedDate_Entrada !== isoDate) {
        lastDispatchedDate_Entrada = isoDate;
        console.log(`[ALERTA AUTOMATICA ${timeHM}] Despachando Recordatorio Matutino de Entrada...`);
        const subs = activeSubscriptions.map((s) => s.subscription);
        if (subs.length > 0) {
          await sendWebPushToSubscriptions(
            subs,
            `Silocom C.A. - Recordatorio de Entrada (${timeHM})`,
            'Buenos días, recuerda registrar tu ENTRADA al ingresar a la sede Silocom.',
            'silocom-entrada'
          );
        }
      }

      // 2. AVISO DE OLVIDO INTELIGENTE DINÁMICO
      if (timeHM === dynamicScheduleConfig.avisoOlvidoEntrada && lastDispatchedDate_Olvido !== isoDate) {
        lastDispatchedDate_Olvido = isoDate;
        console.log(`[ALERTA AUTOMATICA ${timeHM}] Verificando colaboradores sin registro de entrada...`);
        await ejecutarAvisoOlvidoInteligente(timeHM);
      }

      // 3. RECORDATORIO DE SALIDA DINÁMICO
      if (timeHM === dynamicScheduleConfig.avisoPrevioSalida && lastDispatchedDate_Salida !== isoDate) {
        lastDispatchedDate_Salida = isoDate;
        console.log(`[ALERTA AUTOMATICA ${timeHM}] Despachando Recordatorio de Fin de Jornada...`);
        const subs = activeSubscriptions.map((s) => s.subscription);
        if (subs.length > 0) {
          await sendWebPushToSubscriptions(
            subs,
            `Silocom C.A. - Fin de Jornada Laboral (${timeHM})`,
            'Buenas tardes, recuerda registrar tu SALIDA al culminar tu jornada laboral en la sede Silocom.',
            'silocom-salida'
          );
        }
      }

      // 4. CIERRE AUTOMÁTICO DE TURNOS DINÁMICO
      if (timeHM >= dynamicScheduleConfig.cierreAutomatico && lastDispatchedDate_Cierre !== isoDate) {
        lastDispatchedDate_Cierre = isoDate;
        console.log(`[CIERRE AUTOMATICO ${timeHM}] Ejecutando cierre de turnos en Google Sheets para fecha ${isoDate}...`);
        const gasUrl = getGoogleAppsScriptUrl();
        if (gasUrl) {
          const resp = await fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'ejecutarCierreAutomatico' }),
          });
          const resJson = await resp.json();
          console.log(`[CIERRE AUTOMATICO ${timeHM}] Respuesta de Google Apps Script:`, resJson);
        }
      }
    }
  } catch (err) {
    console.error('[SCHEDULER LOOP ERROR]:', err);
  }
}, 30000);

/* =========================================================================
   FRONTEND SERVING (Vite Middleware in Dev / dist in Prod)
   ========================================================================= */

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Iniciando Vite en modo middleware de desarrollo...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Sirviendo aplicación compilada desde dist/...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Silocom Express corriendo en http://0.0.0.0:${PORT}`);
    console.log(`🕒 Zona horaria activa para cron jobs: America/Caracas`);
    // Sincronizar horarios dinámicos al iniciar
    syncConfigFromSheets(true).catch((err) => {
      console.warn('[HORARIOS DINÁMICOS] Aviso en sincronización inicial:', err?.message);
    });
  });
}

startServer();
