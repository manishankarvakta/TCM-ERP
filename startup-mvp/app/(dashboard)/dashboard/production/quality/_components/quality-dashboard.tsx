"use client";

import React from "react";
import { GracefulDegrader } from "@/components/garments/graceful-degrader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QualityDashboardProps {
  isEnabled: boolean;
}

export function QualityDashboardClient({ isEnabled }: QualityDashboardProps) {
  // A mock defect distribution for visual display
  const defectBreakdown = [
    { name: "Skipped Stitches", count: 48, percentage: 41 },
    { name: "Broken Seam", count: 29, percentage: 25 },
    { name: "Uneven Hemline", count: 18, percentage: 15 },
    { name: "Spot / Stain", count: 12, percentage: 10 },
    { name: "Other Defects", count: 10, percentage: 9 },
  ];

  return (
    <GracefulDegrader isEnabled={isEnabled} moduleName="Quality Check Board">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase">Pass Percentage</CardDescription>
              <CardTitle className="text-3xl font-bold text-emerald-600">97.8%</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Acceptable target: 98% AQL</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase">Total Inspected</CardDescription>
              <CardTitle className="text-3xl font-bold">12,450</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Inspected across all styles</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase">Defected Pieces</CardDescription>
              <CardTitle className="text-3xl font-bold text-rose-500">274</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Isolated in rework bin</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase">DHU Ratio</CardDescription>
              <CardTitle className="text-3xl font-bold">2.2%</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Defects Hundred Units (DHU)</p>
            </CardContent>
          </Card>
        </div>

        {/* Pareto Defect Breakdown Panel */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Top Sewing & Fabric Defects</CardTitle>
              <CardDescription>Visual breakdown of reasons for quality fails.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {defectBreakdown.map((defect) => (
                <div key={defect.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{defect.name}</span>
                    <span className="font-semibold text-muted-foreground">{defect.count} Pcs ({defect.percentage}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: `${defect.percentage}%` }}></div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Real-time Quality Alerts Feed */}
          <Card>
            <CardHeader>
              <CardTitle>Critical Alerts</CardTitle>
              <CardDescription>System flagged out-of-tolerance events.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 text-xs">
                <div className="flex justify-between font-bold text-red-600 mb-1">
                  <span>Line C Alert</span>
                  <Badge variant="destructive">DHU &gt; 5%</Badge>
                </div>
                Skipped stitches threshold exceeded on order PO-085 (Mens Polo). Recheck needles!
              </div>

              <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-xs">
                <div className="flex justify-between font-bold text-amber-600 mb-1">
                  <span>Line A Alert</span>
                  <Badge variant="outline" className="text-amber-600 border-amber-600">Alert</Badge>
                </div>
                Slight oil stain contamination logged on batch #04. Inspect washing parameters.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </GracefulDegrader>
  );
}
