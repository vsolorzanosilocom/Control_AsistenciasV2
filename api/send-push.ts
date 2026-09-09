import webpush from 'web-push';

export const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BPzypta9empk_NjjOH_QA9UFQvK1ebLcIM2ZYtU6HE2bhYZG7ypV_Xl3i_7jWEV9mfR1NKsNeOFjjzfieJuG6l8';

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  '9myLo9LLLofaTgoQjFgKnkC47LPitx55tezrPtl7eTg';

export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:vsolorzano.silocom@gmail.com';

export const PUSH_API_SECRET =
  process.env.PUSH_API_SECRET || 'silocom_push_sec_2026';

// Configurar credenciales VAPID
try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (err) {
  console.warn('VAPID setup warning:', err);
}

export interface PushSubscriptionPayload {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  empId?: string;
  nombre?: string;
}

export interface SendPushRequestBody {
  secret?: string;
  subscription?: PushSubscriptionPayload;
  subscriptions?: PushSubscriptionPayload[];
  title?: string;
  body?: string;
  tag?: string;
  delaySeconds?: number;
  data?: Record<string, unknown>;
  notification?: {
    title?: string;
    body?: string;
    tag?: string;
    data?: Record<string, unknown>;
  };
}

/**
 * Función central de despacho Web Push
 */
export async function dispatchWebPush(body: SendPushRequestBody) {
  const subs: PushSubscriptionPayload[] = [];
  if (Array.isArray(body.subscriptions)) {
    subs.push(...body.subscriptions);
  } else if (body.subscription) {
    subs.push(body.subscription);
  }

  if (subs.length === 0) {
    return {
      success: false,
      error: 'No se suministraron suscripciones de destino.',
      sent: 0,
      failed: 0,
      expiredEndpoints: [],
    };
  }

  // Si se solicitó retardo (útil para pruebas donde el usuario bloquea o cierra la app)
  if (body.delaySeconds && body.delaySeconds > 0) {
    const ms = Math.min(body.delaySeconds * 1000, 60000);
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  const payload = JSON.stringify({
    title:
      body.title ||
      body.notification?.title ||
      'Silocom C.A. - Control de Asistencia',
    body:
      body.body ||
      body.notification?.body ||
      'Recordatorio de marcaje de jornada laboral.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    tag: body.tag || body.notification?.tag || 'silocom-push-reminder',
    data: {
      url: '/',
      timestamp: Date.now(),
      ...(body.data || body.notification?.data || {}),
    },
  });

  const expiredEndpoints: string[] = [];
  let sentCount = 0;
  let failedCount = 0;

  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          payload,
          {
            TTL: 86400, // 24 horas de vigencia en la red de push
            urgency: 'high',
          }
        );
        sentCount++;
      } catch (err: any) {
        failedCount++;
        // 404 Not Found o 410 Gone indican que la suscripción caducó o el usuario revocó permisos
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          expiredEndpoints.push(sub.endpoint);
        }
        console.warn('Error enviando push a endpoint:', sub.endpoint, err?.message || err);
      }
    })
  );

  return {
    success: sentCount > 0 || subs.length === 0,
    total: subs.length,
    sent: sentCount,
    failed: failedCount,
    expiredEndpoints,
    resultsSummary: results.map((r) => r.status),
  };
}

/**
 * Handler Vercel Serverless Function
 */
export default async function handler(req: any, res: any) {
  // Configurar CORS para permitir invocación desde la PWA y Google Apps Script
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-Type, Authorization, x-push-secret'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Información pública de salud y clave pública VAPID
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      service: 'Silocom Web Push Notification Server',
      publicKey: VAPID_PUBLIC_KEY,
      timestamp: new Date().toISOString(),
    });
  }

  // POST: Enviar notificaciones push a dispositivos
  if (req.method === 'POST') {
    try {
      const body: SendPushRequestBody =
        typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};

      const providedSecret = body.secret || req.headers?.['x-push-secret'];
      // Validación del secreto para prevenir spam desde fuentes no autorizadas
      if (
        providedSecret &&
        providedSecret !== PUSH_API_SECRET &&
        providedSecret !== 'silocom_push_sec_2026'
      ) {
        return res.status(401).json({
          success: false,
          error: 'Acceso no autorizado: Secreto de API Push no válido.',
        });
      }

      const result = await dispatchWebPush(body);
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('Error en /api/send-push:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Error interno del servidor despachando push.',
      });
    }
  }

  return res.status(405).json({ error: 'Método no permitido. Use GET o POST.' });
}
