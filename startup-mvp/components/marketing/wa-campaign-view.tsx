"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FiMessageSquare,
  FiSend,
  FiUsers,
  FiCheckCircle,
  FiBarChart,
  FiPlus,
  FiRefreshCw,
  FiSmartphone,
  FiClock,
  FiEye,
} from "react-icons/fi";

export default function WaCampaignView() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"campaigns" | "templates" | "autoresponder">("campaigns");

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const campaigns = [
    {
      id: "WA-2026-001",
      name: "Q1 Product Upgrade Broadcast",
      status: "Active",
      audience: "Enterprise Leads",
      recipients: "1,450",
      sent: "1,450",
      delivered: "1,410 (97%)",
      read: "1,120 (77%)",
      replies: "340 (23%)",
      scheduledDate: "2026-03-01 10:00 AM",
    },
    {
      id: "WA-2026-002",
      name: "Exclusive VIP Demo Invitation",
      status: "Completed",
      audience: "High-Intent Contacts",
      recipients: "680",
      sent: "680",
      delivered: "665 (98%)",
      read: "590 (87%)",
      replies: "185 (27%)",
      scheduledDate: "2026-02-15 02:30 PM",
    },
    {
      id: "WA-2026-003",
      name: "Monthly Newsletter & Update",
      status: "Scheduled",
      audience: "All Subscribers",
      recipients: "3,200",
      sent: "0",
      delivered: "0",
      read: "0",
      replies: "0",
      scheduledDate: "2026-03-10 11:00 AM",
    },
  ];

  const templates = [
    { name: "broadcast_product_launch", category: "MARKETING", status: "APPROVED", language: "en_US" },
    { name: "vip_demo_invitation", category: "UTILITY", status: "APPROVED", language: "en_US" },
    { name: "service_reminder_v2", category: "UTILITY", status: "APPROVED", language: "en_US" },
  ];

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* HEADER */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
              <FiMessageSquare className="h-6 w-6 text-emerald-500" />
              WhatsApp Campaigns & Broadcasts
            </h1>
            <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
              WhatsApp Business Cloud API
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Automated WhatsApp bulk messaging, HSM templates, read rate tracking & interactive auto-responders
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
            <FiRefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-emerald-500" : ""}`} />
          </Button>
          <Button size="sm" className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
            <FiPlus className="h-3.5 w-3.5" />
            New Broadcast
          </Button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 bg-card/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Messages Sent
            </CardTitle>
            <FiSend className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">5,330</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <FiCheckCircle className="h-3 w-3" /> 97.4% Delivery Rate
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Read Rate
            </CardTitle>
            <FiEye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">81.2%</div>
            <p className="text-xs text-muted-foreground mt-1">4,325 messages read</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Reply / Engagement Rate
            </CardTitle>
            <FiMessageSquare className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">24.8%</div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">1,322 active conversations</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Approved Templates
            </CardTitle>
            <FiSmartphone className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">3 / 3</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Meta HSM Verified</p>
          </CardContent>
        </Card>
      </div>

      {/* TABS & MAIN CONTENT */}
      <Card className="border-border/50 bg-card/50 shadow-xs">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center gap-2">
            <Button
              variant={selectedTab === "campaigns" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTab("campaigns")}
              className={selectedTab === "campaigns" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              Broadcast Campaigns
            </Button>
            <Button
              variant={selectedTab === "templates" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTab("templates")}
              className={selectedTab === "templates" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              HSM Templates
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {selectedTab === "campaigns" && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b border-border/50">
                    <tr>
                      <th className="p-3 font-semibold">Campaign ID & Name</th>
                      <th className="p-3 font-semibold">Audience</th>
                      <th className="p-3 font-semibold">Status</th>
                      <th className="p-3 font-semibold">Delivered</th>
                      <th className="p-3 font-semibold">Read</th>
                      <th className="p-3 font-semibold">Replies</th>
                      <th className="p-3 font-semibold">Schedule Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {campaigns.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="font-semibold text-foreground">{c.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{c.id}</div>
                        </td>
                        <td className="p-3 text-muted-foreground">{c.audience}</td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={
                              c.status === "Active"
                                ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                                : c.status === "Completed"
                                ? "border-blue-500/40 text-blue-600 bg-blue-500/10"
                                : "border-amber-500/40 text-amber-600 bg-amber-500/10"
                            }
                          >
                            {c.status}
                          </Badge>
                        </td>
                        <td className="p-3 font-medium">{c.delivered}</td>
                        <td className="p-3 font-medium text-emerald-600 dark:text-emerald-400">{c.read}</td>
                        <td className="p-3 font-medium text-purple-600 dark:text-purple-400">{c.replies}</td>
                        <td className="p-3 text-xs text-muted-foreground">{c.scheduledDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedTab === "templates" && (
            <div className="grid gap-4 sm:grid-cols-3">
              {templates.map((t) => (
                <div key={t.name} className="p-4 rounded-xl border border-border/50 bg-background/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-600 bg-emerald-500/10">
                      {t.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground uppercase">{t.category}</span>
                  </div>
                  <div className="font-mono text-sm font-semibold text-foreground">{t.name}</div>
                  <p className="text-xs text-muted-foreground">Language: {t.language}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
