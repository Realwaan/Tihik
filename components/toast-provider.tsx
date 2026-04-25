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
        {toasts.map((toast, index) => (
          <ToastItem key={toast.id} toast={toast} index={index} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  index,
  onRemove,
}: {
  toast: Toast;
  index: number;
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
    success:
      "border-emerald-200/90 bg-gradient-to-br from-emerald-50/95 via-white/95 to-emerald-100/80 text-emerald-950 shadow-[0_12px_38px_-18px_rgba(5,150,105,0.55)] dark:border-emerald-500/25 dark:from-emerald-500/20 dark:via-slate-900/92 dark:to-slate-900/95 dark:text-emerald-100",
    error:
      "border-rose-200/90 bg-gradient-to-br from-rose-50/95 via-white/95 to-rose-100/80 text-rose-950 shadow-[0_12px_38px_-18px_rgba(225,29,72,0.55)] dark:border-rose-500/25 dark:from-rose-500/20 dark:via-slate-900/92 dark:to-slate-900/95 dark:text-rose-100",
    info:
      "border-sky-200/90 bg-gradient-to-br from-sky-50/95 via-white/95 to-sky-100/80 text-sky-950 shadow-[0_12px_38px_-18px_rgba(2,132,199,0.55)] dark:border-sky-500/25 dark:from-sky-500/20 dark:via-slate-900/92 dark:to-slate-900/95 dark:text-sky-100",
    warning:
      "border-amber-200/90 bg-gradient-to-br from-amber-50/95 via-white/95 to-amber-100/80 text-amber-950 shadow-[0_12px_38px_-18px_rgba(217,119,6,0.5)] dark:border-amber-500/25 dark:from-amber-500/20 dark:via-slate-900/92 dark:to-slate-900/95 dark:text-amber-100",
  };

  const iconStyles = {
    success:
      "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/25 dark:bg-emerald-300/15 dark:text-emerald-200 dark:ring-emerald-300/25",
    error:
      "bg-rose-500/15 text-rose-700 ring-1 ring-rose-500/25 dark:bg-rose-300/15 dark:text-rose-200 dark:ring-rose-300/25",
    info:
      "bg-sky-500/15 text-sky-700 ring-1 ring-sky-500/25 dark:bg-sky-300/15 dark:text-sky-200 dark:ring-sky-300/25",
    warning:
      "bg-amber-500/20 text-amber-700 ring-1 ring-amber-500/25 dark:bg-amber-300/20 dark:text-amber-200 dark:ring-amber-300/30",
  };

  const progressStyles = {
    success: "from-emerald-500/80 via-emerald-400/80 to-emerald-300/80",
    error: "from-rose-500/85 via-rose-400/80 to-rose-300/80",
    info: "from-sky-500/85 via-cyan-400/80 to-sky-300/75",
    warning: "from-amber-500/90 via-amber-400/85 to-yellow-300/75",
  };

  const Icon = icons[toast.type];

  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      aria-live={toast.type === "error" ? "assertive" : "polite"}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border p-4 backdrop-blur-xl transition-all duration-300 ease-out ${styles[toast.type]} ${
        visible ? "translate-x-0 translate-y-0 opacity-100" : "translate-x-5 translate-y-1 opacity-0"
      }`}
      style={{ transitionDelay: `${Math.min(index, 4) * 45}ms` }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.42),transparent_45%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.07),transparent_42%)]" />
      <div className="relative flex items-start gap-3">
        <span className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${iconStyles[toast.type]}`}>
          <Icon className="h-4.5 w-4.5" />
        </span>
        <p className="flex-1 pr-1 text-sm font-semibold leading-relaxed tracking-tight">{toast.message}</p>
        <button
          onClick={() => {
            triggerHaptic("light");
            setVisible(false);
          }}
          className="flex-shrink-0 cursor-pointer rounded-full p-1.5 text-slate-600/85 transition-all duration-150 hover:bg-black/10 hover:text-slate-900 dark:text-slate-300/85 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left rounded-b-2xl bg-gradient-to-r ${progressStyles[toast.type]}`}
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
