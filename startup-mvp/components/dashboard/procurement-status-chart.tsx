"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StatusBreakdown {
  status: string;
  count: number;
}

interface ProcurementStatusChartProps {
  breakdown: StatusBreakdown[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-gray-500" },
  APPROVED: { label: "Approved", color: "bg-blue-500" },
  PARTIALLY_RECEIVED: { label: "Partially Received", color: "bg-yellow-500" },
  RECEIVED: { label: "Received", color: "bg-green-500" },
  CANCELLED: { label: "Cancelled", color: "bg-red-500" },
  RETURNED: { label: "Returned", color: "bg-purple-500" },
};

export default function ProcurementStatusChart({ breakdown }: ProcurementStatusChartProps) {
  if (breakdown.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Purchase Status</CardTitle>
          <CardDescription className="text-sm">Distribution of purchases by status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            No purchases found
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = breakdown.reduce((sum, item) => sum + item.count, 0);
  const maxCount = Math.max(...breakdown.map((item) => item.count), 1);

  return (
    <Card className="border-none shadow-none">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Purchase Status</CardTitle>
        <CardDescription className="text-sm">
          Distribution of {total} purchase{total !== 1 ? "s" : ""} by status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {breakdown.map((item) => {
            const config = statusConfig[item.status] || { label: item.status, color: "bg-gray-500" };
            const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
            const barWidth = total > 0 ? (item.count / maxCount) * 100 : 0;

            return (
              <div key={item.status} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${config.color}`} />
                    <span className="font-medium">{config.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{item.count}</span>
                    <Badge variant="outline" className="text-xs font-normal">
                      {percentage}%
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full ${config.color} transition-all duration-300`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
