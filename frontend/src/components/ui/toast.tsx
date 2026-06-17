"use client"
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} className="text-emerald-400" />,
  error: <XCircle size={18} className="text-red-400" />,
  warning: <AlertTriangle size={18} className="text-amber-400" />,
  info: <Info size={18} className="text-blue-400" />,
};

const bgMap: Record<ToastType, string> = {
  success: "border-emerald-500/20 bg-emerald-500/5",
  error: "border-red-500/20 bg-red-500/5",
  warning: "border-amber-500/20 bg-amber-500/5",
  info: "border-blue-500/20 bg-blue-500/5",
};

interface ToastItemProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`flex items-start gap-3 w-full max-w-sm rounded-xl border ${bgMap[toast.type]} bg-[#121212] backdrop-blur-xl p-4 shadow-2xl shadow-black/40`}
      role="alert"
      aria-live="polite"
    >
      <div className="shrink-0 mt-0.5">{iconMap[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-white leading-tight">{toast.title}</p>
        {toast.message && (
          <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-all cursor-pointer"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" aria-live="polite">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
