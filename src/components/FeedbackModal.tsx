import React from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Smartphone,
  MapPin,
  Clock,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ModalData {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'device_alert';
  title: string;
  message: string;
  details?: {
    empleado?: string;
    tipo?: 'ENTRADA' | 'SALIDA';
    hora?: string;
    distancia?: number;
    dispositivo?: string;
    nuevoDispositivo?: boolean;
    syncStatus?: string;
  };
}

interface FeedbackModalProps {
  data: ModalData;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  data,
  onClose,
}) => {
  if (!data.isOpen) return null;

  const iconConfig = {
    success: {
      icon: <CheckCircle2 className="w-10 h-10 text-emerald-400" />,
      bg: 'bg-emerald-500/15 border-emerald-500/30',
      glow: 'shadow-[0_0_30px_-5px_rgba(16,185,129,0.4)]',
      accentColor: 'text-emerald-400',
    },
    error: {
      icon: <XCircle className="w-10 h-10 text-rose-400" />,
      bg: 'bg-rose-500/15 border-rose-500/30',
      glow: 'shadow-[0_0_30px_-5px_rgba(239,68,68,0.4)]',
      accentColor: 'text-rose-400',
    },
    warning: {
      icon: <AlertTriangle className="w-10 h-10 text-amber-400" />,
      bg: 'bg-amber-500/15 border-amber-500/30',
      glow: 'shadow-[0_0_30px_-5px_rgba(245,158,11,0.4)]',
      accentColor: 'text-amber-400',
    },
    device_alert: {
      icon: <Smartphone className="w-10 h-10 text-rose-400" />,
      bg: 'bg-rose-500/15 border-rose-500/30',
      glow: 'shadow-[0_0_30px_-5px_rgba(239,68,68,0.4)]',
      accentColor: 'text-rose-400',
    },
  };

  const currentIcon = iconConfig[data.type] || iconConfig.error;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md rounded-3xl bg-[#131c2e] border border-slate-700/60 p-6 text-center shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Animated Icon Glow */}
          <div
            className={`mx-auto mb-4 w-18 h-18 rounded-2xl flex items-center justify-center border ${currentIcon.bg} ${currentIcon.glow}`}
          >
            {currentIcon.icon}
          </div>

          <h3 className="font-display text-xl font-bold text-white mb-2">
            {data.title}
          </h3>

          <p className="text-sm text-slate-300 leading-relaxed mb-5 font-normal">
            {data.message}
          </p>

          {/* Operational Details Card if provided */}
          {data.details && (
            <div className="mb-6 rounded-xl bg-[#0b1326] border border-slate-800 p-3.5 text-left text-xs font-mono space-y-2">
              {data.details.empleado && (
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-500 uppercase text-[10px]">
                    Colaborador:
                  </span>
                  <span className="font-semibold text-white">
                    {data.details.empleado}
                  </span>
                </div>
              )}

              {data.details.tipo && (
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-500 uppercase text-[10px]">
                    Marcaje:
                  </span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      data.details.tipo === 'ENTRADA'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    }`}
                  >
                    {data.details.tipo}
                  </span>
                </div>
              )}

              {data.details.hora && (
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-500 uppercase text-[10px]">
                    Timestamp:
                  </span>
                  <span className="text-slate-200">{data.details.hora}</span>
                </div>
              )}

              {data.details.distancia !== undefined && (
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-500 uppercase text-[10px]">
                    Precisión / Distancia:
                  </span>
                  <span className="text-emerald-300">
                    A {data.details.distancia}m de sede
                  </span>
                </div>
              )}

              {data.details.dispositivo && (
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-500 uppercase text-[10px]">
                    Terminal:
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    {data.details.dispositivo}
                  </span>
                </div>
              )}

              {data.details.syncStatus && (
                <div className="pt-2 mt-1 border-t border-slate-800/80 flex justify-between items-center text-[10px]">
                  <span className="text-slate-500">Estado de Sincronía:</span>
                  <span className="text-sky-300">
                    {data.details.syncStatus}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full h-12 rounded-xl bg-slate-200 text-slate-950 font-display font-bold text-sm hover:bg-white active:scale-[0.98] transition-all shadow-lg"
          >
            Entendido
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
