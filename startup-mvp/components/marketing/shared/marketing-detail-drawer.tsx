"use client";

import React from "react";
import { FiX } from "react-icons/fi";
import { Button } from "@/components/ui/button";

interface MarketingDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footerActions?: React.ReactNode;
}

export default function MarketingDetailDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footerActions,
}: MarketingDetailDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-xl h-full bg-card border-l border-border/60 shadow-2xl flex flex-col justify-between p-6 animate-in slide-in-from-right duration-200">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">{title}</h2>
              {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <FiX className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-4 text-xs overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
            {children}
          </div>
        </div>

        {footerActions && (
          <div className="pt-3 border-t border-border/40 flex justify-end gap-2 shrink-0">
            {footerActions}
          </div>
        )}
      </div>
    </div>
  );
}
