"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FiBriefcase,
  FiMapPin,
  FiDollarSign,
  FiUsers,
  FiPlus,
  FiRefreshCw,
  FiCheckCircle,
  FiTrendingUp,
  FiPrinter,
  FiCalendar,
} from "react-icons/fi";

export default function PhysicalCampaignView() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const campaigns = [
    {
      id: "PHY-2026-001",
      name: "Tech Expo & Trade Show 2026",
      type: "Event / Exhibition",
      location: "ICC BASHUNDHARA, Dhaka",
      budget: "৳150,000",
      spent: "৳142,000",
      leadsCollected: "420",
      conversions: "38",
      status: "Active",
      startDate: "2026-02-20",
      endDate: "2026-02-24",
    },
    {
      id: "PHY-2026-002",
      name: "Gulshan Expressway Billboard Banner",
      type: "Outdoor Billboard",
      location: "Gulshan 2 Circle, Dhaka",
      budget: "৳220,000",
      spent: "৳220,000",
      leadsCollected: "185",
      conversions: "14",
      status: "Active",
      startDate: "2026-01-15",
      endDate: "2026-03-15",
    },
    {
      id: "PHY-2026-003",
      name: "B2B Corporate Flyer Distribution",
      type: "Print / Direct Mail",
      location: "Motijheel & Banani Tech Hubs",
      budget: "৳45,000",
      spent: "৳40,000",
      leadsCollected: "95",
      conversions: "9",
      status: "Completed",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    },
  ];

  return (
    <div className="flex-1 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* HEADER */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
              <FiBriefcase className="h-6 w-6 text-amber-500" />
              Physical & Offline Campaigns
            </h1>
            <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5">
              Events, Billboards & Print Marketing
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Track offline marketing initiatives, exhibitions, print ads, billboards, and QR-code lead conversions
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
            <FiRefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-amber-500" : ""}`} />
          </Button>
          <Button size="sm" className="h-8 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
            <FiPlus className="h-3.5 w-3.5" />
            New Physical Campaign
          </Button>
        </div>
      </div>

      {/* METRICS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 bg-card/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Offline Spend
            </CardTitle>
            <FiDollarSign className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">৳402,000</div>
            <p className="text-xs text-muted-foreground mt-1">Budget allocated: ৳415,000</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Offline Leads Captured
            </CardTitle>
            <FiUsers className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">700</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <FiTrendingUp className="h-3 w-3" /> Cost Per Lead: ৳574
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Closed Deals (Offline)
            </CardTitle>
            <FiCheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">61</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">8.7% Conversion Rate</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Venues / Spots
            </CardTitle>
            <FiMapPin className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">2 Active</div>
            <p className="text-xs text-muted-foreground mt-1">DHAKA Metropolitan Region</p>
          </CardContent>
        </Card>
      </div>

      {/* TABLE */}
      <Card className="border-border/50 bg-card/50 shadow-xs">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold">Active & Past Physical Campaigns</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="p-3 font-semibold">Campaign Name</th>
                  <th className="p-3 font-semibold">Type & Venue</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Budget vs Spend</th>
                  <th className="p-3 font-semibold">Leads</th>
                  <th className="p-3 font-semibold">Conversions</th>
                  <th className="p-3 font-semibold">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div className="font-semibold text-foreground">{c.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{c.id}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-foreground">{c.type}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <FiMapPin className="h-3 w-3" /> {c.location}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={
                          c.status === "Active"
                            ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                            : "border-blue-500/40 text-blue-600 bg-blue-500/10"
                        }
                      >
                        {c.status}
                      </Badge>
                    </td>
                    <td className="p-3 font-medium">
                      {c.spent} <span className="text-xs text-muted-foreground">/ {c.budget}</span>
                    </td>
                    <td className="p-3 font-semibold text-blue-600 dark:text-blue-400">{c.leadsCollected}</td>
                    <td className="p-3 font-semibold text-emerald-600 dark:text-emerald-400">{c.conversions}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {c.startDate} to {c.endDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
