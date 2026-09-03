"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FiActivity,
  FiTrendingUp,
  FiRefreshCw,
  FiCheckCircle,
} from "react-icons/fi";

export default function AttributionView() {
  const [model, setModel] = useState("linear");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const touchpoints = [
    { channel: "Google Search Ads", firstTouchShare: "38.5%", lastTouchShare: "22.4%", linearShare: "28.6%", attributedRevenue: "৳1,48,000" },
    { channel: "LinkedIn Sponsored Content", firstTouchShare: "28.2%", lastTouchShare: "35.1%", linearShare: "31.2%", attributedRevenue: "৳1,62,000" },
    { channel: "Meta Retargeting Ads", firstTouchShare: "12.4%", lastTouchShare: "28.5%", linearShare: "20.1%", attributedRevenue: "৳1,04,000" },
    { channel: "Email Broadcasts", firstTouchShare: "15.1%", lastTouchShare: "12.0%", linearShare: "14.1%", attributedRevenue: "৳73,000" },
    { channel: "Direct Website Traffic", firstTouchShare: "5.8%", lastTouchShare: "2.0%", linearShare: "6.0%", attributedRevenue: "৳31,000" },
  ];

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Multi-Touch Marketing Attribution
            </h1>
            <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5">
              Attribution Analytics
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            First-Touch, Last-Touch & Linear Multi-Touch revenue attribution modeling
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="h-8 text-xs w-[140px] border-border/50 bg-background/50">
              <SelectValue placeholder="Attribution Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="linear">Linear Multi-Touch</SelectItem>
              <SelectItem value="first_touch">First-Touch</SelectItem>
              <SelectItem value="last_touch">Last-Touch</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground border-border/50"
            onClick={handleRefresh}
            title="Refresh"
          >
            <FiRefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </Button>
        </div>
      </div>

      {/* 2. TABLE */}
      <div className="rounded-2xl border border-border/50 bg-card shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-500">
              <FiActivity className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Attribution Breakdown</h2>
              <p className="text-xs text-muted-foreground">Revenue share calculated under {model.replace("_", "-")} model</p>
            </div>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{touchpoints.length} Channels</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40">
              <tr>
                <th className="px-4 py-3">Touchpoint Channel</th>
                <th className="px-4 py-3">First-Touch Share</th>
                <th className="px-4 py-3">Last-Touch Share</th>
                <th className="px-4 py-3">Linear Share</th>
                <th className="px-4 py-3">Attributed Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {touchpoints.map((t) => (
                <tr key={t.channel} className="hover:bg-accent/20 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-foreground">{t.channel}</td>
                  <td className="px-4 py-3.5 font-mono text-muted-foreground">{t.firstTouchShare}</td>
                  <td className="px-4 py-3.5 font-mono text-muted-foreground">{t.lastTouchShare}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-blue-500">{t.linearShare}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-emerald-500">{t.attributedRevenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
