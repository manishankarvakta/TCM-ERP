"use client";

import React from "react";
import { FiSearch, FiRefreshCw } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FilterOption {
  label: string;
  value: string;
}

interface MarketingFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter?: string;
  onStatusChange?: (status: string) => void;
  statusOptions?: FilterOption[];
  periodFilter?: string;
  onPeriodChange?: (period: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  actionButton?: React.ReactNode;
}

export default function MarketingFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  statusOptions = [],
  periodFilter,
  onPeriodChange,
  onRefresh,
  isRefreshing = false,
  actionButton,
}: MarketingFilterBarProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
      <div className="relative w-[180px] sm:w-[200px]">
        <FiSearch className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-border/50 bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {onStatusChange && statusOptions.length > 0 && (
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="h-8 text-xs w-[130px] border-border/50 bg-background/50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {onPeriodChange && (
        <Select value={periodFilter} onValueChange={onPeriodChange}>
          <SelectTrigger className="h-8 text-xs w-[110px] border-border/50 bg-background/50">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
          </SelectContent>
        </Select>
      )}

      {onRefresh && (
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground border-border/50"
          onClick={onRefresh}
          title="Refresh"
        >
          <FiRefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
        </Button>
      )}

      {actionButton}
    </div>
  );
}
