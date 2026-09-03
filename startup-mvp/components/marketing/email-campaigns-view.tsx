"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FiMail,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiCheckCircle,
  FiClock,
  FiChevronRight,
} from "react-icons/fi";

export default function EmailCampaignsView() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const emailCampaigns = [
    { id: "EML-01", subject: "August Enterprise ERP Product Newsletter", audience: "Enterprise Leads (1,450)", openRate: "34.2%", clickRate: "8.5%", sentAt: "2026-08-20", status: "SENT" },
    { id: "EML-02", subject: "Exclusive Invitation: Standard Chartered Banking Sync Webinar", audience: "Fintech Decision Makers (820)", openRate: "42.0%", clickRate: "14.2%", sentAt: "2026-08-14", status: "SENT" },
    { id: "EML-03", subject: "Q3 Customer Success Stories & Case Studies", audience: "Active Subscribers (2,100)", openRate: "28.5%", clickRate: "5.1%", sentAt: "2026-08-05", status: "SENT" },
    { id: "EML-04", subject: "Biometric Attendance Feature Teaser", audience: "HR Managers (640)", openRate: "—", clickRate: "—", sentAt: "2026-09-05", status: "SCHEDULED" },
  ];

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Email Marketing Broadcasts
            </h1>
            <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-teal-500/30 text-teal-600 dark:text-teal-400 bg-teal-500/5">
              Email Broadcast Engine
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Newsletter broadcasts, audience segmentation, open & click rate analytics
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

          <Button size="sm" className="h-8 text-xs font-semibold px-3 shadow-xs" onClick={() => alert("Create email campaign opened.")}>
            <FiPlus className="mr-1.5 h-3.5 w-3.5" />
            New Email Broadcast
          </Button>
        </div>
      </div>

      {/* 2. TABLE */}
      <div className="rounded-2xl border border-border/50 bg-card shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-teal-500/10 text-teal-500">
              <FiMail className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Email Broadcast Ledger</h2>
              <p className="text-xs text-muted-foreground">Historical and scheduled email broadcasts</p>
            </div>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{emailCampaigns.length} Broadcasts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40">
              <tr>
                <th className="px-4 py-3">Subject / Campaign</th>
                <th className="px-4 py-3">Audience Segment</th>
                <th className="px-4 py-3">Sent / Scheduled Date</th>
                <th className="px-4 py-3">Open Rate</th>
                <th className="px-4 py-3">Click Rate</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {emailCampaigns.map((em) => (
                <tr key={em.id} className="hover:bg-accent/20 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-foreground">
                    <div className="font-semibold text-foreground">{em.subject}</div>
                    <span className="text-[10px] font-mono text-muted-foreground">{em.id}</span>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">{em.audience}</td>
                  <td className="px-4 py-3.5 font-mono text-muted-foreground">{em.sentAt}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-emerald-500">{em.openRate}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-blue-500">{em.clickRate}</td>
                  <td className="px-4 py-3.5">
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-2 py-0.2 uppercase font-bold ${
                        em.status === "SENT" ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/5" : "text-blue-500 border-blue-500/30 bg-blue-500/5"
                      }`}
                    >
                      {em.status}
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
