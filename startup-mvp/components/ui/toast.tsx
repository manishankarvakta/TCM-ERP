"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  return (
    <div
      className={cn(
        "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all",
        toast.variant === "destructive"
          ? "border-destructive bg-destructive text-destructive-foreground"
          : "border bg-background text-foreground"
      )}
    >
      <div className="grid gap-1">
        {toast.title && (
          <div className="text-sm font-semibold">{toast.title}</div>
        )}
        {toast.description && (
          <div className="text-sm opacity-90">{toast.description}</div>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "absolute right-2 top-2 h-8 w-8 p-0",
          toast.variant === "destructive"
            ? "text-destructive-foreground hover:bg-destructive-foreground/20"
            : ""
        )}
        onClick={() => onClose(toast.id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface ToasterProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export function Toaster({ toasts, onClose }: ToasterProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

