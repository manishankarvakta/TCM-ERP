"use client";

import React from "react";
import { IconType } from "react-icons";
import { Badge } from "@/components/ui/badge";

interface MarketingStatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  subtitle?: string;
  icon?: IconType;
  href?: string;
  badgeText?: string;
}

export default function MarketingStatCard({
  title,
  value,
  change,
  changeType = "positive",
  subtitle,
  icon: Icon,
  badgeText,
}: MarketingStatCardProps) {
  return (
    <div className="group flex flex-col justify-between p-3.5 rounded-xl border border-border/50 bg-card hover:border-primary/40 hover:-translate-y-0.5 shadow-2xs hover:shadow-xs transition-all duration-200">
      <div>
        <div className="flex items-center justify-between text-muted-foreground mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 line-clamp-1">
            {title}
          </span>
          {Icon && (
            <div className="p-1 rounded-md bg-muted/60 text-muted-foreground group-hover:text-primary transition-colors">
              <Icon className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
        <div className="text-xl font-extrabold tracking-tight text-foreground">
          {value}
        </div>
      </div>

      <div className="mt-2.5 pt-1.5 border-t border-border/30 flex items-center justify-between text-[10px]">
        {change && (
          <span
            className={`font-semibold ${
              changeType === "positive"
                ? "text-emerald-600 dark:text-emerald-400"
                : changeType === "negative"
                ? "text-rose-600 dark:text-rose-400"
                : "text-muted-foreground"
            }`}
          >
            {change}
          </span>
        )}
        {subtitle && <span className="text-muted-foreground line-clamp-1">{subtitle}</span>}
        {badgeText && (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0.2">
            {badgeText}
          </Badge>
        )}
      </div>
    </div>
  );
}
