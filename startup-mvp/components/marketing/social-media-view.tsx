"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FiShare2,
  FiTrendingUp,
  FiUsers,
  FiMessageSquare,
  FiRefreshCw,
  FiChevronRight,
} from "react-icons/fi";

export default function SocialMediaView() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const socialChannels = [
    { name: "LinkedIn Enterprise Page", followers: "18,400", engagementRate: "4.8%", posts: 14, impressions: "142.5K", status: "Active" },
    { name: "Facebook Business Page", followers: "32,100", engagementRate: "3.2%", posts: 18, impressions: "98.2K", status: "Active" },
    { name: "Instagram Official Profile", followers: "12,800", engagementRate: "5.1%", posts: 12, impressions: "45.0K", status: "Active" },
    { name: "YouTube Channel", followers: "4,500", engagementRate: "8.4%", posts: 3, impressions: "28.0K", status: "Active" },
  ];

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Social Media Channel Performance
            </h1>
            <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5">
              Social Audience Reach
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Follower growth, engagement rates & post impressions across social platforms
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

          <Button size="sm" className="h-8 text-xs font-semibold px-3 shadow-xs" onClick={() => alert("Syncing social channels...")}>
            <FiShare2 className="mr-1.5 h-3.5 w-3.5" />
            Sync Channels
          </Button>
        </div>
      </div>

      {/* 2. CHANNELS LIST */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {socialChannels.map((ch) => (
          <div key={ch.name} className="rounded-2xl border border-border/50 bg-card p-4 space-y-3 shadow-xs flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">{ch.name}</span>
                <Badge variant="outline" className="text-[9px] text-emerald-500 border-emerald-500/30">{ch.status}</Badge>
              </div>
              <div className="text-2xl font-extrabold text-foreground">{ch.followers} <span className="text-xs font-normal text-muted-foreground">Followers</span></div>
              <div className="space-y-1 text-xs text-muted-foreground pt-1 border-t border-border/30">
                <div className="flex justify-between"><span>Engagement Rate:</span><span className="font-mono text-emerald-500 font-semibold">{ch.engagementRate}</span></div>
                <div className="flex justify-between"><span>Impressions (MTD):</span><span className="font-mono text-foreground">{ch.impressions}</span></div>
                <div className="flex justify-between"><span>Posts Published:</span><span className="font-mono text-foreground">{ch.posts} posts</span></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
