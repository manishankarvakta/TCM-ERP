"use client";

import { useState, useCallback } from "react";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number | null; // Duration in milliseconds. Defaults to 5000ms. Set to null to disable auto-dismiss
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    ({ title, description, variant = "default", duration }: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substring(7);
      // Default duration is 5000ms (5 seconds) if not specified
      // Set duration to null to disable auto-dismiss
      const toastDuration = duration !== undefined ? duration : 5000;
      const newToast: Toast = { id, title, description, variant, duration: toastDuration };
      
      setToasts((prev) => [...prev, newToast]);
      
      // Auto-remove if duration is set and > 0
      if (toastDuration !== null && toastDuration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, toastDuration);
      }
    },
    []
  );

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toast, toasts, closeToast };
}

