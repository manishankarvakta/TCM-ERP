"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FiCalendar,
  FiPlus,
  FiSearch,
  FiRefreshCw,
  FiClock,
  FiCheckCircle,
  FiFileText,
  FiEye,
  FiEdit,
  FiTrash2,
} from "react-icons/fi";
import MarketingStatCard from "./shared/marketing-stat-card";
import MarketingFilterBar from "./shared/marketing-filter-bar";

export default function ContentCalendarView() {
  const [activeTab, setActiveTab] = useState("month");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const contentItems = [
    { id: "CNT-101", title: "Enterprise ERP Feature Teaser Video", type: "Video", platform: "LinkedIn", date: "2026-09-02", status: "SCHEDULED", author: "Imran Hossain" },
    { id: "CNT-102", title: "Standard Chartered Integration Carousel", type: "Carousel", platform: "Facebook", date: "2026-09-05", status: "APPROVED", author: "Farhana Yeasmin" },
    { id: "CNT-103", title: "HR & Biometric Attendance Blog Post", type: "Blog", platform: "Website", date: "2026-09-08", status: "DRAFT", author: "Imran Hossain" },
    { id: "CNT-104", title: "Q3 Customer Success Case Study Reel", type: "Reel", platform: "Instagram", date: "2026-09-12", status: "IN_REVIEW", author: "Farhana Yeasmin" },
  ];

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Content Calendar & Publishing Workspace
            </h1>
            <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
              Content Pipeline
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Plan, review, schedule and publish content across social media, blogs & promotional collateral
          </p>
        </div>

        <MarketingFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          statusOptions={[
            { label: "All Statuses", value: "all" },
            { label: "Draft", value: "draft" },
            { label: "In Review", value: "in_review" },
            { label: "Approved", value: "approved" },
            { label: "Scheduled", value: "scheduled" },
          ]}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          actionButton={
            <Button size="sm" className="h-8 text-xs font-semibold px-3 shadow-xs" onClick={() => alert("Create Content opened.")}>
              <FiPlus className="mr-1.5 h-3.5 w-3.5" /> Create Content
            </Button>
          }
        />
      </div>

      {/* 2. VIEWS TABS (MONTH CALENDAR, WEEK, LIST, KANBAN BOARD) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1 border border-border/40">
          <TabsTrigger value="month" className="text-xs font-semibold">Month Calendar</TabsTrigger>
          <TabsTrigger value="week" className="text-xs font-semibold">Week View</TabsTrigger>
          <TabsTrigger value="list" className="text-xs font-semibold">Content List</TabsTrigger>
          <TabsTrigger value="kanban" className="text-xs font-semibold">Kanban Board</TabsTrigger>
        </TabsList>

        <TabsContent value="month" className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-xs">
            <h2 className="text-sm font-semibold text-foreground mb-4">September 2026 Content Grid</h2>
            <div className="grid grid-cols-7 gap-2 text-center text-xs">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="font-bold text-muted-foreground p-2 border-b border-border/40 uppercase text-[10px]">{d}</div>
              ))}
              {Array.from({ length: 28 }).map((_, i) => (
                <div key={i} className="min-h-[70px] p-1 border border-border/30 rounded-md text-left bg-background/30 text-[10px]">
                  <span className="font-bold text-muted-foreground">{i + 1}</span>
                  {i === 1 && <div className="mt-1 p-1 rounded bg-blue-500/10 text-blue-500 font-semibold truncate">LinkedIn Video</div>}
                  {i === 4 && <div className="mt-1 p-1 rounded bg-emerald-500/10 text-emerald-500 font-semibold truncate">FB Carousel</div>}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40">
                <tr>
                  <th className="px-4 py-3">Content Title</th>
                  <th className="px-4 py-3">Type / Platform</th>
                  <th className="px-4 py-3">Scheduled Date</th>
                  <th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {contentItems.map((c) => (
                  <tr key={c.id} className="hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-foreground">
                      <div className="font-semibold text-foreground">{c.title}</div>
                      <span className="text-[10px] font-mono text-muted-foreground">{c.id}</span>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">{c.type} • {c.platform}</td>
                    <td className="px-4 py-3.5 font-mono text-muted-foreground">{c.date}</td>
                    <td className="px-4 py-3.5 text-foreground">{c.author}</td>
                    <td className="px-4 py-3.5">
                      <Badge variant="outline" className="text-[9px] px-2 py-0.2 uppercase font-bold text-emerald-500 border-emerald-500/30 bg-emerald-500/5">
                        {c.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                        <FiEye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
