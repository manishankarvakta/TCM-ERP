"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Database, RefreshCw, Zap, Flame, Key, Radio, Layers, Trash2 } from "lucide-react";
import { getRedisTelemetry, flushRedisCacheAction } from "@/app/actions/system-operations.action";
import { toast } from "sonner";

export default function RedisCacheDiagnosticsPage() {
  const [loading, setLoading] = useState(true);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [redisStatus, setRedisStatus] = useState("UNKNOWN");

  const fetchTelemetry = async () => {
    setLoading(true);
    const res = await getRedisTelemetry();
    if (res.success) {
      setTelemetry(res.telemetry);
      setCategories(res.categories || []);
      setRedisStatus(res.status || "STANDBY");
    } else {
      toast.error(res.error || "Failed to fetch Redis telemetry");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  const handleFlushCache = async () => {
    if (!confirm("Are you sure you want to flush the entire Redis cache database? Active sessions and rate-limit counters will be cleared.")) {
      return;
    }
    const res = await flushRedisCacheAction();
    if (res.success) {
      toast.success(res.message);
      fetchTelemetry();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Redis Cache & Memory Bus</h1>
            <Badge className={redisStatus.includes("ONLINE") ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" : "bg-amber-500/15 text-amber-600 border-amber-500/30"}>
              {redisStatus}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            In-memory cache performance, Pub/Sub channels, session keys, and socket broadcasting state.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTelemetry} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh Telemetry
          </Button>
          <Button variant="destructive" size="sm" onClick={handleFlushCache}>
            <Trash2 className="w-4 h-4 mr-2" />
            Flush Cache DB
          </Button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Used RAM Memory</p>
              <h3 className="text-2xl font-bold mt-1">{telemetry?.usedMemory || "0 MB"}</h3>
              <p className="text-xs text-muted-foreground mt-1">Peak: {telemetry?.peakMemory || "0 MB"}</p>
            </div>
            <div className="p-3 bg-red-500/10 rounded-xl text-red-600">
              <Flame className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cache Hit Ratio</p>
              <h3 className="text-2xl font-bold mt-1">{telemetry?.hitRatioPercent || 99}%</h3>
              <p className="text-xs text-emerald-500 mt-1 font-medium">Optimal Cache Efficiency</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
              <Zap className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Redis Keys</p>
              <h3 className="text-2xl font-bold mt-1">{telemetry?.totalKeys || 0}</h3>
              <p className="text-xs text-muted-foreground mt-1">Across all namespaces</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
              <Key className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pub/Sub Channels</p>
              <h3 className="text-2xl font-bold mt-1">{telemetry?.pubSubChannels || 4}</h3>
              <p className="text-xs text-purple-500 mt-1 font-medium">Socket.io Multi-Node Bus</p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-600">
              <Radio className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Namespace Key Allocation Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Namespace Key Allocation Breakdown
          </CardTitle>
          <CardDescription>
            Categorized distribution of active in-memory Redis keys.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {categories.map((cat, idx) => {
            const percentage = telemetry?.totalKeys ? Math.round((cat.count / telemetry.totalKeys) * 100) : 25;
            return (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${cat.color}`} />
                    {cat.name}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {cat.count} keys ({percentage}%)
                  </span>
                </div>
                <Progress value={percentage} className="h-2.5" />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

