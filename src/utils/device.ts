const STORAGE_KEY = 'silocom_device_id';

/**
 * Obtiene o inicializa el identificador único del dispositivo móvil/navegador.
 * Idéntico a la implementación en Index.html de Silocom.
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'DEV-SERVER';
  }

  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = 'DEV-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export function resetLocalDeviceId(): string {
  const newId = 'DEV-' + Math.random().toString(36).substring(2, 9).toUpperCase();
  localStorage.setItem(STORAGE_KEY, newId);
  return newId;
}
