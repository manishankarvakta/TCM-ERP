"use client";

import { createContext, useContext } from "react";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toast";

interface ToastContextType {
  toast: ReturnType<typeof useToast>["toast"];
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toast, toasts, closeToast } = useToast();

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <Toaster toasts={toasts as any} onClose={closeToast} />
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToastContext must be used within ToastProvider");
  }
  return context;
}

