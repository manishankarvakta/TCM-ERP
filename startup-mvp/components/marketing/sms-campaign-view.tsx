"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FiMessageSquare,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiCheckCircle,
} from "react-icons/fi";

export default function SmsCampaignView() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const smsLogs = [
    { id: "SMS-201", message: "Reminder: Standard Chartered Banking Sync Webinar starting today at 3 PM.", recipients: 450, delivered: 442, sentAt: "2026-08-14 09:00 AM", status: "DELIVERED" },
    { id: "SMS-202", message: "Exclusive Q3 ERP Consultation Offer. Reply YES to schedule.", recipients: 620, delivered: 608, sentAt: "2026-08-01 10:30 AM", status: "DELIVERED" },
  ];

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              SMS Broadcast Operations
            </h1>
            <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5">
              SMS Gateway Integration Ready
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            SMS broadcast logs, delivery success rates & telco gateway status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground border-border/50"
            onClick={handleRefresh}
            title="Refresh"
          >
            <FiRefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </Button>

          <Button size="sm" className="h-8 text-xs font-semibold px-3 shadow-xs" onClick={() => alert("Send SMS broadcast opened.")}>
            <FiPlus className="mr-1.5 h-3.5 w-3.5" />
            Send SMS Broadcast
          </Button>
        </div>
      </div>

      {/* 2. TABLE */}
      <div className="rounded-2xl border border-border/50 bg-card shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-500">
              <FiMessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">SMS Broadcast History</h2>
              <p className="text-xs text-muted-foreground">Historical SMS broadcasts and gateway delivery confirmation</p>
            </div>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{smsLogs.length} Broadcasts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40">
              <tr>
                <th className="px-4 py-3">Broadcast Message</th>
                <th className="px-4 py-3">Recipients</th>
                <th className="px-4 py-3">Delivered</th>
                <th className="px-4 py-3">Sent Timestamp</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {smsLogs.map((s) => (
                <tr key={s.id} className="hover:bg-accent/20 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-foreground">
                    <div className="font-semibold text-foreground truncate max-w-[400px]">{s.message}</div>
                    <span className="text-[10px] font-mono text-muted-foreground">{s.id}</span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-foreground">{s.recipients}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-emerald-500">{s.delivered} ({((s.delivered/s.recipients)*100).toFixed(1)}%)</td>
                  <td className="px-4 py-3.5 font-mono text-muted-foreground">{s.sentAt}</td>
                  <td className="px-4 py-3.5">
                    <Badge variant="outline" className="text-[9px] px-2 py-0.2 uppercase font-bold text-emerald-500 border-emerald-500/30 bg-emerald-500/5">
                      {s.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
