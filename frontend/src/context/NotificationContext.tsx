"use client"
import { createContext, useContext, useCallback, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ToastContainer, type ToastData, type ToastType } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Info, Loader2 } from "lucide-react";

interface ConfirmResult {
  isConfirmed: boolean;
  isDenied?: boolean;
}

interface NotificationContextType {
  toast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  confirm: (title: string, message?: string, confirmText?: string, cancelText?: string) => Promise<ConfirmResult>;
  alert: (title: string, message?: string, type?: ToastType) => Promise<void>;
  prompt: (title: string, inputLabel?: string, defaultValue?: string) => Promise<string | null>;
  loading: (title: string, message?: string) => void;
  close: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

let toastCounter = 0;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [modalState, setModalState] = useState<{
    type: "alert" | "confirm" | "prompt" | "loading";
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    inputLabel?: string;
    defaultValue?: string;
    alertType?: ToastType;
  } | null>(null);
  const modalResolver = useRef<((value: any) => void) | null>(null);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, message?: string, duration = 4000) => {
    const id = `toast_${++toastCounter}`;
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);
    if (duration > 0) {
      setTimeout(() => dismissToast(id), duration);
    }
  }, [dismissToast]);

  const toast = useCallback((type: ToastType, title: string, message?: string, duration = 4000) => {
    addToast(type, title, message, duration);
  }, [addToast]);

  const closeModal = useCallback(() => {
    setModalState(null);
  }, []);

  const confirm = useCallback((title: string, message?: string, confirmText = "Confirm", cancelText = "Cancel"): Promise<ConfirmResult> => {
    return new Promise((resolve) => {
      modalResolver.current = resolve;
      setModalState({ type: "confirm", title, message, confirmText, cancelText });
    });
  }, []);

  const alert = useCallback((title: string, message?: string, alertType: ToastType = "info"): Promise<void> => {
    return new Promise((resolve) => {
      modalResolver.current = resolve;
      setModalState({ type: "alert", title, message, alertType });
    });
  }, []);

  const prompt = useCallback((title: string, inputLabel?: string, defaultValue?: string): Promise<string | null> => {
    return new Promise((resolve) => {
      modalResolver.current = resolve;
      setModalState({ type: "prompt", title, inputLabel, defaultValue });
    });
  }, []);

  const loading = useCallback((title: string, message?: string) => {
    setModalState({ type: "loading", title, message });
  }, []);

  const close = useCallback(() => {
    closeModal();
  }, [closeModal]);

  const handleModalConfirm = useCallback((value?: string) => {
    if (modalResolver.current) {
      if (modalState?.type === "confirm") {
        modalResolver.current({ isConfirmed: true });
      } else if (modalState?.type === "alert") {
        modalResolver.current(undefined);
      } else if (modalState?.type === "prompt") {
        modalResolver.current(value || null);
      }
    }
    closeModal();
  }, [modalState, closeModal]);

  const handleModalCancel = useCallback(() => {
    if (modalResolver.current) {
      if (modalState?.type === "confirm") {
        modalResolver.current({ isConfirmed: false });
      } else if (modalState?.type === "prompt") {
        modalResolver.current(null);
      }
    }
    closeModal();
  }, [modalState, closeModal]);

  const iconMap: Record<string, React.ReactNode> = {
    success: <CheckCircle size={40} className="text-emerald-400" />,
    error: <XCircle size={40} className="text-red-400" />,
    warning: <AlertTriangle size={40} className="text-amber-400" />,
    info: <Info size={40} className="text-blue-400" />,
  };

  return (
    <NotificationContext.Provider value={{ toast, success: (t, m) => addToast("success", t, m), error: (t, m) => addToast("error", t, m), warning: (t, m) => addToast("warning", t, m), info: (t, m) => addToast("info", t, m), confirm, alert, prompt, loading, close }}>
      {children}
      {mounted && createPortal(
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />,
        document.body
      )}
      {mounted && createPortal(
        <Modal isOpen={modalState !== null} onClose={handleModalCancel} title={modalState?.type !== "loading" ? modalState?.title : undefined} maxWidth={modalState?.type === "prompt" ? "max-w-sm" : "max-w-md"} showClose={modalState?.type !== "loading"}>
          {modalState?.type === "loading" ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 size={36} className="text-orange-500 animate-spin" />
              <p className="text-[15px] font-black text-white text-center">{modalState.title}</p>
              {modalState.message && <p className="text-[12px] text-gray-400 text-center -mt-2">{modalState.message}</p>}
            </div>
          ) : modalState?.type === "alert" || modalState?.type === "confirm" ? (
            <div className="flex flex-col items-center gap-4 py-4">
              {modalState.alertType && <div>{iconMap[modalState.alertType]}</div>}
              <p className="text-[13px] text-gray-300 text-center leading-relaxed">{modalState.message || modalState.title}</p>
              <div className="flex gap-3 mt-2 w-full">
                {modalState.type === "confirm" && (
                  <button onClick={handleModalCancel} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-[11px] font-bold uppercase tracking-wider hover:bg-white/5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-500/50">
                    {modalState.cancelText || "Cancel"}
                  </button>
                )}
                <button onClick={() => handleModalConfirm()} className="flex-1 px-4 py-2.5 rounded-xl bg-orange-600 text-white text-[11px] font-bold uppercase tracking-wider hover:bg-orange-500 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/50">
                  {modalState?.type === "alert" ? "OK" : modalState?.confirmText || "Confirm"}
                </button>
              </div>
            </div>
          ) : modalState?.type === "prompt" ? (
            <PromptForm inputLabel={modalState.inputLabel} defaultValue={modalState.defaultValue} onConfirm={handleModalConfirm} onCancel={handleModalCancel} />
          ) : null}
        </Modal>,
        document.body
      )}
    </NotificationContext.Provider>
  );
}

function PromptForm({ inputLabel, defaultValue, onConfirm, onCancel }: { inputLabel?: string; defaultValue?: string; onConfirm: (value: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(defaultValue || "");

  return (
    <div className="flex flex-col gap-4 py-2">
      {inputLabel && <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">{inputLabel}</label>}
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onConfirm(value); if (e.key === "Escape") onCancel(); }}
        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-gray-700 text-white text-[13px] placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
        placeholder={inputLabel || "Enter value..."}
      />
      <div className="flex gap-3 mt-1">
        <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-[11px] font-bold uppercase tracking-wider hover:bg-white/5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-500/50">
          Cancel
        </button>
        <button onClick={() => onConfirm(value)} className="flex-1 px-4 py-2.5 rounded-xl bg-orange-600 text-white text-[11px] font-bold uppercase tracking-wider hover:bg-orange-500 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/50">
          Submit
        </button>
      </div>
    </div>
  );
}

export function useNotification(): NotificationContextType {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return ctx;
}
