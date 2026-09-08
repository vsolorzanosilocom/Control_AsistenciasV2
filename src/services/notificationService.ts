import { PushService } from './pushService';
import { StorageService } from './storage';

export interface CaracasTimeInfo {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  decimalHour: number;
  formattedTime: string;
  dateKey: string;
}

export class NotificationService {
  private static intervalId: number | null = null;
  private static listenersAttached = false;
  private static countdownTimerId: number | null = null;

  /**
   * Obtiene la información horaria precisa de Caracas (Venezuela)
   * Utiliza Intl.DateTimeFormat para garantizar exactitud sin importar la zona horaria del dispositivo.
   */
  public static getCaracasTimeInfo(): CaracasTimeInfo {
    const now = new Date();
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Caracas',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
      });

      const parts = formatter.formatToParts(now);
      const getPart = (type: string) => {
        const p = parts.find((x) => x.type === type);
        return p ? parseInt(p.value, 10) : 0;
      };

      const year = getPart('year') || now.getFullYear();
      const month = getPart('month') || now.getMonth() + 1;
      const day = getPart('day') || now.getDate();
      let hour = getPart('hour');
      if (hour === 24) hour = 0;
      const minute = getPart('minute');
      const second = getPart('second');

      const decimalHour = hour + minute / 60 + second / 3600;
      const pad = (n: number) => (n < 10 ? '0' + n : n.toString());
      const formattedTime = `${pad(hour)}:${pad(minute)}:${pad(second)}`;
      const dateKey = `${pad(day)}_${pad(month)}_${year}`;

      return { year, month, day, hour, minute, second, decimalHour, formattedTime, dateKey };
    } catch {
      // Fallback a hora local si Intl no estuviera disponible
      const hour = now.getHours();
      const minute = now.getMinutes();
      const second = now.getSeconds();
      const pad = (n: number) => (n < 10 ? '0' + n : n.toString());
      return {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
        hour,
        minute,
        second,
        decimalHour: hour + minute / 60,
        formattedTime: `${pad(hour)}:${pad(minute)}:${pad(second)}`,
        dateKey: `${pad(now.getDate())}_${pad(now.getMonth() + 1)}_${now.getFullYear()}`,
      };
    }
  }

  public static getCaracasDateKey(): string {
    return this.getCaracasTimeInfo().dateKey;
  }

  public static getCaracasDecimalHour(): number {
    return this.getCaracasTimeInfo().decimalHour;
  }

  /**
   * Inicializa el vigilante de recordatorios automáticos
   */
  public static startScheduler(): void {
    if (typeof window === 'undefined') return;

    // Ejecutar verificación inmediata
    this.checkScheduledReminders();

    // Luego verificar cada 20 segundos para no perder ventanas de notificación
    if (this.intervalId === null) {
      this.intervalId = window.setInterval(() => {
        this.checkScheduledReminders();
      }, 20000);
    }

    // Reactivar verificación cuando la pantalla se desbloquea o el usuario vuelve a la app
    if (!this.listenersAttached) {
      this.listenersAttached = true;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.checkScheduledReminders();
        }
      });
      window.addEventListener('focus', () => {
        this.checkScheduledReminders();
      });
    }
  }

  public static stopScheduler(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public static isSchedulerRunning(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Valida si el usuario actual o algún colaborador ha registrado entrada hoy
   */
  public static yaMarcoEntradaHoy(targetUserId?: string): boolean {
    const records = StorageService.getRegistros();
    const timeInfo = this.getCaracasTimeInfo();
    const pad = (n: number) => (n < 10 ? '0' + n : n.toString());
    const diaHoy = pad(timeInfo.day);
    const mesNum = timeInfo.month;
    const meses = [
      '', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const mesHoy = meses[mesNum] || '';

    const uid = (targetUserId || StorageService.getLastUserId() || '').trim().toLowerCase();

    return records.some((r) => {
      const matchTipo = (r.tipo || '').toUpperCase() === 'ENTRADA';
      const matchDia = String(r.dia).padStart(2, '0') === diaHoy;
      const matchMes = !r.mes || r.mes.toLowerCase() === mesHoy.toLowerCase();
      const matchUser = !uid || (r.id || '').toLowerCase() === uid;
      return matchTipo && matchDia && matchMes && matchUser;
    });
  }

  /**
   * Verifica y despacha las notificaciones programadas según la hora de Caracas
   */
  public static async checkScheduledReminders(): Promise<void> {
    if (!PushService.isSupported()) return;
    if (Notification.permission !== 'granted') return;

    const timeInfo = this.getCaracasTimeInfo();
    const currentHour = timeInfo.decimalHour;
    const dateKey = timeInfo.dateKey;

    // 1. Recordatorio 1 (07:45 AM) - Previo a inicio de jornada
    // Ventana: 07:45 a 08:15 AM (7.75 a 8.25)
    if (currentHour >= 7.75 && currentHour < 8.25) {
      const key0745 = `silocom_notif_0745_${dateKey}`;
      if (!localStorage.getItem(key0745)) {
        const sent = await PushService.sendLocalNotification(
          'Silocom C.A. - Recordatorio de Entrada (07:45 AM)',
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
    // Ventana: 08:30 a 09:15 AM (8.5 a 9.25)
    // CONDICIÓN: Solo se envía si el usuario NO ha registrado su ENTRADA el día de hoy
    // o si se activó la opción de forzar prueba para hoy.
    if (currentHour >= 8.5 && currentHour < 9.25) {
      const key0830 = `silocom_notif_0830_${dateKey}`;
      const forceTest = localStorage.getItem('silocom_test_force_0830_today') === 'true';

      if (!localStorage.getItem(key0830) || forceTest) {
        const yaMarco = this.yaMarcoEntradaHoy();
        if (!yaMarco || forceTest) {
          const sent = await PushService.sendLocalNotification(
            'Silocom C.A. - Aviso de Asistencia (08:30 AM)',
            {
              body: 'Atención: Aún no has registrado tu ENTRADA el día de hoy. Recuerda marcar tu asistencia al estar en sede.',
              tag: 'silocom-reminder-olvido-0830',
            }
          );
          if (sent) {
            localStorage.setItem(key0830, 'true');
            if (forceTest) {
              localStorage.removeItem('silocom_test_force_0830_today');
            }
          }
        } else {
          // Ya marcó entrada: marcar como evaluado para no volver a consultar hoy
          localStorage.setItem(key0830, 'skipped_already_punched');
        }
      }
    }

    // 3. Recordatorio 4 (16:30 PM / 4:30 PM) - Aviso previo de salida
    // Ventana: 16:30 a 17:15 PM (16.5 a 17.25)
    if (currentHour >= 16.5 && currentHour < 17.25) {
      const key1630 = `silocom_notif_1630_${dateKey}`;
      if (!localStorage.getItem(key1630)) {
        const sent = await PushService.sendLocalNotification(
          'Silocom C.A. - Fin de Jornada Laboral (16:30 PM)',
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
   * Limpia las banderas de notificación enviadas para el día de hoy
   */
  public static resetTodayNotificationFlags(): void {
    const dateKey = this.getCaracasDateKey();
    localStorage.removeItem(`silocom_notif_0745_${dateKey}`);
    localStorage.removeItem(`silocom_notif_0830_${dateKey}`);
    localStorage.removeItem(`silocom_notif_1630_${dateKey}`);
    localStorage.removeItem('silocom_test_force_0830_today');
  }

  /**
   * Activa o desactiva la opción de forzar alerta de 08:30 AM aunque ya se haya marcado
   */
  public static setForceTest0830Today(enable: boolean): void {
    if (enable) {
      localStorage.setItem('silocom_test_force_0830_today', 'true');
      const dateKey = this.getCaracasDateKey();
      localStorage.removeItem(`silocom_notif_0830_${dateKey}`);
    } else {
      localStorage.removeItem('silocom_test_force_0830_today');
    }
  }

  public static isForceTest0830Enabled(): boolean {
    return localStorage.getItem('silocom_test_force_0830_today') === 'true';
  }

  /**
   * Inicia una prueba con temporizador de cuenta regresiva (ej. 30 segundos)
   * Utiliza marcas de tiempo absolutas para que no se congele si la pantalla se apaga.
   */
  public static startCountdownTest(
    seconds: number,
    onTick: (remaining: number) => void,
    onComplete: (success: boolean) => void
  ): void {
    this.cancelCountdownTest();

    const targetTime = Date.now() + seconds * 1000;
    onTick(seconds);

    this.countdownTimerId = window.setInterval(async () => {
      const now = Date.now();
      const remainingMs = targetTime - now;
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      onTick(remainingSec);

      if (remainingMs <= 0) {
        this.cancelCountdownTest();
        const sent = await PushService.sendLocalNotification(
          'Silocom C.A. - Prueba Automática Exitosa',
          {
            body: '¡El vigilante automático de notificaciones funciona de forma autónoma sin intervención manual!',
            tag: 'silocom-test-countdown',
          }
        );
        onComplete(sent);
      }
    }, 1000);
  }

  public static cancelCountdownTest(): void {
    if (this.countdownTimerId !== null) {
      clearInterval(this.countdownTimerId);
      this.countdownTimerId = null;
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
