"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast(options: Omit<Toast, "id">): void;
  success(title: string, description?: string): void;
  error(title: string, description?: string): void;
  warning(title: string, description?: string): void;
  info(title: string, description?: string): void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const STYLES: Record<ToastType, string> = {
  success: "border-[#2E7D32]/20 bg-white text-[#2E7D32]",
  error: "border-[#D32F2F]/20 bg-white text-[#D32F2F]",
  warning: "border-[#F9A825]/20 bg-white text-[#E65100]",
  info: "border-[#1565C0]/20 bg-white text-[#1565C0]",
};

const ICON_STYLES: Record<ToastType, string> = {
  success: "text-[#2E7D32]",
  error: "text-[#D32F2F]",
  warning: "text-[#E65100]",
  info: "text-[#1565C0]",
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (_id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, 3700);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const Icon = ICONS[toast.type];

  return (
    <div
      className={cn(
        "flex w-80 max-w-[calc(100vw-2rem)] items-start gap-3 rounded-xl border p-4 shadow-lg transition-all duration-300",
        STYLES[toast.type],
        visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
    >
      <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", ICON_STYLES[toast.type])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1a1a1a] leading-tight">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-xs text-[#64748b] leading-snug">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => onRemove(toast.id), 300);
        }}
        className="flex-shrink-0 text-[#94a3b8] hover:text-[#64748b] transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((options: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-4), { ...options, id }]);
  }, []);

  const value: ToastContextValue = {
    toast: addToast,
    success: (title, description) => addToast({ type: "success", title, description }),
    error: (title, description) => addToast({ type: "error", title, description }),
    warning: (title, description) => addToast({ type: "warning", title, description }),
    info: (title, description) => addToast({ type: "info", title, description }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-20 right-4 z-[200] flex flex-col gap-2 lg:bottom-4"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
