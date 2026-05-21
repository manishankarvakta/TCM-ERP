"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiPieChart } from "react-icons/fi";

const COLORS = {
  "OPEN": "#94a3b8",        // slate-400
  "IN_PROGRESS": "#f59e0b", // amber-500
  "REVIEW": "#3b82f6",      // blue-500
  "COMPLETED": "#10b981",   // emerald-500
  "CLOSED": "#64748b"       // slate-500
};

export default function ProjectAnalytics({ project }: { project: any }) {
  const data = useMemo(() => {
    if (!project?.Milestones) return [];
    
    const allIssues = project.Milestones.flatMap((m: any) => m.Issues || []);
    const counts: Record<string, number> = {
      OPEN: 0,
      IN_PROGRESS: 0,
      REVIEW: 0,
      COMPLETED: 0,
      CLOSED: 0
    };

    allIssues.forEach((issue: any) => {
      if (counts[issue.status] !== undefined) {
        counts[issue.status]++;
      }
    });

    return [
      { name: "Open", value: counts.OPEN, color: COLORS.OPEN },
      { name: "In Progress", value: counts.IN_PROGRESS, color: COLORS.IN_PROGRESS },
      { name: "Review", value: counts.REVIEW, color: COLORS.REVIEW },
      { name: "Completed", value: counts.COMPLETED, color: COLORS.COMPLETED },
      { name: "Closed", value: counts.CLOSED, color: COLORS.CLOSED },
    ].filter(item => item.value > 0);
  }, [project]);

  if (data.length === 0) {
    return (
      <Card className="rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b py-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FiPieChart className="text-primary h-4 w-4" /> Issue Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="p-12 text-center text-sm font-medium text-muted-foreground border-t border-border/40">
          Not enough data to compute analytics visualization.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden h-[360px] flex flex-col">
      <CardHeader className="bg-slate-50/50 border-b py-4 shrink-0">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <FiPieChart className="text-primary h-4 w-4" /> Issue Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 pb-4 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              itemStyle={{ fontWeight: 'bold' }}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
