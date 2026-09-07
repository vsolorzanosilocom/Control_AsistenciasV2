import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { GPSPosition, OfficeConfig } from '../types';
import {
  calcularDistanciaMetros,
  formatDistance,
} from '../utils/geo';

interface GPSIndicatorProps {
  config: OfficeConfig;
  onPositionUpdate: (pos: GPSPosition | null) => void;
  simulationActive?: boolean;
}

export const GPSIndicator: React.FC<GPSIndicatorProps> = ({
  config,
  onPositionUpdate,
  simulationActive = false,
}) => {
  const [position, setPosition] = useState<GPSPosition | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Process GPS coordinates and calculate geofence status
  const handleCoords = useCallback(
    (lat: number, lng: number, accuracy?: number) => {
      const dist = calcularDistanciaMetros(
        lat,
        lng,
        config.latitud,
        config.longitud
      );
      const inRange = dist <= config.radioMaxKm * 1000;

      const updated: GPSPosition = {
        lat,
        lng,
        accuracy: accuracy,
        distanceMetros: Math.round(dist),
        isWithinRange: inRange,
        timestamp: Date.now(),
      };

      setPosition(updated);
      setLoading(false);
      setIsRefreshing(false);
      setErrorMsg(null);
      onPositionUpdate(updated);
    },
    [config.latitud, config.longitud, config.radioMaxKm, onPositionUpdate]
  );

  // Force immediate GPS refresh
  const handleForceRefresh = useCallback(() => {
    if (simulationActive) {
      // In simulation mode, re-simulate office location
      handleCoords(config.latitud + 0.0001, config.longitud + 0.0001, 5);
      return;
    }

    if (!navigator.geolocation) {
      setErrorMsg('Geolocalización no soportada por su navegador');
      return;
    }

    setIsRefreshing(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleCoords(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
      },
      (err) => {
        setIsRefreshing(false);
        let message = 'No se pudo obtener señal GPS actualizada.';
        if (err.code === err.PERMISSION_DENIED) {
          message = 'Permiso de ubicación denegado. Habilita el GPS.';
        } else if (err.code === err.TIMEOUT) {
          message = 'Tiempo agotado obteniendo señal GPS.';
        }
        setErrorMsg(message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0, // Force fresh fix without cache
        timeout: 10000,
      }
    );
  }, [simulationActive, config.latitud, config.longitud, handleCoords]);

  // Real GPS tracking via browser watchPosition
  useEffect(() => {
    if (simulationActive) {
      // Simulate being exactly at Silocom office (15m from epicenter)
      handleCoords(config.latitud + 0.0001, config.longitud + 0.0001, 5);
      return;
    }

    if (!navigator.geolocation) {
      setErrorMsg('Geolocalización no soportada por su navegador');
      setLoading(false);
      onPositionUpdate(null);
      return;
    }

    setLoading(true);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        handleCoords(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
      },
      (err) => {
        console.warn('Geolocation notice:', err.message);
        let message = 'Activa tu GPS para validar la geocerca de la oficina';
        if (err.code === err.PERMISSION_DENIED) {
          message = 'Permiso de ubicación denegado. Habilita el GPS.';
        } else if (err.code === err.TIMEOUT) {
          message = 'Tiempo de espera agotado obteniendo señal GPS.';
        }
        setErrorMsg(message);
        setLoading(false);
        onPositionUpdate(null);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 12000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [config.latitud, config.longitud, config.radioMaxKm, simulationActive, handleCoords, onPositionUpdate]);

  const maxRadiusMeters = Math.round(config.radioMaxKm * 1000);

  return (
    <div className="w-full">
      {/* Geofence Radar Status Card */}
      <div
        className={`relative overflow-hidden rounded-2xl p-4 border transition-all duration-300 ${
          loading
            ? 'bg-[#131c2e] border-sky-500/40 text-sky-200'
            : position?.isWithinRange
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-100 shadow-[0_0_20px_-3px_rgba(16,185,129,0.25)]'
            : 'bg-rose-950/25 border-rose-500/40 text-rose-100'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Status Icon with Dynamic Glow */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                loading
                  ? 'bg-sky-500/20 border-sky-400/40 text-sky-400 animate-pulse'
                  : position?.isWithinRange
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-400'
                  : 'bg-rose-500/20 border-rose-400/50 text-rose-400'
              }`}
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
              ) : position?.isWithinRange ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              )}
            </div>

            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display text-xs sm:text-sm font-bold uppercase tracking-wider truncate">
                  {loading
                    ? 'Sintonizando Satélites GPS...'
                    : position?.isWithinRange
                    ? 'Dentro de Rango de Oficina'
                    : errorMsg
                    ? 'Alerta de Ubicación'
                    : 'Fuera de Rango de Oficina'}
                </span>

                {/* Animated status beacon */}
                <span className="relative flex h-2 w-2 shrink-0">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      loading
                        ? 'bg-sky-400'
                        : position?.isWithinRange
                        ? 'bg-emerald-400'
                        : 'bg-rose-400'
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      loading
                        ? 'bg-sky-500'
                        : position?.isWithinRange
                        ? 'bg-emerald-500'
                        : 'bg-rose-500'
                    }`}
                  />
                </span>
              </div>

              {/* Distance metric & Prominent 'Actualizar' Button */}
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-300 font-mono">
                {loading ? (
                  <span>Determinando distancia geodésica...</span>
                ) : position ? (
                  <>
                    <span className="flex items-center gap-1.5">
                      <span>Distancia:</span>
                      <strong
                        className={
                          position.isWithinRange
                            ? 'text-emerald-300 font-bold text-sm'
                            : 'text-rose-300 font-bold text-sm'
                        }
                      >
                        {formatDistance(position.distanceMetros)}
                      </strong>
                    </span>

                    {/* Botón ACTUALIZAR visible junto a la distancia */}
                    <button
                      type="button"
                      onClick={handleForceRefresh}
                      disabled={isRefreshing}
                      title="Forzar lectura satelital inmediata y recalcular distancia"
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 text-[11px] font-mono font-bold transition active:scale-95 cursor-pointer disabled:opacity-50 ml-1"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${
                          isRefreshing ? 'animate-spin' : ''
                        }`}
                      />
                      <span>{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
                    </button>

                    <span className="text-slate-500 hidden sm:inline">•</span>
                    <span className="text-slate-400 text-[11px]">
                      Límite: {maxRadiusMeters}m
                    </span>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-rose-300">{errorMsg}</span>
                    <button
                      type="button"
                      onClick={handleForceRefresh}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 text-[11px] font-mono font-bold transition cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reintentar</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Sede info (Clean, no simulation button for regular users) */}
        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-400 flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                simulationActive
                  ? 'bg-amber-400 animate-ping'
                  : position?.isWithinRange
                  ? 'bg-emerald-400'
                  : 'bg-slate-500'
              }`}
            />
            <span>
              {simulationActive
                ? 'Simulación activa: Sede Silocom Caracas'
                : 'Geocerca oficial Silocom'}
            </span>
          </span>

          {simulationActive && (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 border border-amber-500/40 text-amber-300">
              AUDITORÍA ADMIN
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
