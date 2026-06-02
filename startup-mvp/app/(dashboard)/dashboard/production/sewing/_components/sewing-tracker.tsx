"use client";

import React, { useState } from "react";
import { GracefulDegrader } from "@/components/garments/graceful-degrader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FiActivity, FiUsers, FiClock } from "react-icons/fi";

interface SewingTrackerProps {
  isEnabled: boolean;
  initialTracks: any[];
}

export function SewingTrackerClient({ isEnabled, initialTracks }: SewingTrackerProps) {
  const [tracks, setTracks] = useState(initialTracks);

  return (
    <GracefulDegrader isEnabled={isEnabled} moduleName="Sewing Line Panel">
      <div className="space-y-6">
        {/* Top Summary Blocks */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-blue-500/10 text-blue-600 rounded-lg">
                <FiActivity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Factory Efficiency</p>
                <h3 className="text-2xl font-bold">78.4%</h3>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-lg">
                <FiUsers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Operators</p>
                <h3 className="text-2xl font-bold">142 Operators</h3>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-amber-500/10 text-amber-600 rounded-lg">
                <FiClock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Hours Logged Today</p>
                <h3 className="text-2xl font-bold">8.5 Hrs</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Line-level Progress Cards */}
        <div className="grid gap-4">
          <h2 className="text-lg font-semibold">Active Line Status</h2>
          {tracks.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground border-dashed">
              <p>No active sewing line tracks found. Log line outputs to start monitoring.</p>
            </Card>
          ) : (
            tracks.map((track) => {
              const targetCount = track.targetPerHour * Number(track.hoursTracked);
              const pct = targetCount > 0 ? Math.min(100, Math.round((track.actualPieces / targetCount) * 100)) : 0;
              const status = pct >= 90 ? "success" : pct >= 70 ? "warning" : "destructive";

              return (
                <Card key={track.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg text-primary">Line {track.lineCode}</span>
                          <Badge variant="outline">{track.productionOrder.code}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Style: <strong>{track.productionOrder.item.name}</strong>
                        </p>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs block">Operators</span>
                          <span className="font-medium">{track.operatorCount} Operators</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs block">Hourly Target</span>
                          <span className="font-medium">{track.targetPerHour} Pcs</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs block">Actual Passed</span>
                          <span className="font-medium text-emerald-600 font-bold">{track.actualPieces} Pcs</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs block">Defects Logged</span>
                          <span className="font-medium text-rose-500 font-bold">{track.sewingDefects} Pcs</span>
                        </div>
                      </div>

                      <div className="w-full md:w-48 space-y-2">
                        <div className="flex justify-between text-xs font-semibold">
                          <span>Efficiency</span>
                          <span className={status === "success" ? "text-emerald-600" : status === "warning" ? "text-amber-600" : "text-rose-500"}>
                            {pct}%
                          </span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </GracefulDegrader>
  );
}
