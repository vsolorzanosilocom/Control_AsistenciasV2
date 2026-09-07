import { PushService } from './pushService';
import { AsistenciaRecord } from '../types';
import { StorageService } from './storage';

export interface ReminderConfig {
  entradaPrevioHora: number;    // 7.75 = 07:45 AM
  entradaOlvidoHora: number;    // 8.5  = 08:30 AM
  salidaPrevioHora: number;     // 16.5 = 16:30 PM (4:30 PM)
}

export const DEFAULT_REMINDERS: ReminderConfig = {
  entradaPrevioHora: 7.75, // 07:45 AM
  entradaOlvidoHora: 8.5,  // 08:30 AM
  salidaPrevioHora: 16.5,  // 16:30 PM
};

export class NotificationService {
  private static intervalId: number | null = null;

  /**
   * Inicializa el vigilante de recordatorios automáticos
   */
  public static startScheduler(): void {
    if (typeof window === 'undefined') return;

    // Ejecutar verificación inmediata
    this.checkScheduledReminders();

    // Luego verificar cada 60 segundos
    if (this.intervalId === null) {
      this.intervalId = window.setInterval(() => {
        this.checkScheduledReminders();
      }, 60000);
    }
  }

  public static stopScheduler(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Obtiene la fecha actual en formato dd/MM/yyyy para Caracas
   */
  public static getCaracasDateKey(): string {
    const now = new Date();
    const caracasDate = new Date(
      now.toLocaleString('en-US', { timeZone: 'America/Caracas' })
    );
    const pad = (n: number) => (n < 10 ? '0' + n : n.toString());
    return `${pad(caracasDate.getDate())}_${pad(caracasDate.getMonth() + 1)}_${caracasDate.getFullYear()}`;
  }

  /**
   * Obtiene la hora actual en formato decimal para Caracas (ej. 7:45 AM = 7.75)
   */
  public static getCaracasDecimalHour(): number {
    const now = new Date();
    const caracasDate = new Date(
      now.toLocaleString('en-US', { timeZone: 'America/Caracas' })
    );
    return caracasDate.getHours() + caracasDate.getMinutes() / 60;
  }

  /**
   * Valida si el usuario actual o algún colaborador ha registrado entrada hoy
   */
  public static yaMarcoEntradaHoy(targetUserId?: string): boolean {
    const records = StorageService.getRegistros();
    const now = new Date();
    const caracasDate = new Date(
      now.toLocaleString('en-US', { timeZone: 'America/Caracas' })
    );
    const pad = (n: number) => (n < 10 ? '0' + n : n.toString());
    const diaHoy = pad(caracasDate.getDate());
    const mesNum = caracasDate.getMonth() + 1;
    const meses = [
      '', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const mesHoy = meses[mesNum];

    const uid = (targetUserId || StorageService.getLastUserId() || '').trim().toLowerCase();

    return records.some((r) => {
      const matchTipo = r.tipo === 'ENTRADA';
      const matchDia = r.dia === diaHoy;
      const matchMes = !r.mes || r.mes.toLowerCase() === mesHoy.toLowerCase();
      const matchUser = !uid || r.id.toLowerCase() === uid;
      return matchTipo && matchDia && matchMes && matchUser;
    });
  }

  /**
   * Verifica y despacha las notificaciones programadas según la hora de Caracas
   */
  public static async checkScheduledReminders(): Promise<void> {
    if (!PushService.isSupported()) return;
    if (Notification.permission !== 'granted') return;

    const currentHour = this.getCaracasDecimalHour();
    const dateKey = this.getCaracasDateKey();

    // 1. Recordatorio 1 (07:45 AM) - Previo a inicio de jornada
    // Ventana: 07:45 a 08:15 AM
    if (currentHour >= 7.75 && currentHour < 8.25) {
      const key0745 = `silocom_notif_0745_${dateKey}`;
      if (!localStorage.getItem(key0745)) {
        const sent = await PushService.sendLocalNotification(
          'Silocom C.A. - Recordatorio de Entrada',
          {
            body: 'Buenos días, recuerda registrar tu ENTRADA al ingresar a la sede Silocom.',
            tag: 'silocom-reminder-entrada-0745',
          }
        );
        if (sent) {
          localStorage.setItem(key0745, 'true');
        }
      }
    }

    // 2. Recordatorio 3 (08:30 AM) - Aviso por olvido con validación
    // Ventana: 08:30 a 09:15 AM
    // CONDICIÓN: Solo se envía si el usuario NO ha registrado su ENTRADA el día de hoy
    if (currentHour >= 8.5 && currentHour < 9.25) {
      const key0830 = `silocom_notif_0830_${dateKey}`;
      if (!localStorage.getItem(key0830)) {
        const yaMarco = this.yaMarcoEntradaHoy();
        if (!yaMarco) {
          const sent = await PushService.sendLocalNotification(
            'Silocom C.A. - Aviso de Asistencia',
            {
              body: 'Atención: Aún no has registrado tu ENTRADA el día de hoy. Recuerda marcar tu asistencia al estar en sede.',
              tag: 'silocom-reminder-olvido-0830',
            }
          );
          if (sent) {
            localStorage.setItem(key0830, 'true');
          }
        } else {
          // Ya marcó entrada: marcar como evaluado para no volver a consultar hoy
          localStorage.setItem(key0830, 'skipped_already_punched');
        }
      }
    }

    // 3. Recordatorio 4 (16:30 PM / 4:30 PM) - Aviso previo de salida
    // Ventana: 16:30 a 17:15 PM
    if (currentHour >= 16.5 && currentHour < 17.25) {
      const key1630 = `silocom_notif_1630_${dateKey}`;
      if (!localStorage.getItem(key1630)) {
        const sent = await PushService.sendLocalNotification(
          'Silocom C.A. - Fin de Jornada Laboral',
          {
            body: 'Recuerda marcar tu SALIDA al retirarte.',
            tag: 'silocom-reminder-salida-1630',
          }
        );
        if (sent) {
          localStorage.setItem(key1630, 'true');
        }
      }
    }
  }

  /**
   * Permite probar manualmente cualquiera de los recordatorios desde la app
   */
  public static async testNotification(
    type: '0745_entrada' | '0830_olvido' | '1630_salida',
    forceSimulateNoPunch = false
  ): Promise<{ success: boolean; message: string }> {
    const isSupported = PushService.isSupported();
    if (!isSupported) {
      return { success: false, message: 'Tu navegador no soporta notificaciones locales.' };
    }

    const granted = await PushService.requestPermission();
    if (!granted) {
      return { success: false, message: 'Permiso de notificaciones no concedido.' };
    }

    if (type === '0745_entrada') {
      const sent = await PushService.sendLocalNotification(
        'Silocom C.A. - Recordatorio de Entrada (07:45 AM)',
        {
          body: 'Buenos días, recuerda registrar tu ENTRADA al ingresar a la sede Silocom.',
        }
      );
      return {
        success: sent,
        message: sent
          ? 'Notificación de 07:45 AM enviada correctamente al dispositivo.'
          : 'No se pudo emitir la notificación.',
      };
    }

    if (type === '0830_olvido') {
      const yaMarco = forceSimulateNoPunch ? false : this.yaMarcoEntradaHoy();
      if (yaMarco) {
        return {
          success: true,
          message: 'Validación exitosa: El colaborador YA registró su entrada hoy, por lo tanto NO se envía notificación a las 08:30 AM.',
        };
      }
      const sent = await PushService.sendLocalNotification(
        'Silocom C.A. - Aviso de Asistencia (08:30 AM)',
        {
          body: 'Atención: Aún no has registrado tu ENTRADA el día de hoy. Recuerda marcar tu asistencia al estar en sede.',
        }
      );
      return {
        success: sent,
        message: sent
          ? 'Notificación de olvido (08:30 AM) emitida: el usuario no tiene entrada registrada.'
          : 'No se pudo emitir la notificación.',
      };
    }

    if (type === '1630_salida') {
      const sent = await PushService.sendLocalNotification(
        'Silocom C.A. - Fin de Jornada Laboral (16:30 PM)',
        {
          body: 'Recuerda marcar tu SALIDA al retirarte.',
        }
      );
      return {
        success: sent,
        message: sent
          ? 'Notificación de 16:30 PM enviada: "Recuerda marcar tu SALIDA al retirarte".'
          : 'No se pudo emitir la notificación.',
      };
    }

    return { success: false, message: 'Tipo no válido.' };
  }
}
