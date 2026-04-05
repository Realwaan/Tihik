"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { CheckCircle, XCircle, Info, AlertCircle, X } from "lucide-react";

import { triggerHaptic } from "@/lib/haptics";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  durationMs: number;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(7);
    const durationMs = type === "success" ? 3400 : type === "info" ? 4200 : 5000;
    setToasts((prev) => [...prev, { id, type, message, durationMs }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-0 right-0 z-50 flex w-full max-w-md flex-col gap-3 p-4 sm:p-6">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const hideTimer = window.setTimeout(() => setVisible(false), toast.durationMs);
    return () => window.clearTimeout(hideTimer);
  }, [toast.durationMs]);

  useEffect(() => {
    if (visible) return;
    const removeTimer = window.setTimeout(() => onRemove(toast.id), 240);
    return () => window.clearTimeout(removeTimer);
  }, [visible, onRemove, toast.id]);

  const icons = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
    warning: AlertCircle,
  };

  const styles = {
    success: "bg-green-50 border-green-200 text-green-900",
    error: "bg-red-50 border-red-200 text-red-900",
    info: "bg-blue-50 border-blue-200 text-blue-900",
    warning: "bg-amber-50 border-amber-200 text-amber-900",
  };

  const iconStyles = {
    success: "text-green-600",
    error: "text-red-600",
    info: "text-blue-600",
    warning: "text-amber-600",
  };

  const Icon = icons[toast.type];

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border p-4 shadow-lg backdrop-blur transition-all duration-200 ease-out ${styles[toast.type]} ${
        visible ? "translate-x-0 opacity-100" : "translate-x-3 opacity-0"
      }`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 flex-shrink-0 ${iconStyles[toast.type]}`} />
        <p className="flex-1 text-sm font-medium leading-relaxed">{toast.message}</p>
        <button
          onClick={() => {
            triggerHaptic("light");
            setVisible(false);
          }}
          className="flex-shrink-0 cursor-pointer rounded-full p-1 transition-colors hover:bg-black/5"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left bg-black/10 dark:bg-white/10"
        style={{
          transform: visible ? "scaleX(0)" : "scaleX(1)",
          transition: `transform ${toast.durationMs}ms linear`,
        }}
      />
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
