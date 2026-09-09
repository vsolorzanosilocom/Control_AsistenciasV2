// Push Notification Service for Silocom Web App (Web Push VAPID & Local Fallback)

export const VAPID_PUBLIC_KEY =
  'BPzypta9empk_NjjOH_QA9UFQvK1ebLcIM2ZYtU6HE2bhYZG7ypV_Xl3i_7jWEV9mfR1NKsNeOFjjzfieJuG6l8';

export const PUSH_API_SECRET = 'silocom_push_sec_2026';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushSubscriptionData {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushService {
  public static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    );
  }

  public static getPermissionState(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
    return Notification.permission;
  }

  public static async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const result = await Notification.requestPermission();
      return result === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Obtiene la suscripción activa actual si existe
   */
  public static async getSubscription(): Promise<PushSubscription | null> {
    if (!this.isSupported()) return null;
    try {
      const registration = await navigator.serviceWorker.ready;
      return await registration.pushManager.getSubscription();
    } catch (err) {
      console.warn('Error obteniendo suscripción Push:', err);
      return null;
    }
  }

  /**
   * Suscribe el dispositivo al servicio Web Push remoto utilizando VAPID
   */
  public static async subscribeDevice(
    empId?: string,
    empNombre?: string,
    gasWebAppUrl?: string
  ): Promise<{ success: boolean; subscription?: PushSubscriptionData; message: string }> {
    if (!this.isSupported()) {
      return {
        success: false,
        message: 'Tu navegador o dispositivo no es compatible con Notificaciones Push remotas.',
      };
    }

    const granted = await this.requestPermission();
    if (!granted) {
      return {
        success: false,
        message: 'Permiso de notificaciones denegado en este dispositivo.',
      };
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const convertedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });
      }

      const subData: PushSubscriptionData = subscription.toJSON() as PushSubscriptionData;

      // Guardar localmente
      try {
        localStorage.setItem('silocom_push_sub', JSON.stringify(subData));
      } catch {}

      // Sincronizar con Google Sheets a través de Google Apps Script si está disponible
      if (gasWebAppUrl) {
        this.syncSubscriptionToGoogleSheets(subData, empId, empNombre, gasWebAppUrl).catch(
          (e) => console.warn('Error sincronizando suscripción en Sheets:', e)
        );
      }

      return {
        success: true,
        subscription: subData,
        message: '¡Dispositivo suscrito con éxito a Notificaciones Push remotas!',
      };
    } catch (err: any) {
      console.error('Error suscribiendo dispositivo a Push:', err);
      return {
        success: false,
        message: `Error al suscribir a Push: ${err?.message || err}`,
      };
    }
  }

  /**
   * Sincroniza los datos de la suscripción del teléfono con la hoja DispositivosPush en Google Sheets
   */
  public static async syncSubscriptionToGoogleSheets(
    subData: PushSubscriptionData,
    empId?: string,
    empNombre?: string,
    gasWebAppUrl?: string
  ): Promise<boolean> {
    const url = gasWebAppUrl || localStorage.getItem('silocom_gas_url');
    if (!url) return false;

    try {
      const payload = {
        action: 'guardarSuscripcionPush',
        empId: empId || localStorage.getItem('silocom_last_user_id') || 'GENERAL',
        nombre: empNombre || 'Colaborador Silocom',
        endpoint: subData.endpoint,
        p256dh: subData.keys?.p256dh || '',
        auth: subData.keys?.auth || '',
        timestamp: new Date().toISOString(),
      };

      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        mode: 'no-cors',
      });
      return true;
    } catch (e) {
      console.warn('Fallo al enviar suscripción a Apps Script:', e);
      return false;
    }
  }

  /**
   * Envía una prueba remota a través del endpoint Vercel /api/send-push con retardo opcional
   * Permite al usuario bloquear la pantalla o cerrar la app y comprobar que llega por internet.
   */
  public static async testRemotePushViaVercel(
    delaySeconds = 8,
    customTitle?: string,
    customBody?: string
  ): Promise<{ success: boolean; message: string }> {
    if (!this.isSupported()) {
      return { success: false, message: 'Web Push no compatible en este navegador.' };
    }

    const subRes = await this.subscribeDevice();
    if (!subRes.success || !subRes.subscription) {
      return { success: false, message: subRes.message };
    }

    try {
      const endpointUrl = '/api/send-push';
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-push-secret': PUSH_API_SECRET,
        },
        body: JSON.stringify({
          secret: PUSH_API_SECRET,
          subscription: subRes.subscription,
          delaySeconds: delaySeconds,
          title: customTitle || 'Silocom C.A. - Alerta Remota Push',
          body:
            customBody ||
            `¡Prueba remota en Vercel exitosa! Despachada con ${delaySeconds}s de retardo mientras la app estaba inactiva.`,
          tag: 'silocom-test-remote-push',
          data: {
            url: '/',
            timestamp: Date.now(),
          },
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        return {
          success: false,
          message: `El servidor respondió con error ${response.status}: ${text}`,
        };
      }

      const resData = await response.json();
      return {
        success: resData.success,
        message: resData.success
          ? `¡Prueba remota programada para dentro de ${delaySeconds} segundos! Ya puedes cerrar la app o bloquear tu teléfono.`
          : 'El servidor procesó la petición pero no pudo entregar el paquete.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Error al conectar con /api/send-push: ${err?.message || err}`,
      };
    }
  }

  /**
   * Envío local directo (cuando la app está en pantalla o con Service Worker)
   */
  public static async sendLocalNotification(
    title: string,
    options?: NotificationOptions
  ): Promise<boolean> {
    if (!this.isSupported()) return false;

    if (Notification.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) return false;
    }

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          vibrate: [200, 100, 200],
          ...(options as any),
        } as any);
        return true;
      } else {
        new Notification(title, {
          icon: '/pwa-192x192.png',
          ...(options as any),
        });
        return true;
      }
    } catch (err) {
      console.warn('Notification trigger notice:', err);
      return false;
    }
  }
}
