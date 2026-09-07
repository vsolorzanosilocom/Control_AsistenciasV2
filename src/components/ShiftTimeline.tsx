import React from 'react';
import { Clock, CheckCircle2, History, ArrowRight, ShieldCheck } from 'lucide-react';
import { AsistenciaRecord, OfficeConfig } from '../types';

interface ShiftTimelineProps {
  config: OfficeConfig;
  recentRecords: AsistenciaRecord[];
}

export const ShiftTimeline: React.FC<ShiftTimelineProps> = ({
  config,
  recentRecords,
}) => {
  // Current time in Caracas to compute progress percentage of daily shift (08:00 - 17:00 = 9 hours)
  const now = new Date();
  const caracasDate = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/Caracas' })
  );
  const hourDecimal =
    caracasDate.getHours() +
    caracasDate.getMinutes() / 60 +
    caracasDate.getSeconds() / 3600;

  // Percentage of day between 08:00 (0%) and 17:00 (100%)
  const startHour = config.horaEntrada; // 8
  const endHour = config.horaSalida; // 17
  let progressPercent = 0;

  if (hourDecimal <= startHour) {
    progressPercent = 0;
  } else if (hourDecimal >= endHour) {
    progressPercent = 100;
  } else {
    progressPercent = Math.round(
      ((hourDecimal - startHour) / (endHour - startHour)) * 100
    );
  }

  // Display top 5 recent records
  const topRecords = recentRecords.slice(0, 4);

  return (
    <div className="w-full rounded-3xl bg-[#0f172a] border border-[#334155] p-5 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-sky-400" />
          <h3 className="font-display text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
            Línea de Tiempo Operacional
          </h3>
        </div>
        <span className="font-mono text-[11px] font-semibold text-slate-400">
          Turno: 08:00 - 17:00
        </span>
      </div>

      {/* Progress Bar (Mandated by DESIGN.md: Track #1e293b, 6px height, dual gradient emerald to dodger) */}
      <div className="space-y-1.5 mb-5">
        <div className="w-full h-2 rounded-full bg-[#1e293b] overflow-hidden border border-slate-700/50">
          <div
            className="h-full bg-gradient-to-r from-[#10b981] via-[#0ea5e9] to-[#0284c7] transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
          <span className="text-emerald-400 font-semibold">08:00 Entrada</span>
          <span className="text-slate-500">Progreso Turno: {progressPercent}%</span>
          <span className="text-sky-400 font-semibold">17:00 Salida</span>
        </div>
      </div>

      {/* Recent punches list on this terminal */}
      <div className="border-t border-slate-800/80 pt-3">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 text-slate-400">
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
              Últimos Marcajes Registrados
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400">
            En Tiempo Real
          </span>
        </div>

        {topRecords.length === 0 ? (
          <div className="text-center py-4 text-xs font-mono text-slate-500">
            No hay registros de marcaje recientes.
          </div>
        ) : (
          <div className="space-y-2">
            {topRecords.map((rec, idx) => (
              <div
                key={`${rec.id}-${rec.timestamp}-${idx}`}
                className="rounded-xl bg-[#131c2e] border border-slate-800/80 p-2.5 flex items-center justify-between text-xs transition-colors hover:border-slate-700"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                      rec.tipo === 'ENTRADA'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                    }`}
                  >
                    {rec.tipo}
                  </span>

                  <div className="flex flex-col truncate">
                    <span className="font-semibold text-slate-200 truncate text-[12px]">
                      {rec.nombre}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 truncate">
                      {rec.id}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0 font-mono text-[11px]">
                  <div className="text-slate-300 font-medium">
                    {rec.fechaHora.split(' ')[1] || rec.fechaHora}
                  </div>
                  <div className="text-[9px] text-slate-500">
                    {rec.fechaHora.split(' ')[0]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
