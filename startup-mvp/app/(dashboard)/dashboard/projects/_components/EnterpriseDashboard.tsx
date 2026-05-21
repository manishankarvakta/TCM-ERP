"use client";

import { useEffect, useState } from "react";
import { getMacroProjectTelemetry } from "@/app/actions/projects/dashboard.action";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Activity, LayoutTemplate, Briefcase, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

export default function EnterpriseDashboard() {
  const [telemetry, setTelemetry] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMacroProjectTelemetry().then((res) => {
      if (res.success) {
        setTelemetry(res.data);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 w-full border-2 border-dashed rounded-2xl bg-muted/10">
        <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
      </div>
    );
  }

  if (!telemetry) return null;

  const taskData = [
    { name: 'Completed', value: telemetry.tasks.COMPLETED, color: '#10b981' }, // emerald-500
    { name: 'In Progress', value: telemetry.tasks.IN_PROGRESS, color: '#3b82f6' }, // blue-500
    { name: 'To Do', value: telemetry.tasks.TODO, color: '#64748b' } // slate-500
  ];

  const hasFinancials = telemetry.financials !== null;

  return (
    <div className="space-y-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
      
      {/* Enterprise Title Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-border/40">
        <LayoutTemplate className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold tracking-tight">Macro Telemetry</h2>
        <Badge variant="outline" className="ml-2 bg-primary/5 text-primary border-primary/20">
          Command Center
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Module 1: Task Velocity (Donut Chart) */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center justify-between">
              Global Task Velocity
              <CheckCircle2 className="w-4 h-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center">
            <div className="h-32 w-32 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie
                        data={taskData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {taskData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <RechartsTooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3 pl-4">
               <div>
                   <p className="text-2xl font-bold">{telemetry.tasks.TOTAL}</p>
                   <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Tasks</p>
               </div>
               <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" /> {telemetry.tasks.COMPLETED} Done
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600">
                      <div className="w-2 h-2 rounded-full bg-blue-500" /> {telemetry.tasks.IN_PROGRESS} Active
                  </div>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Module 2: Upcoming Milestones */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center justify-between">
              Critical Path Deadlines
              <Clock className="w-4 h-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {telemetry.upcomingDeadlines.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">No upcoming deadlines detected.</div>
            ) : (
                <div className="space-y-4 mt-2">
                    {telemetry.upcomingDeadlines.map((m: any) => (
                        <div key={m.id} className="flex justify-between items-center text-sm">
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold truncate">{m.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{m.Project.title}</p>
                            </div>
                            <Badge variant="outline" className="shrink-0 ml-2 border-rose-200 bg-rose-50 text-rose-700">
                                {new Date(m.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </Badge>
                        </div>
                    ))}
                </div>
            )}
          </CardContent>
        </Card>

        {/* Module 3: Executive Financials (Conditional RBAC) */}
        {hasFinancials ? (
            <Card className="shadow-sm border-border/50 bg-gradient-to-br from-background to-primary/5">
                <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center justify-between">
                    Global Portfolio Health
                    <Activity className="w-4 h-4" />
                </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 mt-2">
                    {telemetry.financials.slice(0, 3).map((f: any) => (
                        <div key={f.id} className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs font-semibold">
                                <span className="truncate pr-4">{f.title}</span>
                                <span className={f.isProfitable ? "text-emerald-600" : "text-destructive"}>
                                    {Math.round(f.marginPercentage)}% Margin
                                </span>
                            </div>
                            <Progress 
                                value={Math.min(f.burnRatePercentage, 100)} 
                                className="h-1.5 bg-muted/50" 
                                indicatorColor={f.burnRatePercentage > 100 ? "bg-destructive" : f.burnRatePercentage > 80 ? "bg-amber-500" : "bg-emerald-500"} 
                            />
                        </div>
                    ))}
                    {telemetry.financials.length === 0 && (
                        <div className="text-sm text-muted-foreground text-center py-4">No active financial ledgers found.</div>
                    )}
                </CardContent>
            </Card>
        ) : (
            <Card className="shadow-sm border-border/50 flex flex-col items-center justify-center text-center p-6 bg-muted/10">
                <Briefcase className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-semibold text-muted-foreground">Financial Telemetry Locked</p>
                <p className="text-xs text-muted-foreground/70 mt-1 max-w-[200px]">Requires 'projects.financials.read' clearance to view global burn rates.</p>
            </Card>
        )}

      </div>
    </div>
  );
}
