"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TestPlansPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Plans</h1>
          <p className="text-muted-foreground mt-1">QA Module Workspace</p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          QA
        </Badge>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-xl">Test Plans</CardTitle>
          <CardDescription>
            This page route is active, connected to navigation, and configured with system permissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex flex-col items-center justify-center text-center text-muted-foreground space-y-3">
          <div className="p-4 rounded-full bg-accent/50 text-foreground font-bold text-xl">
            QA
          </div>
          <div className="max-w-md">
            <h3 className="font-semibold text-foreground text-lg mb-1">Test Plans</h3>
            <p className="text-sm text-muted-foreground">
              Module page ready for feature implementation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
