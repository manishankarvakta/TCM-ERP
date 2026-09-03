"use client";

import React from "react";
import { IconType } from "react-icons";
import { FiLayers } from "react-icons/fi";
import { Button } from "@/components/ui/button";

interface MarketingEmptyStateProps {
  title: string;
  description: string;
  icon?: IconType;
  actionText?: string;
  onAction?: () => void;
}

export default function MarketingEmptyState({
  title,
  description,
  icon: Icon = FiLayers,
  actionText,
  onAction,
}: MarketingEmptyStateProps) {
  return (
    <div className="p-8 text-center border border-dashed border-border/60 rounded-2xl bg-background/50 flex flex-col items-center justify-center space-y-3">
      <div className="p-3 rounded-full bg-accent/60 text-muted-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <div className="max-w-sm space-y-1">
        <h3 className="font-semibold text-foreground text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {actionText && onAction && (
        <Button size="sm" className="h-8 text-xs font-semibold px-3 mt-1" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}
