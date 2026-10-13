'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, Heart, X } from 'lucide-react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  icon?: 'message' | 'reaction';
  avatarUrl?: string | null;
  onClick?: () => void;
}

interface ToastContextValue {
  showToast: (toast: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-2), { ...toast, id }]);
    // Auto-dismiss — notifications should never pile up or need manual cleanup
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:right-6 sm:top-6">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-3 shadow-elevated"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full brand-gradient text-white">
                {t.icon === 'reaction' ? <Heart size={16} /> : <MessageCircle size={16} />}
              </div>
              <button
                onClick={() => {
                  t.onClick?.();
                  dismiss(t.id);
                }}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm font-semibold">{t.title}</p>
                {t.description && (
                  <p className="truncate text-xs text-[rgb(var(--text-soft))]">{t.description}</p>
                )}
              </button>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-full p-1 text-[rgb(var(--text-soft))] hover:bg-[rgb(var(--bg-soft))]"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
