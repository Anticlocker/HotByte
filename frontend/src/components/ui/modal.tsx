"use client"
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
  showClose?: boolean;
}

export function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-md", showClose = true }: ModalProps) {
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      prevFocusRef.current = document.activeElement as HTMLElement;
    } else if (prevFocusRef.current) {
      prevFocusRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`relative w-full ${maxWidth} bg-[#121212] border border-gray-800/60 rounded-2xl shadow-2xl shadow-black/50 p-6`}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {showClose && (
              <button
                autoFocus
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-white/5 border border-gray-800 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            )}
            {title && (
              <h2 className="text-[15px] font-black text-white pr-8 mb-2">{title}</h2>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
