"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function StorageUsagePage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Storage Usage</h1>
          <p className="text-muted-foreground mt-1">System Operations Module Workspace</p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          System Operations
        </Badge>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-xl">Storage Usage</CardTitle>
          <CardDescription>
            This page route is active, connected to navigation, and configured with system permissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex flex-col items-center justify-center text-center text-muted-foreground space-y-3">
          <div className="p-4 rounded-full bg-accent/50 text-foreground font-bold text-xl">
            SY
          </div>
          <div className="max-w-md">
            <h3 className="font-semibold text-foreground text-lg mb-1">Storage Usage</h3>
            <p className="text-sm text-muted-foreground">
              Module page ready for feature implementation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
